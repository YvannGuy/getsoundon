/**
 * Moteur de recommandation V2 - Production événementielle crédible
 */

import { EventType, ServiceNeed, IndoorOutdoor, VenueType } from "./types";
import { 
  RecommendationInput,
  SetupRecommendationV2,
  EventProductionProfile,
  VenueContext,
  EquipmentLineItem,
  EquipmentCategory,
  ServiceLineItem,
  RecommendationEngineV2,
  ConversationalContext,
  RecommendationValidation
} from "./production-types";
import { 
  EVENT_PRODUCTION_PROFILES,
  ENVIRONMENT_RULES,
  EQUIPMENT_CATALOG,
  calculateEquipmentScaling,
  getExpertInsights,
  getDiffusionType,
  getAudienceCategory
} from "./event-production-rules";
import { ExplicitEquipmentRequest } from "./nlp-types";

/** Sections tableau d'équipement dans SetupRecommendationV2 → catégorie catalogue */
const RECOMMENDATION_SECTION_TO_EQUIPMENT = {
  soundSystem: "sound_system",
  microphones: "microphones",
  djSetup: "dj_setup",
  lighting: "lighting",
  video: "video",
  infrastructure: "infrastructure",
  accessories: "accessories",
} as const satisfies Record<string, EquipmentCategory>;

type RecommendationEquipmentSection = keyof typeof RECOMMENDATION_SECTION_TO_EQUIPMENT;

type MusicImportanceLevel = EventProductionProfile["musicImportance"];

