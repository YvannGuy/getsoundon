/**
 * Types pour le moteur de matching prestataires V2
 * Hard filtering + scoring explicable + justifications
 */

import { EventType, ServiceNeed, IndoorOutdoor } from "./types";
import { SetupRecommendationV2, EquipmentLineItem, ServiceLineItem } from "./production-types";

// ============================================================================
// FILTERING ET COMPATIBILITÉ STRICTE
// ============================================================================

export type HardFilterReason = 
  | "zone_not_covered"
  | "availability_conflict" 
  | "missing_required_categories"
  | "missing_required_services"
  | "insufficient_inventory"
  | "operational_constraints"
  | "minimum_order_not_met"
  | "budget_incompatible";

export type FilterResult = {
  passed: boolean;
  excludeReasons: HardFilterReason[];
  warnings: string[];
};

export type CoverageArea = {
  zones: string[]; // ["Paris", "Boulogne", "Neuilly"]
  maxDistance?: number; // km depuis base
  deliveryFee?: number;
  freeDeliveryThreshold?: number;
};

export type ProviderAvailability = {
  blockedDates: string[]; // ISO dates
  advanceNotice: number; // jours minimum
  workingDays: boolean[]; // [lundi, mardi, ..., dimanche]
  seasonalUnavailable?: {
    start: string; // MM-DD
    end: string;   // MM-DD
  }[];
};

export type InventoryItem = {
  category: string;
  subcategory?: string;
  quantity: number;
  qualityTier?: "basic" | "standard" | "premium";
  brands?: string[];
  specifications?: Record<string, string>;
};

export type OperationalConstraints = {
  minEventSize?: number;
  maxEventSize?: number;
  indoorOnly?: boolean;
  outdoorOnly?: boolean;
  requiresTechnician?: boolean;
  minOrderValue?: number;
  maxEventDistance?: number; // km depuis base
  specialRequirements?: string[];
};

// ============================================================================
// PRESTATAIRE ENRICHI V2
// ============================================================================

export type ProviderV2 = {
  // Infos de base (compatibles avec V1)
  id: string;
  title: string;
  description?: string;
  location: string;
  pricePerDay?: number;
  rating?: number;
  ratingCount?: number;
  image?: string;

  // Capacités étendues V2
  capabilities: {
    categories: string[];
    services: {
      delivery?: boolean;
      installation?: boolean;
      technician?: boolean;
      consulting?: boolean;
      maintenance?: boolean;
    };
    
    // Nouvelles capacités V2
    coverage: CoverageArea;
    availability?: ProviderAvailability;
    inventory?: InventoryItem[];
    constraints?: OperationalConstraints;
    
    // Spécialisations métier
    specializations: EventType[];
    certifications?: string[];
    equipment_quality?: "basic" | "standard" | "premium";
  };
  
  // Business model
  pricing?: {
    dailyRate?: number;
    hourlyRate?: number;
    setupFee?: number;
    deliveryFee?: number;
    technicianFee?: number;
  };
  
  // Qualité et confiance
  trust?: {
    verified: boolean;
    businessLicense?: boolean;
    insurance?: boolean;
    responseTime?: number; // heures
    completionRate?: number; // %
  };
};

// ============================================================================
// INPUT DE MATCHING V2
// ============================================================================

export type MatchingInputV2 = {
  // Données événement
  eventType?: EventType;
  guestCount?: number;
  eventDate?: string; // ISO
  location: {
    city?: string;
    lat?: number;
    lng?: number;
    address?: string;
  };
  
  // Setup requis (recommandation)
  requiredEquipment: EquipmentLineItem[];
  requiredServices: ServiceLineItem[];
  
  // Contraintes
  indoorOutdoor?: IndoorOutdoor;
  budgetMax?: number;
  deliveryRequired?: boolean;
  installationRequired?: boolean;
  technicianRequired?: boolean;
  
  // Préférences
  qualityPreference?: "basic" | "standard" | "premium";
  proximityPreference?: "strict" | "moderate" | "flexible";
};

// ============================================================================
// SCORING V2 EXPLICABLE
// ============================================================================

export type ScoringDimension = 
  | "inventory_fit"
  | "service_fit" 
  | "operational_fit"
  | "specialization_fit"
  | "proximity_fit"
  | "budget_fit"
  | "quality_fit"
  | "trust_fit";

