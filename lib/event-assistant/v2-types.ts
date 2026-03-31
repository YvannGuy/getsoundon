import { EventType, ServiceNeed, IndoorOutdoor, VenueType, QuestionField, ChatMessage, QualificationState } from "./types";

// ============================================================================
// SYSTÈME DE SLOTS V2
// ============================================================================

export type CandidateSource = {
  messageId: string;
  rawText: string;
  extractor: string;
  confidence: number;
  createdAt: string;
};

export type SlotCandidate<T> = {
  value: T;
  normalizedValue?: unknown;
  confidence: number;
  source: CandidateSource;
};

export type SlotStatus = "empty" | "candidate" | "resolved" | "conflicted" | "locked";

export type SlotState<T> = {
  key: QuestionField;
  status: SlotStatus;
  resolvedValue: T | null;
  candidates: SlotCandidate<T>[];
  askedCount: number;
  lastAskedAt?: string;
  lastResolvedAt?: string;
  needsConfirmation: boolean;
  lockedByUser: boolean;
};

// ============================================================================
// MÉMOIRE DE DIALOGUE
// ============================================================================

export type AskedQuestion = {
  field: QuestionField;
  semanticKey: string;
  askedAt: string;
  answered: boolean;
  supersededByMessageId?: string;
};

export type DialogueMemory = {
  askedQuestions: AskedQuestion[];
  pendingQuestionField?: QuestionField;
  pendingQuestionSemanticKey?: string;
  conversationTurns: number;
  lastUserIntent?: string;
};

// ============================================================================
// EXTRACTION & PROCESSING
// ============================================================================

export type ExtractionLogEntry = {
  id: string;
  messageId: string;
  extractor: string;
  field: QuestionField;
  rawValue: unknown;
  normalizedValue: unknown;
  confidence: number;
  applied: boolean;
  createdAt: string;
};

export type ExtractionBatch = {
  messageId: string;
  extractions: ExtractionLogEntry[];
  metadata: {
    extractors: string[];
    totalExtractions: number;
    highConfidenceCount: number;
  };
};

export type NormalizedText = {
  original: string;
  cleaned: string;
  tokens: string[];
  semanticSignals: Record<string, number>;
};

// ============================================================================
// ACTIONS & STRATÉGIES
// ============================================================================

export type AssistantActionType = 
  | "ask_question"
  | "acknowledge_info" 
  | "request_clarification"
  | "summarize_understanding"
  | "provide_recommendations"
  | "show_matching_providers"
  | "handle_contradiction";

export type AssistantActionV2 = {
  type: AssistantActionType;
  targetField?: QuestionField;
  strategy: "direct" | "contextual" | "confirmatory" | "alternative";
  priority: number;
  reasoning: string;
  payload?: Record<string, unknown>;
};

// ============================================================================
// ÉTAT CENTRAL DU MOTEUR
// ============================================================================

export type ConversationEngineState = {
  sessionId: string;
  createdAt: string;
  lastUpdatedAt: string;
  
  // Core conversation
  messages: ChatMessage[];
  slots: {
    eventType: SlotState<EventType>;
    guestCount: SlotState<number>;
    location: SlotState<{ label: string; city?: string; district?: string; lat?: number; lng?: number }>;
    venueType: SlotState<VenueType>;
    indoorOutdoor: SlotState<IndoorOutdoor>;
    eventDate: SlotState<{ raw: string; isoDate?: string; isApproximate?: boolean }>;
    serviceNeeds: SlotState<ServiceNeed[]>;
    deliveryNeeded: SlotState<boolean>;
    installationNeeded: SlotState<boolean>;
    technicianNeeded: SlotState<boolean>;
    budgetRange: SlotState<{ min?: number; max?: number; currency?: "EUR"; raw?: string }>;
    constraints: SlotState<string[]>;
  };
  
  // Dialogue management
  dialogue: DialogueMemory;
  qualification: QualificationState;
  extractionLog: ExtractionLogEntry[];
  
  // Derived results
  recommendations?: unknown[];
  rankedProviders?: unknown[];
  
  // UI state
  isExpanded: boolean;
  status: "idle" | "listening" | "processing" | "responding" | "ready" | "error";
};

// ============================================================================
// CONFIGURATION & POLITIQUES
// ============================================================================

export type FieldPolicy = {
  field: QuestionField;
  priority: "critical" | "important" | "optional" | "contextual";
  maxAskedCount: number;
  minConfidenceToResolve: number;
  allowsInference: boolean;
  dependsOn?: QuestionField[];
  conflictResolution: "higher_confidence" | "most_recent" | "user_preference" | "context_based";
};

export type ExtractionStrategy = {
  extractor: string;
  patterns: RegExp[];
  confidenceBase: number;
  contextBoosts: Record<string, number>;
  postProcessors: string[];
};

export interface ConversationPolicy {
  maxRepeatQuestion: number;
  minTurnsBetweenSameQuestion: number;  
  maxConversationTurns: number;
  minConfidenceThreshold: number;
  antiRepetitionStrategy: "alternative_phrasing" | "skip_question" | "context_switch";
}