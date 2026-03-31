import { v4 as uuid } from "uuid";
import { QuestionField, EventType, ServiceNeed, IndoorOutdoor, VenueType } from "./types";
import { 
  NormalizedText, 
  ExtractionBatch, 
  ExtractionLogEntry, 
  CandidateSource,
  ExtractionStrategy 
} from "./v2-types";

// ============================================================================
// NORMALISATION DE TEXTE
// ============================================================================

export function normalizeUserText(text: string): NormalizedText {
  const original = text;
  const cleaned = text
    .toLowerCase()
    .trim()
    .replace(/[^\w\sàâäéèêëïîôöùûüÿç]/g, ' ')
    .replace(/\s+/g, ' ');
    
  const tokens = cleaned.split(' ').filter(t => t.length > 1);
  
  // Generate semantic signals for context understanding
  const semanticSignals = generateSemanticSignals(cleaned, tokens);
  
  return {
    original,
    cleaned,
    tokens,
    semanticSignals
  };
}

function generateSemanticSignals(text: string, tokens: string[]): Record<string, number> {
  const signals: Record<string, number> = {};
  
  // Event type signals
  const eventTypePatterns = {
    'conference': ['conférence', 'présentation', 'séminaire', 'symposium'],
    'birthday': ['anniversaire', 'fête', 'birthday'],
    'wedding': ['mariage', 'noce', 'wedding'],
    'corporate': ['corporate', 'entreprise', 'professionnel', 'bureau'],
    'party': ['soirée', 'party', 'fête', 'célébration']
  };
  
  // Location signals  
  const locationPatterns = {
    'paris': ['paris', 'parisien', '75'],
    'indoor': ['intérieur', 'salle', 'appartement', 'maison'],
    'outdoor': ['extérieur', 'jardin', 'terrasse', 'plein air']
  };
  
  // Service signals
  const servicePatterns = {
    'sound': ['son', 'sonorisation', 'audio', 'enceinte'],
    'microphones': ['micro', 'microphone', 'hf', 'sans fil'],
    'lighting': ['lumière', 'éclairage', 'led', 'spots'],
    'screen': ['écran', 'projection', 'vidéo']
  };
  
  const allPatterns = { ...eventTypePatterns, ...locationPatterns, ...servicePatterns };
  
  for (const [signal, patterns] of Object.entries(allPatterns)) {
    let score = 0;
    patterns.forEach(pattern => {
      if (text.includes(pattern)) {
        score += 0.8;
      }
      tokens.forEach(token => {
        if (token.includes(pattern) || pattern.includes(token)) {
          score += 0.3;
        }
      });
    });
    
    if (score > 0) {
      signals[signal] = Math.min(1.0, score);
    }
  }
  
  return signals;
}

// ============================================================================
// EXTRACTORS
// ============================================================================

