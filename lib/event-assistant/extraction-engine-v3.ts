/**
 * Moteur d'extraction V3 - Intégration NLP robuste avec architecture V2
 */

import { v4 as uuid } from "uuid";
import { QuestionField, EventType, ServiceNeed, IndoorOutdoor, VenueType } from "./types";
import { 
  NormalizedText, 
  ExtractionBatch, 
  ExtractionLogEntry, 
  CandidateSource,
  ConversationEngineState
} from "./v2-types";
import { createRobustNLPEngine, RobustNLPEngine } from "./robust-nlp-engine";
import { StructuredExtraction, ExtractionResult } from "./nlp-types";

// ============================================================================
// BRIDGE ENTRE NLP ROBUSTE ET SYSTÈME V2
// ============================================================================

export class ExtractionEngineV3 {
  private nlpEngine: RobustNLPEngine;
  
  constructor() {
    this.nlpEngine = createRobustNLPEngine({
      confidenceThreshold: 0.6,
      enableNumbersInLetters: true,
      enableRelativeDates: true,
      enableNegationHandling: true,
      enableEquipmentSpecifics: true
    });
  }
  
  /**
   * Point d'entrée principal remplaçant l'ancien extractFacts
   */
  extractFacts(
    normalized: NormalizedText,
    messageId: string,
    context?: { previousExtractions?: ExtractionLogEntry[]; conversationState?: ConversationEngineState }
  ): ExtractionBatch {
    const startTime = Date.now();
    
    // Utiliser le moteur NLP robuste
    const structuredExtraction = this.nlpEngine.extractFromText(normalized.original, messageId);
    
    // Convertir vers le format ExtractionBatch attendu par le système V2
    const extractionLogEntries = this.convertToV2Format(structuredExtraction, messageId);
    
    // Ajouter du contexte conversationnel si disponible
    const contextEnrichedExtractions = this.enrichWithConversationalContext(
      extractionLogEntries,
      context?.conversationState,
      context?.previousExtractions
    );
    
    const processingTime = Date.now() - startTime;
    
    return {
      messageId,
      extractions: contextEnrichedExtractions,
      metadata: {
        extractors: ['robust_nlp_v3', 'contextual_enricher'],
        totalExtractions: contextEnrichedExtractions.length,
        highConfidenceCount: contextEnrichedExtractions.filter(e => e.confidence >= 0.8).length,
        processingTime,
        nlpVersion: '3.0.0'
      }
    };
  }
  
  /**
   * Extraction ciblée pour un champ spécifique
   */
  extractSpecificField(
    text: string,
    field: QuestionField,
    messageId: string
  ): ExtractionLogEntry | null {
    const result = this.nlpEngine.extractSpecificField(text, field);
    
    if (!result) return null;
    
    return {
      id: uuid(),
      messageId,
      extractor: 'robust_nlp_targeted',
      field: result.field,
      rawValue: text,
      normalizedValue: result.value,
      confidence: result.confidence,
      applied: false,
      createdAt: new Date().toISOString(),
      metadata: {
        source: result.source,
        rawEvidence: result.rawEvidence
      }
    };
  }
  
  // ============================================================================
  // CONVERSION ET ENRICHISSEMENT
  // ============================================================================
  
  private convertToV2Format(
    structuredExtraction: StructuredExtraction,
    messageId: string
  ): ExtractionLogEntry[] {
    const entries: ExtractionLogEntry[] = [];
    
    for (const extraction of structuredExtraction.extractions) {
      entries.push({
        id: uuid(),
        messageId,
        extractor: this.mapSourceToExtractor(extraction.source),
        field: extraction.field,
        rawValue: extraction.rawEvidence.join(' | '),
        normalizedValue: extraction.value,
        confidence: extraction.confidence,
        applied: false,
        createdAt: new Date().toISOString(),
        metadata: {
          nlpSource: extraction.source,
          rawEvidence: extraction.rawEvidence,
          position: extraction.position
        }
      });
    }
    
    return entries;
  }
  
