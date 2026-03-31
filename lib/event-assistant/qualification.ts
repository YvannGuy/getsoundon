"use client";

import { v4 as uuid } from "uuid";

import { computeQualificationState, createEmptyBrief, mergeField, resolveNextQuestionField } from "./brief";
import { parseEventPrompt, ParsedSignal } from "./prompt-parser";
import {
  AssistantQuestion,
  EventBrief,
  QualificationState,
  QuestionField,
  ChatMessage,
} from "./types";

type ProcessResult = {
  brief: EventBrief;
  qualification: QualificationState;
  assistantMessage: ChatMessage;
  nextQuestion?: AssistantQuestion | null;
};

const QUESTIONS: Record<QuestionField, AssistantQuestion> = {
  eventType: {
    field: "eventType",
    label: "Quel est le type d'événement ? (conférence, anniversaire, DJ, mariage…)",
  },
  guestCount: { field: "guestCount", label: "Combien de personnes sont attendues ?" },
  location: { field: "location", label: "Dans quelle ville ou quel arrondissement se déroule l'événement ?" },
  venueType: { field: "venueType", label: "Quel type de lieu ? (appartement, hôtel, salle...)" },
  indoorOutdoor: { field: "indoorOutdoor", label: "En intérieur ou en extérieur ?" },
  eventDate: { field: "eventDate", label: "Quelle est la date ou la période ?" },
  serviceNeeds: { field: "serviceNeeds", label: "De quoi avez-vous besoin ? Son, micros, DJ, lumière, écran LED..." },
  deliveryNeeded: { field: "deliveryNeeded", label: "Souhaitez-vous la livraison ?" },
  installationNeeded: { field: "installationNeeded", label: "Besoin de l'installation sur place ?" },
  technicianNeeded: { field: "technicianNeeded", label: "Besoin d'un technicien pendant l'événement ?" },
  budgetRange: { field: "budgetRange", label: "Quel budget approximatif pour le setup ?" },
  constraints: { field: "constraints", label: "Y a-t-il des contraintes ou notes particulières ?" },
};

function confidenceFromExplicit(value: unknown): number {
  if (value === null || value === undefined) return 0;
  return 0.9;
}

export function processUserTurn(
  currentBrief: EventBrief,
  userText: string,
  userMessageId: string,
  isFirstMessage = false
): ProcessResult {
  const parsed = parseEventPrompt(userText);

  let brief = { ...currentBrief };
  const nowId = userMessageId;

  // Merge known signals
  brief.eventType = mergeField(brief.eventType, {
    value: parsed.eventType ?? null,
    confidence: confidenceFromExplicit(parsed.eventType),
    extractionType: "explicit",
    confirmationStatus: "confirmed",
    sourceMessageId: nowId,
  });

  brief.guestCount = mergeField(brief.guestCount, {
    value: parsed.guestCount ?? null,
    confidence: confidenceFromExplicit(parsed.guestCount),
    extractionType: "explicit",
    confirmationStatus: "confirmed",
    sourceMessageId: nowId,
  });

  brief.location = mergeField(brief.location, {
    value: parsed.locationLabel ? { label: parsed.locationLabel, city: parsed.locationLabel } : null,
    confidence: confidenceFromExplicit(parsed.locationLabel),
    extractionType: "explicit",
    confirmationStatus: "confirmed",
    sourceMessageId: nowId,
  });

  brief.indoorOutdoor = mergeField(brief.indoorOutdoor, {
    value: parsed.indoorOutdoor ?? null,
    confidence: parsed.indoorOutdoor ? 0.85 : 0,
    extractionType: parsed.indoorOutdoor ? "inferred" : "unconfirmed",
    confirmationStatus: parsed.indoorOutdoor ? "confirmed" : "unconfirmed",
    sourceMessageId: nowId,
  });

  brief.serviceNeeds = mergeField(brief.serviceNeeds, {
    value: parsed.serviceNeeds ?? null,
    confidence: parsed.serviceNeeds ? 0.92 : 0,
    extractionType: "explicit",
    confirmationStatus: parsed.serviceNeeds ? "confirmed" : "unconfirmed",
    sourceMessageId: nowId,
  });

  brief.eventDate = mergeField(brief.eventDate, {
    value: parsed.eventDateRaw ? { raw: parsed.eventDateRaw } : null,
    confidence: parsed.eventDateRaw ? 0.85 : 0,
    extractionType: "explicit",
    confirmationStatus: parsed.eventDateRaw ? "confirmed" : "unconfirmed",
    sourceMessageId: nowId,
  });

  brief.deliveryNeeded = mergeField(brief.deliveryNeeded, {
    value: parsed.delivery ?? null,
    confidence: parsed.delivery ? 0.8 : 0,
    extractionType: "explicit",
    confirmationStatus: parsed.delivery ? "confirmed" : "unconfirmed",
    sourceMessageId: nowId,
  });

  brief.installationNeeded = mergeField(brief.installationNeeded, {
    value: parsed.installation ?? null,
    confidence: parsed.installation ? 0.8 : 0,
    extractionType: "explicit",
    confirmationStatus: parsed.installation ? "confirmed" : "unconfirmed",
    sourceMessageId: nowId,
  });

  brief.technicianNeeded = mergeField(brief.technicianNeeded, {
    value: parsed.technician ?? null,
    confidence: parsed.technician ? 0.8 : 0,
    extractionType: "explicit",
    confirmationStatus: parsed.technician ? "confirmed" : "unconfirmed",
    sourceMessageId: nowId,
  });

  // Qualification state
  const qualification = computeQualificationState(brief);
  const nextField = resolveNextQuestionField(brief, qualification);
  const nextQuestion = nextField ? QUESTIONS[nextField] : undefined;

  // Accusé de réception naturel (sauf premier message qui contient déjà le contexte)
  let ack = "";
  if (!isFirstMessage) {
    const ackParts: string[] = [];
    if (parsed.locationLabel) ackParts.push(parsed.locationLabel);
    if (parsed.guestCount) ackParts.push(`${parsed.guestCount} personnes`);
    if (parsed.indoorOutdoor === "indoor") ackParts.push("intérieur");
    if (parsed.indoorOutdoor === "outdoor") ackParts.push("extérieur");
    if (parsed.eventDateRaw) ackParts.push(parsed.eventDateRaw);
    if (ackParts.length > 0) {
      ack = `Noté${ackParts.length === 1 ? ` (${ackParts[0]})` : ""} ! `;
    }
  }

  const assistantMessage: ChatMessage = {
    id: `assistant-${uuid()}`,
    role: "assistant",
    kind: nextQuestion ? "question" : "summary",
    content: nextQuestion
      ? `${ack}${nextQuestion.label}`
      : "Parfait, j'ai tout ce qu'il me faut ! Je vous prépare une sélection de prestataires adaptée.",
    createdAt: new Date().toISOString(),
    metadata: { relatedField: nextField },
  };

  return {
    brief,
    qualification,
    assistantMessage,
    nextQuestion,
  };
}

export function createInitialAssistantState() {
  const brief = createEmptyBrief();
  return {
    brief,
    qualification: computeQualificationState(brief),
  };
}