"use client";

import { useEffect, useMemo, useReducer, useRef } from "react";
import { v4 as uuid } from "uuid";

import { 
  createInitialConversationState, 
  createConversationEngine,
  ConversationEngineImpl 
} from "@/lib/event-assistant/conversation-engine-v2";
import { ConversationEngineState } from "@/lib/event-assistant/v2-types";
import { buildRecommendedSetupsAdaptive as buildRecommendedSetups } from "@/lib/event-assistant/recommendation-bridge";
import { rankProvidersAdaptive as rankProviders } from "@/lib/event-assistant/matching-bridge-v2";
import { getMockProviders } from "@/lib/event-assistant/mocks";
import { getSlotValue } from "@/lib/event-assistant/slots-engine";
import type {
  AssistantQuestion,
  AssistantStatus,
  ChatMessage,
  QualificationState,
  EventBrief,
} from "@/lib/event-assistant/types";

// ============================================================================
// BRIDGE TYPES - Pour compatibilité avec UI existante
// ============================================================================

type AssistantAction =
  | { type: "USER_MESSAGE"; payload: ChatMessage }
  | { type: "PROCESS_ENGINE_RESULT"; payload: ConversationEngineState }
  | { type: "SET_STATUS"; payload: AssistantStatus }
  | { type: "SET_EXPANDED"; payload: boolean }
  | { type: "RESTORE_STATE"; payload: ConversationEngineState };

type BridgeState = {
  engine: ConversationEngineState;
  status: AssistantStatus;
  isExpanded: boolean;
};

// ============================================================================
// CONVERSION HELPERS
// ============================================================================

function convertSlotsToBrief(slots: ConversationEngineState['slots']): EventBrief {
  return {
    eventType: {
      value: getSlotValue(slots.eventType),
      confidence: slots.eventType.status === "resolved" ? 0.9 : 0,
      confirmationStatus: slots.eventType.status === "resolved" ? "confirmed" : "unconfirmed",
      sourceMessageIds: slots.eventType.candidates.map(c => c.source.messageId)
    },
    guestCount: {
      value: getSlotValue(slots.guestCount),
      confidence: slots.guestCount.status === "resolved" ? 0.9 : 0,
      confirmationStatus: slots.guestCount.status === "resolved" ? "confirmed" : "unconfirmed",
      sourceMessageIds: slots.guestCount.candidates.map(c => c.source.messageId)
    },
    location: {
      value: getSlotValue(slots.location),
      confidence: slots.location.status === "resolved" ? 0.9 : 0,
      confirmationStatus: slots.location.status === "resolved" ? "confirmed" : "unconfirmed",
      sourceMessageIds: slots.location.candidates.map(c => c.source.messageId)
    },
    venueType: {
      value: getSlotValue(slots.venueType),
      confidence: slots.venueType.status === "resolved" ? 0.9 : 0,
      confirmationStatus: slots.venueType.status === "resolved" ? "confirmed" : "unconfirmed",
      sourceMessageIds: slots.venueType.candidates.map(c => c.source.messageId)
    },
    indoorOutdoor: {
      value: getSlotValue(slots.indoorOutdoor),
      confidence: slots.indoorOutdoor.status === "resolved" ? 0.9 : 0,
      confirmationStatus: slots.indoorOutdoor.status === "resolved" ? "confirmed" : "unconfirmed",
      sourceMessageIds: slots.indoorOutdoor.candidates.map(c => c.source.messageId)
    },
    eventDate: {
      value: getSlotValue(slots.eventDate),
      confidence: slots.eventDate.status === "resolved" ? 0.9 : 0,
      confirmationStatus: slots.eventDate.status === "resolved" ? "confirmed" : "unconfirmed",
      sourceMessageIds: slots.eventDate.candidates.map(c => c.source.messageId)
    },
    serviceNeeds: {
      value: getSlotValue(slots.serviceNeeds),
      confidence: slots.serviceNeeds.status === "resolved" ? 0.9 : 0,
      confirmationStatus: slots.serviceNeeds.status === "resolved" ? "confirmed" : "unconfirmed",
      sourceMessageIds: slots.serviceNeeds.candidates.map(c => c.source.messageId)
    },
    deliveryNeeded: {
      value: getSlotValue(slots.deliveryNeeded),
      confidence: slots.deliveryNeeded.status === "resolved" ? 0.9 : 0,
      confirmationStatus: slots.deliveryNeeded.status === "resolved" ? "confirmed" : "unconfirmed",
      sourceMessageIds: slots.deliveryNeeded.candidates.map(c => c.source.messageId)
    },
    installationNeeded: {
      value: getSlotValue(slots.installationNeeded),
      confidence: slots.installationNeeded.status === "resolved" ? 0.9 : 0,
      confirmationStatus: slots.installationNeeded.status === "resolved" ? "confirmed" : "unconfirmed",
      sourceMessageIds: slots.installationNeeded.candidates.map(c => c.source.messageId)
    },
    technicianNeeded: {
      value: getSlotValue(slots.technicianNeeded),
      confidence: slots.technicianNeeded.status === "resolved" ? 0.9 : 0,
      confirmationStatus: slots.technicianNeeded.status === "resolved" ? "confirmed" : "unconfirmed",
      sourceMessageIds: slots.technicianNeeded.candidates.map(c => c.source.messageId)
    },
    budgetRange: {
      value: getSlotValue(slots.budgetRange),
      confidence: slots.budgetRange.status === "resolved" ? 0.9 : 0,
      confirmationStatus: slots.budgetRange.status === "resolved" ? "confirmed" : "unconfirmed",
      sourceMessageIds: slots.budgetRange.candidates.map(c => c.source.messageId)
    },
    constraints: {
      value: getSlotValue(slots.constraints),
      confidence: slots.constraints.status === "resolved" ? 0.9 : 0,
      confirmationStatus: slots.constraints.status === "resolved" ? "confirmed" : "unconfirmed",
      sourceMessageIds: slots.constraints.candidates.map(c => c.source.messageId)
    },
    specialNotes: {
      value: null,
      confidence: 0,
      confirmationStatus: "unconfirmed",
      sourceMessageIds: []
    }
  };
}

