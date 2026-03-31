/**
 * Règles métier et configurations pour le matching V2
 */

import { EventType } from "./types";
import { 
  HardFilterConfig, 
  ScoringWeights, 
  MatchingConfigV2, 
  SpecializationMap,
  ProviderSpecialization 
} from "./matching-types-v2";

// ============================================================================
// CONFIGURATION PAR DÉFAUT
// ============================================================================

export const DEFAULT_HARD_FILTER_CONFIG: HardFilterConfig = {
  enableZoneFiltering: true,
  enableAvailabilityFiltering: true,
  enableInventoryFiltering: true,
  enableServiceFiltering: true,
  
  minEquipmentCoverage: 0.7,   // 70% du matériel requis minimum
  minServiceCoverage: 0.8,     // 80% des services requis minimum
  maxDistanceKm: 50            // Maximum 50km du lieu d'événement
};

export const DEFAULT_SCORING_WEIGHTS: ScoringWeights = {
  inventory_fit: 25,      // Le plus important : a-t-il le matériel ?
  service_fit: 20,        // Services requis (livraison, installation, etc.)
  operational_fit: 15,    // Capacité opérationnelle (taille événement, contraintes)
  specialization_fit: 15, // Spécialisation dans le type d'événement
  proximity_fit: 10,      // Distance/zone géographique
  budget_fit: 5,          // Adéquation prix
  quality_fit: 5,         // Qualité du matériel
  trust_fit: 5            // Confiance (avis, certifications)
};

export const DEFAULT_MATCHING_CONFIG: MatchingConfigV2 = {
  hardFilter: DEFAULT_HARD_FILTER_CONFIG,
  scoring: {
    weights: DEFAULT_SCORING_WEIGHTS,
    enableSpecializationBoost: true,
    penalizeIncompleteData: true
  },
  results: {
    maxResults: 10,
    minScoreThreshold: 50,  // Score minimum pour apparaître
    enableMultiProvider: false // Désactivé par défaut
  }
};

// ============================================================================
// SPÉCIALISATIONS MÉTIER PAR TYPE D'ÉVÉNEMENT
// ============================================================================

export const EVENT_SPECIALIZATION_REQUIREMENTS: SpecializationMap = {
  conference: {
    requiredCategories: ["sound", "microphones"],
    preferredServices: ["installation", "technician"],
    qualityImportance: 0.8,
    experienceWeight: 1.5
  },
  
  corporate: {
    requiredCategories: ["sound", "microphones"],
    preferredServices: ["installation", "technician"],
    qualityImportance: 0.9,
    experienceWeight: 1.4
  },
  
  wedding: {
    requiredCategories: ["sound", "microphones", "dj"],
    preferredServices: ["delivery", "installation", "technician"],
    qualityImportance: 0.9,
    experienceWeight: 1.6
  },
  
  birthday: {
    requiredCategories: ["sound", "dj"],
    preferredServices: ["delivery"],
    qualityImportance: 0.6,
    experienceWeight: 1.2
  },
  
  private_party: {
    requiredCategories: ["sound", "dj"],
    preferredServices: ["delivery"],
    qualityImportance: 0.6,
    experienceWeight: 1.2
  },
  
  cocktail: {
    requiredCategories: ["sound"],
    preferredServices: ["delivery"],
    qualityImportance: 0.7,
    experienceWeight: 1.1
  },
  
  dj_set: {
    requiredCategories: ["sound", "dj", "lighting"],
    preferredServices: ["installation", "technician"],
    qualityImportance: 0.8,
    experienceWeight: 1.8
  },
  
  showcase: {
    requiredCategories: ["sound", "lighting"],
    preferredServices: ["installation", "technician"],
    qualityImportance: 0.9,
    experienceWeight: 1.6
  },
  
  religious_service: {
    requiredCategories: ["sound", "microphones"],
    preferredServices: ["installation"],
    qualityImportance: 0.7,
    experienceWeight: 1.3
  },
  
  product_launch: {
    requiredCategories: ["sound", "microphones", "lighting", "led_screen"],
    preferredServices: ["installation", "technician"],
    qualityImportance: 1.0,
    experienceWeight: 1.7
  },
  
  screening: {
    requiredCategories: ["sound", "led_screen"],
    preferredServices: ["installation"],
    qualityImportance: 0.8,
    experienceWeight: 1.2
  },
  
  outdoor_event: {
    requiredCategories: ["sound"],
    preferredServices: ["delivery", "installation", "technician"],
    qualityImportance: 0.9,
    experienceWeight: 1.4
  },
  
  other: {
    requiredCategories: ["sound"],
    preferredServices: [],
    qualityImportance: 0.6,
    experienceWeight: 1.0
  },
  
  unknown: {
    requiredCategories: [],
    preferredServices: [],
    qualityImportance: 0.5,
    experienceWeight: 1.0
  }
};

// ============================================================================
// MAPPING CATÉGORIES D'ÉQUIPEMENT
// ============================================================================

