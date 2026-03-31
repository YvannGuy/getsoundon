import { v4 as uuid } from "uuid";
import { ChatMessage, QuestionField, QualificationState } from "./types";
import { 
  ConversationEngineState, 
  AssistantActionV2, 
  AssistantActionType,
  ExtractionBatch,
  DialogueMemory,
  ConversationPolicy
} from "./v2-types";

import { normalizeUserText, extractFacts, createCandidateSource } from "./extraction-engine";
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
  ): { updatedState: ConversationEngineState; assistantResponse: ChatMessage } {
    
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
      slots: resolveAllSlotConflicts(updatedState.slots)
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
      messages: [...updatedState.messages, assistantResponse]
    };
    
    return { updatedState, assistantResponse };
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
    
    // Check if we should wrap up based on conversation analysis
    const flowAnalysis = analyzeConversationFlow(dialogue);
    const repeatingPattern = detectRepeatingPattern(dialogue);
    
    if (flowAnalysis.recommendation === "wrap_up" || repeatingPattern.suggestion === "conclude") {
      return {
        type: "provide_recommendations",
        strategy: "direct",
        priority: 100,
        reasoning: "Conversation needs conclusion due to length or repetition"
      };
    }
    
    // If ready to recommend, do it
    if (qualification.readyToRecommend) {
      return {
        type: "provide_recommendations",
        strategy: "direct", 
        priority: 95,
        reasoning: "Sufficient information collected for recommendations"
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
        content = this.generateQuestionText(action.targetField!, action.strategy, state);
        kind = "question";
        break;
        
      case "request_clarification":
        content = this.generateClarificationText(action.targetField!, state);
        kind = "clarification";
        break;
        
      case "acknowledge_info":
        content = this.generateAcknowledgmentText(state);
        kind = "message";
        break;
        
      case "provide_recommendations":
        content = "Parfait ! Je peux maintenant vous proposer une configuration adaptée à votre événement.";
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
        "L'événement aura-t-il lieu en intérieur ou en extérieur ?",
        "Est-ce en salle ou en plein air ?"
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
      .map(([field, slot]) => `${field}: ${JSON.stringify(getSlotValue(slot))}`)
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