export type DimensionScore = {
  score: number; // 0-100
  weight: number; // pondération dans le score final
  rationale: string;
  details?: Record<string, number | string>;
};

export type ScoringBreakdownV2 = {
  total: number; // 0-100
  dimensions: Record<ScoringDimension, DimensionScore>;
  
  // Justifications
  strengths: string[];
  limitations: string[];
  differentiators: string[];
  
  // Méta-information
  confidence: number; // 0-1
  dataCompleteness: number; // 0-1
};

// ============================================================================
// RÉSULTAT DE MATCHING V2
// ============================================================================

export type MatchResult = {
  provider: ProviderV2;
  
  // Filtering
  filterResult: FilterResult;
  
  // Scoring (si passed filtering)
  scoring?: ScoringBreakdownV2;
  
  // Justifications produit
  compatibility: {
    equipmentCoverage: number; // 0-1
    serviceCoverage: number; // 0-1
    missingEquipment: string[];
    missingServices: string[];
    alternativeSuggestions?: string[];
  };
  
  // UX
  displayRank?: number;
  recommendationReason: string;
  userWarnings?: string[];
};

export type MatchingResultsV2 = {
  // Prestataires compatibles (passed hard filter + scored)
  matches: MatchResult[];
  
  // Statistiques
  stats: {
    totalEvaluated: number;
    passedHardFilter: number;
    excluded: Array<{
      providerId: string;
      reasons: HardFilterReason[];
    }>;
  };
  
  // Fallbacks
  multiProviderSuggestion?: {
    combinations: Array<{
      providers: ProviderV2[];
      coverage: string;
      rationale: string;
    }>;
    recommendMultiProvider: boolean;
  };
  
  // Méta
  searchMetadata: {
    query: MatchingInputV2;
    timestamp: string;
    processingTime: number;
    algorithm: "v2";
  };
};

// ============================================================================
// CONFIGURATION MATCHING
// ============================================================================

export type HardFilterConfig = {
  enableZoneFiltering: boolean;
  enableAvailabilityFiltering: boolean;
  enableInventoryFiltering: boolean;
  enableServiceFiltering: boolean;
  
  // Seuils
  minEquipmentCoverage: number; // 0-1
  minServiceCoverage: number; // 0-1
  maxDistanceKm?: number;
};

export type ScoringWeights = Record<ScoringDimension, number>;

export type MatchingConfigV2 = {
  hardFilter: HardFilterConfig;
  scoring: {
    weights: ScoringWeights;
    enableSpecializationBoost: boolean;
    penalizeIncompleteData: boolean;
  };
  
  results: {
    maxResults: number;
    minScoreThreshold: number; // 0-100
    enableMultiProvider: boolean;
  };
};

// ============================================================================
// SPÉCIALISATIONS MÉTIER
// ============================================================================

export type ProviderSpecialization = {
  eventTypes: EventType[];
  strengths: string[];
  equipment_focus?: string[];
  typical_audience?: {
    min: number;
    max: number;
  };
  expertise_level: "general" | "specialized" | "expert";
};

export type SpecializationMap = Record<EventType, {
  requiredCategories: string[];
  preferredServices: string[];
  qualityImportance: number; // 0-1
  experienceWeight: number; // multiplicateur
}>;

// ============================================================================
// API PUBLIQUE
// ============================================================================

export type MatchingEngineV2 = {
  // Core matching
  findMatches(input: MatchingInputV2, providers: ProviderV2[], config?: MatchingConfigV2): MatchingResultsV2;
  
  // Hard filtering
  hardFilterProvider(provider: ProviderV2, input: MatchingInputV2): FilterResult;
  
  // Scoring
  scoreProvider(provider: ProviderV2, input: MatchingInputV2): ScoringBreakdownV2;
  
  // Utilities
  explainResult(result: MatchResult): string[];
  compareProviders(a: MatchResult, b: MatchResult): string[];
  validateProvider(provider: ProviderV2): { isValid: boolean; issues: string[] };
  
  // Analytics
  analyzeMatchingQuality(results: MatchingResultsV2): {
    qualityScore: number;
    coverage: number;
    diversity: number;
    recommendations: string[];
  };
};