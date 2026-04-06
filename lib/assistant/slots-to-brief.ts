import { getSlotValue } from "@/lib/event-assistant/slots-engine";
import type { ConversationEngineState } from "@/lib/event-assistant/v2-types";
import type { EventBrief } from "@/lib/event-assistant/types";

/**
 * Convertit les slots V2 → EventBrief (même logique que useAssistantConversationV2).
 * Utilisé côté serveur pour reco / matching (pas de localStorage / window).
 */
export function convertSlotsToBrief(slots: ConversationEngineState["slots"]): EventBrief {
  return {
    eventType: {
      value: getSlotValue(slots.eventType),
      confidence: slots.eventType.status === "resolved" ? 0.9 : 0,
      confirmationStatus: slots.eventType.status === "resolved" ? "confirmed" : "unconfirmed",
      sourceMessageIds: slots.eventType.candidates.map((c) => c.source.messageId),
    },
    guestCount: {
      value: getSlotValue(slots.guestCount),
      confidence: slots.guestCount.status === "resolved" ? 0.9 : 0,
      confirmationStatus: slots.guestCount.status === "resolved" ? "confirmed" : "unconfirmed",
      sourceMessageIds: slots.guestCount.candidates.map((c) => c.source.messageId),
    },
    location: {
      value: getSlotValue(slots.location),
      confidence: slots.location.status === "resolved" ? 0.9 : 0,
      confirmationStatus: slots.location.status === "resolved" ? "confirmed" : "unconfirmed",
      sourceMessageIds: slots.location.candidates.map((c) => c.source.messageId),
    },
    venueType: {
      value: getSlotValue(slots.venueType),
      confidence: slots.venueType.status === "resolved" ? 0.9 : 0,
      confirmationStatus: slots.venueType.status === "resolved" ? "confirmed" : "unconfirmed",
      sourceMessageIds: slots.venueType.candidates.map((c) => c.source.messageId),
    },
    indoorOutdoor: {
      value: getSlotValue(slots.indoorOutdoor),
      confidence: slots.indoorOutdoor.status === "resolved" ? 0.9 : 0,
      confirmationStatus: slots.indoorOutdoor.status === "resolved" ? "confirmed" : "unconfirmed",
      sourceMessageIds: slots.indoorOutdoor.candidates.map((c) => c.source.messageId),
    },
    eventDate: {
      value: getSlotValue(slots.eventDate),
      confidence: slots.eventDate.status === "resolved" ? 0.9 : 0,
      confirmationStatus: slots.eventDate.status === "resolved" ? "confirmed" : "unconfirmed",
      sourceMessageIds: slots.eventDate.candidates.map((c) => c.source.messageId),
    },
    serviceNeeds: {
      value: getSlotValue(slots.serviceNeeds),
      confidence: slots.serviceNeeds.status === "resolved" ? 0.9 : 0,
      confirmationStatus: slots.serviceNeeds.status === "resolved" ? "confirmed" : "unconfirmed",
      sourceMessageIds: slots.serviceNeeds.candidates.map((c) => c.source.messageId),
    },
    deliveryNeeded: {
      value: getSlotValue(slots.deliveryNeeded),
      confidence: slots.deliveryNeeded.status === "resolved" ? 0.9 : 0,
      confirmationStatus: slots.deliveryNeeded.status === "resolved" ? "confirmed" : "unconfirmed",
      sourceMessageIds: slots.deliveryNeeded.candidates.map((c) => c.source.messageId),
    },
    installationNeeded: {
      value: getSlotValue(slots.installationNeeded),
      confidence: slots.installationNeeded.status === "resolved" ? 0.9 : 0,
      confirmationStatus: slots.installationNeeded.status === "resolved" ? "confirmed" : "unconfirmed",
      sourceMessageIds: slots.installationNeeded.candidates.map((c) => c.source.messageId),
    },
    technicianNeeded: {
      value: getSlotValue(slots.technicianNeeded),
      confidence: slots.technicianNeeded.status === "resolved" ? 0.9 : 0,
      confirmationStatus: slots.technicianNeeded.status === "resolved" ? "confirmed" : "unconfirmed",
      sourceMessageIds: slots.technicianNeeded.candidates.map((c) => c.source.messageId),
    },
    budgetRange: {
      value: getSlotValue(slots.budgetRange),
      confidence: slots.budgetRange.status === "resolved" ? 0.9 : 0,
      confirmationStatus: slots.budgetRange.status === "resolved" ? "confirmed" : "unconfirmed",
      sourceMessageIds: slots.budgetRange.candidates.map((c) => c.source.messageId),
    },
    constraints: {
      value: getSlotValue(slots.constraints),
      confidence: slots.constraints.status === "resolved" ? 0.9 : 0,
      confirmationStatus: slots.constraints.status === "resolved" ? "confirmed" : "unconfirmed",
      sourceMessageIds: slots.constraints.candidates.map((c) => c.source.messageId),
    },
    specialNotes: {
      value: null,
      confidence: 0,
      confirmationStatus: "unconfirmed",
      sourceMessageIds: [],
    },
  };
}
