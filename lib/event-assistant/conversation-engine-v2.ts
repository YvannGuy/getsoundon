import { v4 as uuid } from "uuid";
import { ChatMessage, EventType, QuestionField, QualificationState, ServiceNeed } from "./types";
import { 
  ConversationEngineState, 
  AssistantActionV2, 
  AssistantActionType,
  ExtractionBatch,
  DialogueMemory,
  ConversationPolicy
} from "./v2-types";

import { normalizeUserText, extractFacts, createCandidateSource } from "./extraction-engine";
import { formatRequestedItemsForDisplay, mergeRequestedEquipmentState } from "./requested-equipment";
import { 
  createInitialSlotsState, 
  applyCandidatesToSlots, 
  resolveAllSlotConflicts,
  getSlotsSummary,
  getSlotValue,
  FIELD_POLICIES 
} from "./slots-engine";
import { 
  createEmptyDialogueMemory,
  recordQuestionAsked,
  recordQuestionAnswered, 
  incrementConversationTurn,
  canAskQuestionAgain,
  shouldSkipQuestion,
  needsAlternativePhrasing,
  analyzeConversationFlow,
  detectRepeatingPattern,
  DEFAULT_CONVERSATION_POLICY
} from "./dialogue-memory";

// ============================================================================
// CRÉATION D'ÉTAT INITIAL
// ============================================================================

export function createInitialConversationState(): ConversationEngineState {
  return {
    sessionId: uuid(),
    createdAt: new Date().toISOString(),
    lastUpdatedAt: new Date().toISOString(),
    
    messages: [],
    slots: createInitialSlotsState(),
    dialogue: createEmptyDialogueMemory(),
    qualification: {
      stage: "initial",
      knownFields: [],
      missingCriticalFields: [],
      missingSecondaryFields: [],
      completionScore: 0,
      minimumViableBriefReached: false,
      readyToRecommend: false
    },
    extractionLog: [],

    recommendationsTransitionDelivered: false,

    requestedItems: [],
    excludedEquipmentTypes: [],

    isExpanded: false,
    status: "idle"
  };
}

// ============================================================================
// PIPELINE PRINCIPAL DE TRAITEMENT
// ============================================================================

export interface ConversationEngine {
  processUserMessage(state: ConversationEngineState, userMessage: ChatMessage): {
    updatedState: ConversationEngineState;
    assistantResponse: ChatMessage;
    lastAction: AssistantActionV2;
  };
}

export class ConversationEngineImpl implements ConversationEngine {
  private policy: ConversationPolicy;
  
  constructor(policy: ConversationPolicy = DEFAULT_CONVERSATION_POLICY) {
    this.policy = policy;
  }
  
