import type { MatchingProvider, ProviderScoreBreakdown, UiRecommendedSetups } from "@/lib/event-assistant/types";
import type { AssistantUiBridgeState } from "@/lib/assistant/bridge-ui-state";

export type AssistantSessionScope = "chat" | "landing";

function storageKeyForScope(scope: AssistantSessionScope): string {
  return scope === "chat"
    ? "assistant_server_session_id_chat"
    : "assistant_server_session_id_landing";
}

export type AssistantMessageApiResponse = {
  session_id: string;
  state: AssistantUiBridgeState;
  recommended: UiRecommendedSetups;
  ranked_providers: Array<{ provider: MatchingProvider; score: ProviderScoreBreakdown }>;
  ready_for_results: boolean;
  meta: { matches_stub: boolean; provider_count: number };
};

/** Erreur HTTP assistant avec statut exploitable (404 vs 5xx, etc.). */
export class AssistantApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "AssistantApiError";
    this.status = status;
  }
}

async function parseAssistantJsonResponse(res: Response): Promise<Record<string, unknown>> {
  try {
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export function getStoredAssistantSessionId(scope: AssistantSessionScope): string | null {
  if (typeof window === "undefined") return null;
  try {
    return sessionStorage.getItem(storageKeyForScope(scope));
  } catch {
    return null;
  }
}

export function setStoredAssistantSessionId(id: string, scope: AssistantSessionScope): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(storageKeyForScope(scope), id);
  } catch {
    // ignore
  }
}

export function clearStoredAssistantSessionId(scope: AssistantSessionScope): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(storageKeyForScope(scope));
  } catch {
    // ignore
  }
}

export async function postAssistantMessage(
  message: string,
  sessionId?: string | null,
): Promise<AssistantMessageApiResponse> {
  const res = await fetch("/api/assistant/message", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      session_id: sessionId ?? undefined,
      message,
    }),
  });
  const data = await parseAssistantJsonResponse(res);
  if (!res.ok) {
    const msg = typeof data.error === "string" ? data.error : `Erreur réseau (${res.status}).`;
    throw new AssistantApiError(msg, res.status);
  }
  return data as unknown as AssistantMessageApiResponse;
}

export async function getAssistantSession(sessionId: string): Promise<AssistantMessageApiResponse> {
  const res = await fetch(`/api/assistant/session/${sessionId}`, { method: "GET" });
  const data = await parseAssistantJsonResponse(res);
  if (!res.ok) {
    const msg = typeof data.error === "string" ? data.error : `Erreur réseau (${res.status}).`;
    throw new AssistantApiError(msg, res.status);
  }
  return data as unknown as AssistantMessageApiResponse;
}
