/**
 * Moteur NLP robuste français - Orchestrateur principal
 */

import { normalizeText } from "./normalization-pipeline";
import { extractNumericMentions, extractBestNumericValue, extractAllNumericValues } from "./numeric-extractors";
import { extractDateMentions, extractBestDateValue } from "./date-extractors";
import { extractLocationMentions, extractBestLocationValue, extractSpaceTypeFromText } from "./location-extractors";
import { extractEquipmentMentions, detectEquipmentNegations, extractEquipmentRequests } from "./equipment-extractors";
import { 
  StructuredExtraction, 
  ExtractionResult, 
  ExtractorConfig, 
  NeedDecision,
  ExplicitEquipmentRequest,
  NormalizedText
} from "./nlp-types";
import { QuestionField, ServiceNeed, EventType } from "./types";

// ============================================================================
// CONFIGURATION PAR DÉFAUT
// ============================================================================

const DEFAULT_CONFIG: ExtractorConfig = {
  enableNumbersInLetters: true,
  enableRelativeDates: true,
  enableNegationHandling: true,
  enableEquipmentSpecifics: true,
  confidenceThreshold: 0.6,
  dateReferencePoint: new Date(),
  locationBias: { city: "paris", region: "île-de-france" }
};

// ============================================================================
// ORCHESTRATEUR PRINCIPAL
// ============================================================================

export class RobustNLPEngine {
  private config: ExtractorConfig;
  
  constructor(config: Partial<ExtractorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }
  
  /**
   * Point d'entrée principal pour l'extraction complète
   */
  public extractFromText(text: string, messageId: string = generateMessageId()): StructuredExtraction {
    const startTime = Date.now();
    
    // 1. Normalisation
    const normalized = normalizeText(text);
    
    // 2. Extraction par domaine
    const extractions = this.runAllExtractors(normalized, messageId);
    
    // 3. Résolution des conflits et consolidation
    const consolidatedExtractions = this.consolidateExtractions(extractions);
    
    // 4. Calcul de confiance globale
    const globalConfidence = this.calculateGlobalConfidence(consolidatedExtractions);
    
    const processingTime = Date.now() - startTime;
    
    return {
      messageId,
      originalText: text,
      normalizedText: normalized,
      extractions: consolidatedExtractions,
      confidence: globalConfidence,
      processingTime,
      extractorVersion: "2.0.0"
    };
  }
  
  /**
   * Extraction ciblée par champ spécifique
   */
  public extractSpecificField(text: string, field: QuestionField): ExtractionResult | null {
    const normalized = normalizeText(text);
    
    switch (field) {
      case "guestCount":
        return this.extractGuestCount(normalized, text);
      case "eventDate":
        return this.extractEventDate(normalized, text);
      case "location":
        return this.extractLocation(normalized, text);
      case "indoorOutdoor":
        return this.extractIndoorOutdoor(normalized, text);
      case "serviceNeeds":
        return this.extractServiceNeeds(normalized, text);
      case "eventType":
        return this.extractEventType(normalized, text);
      default:
        return null;
    }
  }
  
  // ============================================================================
  // EXTRACTORS PAR DOMAINE
  // ============================================================================
  
  private runAllExtractors(normalized: NormalizedText, messageId: string): ExtractionResult[] {
    const extractions: ExtractionResult[] = [];
    
    // Nombres et quantités
    const guestCountResult = this.extractGuestCount(normalized, normalized.original);
    if (guestCountResult) extractions.push(guestCountResult);
    
    // Dates
    const eventDateResult = this.extractEventDate(normalized, normalized.original);
    if (eventDateResult) extractions.push(eventDateResult);
    
    // Lieux
    const locationResult = this.extractLocation(normalized, normalized.original);
    if (locationResult) extractions.push(locationResult);
    
    // Indoor/Outdoor
    const indoorOutdoorResult = this.extractIndoorOutdoor(normalized, normalized.original);
    if (indoorOutdoorResult) extractions.push(indoorOutdoorResult);
    
    // Type d'événement
    const eventTypeResult = this.extractEventType(normalized, normalized.original);
    if (eventTypeResult) extractions.push(eventTypeResult);
    
    // Besoins de service (avec négations)
    const serviceNeedsResult = this.extractServiceNeeds(normalized, normalized.original);
    if (serviceNeedsResult) extractions.push(serviceNeedsResult);
    
    // Équipement explicite
    const equipmentResults = this.extractExplicitEquipment(normalized, normalized.original);
    extractions.push(...equipmentResults);
    
    return extractions.filter(e => e.confidence >= this.config.confidenceThreshold);
  }
  
