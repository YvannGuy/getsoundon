/**
 * Moteur de matching prestataires V2 - Hard filtering + scoring explicable
 */

import { 
  ProviderV2, 
  MatchingInputV2, 
  MatchingResultsV2, 
  MatchResult,
  FilterResult, 
  ScoringBreakdownV2, 
  DimensionScore,
  HardFilterReason,
  MatchingEngineV2,
  MatchingConfigV2,
  ScoringDimension
} from "./matching-types-v2";
import { 
  DEFAULT_MATCHING_CONFIG,
  EVENT_SPECIALIZATION_REQUIREMENTS,
  calculateZoneCompatibility,
  validateOperationalConstraints,
  calculateSpecializationBonus,
  calculateInventoryFit,
  estimateSetupComplexity,
  isFullServiceProvider,
  DEFAULT_PROVIDER_TRUST_SCORE,
  MIN_RATING_COUNT_FOR_RELIABILITY,
  normalizeCategory,
} from "./matching-rules-v2";
import {
  mergeRecoAndUserInventoryRequirements,
  userLinesToInventoryRequirements,
  specializationPenaltyForExcludedEquipment,
} from "./matching-user-requested";

// ============================================================================
// IMPLEMENTATION MOTEUR V2
// ============================================================================

export class MatchingEngineV2Impl implements MatchingEngineV2 {

  findMatches(
    input: MatchingInputV2, 
    providers: ProviderV2[], 
    config: MatchingConfigV2 = DEFAULT_MATCHING_CONFIG
  ): MatchingResultsV2 {
    const startTime = Date.now();
    
    console.log(`🔍 Matching V2: Evaluating ${providers.length} providers`);
    
    // Phase 1: Hard filtering
    const filterResults = providers.map(provider => ({
      provider,
      filterResult: this.hardFilterProvider(provider, input, config)
    }));
    
    const passedFiltering = filterResults.filter(result => result.filterResult.passed);
    const excluded = filterResults
      .filter(result => !result.filterResult.passed)
      .map(result => ({
        providerId: result.provider.id,
        reasons: result.filterResult.excludeReasons
      }));
    
    console.log(`✅ Hard filtering: ${passedFiltering.length}/${providers.length} providers passed`);
    
    // Phase 2: Scoring des prestataires survivants
    const scoredResults: MatchResult[] = passedFiltering.map(({ provider, filterResult }) => {
      const scoring = this.scoreProvider(provider, input, config);
      const compatibility = this.calculateCompatibility(provider, input);
      
      return {
        provider,
        filterResult,
        scoring,
        compatibility,
        recommendationReason: this.generateRecommendationReason(provider, scoring, compatibility),
        userWarnings: this.generateUserWarnings(provider, input, compatibility)
      };
    });
    
    // Phase 3: Tri par score et application des seuils
    const finalResults = scoredResults
      .filter(result => (result.scoring?.total || 0) >= config.results.minScoreThreshold)
      .sort((a, b) => (b.scoring?.total || 0) - (a.scoring?.total || 0))
      .slice(0, config.results.maxResults)
      .map((result, index) => ({
        ...result,
        displayRank: index + 1
      }));
    
    console.log(`🏆 Final results: ${finalResults.length} providers after scoring & thresholds`);
    
    // Phase 4: Multi-provider fallback (si activé et peu de résultats)
    const multiProviderSuggestion = config.results.enableMultiProvider && finalResults.length < 2
      ? this.generateMultiProviderSuggestion(input, providers)
      : undefined;
    
    const processingTime = Date.now() - startTime;
    
    return {
      matches: finalResults,
      stats: {
        totalEvaluated: providers.length,
        passedHardFilter: passedFiltering.length,
        excluded
      },
      multiProviderSuggestion,
      searchMetadata: {
        query: input,
        timestamp: new Date().toISOString(),
        processingTime,
        algorithm: "v2"
      }
    };
  }

  // ============================================================================
  // HARD FILTERING
  // ============================================================================
  
