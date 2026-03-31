/**
 * Migration helper for transitioning from V1 to V2 assistant engine
 */

import { ConversationEngineState } from "./v2-types";
import { AssistantState as V1State } from "../../hooks/useAssistantConversation";
import { createInitialConversationState } from "./conversation-engine-v2";
import { createInitialSlotsState, addCandidateToSlot } from "./slots-engine";
import { createCandidateSource } from "./extraction-engine";
import { createEmptyDialogueMemory } from "./dialogue-memory";

// ============================================================================
// V1 TO V2 MIGRATION
// ============================================================================

export function migrateV1ToV2(v1State: V1State): ConversationEngineState {
  const v2State = createInitialConversationState();
  
  // Migrate messages
  v2State.messages = [...v1State.messages];
  
  // Migrate brief to slots  
  const { brief } = v1State;
  let slots = createInitialSlotsState();
  
  // Convert each field from brief to slot candidates
  if (brief.eventType.value) {
    const source = createCandidateSource(
      brief.eventType.sourceMessageIds[0] || "migration",
      brief.eventType.value,
      "migration",
      brief.eventType.confidence
    );
    slots.eventType = addCandidateToSlot(slots.eventType, brief.eventType.value, source);
  }
  
  if (brief.guestCount.value) {
    const source = createCandidateSource(
      brief.guestCount.sourceMessageIds[0] || "migration", 
      brief.guestCount.value.toString(),
      "migration",
      brief.guestCount.confidence
    );
    slots.guestCount = addCandidateToSlot(slots.guestCount, brief.guestCount.value, source);
  }
  
  if (brief.location.value) {
    const source = createCandidateSource(
      brief.location.sourceMessageIds[0] || "migration",
      JSON.stringify(brief.location.value),
      "migration", 
      brief.location.confidence
    );
    slots.location = addCandidateToSlot(slots.location, brief.location.value, source);
  }
  
  if (brief.venueType.value) {
    const source = createCandidateSource(
      brief.venueType.sourceMessageIds[0] || "migration",
      brief.venueType.value,
      "migration",
      brief.venueType.confidence
    );
    slots.venueType = addCandidateToSlot(slots.venueType, brief.venueType.value, source);
  }
  
  if (brief.indoorOutdoor.value) {
    const source = createCandidateSource(
      brief.indoorOutdoor.sourceMessageIds[0] || "migration",
      brief.indoorOutdoor.value,
      "migration",
      brief.indoorOutdoor.confidence
    );
    slots.indoorOutdoor = addCandidateToSlot(slots.indoorOutdoor, brief.indoorOutdoor.value, source);
  }
  
  if (brief.eventDate.value) {
    const source = createCandidateSource(
      brief.eventDate.sourceMessageIds[0] || "migration",
      JSON.stringify(brief.eventDate.value),
      "migration",
      brief.eventDate.confidence
    );
    slots.eventDate = addCandidateToSlot(slots.eventDate, brief.eventDate.value, source);
  }
  
  if (brief.serviceNeeds.value) {
    const source = createCandidateSource(
      brief.serviceNeeds.sourceMessageIds[0] || "migration",
      JSON.stringify(brief.serviceNeeds.value),
      "migration", 
      brief.serviceNeeds.confidence
    );
    slots.serviceNeeds = addCandidateToSlot(slots.serviceNeeds, brief.serviceNeeds.value, source);
  }
  
  if (brief.deliveryNeeded.value !== null) {
    const source = createCandidateSource(
      brief.deliveryNeeded.sourceMessageIds[0] || "migration",
      brief.deliveryNeeded.value.toString(),
      "migration",
      brief.deliveryNeeded.confidence
    );
    slots.deliveryNeeded = addCandidateToSlot(slots.deliveryNeeded, brief.deliveryNeeded.value, source);
  }
  
  if (brief.installationNeeded.value !== null) {
    const source = createCandidateSource(
      brief.installationNeeded.sourceMessageIds[0] || "migration", 
      brief.installationNeeded.value.toString(),
      "migration",
      brief.installationNeeded.confidence
    );
    slots.installationNeeded = addCandidateToSlot(slots.installationNeeded, brief.installationNeeded.value, source);
  }
  
  if (brief.technicianNeeded.value !== null) {
    const source = createCandidateSource(
      brief.technicianNeeded.sourceMessageIds[0] || "migration",
      brief.technicianNeeded.value.toString(), 
      "migration",
      brief.technicianNeeded.confidence
    );
    slots.technicianNeeded = addCandidateToSlot(slots.technicianNeeded, brief.technicianNeeded.value, source);
  }
  
  if (brief.budgetRange.value) {
    const source = createCandidateSource(
      brief.budgetRange.sourceMessageIds[0] || "migration",
      JSON.stringify(brief.budgetRange.value),
      "migration",
      brief.budgetRange.confidence  
    );
    slots.budgetRange = addCandidateToSlot(slots.budgetRange, brief.budgetRange.value, source);
  }
  
  if (brief.constraints.value) {
    const source = createCandidateSource(
      brief.constraints.sourceMessageIds[0] || "migration",
      JSON.stringify(brief.constraints.value),
      "migration", 
      brief.constraints.confidence
    );
    slots.constraints = addCandidateToSlot(slots.constraints, brief.constraints.value, source);
  }
  
  v2State.slots = slots;
  
  // Initialize dialogue memory based on message count
  v2State.dialogue = {
    ...createEmptyDialogueMemory(),
    conversationTurns: Math.floor(v1State.messages.length / 2) // Rough estimate
  };
  
  // Migrate qualification state
  v2State.qualification = v1State.qualification;
  
  // Set UI state
  v2State.isExpanded = v1State.isExpanded;
  v2State.status = v1State.status === "chatting" ? "responding" : "idle";
  
  return v2State;
}