export const EQUIPMENT_CATEGORY_MAPPING: Record<string, string[]> = {
  // Mapping pour compatibilité avec recommandations V2
  sound_system: ["sound", "audio", "sono", "enceintes"],
  microphones: ["microphones", "mic", "micro", "speech"],
  dj_setup: ["dj", "mix", "platines", "console"],
  lighting: ["lighting", "light", "lumiere", "eclairage"],
  video: ["video", "led_screen", "screen", "ecran", "projection"],
  infrastructure: ["stands", "structures", "cables"],
  accessories: ["cables", "di", "accessoires"]
};

// Mapping inverse pour normalisation
export const NORMALIZED_CATEGORIES: Record<string, string> = {};
Object.entries(EQUIPMENT_CATEGORY_MAPPING).forEach(([normalized, aliases]) => {
  aliases.forEach(alias => {
    NORMALIZED_CATEGORIES[alias.toLowerCase()] = normalized;
  });
});

// ============================================================================
// ZONES GÉOGRAPHIQUES COMMUNES
// ============================================================================

export const COMMON_ZONES = {
  PARIS_INTRAMUROS: ["paris", "paris 1", "paris 2", "paris 3", "paris 4", "paris 5", 
                     "paris 6", "paris 7", "paris 8", "paris 9", "paris 10", 
                     "paris 11", "paris 12", "paris 13", "paris 14", "paris 15", 
                     "paris 16", "paris 17", "paris 18", "paris 19", "paris 20"],
  
  PARIS_PROCHE_BANLIEUE: ["boulogne", "neuilly", "levallois", "courbevoie", "puteaux", 
                          "issy", "malakoff", "montrouge", "vanves", "clamart",
                          "saint-cloud", "suresnes", "nanterre", "colombes", "la défense"],
  
  HAUTS_DE_SEINE: ["92", "hauts-de-seine", "boulogne", "neuilly", "courbevoie", "puteaux", 
                   "issy", "malakoff", "montrouge", "nanterre", "rueil", "saint-cloud"],
  
  VAL_DE_MARNE: ["94", "val-de-marne", "vincennes", "saint-mandé", "charenton", 
                 "maisons-alfort", "créteil", "vitry", "ivry"],
  
  SEINE_SAINT_DENIS: ["93", "seine-saint-denis", "montreuil", "bagnolet", "pantin", 
                      "les lilas", "pré-saint-gervais", "saint-denis", "aubervilliers"],
  
  ILE_DE_FRANCE: ["75", "92", "93", "94", "77", "78", "91", "95", 
                  "paris", "île-de-france", "idf", "région parisienne"]
};

// ============================================================================
// ALGORITHMES DE DISTANCE/PROXIMITÉ
// ============================================================================

export function calculateZoneCompatibility(
  eventLocation: string, 
  providerZones: string[]
): {
  isCompatible: boolean;
  compatibilityScore: number; // 0-1
  reason: string;
} {
  const eventLower = eventLocation.toLowerCase();
  const providerZonesLower = providerZones.map(z => z.toLowerCase());
  
  // Correspondance exacte
  if (providerZonesLower.some(zone => zone === eventLower)) {
    return {
      isCompatible: true,
      compatibilityScore: 1.0,
      reason: "Zone exacte couverte"
    };
  }
  
  // Correspondance partielle (ville contient arrondissement)
  if (providerZonesLower.some(zone => zone.includes(eventLower) || eventLower.includes(zone))) {
    return {
      isCompatible: true,
      compatibilityScore: 0.9,
      reason: "Zone proche couverte"
    };
  }
  
  // Check dans les zones communes
  for (const [zoneName, cities] of Object.entries(COMMON_ZONES)) {
    const eventInZone = cities.some(city => eventLower.includes(city.toLowerCase()));
    const providerCoversZone = providerZonesLower.some(pZone => 
      cities.some(city => pZone.includes(city.toLowerCase()))
    );
    
    if (eventInZone && providerCoversZone) {
      return {
        isCompatible: true,
        compatibilityScore: zoneName.includes('PARIS') ? 0.8 : 0.6,
        reason: `Même zone géographique (${zoneName.toLowerCase()})`
      };
    }
  }
  
  return {
    isCompatible: false,
    compatibilityScore: 0,
    reason: "Zone non couverte"
  };
}

// ============================================================================
// VALIDATION DES CONTRAINTES OPÉRATIONNELLES
// ============================================================================

export function validateOperationalConstraints(
  eventSize?: number,
  eventType?: EventType,
  indoorOutdoor?: string,
  providerConstraints?: any
): {
  isValid: boolean;
  violations: string[];
} {
  const violations: string[] = [];
  
  if (!providerConstraints) {
    return { isValid: true, violations: [] };
  }
  
  // Taille d'événement
  if (eventSize) {
    if (providerConstraints.minEventSize && eventSize < providerConstraints.minEventSize) {
      violations.push(`Événement trop petit (min: ${providerConstraints.minEventSize})`);
    }
    if (providerConstraints.maxEventSize && eventSize > providerConstraints.maxEventSize) {
      violations.push(`Événement trop grand (max: ${providerConstraints.maxEventSize})`);
    }
  }
  
  // Indoor/Outdoor
  if (indoorOutdoor) {
    if (providerConstraints.indoorOnly && indoorOutdoor === 'outdoor') {
      violations.push("Prestataire intérieur uniquement");
    }
    if (providerConstraints.outdoorOnly && indoorOutdoor === 'indoor') {
      violations.push("Prestataire extérieur uniquement");
    }
  }
  
  return {
    isValid: violations.length === 0,
    violations
  };
}

