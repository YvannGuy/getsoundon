/**
 * Règles métier pour la production événementielle - Savoir-faire terrain AV
 */

import { EventType } from "./types";
import { EventTypeRule, EnvironmentRule, EquipmentSpec, EventProductionProfile } from "./production-types";

// ============================================================================
// PROFILS ÉVÉNEMENTS PAR TYPE
// ============================================================================

export const EVENT_PRODUCTION_PROFILES: Record<EventType, EventProductionProfile> = {
  conference: {
    speechImportance: "critical",
    musicImportance: "none",
    danceIntent: false,
    livePerformance: false,
    presentationNeed: true,
    videoNeed: true,
    lightingNeed: false,
    coveragePriority: "clarity",
    mobilityNeed: false,
    autonomyRequired: false,
    professionalStaffing: true
  },

  corporate: {
    speechImportance: "high",
    musicImportance: "low",
    danceIntent: false,
    livePerformance: false,
    presentationNeed: true,
    videoNeed: true,
    lightingNeed: false,
    coveragePriority: "uniform",
    mobilityNeed: false,
    autonomyRequired: false,
    professionalStaffing: true
  },

  cocktail: {
    speechImportance: "medium",
    musicImportance: "high",
    danceIntent: false,
    livePerformance: false,
    presentationNeed: false,
    videoNeed: false,
    lightingNeed: true,
    coveragePriority: "ambience",
    mobilityNeed: false,
    autonomyRequired: true,
    professionalStaffing: false
  },

  birthday: {
    speechImportance: "low",
    musicImportance: "high",
    danceIntent: true,
    livePerformance: false,
    presentationNeed: false,
    videoNeed: false,
    lightingNeed: true,
    coveragePriority: "impact",
    mobilityNeed: false,
    autonomyRequired: true,
    professionalStaffing: false
  },

  private_party: {
    speechImportance: "low",
    musicImportance: "critical",
    danceIntent: true,
    livePerformance: false,
    presentationNeed: false,
    videoNeed: false,
    lightingNeed: true,
    coveragePriority: "impact",
    mobilityNeed: false,
    autonomyRequired: false,
    professionalStaffing: false
  },

  wedding: {
    speechImportance: "high",
    musicImportance: "critical",
    danceIntent: true,
    livePerformance: true,
    presentationNeed: false,
    videoNeed: true,
    lightingNeed: true,
    coveragePriority: "uniform",
    mobilityNeed: true,
    autonomyRequired: false,
    professionalStaffing: true
  },

  religious_service: {
    speechImportance: "critical",
    musicImportance: "high",
    danceIntent: false,
    livePerformance: true,
    presentationNeed: false,
    videoNeed: false,
    lightingNeed: false,
    coveragePriority: "clarity",
    mobilityNeed: true,
    autonomyRequired: true,
    professionalStaffing: false
  },

  showcase: {
    speechImportance: "medium",
    musicImportance: "critical",
    danceIntent: false,
    livePerformance: true,
    presentationNeed: false,
    videoNeed: true,
    lightingNeed: true,
    coveragePriority: "impact",
    mobilityNeed: false,
    autonomyRequired: false,
    professionalStaffing: true
  },

  dj_set: {
    speechImportance: "low",
    musicImportance: "critical",
    danceIntent: true,
    livePerformance: true,
    presentationNeed: false,
    videoNeed: false,
    lightingNeed: true,
    coveragePriority: "impact",
    mobilityNeed: false,
    autonomyRequired: false,
    professionalStaffing: true
  },

  screening: {
    speechImportance: "low",
    musicImportance: "medium",
    danceIntent: false,
    livePerformance: false,
    presentationNeed: false,
    videoNeed: true,
    lightingNeed: false,
    coveragePriority: "clarity",
    mobilityNeed: false,
    autonomyRequired: true,
    professionalStaffing: false
  },

  product_launch: {
    speechImportance: "high",
    musicImportance: "medium",
    danceIntent: false,
    livePerformance: false,
    presentationNeed: true,
    videoNeed: true,
    lightingNeed: true,
    coveragePriority: "impact",
    mobilityNeed: false,
    autonomyRequired: false,
    professionalStaffing: true
  },

  outdoor_event: {
    speechImportance: "medium",
    musicImportance: "high",
    danceIntent: true,
    livePerformance: true,
    presentationNeed: false,
    videoNeed: false,
    lightingNeed: true,
    coveragePriority: "uniform",
    mobilityNeed: true,
    autonomyRequired: false,
    professionalStaffing: true
  },

  other: {
    speechImportance: "medium",
    musicImportance: "medium",
    danceIntent: false,
    livePerformance: false,
    presentationNeed: false,
    videoNeed: false,
    lightingNeed: false,
    coveragePriority: "uniform",
    mobilityNeed: false,
    autonomyRequired: true,
    professionalStaffing: false
  },

  unknown: {
    speechImportance: "medium",
    musicImportance: "medium",
    danceIntent: false,
    livePerformance: false,
    presentationNeed: false,
    videoNeed: false,
    lightingNeed: false,
    coveragePriority: "clarity",
    mobilityNeed: false,
    autonomyRequired: true,
    professionalStaffing: false
  }
};