  private extractGuestCount(normalized: NormalizedText, originalText: string): ExtractionResult | null {
    const numericValues = extractAllNumericValues(originalText);
    
    if (numericValues.people) {
      const interpretation = numericValues.people;
      let value: number;
      let confidence = 0.9;
      
      if (interpretation.kind === "exact") {
        value = interpretation.value;
      } else if (interpretation.kind === "approx") {
        value = interpretation.value;
        confidence = 0.8;
      } else if (interpretation.kind === "range") {
        value = Math.round((interpretation.min + interpretation.max) / 2);
        confidence = 0.75;
      } else {
        return null;
      }
      
      return {
        field: "guestCount",
        value,
        confidence,
        source: "explicit",
        rawEvidence: [originalText]
      };
    }
    
    return null;
  }
  
  private extractEventDate(normalized: NormalizedText, originalText: string): ExtractionResult | null {
    const dateValue = extractBestDateValue(originalText, this.config.dateReferencePoint);
    
    if (dateValue) {
      let confidence = 0.8;
      if (!dateValue.inferredYear) confidence = 0.9;
      if (dateValue.isRelative) confidence = 0.85;
      
      return {
        field: "eventDate",
        value: { raw: dateValue.rawLabel, isoDate: dateValue.isoStart, isApproximate: dateValue.precision !== "day" },
        confidence,
        source: dateValue.isRelative ? "contextual" : "explicit",
        rawEvidence: [dateValue.rawLabel]
      };
    }
    
    return null;
  }
  
  private extractLocation(normalized: NormalizedText, originalText: string): ExtractionResult | null {
    const locationValue = extractBestLocationValue(originalText);
    
    if (locationValue) {
      const value = {
        label: formatLocationLabel(locationValue),
        city: locationValue.city,
        district: locationValue.district,
        region: locationValue.region
      };
      
      let confidence = 0.7;
      if (locationValue.precision === "city") confidence = 0.85;
      if (locationValue.precision === "district") confidence = 0.9;
      
      return {
        field: "location",
        value,
        confidence,
        source: "explicit",
        rawEvidence: [originalText]
      };
    }
    
    return null;
  }
  
  private extractIndoorOutdoor(normalized: NormalizedText, originalText: string): ExtractionResult | null {
    const spaceType = extractSpaceTypeFromText(originalText);
    
    if (spaceType) {
      let value: "indoor" | "outdoor";
      let confidence = 0.8;
      
      if (spaceType.type === "indoor") {
        value = "indoor";
      } else if (spaceType.type === "outdoor") {
        value = "outdoor";
        if (spaceType.subtype === "covered") {
          // Cas spécial : extérieur couvert
          confidence = 0.7; // Moins de confiance car c'est ambigu
        }
      } else {
        // Type mixte - prendre le plus probable
        value = spaceType.indoor ? "indoor" : "outdoor";
        confidence = 0.6;
      }
      
      return {
        field: "indoorOutdoor",
        value,
        confidence,
        source: "inferred",
        rawEvidence: [originalText]
      };
    }
    
    return null;
  }
  
  private extractEventType(normalized: NormalizedText, originalText: string): ExtractionResult | null {
    // Utiliser les signaux sémantiques de la normalisation
    const signals = normalized.semanticSignals;
    
    const eventTypeMapping: Record<string, EventType> = {
      'conference': 'conference',
      'birthday': 'birthday',
      'wedding': 'wedding',
      'corporate': 'corporate',
      'party': 'private_party'
    };
    
    let bestSignal = '';
    let bestScore = 0;
    
    for (const [signal, score] of Object.entries(signals)) {
      if (eventTypeMapping[signal] && score > bestScore) {
        bestSignal = signal;
        bestScore = score;
      }
    }
    
    if (bestScore >= 0.6) {
      return {
        field: "eventType",
        value: eventTypeMapping[bestSignal],
        confidence: bestScore,
        source: "inferred",
        rawEvidence: [originalText]
      };
    }
    
    return null;
  }
  
