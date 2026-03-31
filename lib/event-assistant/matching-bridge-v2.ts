/**
 * Bridge de compatibilité entre matching V1 et V2
 * Conversion des données et migration transparente
 */

import { EventBrief, MatchingProvider, UiRecommendedSetups } from "./types";
import { SetupRecommendationV2, EquipmentLineItem, ServiceLineItem } from "./production-types";
import { ConversationEngineState } from "./v2-types";
import { 
  ProviderV2, 
  MatchingInputV2, 
  MatchingResultsV2, 
  MatchResult,
  MatchingConfigV2 
} from "./matching-types-v2";
import { defaultMatchingEngineV2 } from "./matching-engine-v2";
import { DEFAULT_MATCHING_CONFIG } from "./matching-rules-v2";
import { getSlotValue } from "./slots-engine";

// ============================================================================
// CONVERSION BRIEF/SLOTS → MATCHING INPUT V2
// ============================================================================

export function convertBriefToMatchingInput(
  brief: EventBrief, 
  recommendation?: SetupRecommendationV2
): MatchingInputV2 {
  return {
    eventType: brief.eventType.value || undefined,
    guestCount: brief.guestCount.value || undefined,
    eventDate: brief.eventDate.value?.isoDate || undefined,
    
    location: {
      city: brief.location.value?.city || brief.location.value?.label,
      lat: brief.location.value?.lat,
      lng: brief.location.value?.lng,
      address: brief.location.value?.address
    },
    
    // Utiliser la recommandation V2 si disponible
    requiredEquipment: recommendation ? [
      ...recommendation.soundSystem,
      ...recommendation.microphones,
      ...recommendation.djSetup,
      ...recommendation.lighting,
      ...recommendation.video,
      ...recommendation.infrastructure,
      ...recommendation.accessories
    ] : generateFallbackEquipment(brief) as EquipmentLineItem[],
    
    requiredServices: recommendation ? 
      recommendation.services : 
      generateFallbackServices(brief) as ServiceLineItem[],
    
    indoorOutdoor: brief.indoorOutdoor.value || undefined,
    budgetMax: brief.budgetRange.value?.max || undefined,
    
    deliveryRequired: brief.deliveryNeeded.value || false,
    installationRequired: brief.installationNeeded.value || false,
    technicianRequired: brief.technicianNeeded.value || false,
    
    qualityPreference: inferQualityPreference(brief),
    proximityPreference: "moderate"
  };
}

export function convertSlotsToMatchingInput(
  slots: ConversationEngineState['slots'],
  recommendation?: SetupRecommendationV2
): MatchingInputV2 {
  const locationValue = getSlotValue(slots.location);
  
  return {
    eventType: getSlotValue(slots.eventType) || undefined,
    guestCount: getSlotValue(slots.guestCount) || undefined,
    eventDate: getSlotValue(slots.eventDate)?.isoDate || undefined,
    
    location: {
      city: locationValue?.city || locationValue?.label,
      lat: locationValue?.lat,
      lng: locationValue?.lng,
      address: locationValue?.address
    },
    
    requiredEquipment: recommendation ? [
      ...recommendation.soundSystem,
      ...recommendation.microphones,
      ...recommendation.djSetup,
      ...recommendation.lighting,
      ...recommendation.video,
      ...recommendation.infrastructure,
      ...recommendation.accessories
    ] : [],
    
    requiredServices: recommendation?.services || [],
    
    indoorOutdoor: getSlotValue(slots.indoorOutdoor) || undefined,
    budgetMax: getSlotValue(slots.budgetRange)?.max || undefined,
    
    deliveryRequired: getSlotValue(slots.deliveryNeeded) || false,
    installationRequired: getSlotValue(slots.installationNeeded) || false,
    technicianRequired: getSlotValue(slots.technicianNeeded) || false,
    
    qualityPreference: "standard",
    proximityPreference: "moderate"
  };
}

// ============================================================================
// CONVERSION PROVIDERS V1 → V2 AVEC ENRICHISSEMENT
// ============================================================================