// ============================================================================
// RÈGLES DIMENSIONNEMENT PAR AUDIENCE
// ============================================================================

export const AUDIENCE_SCALING_RULES = {
  // Diffusion parole (intelligibilité prioritaire)
  speech: {
    small: { max: 50, speakers: 2, power: "medium" },
    medium: { max: 150, speakers: 4, power: "medium" },
    large: { max: 400, speakers: 6, power: "high" },
    xlarge: { max: 1000, speakers: 8, power: "high" }
  },

  // Diffusion musicale ambiance (confort d'écoute)
  music_ambient: {
    small: { max: 50, speakers: 2, power: "medium" },
    medium: { max: 120, speakers: 4, power: "medium" },
    large: { max: 300, speakers: 6, power: "high" },
    xlarge: { max: 800, speakers: 8, power: "high" }
  },

  // Diffusion danse (pression sonore élevée)
  music_dance: {
    small: { max: 30, speakers: 2, power: "high", subwoofer: true },
    medium: { max: 80, speakers: 4, power: "high", subwoofer: true },
    large: { max: 200, speakers: 6, power: "high", subwoofer: true },
    xlarge: { max: 500, speakers: 8, power: "high", subwoofer: true }
  },

  // Live performance (monitoring + façade)
  live_performance: {
    small: { max: 100, speakers: 4, power: "high", monitors: 2 },
    medium: { max: 250, speakers: 6, power: "high", monitors: 4 },
    large: { max: 600, speakers: 8, power: "high", monitors: 6 },
    xlarge: { max: 1500, speakers: 10, power: "high", monitors: 8 }
  }
} as const;

// ============================================================================
// RÈGLES ENVIRONNEMENTALES  
// ============================================================================

export const ENVIRONMENT_RULES: EnvironmentRule[] = [
  // Intérieur contrôlé
  {
    condition: { indoorOutdoor: "indoor", venueType: "conference_room" },
    adjustments: {
      powerRequirement: 1.0,
      weatherProofing: false,
      mobilityPriority: false,
      acousticChallenges: ["réverbération potentielle"]
    }
  },

  // Intérieur réverbérant
  {
    condition: { indoorOutdoor: "indoor", venueType: "church" },
    adjustments: {
      powerRequirement: 1.2,
      weatherProofing: false,
      mobilityPriority: true,
      acousticChallenges: ["forte réverbération", "directivité nécessaire"]
    }
  },

  // Appartement/maison
  {
    condition: { indoorOutdoor: "indoor", venueType: "apartment" },
    adjustments: {
      powerRequirement: 0.7,
      weatherProofing: false,
      mobilityPriority: false,
      acousticChallenges: ["limitations sonores", "voisinage"]
    }
  },

  // Extérieur couvert
  {
    condition: { indoorOutdoor: "outdoor", covered: true },
    adjustments: {
      powerRequirement: 1.3,
      weatherProofing: true,
      mobilityPriority: true,
      acousticChallenges: ["acoustique ouverte", "vents potentiels"]
    }
  },

  // Extérieur plein air
  {
    condition: { indoorOutdoor: "outdoor", covered: false },
    adjustments: {
      powerRequirement: 1.5,
      weatherProofing: true,
      mobilityPriority: true,
      acousticChallenges: ["dissipation acoustique", "intempéries", "alimentation électrique"]
    }
  },

  // Terrasse/rooftop
  {
    condition: { indoorOutdoor: "outdoor", venueType: "terrace" },
    adjustments: {
      powerRequirement: 1.4,
      weatherProofing: true,
      mobilityPriority: false,
      acousticChallenges: ["vents en altitude", "réflexions sur surfaces dures"]
    }
  }
];

// ============================================================================
// CATALOGUE ÉQUIPEMENTS VIRTUELS
// ============================================================================