class ExplicitValueExtractor {
  static extract(normalized: NormalizedText, messageId: string): ExtractionLogEntry[] {
    const extractions: ExtractionLogEntry[] = [];
    const { cleaned, tokens, semanticSignals } = normalized;
    
    // Extract guest count
    const guestCountMatch = cleaned.match(/(\d+)\s*(?:personnes?|guests?|invités?|participants?)/);
    if (guestCountMatch) {
      extractions.push({
        id: uuid(),
        messageId,
        extractor: "explicit_value",
        field: "guestCount",
        rawValue: parseInt(guestCountMatch[1]),
        normalizedValue: parseInt(guestCountMatch[1]),
        confidence: 0.9,
        applied: false,
        createdAt: new Date().toISOString()
      });
    }
    
    // Extract location
    const locationPatterns = [
      /(?:à|dans|sur)\s+([a-zA-ZÀ-ÿ\s]+?)(?:\s|$|,)/,
      /([A-Z][a-zA-ZÀ-ÿ]+(?:\s+[A-Z][a-zA-ZÀ-ÿ]+)*)/
    ];
    
    for (const pattern of locationPatterns) {
      const match = normalized.original.match(pattern);
      if (match && match[1] && match[1].length > 2) {
        const location = match[1].trim();
        extractions.push({
          id: uuid(),
          messageId,
          extractor: "explicit_value",
          field: "location",
          rawValue: location,
          normalizedValue: { label: location, city: location },
          confidence: 0.85,
          applied: false,
          createdAt: new Date().toISOString()
        });
        break;
      }
    }
    
    // Extract date
    const datePatterns = [
      /(?:le\s+)?(\d{1,2}\s+(?:janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\s+\d{4})/i,
      /(\d{1,2}\/\d{1,2}\/\d{2,4})/,
      /(\d{1,2}-\d{1,2}-\d{2,4})/
    ];
    
    for (const pattern of datePatterns) {
      const match = cleaned.match(pattern);
      if (match) {
        extractions.push({
          id: uuid(),
          messageId,
          extractor: "explicit_value", 
          field: "eventDate",
          rawValue: match[1],
          normalizedValue: { raw: match[1] },
          confidence: 0.85,
          applied: false,
          createdAt: new Date().toISOString()
        });
        break;
      }
    }
    
    return extractions;
  }
}

class SemanticExtractor {
  static extract(normalized: NormalizedText, messageId: string): ExtractionLogEntry[] {
    const extractions: ExtractionLogEntry[] = [];
    const { semanticSignals } = normalized;
    
    // Extract event type from semantic signals
    const eventTypeMapping: Record<string, EventType> = {
      'conference': 'conference',
      'birthday': 'birthday', 
      'wedding': 'wedding',
      'corporate': 'corporate',
      'party': 'private_party'
    };
    
    for (const [signal, eventType] of Object.entries(eventTypeMapping)) {
      if (semanticSignals[signal] && semanticSignals[signal] > 0.6) {
        extractions.push({
          id: uuid(),
          messageId,
          extractor: "semantic",
          field: "eventType",
          rawValue: signal,
          normalizedValue: eventType,
          confidence: semanticSignals[signal],
          applied: false,
          createdAt: new Date().toISOString()
        });
      }
    }
    
    // Extract indoor/outdoor
    const indoorScore = (semanticSignals['indoor'] || 0);
    const outdoorScore = (semanticSignals['outdoor'] || 0);
    
    if (indoorScore > outdoorScore && indoorScore > 0.4) {
      extractions.push({
        id: uuid(),
        messageId,
        extractor: "semantic",
        field: "indoorOutdoor",
        rawValue: "indoor",
        normalizedValue: "indoor" as IndoorOutdoor,
        confidence: indoorScore,
        applied: false,
        createdAt: new Date().toISOString()
      });
    } else if (outdoorScore > 0.4) {
      extractions.push({
        id: uuid(),
        messageId,
        extractor: "semantic", 
        field: "indoorOutdoor",
        rawValue: "outdoor",
        normalizedValue: "outdoor" as IndoorOutdoor,
        confidence: outdoorScore,
        applied: false,
        createdAt: new Date().toISOString()
      });
    }
    
    // Extract service needs
    const serviceMapping: Record<string, ServiceNeed> = {
      'sound': 'sound',
      'microphones': 'microphones',
      'lighting': 'lighting', 
      'screen': 'led_screen'
    };
    
    const detectedServices: ServiceNeed[] = [];
    for (const [signal, service] of Object.entries(serviceMapping)) {
      if (semanticSignals[signal] && semanticSignals[signal] > 0.5) {
        detectedServices.push(service);
      }
    }
    
    if (detectedServices.length > 0) {
      extractions.push({
        id: uuid(),
        messageId,
        extractor: "semantic",
        field: "serviceNeeds",
        rawValue: detectedServices,
        normalizedValue: detectedServices,
        confidence: 0.8,
        applied: false,
        createdAt: new Date().toISOString()
      });
    }
    
    return extractions;
  }
}

class ContextualExtractor {
  static extract(normalized: NormalizedText, messageId: string, previousExtractions?: ExtractionLogEntry[]): ExtractionLogEntry[] {
    const extractions: ExtractionLogEntry[] = [];
    const { cleaned } = normalized;
    
    // Extract delivery/installation/technician needs
    if (cleaned.includes('livraison') || cleaned.includes('livrer')) {
      extractions.push({
        id: uuid(),
        messageId,
        extractor: "contextual",
        field: "deliveryNeeded",
        rawValue: true,
        normalizedValue: true,
        confidence: 0.8,
        applied: false,
        createdAt: new Date().toISOString()
      });
    }
    
    if (cleaned.includes('installation') || cleaned.includes('installer') || cleaned.includes('monter')) {
      extractions.push({
        id: uuid(),
        messageId,
        extractor: "contextual", 
        field: "installationNeeded",
        rawValue: true,
        normalizedValue: true,
        confidence: 0.8,
        applied: false,
        createdAt: new Date().toISOString()
      });
    }
    
    if (cleaned.includes('technicien') || cleaned.includes('assistance')) {
      extractions.push({
        id: uuid(),
        messageId,
        extractor: "contextual",
        field: "technicianNeeded", 
        rawValue: true,
        normalizedValue: true,
        confidence: 0.8,
        applied: false,
        createdAt: new Date().toISOString()
      });
    }
    
    // Venue type inference
    const venuePatterns: Record<string, VenueType> = {
      'appartement': 'apartment',
      'maison': 'private_home',
      hôtel: 'hotel',
      hotel: 'hotel',
      'salle': 'event_hall',
      'jardin': 'garden',
      'terrasse': 'terrace'
    };
    
    for (const [pattern, venueType] of Object.entries(venuePatterns)) {
      if (cleaned.includes(pattern)) {
        extractions.push({
          id: uuid(),
          messageId,
          extractor: "contextual",
          field: "venueType",
          rawValue: pattern,
          normalizedValue: venueType,
          confidence: 0.75,
          applied: false,
          createdAt: new Date().toISOString()
        });
        // Lieux typiquement en intérieur / extérieur (ferme la question indoor/outdoor)
        if (
          venueType === "hotel" ||
          venueType === "apartment" ||
          venueType === "private_home" ||
          venueType === "event_hall"
        ) {
          extractions.push({
            id: uuid(),
            messageId,
            extractor: "contextual",
            field: "indoorOutdoor",
            rawValue: "indoor",
            normalizedValue: "indoor",
            confidence: 0.78,
            applied: false,
            createdAt: new Date().toISOString()
          });
        } else if (venueType === "garden" || venueType === "terrace") {
          extractions.push({
            id: uuid(),
            messageId,
            extractor: "contextual",
            field: "indoorOutdoor",
            rawValue: "outdoor",
            normalizedValue: "outdoor",
            confidence: 0.72,
            applied: false,
            createdAt: new Date().toISOString()
          });
        }
        break;
      }
    }
    
    return extractions;
  }
}

// ============================================================================
// PIPELINE PRINCIPAL
// ============================================================================

export function extractFacts(
  normalized: NormalizedText, 
  messageId: string,
  context?: { previousExtractions?: ExtractionLogEntry[] }
): ExtractionBatch {
  const allExtractions: ExtractionLogEntry[] = [];
  
  // Run all extractors
  allExtractions.push(...ExplicitValueExtractor.extract(normalized, messageId));
  allExtractions.push(...SemanticExtractor.extract(normalized, messageId));
  allExtractions.push(...ContextualExtractor.extract(normalized, messageId, context?.previousExtractions));
  
  // Filter duplicates and low confidence
  const filteredExtractions = deduplicateExtractions(allExtractions);
  const highConfidenceExtractions = filteredExtractions.filter(e => e.confidence >= 0.5);
  
  return {
    messageId,
    extractions: highConfidenceExtractions,
    metadata: {
      extractors: [...new Set(allExtractions.map(e => e.extractor))],
      totalExtractions: allExtractions.length,
      highConfidenceCount: highConfidenceExtractions.length
    }
  };
}

function deduplicateExtractions(extractions: ExtractionLogEntry[]): ExtractionLogEntry[] {
  const seen = new Set<string>();
  return extractions.filter(extraction => {
    const key = `${extraction.field}-${JSON.stringify(extraction.normalizedValue)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ============================================================================
// CRÉATION DES SOURCES
// ============================================================================

export function createCandidateSource(
  messageId: string,
  rawText: string, 
  extractor: string,
  confidence: number
): CandidateSource {
  return {
    messageId,
    rawText,
    extractor,
    confidence,
    createdAt: new Date().toISOString()
  };
}