export function convertV1ProvidersToV2(providers: MatchingProvider[]): ProviderV2[] {
  return providers.map(provider => convertSingleProviderToV2(provider));
}

function convertSingleProviderToV2(provider: MatchingProvider): ProviderV2 {
  return {
    // Données de base (1:1 mapping)
    id: provider.id,
    title: provider.title,
    description: provider.description,
    location: provider.location,
    pricePerDay: provider.pricePerDay,
    rating: provider.rating,
    ratingCount: provider.ratingCount,
    image: provider.image,
    
    // Capacités étendues V2 avec inférence intelligente
    capabilities: {
      categories: provider.capabilities.categories,
      
      services: {
        delivery: provider.capabilities.services.delivery,
        installation: provider.capabilities.services.installation,
        technician: provider.capabilities.services.technician,
        consulting: inferConsultingCapability(provider),
        maintenance: inferMaintenanceCapability(provider)
      },
      
      // Nouvelles capacités V2 - inférées ou par défaut
      coverage: inferCoverageArea(provider),
      availability: inferAvailability(provider),
      inventory: inferInventory(provider),
      constraints: inferConstraints(provider),
      specializations: inferSpecializations(provider),
      certifications: inferCertifications(provider),
      equipment_quality: inferEquipmentQuality(provider)
    },
    
    // Pricing structuré
    pricing: {
      dailyRate: provider.pricePerDay,
      deliveryFee: inferDeliveryFee(provider),
      setupFee: inferSetupFee(provider),
      technicianFee: inferTechnicianFee(provider)
    },
    
    // Trust basé sur les données existantes
    trust: {
      verified: inferVerificationStatus(provider),
      businessLicense: inferBusinessLicense(provider),
      insurance: inferInsurance(provider),
      responseTime: inferResponseTime(provider),
      completionRate: inferCompletionRate(provider)
    }
  };
}

// ============================================================================
// FONCTIONS D'INFÉRENCE POUR ENRICHIR LES DONNÉES V1
// ============================================================================

function inferCoverageArea(provider: MatchingProvider) {
  // Analyser la localisation pour déduire les zones
  const location = provider.location.toLowerCase();
  let zones = [provider.location];
  
  if (location.includes('paris')) {
    zones = ['Paris', 'Île-de-France'];
  } else if (location.includes('92') || location.includes('hauts-de-seine')) {
    zones = ['Hauts-de-Seine', 'Île-de-France'];
  } else if (location.includes('93') || location.includes('seine-saint-denis')) {
    zones = ['Seine-Saint-Denis', 'Île-de-France'];
  } else if (location.includes('94') || location.includes('val-de-marne')) {
    zones = ['Val-de-Marne', 'Île-de-France'];
  }
  
  return {
    zones,
    maxDistance: 25, // 25km par défaut
    deliveryFee: 50,
    freeDeliveryThreshold: 500
  };
}

function inferSpecializations(provider: MatchingProvider) {
  const categories = provider.capabilities.categories.map(c => c.toLowerCase());
  const title = provider.title.toLowerCase();
  const description = (provider.description || '').toLowerCase();
  
  const specializations: string[] = [];
  
  // Inférence basée sur les catégories et le texte
  if (categories.includes('dj') || title.includes('dj') || description.includes('dj')) {
    specializations.push('dj_set', 'birthday', 'private_party');
  }
  
  if (categories.includes('microphones') || categories.includes('sound')) {
    specializations.push('conference', 'corporate');
  }
  
  if (categories.includes('lighting') && categories.includes('sound')) {
    specializations.push('wedding', 'showcase');
  }
  
  if (title.includes('mariage') || description.includes('mariage')) {
    specializations.push('wedding');
  }
  
  if (title.includes('corporate') || title.includes('entreprise')) {
    specializations.push('corporate', 'conference');
  }
  
  return specializations as any[]; // Cast nécessaire pour EventType[]
}

