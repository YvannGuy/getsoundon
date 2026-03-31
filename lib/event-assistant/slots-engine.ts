import { v4 as uuid } from "uuid";
import { QuestionField } from "./types";
import { 
  SlotState, 
  SlotCandidate, 
  SlotStatus, 
  CandidateSource,
  FieldPolicy,
  ConversationEngineState 
} from "./v2-types";

// ============================================================================
// CONFIGURATION DES POLITIQUES DE CHAMPS
// ============================================================================

export const FIELD_POLICIES: Record<QuestionField, FieldPolicy> = {
  eventType: {
    field: "eventType",
    priority: "critical",
    maxAskedCount: 2,
    minConfidenceToResolve: 0.8,
    allowsInference: true,
    conflictResolution: "higher_confidence"
  },
  guestCount: {
    field: "guestCount", 
    priority: "critical",
    maxAskedCount: 2,
    minConfidenceToResolve: 0.85,
    allowsInference: false,
    conflictResolution: "most_recent"
  },
  location: {
    field: "location",
    priority: "critical", 
    maxAskedCount: 2,
    minConfidenceToResolve: 0.8,
    allowsInference: false,
    conflictResolution: "user_preference"
  },
  indoorOutdoor: {
    field: "indoorOutdoor",
    priority: "critical",
    maxAskedCount: 1,
    minConfidenceToResolve: 0.75,
    allowsInference: true,
    dependsOn: ["venueType"],
    conflictResolution: "context_based"
  },
  serviceNeeds: {
    field: "serviceNeeds",
    priority: "critical",
    maxAskedCount: 2, 
    minConfidenceToResolve: 0.7,
    allowsInference: false,
    conflictResolution: "higher_confidence"
  },
  eventDate: {
    field: "eventDate",
    priority: "important",
    maxAskedCount: 2,
    minConfidenceToResolve: 0.8,
    allowsInference: false,
    conflictResolution: "most_recent"
  },
  venueType: {
    field: "venueType",
    priority: "important", 
    maxAskedCount: 2,
    minConfidenceToResolve: 0.75,
    allowsInference: true,
    conflictResolution: "higher_confidence"
  },
  deliveryNeeded: {
    field: "deliveryNeeded",
    priority: "optional",
    maxAskedCount: 1,
    minConfidenceToResolve: 0.7,
    allowsInference: true,
    conflictResolution: "user_preference"
  },
  installationNeeded: {
    field: "installationNeeded",
    priority: "optional",
    maxAskedCount: 1,
    minConfidenceToResolve: 0.7,
    allowsInference: true,
    conflictResolution: "user_preference"
  },
  technicianNeeded: {
    field: "technicianNeeded", 
    priority: "optional",
    maxAskedCount: 1,
    minConfidenceToResolve: 0.7,
    allowsInference: true,
    conflictResolution: "user_preference"
  },
  budgetRange: {
    field: "budgetRange",
    priority: "contextual",
    maxAskedCount: 1,
    minConfidenceToResolve: 0.6,
    allowsInference: false,
    conflictResolution: "most_recent"
  },
  constraints: {
    field: "constraints",
    priority: "contextual",
    maxAskedCount: 1,
    minConfidenceToResolve: 0.6,
    allowsInference: false,
    conflictResolution: "higher_confidence"
  }
};

// ============================================================================
// CRÉATION ET INITIALISATION DES SLOTS
// ============================================================================

export function createEmptySlot<T>(field: QuestionField): SlotState<T> {
  return {
    key: field,
    status: "empty",
    resolvedValue: null,
    candidates: [],
    askedCount: 0,
    needsConfirmation: false,
    lockedByUser: false
  };
}

export function createInitialSlotsState(): ConversationEngineState['slots'] {
  return {
    eventType: createEmptySlot("eventType"),
    guestCount: createEmptySlot("guestCount"),
    location: createEmptySlot("location"),
    venueType: createEmptySlot("venueType"), 
    indoorOutdoor: createEmptySlot("indoorOutdoor"),
    eventDate: createEmptySlot("eventDate"),
    serviceNeeds: createEmptySlot("serviceNeeds"),
    deliveryNeeded: createEmptySlot("deliveryNeeded"),
    installationNeeded: createEmptySlot("installationNeeded"),
    technicianNeeded: createEmptySlot("technicianNeeded"),
    budgetRange: createEmptySlot("budgetRange"),
    constraints: createEmptySlot("constraints")
  };
}

// ============================================================================
// GESTION DES CANDIDATS 
// ============================================================================

export function addCandidateToSlot<T>(
  slot: SlotState<T>,
  value: T,
  source: CandidateSource,
  normalizedValue?: unknown
): SlotState<T> {
  const candidate: SlotCandidate<T> = {
    value,
    normalizedValue,
    confidence: source.confidence,
    source
  };

  const updatedSlot = {
    ...slot,
    candidates: [...slot.candidates, candidate],
    status: determineSlotStatus(slot, candidate)
  };

  return updatedSlot;
}

function determineSlotStatus<T>(slot: SlotState<T>, newCandidate: SlotCandidate<T>): SlotStatus {
  if (slot.lockedByUser) return "locked";
  
  const policy = FIELD_POLICIES[slot.key];
  const allCandidates = [...slot.candidates, newCandidate];
  
  // Check if we have conflicting high-confidence candidates
  const highConfCandidates = allCandidates.filter(c => c.confidence >= policy.minConfidenceToResolve);
  
  if (highConfCandidates.length === 0) return "candidate";
  if (highConfCandidates.length === 1) return "resolved";
  
  // Multiple high-confidence candidates
  const uniqueValues = new Set(highConfCandidates.map(c => JSON.stringify(c.value)));
  return uniqueValues.size > 1 ? "conflicted" : "resolved";
}

