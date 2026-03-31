import { QuestionField } from "./types";
import { AskedQuestion, DialogueMemory, ConversationPolicy } from "./v2-types";

// ============================================================================
// POLITIQUE ANTI-RÉPÉTITION
// ============================================================================

export const DEFAULT_CONVERSATION_POLICY: ConversationPolicy = {
  maxRepeatQuestion: 2,
  minTurnsBetweenSameQuestion: 3,
  maxConversationTurns: 20,
  minConfidenceThreshold: 0.7,
  antiRepetitionStrategy: "alternative_phrasing"
};

// ============================================================================
// CRÉATION ET INITIALISATION
// ============================================================================

export function createEmptyDialogueMemory(): DialogueMemory {
  return {
    askedQuestions: [],
    conversationTurns: 0
  };
}

// ============================================================================
// SEMANTIC KEYS GENERATION
// ============================================================================

function generateSemanticKey(field: QuestionField, context?: string): string {
  const base = field;
  const contextHash = context ? `-${context.slice(0, 8)}` : '';
  return `${base}${contextHash}`;
}

// ============================================================================
// QUESTION TRACKING
// ============================================================================

export function hasAskedQuestion(
  memory: DialogueMemory,
  field: QuestionField,
  policy: ConversationPolicy = DEFAULT_CONVERSATION_POLICY
): boolean {
  const questionsForField = memory.askedQuestions.filter(q => q.field === field);
  return questionsForField.length >= policy.maxRepeatQuestion;
}

export function canAskQuestionAgain(
  memory: DialogueMemory, 
  field: QuestionField,
  policy: ConversationPolicy = DEFAULT_CONVERSATION_POLICY
): boolean {
  const questionsForField = memory.askedQuestions.filter(q => q.field === field);
  
  if (questionsForField.length === 0) return true;
  if (questionsForField.length >= policy.maxRepeatQuestion) return false;
  
  const lastAsked = questionsForField[questionsForField.length - 1];
  const turnsSince = memory.conversationTurns - parseInt(lastAsked.askedAt);
  
  return turnsSince >= policy.minTurnsBetweenSameQuestion;
}

export function getQuestionHistory(
  memory: DialogueMemory,
  field: QuestionField
): AskedQuestion[] {
  return memory.askedQuestions.filter(q => q.field === field);
}

// ============================================================================
// MEMORY UPDATES
// ============================================================================

export function recordQuestionAsked(
  memory: DialogueMemory,
  field: QuestionField,
  context?: string
): DialogueMemory {
  const semanticKey = generateSemanticKey(field, context);
  
  const newQuestion: AskedQuestion = {
    field,
    semanticKey,
    askedAt: memory.conversationTurns.toString(),
    answered: false
  };
  
  return {
    ...memory,
    askedQuestions: [...memory.askedQuestions, newQuestion],
    pendingQuestionField: field,
    pendingQuestionSemanticKey: semanticKey
  };
}

export function recordQuestionAnswered(
  memory: DialogueMemory,
  field: QuestionField,
  messageId?: string
): DialogueMemory {
  const updatedQuestions = memory.askedQuestions.map(q => {
    if (q.field === field && !q.answered) {
      return {
        ...q,
        answered: true,
        supersededByMessageId: messageId
      };
    }
    return q;
  });
  
  return {
    ...memory,
    askedQuestions: updatedQuestions,
    pendingQuestionField: memory.pendingQuestionField === field ? undefined : memory.pendingQuestionField,
    pendingQuestionSemanticKey: undefined
  };
}

export function incrementConversationTurn(memory: DialogueMemory): DialogueMemory {
  return {
    ...memory,
    conversationTurns: memory.conversationTurns + 1
  };
}

// ============================================================================
// QUESTION STRATEGY HELPERS
// ============================================================================

export function shouldSkipQuestion(
  memory: DialogueMemory,
  field: QuestionField,
  policy: ConversationPolicy = DEFAULT_CONVERSATION_POLICY
): boolean {
  return hasAskedQuestion(memory, field, policy) && 
         policy.antiRepetitionStrategy === "skip_question";
}