  processUserMessage(
    state: ConversationEngineState, 
    userMessage: ChatMessage
  ): { updatedState: ConversationEngineState; assistantResponse: ChatMessage; lastAction: AssistantActionV2 } {
    
    // 1. Increment conversation turn
    let updatedState = {
      ...state,
      messages: [...state.messages, userMessage],
      dialogue: incrementConversationTurn(state.dialogue),
      lastUpdatedAt: new Date().toISOString()
    };
    
    // 2. Normalize and extract facts from user message
    const normalized = normalizeUserText(userMessage.content);
    const extractionBatch = extractFacts(normalized, userMessage.id, {
      previousExtractions: updatedState.extractionLog
    });
    
    // 3. Apply extractions to slots
    updatedState = this.applyExtractionBatch(updatedState, extractionBatch);
    
    // 4. Resolve conflicts in slots
    updatedState = {
      ...updatedState,
      slots: resolveAllSlotConflicts(updatedState.slots),
    };

    const mergedEq = mergeRequestedEquipmentState(
      updatedState.requestedItems ?? [],
      updatedState.excludedEquipmentTypes ?? [],
      userMessage.content,
    );
    updatedState = {
      ...updatedState,
      requestedItems: mergedEq.requestedItems,
      excludedEquipmentTypes: mergedEq.excludedEquipmentTypes,
    };

    // 5. Update dialogue memory for answered questions  
    updatedState = this.updateDialogueMemoryForAnswers(updatedState, extractionBatch);
    
    // 6. Compute new qualification state
    updatedState = {
      ...updatedState,
      qualification: this.computeQualificationStateV2(updatedState)
    };
    
    // 7. Decide next assistant action
    const assistantAction = this.decideNextAssistantAction(updatedState);
    
    // 8. Compose assistant response
    const assistantResponse = this.composeAssistantMessage(assistantAction, updatedState);
    
    // 9. Update dialogue memory if we asked a question
    if (assistantAction.type === "ask_question" && assistantAction.targetField) {
      updatedState = {
        ...updatedState,
        dialogue: recordQuestionAsked(updatedState.dialogue, assistantAction.targetField)
      };
    }
    
    // 10. Add assistant message to conversation
    updatedState = {
      ...updatedState,
      messages: [...updatedState.messages, assistantResponse],
    };

    if (assistantAction.type === "provide_recommendations") {
      updatedState = {
        ...updatedState,
        recommendationsTransitionDelivered: true,
      };
    }

    return { updatedState, assistantResponse, lastAction: assistantAction };
  }
  
  // ============================================================================
  // EXTRACTION APPLICATION
  // ============================================================================
  
  private applyExtractionBatch(
    state: ConversationEngineState, 
    batch: ExtractionBatch
  ): ConversationEngineState {
    // Convert extractions to slot candidates
    const candidates = batch.extractions.map(extraction => ({
      field: extraction.field,
      value: extraction.normalizedValue,
      source: createCandidateSource(
        batch.messageId,
        extraction.rawValue as string,
        extraction.extractor,
        extraction.confidence
      )
    }));
    
    // Apply to slots
    const updatedSlots = applyCandidatesToSlots(state.slots, candidates);
    
    // Add to extraction log
    const updatedLog = [
      ...state.extractionLog,
      ...batch.extractions.map(e => ({ ...e, applied: true }))
    ];
    
    return {
      ...state,
      slots: updatedSlots,
      extractionLog: updatedLog
    };
  }
  
  // ============================================================================
  // DIALOGUE MEMORY UPDATES
  // ============================================================================
  
  private updateDialogueMemoryForAnswers(
    state: ConversationEngineState,
    batch: ExtractionBatch
  ): ConversationEngineState {
    let updatedDialogue = state.dialogue;
    
    // Mark questions as answered based on extractions
    const fieldsAnswered = new Set(batch.extractions.map(e => e.field));
    
    for (const field of fieldsAnswered) {
      updatedDialogue = recordQuestionAnswered(updatedDialogue, field, batch.messageId);
    }
    
    return {
      ...state,
      dialogue: updatedDialogue
    };
  }
  
  // ============================================================================
  // QUALIFICATION V2
  // ============================================================================
  
