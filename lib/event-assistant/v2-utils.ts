/**
 * Utilitaires pour le moteur conversationnel V2
 */

import { ConversationEngineState, SlotState } from "./v2-types";
import { getSlotsSummary, getSlotValue } from "./slots-engine";
import { getDialogueStats } from "./dialogue-memory";
import { enableV2, isV2Enabled, getEngineVersionInfo } from "./migration-v2";

// ============================================================================
// ACTIVATION/DÉSACTIVATION
// ============================================================================

export function enableAssistantV2(): void {
  enableV2(true);
}

export function disableAssistantV2(): void {
  enableV2(false);
}

export function toggleAssistantVersion(): void {
  const currentlyV2 = isV2Enabled();
  enableV2(!currentlyV2);
}

// ============================================================================
// DEBUGGING & ANALYTICS
// ============================================================================

export function debugConversationState(state: ConversationEngineState): void {
  // Logs de debug supprimés volontairement (nettoyage). Pas d'effet runtime.
  void getSlotsSummary;
  void getDialogueStats;
  void state;
}

export function analyzeConversationEfficiency(state: ConversationEngineState): {
  efficiency: number;
  recommendations: string[];
  issues: string[];
} {
  const { dialogue, messages, slots } = state;
  const totalMessages = messages.length;
  const userMessages = messages.filter(m => m.role === "user").length;
  const resolvedSlots = Object.values(slots).filter(s => s.status === "resolved").length;
  
  const efficiency = userMessages > 0 ? resolvedSlots / userMessages : 0;
  const recommendations: string[] = [];
  const issues: string[] = [];
  
  // Analyze efficiency
  if (efficiency < 0.5) {
    issues.push("Faible efficacité : beaucoup de messages pour peu d'informations extraites");
    recommendations.push("Améliorer les extractors ou les patterns de reconnaissance");
  }
  
  // Analyze repetition
  const repeatedQuestions = dialogue.askedQuestions.filter((q, i, arr) => 
    arr.filter(other => other.field === q.field).length > 1
  );
  
  if (repeatedQuestions.length > 2) {
    issues.push("Trop de répétitions de questions");
    recommendations.push("Vérifier la logique anti-répétition");
  }
  
  // Analyze conversation length
  if (dialogue.conversationTurns > 15 && !state.qualification.readyToRecommend) {
    issues.push("Conversation trop longue sans qualification complète");
    recommendations.push("Revoir les seuils de qualification");
  }
  
  // Analyze conflicts
  const conflictedSlots = Object.values(slots).filter(s => s.status === "conflicted");
  if (conflictedSlots.length > 1) {
    issues.push("Plusieurs conflits non résolus");
    recommendations.push("Améliorer la résolution de conflits");
  }
  
  return {
    efficiency: Math.round(efficiency * 100) / 100,
    recommendations,
    issues
  };
}

// ============================================================================
// EXPORT UTILITIES
// ============================================================================

export function exportConversationSummary(state: ConversationEngineState): string {
  const slots = Object.entries(state.slots)
    .filter(([_, slot]) => slot.status === "resolved")
    .map(([field, slot]) => `${field}: ${JSON.stringify(getSlotValue(slot as SlotState<unknown>))}`)
    .join('\n');
    
  const messages = state.messages
    .map(m => `[${m.role}]: ${m.content}`)
    .join('\n');
    
  return `
RÉSUMÉ CONVERSATION - ${new Date().toLocaleString()}
===============================================

Session ID: ${state.sessionId}
Qualification: ${state.qualification.stage} (${state.qualification.completionScore}%)

INFORMATIONS EXTRAITES:
${slots || "Aucune information extraite"}

HISTORIQUE:
${messages}

STATS:
- Tours: ${state.dialogue.conversationTurns}
- Questions posées: ${state.dialogue.askedQuestions.length}
- Extractions: ${state.extractionLog.length}
`;
}

export function exportDebugReport(state: ConversationEngineState): Record<string, unknown> {
  return {
    metadata: {
      sessionId: state.sessionId,
      createdAt: state.createdAt,
      lastUpdatedAt: state.lastUpdatedAt,
      version: "v2",
      exportedAt: new Date().toISOString()
    },
    
    conversation: {
      messagesCount: state.messages.length,
      messages: state.messages,
      turns: state.dialogue.conversationTurns
    },
    
    extraction: {
      totalExtractions: state.extractionLog.length,
      extractionsByType: state.extractionLog.reduce((acc, e) => {
        acc[e.extractor] = (acc[e.extractor] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      log: state.extractionLog
    },
    
    slots: {
      summary: getSlotsSummary(state.slots),
      details: state.slots
    },
    
    dialogue: {
      stats: getDialogueStats(state.dialogue),
      askedQuestions: state.dialogue.askedQuestions,
      efficiency: analyzeConversationEfficiency(state)
    },
    
    qualification: state.qualification
  };
}

// ============================================================================
// BROWSER CONSOLE HELPERS
// ============================================================================

if (typeof window !== "undefined") {
  // Add global helpers for debugging
  (window as any).assistantV2Utils = {
    enable: enableAssistantV2,
    disable: disableAssistantV2,
    toggle: toggleAssistantVersion,
    debug: debugConversationState,
    analyze: analyzeConversationEfficiency,
    export: exportConversationSummary,
    info: getEngineVersionInfo
  };
  
  console.log("🤖 Assistant V2 utils disponibles via window.assistantV2Utils");
}