export const EQUIPMENT_CATALOG: EquipmentSpec[] = [
  // Sound System
  {
    category: "sound_system",
    subcategory: "speakers_compact",
    name: "Enceintes compactes actives",
    description: "8-10 pouces, idéales parole et musique d'ambiance",
    powerRating: 200,
    coverage: { audienceMin: 10, audienceMax: 80, distanceMax: 15 },
    suitability: { indoor: true, outdoor: true, speech: true, music: true, dance: false },
    complexity: "simple",
    alternatives: ["Yamaha DBR10", "QSC CP8", "JBL EON610"]
  },

  {
    category: "sound_system", 
    subcategory: "speakers_medium",
    name: "Enceintes moyennes actives",
    description: "12-15 pouces, polyvalentes événementiel",
    powerRating: 400,
    coverage: { audienceMin: 50, audienceMax: 200, distanceMax: 25 },
    suitability: { indoor: true, outdoor: true, speech: true, music: true, dance: true },
    complexity: "moderate",
    alternatives: ["QSC K12.2", "RCF ART 712-A", "EV ZLX-12P"]
  },

  {
    category: "sound_system",
    subcategory: "speakers_large", 
    name: "Enceintes ligne/grande puissance",
    description: "Line array ou 15+ pouces, gros événements",
    powerRating: 800,
    coverage: { audienceMin: 150, audienceMax: 800, distanceMax: 50 },
    suitability: { indoor: true, outdoor: true, speech: true, music: true, dance: true },
    complexity: "professional",
    alternatives: ["L-Acoustics X8", "d&b Y7P", "Meyer UPM-1P"]
  },

  {
    category: "sound_system",
    subcategory: "subwoofer",
    name: "Caisson de graves",
    description: "Renfort basses fréquences pour musique dansante",
    powerRating: 500,
    coverage: { audienceMin: 30, audienceMax: 300, distanceMax: 30 },
    suitability: { indoor: true, outdoor: true, speech: false, music: true, dance: true },
    complexity: "moderate",
    alternatives: ["QSC KS112", "RCF SUB 8003-AS", "Yamaha DXS12"]
  },

  // Microphones
  {
    category: "microphones",
    subcategory: "handheld_wireless",
    name: "Micros main HF",
    description: "Sans fil UHF, discours et chant",
    coverage: { audienceMin: 1, audienceMax: 1000, distanceMax: 100 },
    suitability: { indoor: true, outdoor: true, speech: true, music: true, dance: false },
    complexity: "simple",
    alternatives: ["Shure SLXD24/SM58", "Sennheiser EW 135P G4", "Audio-Technica ATW-1102"]
  },

  {
    category: "microphones",
    subcategory: "headset_wireless",
    name: "Micros serre-tête HF",
    description: "Mains libres, idéal présentations",
    coverage: { audienceMin: 1, audienceMax: 500, distanceMax: 100 },
    suitability: { indoor: true, outdoor: true, speech: true, music: false, dance: false },
    complexity: "moderate",
    alternatives: ["Shure SLXD14/SM35", "Sennheiser EW 152P G4", "AKG DMS100"]
  },

  {
    category: "microphones",
    subcategory: "table_conference",
    name: "Micros de table/col de cygne",
    description: "Fixes, réunions et conférences",
    coverage: { audienceMin: 5, audienceMax: 200, distanceMax: 10 },
    suitability: { indoor: true, outdoor: false, speech: true, music: false, dance: false },
    complexity: "simple",
    alternatives: ["Shure MX418", "Audio-Technica AT8031", "Beyerdynamic TG D35c"]
  },

  // DJ Setup
  {
    category: "dj_setup",
    subcategory: "dj_controller",
    name: "Contrôleur DJ",
    description: "4 voies, jog wheels, effets intégrés",
    suitability: { indoor: true, outdoor: true, speech: false, music: true, dance: true },
    complexity: "moderate",
    alternatives: ["Pioneer DDJ-SB3", "Hercules DJControl", "Numark Party Mix"]
  },

  {
    category: "dj_setup",
    subcategory: "dj_professional",
    name: "Setup DJ professionnel",
    description: "CDJ + table de mixage séparée",
    suitability: { indoor: true, outdoor: true, speech: false, music: true, dance: true },
    complexity: "professional",
    alternatives: ["Pioneer CDJ-3000 + DJM-900", "Technics SL-1210 + Allen&Heath"]
  },

  {
    category: "dj_setup",
    subcategory: "dj_monitors",
    name: "Retours DJ",
    description: "Enceintes dédiées écoute DJ",
    suitability: { indoor: true, outdoor: true, speech: false, music: true, dance: true },
    complexity: "moderate",
    alternatives: ["Pioneer DM-50D", "Yamaha MSP5", "KRK Rokit RP5"]
  },

  // Lighting
  {
    category: "lighting",
    subcategory: "wash_rgb",
    name: "Projecteurs wash LED RGB",
    description: "Éclairage d'ambiance coloré",
    suitability: { indoor: true, outdoor: true, speech: false, music: true, dance: true },
    complexity: "simple",
    alternatives: ["Chauvet SlimPAR Pro", "ADJ Ultra Bar", "Showtec Spectral M800"]
  },

  {
    category: "lighting",
    subcategory: "moving_heads",
    name: "Lyres/têtes mobiles",
    description: "Effets dynamiques et gobos",
    suitability: { indoor: true, outdoor: false, speech: false, music: true, dance: true },
    complexity: "professional",
    alternatives: ["Chauvet Intimidator Spot", "ADJ Focus Spot", "Martin Rush MH1"]
  },

  // Video
  {
    category: "video",
    subcategory: "led_screen_indoor",
    name: "Écran LED intérieur",
    description: "Pitch fin, haute résolution",
    suitability: { indoor: true, outdoor: false, speech: true, music: false, dance: false },
    complexity: "professional",
    alternatives: ["Modulaire P3.91", "Écran fixe HD", "Videowall LED"]
  },

  {
    category: "video",
    subcategory: "projector",
    name: "Vidéoprojecteur",
    description: "Solution projection économique",
    suitability: { indoor: true, outdoor: false, speech: true, music: false, dance: false },
    complexity: "moderate",
    alternatives: ["Epson EB-2250U", "BenQ MX731", "Canon LX-MU500"]
  }
];