  hardFilterProvider(
    provider: ProviderV2, 
    input: MatchingInputV2,
    config: MatchingConfigV2 = DEFAULT_MATCHING_CONFIG
  ): FilterResult {
    const excludeReasons: HardFilterReason[] = [];
    const warnings: string[] = [];
    
    // 1. Zone géographique
    if (config.hardFilter.enableZoneFiltering && input.location.city) {
      const zoneCheck = calculateZoneCompatibility(
        input.location.city,
        provider.capabilities.coverage.zones
      );
      
      if (!zoneCheck.isCompatible) {
        excludeReasons.push("zone_not_covered");
      } else if (zoneCheck.compatibilityScore < 0.8) {
        warnings.push("Zone limite de couverture");
      }
    }
    
    // 2. Disponibilité
    if (config.hardFilter.enableAvailabilityFiltering && input.eventDate && provider.capabilities.availability) {
      const eventDate = input.eventDate;
      const blocked = provider.capabilities.availability.blockedDates.includes(eventDate);
      
      if (blocked) {
        excludeReasons.push("availability_conflict");
      }
      
      // Préavis minimum
      const eventDateObj = new Date(eventDate);
      const daysDiff = Math.ceil((eventDateObj.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      const requiredNotice = provider.capabilities.availability.advanceNotice || 0;
      
      if (daysDiff < requiredNotice) {
        excludeReasons.push("availability_conflict");
      }
    }
    
    // 3. Inventaire/Stock (si le prestataire a un inventaire renseigné ; sinon on ne filtre pas à tort)
    if (
      config.hardFilter.enableInventoryFiltering &&
      provider.capabilities.inventory &&
      provider.capabilities.inventory.length > 0
    ) {
      const mergedReq = mergeRecoAndUserInventoryRequirements(
        input.requiredEquipment,
        input.userRequestedEquipment,
      );
      const inventoryFit = calculateInventoryFit(mergedReq, provider.capabilities.inventory);
      
      if (inventoryFit.overallFit < config.hardFilter.minEquipmentCoverage) {
        excludeReasons.push("insufficient_inventory");
      }
    }
    
    // 4. Services requis
    if (config.hardFilter.enableServiceFiltering) {
      const requiredServices = input.requiredServices
        .filter(service => service.priority === "required")
        .map(service => service.service);
      
      const missingServices = requiredServices.filter(service => {
        const serviceMap: Record<string, boolean | undefined> = {
          'delivery': provider.capabilities.services.delivery,
          'installation': provider.capabilities.services.installation,  
          'technician': provider.capabilities.services.technician
        };
        
        return !serviceMap[service];
      });
      
      if (missingServices.length > 0) {
        excludeReasons.push("missing_required_services");
      }
    }
    
    // 5. Contraintes opérationnelles
    const constraintCheck = validateOperationalConstraints(
      input.guestCount,
      input.eventType,
      input.indoorOutdoor,
      provider.capabilities.constraints
    );
    
    if (!constraintCheck.isValid) {
      excludeReasons.push("operational_constraints");
      warnings.push(...constraintCheck.violations);
    }
    
    // 6. Budget (si limite stricte)
    if (input.budgetMax && provider.pricing?.dailyRate) {
      const estimatedCost = this.estimateProviderCost(provider, input);
      if (estimatedCost > input.budgetMax * 1.2) { // 20% de marge
        excludeReasons.push("budget_incompatible");
      }
    }
    
    return {
      passed: excludeReasons.length === 0,
      excludeReasons,
      warnings
    };
  }
  
  // ============================================================================
  // SCORING V2 EXPLICABLE
  // ============================================================================
  
  scoreProvider(
    provider: ProviderV2, 
    input: MatchingInputV2,
    config: MatchingConfigV2 = DEFAULT_MATCHING_CONFIG
  ): ScoringBreakdownV2 {
    const dimensions: Record<ScoringDimension, DimensionScore> = {
      inventory_fit: this.scoreInventoryFit(provider, input),
      service_fit: this.scoreServiceFit(provider, input),
      operational_fit: this.scoreOperationalFit(provider, input),
      specialization_fit: this.scoreSpecializationFit(provider, input),
      proximity_fit: this.scoreProximityFit(provider, input),
      budget_fit: this.scoreBudgetFit(provider, input),
      quality_fit: this.scoreQualityFit(provider, input),
      trust_fit: this.scoreTrustFit(provider, input)
    };
    
    // Calcul score total pondéré
    const weights = config.scoring.weights;
    const totalWeight = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
    
    let weightedSum = 0;
    Object.entries(dimensions).forEach(([dim, score]) => {
      const weight = weights[dim as ScoringDimension];
      weightedSum += score.score * weight;
    });
    
    const total = Math.round(weightedSum / totalWeight);
    
    // Génération justifications
    const strengths = this.extractStrengths(dimensions);
    const limitations = this.extractLimitations(dimensions);
    const differentiators = this.extractDifferentiators(provider, dimensions);
    
    // Calcul confiance et complétude data
    const dataCompleteness = this.calculateDataCompleteness(provider);
    const confidence = this.calculateScoringConfidence(dimensions, dataCompleteness);
    
    // Pénalité pour données incomplètes
    const finalScore = config.scoring.penalizeIncompleteData 
      ? Math.round(total * Math.max(0.5, dataCompleteness))
      : total;
    
    return {
      total: Math.max(0, Math.min(100, finalScore)),
      dimensions,
      strengths,
      limitations,
      differentiators,
      confidence,
      dataCompleteness
    };
  }
  
  // ============================================================================
  // SCORING DIMENSIONS INDIVIDUELLES
  // ============================================================================
  
  private scoreInventoryFit(provider: ProviderV2, input: MatchingInputV2): DimensionScore {
    if (!provider.capabilities.inventory) {
      return {
        score: 50, // Score neutre si pas d'info inventaire
        weight: DEFAULT_MATCHING_CONFIG.scoring.weights.inventory_fit,
        rationale: "Inventaire non renseigné",
        details: { status: "unknown" }
      };
    }

    const mergedReq = mergeRecoAndUserInventoryRequirements(
      input.requiredEquipment,
      input.userRequestedEquipment,
    );

    const inventoryFit = calculateInventoryFit(mergedReq, provider.capabilities.inventory);

    let score = Math.round(inventoryFit.overallFit * 100);

    // Bonus MVP : plusieurs familles demandées explicitement par l’utilisateur et bien couvertes
    const userOnly = userLinesToInventoryRequirements(input.userRequestedEquipment);
    const distinctUserBuckets = new Set(userOnly.map((u) => normalizeCategory(u.category))).size;
    if (distinctUserBuckets >= 2 && userOnly.length > 0) {
      const userFit = calculateInventoryFit(userOnly, provider.capabilities.inventory);
      if (userFit.overallFit >= 0.75) {
        score = Math.min(100, score + 5);
      }
    }

    const reqCount = Math.max(mergedReq.length, input.requiredEquipment.length, 1);

    return {
      score,
      weight: DEFAULT_MATCHING_CONFIG.scoring.weights.inventory_fit,
      rationale: score >= 80 
        ? `Excellent fit (${inventoryFit.sufficient.length}/${reqCount} catégories)`
        : score >= 60 
          ? "Fit partiel, certains équipements manquants"
          : "Fit insuffisant pour ce setup",
      details: {
        overallFit: inventoryFit.overallFit,
        sufficient: inventoryFit.sufficient.join(", "),
        missing: inventoryFit.missing.join(", "),
        mergedRequirementCount: mergedReq.length,
        userRequestedDistinct: distinctUserBuckets,
      }
    };
  }
  
  private scoreServiceFit(provider: ProviderV2, input: MatchingInputV2): DimensionScore {
    const requiredServices = input.requiredServices.filter(s => s.priority === "required");
    const recommendedServices = input.requiredServices.filter(s => s.priority === "recommended");
    
    let score = 70; // Base score
    let coveredRequired = 0;
    let coveredRecommended = 0;
    
    // Services obligatoires
    requiredServices.forEach(service => {
      const serviceKey = service.service as keyof typeof provider.capabilities.services;
      if (provider.capabilities.services[serviceKey]) {
        coveredRequired++;
        score += 20;
      } else {
        score -= 15; // Pénalité lourde pour service manquant
      }
    });
    
    // Services recommandés
    recommendedServices.forEach(service => {
      const serviceKey = service.service as keyof typeof provider.capabilities.services;
      if (provider.capabilities.services[serviceKey]) {
        coveredRecommended++;
        score += 5;
      }
    });
    
    const rationale = `Services: ${coveredRequired}/${requiredServices.length} requis, ${coveredRecommended}/${recommendedServices.length} recommandés`;
    
    return {
      score: Math.max(0, Math.min(100, score)),
      weight: DEFAULT_MATCHING_CONFIG.scoring.weights.service_fit,
      rationale,
      details: {
        requiredCovered: coveredRequired,
        requiredTotal: requiredServices.length,
        recommendedCovered: coveredRecommended,
        recommendedTotal: recommendedServices.length
      }
    };
  }
  
  private scoreOperationalFit(provider: ProviderV2, input: MatchingInputV2): DimensionScore {
    let score = 70; // Base
    const issues: string[] = [];
    
    // Taille d'événement
    if (input.guestCount && provider.capabilities.constraints) {
      const constraints = provider.capabilities.constraints;
      
      if (constraints.minEventSize && input.guestCount < constraints.minEventSize) {
        score -= 30;
        issues.push("Événement trop petit");
      } else if (constraints.maxEventSize && input.guestCount > constraints.maxEventSize) {
        score -= 30;
        issues.push("Événement trop grand");
      } else {
        score += 10; // Bonus pour taille compatible
      }
    }
    
    // Indoor/Outdoor
    if (input.indoorOutdoor && provider.capabilities.constraints) {
      const constraints = provider.capabilities.constraints;
      
      if ((constraints.indoorOnly && input.indoorOutdoor === 'outdoor') ||
          (constraints.outdoorOnly && input.indoorOutdoor === 'indoor')) {
        score -= 25;
        issues.push("Contrainte indoor/outdoor");
      }
    }
    
    // Complexité setup
    const complexity = estimateSetupComplexity(
      input.requiredEquipment.map(eq => ({ category: eq.category, quantity: eq.quantity })),
      input.requiredServices.map(s => s.service)
    );
    
    // Bonus pour prestataires full-service sur setups complexes
    if (complexity === "complex" && isFullServiceProvider(provider.capabilities.categories)) {
      score += 15;
    }
    
    const rationale = issues.length > 0 
      ? `Contraintes: ${issues.join(", ")}`
      : `Fit opérationnel ${complexity}, aucune contrainte`;
    
    return {
      score: Math.max(0, Math.min(100, score)),
      weight: DEFAULT_MATCHING_CONFIG.scoring.weights.operational_fit,
      rationale,
      details: { 
        complexity,
        issues: issues.join(", "),
        isFullService: isFullServiceProvider(provider.capabilities.categories)
      }
    };
  }
  
  private scoreSpecializationFit(provider: ProviderV2, input: MatchingInputV2): DimensionScore {
    if (!input.eventType || input.eventType === 'unknown') {
      return {
        score: 70,
        weight: DEFAULT_MATCHING_CONFIG.scoring.weights.specialization_fit,
        rationale: "Type d'événement non spécifié",
        details: { status: "neutral" }
      };
    }
    
    const baseScore = 70;
    const specializationBonus = calculateSpecializationBonus(
      input.eventType,
      provider.capabilities.specializations || []
    );

    let score = Math.round(baseScore * specializationBonus);

    const exclusionPen = specializationPenaltyForExcludedEquipment(
      provider,
      input.excludedEquipmentTypes,
    );
    score = Math.max(0, score - exclusionPen);

    let rationale = "Prestataire généraliste";
    if (specializationBonus > 1.4) {
      rationale = `Spécialisé ${input.eventType}`;
    } else if (specializationBonus > 1.1) {
      rationale = `Expérience ${input.eventType}`;
    }
    if (exclusionPen > 0) {
      rationale = `${rationale} — ajusté (exclusions utilisateur)`;
    }

    return {
      score: Math.min(100, score),
      weight: DEFAULT_MATCHING_CONFIG.scoring.weights.specialization_fit,
      rationale,
      details: {
        eventType: input.eventType,
        specializationBonus,
        providerSpecializations: provider.capabilities.specializations || [],
        exclusionPenalty: exclusionPen,
      },
    };
  }

  private scoreProximityFit(provider: ProviderV2, input: MatchingInputV2): DimensionScore {
    if (!input.location.city) {
      return {
        score: 60,
        weight: DEFAULT_MATCHING_CONFIG.scoring.weights.proximity_fit,
        rationale: "Localisation événement non précisée",
        details: { status: "unknown" }
      };
    }
    
    const zoneCheck = calculateZoneCompatibility(
      input.location.city,
      provider.capabilities.coverage.zones
    );
    
    const score = Math.round(zoneCheck.compatibilityScore * 100);
    
    return {
      score,
      weight: DEFAULT_MATCHING_CONFIG.scoring.weights.proximity_fit,
      rationale: zoneCheck.reason,
      details: {
        eventLocation: input.location.city,
        providerZones: provider.capabilities.coverage.zones,
        compatibilityScore: zoneCheck.compatibilityScore
      }
    };
  }
  
  private scoreBudgetFit(provider: ProviderV2, input: MatchingInputV2): DimensionScore {
    if (!input.budgetMax || !provider.pricing?.dailyRate) {
      return {
        score: 70,
        weight: DEFAULT_MATCHING_CONFIG.scoring.weights.budget_fit,
        rationale: "Budget non spécifié",
        details: { status: "unknown" }
      };
    }
    
    const estimatedCost = this.estimateProviderCost(provider, input);
    const budgetRatio = estimatedCost / input.budgetMax;
    
    let score = 70;
    let rationale = "Budget adapté";
    
    if (budgetRatio <= 0.8) {
      score = 100;
      rationale = "Très bon rapport qualité-prix";
    } else if (budgetRatio <= 1.0) {
      score = 85;
      rationale = "Dans le budget";
    } else if (budgetRatio <= 1.2) {
      score = 60;
      rationale = "Légèrement au-dessus du budget";
    } else {
      score = 30;
      rationale = "Au-dessus du budget";
    }
    
    return {
      score,
      weight: DEFAULT_MATCHING_CONFIG.scoring.weights.budget_fit,
      rationale,
      details: {
        estimatedCost,
        budgetMax: input.budgetMax,
        budgetRatio
      }
    };
  }
  
  private scoreQualityFit(provider: ProviderV2, input: MatchingInputV2): DimensionScore {
    const qualityLevel = provider.capabilities.equipment_quality || "standard";
    const preferredQuality = input.qualityPreference || "standard";
    
    const qualityScores = { basic: 60, standard: 80, premium: 100 };
    const baseScore = qualityScores[qualityLevel];
    
    // Bonus/malus selon préférence
    let adjustment = 0;
    if (preferredQuality === "premium" && qualityLevel === "premium") {
      adjustment = 20;
    } else if (preferredQuality === "basic" && qualityLevel !== "basic") {
      adjustment = -10; // Surdimensionné pour le besoin
    }
    
    const score = Math.min(100, baseScore + adjustment);
    
    return {
      score,
      weight: DEFAULT_MATCHING_CONFIG.scoring.weights.quality_fit,
      rationale: `Matériel ${qualityLevel}`,
      details: {
        providerQuality: qualityLevel,
        preferredQuality,
        baseScore,
        adjustment
      }
    };
  }
  
  private scoreTrustFit(provider: ProviderV2, input: MatchingInputV2): DimensionScore {
    let score = DEFAULT_PROVIDER_TRUST_SCORE * 100; // Base 70
    const factors: string[] = [];
    
    // Avis et ratings
    if (provider.rating && provider.ratingCount) {
      const ratingScore = provider.rating * 20; // 4.5 → 90
      const reliabilityBonus = provider.ratingCount >= MIN_RATING_COUNT_FOR_RELIABILITY ? 10 : 0;
      score = ratingScore + reliabilityBonus;
      factors.push(`${provider.rating}⭐ (${provider.ratingCount} avis)`);
    }
    
    // Certifications et vérifications
    if (provider.trust?.verified) {
      score += 10;
      factors.push("Vérifié");
    }
    
    if (provider.trust?.businessLicense) {
      score += 5;
      factors.push("Licence");
    }
    
    if (provider.trust?.insurance) {
      score += 5;
      factors.push("Assuré");
    }
    
    // Temps de réponse
    if (provider.trust?.responseTime && provider.trust.responseTime <= 24) {
      score += 10;
      factors.push("Réponse rapide");
    }
    
    const rationale = factors.length > 0 
      ? factors.join(", ")
      : "Confiance standard";
    
    return {
      score: Math.min(100, Math.round(score)),
      weight: DEFAULT_MATCHING_CONFIG.scoring.weights.trust_fit,
      rationale,
      details: {
        rating: provider.rating,
        ratingCount: provider.ratingCount,
        verified: provider.trust?.verified,
        responseTime: provider.trust?.responseTime
      }
    };
  }
  
  // ============================================================================
  // UTILITAIRES ET HELPERS
  // ============================================================================
  
  private estimateProviderCost(provider: ProviderV2, input: MatchingInputV2): number {
    const baseRate = provider.pricing?.dailyRate || provider.pricePerDay || 200;
    let totalCost = baseRate;
    
    // Frais additionnels
    if (input.deliveryRequired && provider.pricing?.deliveryFee) {
      totalCost += provider.pricing.deliveryFee;
    }
    
    if (input.installationRequired && provider.pricing?.setupFee) {
      totalCost += provider.pricing.setupFee;
    }
    
    if (input.technicianRequired && provider.pricing?.technicianFee) {
      totalCost += provider.pricing.technicianFee;
    }
    
    return totalCost;
  }
  
  private calculateCompatibility(provider: ProviderV2, input: MatchingInputV2) {
    const mergedReq = mergeRecoAndUserInventoryRequirements(
      input.requiredEquipment,
      input.userRequestedEquipment,
    );
    const requiredEquipmentCategories = mergedReq.map((eq) => eq.category);
    const requiredServices = input.requiredServices.map(s => s.service);
    
    // Equipment coverage
    const providerCategories = provider.capabilities.categories;
    const coveredEquipment = requiredEquipmentCategories.filter(cat => 
      providerCategories.some(pCat => pCat.toLowerCase().includes(cat.toLowerCase()) ||
                                     cat.toLowerCase().includes(pCat.toLowerCase()))
    );
    const equipmentCoverage = requiredEquipmentCategories.length > 0 
      ? coveredEquipment.length / requiredEquipmentCategories.length 
      : 1.0;
    
    // Service coverage
    const serviceMap = provider.capabilities.services;
    const coveredServices = requiredServices.filter(service => {
      const key = service as keyof typeof serviceMap;
      return serviceMap[key];
    });
    const serviceCoverage = requiredServices.length > 0 
      ? coveredServices.length / requiredServices.length 
      : 1.0;
    
    // Missing items
    const missingEquipment = requiredEquipmentCategories.filter(cat => !coveredEquipment.includes(cat));
    const missingServices = requiredServices.filter(service => !coveredServices.includes(service));
    
    return {
      equipmentCoverage,
      serviceCoverage,
      missingEquipment,
      missingServices,
      alternativeSuggestions: this.generateAlternativeSuggestions(missingEquipment, missingServices)
    };
  }
  
  private generateAlternativeSuggestions(missingEquipment: string[], missingServices: string[]): string[] {
    const suggestions: string[] = [];
    
    if (missingEquipment.includes('microphones')) {
      suggestions.push("Prévoir micros séparément");
    }
    
    if (missingServices.includes('installation')) {
      suggestions.push("Installation possible par le client");
    }
    
    if (missingServices.includes('technician')) {
      suggestions.push("Support à distance disponible");
    }
    
    return suggestions;
  }
  
  private generateRecommendationReason(
    provider: ProviderV2, 
    scoring: ScoringBreakdownV2, 
    compatibility: any
  ): string {
    const topDimensions = Object.entries(scoring.dimensions)
      .sort(([,a], [,b]) => b.score - a.score)
      .slice(0, 2)
      .map(([dim]) => dim);
    
    const reasons: string[] = [];
    
    if (topDimensions.includes('inventory_fit')) {
      reasons.push("Matériel adapté");
    }
    
    if (topDimensions.includes('specialization_fit')) {
      reasons.push("Spécialisé pour ce type d'événement");
    }
    
    if (topDimensions.includes('trust_fit') && provider.rating && provider.rating >= 4.5) {
      reasons.push("Très bien noté");
    }
    
    if (isFullServiceProvider(provider.capabilities.categories)) {
      reasons.push("Service complet");
    }
    
    return reasons.length > 0 
      ? reasons.join(" • ")
      : "Prestataire compatible avec votre événement";
  }
  
  private generateUserWarnings(provider: ProviderV2, input: MatchingInputV2, compatibility: any): string[] {
    const warnings: string[] = [];
    
    if (compatibility.equipmentCoverage < 1.0) {
      warnings.push(`Matériel manquant: ${compatibility.missingEquipment.join(", ")}`);
    }
    
    if (compatibility.serviceCoverage < 1.0) {
      warnings.push(`Services manquants: ${compatibility.missingServices.join(", ")}`);
    }
    
    if (input.budgetMax && provider.pricing?.dailyRate) {
      const cost = this.estimateProviderCost(provider, input);
      if (cost > input.budgetMax) {
        warnings.push(`Budget dépassé de ${Math.round(((cost/input.budgetMax) - 1) * 100)}%`);
      }
    }
    
    return warnings;
  }
  
  private extractStrengths(dimensions: Record<ScoringDimension, DimensionScore>): string[] {
    return Object.entries(dimensions)
      .filter(([,score]) => score.score >= 85)
      .map(([dim, score]) => score.rationale);
  }
  
  private extractLimitations(dimensions: Record<ScoringDimension, DimensionScore>): string[] {
    return Object.entries(dimensions)
      .filter(([,score]) => score.score <= 50)
      .map(([dim, score]) => score.rationale);
  }
  
  private extractDifferentiators(provider: ProviderV2, dimensions: Record<ScoringDimension, DimensionScore>): string[] {
    const differentiators: string[] = [];
    
    if (isFullServiceProvider(provider.capabilities.categories)) {
      differentiators.push("Prestataire full-service");
    }
    
    if (provider.trust?.verified) {
      differentiators.push("Prestataire vérifié");
    }
    
    if (dimensions.specialization_fit.score >= 90) {
      differentiators.push("Expert du domaine");
    }
    
    return differentiators;
  }
  
  private calculateDataCompleteness(provider: ProviderV2): number {
    let score = 0;
    let maxScore = 10;
    
    // Infos de base
    if (provider.description) score += 1;
    if (provider.rating && provider.ratingCount) score += 1;
    if (provider.image) score += 0.5;
    
    // Capacités
    if (provider.capabilities.coverage.zones.length > 0) score += 1;
    if (provider.capabilities.inventory && provider.capabilities.inventory.length > 0) score += 2;
    if (provider.capabilities.specializations && provider.capabilities.specializations.length > 0) score += 1;
    
    // Pricing
    if (provider.pricing?.dailyRate || provider.pricePerDay) score += 1;
    
    // Trust
    if (provider.trust?.verified) score += 1;
    if (provider.trust?.responseTime) score += 0.5;
    
    return Math.min(1.0, score / maxScore);
  }
  
  private calculateScoringConfidence(dimensions: Record<ScoringDimension, DimensionScore>, dataCompleteness: number): number {
    const avgScore = Object.values(dimensions).reduce((sum, dim) => sum + dim.score, 0) / Object.keys(dimensions).length;
    const variance = Object.values(dimensions).reduce((sum, dim) => sum + Math.pow(dim.score - avgScore, 2), 0) / Object.keys(dimensions).length;
    
    // Plus la variance est faible et plus les données sont complètes, plus on a confiance
    const consistencyScore = Math.max(0, 1 - (variance / 1000)); // Normaliser variance
    
    return (consistencyScore + dataCompleteness) / 2;
  }
  
  private generateMultiProviderSuggestion(input: MatchingInputV2, providers: ProviderV2[]) {
    // Logique simplifiée pour MVP - peut être enrichie plus tard
    return undefined;
  }
  
  // ============================================================================
  // API PUBLIQUE UTILITAIRES
  // ============================================================================
  
  explainResult(result: MatchResult): string[] {
    const explanations: string[] = [];
    
    explanations.push(`Score global: ${result.scoring?.total}/100`);
    explanations.push(`Raison: ${result.recommendationReason}`);
    
    if (result.scoring) {
      const topDimensions = Object.entries(result.scoring.dimensions)
        .sort(([,a], [,b]) => b.score - a.score)
        .slice(0, 3);
        
      explanations.push("Forces:");
      topDimensions.forEach(([dim, score]) => {
        explanations.push(`  • ${score.rationale} (${score.score}/100)`);
      });
    }
    
    if (result.userWarnings && result.userWarnings.length > 0) {
      explanations.push("Points d'attention:");
      result.userWarnings.forEach(warning => {
        explanations.push(`  ⚠️ ${warning}`);
      });
    }
    
    return explanations;
  }
  
  compareProviders(a: MatchResult, b: MatchResult): string[] {
    const comparisons: string[] = [];
    
    const scoreA = a.scoring?.total || 0;
    const scoreB = b.scoring?.total || 0;
    
    comparisons.push(`${a.provider.title}: ${scoreA}/100 vs ${b.provider.title}: ${scoreB}/100`);
    
    if (a.scoring && b.scoring) {
      // Comparer les dimensions principales
      const mainDimensions: ScoringDimension[] = ['inventory_fit', 'service_fit', 'specialization_fit'];
      
      mainDimensions.forEach(dim => {
        const dimA = a.scoring!.dimensions[dim];
        const dimB = b.scoring!.dimensions[dim];
        
        if (Math.abs(dimA.score - dimB.score) > 15) {
          const better = dimA.score > dimB.score ? a.provider.title : b.provider.title;
          comparisons.push(`${dim}: ${better} est meilleur`);
        }
      });
    }
    
    return comparisons;
  }
  
  validateProvider(provider: ProviderV2): { isValid: boolean; issues: string[] } {
    const issues: string[] = [];
    
    if (!provider.id) issues.push("ID manquant");
    if (!provider.title) issues.push("Titre manquant");
    if (!provider.capabilities.categories || provider.capabilities.categories.length === 0) {
      issues.push("Aucune catégorie d'équipement");
    }
    if (!provider.capabilities.coverage.zones || provider.capabilities.coverage.zones.length === 0) {
      issues.push("Zone de couverture non définie");
    }
    
    return {
      isValid: issues.length === 0,
      issues
    };
  }
  
  analyzeMatchingQuality(results: MatchingResultsV2) {
    const matches = results.matches;
    
    if (matches.length === 0) {
      return {
        qualityScore: 0,
        coverage: 0,
        diversity: 0,
        recommendations: ["Aucun prestataire compatible trouvé"]
      };
    }
    
    const avgScore = matches.reduce((sum, match) => sum + (match.scoring?.total || 0), 0) / matches.length;
    const avgCoverage = matches.reduce((sum, match) => sum + match.compatibility.equipmentCoverage, 0) / matches.length;
    
    // Diversité des spécialisations
    const specializations = new Set(
      matches.flatMap(match => match.provider.capabilities.specializations || [])
    );
    const diversityScore = Math.min(1.0, specializations.size / 5); // Max 5 spécialisations différentes
    
    const recommendations: string[] = [];
    
    if (avgScore < 70) {
      recommendations.push("Qualité globale des matches faible - envisager d'élargir les critères");
    }
    
    if (avgCoverage < 0.8) {
      recommendations.push("Coverage équipement insuffisant - considérer multi-prestataire");
    }
    
    if (matches.length < 3) {
      recommendations.push("Peu de choix disponibles - élargir la zone de recherche");
    }
    
    return {
      qualityScore: Math.round(avgScore),
      coverage: Math.round(avgCoverage * 100),
      diversity: Math.round(diversityScore * 100),
      recommendations
    };
  }
}

// ============================================================================
// FACTORY ET EXPORT
// ============================================================================

export function createMatchingEngineV2(): MatchingEngineV2 {
  return new MatchingEngineV2Impl();
}

export const defaultMatchingEngineV2 = new MatchingEngineV2Impl();