  private computeQualificationStateV2(state: ConversationEngineState): QualificationState {
    const slotsSummary = getSlotsSummary(state.slots);
    
    const criticalFields: QuestionField[] = Object.entries(FIELD_POLICIES)
      .filter(([_, policy]) => policy.priority === "critical")
      .map(([field, _]) => field as QuestionField);
      
    const importantFields: QuestionField[] = Object.entries(FIELD_POLICIES)
      .filter(([_, policy]) => policy.priority === "important") 
      .map(([field, _]) => field as QuestionField);
    
    const resolvedCritical = criticalFields.filter(field => 
      slotsSummary.resolved.includes(field)
    );
    
    const missingCritical = criticalFields.filter(field => 
      !slotsSummary.resolved.includes(field)
    );
    
    const missingImportant = importantFields.filter(field =>
      !slotsSummary.resolved.includes(field)
    );
    
    // Calculate completion score
    const totalCritical = criticalFields.length;
    const totalImportant = importantFields.length;
    const resolvedCriticalScore = (resolvedCritical.length / totalCritical) * 70;
    const resolvedImportantScore = (Math.max(0, importantFields.length - missingImportant.length) / totalImportant) * 30;
    const completionScore = resolvedCriticalScore + resolvedImportantScore;
    
    // Determine stage
    let stage = state.qualification.stage;
    if (completionScore >= 80) {
      stage = "ready_to_recommend";
    } else if (completionScore >= 60) {
      stage = "service_qualification";
    } else if (completionScore >= 40) {
      stage = "core_qualification";  
    } else {
      stage = "understanding";
    }
    
    const minimumViableBriefReached = resolvedCritical.length >= Math.ceil(totalCritical * 0.8);
    const readyToRecommend = missingCritical.length === 0 && completionScore >= 75;
    
    return {
      stage,
      knownFields: slotsSummary.resolved,
      missingCriticalFields: missingCritical,
      missingSecondaryFields: missingImportant,
      completionScore: Math.round(completionScore),
      minimumViableBriefReached,
      readyToRecommend
    };
  }
  
  // ============================================================================
  // DÉCISION DE L'ACTION SUIVANTE
  // ============================================================================
  
  private decideNextAssistantAction(state: ConversationEngineState): AssistantActionV2 {
    const { qualification, dialogue, slots } = state;
    const transitionAlreadySent = state.recommendationsTransitionDelivered === true;

    const postRecommendationAck: AssistantActionV2 = {
      type: "acknowledge_info",
      strategy: "contextual",
      priority: 75,
      reasoning: "Recommendations already introduced; continue dialogue",
      payload: { postRecommendation: true },
    };

    // Check if we should wrap up based on conversation analysis
    const flowAnalysis = analyzeConversationFlow(dialogue);
    const repeatingPattern = detectRepeatingPattern(dialogue);

    if (flowAnalysis.recommendation === "wrap_up" || repeatingPattern.suggestion === "conclude") {
      if (transitionAlreadySent) {
        return postRecommendationAck;
      }
      return {
        type: "provide_recommendations",
        strategy: "direct",
        priority: 100,
        reasoning: "Conversation needs conclusion due to length or repetition",
      };
    }

    if (qualification.readyToRecommend && transitionAlreadySent) {
      return postRecommendationAck;
    }

    // If ready to recommend, transition message (une seule fois)
    if (qualification.readyToRecommend && !transitionAlreadySent) {
      return {
        type: "provide_recommendations",
        strategy: "direct",
        priority: 95,
        reasoning: "Sufficient information collected for recommendations",
      };
    }
    
    // Handle conflicts that need clarification
    const conflictedFields = Object.entries(slots)
      .filter(([_, slot]) => slot.status === "conflicted")
      .map(([field, _]) => field as QuestionField);
      
    if (conflictedFields.length > 0) {
      const field = conflictedFields[0];
      return {
        type: "request_clarification",
        targetField: field,
        strategy: "direct",
        priority: 90,
        reasoning: `Conflicted information for ${field}`
      };
    }
    
    // Find next question to ask
    const nextField = this.findNextQuestionField(state);
    
    if (nextField) {
      const strategy = needsAlternativePhrasing(dialogue, nextField, this.policy) 
        ? "alternative" 
        : "direct";
        
      return {
        type: "ask_question",
        targetField: nextField,
        strategy,
        priority: 80,
        reasoning: `Need information for ${nextField}`
      };
    }
    
    // Acknowledge what we understood so far
    return {
      type: "acknowledge_info",
      strategy: "contextual",
      priority: 60,
      reasoning: "Acknowledging current understanding"
    };
  }
  
  // ============================================================================
  // SÉLECTION DE LA PROCHAINE QUESTION
  // ============================================================================
  
