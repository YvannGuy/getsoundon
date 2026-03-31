/**
 * Types pour le moteur de recommandation V2 - Production événementielle
 */

import { EventType, ServiceNeed, IndoorOutdoor, VenueType } from "./types";
import { ExplicitEquipmentRequest } from "./nlp-types";

// ============================================================================
// PROFIL DE PRODUCTION ÉVÉNEMENTIELLE
// ============================================================================

export type EventProductionProfile = {
  // Usage audio principal
  speechImportance: "none" | "low" | "medium" | "high" | "critical";
  musicImportance: "none" | "low" | "medium" | "high" | "critical";
  
  // Intentions d'usage
  danceIntent: boolean;
  livePerformance: boolean;
  presentationNeed: boolean;
  
  // Besoins techniques
  videoNeed: boolean;
  lightingNeed: boolean;
  
  // Priorités de diffusion
  coveragePriority: "clarity" | "ambience" | "impact" | "uniform";
  
  // Contraintes opérationnelles
  mobilityNeed: boolean;
  autonomyRequired: boolean;
  professionalStaffing: boolean;
};

// ============================================================================
// CONTEXTE ENVIRONNEMENTAL
// ============================================================================

export type VenueContext = {
  spaceType: IndoorOutdoor;
  venueCategory: VenueType;
  isCovered: boolean;
  acousticEnvironment: "controlled" | "reverberant" | "open" | "challenging";
  powerAvailable: boolean;
  accessConstraints: "easy" | "moderate" | "difficult";
  noiseRestrictions: boolean;
  weatherExposure: boolean;
};

// ============================================================================
// ÉQUIPEMENT STRUCTURÉ PAR BLOCS
// ============================================================================

export type EquipmentCategory = 
  | "sound_system" 
  | "microphones" 
  | "dj_setup" 
  | "lighting" 
  | "video" 
  | "infrastructure" 
  | "accessories";

export type EquipmentLineItem = {
  category: EquipmentCategory;
  subcategory: string;
  quantity: number;
  label: string;
  description: string;
  priority: "essential" | "recommended" | "optional";
  reasoning: string;
  alternativeOptions?: string[];
};

export type ServiceLineItem = {
  service: ServiceNeed;
  description: string;
  reasoning: string;
  priority: "required" | "recommended" | "optional";
  duration?: string;
};

// ============================================================================
// RECOMMANDATION STRUCTURÉE V2
// ============================================================================

export type SetupRecommendationV2 = {
  tier: "essential" | "standard" | "premium";
  
  // Contexte et hypothèses
  productionProfile: EventProductionProfile;
  venueContext: VenueContext;
  assumptions: string[];
  
  // Équipements par blocs
  soundSystem: EquipmentLineItem[];
  microphones: EquipmentLineItem[];
  djSetup: EquipmentLineItem[];
  lighting: EquipmentLineItem[];
  video: EquipmentLineItem[];
  infrastructure: EquipmentLineItem[];
  accessories: EquipmentLineItem[];
  
  // Services
  services: ServiceLineItem[];
  
  // Justification et warnings
  rationale: string[];
  warnings: string[];
  considerations: string[];
  
  // Métriques
  complexity: "simple" | "moderate" | "complex";
  setupTime: string;
  staffingRequired: number;
  
  // Adaptation aux demandes explicites
  explicitRequestsHandled: string[];
};

// ============================================================================
// PARAMÈTRES DE RECOMMANDATION
// ============================================================================

export type RecommendationInput = {
  // Brief événement
  eventType?: EventType;
  guestCount?: number;
  
  // Environnement
  indoorOutdoor?: IndoorOutdoor;
  venueType?: VenueType;
  isCovered?: boolean;
  
  // Besoins déclarés
  serviceNeeds?: ServiceNeed[];
  explicitEquipmentRequests?: ExplicitEquipmentRequest[];
  
  // Intentions spécifiques
  speechExpected?: boolean;
  dancingExpected?: boolean;
  livePerformance?: boolean;
  
  // Contraintes opérationnelles
  installationNeeded?: boolean;
  technicianNeeded?: boolean;
  deliveryNeeded?: boolean;
  
  // Budget et complexité
  budgetRange?: { min?: number; max?: number };
  simplicityPreference?: "simple" | "standard" | "no_limit";
  
  // Contraintes venue
  venueConstraints?: string[];
  accessConstraints?: "easy" | "moderate" | "difficult";
  electricityAvailable?: boolean;
  noiseRestrictions?: boolean;
};

// ============================================================================
// RÈGLES MÉTIER
// ============================================================================

export type EventTypeRule = {
  eventType: EventType;
  typicalProfile: EventProductionProfile;
  commonConstraints: string[];
  scalingFactors: {
    audienceThresholds: number[];
    equipmentMultipliers: number[];
  };
};

export type EnvironmentRule = {
  condition: {
    indoorOutdoor?: IndoorOutdoor;
    venueType?: VenueType;
    covered?: boolean;
  };
  adjustments: {
    powerRequirement: number;
    weatherProofing: boolean;
    mobilityPriority: boolean;
    acousticChallenges: string[];
  };
};

// ============================================================================
// CATALOGUE VIRTUEL
// ============================================================================

export type EquipmentSpec = {
  category: EquipmentCategory;
  subcategory: string;
  name: string;
  description: string;
  powerRating?: number;
  coverage?: {
    audienceMin: number;
    audienceMax: number;
    distanceMax: number;
  };
  suitability: {
    indoor: boolean;
    outdoor: boolean;
    speech: boolean;
    music: boolean;
    dance: boolean;
  };
  complexity: "simple" | "moderate" | "professional";
  alternatives: string[];
};

// ============================================================================
// MÉTRIQUES ET VALIDATION
// ============================================================================

export type RecommendationQuality = {
  credibilityScore: number; // 0-1
  completenessScore: number; // 0-1  
  practicalityScore: number; // 0-1
  
  // Détails d'évaluation
  missingElements: string[];
  overEngineeredElements: string[];
  inconsistencies: string[];
  improvements: string[];
};

export type RecommendationValidation = {
  isRealistic: boolean;
  isPractical: boolean;
  isComplete: boolean;
  quality: RecommendationQuality;
  feedback: string[];
};

// ============================================================================
// CONTEXTE CONVERSATIONNEL
// ============================================================================

export type ConversationalContext = {
  // Historique des recommandations
  previousRecommendations?: SetupRecommendationV2[];
  
  // Feedback utilisateur
  userPreferences?: {
    preferredBrands?: string[];
    avoidedEquipment?: string[];
    budgetSensitive?: boolean;
    simplicityPriority?: boolean;
  };
  
  // Corrections et clarifications
  corrections?: Array<{
    field: string;
    oldValue: unknown;
    newValue: unknown;
    reason: string;
  }>;
};

// ============================================================================
// API PUBLIQUE
// ============================================================================

export type RecommendationEngineV2 = {
  generateRecommendations(input: RecommendationInput, context?: ConversationalContext): SetupRecommendationV2[];
  validateRecommendation(recommendation: SetupRecommendationV2): RecommendationValidation;
  adaptToExplicitRequests(base: SetupRecommendationV2, requests: ExplicitEquipmentRequest[]): SetupRecommendationV2;
  explainRecommendation(recommendation: SetupRecommendationV2): string[];
};