// ============================================================================
// RÉSOLUTION DES CONFLITS
// ============================================================================

export function resolveSlotConflicts<T>(slot: SlotState<T>): SlotState<T> {
  if (slot.status !== "conflicted") return slot;
  
  const policy = FIELD_POLICIES[slot.key];
  const highConfCandidates = slot.candidates.filter(
    c => c.confidence >= policy.minConfidenceToResolve
  );
  
  let resolvedCandidate: SlotCandidate<T>;
  
  switch (policy.conflictResolution) {
    case "higher_confidence":
      resolvedCandidate = highConfCandidates.reduce((best, current) => 
        current.confidence > best.confidence ? current : best
      );
      break;
      
    case "most_recent":
      resolvedCandidate = [...highConfCandidates].sort((a, b) => {
        const ta = new Date(a.source.createdAt).getTime();
        const tb = new Date(b.source.createdAt).getTime();
        if (ta !== tb) return ta - tb;
        // Même horodatage (même ms) : privilégier le candidat ajouté en dernier dans le slot
        return slot.candidates.indexOf(a) - slot.candidates.indexOf(b);
      }).pop()!;
      break;
      
    case "user_preference":
      // Prefer candidates from explicit user messages vs inferred
      const explicitCandidates = highConfCandidates.filter(
        c => c.source.extractor === "explicit_parser"
      );
      resolvedCandidate = explicitCandidates.length > 0 
        ? explicitCandidates[explicitCandidates.length - 1]
        : highConfCandidates[highConfCandidates.length - 1];
      break;
      
    case "context_based":
      // For context-based resolution, we might need additional logic
      // For now, fall back to higher confidence
      resolvedCandidate = highConfCandidates.reduce((best, current) => 
        current.confidence > best.confidence ? current : best
      );
      break;
      
    default:
      resolvedCandidate = highConfCandidates[0];
  }
  
  return {
    ...slot,
    status: "resolved",
    resolvedValue: resolvedCandidate.value,
    lastResolvedAt: new Date().toISOString()
  };
}

// ============================================================================
// QUERIES & HELPERS
// ============================================================================

export function isSlotResolved(slot: SlotState<unknown>): boolean {
  return slot.status === "resolved" || slot.status === "locked";
}

export function getSlotValue<T>(slot: SlotState<T>): T | null {
  return isSlotResolved(slot) ? slot.resolvedValue : null;
}

export function isSlotEmpty(slot: SlotState<unknown>): boolean {
  return slot.status === "empty" || (slot.candidates.length === 0);
}

export function canAskAgain(slot: SlotState<unknown>): boolean {
  const policy = FIELD_POLICIES[slot.key];
  return slot.askedCount < policy.maxAskedCount;
}

export function getHighestConfidenceCandidate<T>(slot: SlotState<T>): SlotCandidate<T> | null {
  if (slot.candidates.length === 0) return null;
  return slot.candidates.reduce((best, current) => 
    current.confidence > best.confidence ? current : best
  );
}

// ============================================================================
// BATCH OPERATIONS
// ============================================================================

export function applyCandidatesToSlots(
  slots: ConversationEngineState['slots'],
  candidates: Array<{ field: QuestionField; value: unknown; source: CandidateSource }>
): ConversationEngineState['slots'] {
  const updatedSlots = { ...slots };
  
  for (const candidate of candidates) {
    const currentSlot = updatedSlots[candidate.field];
    updatedSlots[candidate.field] = addCandidateToSlot(
      currentSlot as SlotState<unknown>,
      candidate.value,
      candidate.source
    ) as any;
  }
  
  return updatedSlots;
}

export function resolveAllSlotConflicts(
  slots: ConversationEngineState['slots']
): ConversationEngineState['slots'] {
  const updatedSlots = { ...slots };
  
  for (const [key, slot] of Object.entries(slots)) {
    if (slot.status === "conflicted") {
      updatedSlots[key as QuestionField] = resolveSlotConflicts(slot) as any;
    }
  }
  
  return updatedSlots;
}

// ============================================================================
// ANALYTICS & DEBUGGING
// ============================================================================

export function getSlotsSummary(slots: ConversationEngineState['slots']): {
  resolved: QuestionField[];
  conflicted: QuestionField[];
  empty: QuestionField[];
  needingConfirmation: QuestionField[];
} {
  const summary = {
    resolved: [] as QuestionField[],
    conflicted: [] as QuestionField[],
    empty: [] as QuestionField[],
    needingConfirmation: [] as QuestionField[]
  };
  
  for (const [field, slot] of Object.entries(slots)) {
    const fieldKey = field as QuestionField;
    
    if (slot.status === "resolved" || slot.status === "locked") {
      summary.resolved.push(fieldKey);
    } else if (slot.status === "conflicted") {
      summary.conflicted.push(fieldKey);
    } else if (slot.status === "empty") {
      summary.empty.push(fieldKey);
    }
    
    if (slot.needsConfirmation) {
      summary.needingConfirmation.push(fieldKey);
    }
  }
  
  return summary;
}