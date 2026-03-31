/**
 * Bridge entre moteur de recommandation V2 et interface existante
 */

import { EventBrief, UiRecommendedSetups, UiSetupTier, UiEquipmentRequirement } from "./types";
import { RecommendationInput, SetupRecommendationV2, EquipmentLineItem } from "./production-types";
import { defaultRecommendationEngineV2 } from "./recommendation-engine-v2";
import { getSlotValue } from "./slots-engine";
import { ConversationEngineState } from "./v2-types";

// ============================================================================
// CONVERSION BRIEF → INPUT
// ============================================================================

export function convertBriefToRecommendationInput(brief: EventBrief): RecommendationInput {
  return {
    eventType: brief.eventType.value || undefined,
    guestCount: brief.guestCount.value || undefined,
    indoorOutdoor: brief.indoorOutdoor.value || undefined,
    venueType: brief.venueType.value || undefined,
    
    serviceNeeds: brief.serviceNeeds.value || undefined,
    
    // Intentions dérivées des service needs
    speechExpected: brief.serviceNeeds.value?.includes("microphones") || 
                   ["conference", "corporate", "religious_service"].includes(brief.eventType.value || ""),
                   
    dancingExpected: brief.serviceNeeds.value?.includes("dj") ||
                    ["birthday", "private_party", "dj_set"].includes(brief.eventType.value || ""),
                    
    livePerformance: ["showcase", "wedding", "dj_set", "religious_service"].includes(brief.eventType.value || ""),
    
    // Services
    deliveryNeeded: brief.deliveryNeeded.value || undefined,
    installationNeeded: brief.installationNeeded.value || undefined,  
    technicianNeeded: brief.technicianNeeded.value || undefined,
    
    // Budget
    budgetRange: brief.budgetRange.value || undefined,
    
    // Contraintes basées sur venue
    noiseRestrictions: brief.venueType.value === "apartment" || brief.venueType.value === "private_home",
    electricityAvailable: brief.venueType.value !== "outdoor_space",
    accessConstraints: brief.venueType.value === "apartment" ? "difficult" : "moderate"
  };
}

export function convertSlotsToRecommendationInput(slots: ConversationEngineState['slots']): RecommendationInput {
  return {
    eventType: getSlotValue(slots.eventType) || undefined,
    guestCount: getSlotValue(slots.guestCount) || undefined,
    indoorOutdoor: getSlotValue(slots.indoorOutdoor) || undefined,
    venueType: getSlotValue(slots.venueType) || undefined,
    
    serviceNeeds: getSlotValue(slots.serviceNeeds) || undefined,
    
    // Dériver intentions
    speechExpected: getSlotValue(slots.serviceNeeds)?.includes("microphones"),
    dancingExpected: getSlotValue(slots.serviceNeeds)?.includes("dj"),
    
    // Services
    deliveryNeeded: getSlotValue(slots.deliveryNeeded) || undefined,
    installationNeeded: getSlotValue(slots.installationNeeded) || undefined,
    technicianNeeded: getSlotValue(slots.technicianNeeded) || undefined,
    
    // Budget
    budgetRange: getSlotValue(slots.budgetRange) || undefined
  };
}

// ============================================================================
// CONVERSION V2 → UI EXISTANTE
// ============================================================================

export function convertV2RecommendationToUI(recommendations: SetupRecommendationV2[]): UiRecommendedSetups {
  const tiers: UiSetupTier[] = recommendations.map(rec => convertSingleRecommendationToUI(rec));
  
  // Générer summary à partir de la première recommandation
  const firstRec = recommendations[0];
  const summaryParts = [];
  
  if (firstRec.productionProfile) {
    const eventTypeLabels: Record<string, string> = {
      'conference': 'Conférence',
      'corporate': 'Corporate', 
      'birthday': 'Anniversaire',
      'cocktail': 'Cocktail',
      'wedding': 'Mariage',
      'private_party': 'Soirée privée'
    };
    
    if (firstRec.productionProfile.speechImportance !== 'none') {
      summaryParts.push('Prises de parole');
    }
    if (firstRec.productionProfile.musicImportance !== 'none') {
      summaryParts.push('Diffusion musicale');
    }
    if (firstRec.productionProfile.danceIntent) {
      summaryParts.push('Danse');
    }
  }
  
  return {
    tiers,
    summary: summaryParts.length > 0 ? summaryParts.join(' · ') : "Configuration personnalisée"
  };
}