function inferInventory(provider: MatchingProvider) {
  // Créer un inventaire basique basé sur les catégories
  const inventory = provider.capabilities.categories.map(category => {
    const baseQuantity = inferBaseQuantityForCategory(category, provider);
    
    return {
      category: category.toLowerCase(),
      quantity: baseQuantity,
      qualityTier: inferEquipmentQuality(provider),
      brands: inferTypicalBrands(category)
    };
  });
  
  return inventory;
}

function inferBaseQuantityForCategory(category: string, provider: MatchingProvider): number {
  const cat = category.toLowerCase();
  
  // Estimations basées sur le type de prestataire et son rating
  const sizeMultiplier = provider.rating && provider.rating > 4.5 ? 1.5 : 1.0;
  
  const baseQuantities: Record<string, number> = {
    'sound': 6,
    'microphones': 4,
    'dj': 2,
    'lighting': 8,
    'led_screen': 1,
    'video': 2
  };
  
  return Math.round((baseQuantities[cat] || 3) * sizeMultiplier);
}

function inferEquipmentQuality(provider: MatchingProvider): "basic" | "standard" | "premium" {
  if (!provider.rating) return "standard";
  
  if (provider.rating >= 4.7 && (provider.ratingCount || 0) >= 20) return "premium";
  if (provider.rating >= 4.3) return "standard";
  return "basic";
}

function inferConstraints(provider: MatchingProvider) {
  return {
    minEventSize: 10,
    maxEventSize: 500,
    minOrderValue: 100,
    maxEventDistance: 30
  };
}

function inferConsultingCapability(provider: MatchingProvider): boolean {
  return (provider.rating || 0) >= 4.5 && (provider.ratingCount || 0) >= 10;
}

function inferMaintenanceCapability(provider: MatchingProvider): boolean {
  return provider.capabilities.services.technician === true;
}

function inferDeliveryFee(provider: MatchingProvider): number {
  const baseRate = provider.pricePerDay || 200;
  return Math.round(baseRate * 0.15); // 15% du tarif journalier
}

function inferSetupFee(provider: MatchingProvider): number {
  if (provider.capabilities.services.installation) {
    const baseRate = provider.pricePerDay || 200;
    return Math.round(baseRate * 0.3); // 30% du tarif journalier
  }
  return 0;
}

function inferTechnicianFee(provider: MatchingProvider): number {
  if (provider.capabilities.services.technician) {
    return 150; // Tarif journalier technicien standard
  }
  return 0;
}

function inferVerificationStatus(provider: MatchingProvider): boolean {
  return (provider.rating || 0) >= 4.5 && (provider.ratingCount || 0) >= 15;
}

function inferBusinessLicense(provider: MatchingProvider): boolean {
  return (provider.rating || 0) >= 4.0 && (provider.ratingCount || 0) >= 10;
}

function inferInsurance(provider: MatchingProvider): boolean {
  return (provider.rating || 0) >= 4.2;
}

function inferResponseTime(provider: MatchingProvider): number {
  if ((provider.rating || 0) >= 4.8) return 6; // 6h
  if ((provider.rating || 0) >= 4.5) return 12; // 12h
  if ((provider.rating || 0) >= 4.0) return 24; // 24h
  return 48; // 48h
}

function inferCompletionRate(provider: MatchingProvider): number {
  if (!provider.rating) return 90;
  
  const rate = 75 + (provider.rating * 5); // 4.5⭐ → 97.5%
  return Math.min(100, rate);
}

function inferTypicalBrands(category: string): string[] {
  const brands: Record<string, string[]> = {
    'sound': ['JBL', 'QSC', 'Yamaha', 'RCF'],
    'microphones': ['Shure', 'Sennheiser', 'Audio-Technica'],
    'dj': ['Pioneer', 'Technics', 'Native Instruments'],
    'lighting': ['Chauvet', 'American DJ', 'Showtec'],
    'led_screen': ['Samsung', 'LG', 'Barco'],
    'video': ['Epson', 'BenQ', 'Canon']
  };
  
  return brands[category.toLowerCase()] || [];
}

// ============================================================================
// GÉNÉRATION FALLBACK POUR ÉQUIPEMENT/SERVICES
// ============================================================================