// ============================================================================
// STATE & REDUCER
// ============================================================================

const initialEngineState = createInitialConversationState();

const initialState: BridgeState = {
  engine: initialEngineState,
  status: "idle",
  isExpanded: false,
};

const createWelcomeMessage = (): ChatMessage => ({
  id: `assistant-welcome-${Date.now()}`,
  role: "assistant",
  kind: "system_note",
  content:
    "Parlez-moi de votre événement : je pose quelques questions puis je recommande un setup et des prestataires compatibles.",
  createdAt: new Date().toISOString(),
});

function reducer(state: BridgeState, action: AssistantAction): BridgeState {
  switch (action.type) {
    case "USER_MESSAGE":
      return state; // Processing will happen via engine
      
    case "PROCESS_ENGINE_RESULT":
      return {
        ...state,
        engine: action.payload
      };
      
    case "SET_STATUS":
      return { ...state, status: action.payload };
      
    case "SET_EXPANDED":
      return { ...state, isExpanded: action.payload };
      
    case "RESTORE_STATE":
      return {
        ...state,
        engine: action.payload
      };
      
    default:
      return state;
  }
}

// ============================================================================
// STORAGE
// ============================================================================

const STORAGE_KEY_V2 = "assistant_conversation_v2";

function loadFromStorage(): ConversationEngineState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_V2);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ConversationEngineState;
    
    // Validate structure
    if (!parsed?.sessionId || !parsed?.messages || !parsed?.slots) return null;
    return parsed;
  } catch {
    return null;
  }
}

function persistToStorage(state: ConversationEngineState) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(state));
  } catch {
    // ignore
  }
}

// ============================================================================
// MAIN HOOK
// ============================================================================

export function useAssistantConversationV2() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const hasRestoredRef = useRef(false);
  const isRestoringRef = useRef(false);
  const engineRef = useRef(createConversationEngine());

  // Hydrate depuis localStorage si dispo
  useEffect(() => {
    if (!hasRestoredRef.current) {
      hasRestoredRef.current = true;
      
      const restored = loadFromStorage();
      
      if (restored) {
        isRestoringRef.current = true;
        dispatch({ type: "RESTORE_STATE", payload: restored });
        setTimeout(() => {
          isRestoringRef.current = false;
        }, 0);
      } else {
        // Aucun état restauré, ajouter le message de bienvenue
        const welcomeMessage = createWelcomeMessage();
        const initialWithWelcome = {
          ...initialEngineState,
          messages: [welcomeMessage]
        };
        dispatch({ type: "PROCESS_ENGINE_RESULT", payload: initialWithWelcome });
      }
    }
  }, []);

  // Computed values for compatibility with existing UI
  const brief = useMemo(() => convertSlotsToBrief(state.engine.slots), [state.engine.slots]);
  const providerPool = useMemo(() => getMockProviders(12), []);
  const recommended = useMemo(() => buildRecommendedSetups(brief), [brief]);
  const rankedProviders = useMemo(
    () => rankProviders(brief, recommended, providerPool),
    [brief, recommended, providerPool]
  );

  const readyForResults = state.engine.qualification.readyToRecommend;
  
  const nextQuestion: AssistantQuestion | null = useMemo(() => {
    // For now, keep null as questions are handled internally
    return null;
  }, []);

  // Main interaction function
  const sendUserMessage = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    
    const userMessage: ChatMessage = {
      id: `user-${uuid()}`,
      role: "user",
      kind: "message",
      content: trimmed,
      createdAt: new Date().toISOString(),
    };

    // Process through the V2 engine
    const result = engineRef.current.processUserMessage(state.engine, userMessage);
    
    dispatch({ type: "PROCESS_ENGINE_RESULT", payload: result.updatedState });
    dispatch({ type: "SET_STATUS", payload: result.updatedState.qualification.readyToRecommend ? "ready" : "chatting" });
    dispatch({ type: "SET_EXPANDED", payload: true });
  };

  const expand = () => dispatch({ type: "SET_EXPANDED", payload: true });

  // Persist state
  useEffect(() => {
    if (!isRestoringRef.current) {
      persistToStorage(state.engine);
    }
  }, [state.engine]);

  // Bridge interface to maintain compatibility
  const bridgeState = {
    messages: state.engine.messages,
    brief,
    qualification: state.engine.qualification,
    status: state.status,
    isExpanded: state.isExpanded,
  };

  return {
    state: bridgeState,
    nextQuestion,
    recommended,
    rankedProviders,
    readyForResults,
    sendUserMessage,
    expand,
    
    // V2 specific debugging access
    engineState: state.engine,
    dialogueStats: {
      askedQuestions: state.engine.dialogue.askedQuestions.length,
      conversationTurns: state.engine.dialogue.conversationTurns,
      extractionCount: state.engine.extractionLog.length
    }
  };
}

export type ReturnTypeUseAssistantV2 = ReturnType<typeof useAssistantConversationV2>;