export function needsAlternativePhrasing(
  memory: DialogueMemory,
  field: QuestionField,
  policy: ConversationPolicy = DEFAULT_CONVERSATION_POLICY
): boolean {
  const questionHistory = getQuestionHistory(memory, field);
  return questionHistory.length > 0 && 
         questionHistory.length < policy.maxRepeatQuestion &&
         policy.antiRepetitionStrategy === "alternative_phrasing";
}

export function shouldSwitchContext(
  memory: DialogueMemory,
  field: QuestionField,
  policy: ConversationPolicy = DEFAULT_CONVERSATION_POLICY
): boolean {
  return hasAskedQuestion(memory, field, policy) && 
         policy.antiRepetitionStrategy === "context_switch";
}

// ============================================================================
// PATTERN DETECTION
// ============================================================================

export function detectRepeatingPattern(memory: DialogueMemory): {
  hasPattern: boolean;
  repeatedFields: QuestionField[];
  suggestion: "diversify" | "conclude" | "clarify";
} {
  const recentQuestions = memory.askedQuestions.slice(-6); // Last 6 questions
  const fieldCounts: Record<string, number> = {};
  
  recentQuestions.forEach(q => {
    fieldCounts[q.field] = (fieldCounts[q.field] || 0) + 1;
  });
  
  const repeatedFields = Object.entries(fieldCounts)
    .filter(([_, count]) => count >= 2)
    .map(([field, _]) => field as QuestionField);
    
  const hasPattern = repeatedFields.length > 0;
  
  let suggestion: "diversify" | "conclude" | "clarify" = "diversify";
  if (memory.conversationTurns > 8 && hasPattern) {
    suggestion = "conclude";
  } else if (repeatedFields.length > 2) {
    suggestion = "clarify";
  }
  
  return {
    hasPattern,
    repeatedFields,
    suggestion
  };
}

// ============================================================================
// CONVERSATION FLOW ANALYSIS
// ============================================================================

export function analyzeConversationFlow(memory: DialogueMemory): {
  efficiency: number; // 0-1, higher is better
  repetitiveness: number; // 0-1, higher is worse
  coverage: number; // 0-1, higher is better  
  recommendation: "continue" | "accelerate" | "wrap_up";
} {
  const totalQuestions = memory.askedQuestions.length;
  const uniqueFields = new Set(memory.askedQuestions.map(q => q.field)).size;
  const answeredQuestions = memory.askedQuestions.filter(q => q.answered).length;
  
  const efficiency = totalQuestions > 0 ? answeredQuestions / totalQuestions : 0;
  const repetitiveness = totalQuestions > 0 ? (totalQuestions - uniqueFields) / totalQuestions : 0;
  const coverage = uniqueFields / Object.keys(DEFAULT_CONVERSATION_POLICY).length; // Approximation
  
  let recommendation: "continue" | "accelerate" | "wrap_up" = "continue";
  
  if (memory.conversationTurns > 15 || repetitiveness > 0.4) {
    recommendation = "wrap_up";
  } else if (efficiency < 0.6 && memory.conversationTurns > 8) {
    recommendation = "accelerate";
  }
  
  return {
    efficiency,
    repetitiveness, 
    coverage,
    recommendation
  };
}

// ============================================================================
// DEBUGGING & ANALYTICS
// ============================================================================

export function getDialogueStats(memory: DialogueMemory): {
  totalQuestions: number;
  answeredQuestions: number;
  unansweredQuestions: number;
  mostAskedField: QuestionField | null;
  conversationEfficiency: number;
} {
  const totalQuestions = memory.askedQuestions.length;
  const answeredQuestions = memory.askedQuestions.filter(q => q.answered).length;
  const unansweredQuestions = totalQuestions - answeredQuestions;
  
  const fieldCounts: Record<string, number> = {};
  memory.askedQuestions.forEach(q => {
    fieldCounts[q.field] = (fieldCounts[q.field] || 0) + 1;
  });
  
  const mostAskedField = Object.entries(fieldCounts)
    .reduce((max, [field, count]) => count > (max[1] || 0) ? [field, count] : max, [null, 0])[0] as QuestionField | null;
    
  const conversationEfficiency = totalQuestions > 0 ? answeredQuestions / totalQuestions : 0;
  
  return {
    totalQuestions,
    answeredQuestions,
    unansweredQuestions,
    mostAskedField,
    conversationEfficiency
  };
}