  private findNextQuestionField(state: ConversationEngineState): QuestionField | null {
    const { slots, dialogue, qualification } = state;
    
    // Priority order: critical -> important -> optional
    const priorityOrder: Array<keyof typeof FIELD_POLICIES> = [
      ...Object.entries(FIELD_POLICIES)
        .filter(([_, policy]) => policy.priority === "critical")
        .map(([field, _]) => field as QuestionField),
      ...Object.entries(FIELD_POLICIES) 
        .filter(([_, policy]) => policy.priority === "important")
        .map(([field, _]) => field as QuestionField),
      ...Object.entries(FIELD_POLICIES)
        .filter(([_, policy]) => policy.priority === "optional")
        .map(([field, _]) => field as QuestionField)
    ];
    
    for (const field of priorityOrder) {
      const slot = slots[field];
      
      // Skip if already resolved
      if (slot.status === "resolved" || slot.status === "locked") {
        continue;
      }
      
      // Skip if we should avoid asking again
      if (shouldSkipQuestion(dialogue, field, this.policy)) {
        continue;
      }
      
      // Check if we can ask again
      if (!canAskQuestionAgain(dialogue, field, this.policy)) {
        continue;
      }
      
      // Check dependencies
      const policy = FIELD_POLICIES[field];
      if (policy.dependsOn) {
        const dependenciesResolved = policy.dependsOn.every(dep => 
          slots[dep].status === "resolved" || slots[dep].status === "locked"
        );
        if (!dependenciesResolved) {
          continue;
        }
      }
      
      return field;
    }
    
    return null;
  }
  
  // ============================================================================
  // COMPOSITION DE MESSAGE
  // ============================================================================
  
  private composeAssistantMessage(
    action: AssistantActionV2,
    state: ConversationEngineState
  ): ChatMessage {
    const messageId = `assistant-${uuid()}`;
    let content = "";
    let kind: ChatMessage['kind'] = "message";
    
    switch (action.type) {
      case "ask_question":
        content = this.prefixFirstTurnRecapIfNeeded(
          state,
          this.generateQuestionText(action.targetField!, action.strategy, state),
        );
        kind = "question";
        break;

      case "request_clarification":
        content = this.prefixFirstTurnRecapIfNeeded(
          state,
          this.generateClarificationText(action.targetField!, state),
        );
        kind = "clarification";
        break;
        
      case "acknowledge_info":
        content =
          action.payload && (action.payload as { postRecommendation?: boolean }).postRecommendation
            ? this.generatePostRecommendationText(state)
            : this.generateAcknowledgmentText(state);
        kind = "message";
        break;

      case "provide_recommendations":
        content = this.generateRecommendationIntroText(state);
        kind = "recommendation";
        break;
        
      case "summarize_understanding":
        content = this.generateSummaryText(state);
        kind = "summary";
        break;
        
      default:
        content = "Comment puis-je vous aider davantage ?";
        kind = "message";
    }
    
    return {
      id: messageId,
      role: "assistant",
      kind,
      content,
      createdAt: new Date().toISOString(),
      metadata: {
        relatedField: action.targetField
      }
    };
  }
  
  // ============================================================================
  // GÉNÉRATION DE TEXTE
  // ============================================================================
  
  private isFirstUserTurn(state: ConversationEngineState): boolean {
    return state.messages.filter((m) => m.role === "user").length === 1;
  }

