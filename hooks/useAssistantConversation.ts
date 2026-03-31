"use client";

import { useEffect, useMemo, useReducer, useRef } from "react";

import { processUserTurn, createInitialAssistantState } from "@/lib/event-assistant/qualification";
import { buildRecommendedSetupsAdaptive as buildRecommendedSetups } from "@/lib/event-assistant/recommendation-bridge";
import { rankProvidersAdaptive as rankProviders } from "@/lib/event-assistant/matching-bridge-v2";
import { getMockProviders } from "@/lib/event-assistant/mocks";
import type {
  AssistantQuestion,
  AssistantStatus,
  ChatMessage,
  QualificationState,
  EventBrief,
} from "@/lib/event-assistant/types";

type AssistantAction =
  | { type: "USER_MESSAGE"; payload: ChatMessage }
  | { type: "ASSISTANT_MESSAGE"; payload: ChatMessage }
  | { type: "SET_QUALIFICATION"; payload: QualificationState }
  | { type: "SET_BRIEF"; payload: EventBrief }
  | { type: "SET_STATUS"; payload: AssistantStatus }
  | { type: "SET_EXPANDED"; payload: boolean }
  | { type: "SET_TYPING"; payload: boolean }
  | { type: "RESTORE_STATE"; payload: AssistantState };

type AssistantState = {
  messages: ChatMessage[];
  brief: EventBrief;
  qualification: QualificationState;
  status: AssistantStatus;
  isExpanded: boolean;
  isTyping: boolean;
};

const initialAssistantData = createInitialAssistantState();

const initialState: AssistantState = {
  messages: [],
  brief: initialAssistantData.brief,
  qualification: initialAssistantData.qualification,
  status: "idle",
  isExpanded: false,
  isTyping: false,
};

const createWelcomeMessage = (): ChatMessage => ({
  id: `assistant-welcome-${Date.now()}`,
  role: "assistant",
  kind: "system_note",
  content:
    "Parlez-moi de votre événement : je pose quelques questions puis je recommande un setup et des prestataires compatibles.",
  createdAt: new Date().toISOString(),
});

function reducer(state: AssistantState, action: AssistantAction): AssistantState {
  switch (action.type) {
    case "USER_MESSAGE":
      // Vérification défensive pour éviter les doublons
      if (state.messages.some(msg => msg.id === action.payload.id)) {
        return state;
      }
      return { ...state, messages: [...state.messages, action.payload], status: "chatting" };
    case "ASSISTANT_MESSAGE":
      // Vérification défensive pour éviter les doublons
      if (state.messages.some(msg => msg.id === action.payload.id)) {
        return state;
      }
      return { ...state, messages: [...state.messages, action.payload] };
    case "SET_QUALIFICATION":
      return { ...state, qualification: action.payload };
    case "SET_BRIEF":
      return { ...state, brief: action.payload };
    case "SET_STATUS":
      return { ...state, status: action.payload };
    case "SET_EXPANDED":
      return { ...state, isExpanded: action.payload };
    case "SET_TYPING":
      return { ...state, isTyping: action.payload };
    case "RESTORE_STATE":
      return { ...action.payload, isTyping: false };
    default:
      return state;
  }
}

const STORAGE_KEY = "assistant_inline_session_v1";

function loadFromStorage(): AssistantState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AssistantState;
    if (!parsed?.qualification || !parsed?.messages || !parsed?.brief) return null;
    return parsed;
  } catch {
    return null;
  }
}

function persistToStorage(state: AssistantState) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

export function useAssistantConversation(options?: { freshSession?: boolean }) {
  const freshSession = options?.freshSession ?? false;
  const [state, dispatch] = useReducer(reducer, initialState);
  const hasRestoredRef = useRef(false);
  const isRestoringRef = useRef(false);

  useEffect(() => {
    if (!hasRestoredRef.current) {
      hasRestoredRef.current = true;

      if (freshSession) {
        if (typeof window !== "undefined") {
          try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
        }
        // Pas de message de bienvenue : le prompt initial démarre directement la conversation
        return;
      }
      
      const restored = loadFromStorage();
      
      if (restored) {
        isRestoringRef.current = true;
        dispatch({ type: "RESTORE_STATE", payload: restored });
        setTimeout(() => {
          isRestoringRef.current = false;
        }, 0);
      } else {
        dispatch({ type: "ASSISTANT_MESSAGE", payload: createWelcomeMessage() });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const providerPool = useMemo(() => getMockProviders(12), []);

  const nextQuestion: AssistantQuestion | null = useMemo(() => {
    // next question will be carried by assistant messages; keep null for now
    return null;
  }, [state.qualification]);

  const recommended = useMemo(() => buildRecommendedSetups(state.brief), [state.brief]);

  const rankedProviders = useMemo(
    () => rankProviders(state.brief, recommended, providerPool),
    [state.brief, recommended, providerPool]
  );

  const readyForResults = state.qualification.readyToRecommend;

  const sendUserMessage = (text: string, isFirstMessage = false) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const lastAssistantQuestion = [...state.messages]
      .reverse()
      .find((m) => m.role === "assistant" && m.kind === "question" && m.metadata?.relatedField)?.metadata
      ?.relatedField;
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      kind: "message",
      content: trimmed,
      createdAt: new Date().toISOString(),
    };
    dispatch({ type: "USER_MESSAGE", payload: userMessage });
    dispatch({ type: "SET_TYPING", payload: true });

    // Capture le brief courant avant le re-render asynchrone
    const currentBrief = state.brief;

    // Délai naturel simulant la réflexion de l'assistant
    setTimeout(() => {
      const result = processUserTurn(currentBrief, trimmed, userMessage.id, isFirstMessage, lastAssistantQuestion);
      dispatch({ type: "SET_BRIEF", payload: result.brief });
      dispatch({ type: "SET_QUALIFICATION", payload: result.qualification });
      dispatch({ type: "SET_TYPING", payload: false });
      dispatch({ type: "ASSISTANT_MESSAGE", payload: result.assistantMessage });
      dispatch({ type: "SET_STATUS", payload: result.qualification.readyToRecommend ? "ready" : "chatting" });
      dispatch({ type: "SET_EXPANDED", payload: true });
    }, 700 + Math.random() * 400);
  };

  const expand = () => dispatch({ type: "SET_EXPANDED", payload: true });

  // Persist state (messages + qualification) pour conserver le fil en session
  useEffect(() => {
    // Ne sauvegarder que si on n'est pas en train de restaurer
    if (!isRestoringRef.current) {
      persistToStorage(state);
    }
  }, [state]);

  return {
    state,
    nextQuestion,
    recommended,
    rankedProviders,
    readyForResults,
    isTyping: state.isTyping,
    sendUserMessage,
    expand,
  };
}

export type ReturnTypeUseAssistant = ReturnType<typeof useAssistantConversation>;
