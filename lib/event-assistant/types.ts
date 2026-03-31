export type EventType =
  | "conference"
  | "corporate"
  | "birthday"
  | "private_party"
  | "wedding"
  | "cocktail"
  | "showcase"
  | "dj_set"
  | "religious_service"
  | "product_launch"
  | "screening"
  | "outdoor_event"
  | "other"
  | "unknown";

export type ServiceNeed =
  | "sound"
  | "microphones"
  | "dj"
  | "lighting"
  | "led_screen"
  | "video"
  | "audiovisual"
  | "delivery"
  | "installation"
  | "technician"
  | "full_service";

export type ActorRole = "user" | "assistant" | "system";
export type IndoorOutdoor = "indoor" | "outdoor" | "unknown";
export type VenueType =
  | "apartment"
  | "hotel"
  | "conference_room"
  | "event_hall"
  | "garden"
  | "terrace"
  | "church"
  | "private_home"
  | "outdoor_space"
  | "stage"
  | "other"
  | "unknown";
export type ExtractionType = "explicit" | "inferred" | "assumed";
export type ConfirmationStatus = "confirmed" | "unconfirmed" | "needs_confirmation" | "contradicted";
export type QualificationStage =
  | "initial"
  | "understanding"
  | "core_qualification"
  | "service_qualification"
  | "optional_details"
  | "ready_to_recommend"
  | "recommended"
  | "ready_for_matching";
export type RecommendationTier = "essential" | "standard" | "premium";
export type RecommendationStatus = "not_ready" | "draft" | "ready" | "revealed";
export type MatchingStatus = "not_requested" | "not_ready" | "ready" | "revealed";

export type QuestionField =
  | "eventType"
  | "guestCount"
  | "location"
  | "venueType"
  | "indoorOutdoor"
  | "eventDate"
  | "serviceNeeds"
  | "deliveryNeeded"
  | "installationNeeded"
  | "technicianNeeded"
  | "budgetRange"
  | "constraints";

export type ChatMessage = {
  id: string;
  role: ActorRole;
  kind:
    | "message"
    | "question"
    | "clarification"
    | "summary"
    | "recommendation"
    | "results_reveal"
    | "system_note";
  content: string;
  createdAt: string;
  metadata?: {
    relatedField?: QuestionField;
    extractedFieldIds?: string[];
    recommendationId?: string;
    providerIds?: string[];
  };
};

export type ExtractedField<T = unknown> = {
  id: string;
  field: QuestionField;
  value: T;
  confidence: number; // 0..1
  extractionType: ExtractionType;
  confirmationStatus: ConfirmationStatus;
  sourceMessageId: string;
  sourceTextSnippet?: string;
};

export type BriefField<T> = {
  value: T | null;
  confidence: number;
  extractionType?: ExtractionType;
  confirmationStatus: ConfirmationStatus;
  sourceMessageIds: string[];
  lastUpdatedAt?: string;
};

export type EventBrief = {
  eventType: BriefField<EventType>;
  guestCount: BriefField<number>;
  location: BriefField<{ label: string; city?: string; district?: string; address?: string; lat?: number; lng?: number }>;
  venueType: BriefField<VenueType>;
  indoorOutdoor: BriefField<IndoorOutdoor>;
  eventDate: BriefField<{ raw: string; isoDate?: string; isApproximate?: boolean }>;
  serviceNeeds: BriefField<ServiceNeed[]>;
  deliveryNeeded: BriefField<boolean>;
  installationNeeded: BriefField<boolean>;
  technicianNeeded: BriefField<boolean>;
  budgetRange: BriefField<{ min?: number; max?: number; currency?: "EUR"; raw?: string }>;
  constraints: BriefField<string[]>;
  specialNotes: BriefField<string[]>;
};

export type QualificationState = {
  stage: QualificationStage;
  knownFields: QuestionField[];
  missingCriticalFields: QuestionField[];
  missingSecondaryFields: QuestionField[];
  nextQuestionField?: QuestionField;
  nextQuestionReason?: string;
  completionScore: number; // 0..100
  minimumViableBriefReached: boolean;
  readyToRecommend: boolean;
};

export type RecommendedEquipmentItem = {
  category:
    | "front_speakers"
    | "delay_speakers"
    | "subwoofers"
    | "wireless_microphones"
    | "wired_microphones"
    | "mixing_console"
    | "dj_input"
    | "lighting_pack"
    | "led_screen"
    | "video_support"
    | "stands_rigging"
    | "cabling_accessories";
  label: string;
  required: boolean;
  rationale?: string;
};

export type RecommendedServiceItem = {
  category: "delivery" | "installation" | "technician" | "dismantling" | "logistics_support";
  required: boolean;
  rationale?: string;
};

export type RecommendedSetup = {
  id: string;
  tier: RecommendationTier;
  status: RecommendationStatus;
  shortRationale: string;
  suitabilityNotes: string[];
  equipment: RecommendedEquipmentItem[];
  services: RecommendedServiceItem[];
  missingAssumptions: string[];
  confidence: number; // 0..1
};

export type ProviderMatchingInput = {
  requiredCategories: string[];
  requiredServices: string[];
  location?: { city?: string; district?: string; addressLabel?: string; lat?: number; lng?: number };
  eventDate?: { isoDate?: string; raw?: string };
  budgetRange?: { min?: number; max?: number; currency?: "EUR" };
  indoorOutdoor?: IndoorOutdoor;
  sizeTier?: "small" | "medium" | "large" | "xlarge";
  technicianRequired?: boolean;
  deliveryRequired?: boolean;
  installationRequired?: boolean;
  relevanceHints?: string[];
};

export type AssistantSessionMemory = {
  sessionId: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
  eventBrief: EventBrief;
  qualificationState: QualificationState;
  recommendations: RecommendedSetup[];
  activeRecommendationId?: string;
  matchingInput?: ProviderMatchingInput;
  matchingStatus: MatchingStatus;
};

export type QualificationAction =
  | "ask_question"
  | "clarify_ambiguity"
  | "confirm_field"
  | "summarize_known_info"
  | "recommend_setup"
  | "ask_optional_detail"
  | "end_qualification";

export type AssistantStatus = "idle" | "chatting" | "ready";

export type AssistantQuestion = {
  field: QuestionField;
  label: string;
  placeholder?: string;
  helper?: string;
  choices?: { value: string; label: string }[];
};

export type ProviderCapability = {
  categories: string[];
  services: {
    delivery?: boolean;
    installation?: boolean;
    technician?: boolean;
  };
  coverageLabel?: string;
  lat?: number;
  lng?: number;
};

export type MatchingProvider = {
  id: string;
  title: string;
  description?: string;
  location: string;
  pricePerDay?: number;
  rating?: number;
  ratingCount?: number;
  capabilities: ProviderCapability;
  image?: string;
};

export type ProviderScoreBreakdown = {
  total: number;
  criteria: {
    material: number;
    delivery: number;
    proximity: number;
    installation: number;
    technician: number;
    date: number;
    budget: number;
    confidence: number;
  };
  rationale: string[];
};

// UI-friendly lightweight recommendation structures
export type UiEquipmentRequirement = {
  category: string;
  subcategory?: string;
  quantity?: number;
  label: string;
  notes?: string;
};

export type UiSetupTier = {
  id: "essential" | "standard" | "premium";
  title: string;
  items: UiEquipmentRequirement[];
  services: string[];
  rationale?: string;
};

export type UiRecommendedSetups = {
  tiers: UiSetupTier[];
  summary: string;
};