// ============================================================================
// LOGIQUE DE DIMENSIONNEMENT
// ============================================================================

export function getAudienceCategory(guestCount: number): keyof typeof AUDIENCE_SCALING_RULES.speech {
  if (guestCount <= 50) return "small";
  if (guestCount <= 150) return "medium";  
  if (guestCount <= 400) return "large";
  return "xlarge";
}

export function getDiffusionType(profile: EventProductionProfile): keyof typeof AUDIENCE_SCALING_RULES {
  if (profile.speechImportance === "critical" || profile.speechImportance === "high") {
    return "speech";
  }
  
  if (profile.danceIntent) {
    return "music_dance";
  }
  
  if (profile.livePerformance) {
    return "live_performance";
  }
  
  if (profile.musicImportance === "high" || profile.musicImportance === "critical") {
    return "music_ambient";
  }
  
  return "speech"; // Fallback sécurisé
}

export function calculateEquipmentScaling(
  guestCount: number,
  profile: EventProductionProfile,
  environmentMultiplier: number = 1.0
): {
  speakers: number;
  powerLevel: string;
  additionalEquipment: string[];
} {
  const audienceCategory = getAudienceCategory(guestCount);
  const diffusionType = getDiffusionType(profile);
  const rules = AUDIENCE_SCALING_RULES[diffusionType][audienceCategory];
  
  const speakers = Math.ceil(rules.speakers * environmentMultiplier);
  const additionalEquipment: string[] = [];
  
  if ("subwoofer" in rules && rules.subwoofer) additionalEquipment.push("subwoofer");
  if ("monitors" in rules && rules.monitors) additionalEquipment.push(`${rules.monitors} retours`);
  
  return {
    speakers,
    powerLevel: rules.power,
    additionalEquipment
  };
}

// ============================================================================
// EXPERTISE MÉTIER PAR CAS D'USAGE
// ============================================================================

export const EXPERT_INSIGHTS = {
  speech_clarity: [
    "Privilégier la directivité pour éviter le larsen",
    "Placement micros : distance 15-20cm de la bouche",
    "Éviter les fréquences 250-500Hz (feedback fréquent)"
  ],
  
  music_dance: [
    "Caisson indispensable > 80 personnes dansantes",
    "Placement façade : angle 45° vers l'audience",
    "Réserve de puissance : +50% pour les pointes"
  ],
  
  outdoor_challenges: [
    "Facteur 1.5x puissance pour compenser dissipation",
    "Protection IP65 minimum si exposition directe",
    "Prévoir ancrage/lestage pour sécurité"
  ],
  
  live_performance: [
    "Retours obligatoires même pour DJ (écoute)",
    "Séparation façade/retours pour éviter feedback",
    "Console dédiée si plus de 2 sources"
  ]
};

// ============================================================================
// MESSAGES D'EXPERTISE CONTEXTUELLE
// ============================================================================

export function getExpertInsights(profile: EventProductionProfile, venueContext: any): string[] {
  const insights: string[] = [];
  
  if (profile.speechImportance === "critical") {
    insights.push(...EXPERT_INSIGHTS.speech_clarity);
  }
  
  if (profile.danceIntent) {
    insights.push(...EXPERT_INSIGHTS.music_dance);
  }
  
  if (venueContext.spaceType === "outdoor") {
    insights.push(...EXPERT_INSIGHTS.outdoor_challenges);
  }
  
  if (profile.livePerformance || profile.professionalStaffing) {
    insights.push(...EXPERT_INSIGHTS.live_performance);
  }
  
  return insights;
}