// ============================================================================
// STORAGE MIGRATION
// ============================================================================

const V1_STORAGE_KEY = "assistant_inline_session_v1";
const V2_STORAGE_KEY = "assistant_conversation_v2";

export function migrateStorageFromV1(): boolean {
  if (typeof window === "undefined") return false;
  
  try {
    const v1Raw = localStorage.getItem(V1_STORAGE_KEY);
    const v2Raw = localStorage.getItem(V2_STORAGE_KEY);
    
    // Only migrate if V1 exists and V2 doesn't
    if (!v1Raw || v2Raw) return false;
    
    const v1State = JSON.parse(v1Raw);
    const v2State = migrateV1ToV2(v1State);
    
    localStorage.setItem(V2_STORAGE_KEY, JSON.stringify(v2State));
    
    // Keep V1 for rollback but mark as migrated
    localStorage.setItem(`${V1_STORAGE_KEY}_migrated`, Date.now().toString());
    
    return true;
  } catch (error) {
    console.warn("V1 to V2 migration failed:", error);
    return false;
  }
}

// ============================================================================
// ROLLBACK HELPERS  
// ============================================================================

export function canRollbackToV1(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(`${V1_STORAGE_KEY}_migrated`) !== null;
}

export function rollbackToV1(): boolean {
  if (typeof window === "undefined") return false;
  
  try {
    // Remove V2 state
    localStorage.removeItem(V2_STORAGE_KEY);
    
    // Remove migration marker to re-enable V1
    localStorage.removeItem(`${V1_STORAGE_KEY}_migrated`);
    
    return true;
  } catch {
    return false;
  }
}

// ============================================================================
// FEATURE FLAGS
// ============================================================================

export function isV2Enabled(): boolean {
  if (typeof window === "undefined") return false;
  
  // Check for explicit opt-in
  const forceV2 = localStorage.getItem("assistant_force_v2") === "true";
  const forceV1 = localStorage.getItem("assistant_force_v1") === "true";
  
  if (forceV1) return false;
  if (forceV2) return true;
  
  // Default rollout logic - could be based on user ID, random %, etc.
  return false; // Conservative default - start with V1
}

export function enableV2(enable: boolean = true): void {
  if (typeof window === "undefined") return;
  
  if (enable) {
    localStorage.setItem("assistant_force_v2", "true");
    localStorage.removeItem("assistant_force_v1");
  } else {
    localStorage.setItem("assistant_force_v1", "true"); 
    localStorage.removeItem("assistant_force_v2");
  }
}

// ============================================================================
// DEBUG HELPERS
// ============================================================================

export function getEngineVersionInfo() {
  if (typeof window === "undefined") return null;
  
  return {
    v2Enabled: isV2Enabled(),
    canRollback: canRollbackToV1(),
    hasV1Data: localStorage.getItem(V1_STORAGE_KEY) !== null,
    hasV2Data: localStorage.getItem(V2_STORAGE_KEY) !== null,
    migrationDate: localStorage.getItem(`${V1_STORAGE_KEY}_migrated`)
  };
}