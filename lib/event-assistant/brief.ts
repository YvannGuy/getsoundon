import {
  ConfirmationStatus,
  EventBrief,
  EventType,
  ExtractionType,
  IndoorOutdoor,
  QuestionField,
  ServiceNeed,
  VenueType,
  BriefField,
  QualificationState,
  QualificationStage,
} from "./types";

const EMPTY_STRING_ARRAY: string[] = [];

function field<T>(value: T | null = null): BriefField<T> {
  return {
    value,
    confidence: 0,
    confirmationStatus: "unconfirmed",
    sourceMessageIds: [],
  };
}

export function createEmptyBrief(): EventBrief {
  return {
    eventType: field<EventType>(null),
    guestCount: field<number>(null),
    location: field<{ label: string; city?: string; district?: string; address?: string; lat?: number; lng?: number }>(null),
    venueType: field<VenueType>(null),
    indoorOutdoor: field<IndoorOutdoor>(null),
    eventDate: field<{ raw: string; isoDate?: string; isApproximate?: boolean }>(null),
    serviceNeeds: field<ServiceNeed[]>(null),
    deliveryNeeded: field<boolean>(null),
    installationNeeded: field<boolean>(null),
    technicianNeeded: field<boolean>(null),
    budgetRange: field<{ min?: number; max?: number; currency?: "EUR"; raw?: string }>(null),
    constraints: field<string[]>(null),
    specialNotes: field<string[]>(null),
  };
}

type MergeOpts<T> = {
  value: T | null;
  confidence?: number;
  extractionType?: ExtractionType;
  confirmationStatus?: ConfirmationStatus;
  sourceMessageId?: string;
};

export function mergeField<T>(current: BriefField<T>, incoming: MergeOpts<T>): BriefField<T> {
  if (incoming.value === null || incoming.value === undefined) return current;
  const now = new Date().toISOString();
  const mergedSources = new Set(current.sourceMessageIds);
  if (incoming.sourceMessageId) mergedSources.add(incoming.sourceMessageId);

  // If higher confidence, replace; otherwise keep best
  if ((incoming.confidence ?? 0) >= current.confidence) {
    return {
      ...current,
      value: incoming.value,
      confidence: incoming.confidence ?? current.confidence,
      extractionType: incoming.extractionType ?? current.extractionType,
      confirmationStatus: incoming.confirmationStatus ?? current.confirmationStatus ?? "unconfirmed",
      sourceMessageIds: Array.from(mergedSources),
      lastUpdatedAt: now,
    };
  }

  return {
    ...current,
    sourceMessageIds: Array.from(mergedSources),
    lastUpdatedAt: current.lastUpdatedAt ?? now,
  };
}

export function computeQualificationState(brief: EventBrief): QualificationState {
  const critical: QuestionField[] = ["eventType", "guestCount", "location", "indoorOutdoor", "serviceNeeds"];
  const secondary: QuestionField[] = [
    "eventDate",
    "deliveryNeeded",
    "installationNeeded",
    "technicianNeeded",
    "venueType",
    "budgetRange",
    "constraints",
  ];

  const known: QuestionField[] = [];
  const missingCritical: QuestionField[] = [];
  const missingSecondary: QuestionField[] = [];

  for (const field of critical) {
    const f = brief[field];
    if (f.value !== null) known.push(field);
    else missingCritical.push(field);
  }

  for (const field of secondary) {
    const f = brief[field];
    if (f.value !== null) known.push(field);
    else missingSecondary.push(field);
  }

  const completionScore = Math.min(100, Math.round((known.length / (critical.length + secondary.length)) * 100));
  const minimumViableBriefReached =
    brief.eventType.value !== null &&
    brief.guestCount.value !== null &&
    brief.location.value !== null &&
    brief.indoorOutdoor.value !== null &&
    brief.serviceNeeds.value !== null;

  const readyToRecommend = minimumViableBriefReached;

  let stage: QualificationStage = "initial";
  if (known.length > 0) stage = "understanding";
  if (known.filter((f) => critical.includes(f)).length >= 3) stage = "core_qualification";
  if (minimumViableBriefReached) stage = "ready_to_recommend";

  return {
    stage,
    knownFields: known,
    missingCriticalFields: missingCritical,
    missingSecondaryFields: missingSecondary,
    nextQuestionField: [...missingCritical, ...missingSecondary][0],
    nextQuestionReason: undefined,
    completionScore,
    minimumViableBriefReached,
    readyToRecommend,
  };
}

export function resolveNextQuestionField(brief: EventBrief, state: QualificationState): QuestionField | undefined {
  const criticalPriority: QuestionField[] = ["eventType", "guestCount", "location", "indoorOutdoor", "serviceNeeds"];
  const secondaryPriority: QuestionField[] = [
    "eventDate",
    "deliveryNeeded",
    "installationNeeded",
    "technicianNeeded",
    "venueType",
    "budgetRange",
    "constraints",
  ];

  for (const f of criticalPriority) {
    if (brief[f].value === null) return f;
  }
  for (const f of secondaryPriority) {
    if (brief[f].value === null) return f;
  }
  return state.nextQuestionField;
}

export function briefToKnownFields(brief: EventBrief): QuestionField[] {
  const result: QuestionField[] = [];
  (Object.keys(brief) as QuestionField[]).forEach((field) => {
    if (brief[field]?.value !== null) result.push(field);
  });
  return result;
}