const MUSIC_IMPORTANCE_RANK: Record<MusicImportanceLevel, number> = {
  none: 0,
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

function bumpMusicImportance(
  current: MusicImportanceLevel | undefined,
  minimum: MusicImportanceLevel
): MusicImportanceLevel {
  const curKey: MusicImportanceLevel =
    current != null && MUSIC_IMPORTANCE_RANK[current] !== undefined ? current : "none";
  const a = MUSIC_IMPORTANCE_RANK[curKey];
  const b = MUSIC_IMPORTANCE_RANK[minimum];
  return a >= b ? curKey : minimum;
}

// ============================================================================
// MOTEUR PRINCIPAL V2
// ============================================================================

export class RecommendationEngineV2Impl implements RecommendationEngineV2 {
  
  generateRecommendations(
    input: RecommendationInput, 
    context?: ConversationalContext
  ): SetupRecommendationV2[] {
    // 1. Analyser le brief pour créer le profil de production
    const productionProfile = this.analyzeProductionNeeds(input);
    
    // 2. Analyser l'environnement et contraintes
    const venueContext = this.analyzeVenueContext(input);
    
    // 3. Générer les 3 niveaux de recommandation
    const recommendations: SetupRecommendationV2[] = [];
    
    for (const tier of ["essential", "standard", "premium"] as const) {
      const recommendation = this.generateSingleRecommendation(
        tier,
        input,
        productionProfile,
        venueContext,
        context
      );
      
      recommendations.push(recommendation);
    }
    
    return recommendations;
  }
  
  // ============================================================================
  // ANALYSE DU BRIEF
  // ============================================================================
  
  private analyzeProductionNeeds(input: RecommendationInput): EventProductionProfile {
    // Commencer par le profil type de l'événement
    let profile = input.eventType 
      ? { ...EVENT_PRODUCTION_PROFILES[input.eventType] }
      : { ...EVENT_PRODUCTION_PROFILES.unknown };
    
    // Ajuster selon les besoins explicites
    if (input.serviceNeeds) {
      this.adjustProfileFromServiceNeeds(profile, input.serviceNeeds);
    }

    // Soirée « simple » sans DJ/lumière : ne pas imposer le profil « fête » par défaut
    if (
      input.eventType === "private_party" &&
      input.simplicityPreference === "simple" &&
      input.serviceNeeds?.length &&
      !input.serviceNeeds.includes("dj") &&
      !input.serviceNeeds.includes("lighting")
    ) {
      profile.danceIntent = false;
      profile.lightingNeed = false;
      profile.musicImportance = bumpMusicImportance(profile.musicImportance, "low");
    }
    
    // Ajuster selon les intentions spécifiques
    if (input.speechExpected !== undefined) {
      profile.speechImportance = input.speechExpected ? "high" : "low";
    }
    
    if (input.dancingExpected !== undefined) {
      profile.danceIntent = input.dancingExpected;
      if (input.dancingExpected) {
        profile.musicImportance = "critical";
        profile.lightingNeed = true;
      }
    }
    
    if (input.livePerformance !== undefined) {
      profile.livePerformance = input.livePerformance;
      if (input.livePerformance) {
        profile.professionalStaffing = true;
      }
    }

    if (input.presentationNeed !== undefined) {
      profile.presentationNeed = input.presentationNeed;
    }
    
    // Ajuster selon contraintes opérationnelles
    if (input.technicianNeeded === false) {
      profile.autonomyRequired = true;
      profile.professionalStaffing = false;
    }
    
    if (input.simplicityPreference === "simple") {
      profile.autonomyRequired = true;
    }
    
    return profile;
  }
  
  private adjustProfileFromServiceNeeds(profile: EventProductionProfile, serviceNeeds: ServiceNeed[]): void {
    const needs = new Set(serviceNeeds);
    
    if (needs.has("microphones")) {
      profile.speechImportance = "high";
    }
    
    if (needs.has("dj")) {
      profile.musicImportance = "critical";
      profile.danceIntent = true;
    }
    
    if (needs.has("lighting")) {
      profile.lightingNeed = true;
    }
    
    if (needs.has("led_screen") || needs.has("video")) {
      profile.videoNeed = true;
      profile.presentationNeed = true;
    }
    
    if (needs.has("sound")) {
      profile.musicImportance = bumpMusicImportance(profile.musicImportance, "medium");
    }
  }
  
  private analyzeVenueContext(input: RecommendationInput): VenueContext {
    return {
      spaceType: input.indoorOutdoor || "unknown",
      venueCategory: input.venueType || "unknown",
      isCovered: input.isCovered ?? true,
      acousticEnvironment: this.determineAcousticEnvironment(input),
      powerAvailable: input.electricityAvailable ?? true,
      accessConstraints: input.accessConstraints || "moderate",
      noiseRestrictions: input.noiseRestrictions ?? false,
      weatherExposure: input.indoorOutdoor === "outdoor" && !input.isCovered
    };
  }
  
  private determineAcousticEnvironment(input: RecommendationInput): "controlled" | "reverberant" | "open" | "challenging" {
    if (input.indoorOutdoor === "outdoor") return "open";
    
    if (input.venueType === "church" || input.venueType === "event_hall") {
      return "reverberant";
    }
    
    if (input.venueType === "conference_room" || input.venueType === "hotel") {
      return "controlled";
    }
    
    if (input.venueType === "apartment" || input.venueType === "private_home") {
      return "challenging"; // Contraintes voisinage
    }
    
    return "controlled";
  }
  
  // ============================================================================
  // GÉNÉRATION RECOMMANDATION UNIQUE
  // ============================================================================
  
  private generateSingleRecommendation(
    tier: "essential" | "standard" | "premium",
    input: RecommendationInput,
    profile: EventProductionProfile,
    venueContext: VenueContext,
    context?: ConversationalContext
  ): SetupRecommendationV2 {
    
    const guestCount = input.guestCount || 50;
    const assumptions = this.generateAssumptions(input, profile, venueContext);
    
    // Calculer les besoins équipement selon l'audience et profil
    const environmentMultiplier = this.calculateEnvironmentMultiplier(venueContext);
    const tierMultiplier = this.getTierMultiplier(tier);
    const scaling = calculateEquipmentScaling(guestCount, profile, environmentMultiplier * tierMultiplier);
    
    // Générer équipement par catégories
    const soundSystem = this.generateSoundSystemRecommendation(scaling, profile, tier, guestCount);
    const microphones = this.generateMicrophonesRecommendation(profile, tier, guestCount);
    const djSetup = this.generateDJRecommendation(profile, tier);
    const lighting = this.generateLightingRecommendation(profile, tier, guestCount);
    const video = this.generateVideoRecommendation(profile, tier, guestCount);
    const infrastructure = this.generateInfrastructureRecommendation(profile, venueContext, tier);
    const accessories = this.generateAccessoriesRecommendation(tier);
    
    const services = this.generateServicesRecommendation(input, profile, tier);

    // adaptToExplicitRequests attend un SetupRecommendationV2 complet (copie superficielle + mutation des blocs matériel)
    const stubForExplicit: SetupRecommendationV2 = {
      tier,
      productionProfile: profile,
      venueContext,
      assumptions,
      soundSystem,
      microphones,
      djSetup,
      lighting,
      video,
      infrastructure,
      accessories,
      services,
      rationale: [],
      warnings: [],
      considerations: [],
      complexity: "simple",
      setupTime: "",
      staffingRequired: 0,
      explicitRequestsHandled: [],
    };

    const afterExplicit = this.adaptToExplicitRequests(
      stubForExplicit,
      input.explicitEquipmentRequests || []
    );
    const explicitRequestsHandled = afterExplicit.explicitRequestsHandled;

    const rationale = this.generateRationale(profile, venueContext, tier, scaling);
    const warnings = this.generateWarnings(profile, venueContext, assumptions);
    const considerations = this.generateConsiderations(input, profile, venueContext);

    const complexity = this.calculateComplexity(profile, [
      ...afterExplicit.soundSystem,
      ...afterExplicit.microphones,
      ...afterExplicit.djSetup,
      ...afterExplicit.lighting,
      ...afterExplicit.video,
    ]);

    const setupTime = this.estimateSetupTime(complexity, afterExplicit.services.length);
    const staffingRequired = this.calculateStaffingRequired(
      profile,
      tier,
      afterExplicit.services
    );

    return {
      tier,
      productionProfile: profile,
      venueContext,
      assumptions,

      soundSystem: afterExplicit.soundSystem,
      microphones: afterExplicit.microphones,
      djSetup: afterExplicit.djSetup,
      lighting: afterExplicit.lighting,
      video: afterExplicit.video,
      infrastructure: afterExplicit.infrastructure,
      accessories: afterExplicit.accessories,

      services: afterExplicit.services,

      rationale,
      warnings,
      considerations,

      complexity,
      setupTime,
      staffingRequired,
      explicitRequestsHandled,
    };
  }
  
  // ============================================================================
  // GÉNÉRATION ÉQUIPEMENTS PAR CATÉGORIE
  // ============================================================================
  
  private generateSoundSystemRecommendation(
    scaling: ReturnType<typeof calculateEquipmentScaling>,
    profile: EventProductionProfile,
    tier: string,
    guestCount: number
  ): EquipmentLineItem[] {
    const items: EquipmentLineItem[] = [];
    
    // Enceintes principales
    const speakerCategory = guestCount <= 80 ? "speakers_compact" : 
                          guestCount <= 250 ? "speakers_medium" : "speakers_large";
    
    const speakerSpec = EQUIPMENT_CATALOG.find(eq => eq.subcategory === speakerCategory);
    
    items.push({
      category: "sound_system",
      subcategory: speakerCategory,
      quantity: scaling.speakers,
      label: `${scaling.speakers} ${speakerSpec?.name || "enceintes actives"}`,
      description: speakerSpec?.description || "Diffusion principale",
      priority: "essential",
      reasoning: `Dimensionnement pour ${guestCount} personnes avec priorité ${profile.coveragePriority}`,
      alternativeOptions: speakerSpec?.alternatives || []
    });
    
    // Console de mixage
    const mixerComplexity = (profile.speechImportance === "critical" || profile.livePerformance) 
      ? "professionnelle" : "standard";
    
    items.push({
      category: "sound_system",
      subcategory: "mixer",
      quantity: 1,
      label: `Console de mixage ${mixerComplexity}`,
      description: "Gestion des sources audio et réglages",
      priority: "essential",
      reasoning: profile.livePerformance 
        ? "Console séparée nécessaire pour live performance"
        : "Gestion basique des entrées micros et musique",
      alternativeOptions: profile.livePerformance 
        ? ["Allen & Heath QU-16", "Yamaha MG16XU", "Behringer X32 Compact"]
        : ["Yamaha MG12XU", "Mackie ProFX12v3", "Behringer QX1204USB"]
    });
    
    // Caisson si nécessaire
    if (scaling.additionalEquipment.includes("subwoofer") && tier !== "essential") {
      items.push({
        category: "sound_system",
        subcategory: "subwoofer",
        quantity: profile.danceIntent ? 2 : 1,
        label: `${profile.danceIntent ? 2 : 1} caisson(s) de graves`,
        description: "Renfort basses fréquences pour musique dansante",
        priority: profile.danceIntent ? "essential" : "recommended",
        reasoning: "Indispensable pour rendu musical complet avec danse",
        alternativeOptions: ["QSC KS112", "RCF SUB 8003-AS", "Yamaha DXS12"]
      });
    }
    
    return items;
  }
  
  private generateMicrophonesRecommendation(
    profile: EventProductionProfile, 
    tier: string,
    guestCount: number
  ): EquipmentLineItem[] {
    if (profile.speechImportance === "none" || profile.speechImportance === "low") {
      return [];
    }
    
    const items: EquipmentLineItem[] = [];
    
    // Nombre de micros selon taille et usage
    const micCount = profile.speechImportance === "critical" ? 
      (guestCount > 200 ? 4 : 3) : 
      (guestCount > 100 ? 3 : 2);
    
    // Type de micros selon usage
    if (profile.presentationNeed) {
      items.push({
        category: "microphones",
        subcategory: "headset_wireless",
        quantity: 1,
        label: "1 micro serre-tête HF",
        description: "Mains libres pour présentations",
        priority: "recommended",
        reasoning: "Idéal pour présentations avec support visuel",
        alternativeOptions: ["Shure SLXD14/SM35", "Sennheiser EW 152P G4"]
      });
      
      items.push({
        category: "microphones",
        subcategory: "handheld_wireless",
        quantity: micCount - 1,
        label: `${micCount - 1} micro(s) main HF`,
        description: "Q&A et interventions multiples",
        priority: "essential",
        reasoning: "Flexibilité pour Q&A et interventions spontanées",
        alternativeOptions: ["Shure SLXD24/SM58", "Sennheiser EW 135P G4"]
      });
    } else {
      items.push({
        category: "microphones",
        subcategory: "handheld_wireless",
        quantity: micCount,
        label: `${micCount} micros main HF`,
        description: "Prises de parole et discours",
        priority: "essential",
        reasoning: profile.speechImportance === "critical" 
          ? "Intelligibilité critique, prévoir réserve"
          : "Couverture standard des interventions",
        alternativeOptions: ["Shure SLXD24/SM58", "Sennheiser EW 135P G4", "Audio-Technica ATW-1102"]
      });
    }
    
    // Micros de table si conférence statique
    if (profile.presentationNeed && guestCount <= 100 && tier !== "essential") {
      items.push({
        category: "microphones",
        subcategory: "table_conference",
        quantity: 2,
        label: "2 micros de table",
        description: "Positions fixes pour modérateurs",
        priority: "optional",
        reasoning: "Confort pour positions fixes de modération",
        alternativeOptions: ["Shure MX418", "Audio-Technica AT8031"]
      });
    }
    
    return items;
  }
  
  private generateDJRecommendation(profile: EventProductionProfile, tier: string): EquipmentLineItem[] {
    if (profile.musicImportance === "none" || !profile.danceIntent) {
      return [];
    }
    
    const items: EquipmentLineItem[] = [];
    
    // Setup DJ selon niveau
    if (tier === "premium" && profile.professionalStaffing) {
      items.push({
        category: "dj_setup",
        subcategory: "dj_professional",
        quantity: 1,
        label: "Setup DJ professionnel",
        description: "CDJ + table de mixage séparée",
        priority: "recommended",
        reasoning: "Qualité professionnelle pour événement premium",
        alternativeOptions: ["Pioneer CDJ-3000 + DJM-900", "Technics + Allen&Heath"]
      });
    } else {
      items.push({
        category: "dj_setup",
        subcategory: "dj_controller",
        quantity: 1,
        label: "Contrôleur DJ tout-en-un",
        description: "Solution complète avec jog wheels",
        priority: "essential",
        reasoning: "Solution polyvalente et facile d'usage",
        alternativeOptions: ["Pioneer DDJ-SB3", "Hercules DJControl Inpulse 500", "Numark Party Mix"]
      });
    }
    
    // Retours DJ si professionnel
    if (profile.professionalStaffing || tier === "premium") {
      items.push({
        category: "dj_setup",
        subcategory: "dj_monitors",
        quantity: 2,
        label: "2 retours/monitors DJ",
        description: "Écoute dédiée pour le DJ",
        priority: tier === "premium" ? "essential" : "recommended",
        reasoning: "Indispensable pour mixage de qualité",
        alternativeOptions: ["Pioneer DM-50D", "Yamaha MSP5", "KRK Rokit RP5"]
      });
    }
    
    return items;
  }
  
  private generateLightingRecommendation(
    profile: EventProductionProfile, 
    tier: string,
    guestCount: number
  ): EquipmentLineItem[] {
    if (!profile.lightingNeed) return [];
    
    const items: EquipmentLineItem[] = [];
    
    // Éclairage d'ambiance
    const washCount = guestCount <= 100 ? 4 : guestCount <= 250 ? 6 : 8;
    
    items.push({
      category: "lighting",
      subcategory: "wash_rgb",
      quantity: washCount,
      label: `${washCount} projecteurs wash LED RGB`,
      description: "Éclairage d'ambiance coloré",
      priority: "essential",
      reasoning: "Ambiance colorée adaptée à la surface",
      alternativeOptions: ["Chauvet SlimPAR Pro", "ADJ Ultra Bar", "Showtec Spectral"]
    });
    
    // Effets dynamiques si danse ou show
    if ((profile.danceIntent || profile.livePerformance) && tier !== "essential") {
      const movingCount = Math.min(4, Math.floor(washCount / 2));
      
      items.push({
        category: "lighting",
        subcategory: "moving_heads",
        quantity: movingCount,
        label: `${movingCount} lyres/têtes mobiles`,
        description: "Effets dynamiques et gobos",
        priority: tier === "premium" ? "recommended" : "optional",
        reasoning: "Dynamisme et effets pour danse",
        alternativeOptions: ["Chauvet Intimidator Spot", "ADJ Focus Spot", "Martin Rush MH1"]
      });
    }
    
    return items;
  }
  
  private generateVideoRecommendation(
    profile: EventProductionProfile, 
    tier: string,
    guestCount: number
  ): EquipmentLineItem[] {
    if (!profile.videoNeed) return [];
    
    const items: EquipmentLineItem[] = [];
    
    // Choix écran LED vs projecteur selon taille et budget
    if (guestCount > 150 || tier === "premium") {
      const screenSize = guestCount <= 200 ? "3m²" : guestCount <= 400 ? "6m²" : "9m²";
      
      items.push({
        category: "video",
        subcategory: "led_screen_indoor",
        quantity: 1,
        label: `Écran LED ${screenSize}`,
        description: "Affichage haute définition",
        priority: "recommended",
        reasoning: `Visibilité optimale pour ${guestCount} personnes`,
        alternativeOptions: ["Modulaire P3.91", "Écran fixe HD", "Videowall LED"]
      });
    } else {
      items.push({
        category: "video",
        subcategory: "projector",
        quantity: 1,
        label: "Vidéoprojecteur HD",
        description: "Solution projection économique",
        priority: "essential",
        reasoning: "Solution efficace pour audience modérée",
        alternativeOptions: ["Epson EB-2250U", "BenQ MX731", "Canon LX-MU500"]
      });
      
      // Écran de projection
      items.push({
        category: "video",
        subcategory: "projection_screen",
        quantity: 1,
        label: "Écran de projection",
        description: "Toile ou structure dédiée",
        priority: "essential",
        reasoning: "Support nécessaire pour projection",
        alternativeOptions: ["Écran trépied 4:3", "Écran fixe 16:9", "Structure gonflable"]
      });
    }
    
    return items;
  }
  
  private generateInfrastructureRecommendation(
    profile: EventProductionProfile, 
    venueContext: VenueContext,
    tier: string
  ): EquipmentLineItem[] {
    const items: EquipmentLineItem[] = [];
    
    // Supports et structures
    items.push({
      category: "infrastructure",
      subcategory: "speaker_stands",
      quantity: 2,
      label: "Pieds d'enceintes",
      description: "Supports ajustables avec sécurité",
      priority: "essential",
      reasoning: "Positionnement optimal et sécurité",
      alternativeOptions: ["K&M 21300", "On-Stage SS7747B", "Ultimate TS-100B"]
    });
    
    if (profile.lightingNeed) {
      items.push({
        category: "infrastructure",
        subcategory: "lighting_truss",
        quantity: 1,
        label: "Structure éclairage",
        description: "Portique ou pieds pour projecteurs",
        priority: "recommended",
        reasoning: "Positionnement sécurisé des projecteurs",
        alternativeOptions: ["Portique alu léger", "Pieds éclairage", "Structure T-bar"]
      });
    }
    
    // Alimentation si extérieur
    if (venueContext.spaceType === "outdoor" || !venueContext.powerAvailable) {
      items.push({
        category: "infrastructure",
        subcategory: "power_distribution",
        quantity: 1,
        label: "Distribution électrique",
        description: "Multiprises et protection IP",
        priority: "essential",
        reasoning: "Sécurité électrique et distribution",
        alternativeOptions: ["Coffret étanche IP44", "Multiprises rackables", "Boîtiers de scène"]
      });
    }
    
    return items;
  }
  
  private generateAccessoriesRecommendation(tier: string): EquipmentLineItem[] {
    const items: EquipmentLineItem[] = [];
    
    // Câblage basique
    items.push({
      category: "accessories",
      subcategory: "cables_audio",
      quantity: 1,
      label: "Jeu de câbles audio",
      description: "XLR, Jack, RCA selon besoins",
      priority: "essential",
      reasoning: "Connectique indispensable",
      alternativeOptions: ["Kit complet", "Câbles unitaires", "Multipaires"]
    });
    
    if (tier !== "essential") {
      items.push({
        category: "accessories",
        subcategory: "di_boxes",
        quantity: 2,
        label: "2 boîtiers DI",
        description: "Adaptation impedance instruments",
        priority: "recommended",
        reasoning: "Qualité signal instruments et ligne",
        alternativeOptions: ["Radial ProDI", "Behringer DI100", "Palmer PAN01"]
      });
    }
    
    return items;
  }
  
  // ============================================================================
  // SERVICES
  // ============================================================================
  
  private generateServicesRecommendation(
    input: RecommendationInput,
    profile: EventProductionProfile,
    tier: string
  ): ServiceLineItem[] {
    const services: ServiceLineItem[] = [];
    
    // Livraison
    if (input.deliveryNeeded !== false) {
      services.push({
        service: "delivery",
        description: "Transport et manutention du matériel",
        reasoning: "Logistique nécessaire pour événement équipé",
        priority: "required",
        duration: "J-1 ou matin même"
      });
    }
    
    // Installation
    if (input.installationNeeded !== false || profile.professionalStaffing) {
      services.push({
        service: "installation",
        description: "Montage, câblage et tests du système",
        reasoning: profile.professionalStaffing 
          ? "Setup professionnel pour qualité optimale"
          : "Gain de temps et sécurité d'installation",
        priority: profile.professionalStaffing ? "required" : "recommended",
        duration: "1-3h selon complexité"
      });
    }
    
    // Technicien
    if (input.technicianNeeded || 
        (profile.professionalStaffing && tier === "premium") ||
        profile.livePerformance) {
      services.push({
        service: "technician",
        description: "Régisseur son pendant l'événement",
        reasoning: profile.livePerformance 
          ? "Indispensable pour gestion live en temps réel"
          : "Sérénité et réactivité pendant l'événement",
        priority: profile.livePerformance ? "required" : "recommended",
        duration: "Durée complète événement"
      });
    }
    
    return services;
  }
  
  // ============================================================================
  // ADAPTATION AUX DEMANDES EXPLICITES
  // ============================================================================
  
  adaptToExplicitRequests(
    baseRecommendation: SetupRecommendationV2,
    requests: ExplicitEquipmentRequest[]
  ): SetupRecommendationV2 {
    const adapted = { ...baseRecommendation };
    const handledRequests: string[] = [];
    
    for (const request of requests) {
      const handled = this.handleExplicitRequest(adapted, request);
      if (handled) {
        handledRequests.push(this.formatExplicitRequest(request));
      }
    }
    
    adapted.explicitRequestsHandled = handledRequests;
    
    return adapted;
  }
  
  private handleExplicitRequest(
    recommendation: SetupRecommendationV2,
    request: ExplicitEquipmentRequest
  ): boolean {
    // Mapper catégorie équipement → section recommandation
    const sectionMap: Record<string, RecommendationEquipmentSection> = {
      speakers: "soundSystem",
      microphones: "microphones",
      mixing: "soundSystem",
      lighting: "lighting",
      screens: "video",
      dj_equipment: "djSetup",
      video: "video",
    };

    const section = sectionMap[request.category];
    if (!section) return false;
    
    const equipmentSection = recommendation[section] as EquipmentLineItem[];
    const sub = request.subcategory;
    
    // Adapter quantité si spécifiée
    if (request.quantity && request.quantity.kind === "exact") {
      const relevantItem = (sub
        ? equipmentSection.find(
            item =>
              item.subcategory === sub ||
              item.subcategory.includes(sub)
          )
        : undefined) ??
        equipmentSection.find(
          item =>
            sub != null && item.subcategory.includes(sub)
        );

      if (relevantItem) {
        relevantItem.quantity = request.quantity.value;
        relevantItem.reasoning = `Quantité ajustée selon demande explicite (${request.quantity.value})`;
        return true;
      }
    }
    
    // Ajouter équipement si pas présent
    if (request.subcategory || request.brand) {
      const newItem: EquipmentLineItem = {
        category: RECOMMENDATION_SECTION_TO_EQUIPMENT[section],
        subcategory: request.subcategory || request.category,
        quantity: request.quantity?.kind === "exact" ? request.quantity.value : 1,
        label: this.formatEquipmentLabel(request),
        description: `Équipement spécifiquement demandé`,
        priority: "essential",
        reasoning: "Demande explicite utilisateur",
        alternativeOptions: []
      };
      
      equipmentSection.push(newItem);
      return true;
    }
    
    return false;
  }
  
  private formatExplicitRequest(request: ExplicitEquipmentRequest): string {
    const parts = [];
    
    if (request.quantity?.kind === "exact") {
      parts.push(request.quantity.value.toString());
    }
    
    if (request.brand) parts.push(request.brand);
    if (request.subcategory) parts.push(request.subcategory);
    else parts.push(request.category);
    
    if (request.model) parts.push(request.model);
    
    return parts.join(' ');
  }
  
  private formatEquipmentLabel(request: ExplicitEquipmentRequest): string {
    return this.formatExplicitRequest(request);
  }
  
  // ============================================================================
  // HELPERS ET CALCULS
  // ============================================================================
  
  private calculateEnvironmentMultiplier(venueContext: VenueContext): number {
    let multiplier = 1.0;
    
    if (venueContext.spaceType === "outdoor") {
      multiplier *= venueContext.isCovered ? 1.3 : 1.5;
    }
    
    if (venueContext.acousticEnvironment === "reverberant") {
      multiplier *= 1.2;
    }
    
    if (venueContext.noiseRestrictions) {
      multiplier *= 0.8; // Moins de puissance mais plus de directivité
    }
    
    return multiplier;
  }
  
  private getTierMultiplier(tier: string): number {
    switch (tier) {
      case "essential": return 1.0;
      case "standard": return 1.2;
      case "premium": return 1.5;
      default: return 1.0;
    }
  }
  
  private generateAssumptions(
    input: RecommendationInput,
    profile: EventProductionProfile,
    venueContext: VenueContext
  ): string[] {
    const assumptions: string[] = [];
    
    if (!input.guestCount) {
      assumptions.push("Estimation 50 personnes par défaut");
    }
    
    if (!input.indoorOutdoor) {
      assumptions.push("Événement supposé en intérieur");
    }
    
    if (venueContext.powerAvailable === undefined) {
      assumptions.push("Alimentation électrique standard disponible");
    }
    
    if (profile.speechImportance === "high" && !input.speechExpected) {
      assumptions.push("Prises de parole prévues selon type d'événement");
    }
    
    if (profile.danceIntent && !input.dancingExpected) {
      assumptions.push("Moments dansants probables selon contexte");
    }
    
    return assumptions;
  }
  
  private generateRationale(
    profile: EventProductionProfile,
    venueContext: VenueContext,
    tier: string,
    scaling: ReturnType<typeof calculateEquipmentScaling>
  ): string[] {
    const rationale: string[] = [];
    
    // Justification dimensionnement
    const diffusionType = getDiffusionType(profile);
    rationale.push(`Dimensionnement pour diffusion ${diffusionType} avec ${scaling.speakers} enceintes`);
    
    // Justification tier
    if (tier === "essential") {
      rationale.push("Configuration minimale fonctionnelle");
    } else if (tier === "standard") {
      rationale.push("Équilibre qualité/simplicité avec marge de sécurité");
    } else {
      rationale.push("Configuration premium avec réserve de puissance et options");
    }
    
    // Justification environnement
    if (venueContext.spaceType === "outdoor") {
      rationale.push("Adaptation extérieur avec sur-dimensionnement acoustique");
    }
    
    if (profile.professionalStaffing) {
      rationale.push("Niveau professionnel avec technicien recommandé");
    }

    if (profile.autonomyRequired) {
      rationale.push("Scénario autonome : privilégier une mise en service simple");
    }
    
    return rationale;
  }
  
  private generateWarnings(
    profile: EventProductionProfile,
    venueContext: VenueContext,
    assumptions: string[]
  ): string[] {
    const warnings: string[] = [];
    
    if (venueContext.weatherExposure) {
      warnings.push("⚠️ Exposition météo : matériel IP65 requis");
    }
    
    if (venueContext.acousticEnvironment === "reverberant") {
      warnings.push("⚠️ Acoustique difficile : attention au placement et directivité");
    }
    
    if (profile.autonomyRequired && profile.speechImportance === "critical") {
      warnings.push("⚠️ Usage critique sans technicien : prévoir formation rapide");
    }
    
    if (!venueContext.powerAvailable) {
      warnings.push("⚠️ Groupe électrogène ou alimentation autonome nécessaire");
    }
    
    if (assumptions.length > 2) {
      warnings.push("⚠️ Nombreuses hypothèses : validation terrain recommandée");
    }
    
    return warnings;
  }
  
  private generateConsiderations(
    input: RecommendationInput,
    profile: EventProductionProfile,
    venueContext: VenueContext
  ): string[] {
    return getExpertInsights(profile, venueContext);
  }
  
  private calculateComplexity(
    profile: EventProductionProfile,
    allEquipment: EquipmentLineItem[]
  ): "simple" | "moderate" | "complex" {
    const equipmentCount = allEquipment.length;
    const hasVideo = allEquipment.some(eq => eq.category === "video");
    const hasLighting = allEquipment.some(eq => eq.category === "lighting");
    const hasLive = profile.livePerformance;
    
    if (equipmentCount <= 5 && !hasVideo && !hasLighting) return "simple";
    if (equipmentCount <= 10 && (!hasLive || !hasVideo)) return "moderate";
    return "complex";
  }
  
  private estimateSetupTime(complexity: string, serviceCount: number): string {
    const baseTime = complexity === "simple" ? 60 : complexity === "moderate" ? 120 : 180;
    const serviceTime = serviceCount * 30;
    const totalMinutes = baseTime + serviceTime;
    
    if (totalMinutes < 90) return "1h-1h30";
    if (totalMinutes < 150) return "2h-2h30"; 
    return "3h-4h";
  }
  
  private calculateStaffingRequired(
    profile: EventProductionProfile,
    tier: string,
    services: ServiceLineItem[]
  ): number {
    let staff = 1; // Minimum pour installation
    
    if (profile.livePerformance) staff += 1;
    if (profile.professionalStaffing) staff += 1;
    if (tier === "premium") staff += 1;
    if (services.some(s => s.service === "technician")) staff += 1;
    
    return Math.min(staff, 3); // Cap à 3 personnes
  }
  
  // ============================================================================
  // VALIDATION
  // ============================================================================
  
  validateRecommendation(recommendation: SetupRecommendationV2): RecommendationValidation {
    const issues: string[] = [];
    const improvements: string[] = [];
    
    // Vérifier cohérence équipement
    const hasSound = recommendation.soundSystem.length > 0;
    const hasMics = recommendation.microphones.length > 0;
    const speechCritical = recommendation.productionProfile.speechImportance === "critical";
    
    if (speechCritical && !hasMics) {
      issues.push("Parole critique mais pas de micros");
    }
    
    if (!hasSound) {
      issues.push("Aucun système de diffusion");
    }
    
    // Score qualité
    const credibilityScore = Math.max(0, 1 - (issues.length * 0.3));
    const completenessScore = hasSound && (hasMics || !speechCritical) ? 1 : 0.5;
    const practicalityScore = recommendation.complexity === "simple" ? 1 : 
                             recommendation.complexity === "moderate" ? 0.8 : 0.6;
    
    return {
      isRealistic: credibilityScore > 0.7,
      isPractical: practicalityScore > 0.6,
      isComplete: completenessScore > 0.8,
      quality: {
        credibilityScore,
        completenessScore,
        practicalityScore,
        missingElements: issues,
        overEngineeredElements: [],
        inconsistencies: [],
        improvements
      },
      feedback: issues
    };
  }
  
  explainRecommendation(recommendation: SetupRecommendationV2): string[] {
    const explanations: string[] = [];
    
    explanations.push(`Setup ${recommendation.tier} pour événement ${recommendation.productionProfile.coveragePriority}`);
    
    if (recommendation.soundSystem.length > 0) {
      const speakers = recommendation.soundSystem.find(item => item.subcategory.includes('speakers'));
      if (speakers) {
        explanations.push(`${speakers.quantity} enceintes pour la diffusion principale`);
      }
    }
    
    if (recommendation.microphones.length > 0) {
      const totalMics = recommendation.microphones.reduce((sum, item) => sum + item.quantity, 0);
      explanations.push(`${totalMics} micros pour les prises de parole`);
    }
    
    explanations.push(`Complexité ${recommendation.complexity}, installation ${recommendation.setupTime}`);
    
    return explanations;
  }
}

// ============================================================================
// FACTORY ET API
// ============================================================================

export function createRecommendationEngineV2(): RecommendationEngineV2 {
  return new RecommendationEngineV2Impl();
}

// Instance par défaut
export const defaultRecommendationEngineV2 = new RecommendationEngineV2Impl();