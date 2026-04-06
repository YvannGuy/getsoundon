import { NextResponse } from "next/server";
import { z } from "zod";

import { toUiBridgeState } from "@/lib/assistant/bridge-ui-state";
import {
  insertAssistantSession,
  loadAssistantSnapshot,
  saveAssistantSnapshot,
} from "@/lib/assistant/persistence";
import { createNewEngineSession, runAssistantTurn } from "@/lib/assistant/server-orchestrator";
import type { ConversationEngineState } from "@/lib/event-assistant/v2-types";
import { getUserOrNull } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  session_id: z.string().uuid().optional(),
  message: z.string().min(1).max(8000),
});

/**
 * POST /api/assistant/message
 * Crée ou reprend une session, exécute un tour moteur V2 côté serveur, persiste dans Supabase.
 */
export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Payload invalide.", details: parsed.error.flatten() }, { status: 400 });
    }

    const { session_id: incomingSessionId, message } = parsed.data;
    const { user } = await getUserOrNull();

    let sessionId = incomingSessionId;
    let engineState: ConversationEngineState;

    if (!sessionId) {
      sessionId = await insertAssistantSession(user?.id ?? null);
      engineState = createNewEngineSession();
      engineState = { ...engineState, sessionId };
    } else {
      const loaded = await loadAssistantSnapshot(sessionId);
      if (loaded.kind === "not_found") {
        return NextResponse.json({ error: "Session introuvable ou expirée." }, { status: 404 });
      }
      if (loaded.kind === "db_error") {
        console.error("[api/assistant/message] load snapshot", loaded.message);
        return NextResponse.json(
          { error: "Erreur technique : impossible de charger la session. Réessayez dans quelques instants." },
          { status: 500 },
        );
      }
      engineState = loaded.snapshot.engine_state;
    }

    const turn = runAssistantTurn(engineState, message);

    const payload = {
      engine_state: turn.engineState,
      recommended: turn.recommended,
      ranked_providers: turn.rankedProviders,
      ready_for_results: turn.readyForResults,
      meta: turn.meta,
    };

    await saveAssistantSnapshot(sessionId, payload);

    const uiState = toUiBridgeState(turn.engineState, turn.brief, turn.readyForResults);

    return NextResponse.json({
      session_id: sessionId,
      state: uiState,
      recommended: turn.recommended,
      ranked_providers: turn.rankedProviders,
      ready_for_results: turn.readyForResults,
      meta: turn.meta,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erreur serveur";
    console.error("[api/assistant/message]", e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
