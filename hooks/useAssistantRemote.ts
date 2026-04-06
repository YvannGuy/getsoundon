"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { AssistantUiBridgeState } from "@/lib/assistant/bridge-ui-state";
import {
  AssistantApiError,
  clearStoredAssistantSessionId,
  getAssistantSession,
  getStoredAssistantSessionId,
  postAssistantMessage,
  setStoredAssistantSessionId,
  type AssistantMessageApiResponse,
  type AssistantSessionScope,
} from "@/lib/assistant/api-client";
import type { MatchingProvider, ProviderScoreBreakdown, UiRecommendedSetups } from "@/lib/event-assistant/types";

type RemoteState = {
  sessionId: string | null;
  uiState: AssistantUiBridgeState | null;
  recommended: UiRecommendedSetups | null;
  rankedProviders: Array<{ provider: MatchingProvider; score: ProviderScoreBreakdown }>;
  readyForResults: boolean;
  meta: AssistantMessageApiResponse["meta"] | null;
  error: string | null;
  isLoading: boolean;
};

function hydrationErrorMessage(err: unknown): string {
  if (err instanceof AssistantApiError) {
    if (err.status === 404) {
      return "Cette conversation n’existe plus ou a expiré. Vous pouvez en démarrer une nouvelle ci-dessous.";
    }
    if (err.status >= 500) {
      return err.message || "Erreur serveur : impossible de recharger la conversation. Réessayez dans quelques instants.";
    }
    return err.message || "Impossible de recharger la conversation.";
  }
  if (err instanceof Error && err.message) {
    return err.message;
  }
  return "Impossible de recharger la conversation. Vérifiez votre connexion et réessayez.";
}

const emptyUi = (): AssistantUiBridgeState => ({
  messages: [],
  brief: {} as AssistantUiBridgeState["brief"],
  qualification: {
    stage: "initial",
    knownFields: [],
    missingCriticalFields: [],
    missingSecondaryFields: [],
    completionScore: 0,
    minimumViableBriefReached: false,
    readyToRecommend: false,
  },
  status: "idle",
  isExpanded: false,
  isTyping: false,
});

/**
 * Assistant branché sur POST /api/assistant/message (serveur + Supabase).
 * session_id conservé dans sessionStorage uniquement pour rechargement d’onglet.
 */
export function useAssistantRemote(options?: {
  initialPrompt?: string;
  skipHydrate?: boolean;
  sessionScope?: AssistantSessionScope;
}) {
  const initialPrompt = options?.initialPrompt?.trim() ?? "";
  const skipHydrate = options?.skipHydrate ?? false;
  const sessionScope = options?.sessionScope ?? "chat";

  const [remote, setRemote] = useState<RemoteState>({
    sessionId: null,
    uiState: null,
    recommended: null,
    rankedProviders: [],
    readyForResults: false,
    meta: null,
    error: null,
    isLoading: false,
  });

  const sentInitialRef = useRef(false);
  const hydrateRef = useRef(false);
  const sessionIdRef = useRef<string | null>(null);

  const applyResponse = useCallback(
    (res: AssistantMessageApiResponse) => {
      sessionIdRef.current = res.session_id;
      setStoredAssistantSessionId(res.session_id, sessionScope);
      setRemote({
        sessionId: res.session_id,
        uiState: res.state,
        recommended: res.recommended,
        rankedProviders: res.ranked_providers,
        readyForResults: res.ready_for_results,
        meta: res.meta,
        error: null,
        isLoading: false,
      });
    },
    [sessionScope],
  );

  useEffect(() => {
    if (skipHydrate || hydrateRef.current) return;
    hydrateRef.current = true;

    // Règle produit : un `?prompt=` explicite gagne sur la session stockée — pas d’hydratation concurrente.
    if (initialPrompt) {
      clearStoredAssistantSessionId(sessionScope);
      sessionIdRef.current = null;
      return;
    }

    const sid = getStoredAssistantSessionId(sessionScope);
    if (!sid) return;

    void (async () => {
      try {
        setRemote((r) => ({ ...r, isLoading: true, error: null }));
        const res = await getAssistantSession(sid);
        applyResponse(res);
      } catch (e) {
        sessionIdRef.current = null;
        clearStoredAssistantSessionId(sessionScope);
        setRemote((r) => ({
          ...r,
          isLoading: false,
          sessionId: null,
          uiState: null,
          error: hydrationErrorMessage(e),
        }));
      }
    })();
  }, [skipHydrate, applyResponse, sessionScope, initialPrompt]);

  useEffect(() => {
    if (!initialPrompt || sentInitialRef.current) return;
    sentInitialRef.current = true;
    void (async () => {
      try {
        setRemote((r) => ({ ...r, isLoading: true, error: null }));
        const res = await postAssistantMessage(initialPrompt, null);
        applyResponse(res);
      } catch (e) {
        setRemote((r) => ({
          ...r,
          isLoading: false,
          error: e instanceof Error ? e.message : "Erreur réseau",
        }));
      }
    })();
  }, [initialPrompt, applyResponse]);

  const sendUserMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    try {
      setRemote((r) => ({ ...r, isLoading: true, error: null }));
      const res = await postAssistantMessage(trimmed, sessionIdRef.current);
      applyResponse(res);
    } catch (e) {
      setRemote((r) => ({
        ...r,
        isLoading: false,
        error: e instanceof Error ? e.message : "Erreur réseau",
      }));
    }
  }, [applyResponse]);

  return {
    state: remote.uiState ?? emptyUi(),
    sessionId: remote.sessionId,
    recommended: remote.recommended,
    rankedProviders: remote.rankedProviders,
    readyForResults: remote.readyForResults,
    meta: remote.meta,
    error: remote.error,
    isLoading: remote.isLoading,
    isTyping: remote.isLoading,
    sendUserMessage,
    version: "remote" as const,
    canUpgrade: false,
    engineState: undefined,
    dialogueStats: undefined,
  };
}