function generateFallbackEquipment(brief: EventBrief) {
  const serviceNeeds = brief.serviceNeeds.value || ['sound'];
  const guestCount = brief.guestCount.value || 50;
  
  const equipment = serviceNeeds.map(need => {
    const quantities = {
      sound: Math.ceil(guestCount / 50) * 2,
      microphones: Math.min(4, Math.max(2, Math.ceil(guestCount / 100))),
      dj: 1,
      lighting: Math.ceil(guestCount / 25),
      led_screen: 1
    };
    
    return {
      category: need,
      subcategory: need,
      quantity: quantities[need as keyof typeof quantities] || 1,
      label: `${quantities[need as keyof typeof quantities] || 1}x ${need}`,
      description: `Équipement ${need} pour ${guestCount} personnes`,
      priority: "essential" as const,
      reasoning: "Inféré depuis brief utilisateur"
    };
  });
  
  return equipment;
}

function generateFallbackServices(brief: EventBrief) {
  const services = [];
  
  if (brief.deliveryNeeded.value !== false) {
    services.push({
      service: "delivery",
      description: "Livraison du matériel",
      reasoning: "Service standard",
      priority: "recommended" as const
    });
  }
  
  if (brief.installationNeeded.value) {
    services.push({
      service: "installation",
      description: "Installation et configuration",
      reasoning: "Demandé par l'utilisateur",
      priority: "required" as const
    });
  }
  
  if (brief.technicianNeeded.value) {
    services.push({
      service: "technician",
      description: "Technicien pendant l'événement",
      reasoning: "Demandé par l'utilisateur",
      priority: "required" as const
    });
  }
  
  return services;
}

function inferQualityPreference(brief: EventBrief): "basic" | "standard" | "premium" {
  const eventType = brief.eventType.value;
  const budgetRange = brief.budgetRange.value;
  
  if (['wedding', 'corporate', 'product_launch'].includes(eventType || '')) {
    return "premium";
  }
  
  if (budgetRange && budgetRange.max && budgetRange.max > 1000) {
    return "premium";
  }
  
  if (budgetRange && budgetRange.max && budgetRange.max < 300) {
    return "basic";
  }
  
  return "standard";
}

// ============================================================================
// CONVERSION RÉSULTATS V2 → FORMAT V1 (pour compatibilité UI)
// ============================================================================

export function convertV2ResultsToV1Format(results: MatchingResultsV2): Array<{
  provider: MatchingProvider;
  score: any; // Compatible avec ProviderScoreBreakdown V1
}> {
  return results.matches.map(match => ({
    provider: convertV2ProviderToV1(match.provider),
    score: convertV2ScoringToV1(match)
  }));
}

function convertV2ProviderToV1(provider: ProviderV2): MatchingProvider {
  return {
    id: provider.id,
    title: provider.title,
    description: provider.description,
    location: provider.location,
    pricePerDay: provider.pricePerDay,
    rating: provider.rating,
    ratingCount: provider.ratingCount,
    image: provider.image,
    capabilities: {
      categories: provider.capabilities.categories,
      services: {
        delivery: provider.capabilities.services.delivery,
        installation: provider.capabilities.services.installation,
        technician: provider.capabilities.services.technician
      },
      coverageLabel: provider.capabilities.coverage.zones.join(", "),
      lat: provider.capabilities.coverage.zones[0] ? undefined : undefined, // TODO: améliorer
      lng: provider.capabilities.coverage.zones[0] ? undefined : undefined
    }
  };
}

function convertV2ScoringToV1(match: MatchResult) {
  if (!match.scoring) {
    return {
      total: 50,
      criteria: {
        material: 50,
        delivery: 50,
        proximity: 50,
        installation: 50,
        technician: 50,
        date: 50,
        budget: 50,
        confidence: 50
      },
      rationale: ["Score indisponible"]
    };
  }
  
  const scoring = match.scoring;
  
  return {
    total: scoring.total,
    criteria: {
      material: scoring.dimensions.inventory_fit.score,
      delivery: scoring.dimensions.service_fit.score,
      proximity: scoring.dimensions.proximity_fit.score,
      installation: scoring.dimensions.service_fit.score,
      technician: scoring.dimensions.service_fit.score,
      date: 80, // Mock
      budget: scoring.dimensions.budget_fit.score,
      confidence: scoring.dimensions.trust_fit.score
    },
    rationale: [
      match.recommendationReason,
      ...scoring.strengths.slice(0, 2)
    ]
  };
}

