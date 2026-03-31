/**
 * Types pour le système NLP robuste français
 */

import { QuestionField, ServiceNeed } from "./types";

// ============================================================================
// NORMALISATION
// ============================================================================

export type NormalizedText = {
  original: string;
  cleaned: string;
  tokens: string[];
  sentences: string[];
  numbers: NumericMention[];
  dates: DateMention[];
  locations: LocationMention[];
  negations: NegationContext[];
  semanticSignals: Record<string, number>;
};

// ============================================================================
// NOMBRES ET QUANTITÉS
// ============================================================================

export type NumericInterpretation = 
  | { kind: "exact"; value: number }
  | { kind: "approx"; value: number; tolerance: number }
  | { kind: "range"; min: number; max: number };

export type NumericMention = {
  rawText: string;
  position: { start: number; end: number };
  interpretation: NumericInterpretation;
  confidence: number;
  context?: "people" | "equipment" | "generic";
};

// ============================================================================
// DATES
// ============================================================================

export type DatePrecision = "day" | "weekend" | "week" | "month" | "quarter" | "unknown";

export type DateData = {
  isoStart?: string;
  isoEnd?: string;
  precision: DatePrecision;
  rawLabel: string;
  inferredYear?: boolean;
  isRelative: boolean;
};

export type DateMention = {
  rawText: string;
  position: { start: number; end: number };
  interpretation: DateData;
  confidence: number;
};

// ============================================================================
// LIEUX ET LOCALISATION
// ============================================================================

export type LocationPrecision = "city" | "district" | "venue" | "region" | "country";

export type VenueContext = 
  | "home" | "hotel" | "hall" | "restaurant" | "office" | "outdoor" 
  | "religious" | "cultural" | "sports" | "rooftop" | "garden" | "other";

export type LocationData = {
  city?: string;
  district?: string;
  region?: string;
  venue?: string;
  venueType?: VenueContext;
  precision: LocationPrecision;
  coordinates?: { lat: number; lng: number };
};

export type LocationMention = {
  rawText: string;
  position: { start: number; end: number };
  interpretation: LocationData;
  confidence: number;
};

// ============================================================================
// INDOOR/OUTDOOR AVEC VARIANTES
// ============================================================================

export type SpaceType = 
  | { type: "indoor"; subtype?: "standard" | "large_hall" | "intimate" }
  | { type: "outdoor"; subtype?: "open_air" | "covered" | "semi_covered" }
  | { type: "mixed"; indoor: boolean; outdoor: boolean; covered?: boolean };

// ============================================================================
// NÉGATIONS ET POLARITÉ
// ============================================================================

export type NegationContext = {
  negationWords: string[];
  position: { start: number; end: number };
  scope: { start: number; end: number };
  affectedConcepts: string[];
};

export type NeedDecision = {
  need: ServiceNeed;
  polarity: "required" | "excluded" | "optional" | "preferred";
  confidence: number;
  source: "explicit" | "inferred" | "context";
  negationContext?: NegationContext;
};

// ============================================================================
// ÉQUIPEMENT EXPLICITE
// ============================================================================

export type EquipmentCategory = 
  | "speakers" | "microphones" | "mixing" | "lighting" | "screens" 
  | "dj_equipment" | "video" | "rigging" | "power" | "accessories";

export type ExplicitEquipmentRequest = {
  category: EquipmentCategory;
  subcategory?: string;
  quantity?: NumericInterpretation;
  qualifiers: string[];
  brand?: string;
  model?: string;
  specifications?: Record<string, string>;
};

export type EquipmentMention = {
  rawText: string;
  position: { start: number; end: number };
  interpretation: ExplicitEquipmentRequest;
  confidence: number;
};

// ============================================================================
// EXTRACTION STRUCTURÉE
// ============================================================================

export type ExtractionResult = {
  field: QuestionField;
  value: unknown;
  confidence: number;
  source: "explicit" | "inferred" | "contextual";
  rawEvidence: string[];
  position?: { start: number; end: number };
};

export type StructuredExtraction = {
  messageId: string;
  originalText: string;
  normalizedText: NormalizedText;
  extractions: ExtractionResult[];
  confidence: number;
  processingTime: number;
  extractorVersion: string;
};

// ============================================================================
// CONFIGURATION EXTRACTORS
// ============================================================================

export type ExtractorConfig = {
  enableNumbersInLetters: boolean;
  enableRelativeDates: boolean;
  enableNegationHandling: boolean;
  enableEquipmentSpecifics: boolean;
  confidenceThreshold: number;
  dateReferencePoint?: Date;
  locationBias?: { city: string; region: string };
};

// ============================================================================
// TESTING & VALIDATION
// ============================================================================

export type TestCase = {
  id: string;
  input: string;
  expectedExtractions: Partial<ExtractionResult>[];
  category: "numbers" | "dates" | "locations" | "negations" | "equipment" | "mixed";
  difficulty: "easy" | "medium" | "hard";
};

export type ValidationResult = {
  testCase: TestCase;
  actualExtractions: ExtractionResult[];
  matches: boolean;
  score: number;
  errors: string[];
};