// ============================================================================
// CALCULS DE SCORING SPÉCIALISÉS
// ============================================================================

export function calculateSpecializationBonus(
  eventType: EventType,
  providerSpecializations: EventType[],
  providerExperience?: string[]
): number {
  if (!eventType || eventType === 'unknown') return 1.0;
  
  // Bonus si spécialisé exactement dans ce type
  if (providerSpecializations.includes(eventType)) {
    return 1.5;
  }
  
  // Bonus mineur pour types connexes
  const relatedTypes: Record<EventType, EventType[]> = {
    conference: ['corporate', 'product_launch'],
    corporate: ['conference', 'product_launch'],
    wedding: ['private_party', 'birthday'],
    birthday: ['private_party', 'wedding'],
    private_party: ['birthday', 'cocktail'],
    dj_set: ['private_party', 'birthday', 'showcase'],
    showcase: ['product_launch', 'dj_set'],
    cocktail: ['corporate', 'private_party'],
    religious_service: ['conference', 'wedding'],
    product_launch: ['corporate', 'showcase'],
    screening: ['corporate', 'product_launch'],
    outdoor_event: ['showcase', 'dj_set']
  };
  
  const related = relatedTypes[eventType] || [];
  const hasRelated = related.some(type => providerSpecializations.includes(type));
  
  if (hasRelated) return 1.2;
  
  return 1.0; // Neutral
}

export function calculateInventoryFit(
  requiredItems: Array<{ category: string; subcategory?: string; quantity: number }>,
  providerInventory: Array<{ category: string; subcategory?: string; quantity: number }>
): {
  overallFit: number; // 0-1
  categoryFit: Record<string, number>;
  missing: string[];
  sufficient: string[];
} {
  const categoryFit: Record<string, number> = {};
  const missing: string[] = [];
  const sufficient: string[] = [];
  
  let totalRequired = 0;
  let totalCovered = 0;
  
  for (const required of requiredItems) {
    totalRequired++;
    
    // Normaliser les catégories pour comparaison
    const normalizedRequired = NORMALIZED_CATEGORIES[required.category.toLowerCase()] || required.category.toLowerCase();
    
    // Chercher dans l'inventaire du prestataire
    const availableItems = providerInventory.filter(item => {
      const normalizedAvailable = NORMALIZED_CATEGORIES[item.category.toLowerCase()] || item.category.toLowerCase();
      return normalizedAvailable === normalizedRequired;
    });
    
    if (availableItems.length === 0) {
      categoryFit[required.category] = 0;
      missing.push(required.category);
      continue;
    }
    
    // Calculer si la quantité est suffisante
    const totalAvailable = availableItems.reduce((sum, item) => sum + item.quantity, 0);
    const quantityRatio = Math.min(1.0, totalAvailable / required.quantity);
    
    categoryFit[required.category] = quantityRatio;
    
    if (quantityRatio >= 0.8) { // 80% de coverage considéré comme suffisant
      totalCovered++;
      sufficient.push(required.category);
    } else {
      missing.push(`${required.category} (quantité insuffisante)`);
    }
  }
  
  const overallFit = totalRequired > 0 ? totalCovered / totalRequired : 1.0;
  
  return {
    overallFit,
    categoryFit,
    missing,
    sufficient
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function normalizeCategory(category: string): string {
  return NORMALIZED_CATEGORIES[category.toLowerCase()] || category.toLowerCase();
}

export function isFullServiceProvider(categories: string[]): boolean {
  const normalizedCategories = categories.map(normalizeCategory);
  const coreCategories = ['sound_system', 'microphones', 'lighting'];
  return coreCategories.every(core => normalizedCategories.includes(core));
}

export function estimateSetupComplexity(
  requiredItems: Array<{ category: string; quantity: number }>,
  requiredServices: string[]
): "simple" | "moderate" | "complex" {
  const totalItems = requiredItems.reduce((sum, item) => sum + item.quantity, 0);
  const uniqueCategories = new Set(requiredItems.map(item => normalizeCategory(item.category))).size;
  const hasComplexServices = requiredServices.some(s => ['installation', 'technician'].includes(s));
  
  if (totalItems <= 5 && uniqueCategories <= 2 && !hasComplexServices) return "simple";
  if (totalItems <= 15 && uniqueCategories <= 4) return "moderate";
  return "complex";
}

export const DEFAULT_PROVIDER_TRUST_SCORE = 0.7;
export const MIN_RATING_COUNT_FOR_RELIABILITY = 5;
export const HIGH_RESPONSE_TIME_HOURS = 48;