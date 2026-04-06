import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { ConversationEngineState } from "@/lib/event-assistant/v2-types";
import type { MatchingProvider, ProviderScoreBreakdown, UiRecommendedSetups } from "@/lib/event-assistant/types";

export type AssistantSnapshotPayload = {
  engine_state: ConversationEngineState;
  recommended: UiRecommendedSetups | null;
  ranked_providers: Array<{ provider: MatchingProvider; score: ProviderScoreBreakdown }>;
  ready_for_results: boolean;
  meta: { matches_stub: boolean; provider_count: number };
};

/** Résultat explicite : ne pas confondre « pas de snapshot » et erreur Supabase / réseau. */
export type LoadAssistantSnapshotResult =
  | { kind: "ok"; snapshot: AssistantSnapshotPayload }
  | { kind: "not_found" }
  | { kind: "db_error"; message: string };

export async function insertAssistantSession(userId: string | null): Promise<string> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("assistant_sessions")
    .insert({ user_id: userId })
    .select("id")
    .single();

  if (error || !data?.id) {
    throw new Error(error?.message ?? "assistant_sessions insert failed");
  }
  return data.id as string;
}

export async function loadAssistantSnapshot(sessionId: string): Promise<LoadAssistantSnapshotResult> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("assistant_state_snapshots")
    .select("engine_state, recommended, ranked_providers, ready_for_results, meta")
    .eq("session_id", sessionId)
    .maybeSingle();

  if (error) {
    console.error("[assistant] load snapshot db_error", error.message, { sessionId });
    return { kind: "db_error", message: error.message };
  }
  if (!data) {
    return { kind: "not_found" };
  }

  return {
    kind: "ok",
    snapshot: {
      engine_state: data.engine_state as ConversationEngineState,
      recommended: (data.recommended ?? null) as UiRecommendedSetups | null,
      ranked_providers: (data.ranked_providers ?? []) as AssistantSnapshotPayload["ranked_providers"],
      ready_for_results: Boolean(data.ready_for_results),
      meta: (data.meta ?? { matches_stub: true, provider_count: 0 }) as AssistantSnapshotPayload["meta"],
    },
  };
}

export async function saveAssistantSnapshot(sessionId: string, payload: AssistantSnapshotPayload): Promise<void> {
  const admin = createAdminClient();
  const now = new Date().toISOString();

  const { error: snapErr } = await admin.from("assistant_state_snapshots").upsert(
    {
      session_id: sessionId,
      engine_state: payload.engine_state,
      recommended: payload.recommended,
      ranked_providers: payload.ranked_providers,
      ready_for_results: payload.ready_for_results,
      meta: payload.meta,
      updated_at: now,
    },
    { onConflict: "session_id" },
  );

  if (snapErr) {
    throw new Error(snapErr.message);
  }

  const { error: sessErr } = await admin
    .from("assistant_sessions")
    .update({ updated_at: now })
    .eq("id", sessionId);

  if (sessErr) {
    console.warn("[assistant] session touch failed", sessErr.message);
  }

  const messages = payload.engine_state.messages ?? [];
  const { error: delErr } = await admin.from("assistant_messages").delete().eq("session_id", sessionId);
  if (delErr) {
    console.warn("[assistant] messages delete", delErr.message);
  }

  if (messages.length > 0) {
    const rows = messages.map((m) => ({
      id: m.id,
      session_id: sessionId,
      role: m.role,
      kind: m.kind,
      content: m.content,
      metadata: m.metadata ?? {},
      created_at: m.createdAt,
    }));
    const { error: insErr } = await admin.from("assistant_messages").insert(rows);
    if (insErr) {
      throw new Error(insErr.message);
    }
  }
}