  /** Reformule ce qui est déjà résolu avant la première question de suivi. */
  private generateUnderstoodRecapParagraph(state: ConversationEngineState): string | null {
    const parts: string[] = [];

    const et = getSlotValue(state.slots.eventType) as EventType | null;
    const eventLabels: Partial<Record<EventType, string>> = {
      conference: "une conférence",
      wedding: "un mariage",
      birthday: "un anniversaire",
      cocktail: "un cocktail",
      corporate: "un événement corporate",
      private_party: "une soirée / fête",
    };
    if (et) parts.push(eventLabels[et] ?? `un événement (${String(et)})`);

    const gc = getSlotValue(state.slots.guestCount);
    if (typeof gc === "number") parts.push(`environ ${gc} personnes`);

    const loc = getSlotValue(state.slots.location);
    if (loc && (loc.city || loc.label)) parts.push(`à ${loc.city ?? loc.label}`);

    const ed = getSlotValue(state.slots.eventDate) as { raw?: string } | null;
    if (ed?.raw) parts.push(`prévu le ${ed.raw}`);

    const sn = getSlotValue(state.slots.serviceNeeds) as ServiceNeed[] | null;
    if (sn?.length) {
      const needLabels: Partial<Record<ServiceNeed, string>> = {
        sound: "son / enceintes",
        microphones: "micros",
        dj: "DJ",
        lighting: "lumière",
        led_screen: "écran",
        video: "vidéo",
        audiovisual: "audiovisuel",
        full_service: "clé en main",
      };
      parts.push(`besoin : ${sn.map((s) => needLabels[s] ?? s).join(", ")}`);
    }

    const vt = getSlotValue(state.slots.venueType);
    if (vt) parts.push(`type de lieu : ${String(vt).replace(/_/g, " ")}`);

    const io = getSlotValue(state.slots.indoorOutdoor);
    if (io === "indoor") parts.push("en intérieur");
    if (io === "outdoor") parts.push("en extérieur");

    if (getSlotValue(state.slots.deliveryNeeded) === true) parts.push("avec livraison");
    if (getSlotValue(state.slots.installationNeeded) === true) parts.push("avec installation");
    if (getSlotValue(state.slots.technicianNeeded) === true) parts.push("avec technicien");

    if (state.requestedItems?.length) {
      parts.push(`matériel : ${formatRequestedItemsForDisplay(state.requestedItems)}`);
    }

    const cx = getSlotValue(state.slots.constraints) as string[] | null;
    if (cx?.length) parts.push(`précision matériel : ${cx.join(", ")}`);

    if (parts.length === 0) return null;
    return `Voici ce que j’ai compris : ${parts.join(" — ")}.`;
  }

  private prefixFirstTurnRecapIfNeeded(state: ConversationEngineState, body: string): string {
    if (!this.isFirstUserTurn(state)) return body;
    const recap = this.generateUnderstoodRecapParagraph(state);
    return recap ? `${recap}\n\n${body}` : body;
  }

  private generateQuestionText(field: QuestionField, strategy: string, state: ConversationEngineState): string {
    const baseQuestions: Record<QuestionField, string[]> = {
      eventType: [
        "Quel type d'événement organisez-vous ?",
        "Pouvez-vous me dire quel genre d'événement c'est ?"
      ],
      guestCount: [
        "Combien de personnes sont attendues ?",
        "Quel est le nombre approximatif d'invités ?"
      ],
      location: [
        "Dans quelle ville se déroule votre événement ?",
        "Où aura lieu l'événement ?"
      ],
      indoorOutdoor: [
        "Ce sera en intérieur ou en extérieur ?",
        "Est-ce en salle couverte ou en plein air ?",
      ],
      serviceNeeds: [
        "De quoi avez-vous besoin : son, micros, DJ, éclairage, écran ?",
        "Quels services vous intéressent pour cet événement ?"
      ],
      eventDate: [
        "À quelle date aura lieu l'événement ?",
        "Avez-vous déjà une date en tête ?"
      ],
      venueType: [
        "Quel type de lieu : appartement, salle, hôtel... ?",
        "Dans quel genre d'endroit se déroule l'événement ?"
      ],
      deliveryNeeded: [
        "Souhaitez-vous que le matériel soit livré ?",
        "Avez-vous besoin de la livraison ?"
      ],
      installationNeeded: [
        "Faut-il installer le matériel sur place ?",
        "Souhaitez-vous l'installation du setup ?"
      ],
      technicianNeeded: [
        "Avez-vous besoin d'un technicien pendant l'événement ?",
        "Voulez-vous une assistance technique sur place ?"
      ],
      budgetRange: [
        "Avez-vous une idée de budget pour le matériel ?",
        "Dans quelle fourchette de prix souhaitez-vous rester ?"
      ],
      constraints: [
        "Y a-t-il des contraintes particulières à prévoir ?",
        "Avez-vous des exigences spécifiques ?"
      ]
    };
    
    const questions = baseQuestions[field] || ["Pouvez-vous me donner plus de détails ?"];
    const questionIndex = strategy === "alternative" ? 1 : 0;
    
    return questions[Math.min(questionIndex, questions.length - 1)];
  }
  