  private extractServiceNeeds(normalized: NormalizedText, originalText: string): ExtractionResult | null {
    // 1. Détecter les besoins positifs
    const positiveNeeds = this.detectPositiveServiceNeeds(normalized);
    
    // 2. Détecter les négations
    const negations = detectEquipmentNegations(originalText);
    
    // 3. Consolider avec polarité
    const needDecisions: NeedDecision[] = [];
    
    // Ajouter les besoins positifs
    for (const need of positiveNeeds) {
      needDecisions.push({
        need,
        polarity: "required",
        confidence: 0.8,
        source: "explicit"
      });
    }
    
    // Ajouter les exclusions
    for (const negation of negations) {
      const serviceNeed = mapEquipmentCategoryToServiceNeed(negation.equipment);
      if (serviceNeed) {
        needDecisions.push({
          need: serviceNeed,
          polarity: negation.polarity === "excluded" ? "excluded" : "optional",
          confidence: negation.confidence,
          source: "explicit"
        });
      }
    }
    
    // Filtrer les besoins requis (pas les exclusions pour cette extraction)
    const requiredNeeds = needDecisions
      .filter(d => d.polarity === "required")
      .map(d => d.need);
    
    if (requiredNeeds.length > 0) {
      return {
        field: "serviceNeeds",
        value: requiredNeeds,
        confidence: 0.8,
        source: "explicit",
        rawEvidence: [originalText]
      };
    }
    
    return null;
  }
  
  private extractExplicitEquipment(normalized: NormalizedText, originalText: string): ExtractionResult[] {
    const equipmentRequests = extractEquipmentRequests(originalText);
    const results: ExtractionResult[] = [];
    
    for (const request of equipmentRequests) {
      // Mapper vers les champs appropriés
      if (request.category === 'speakers') {
        results.push({
          field: "serviceNeeds",
          value: ["sound"],
          confidence: 0.9,
          source: "explicit",
          rawEvidence: [formatEquipmentDisplay(request)]
        });
      } else if (request.category === 'microphones') {
        results.push({
          field: "serviceNeeds", 
          value: ["microphones"],
          confidence: 0.9,
          source: "explicit",
          rawEvidence: [formatEquipmentDisplay(request)]
        });
      } else if (request.category === 'lighting') {
        results.push({
          field: "serviceNeeds",
          value: ["lighting"],
          confidence: 0.9,
          source: "explicit", 
          rawEvidence: [formatEquipmentDisplay(request)]
        });
      } else if (request.category === 'screens') {
        results.push({
          field: "serviceNeeds",
          value: ["led_screen"],
          confidence: 0.9,
          source: "explicit",
          rawEvidence: [formatEquipmentDisplay(request)]
        });
      }
      
      // TODO: Ajouter d'autres mappings selon les besoins
    }
    
    return results;
  }
  
  // ============================================================================
  // CONSOLIDATION ET RÉSOLUTION DE CONFLITS
  // ============================================================================
  
  private consolidateExtractions(extractions: ExtractionResult[]): ExtractionResult[] {
    const consolidated: ExtractionResult[] = [];
    const byField: Record<QuestionField, ExtractionResult[]> = {} as any;
    
    // Grouper par champ
    for (const extraction of extractions) {
      if (!byField[extraction.field]) {
        byField[extraction.field] = [];
      }
      byField[extraction.field].push(extraction);
    }
    
    // Consolider chaque champ
    for (const [field, fieldExtractions] of Object.entries(byField)) {
      const best = this.resolveBestExtraction(fieldExtractions);
      if (best) {
        consolidated.push(best);
      }
    }
    
    return consolidated;
  }
  
  private resolveBestExtraction(extractions: ExtractionResult[]): ExtractionResult | null {
    if (extractions.length === 0) return null;
    if (extractions.length === 1) return extractions[0];
    
    // Trier par confiance décroissante puis par source (explicit > inferred > contextual)
    const sorted = extractions.sort((a, b) => {
      if (b.confidence !== a.confidence) {
        return b.confidence - a.confidence;
      }
      
      const sourceOrder = { explicit: 3, inferred: 2, contextual: 1 };
      return sourceOrder[b.source] - sourceOrder[a.source];
    });
    
    return sorted[0];
  }
  