// ============================================================================
// API PUBLIQUE - REMPLACEMENT TRANSPARENT
// ============================================================================

/**
 * Version V2 de rankProviders compatible avec l'API V1
 */
export function rankProvidersV2(
  brief: EventBrief,
  setup: UiRecommendedSetups | SetupRecommendationV2,
  providers: MatchingProvider[]
): Array<{ provider: MatchingProvider; score: any }> {
  // Convertir les inputs
  const matchingInput = convertBriefToMatchingInput(brief, isV2Setup(setup) ? setup : undefined);
  const providersV2 = convertV1ProvidersToV2(providers);
  
  // Utiliser le moteur V2
  const results = defaultMatchingEngineV2.findMatches(matchingInput, providersV2);
  
  // Convertir back au format V1 pour compatibilité
  return convertV2ResultsToV1Format(results);
}

function isV2Setup(setup: UiRecommendedSetups | SetupRecommendationV2): setup is SetupRecommendationV2 {
  return 'productionProfile' in setup;
}

/**
 * Version adaptative qui utilise V2 si activé, sinon V1
 */
export function rankProvidersAdaptive(
  brief: EventBrief,
  setup: UiRecommendedSetups | SetupRecommendationV2,
  providers: MatchingProvider[]
): Array<{ provider: MatchingProvider; score: any }> {
  if (isMatchingV2Enabled()) {
    console.debug("🔍 Utilisation moteur matching V2");
    return rankProvidersV2(brief, setup, providers);
  } else {
    console.debug("🔍 Utilisation moteur matching V1");
    return rankProvidersV1(brief, setup as UiRecommendedSetups, providers);
  }
}

// ============================================================================
// FEATURE FLAG ET MIGRATION  
// ============================================================================

const MATCHING_V2_FLAG_KEY = "matching_engine_v2";

function isJestOrNodeTest(): boolean {
  return (
    typeof process !== "undefined" &&
    (process.env.NODE_ENV === "test" || Boolean(process.env.JEST_WORKER_ID))
  );
}

export function isMatchingV2Enabled(): boolean {
  if (isJestOrNodeTest()) return true;
  if (typeof window === "undefined") return false;
  return localStorage.getItem(MATCHING_V2_FLAG_KEY) === "true";
}

export function enableMatchingV2(enable: boolean = true): void {
  if (typeof window === "undefined") return;
  
  if (enable) {
    localStorage.setItem(MATCHING_V2_FLAG_KEY, "true");
    console.log("✅ Moteur de matching V2 activé");
  } else {
    localStorage.removeItem(MATCHING_V2_FLAG_KEY);
    console.log("✅ Retour vers moteur de matching V1");
  }
}

// Import fallback V1 dynamique
let rankProvidersV1: (brief: EventBrief, setup: UiRecommendedSetups, providers: MatchingProvider[]) => any;

if (typeof window !== "undefined") {
  import("./matching").then(module => {
    rankProvidersV1 = module.rankProviders;
  });
}

// Fallback sécurisé
function safeFallbackV1(brief: EventBrief, setup: UiRecommendedSetups, providers: MatchingProvider[]) {
  // Simple tri par rating si import V1 échoue
  return providers
    .sort((a, b) => (b.rating || 0) - (a.rating || 0))
    .map(provider => ({
      provider,
      score: {
        total: Math.round((provider.rating || 3) * 20),
        criteria: {
          material: 70,
          delivery: 70,
          proximity: 70,
          installation: 70,
          technician: 70,
          date: 70,
          budget: 70,
          confidence: Math.round((provider.rating || 3) * 20)
        },
        rationale: ["Fallback simple par rating"]
      }
    }));
}

if (!rankProvidersV1) {
  rankProvidersV1 = safeFallbackV1;
}