function convertSingleRecommendationToUI(recommendation: SetupRecommendationV2): UiSetupTier {
  const allItems: UiEquipmentRequirement[] = [];
  
  // Convertir chaque catégorie d'équipement
  allItems.push(...convertEquipmentSection(recommendation.soundSystem));
  allItems.push(...convertEquipmentSection(recommendation.microphones));
  allItems.push(...convertEquipmentSection(recommendation.djSetup));
  allItems.push(...convertEquipmentSection(recommendation.lighting));
  allItems.push(...convertEquipmentSection(recommendation.video));
  allItems.push(...convertEquipmentSection(recommendation.infrastructure));
  allItems.push(...convertEquipmentSection(recommendation.accessories));
  
  // Services
  const services = recommendation.services.map(s => s.description);
  
  // Rationale enrichi
  const rationale = [
    ...recommendation.rationale,
    recommendation.explicitRequestsHandled.length > 0 
      ? `Adapté selon vos demandes : ${recommendation.explicitRequestsHandled.join(', ')}`
      : null
  ].filter(Boolean).join(' • ');
  
  return {
    id: recommendation.tier,
    title: recommendation.tier === "essential" ? "Essentiel" : 
           recommendation.tier === "standard" ? "Standard" : "Premium",
    items: allItems,
    services,
    rationale,
    
    // Métadonnées V2 (pour debug/affichage enrichi)
    metadata: {
      complexity: recommendation.complexity,
      setupTime: recommendation.setupTime,
      staffingRequired: recommendation.staffingRequired,
      warnings: recommendation.warnings,
      assumptions: recommendation.assumptions
    }
  };
}

function convertEquipmentSection(items: EquipmentLineItem[]): UiEquipmentRequirement[] {
  return items.map(item => ({
    category: mapV2CategoryToV1(item.category),
    subcategory: item.subcategory,
    quantity: item.quantity,
    label: item.label,
    notes: item.description,
    
    // Métadonnées V2
    priority: item.priority,
    reasoning: item.reasoning,
    alternatives: item.alternativeOptions
  }));
}

function mapV2CategoryToV1(v2Category: string): string {
  const mapping: Record<string, string> = {
    'sound_system': 'sound',
    'microphones': 'microphone',
    'dj_setup': 'dj',
    'lighting': 'lighting',
    'video': 'video',
    'infrastructure': 'infrastructure',
    'accessories': 'accessory'
  };
  
  return mapping[v2Category] || v2Category;
}

// ============================================================================
// API PUBLIQUE - REMPLACEMENT TRANSPARENT
// ============================================================================

/**
 * Remplace buildRecommendedSetups avec le nouveau moteur V2
 */
export function buildRecommendedSetupsV2(brief: EventBrief): UiRecommendedSetups {
  const input = convertBriefToRecommendationInput(brief);
  const recommendationsV2 = defaultRecommendationEngineV2.generateRecommendations(input);
  return convertV2RecommendationToUI(recommendationsV2);
}

/**
 * Version pour système V2 avec slots
 */
export function buildRecommendedSetupsFromSlots(slots: ConversationEngineState['slots']): UiRecommendedSetups {
  const input = convertSlotsToRecommendationInput(slots);
  const recommendationsV2 = defaultRecommendationEngineV2.generateRecommendations(input);
  return convertV2RecommendationToUI(recommendationsV2);
}

// ============================================================================
// UTILITAIRES DEBUG ET ANALYSE
// ============================================================================

export function analyzeRecommendationQuality(
  input: RecommendationInput,
  recommendations: SetupRecommendationV2[]
): {
  overallScore: number;
  recommendations: Array<{
    tier: string;
    validation: ReturnType<typeof defaultRecommendationEngineV2.validateRecommendation>;
    explanations: string[];
  }>;
} {
  const analysisResults = recommendations.map(rec => ({
    tier: rec.tier,
    validation: defaultRecommendationEngineV2.validateRecommendation(rec),
    explanations: defaultRecommendationEngineV2.explainRecommendation(rec)
  }));
  
  const avgScore = analysisResults.reduce((sum, result) => {
    const validation = result.validation;
    const score = (validation.quality.credibilityScore + validation.quality.completenessScore + validation.quality.practicalityScore) / 3;
    return sum + score;
  }, 0) / analysisResults.length;
  
  return {
    overallScore: Math.round(avgScore * 100) / 100,
    recommendations: analysisResults
  };
}