  private calculateGlobalConfidence(extractions: ExtractionResult[]): number {
    if (extractions.length === 0) return 0;
    
    const avgConfidence = extractions.reduce((sum, e) => sum + e.confidence, 0) / extractions.length;
    const coverageBonus = Math.min(extractions.length / 6, 0.2); // Bonus pour couverture
    
    return Math.min(1.0, avgConfidence + coverageBonus);
  }
  
  // ============================================================================
  // HELPERS PRIVÉS
  // ============================================================================
  
  private detectPositiveServiceNeeds(normalized: NormalizedText): ServiceNeed[] {
    const needs: ServiceNeed[] = [];
    const text = normalized.cleaned;
    
    const needPatterns: Record<ServiceNeed, RegExp[]> = {
      sound: [/\b(?:son|sono|sonorisation|enceintes?|haut[\s\-]?parleurs?)\b/gi],
      microphones: [/\b(?:micros?|microphones?)\b/gi],
      dj: [/\b(?:dj|platines?|mix)\b/gi],
      lighting: [/\b(?:lumières?|éclairage|spots?|lyres?)\b/gi],
      led_screen: [/\b(?:écrans?\s+led|murs?\s+led)\b/gi],
      video: [/\b(?:vidéo|projecteurs?|projection)\b/gi],
      audiovisual: [/\b(?:av|audiovisuel)\b/gi],
      delivery: [/\b(?:livraison|delivery)\b/gi],
      installation: [/\b(?:installation|montage)\b/gi],
      technician: [/\b(?:technicien|régisseur|ing[eé]\s+son)\b/gi],
      full_service: [/\b(?:clé\s+en\s+main|full\s+service)\b/gi]
    };
    
    for (const [need, patterns] of Object.entries(needPatterns)) {
      for (const pattern of patterns) {
        if (pattern.test(text)) {
          needs.push(need as ServiceNeed);
          break;
        }
      }
    }
    
    return [...new Set(needs)];
  }
}

// ============================================================================
// UTILITAIRES
// ============================================================================

function generateMessageId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function formatLocationLabel(location: any): string {
  const parts = [];
  if (location.venue) parts.push(location.venue);
  if (location.district) parts.push(location.district);
  else if (location.city) parts.push(location.city);
  return parts.join(', ') || 'Lieu non spécifié';
}

function formatEquipmentDisplay(equipment: ExplicitEquipmentRequest): string {
  const parts = [];
  
  if (equipment.quantity) {
    if (equipment.quantity.kind === "exact") {
      parts.push(equipment.quantity.value.toString());
    } else if (equipment.quantity.kind === "range") {
      parts.push(`${equipment.quantity.min}-${equipment.quantity.max}`);
    }
  }
  
  if (equipment.subcategory) {
    parts.push(equipment.subcategory);
  } else {
    parts.push(equipment.category);
  }
  
  if (equipment.brand) {
    parts.push(equipment.brand);
  }
  
  return parts.join(' ');
}

function mapEquipmentCategoryToServiceNeed(category: any): ServiceNeed | null {
  const mapping: Record<string, ServiceNeed> = {
    'speakers': 'sound',
    'microphones': 'microphones',
    'dj_equipment': 'dj',
    'lighting': 'lighting',
    'screens': 'led_screen',
    'video': 'video'
  };
  
  return mapping[category] || null;
}

// ============================================================================
// API PUBLIQUE
// ============================================================================

export function createRobustNLPEngine(config?: Partial<ExtractorConfig>): RobustNLPEngine {
  return new RobustNLPEngine(config);
}

// Instance par défaut
export const defaultNLPEngine = new RobustNLPEngine();

// API simplifiée
export function extractFromText(text: string, messageId?: string): StructuredExtraction {
  return defaultNLPEngine.extractFromText(text, messageId);
}

export function extractField(text: string, field: QuestionField): ExtractionResult | null {
  return defaultNLPEngine.extractSpecificField(text, field);
}