  private generateClarificationText(field: QuestionField, state: ConversationEngineState): string {
    const slot = state.slots[field];
    const candidates = slot.candidates.filter(c => c.confidence > 0.6);
    
    if (candidates.length === 2) {
      const values = candidates.map(c => JSON.stringify(c.value)).join(' ou ');
      return `Je vois deux informations pour ${field}: ${values}. Pouvez-vous préciser ?`;
    }
    
    return `Pouvez-vous clarifier l'information concernant ${field} ?`;
  }
  
  private generateRecommendationIntroText(state: ConversationEngineState): string {
    const et = getSlotValue(state.slots.eventType);
    const gc = getSlotValue(state.slots.guestCount);
    const loc = getSlotValue(state.slots.location);
    const io = getSlotValue(state.slots.indoorOutdoor);
    const parts: string[] = [];
    if (et) parts.push(String(et).replace(/_/g, " "));
    if (typeof gc === "number") parts.push(`environ ${gc} personnes`);
    if (loc && (loc.city || loc.label)) parts.push(`à ${loc.city ?? loc.label}`);
    if (io === "indoor") parts.push("en intérieur");
    if (io === "outdoor") parts.push("en extérieur");
    const recap = parts.length ? parts.join(", ") : "votre événement";
    return `Très bien — voici ce que je retiens : ${recap}. La configuration recommandée est détaillée juste en dessous dans l’interface.`;
  }

  /** Après la transition reco, réponses courtes pour éviter la répétition de la phrase d’intro. */
  private generatePostRecommendationText(state: ConversationEngineState): string {
    const variants = [
      "C’est noté. Souhaitez-vous modifier un détail (date, lieu, nombre d’invités ou besoins son / lumière) ?",
      "D’accord. Dites-moi si vous voulez affiner le brief ou explorer une autre option.",
      "Parfait. Je reste disponible pour ajuster la configuration ou répondre à une question précise.",
    ];
    const n = (state.dialogue.conversationTurns + state.messages.length) % variants.length;
    return variants[n];
  }

  private generateAcknowledgmentText(state: ConversationEngineState): string {
    const resolvedFields = Object.entries(state.slots)
      .filter(([_, slot]) => slot.status === "resolved")
      .length;
      
    const acknowledments = [
      "Merci pour ces informations.",
      "Je vois, c'est noté.",
      "Parfait, je comprends mieux votre besoin.",
      "D'accord, c'est plus clair maintenant."
    ];
    
    return acknowledments[resolvedFields % acknowledments.length];
  }
  
  private generateSummaryText(state: ConversationEngineState): string {
    const resolvedSlots = Object.entries(state.slots)
      .filter(([_, slot]) => slot.status === "resolved")
      .map(([field, slot]) => `${field}: ${JSON.stringify(getSlotValue(slot as any))}`)
      .join(", ");
      
    return `Récapitulatif de votre événement: ${resolvedSlots}`;
  }
}

// ============================================================================
// FACTORY
// ============================================================================

export function createConversationEngine(policy?: ConversationPolicy): ConversationEngine {
  return new ConversationEngineImpl(policy);
}