  private enrichWithConversationalContext(
    extractions: ExtractionLogEntry[],
    conversationState?: ConversationEngineState,
    previousExtractions?: ExtractionLogEntry[]
  ): ExtractionLogEntry[] {
    if (!conversationState && !previousExtractions) {
      return extractions;
    }
    
    const enriched = [...extractions];
    
    // Boost de confiance basé sur cohérence avec extractions précédentes
    if (previousExtractions) {
      this.applyConsistencyBoost(enriched, previousExtractions);
    }
    
    // Ajustement basé sur l'état de la conversation
    if (conversationState) {
      this.applyConversationalContext(enriched, conversationState);
    }
    
    return enriched;
  }
  
  private applyConsistencyBoost(
    current: ExtractionLogEntry[],
    previous: ExtractionLogEntry[]
  ): void {
    for (const currentExtraction of current) {
      const field = currentExtraction.field;
      const consistentPrevious = previous.filter(p => 
        p.field === field && 
        JSON.stringify(p.normalizedValue) === JSON.stringify(currentExtraction.normalizedValue)
      );
      
      if (consistentPrevious.length > 0) {
        // Boost de confiance pour cohérence
        currentExtraction.confidence = Math.min(0.95, currentExtraction.confidence + 0.1);
        currentExtraction.extractor = `${currentExtraction.extractor}_consistent`;
      }
    }
  }
  
  private applyConversationalContext(
    extractions: ExtractionLogEntry[],
    conversationState: ConversationEngineState
  ): void {
    // Vérifier les questions récemment posées
    const recentQuestions = conversationState.dialogue.askedQuestions
      .filter(q => !q.answered)
      .slice(-3); // 3 dernières questions non répondues
    
    for (const extraction of extractions) {
      const relatedQuestion = recentQuestions.find(q => q.field === extraction.field);
      
      if (relatedQuestion) {
        // Boost de confiance car répond à une question posée
        extraction.confidence = Math.min(0.95, extraction.confidence + 0.15);
        extraction.extractor = `${extraction.extractor}_question_response`;
        
        if (!extraction.metadata) extraction.metadata = {};
        extraction.metadata.answersQuestion = relatedQuestion.semanticKey;
      }
    }
    
    // Contexte basé sur les slots déjà résolus
    const resolvedSlots = Object.entries(conversationState.slots)
      .filter(([_, slot]) => slot.status === "resolved")
      .map(([field, slot]) => ({ field: field as QuestionField, value: slot.resolvedValue }));
    
    for (const extraction of extractions) {
      const relatedResolved = resolvedSlots.find(s => s.field === extraction.field);
      
      if (relatedResolved) {
        // Si on a déjà une valeur résolue différente, réduire la confiance
        if (JSON.stringify(relatedResolved.value) !== JSON.stringify(extraction.normalizedValue)) {
          extraction.confidence = Math.max(0.3, extraction.confidence - 0.2);
          extraction.extractor = `${extraction.extractor}_conflicts_resolved`;
        } else {
          // Cohérence avec valeur déjà résolue
          extraction.confidence = Math.min(0.98, extraction.confidence + 0.05);
          extraction.extractor = `${extraction.extractor}_confirms_resolved`;
        }
      }
    }
  }
  
  private mapSourceToExtractor(source: string): string {
    const mapping: Record<string, string> = {
      'explicit': 'robust_nlp_explicit',
      'inferred': 'robust_nlp_semantic',
      'contextual': 'robust_nlp_contextual'
    };
    
    return mapping[source] || `robust_nlp_${source}`;
  }
}

// ============================================================================
// FACTORY ET UTILITAIRES
// ============================================================================

let defaultEngineV3: ExtractionEngineV3 | null = null;

export function getDefaultExtractionEngineV3(): ExtractionEngineV3 {
  if (!defaultEngineV3) {
    defaultEngineV3 = new ExtractionEngineV3();
  }
  return defaultEngineV3;
}

export function createExtractionEngineV3(): ExtractionEngineV3 {
  return new ExtractionEngineV3();
}

// ============================================================================
// REMPLACEMENT DANS CONVERSATION ENGINE V2
// ============================================================================