export function debugRecommendationProcess(
  brief: EventBrief,
  showDetails: boolean = false
): void {
  console.group("🎛️ Debug Moteur Recommandation V2");
  
  const input = convertBriefToRecommendationInput(brief);
  console.log("📋 Input:", input);
  
  const recommendations = defaultRecommendationEngineV2.generateRecommendations(input);
  console.log("🎯 Recommandations:", recommendations.length);
  
  if (showDetails) {
    recommendations.forEach((rec, i) => {
      console.group(`${rec.tier.toUpperCase()}`);
      console.log("Profile:", rec.productionProfile);
      console.log("Venue:", rec.venueContext);
      console.log("Sound:", rec.soundSystem.length, "items");
      console.log("Mics:", rec.microphones.length, "items");
      console.log("Services:", rec.services.map(s => s.service));
      console.log("Complexity:", rec.complexity);
      console.log("Warnings:", rec.warnings);
      console.groupEnd();
    });
  }
  
  const quality = analyzeRecommendationQuality(input, recommendations);
  console.log("📊 Qualité globale:", `${Math.round(quality.overallScore * 100)}%`);
  
  console.groupEnd();
}

// ============================================================================
// FEATURE FLAG ET MIGRATION
// ============================================================================

const FEATURE_FLAG_KEY = "recommendation_engine_v2";

function isJestOrNodeTest(): boolean {
  return (
    typeof process !== "undefined" &&
    (process.env.NODE_ENV === "test" || Boolean(process.env.JEST_WORKER_ID))
  );
}

export function isRecommendationV2Enabled(): boolean {
  if (isJestOrNodeTest()) return true;
  if (typeof window === "undefined") return false;
  return localStorage.getItem(FEATURE_FLAG_KEY) === "true";
}

export function enableRecommendationV2(enable: boolean = true): void {
  if (typeof window === "undefined") return;
  
  if (enable) {
    localStorage.setItem(FEATURE_FLAG_KEY, "true");
    console.log("✅ Moteur de recommandation V2 activé");
  } else {
    localStorage.removeItem(FEATURE_FLAG_KEY);
    console.log("✅ Retour vers moteur de recommandation V1");
  }
}

/**
 * Version adaptative qui utilise V2 si activé, sinon V1
 */
export function buildRecommendedSetupsAdaptive(brief: EventBrief): UiRecommendedSetups {
  if (isRecommendationV2Enabled()) {
    console.debug("🎛️ Utilisation moteur recommandation V2");
    return buildRecommendedSetupsV2(brief);
  } else {
    // Fallback vers l'ancienne fonction (sera importée depuis recommendation.ts)
    console.debug("🎛️ Utilisation moteur recommandation V1");
    return buildRecommendedSetupsV1(brief);
  }
}

// Import de l'ancienne fonction pour fallback
let buildRecommendedSetupsV1: (brief: EventBrief) => UiRecommendedSetups;

// Dynamic import pour éviter les dépendances circulaires
if (typeof window !== "undefined") {
  import("./recommendation").then(module => {
    buildRecommendedSetupsV1 = module.buildRecommendedSetups;
  });
}

// Fallback sécurisé si import échoue
function safeFallbackV1(brief: EventBrief): UiRecommendedSetups {
  return {
    tiers: [
      {
        id: "essential",
        title: "Essentiel", 
        items: [
          { category: "sound", subcategory: "speakers", quantity: 2, label: "2 enceintes", notes: "Base" }
        ],
        services: ["Livraison"],
        rationale: "Configuration de fallback"
      }
    ],
    summary: "Configuration basique"
  };
}

if (!buildRecommendedSetupsV1) {
  buildRecommendedSetupsV1 = safeFallbackV1;
}

// ============================================================================
// HELPERS POUR TESTING
// ============================================================================

export function compareV1VsV2Recommendations(brief: EventBrief): {
  v1: UiRecommendedSetups;
  v2: UiRecommendedSetups;
  comparison: {
    equipmentCountDiff: number[];
    serviceCountDiff: number;
    rationaleDiff: string[];
  };
} {
  const v1 = buildRecommendedSetupsV1(brief);
  const v2 = buildRecommendedSetupsV2(brief);
  
  const equipmentCountDiff = v1.tiers.map((tier, i) => 
    (v2.tiers[i]?.items?.length || 0) - tier.items.length
  );
  
  const serviceCountDiff = (v2.tiers[0]?.services?.length || 0) - v1.tiers[0].services.length;
  
  const rationaleDiff = v2.tiers.map((tier, i) => 
    `${tier.id}: ${tier.rationale} (vs V1: ${v1.tiers[i]?.rationale || 'N/A'})`
  );
  
  return {
    v1,
    v2,
    comparison: {
      equipmentCountDiff,
      serviceCountDiff,
      rationaleDiff
    }
  };
}