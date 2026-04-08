import { v4 as uuid } from "uuid";

import {
  createConversationEngine,
  createInitialConversationState,
} from "@/lib/event-assistant/conversation-engine-v2";
import { getMockProviders } from "@/lib/event-assistant/mocks";
import { rankProvidersV2 } from "@/lib/event-assistant/matching-bridge-v2";
import { buildRecommendedSetupsFromEngineState } from "@/lib/event-assistant/recommendation-bridge";
import type { ChatMessage, MatchingProvider, ProviderScoreBreakdown } from "@/lib/event-assistant/types";
import type { ConversationEngineState } from "@/lib/event-assistant/v2-types";
import type { UiRecommendedSetups } from "@/lib/event-assistant/types";

import { polishAssistantMessageWithResponsesApi, replaceLastAssistantContent } from "./openai-assistant-llm";
import { convertSlotsToBrief } from "./slots-to-brief";

/** Anciennes sessions sans flag : déjà un message reco → ne pas rejouer la transition. */
function withRecommendationsTransitionSynced(state: ConversationEngineState): ConversationEngineState {
  if (state.recommendationsTransitionDelivered === true) return state;
  const hasRecoAssistantMessage = state.messages.some(
    (m) => m.role === "assistant" && m.kind === "recommendation",
  );
  if (hasRecoAssistantMessage) {
    return { ...state, recommendationsTransitionDelivered: true };
  }
  return state;
}

export type AssistantRemoteMeta = {
  matches_stub: boolean;
  provider_count: number;
};

export type RunAssistantTurnResult = {
  engineState: ConversationEngineState;
  brief: ReturnType<typeof convertSlotsToBrief>;
  recommended: UiRecommendedSetups;
  rankedProviders: Array<{ provider: MatchingProvider; score: ProviderScoreBreakdown }>;
  readyForResults: boolean;
  meta: AssistantRemoteMeta;
};

/**
 * Un tour complet : moteur V2 + reco + matching V2 ; optionnellement polish du message assistant via OpenAI Responses API.
 * Côté serveur : pas de `window` / localStorage — on force les chemins V2 explicites.
 */
export async function runAssistantTurn(
  previousEngineState: ConversationEngineState,
  userText: string,
): Promise<RunAssistantTurnResult> {
  const syncedState = withRecommendationsTransitionSynced(previousEngineState);
  const trimmed = userText.trim();
  if (!trimmed) {
    const brief = convertSlotsToBrief(syncedState.slots);
    const recommended = buildRecommendedSetupsFromEngineState(syncedState);
    const useStub = process.env.ASSISTANT_USE_PROVIDER_STUB === "1";
    const providers: MatchingProvider[] = useStub ? getMockProviders(12) : [];
    const rankedProviders = providers.length
      ? rankProvidersV2(brief, recommended, providers, {
          requestedItems: syncedState.requestedItems,
          excludedEquipmentTypes: syncedState.excludedEquipmentTypes,
        })
      : [];
    return {
      engineState: syncedState,
      brief,
      recommended,
      rankedProviders,
      readyForResults: syncedState.qualification.readyToRecommend,
      meta: { matches_stub: useStub || providers.length === 0, provider_count: providers.length },
    };
  }

  const engine = createConversationEngine();
  const userMessage: ChatMessage = {
    id: `user-${uuid()}`,
    role: "user",
    kind: "message",
    content: trimmed,
    createdAt: new Date().toISOString(),
  };

  const { updatedState } = engine.processUserMessage(syncedState, userMessage);
  const brief = convertSlotsToBrief(updatedState.slots);
  const recommended = buildRecommendedSetupsFromEngineState(updatedState);
  const useStub = process.env.ASSISTANT_USE_PROVIDER_STUB === "1";
  const providers: MatchingProvider[] = useStub ? getMockProviders(12) : [];
  const rankedProviders = providers.length
    ? rankProvidersV2(brief, recommended, providers, {
        requestedItems: updatedState.requestedItems,
        excludedEquipmentTypes: updatedState.excludedEquipmentTypes,
      })
    : [];
  const readyForResults = updatedState.qualification.readyToRecommend;

  let engineState = updatedState;
  const last = updatedState.messages[updatedState.messages.length - 1];
  if (last?.role === "assistant") {
    const polished = await polishAssistantMessageWithResponsesApi({
      engineState: updatedState,
      brief,
      recommended,
      rankedProviders,
      matchesStub: useStub || providers.length === 0,
      readyForResults,
      lastUserMessage: trimmed,
      draftAssistantMessage: last,
    });
    if (polished) {
      engineState = replaceLastAssistantContent(updatedState, polished);
    }
  }

  return {
    engineState,
    brief,
    recommended,
    rankedProviders,
    readyForResults,
    meta: { matches_stub: useStub || providers.length === 0, provider_count: providers.length },
  };
}

export function createNewEngineSession(): ConversationEngineState {
  return createInitialConversationState();
}