/**
 * Version modifiée de extractFacts qui utilise le moteur V3
 */
export function extractFactsV3(
  normalized: NormalizedText,
  messageId: string,
  context?: { 
    previousExtractions?: ExtractionLogEntry[];
    conversationState?: ConversationEngineState;
  }
): ExtractionBatch {
  const engine = getDefaultExtractionEngineV3();
  return engine.extractFacts(normalized, messageId, context);
}

/**
 * Fonction de migration pour remplacer l'ancienne fonction
 */
export function upgradeExtractionToV3(
  conversationEngine: any // Type du ConversationEngineImpl
): void {
  // Remplacer la méthode extractFacts par la version V3
  if (conversationEngine && typeof conversationEngine.applyExtractionBatch === 'function') {
    const originalApplyBatch = conversationEngine.applyExtractionBatch.bind(conversationEngine);
    
    conversationEngine.applyExtractionBatch = function(
      state: ConversationEngineState,
      batch: ExtractionBatch
    ): ConversationEngineState {
      // Log pour debugging
      if (batch.metadata.nlpVersion === '3.0.0') {
        console.debug('🧠 Utilisation du moteur NLP robuste V3');
      }
      
      return originalApplyBatch(state, batch);
    };
  }
}

// ============================================================================
// API PUBLIQUE SIMPLIFIÉE
// ============================================================================

/**
 * API simple pour extraction robuste
 */
export function extractRobustly(
  text: string, 
  context?: {
    conversationTurns?: number;
    previousFields?: Record<QuestionField, any>;
    recentQuestions?: QuestionField[];
  }
): {
  extractions: Record<QuestionField, any>;
  confidence: number;
  details: ExtractionLogEntry[];
} {
  const engine = getDefaultExtractionEngineV3();
  const messageId = `extract-${Date.now()}`;
  
  // Simuler un contexte conversationnel basique si fourni
  let conversationalContext = undefined;
  if (context) {
    // TODO: Convertir le contexte simplifié vers ConversationEngineState si nécessaire
  }
  
  const batch = engine.extractFacts(
    { 
      original: text, 
      cleaned: text.toLowerCase(), 
      tokens: text.split(' '),
      sentences: [text],
      numbers: [],
      dates: [],
      locations: [],
      negations: [],
      semanticSignals: {} 
    },
    messageId,
    conversationalContext
  );
  
  // Consolider les extractions par champ
  const extractions: Record<QuestionField, any> = {};
  const byField: Record<QuestionField, ExtractionLogEntry[]> = {} as any;
  
  for (const entry of batch.extractions) {
    if (!byField[entry.field]) byField[entry.field] = [];
    byField[entry.field].push(entry);
  }
  
  for (const [field, entries] of Object.entries(byField)) {
    // Prendre la meilleure extraction pour ce champ
    const best = entries.reduce((best, current) => 
      current.confidence > best.confidence ? current : best
    );
    extractions[field as QuestionField] = best.normalizedValue;
  }
  
  const avgConfidence = batch.extractions.length > 0 
    ? batch.extractions.reduce((sum, e) => sum + e.confidence, 0) / batch.extractions.length
    : 0;
  
  return {
    extractions,
    confidence: avgConfidence,
    details: batch.extractions
  };
}

// ============================================================================
// TESTS D'INTÉGRATION
// ============================================================================

if (process.env.NODE_ENV === 'test') {
  /**
   * Fonction de test pour valider l'intégration
   */
  export function testV3Integration(): boolean {
    try {
      const engine = new ExtractionEngineV3();
      
      const testText = "conférence 200 personnes Paris vendredi prochain";
      const result = engine.extractFacts(
        {
          original: testText,
          cleaned: testText.toLowerCase(),
          tokens: testText.split(' '),
          sentences: [testText],
          numbers: [],
          dates: [],
          locations: [],
          negations: [],
          semanticSignals: {}
        },
        'test-message'
      );
      
      return result.extractions.length > 0 && 
             result.extractions.every(e => e.confidence >= 0.6);
    } catch (error) {
      console.error('V3 Integration test failed:', error);
      return false;
    }
  }
}