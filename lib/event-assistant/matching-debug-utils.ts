/**
 * Utilitaires de debug pour le moteur de matching V2
 * Exposés dans window pour faciliter les tests console
 */

import { createMatchingEngineV2 } from "./matching-engine-v2";
import { convertV1ProvidersToV2, enableMatchingV2, isMatchingV2Enabled } from "./matching-bridge-v2";
import { getMockProviders } from "./mocks";
import { createEmptyBrief } from "./brief";
import { MatchingInputV2, ProviderV2 } from "./matching-types-v2";
import { DEFAULT_MATCHING_CONFIG } from "./matching-rules-v2";
import { EventType } from "./types";

// ============================================================================
// SCÉNARIOS DE TEST PRÉ-DÉFINIS
// ============================================================================

export const MATCHING_TEST_SCENARIOS = {
  conference_paris: {
    name: "Conférence 120p Paris - Priorité parole",
    input: {
      eventType: 'conference' as EventType,
      guestCount: 120,
      location: { city: 'Paris' },
      requiredEquipment: [
        { category: 'sound', subcategory: 'speakers', quantity: 4, label: '4 enceintes moyennes', description: 'Diffusion parole', priority: 'essential' as const, reasoning: 'Conference clarity' },
        { category: 'microphones', subcategory: 'handheld', quantity: 3, label: '3 micros HF', description: 'Prises de parole multiples', priority: 'essential' as const, reasoning: 'Speaker rotation' }
      ],
      requiredServices: [
        { service: 'installation' as const, description: 'Installation professionnelle', reasoning: 'Event quality', priority: 'required' as const },
        { service: 'technician' as const, description: 'Technicien sur site', reasoning: 'Live support', priority: 'recommended' as const }
      ],
      deliveryRequired: true,
      installationRequired: true
    }
  },

  birthday_dj: {
    name: "Anniversaire 80p avec DJ - Musique dansante",
    input: {
      eventType: 'birthday' as EventType,
      guestCount: 80,
      location: { city: 'Paris' },
      requiredEquipment: [
        { category: 'sound', subcategory: 'speakers', quantity: 4, label: '4 enceintes + caisson', description: 'Diffusion danse', priority: 'essential' as const, reasoning: 'Dance floor power' },
        { category: 'dj', subcategory: 'controller', quantity: 1, label: 'Setup DJ complet', description: 'Animation musicale', priority: 'essential' as const, reasoning: 'DJ performance' },
        { category: 'lighting', subcategory: 'wash', quantity: 6, label: '6 projecteurs LED', description: 'Ambiance colorée', priority: 'recommended' as const, reasoning: 'Party atmosphere' }
      ],
      requiredServices: [
        { service: 'delivery' as const, description: 'Livraison', reasoning: 'Logistics', priority: 'required' as const }
      ],
      deliveryRequired: true
    }
  },

  corporate_premium: {
    name: "Événement corporate premium - Setup complet",
    input: {
      eventType: 'corporate' as EventType,
      guestCount: 200,
      location: { city: 'Paris' },
      requiredEquipment: [
        { category: 'sound', subcategory: 'speakers', quantity: 6, label: '6 enceintes premium', description: 'Diffusion uniforme', priority: 'essential' as const, reasoning: 'Corporate quality' },
        { category: 'microphones', subcategory: 'handheld', quantity: 4, label: '4 micros HF', description: 'Interventions multiples', priority: 'essential' as const, reasoning: 'Panel discussions' },
        { category: 'video', subcategory: 'led_screen', quantity: 1, label: 'Écran LED 6m²', description: 'Projection corporate', priority: 'essential' as const, reasoning: 'Visual support' }
      ],
      requiredServices: [
        { service: 'installation' as const, description: 'Installation complète', reasoning: 'Professional setup', priority: 'required' as const },
        { service: 'technician' as const, description: 'Régisseur dédié', reasoning: 'Event management', priority: 'required' as const }
      ],
      budgetMax: 2000,
      qualityPreference: 'premium' as const
    }
  },

  outdoor_festival: {
    name: "Événement extérieur 300p - Contraintes météo",
    input: {
      eventType: 'outdoor_event' as EventType,
      guestCount: 300,
      location: { city: 'Paris' },
      indoorOutdoor: 'outdoor' as const,
      requiredEquipment: [
        { category: 'sound', subcategory: 'speakers', quantity: 8, label: '8 enceintes outdoor', description: 'Diffusion plein air', priority: 'essential' as const, reasoning: 'Outdoor dispersion' },
        { category: 'lighting', subcategory: 'wash', quantity: 12, label: '12 projecteurs étanches', description: 'Éclairage extérieur', priority: 'essential' as const, reasoning: 'Evening event' }
      ],
      requiredServices: [
        { service: 'installation' as const, description: 'Installation renforcée', reasoning: 'Weather protection', priority: 'required' as const },
        { service: 'technician' as const, description: 'Technicien météo', reasoning: 'Safety management', priority: 'required' as const }
      ]
    }
  },

  budget_limit: {
    name: "Événement budget serré - Filtrage prix",
    input: {
      eventType: 'cocktail' as EventType,
      guestCount: 50,
      location: { city: 'Paris' },
      requiredEquipment: [
        { category: 'sound', subcategory: 'speakers', quantity: 2, label: '2 enceintes simples', description: 'Ambiance musicale', priority: 'essential' as const, reasoning: 'Background music' }
      ],
      requiredServices: [
        { service: 'delivery' as const, description: 'Livraison uniquement', reasoning: 'Cost saving', priority: 'required' as const }
      ],
      budgetMax: 200, // Budget très serré
      qualityPreference: 'basic' as const
    }
  }
};

// ============================================================================
// MOCKS PRESTATAIRES SPÉCIALISÉS POUR TESTS
// ============================================================================

function createTestProviders(): ProviderV2[] {
  return [
    {
      id: "dj-party-pro",
      title: "DJ Party Pro",
      location: "Paris",
      rating: 4.9,
      ratingCount: 120,
      capabilities: {
        categories: ["dj", "sound", "lighting"],
        services: { delivery: true, installation: true, technician: false },
        coverage: { zones: ["Paris", "Île-de-France"], maxDistance: 30 },
        inventory: [
          { category: "sound", quantity: 6, qualityTier: "premium" },
          { category: "dj", quantity: 3, qualityTier: "premium" },
          { category: "lighting", quantity: 12, qualityTier: "standard" }
        ],
        specializations: ["birthday", "private_party", "dj_set"],
        equipment_quality: "premium"
      },
      pricing: { dailyRate: 600, deliveryFee: 80, setupFee: 150 },
      trust: { verified: true, responseTime: 6, completionRate: 98 }
    },
    
    {
      id: "conference-expert",
      title: "Conférences & Corporate",
      location: "Paris",
      rating: 4.6,
      ratingCount: 45,
      capabilities: {
        categories: ["sound", "microphones", "video"],
        services: { delivery: true, installation: true, technician: true },
        coverage: { zones: ["Paris", "La Défense", "Neuilly"], maxDistance: 25 },
        inventory: [
          { category: "sound", quantity: 10, qualityTier: "premium" },
          { category: "microphones", quantity: 8, qualityTier: "premium" },
          { category: "video", quantity: 3, qualityTier: "premium" }
        ],
        specializations: ["conference", "corporate", "product_launch"],
        equipment_quality: "premium"
      },
      pricing: { dailyRate: 800, deliveryFee: 60, setupFee: 200, technicianFee: 300 },
      trust: { verified: true, businessLicense: true, responseTime: 12, completionRate: 96 }
    },
    
    {
      id: "sound-basic",
      title: "Sono Basic",
      location: "Paris",
      rating: 4.1,
      ratingCount: 15,
      capabilities: {
        categories: ["sound"],
        services: { delivery: true, installation: false, technician: false },
        coverage: { zones: ["Paris"], maxDistance: 15 },
        inventory: [
          { category: "sound", quantity: 4, qualityTier: "basic" }
        ],
        specializations: [],
        equipment_quality: "basic"
      },
      pricing: { dailyRate: 150, deliveryFee: 30 },
      trust: { verified: false, responseTime: 48, completionRate: 85 }
    },
    
    {
      id: "premium-fullservice",
      title: "Premium Events Full Service",
      location: "Paris",
      rating: 4.8,
      ratingCount: 80,
      capabilities: {
        categories: ["sound", "microphones", "dj", "lighting", "video"],
        services: { delivery: true, installation: true, technician: true, consulting: true },
        coverage: { zones: ["Île-de-France"], maxDistance: 50 },
        inventory: [
          { category: "sound", quantity: 15, qualityTier: "premium" },
          { category: "microphones", quantity: 10, qualityTier: "premium" },
          { category: "dj", quantity: 3, qualityTier: "premium" },
          { category: "lighting", quantity: 20, qualityTier: "premium" },
          { category: "video", quantity: 5, qualityTier: "premium" }
        ],
        specializations: ["wedding", "corporate", "showcase", "product_launch"],
        equipment_quality: "premium"
      },
      pricing: { dailyRate: 1200, deliveryFee: 100, setupFee: 300, technicianFee: 350 },
      trust: { verified: true, businessLicense: true, insurance: true, responseTime: 4, completionRate: 99 }
    },
    
    {
      id: "lyon-provider",
      title: "Sono Lyon (Hors Zone)",
      location: "Lyon",
      rating: 4.7,
      ratingCount: 60,
      capabilities: {
        categories: ["sound", "microphones", "lighting"],
        services: { delivery: true, installation: true, technician: true },
        coverage: { zones: ["Lyon", "Rhône", "Rhône-Alpes"], maxDistance: 40 },
        inventory: [
          { category: "sound", quantity: 8, qualityTier: "standard" },
          { category: "microphones", quantity: 6, qualityTier: "standard" }
        ],
        specializations: ["conference", "wedding"],
        equipment_quality: "standard"
      },
      pricing: { dailyRate: 400, deliveryFee: 150 },
      trust: { verified: true, responseTime: 24, completionRate: 94 }
    }
  ];
}

// ============================================================================
// API DEBUG MATCHING V2
// ============================================================================

export class MatchingDebugAPI {
  private engine = createMatchingEngineV2();
  private testProviders = createTestProviders();

  // Test d'un scénario prédéfini
  testScenario(scenarioKey: keyof typeof MATCHING_TEST_SCENARIOS) {
    const scenario = MATCHING_TEST_SCENARIOS[scenarioKey];
    if (!scenario) {
      console.error("Scénario non trouvé:", scenarioKey);
      return;
    }

    console.group(`🎯 Test Matching: ${scenario.name}`);
    console.log("Input:", scenario.input);

    const results = this.engine.findMatches(scenario.input, this.testProviders);
    
    console.log(`📊 Statistiques: ${results.stats.passedHardFilter}/${results.stats.totalEvaluated} providers passent le hard filtering`);
    
    if (results.stats.excluded.length > 0) {
      console.group("❌ Exclusions Hard Filter:");
      results.stats.excluded.forEach(exclusion => {
        const provider = this.testProviders.find(p => p.id === exclusion.providerId);
        console.log(`• ${provider?.title}: ${exclusion.reasons.join(", ")}`);
      });
      console.groupEnd();
    }

    if (results.matches.length > 0) {
      console.group(`✅ Matches (${results.matches.length}):`);
      results.matches.forEach((match, i) => {
        console.group(`${i + 1}. ${match.provider.title} (${match.scoring?.total}/100)`);
        console.log("Raison:", match.recommendationReason);
        
        if (match.scoring) {
          const topDims = Object.entries(match.scoring.dimensions)
            .sort(([,a], [,b]) => b.score - a.score)
            .slice(0, 3);
          
          console.log("Top dimensions:");
          topDims.forEach(([dim, score]) => {
            console.log(`  • ${dim}: ${score.score}/100 - ${score.rationale}`);
          });
        }
        
        if (match.userWarnings && match.userWarnings.length > 0) {
          console.warn("Warnings:", match.userWarnings);
        }
        
        console.groupEnd();
      });
      console.groupEnd();
    } else {
      console.warn("❌ Aucun match trouvé");
    }

    console.groupEnd();
    return results;
  }

  // Test de tous les scénarios
  testAllScenarios() {
    console.group("🧪 Test de tous les scénarios matching");
    
    const results: Record<string, any> = {};
    
    Object.keys(MATCHING_TEST_SCENARIOS).forEach(key => {
      try {
        results[key] = this.testScenario(key as keyof typeof MATCHING_TEST_SCENARIOS);
      } catch (error) {
        console.error(`Erreur scénario ${key}:`, error);
        results[key] = null;
      }
    });

    // Résumé
    const summary = Object.entries(results).map(([scenario, result]) => ({
      scenario,
      success: !!result,
      matches: result?.matches?.length || 0,
      excluded: result?.stats?.excluded?.length || 0
    }));

    console.table(summary);
    console.groupEnd();
    
    return results;
  }

  // Test avec prestataires réels (mocks)
  testWithMockProviders(scenarioKey: keyof typeof MATCHING_TEST_SCENARIOS) {
    const scenario = MATCHING_TEST_SCENARIOS[scenarioKey];
    if (!scenario) {
      console.error("Scénario non trouvé:", scenarioKey);
      return;
    }

    console.group(`🔄 Test avec prestataires mocks: ${scenario.name}`);

    // Convertir mocks V1 → V2
    const mockProvidersV1 = getMockProviders(20);
    const mockProvidersV2 = convertV1ProvidersToV2(mockProvidersV1);

    console.log(`Prestataires: ${mockProvidersV2.length} (convertis depuis mocks V1)`);

    const results = this.engine.findMatches(scenario.input, mockProvidersV2);

    console.log(`Hard filtering: ${results.stats.passedHardFilter}/${results.stats.totalEvaluated}`);
    console.log(`Matches finaux: ${results.matches.length}`);

    const quality = this.engine.analyzeMatchingQuality(results);
    console.log(`Qualité globale: ${quality.qualityScore}/100 (coverage: ${quality.coverage}%, diversity: ${quality.diversity}%)`);

    if (quality.recommendations.length > 0) {
      console.log("Recommandations:", quality.recommendations);
    }

    console.groupEnd();
    return results;
  }

  // Comparaison V1 vs V2
  compareV1VsV2(scenarioKey: keyof typeof MATCHING_TEST_SCENARIOS) {
    const scenario = MATCHING_TEST_SCENARIOS[scenarioKey];
    if (!scenario) {
      console.error("Scénario non trouvé:", scenarioKey);
      return;
    }

    console.group(`⚖️ Comparaison V1 vs V2: ${scenario.name}`);

    // Créer un brief équivalent pour V1
    const brief = createEmptyBrief();
    brief.eventType.value = scenario.input.eventType || null;
    brief.guestCount.value = scenario.input.guestCount || null;
    brief.location.value = scenario.input.location ? { label: scenario.input.location.city || "" } : null;
    brief.indoorOutdoor.value = scenario.input.indoorOutdoor || null;

    // Prestataires de test
    const providersV2 = this.testProviders;
    const providersV1 = providersV2.map(p => ({
      id: p.id,
      title: p.title,
      location: p.location,
      rating: p.rating,
      ratingCount: p.ratingCount,
      pricePerDay: p.pricing?.dailyRate,
      capabilities: {
        categories: p.capabilities.categories,
        services: {
          delivery: p.capabilities.services.delivery,
          installation: p.capabilities.services.installation,
          technician: p.capabilities.services.technician
        }
      }
    }));

    // Résultats V2
    const resultsV2 = this.engine.findMatches(scenario.input, providersV2);

    // Simuler V1 (scoring simple)
    const resultsV1 = providersV1.map(provider => ({
      provider,
      score: {
        total: Math.round((provider.rating || 3.5) * 18), // Approximation V1
        rationale: "Scoring V1 basé sur rating"
      }
    })).sort((a, b) => b.score.total - a.score.total);

    console.group("V1 (Scoring simple):");
    resultsV1.slice(0, 3).forEach((result, i) => {
      console.log(`${i + 1}. ${result.provider.title}: ${result.score.total}/100`);
    });
    console.groupEnd();

    console.group("V2 (Hard filter + scoring spécialisé):");
    console.log(`Excluded by hard filter: ${resultsV2.stats.excluded.length}`);
    resultsV2.matches.slice(0, 3).forEach((match, i) => {
      console.log(`${i + 1}. ${match.provider.title}: ${match.scoring?.total}/100`);
      console.log(`   → ${match.recommendationReason}`);
    });
    console.groupEnd();

    // Analyse des différences
    const v1Top = resultsV1[0]?.provider;
    const v2Top = resultsV2.matches[0]?.provider;

    if (v1Top && v2Top) {
      if (v1Top.id !== v2Top.id) {
        console.log(`🏆 Winner change: V1 favored "${v1Top.title}", V2 favors "${v2Top.title}"`);
        console.log(`   → V2 reasoning: ${resultsV2.matches[0].recommendationReason}`);
      } else {
        console.log(`✅ Same winner: "${v1Top.title}"`);
      }
    }

    console.groupEnd();
    return { v1: resultsV1, v2: resultsV2 };
  }

  // Analyse détaillée d'un prestataire
  analyzeProvider(providerId: string) {
    const provider = this.testProviders.find(p => p.id === providerId);
    if (!provider) {
      console.error("Prestataire non trouvé:", providerId);
      return;
    }

    console.group(`🔍 Analyse prestataire: ${provider.title}`);

    // Validation
    const validation = this.engine.validateProvider(provider);
    console.log("Validation:", validation.isValid ? "✅ Valide" : "❌ Problèmes");
    if (!validation.isValid) {
      console.log("Issues:", validation.issues);
    }

    // Test sur différents scénarios
    console.group("Compatibilité par scénario:");
    Object.entries(MATCHING_TEST_SCENARIOS).forEach(([key, scenario]) => {
      const filterResult = this.engine.hardFilterProvider(provider, scenario.input);
      const status = filterResult.passed ? "✅" : "❌";
      const reasons = filterResult.excludeReasons.length > 0 ? ` (${filterResult.excludeReasons.join(", ")})` : "";
      console.log(`${status} ${scenario.name}${reasons}`);
    });
    console.groupEnd();

    // Scoring détaillé sur un scénario
    const conferenceScenario = MATCHING_TEST_SCENARIOS.conference_paris;
    const scoring = this.engine.scoreProvider(provider, conferenceScenario.input);
    
    console.group("Scoring détaillé (scénario conférence):");
    console.log(`Score total: ${scoring.total}/100 (confidence: ${Math.round(scoring.confidence * 100)}%)`);
    
    Object.entries(scoring.dimensions).forEach(([dim, score]) => {
      console.log(`• ${dim}: ${score.score}/100 - ${score.rationale}`);
    });
    
    if (scoring.strengths.length > 0) {
      console.log("Forces:", scoring.strengths);
    }
    if (scoring.limitations.length > 0) {
      console.log("Limites:", scoring.limitations);
    }
    console.groupEnd();

    console.groupEnd();
    return { provider, validation, scoring };
  }

  // État du système
  getSystemStatus() {
    return {
      v2Enabled: isMatchingV2Enabled(),
      scenarios: Object.keys(MATCHING_TEST_SCENARIOS),
      testProviders: this.testProviders.length,
      mockProviders: getMockProviders(1).length,
      version: "2.0.0"
    };
  }

  // Toggle V2
  toggleV2(enable?: boolean) {
    const newState = enable !== undefined ? enable : !isMatchingV2Enabled();
    enableMatchingV2(newState);
    console.log(`✅ Moteur matching V2 ${newState ? 'activé' : 'désactivé'}`);
    return newState;
  }

  // Aide
  help() {
    console.log(`
🎯 DEBUG API Moteur Matching V2

📋 Commandes disponibles:
- testScenario(key)         Test un scénario prédéfini
- testAllScenarios()        Test tous les scénarios
- testWithMockProviders()   Test avec prestataires mocks
- compareV1VsV2(key)        Compare V1 vs V2 sur scénario
- analyzeProvider(id)       Analyse détaillée d'un prestataire  
- toggleV2()               Active/désactive moteur V2
- getSystemStatus()        État du système
- help()                   Cette aide

📝 Scénarios disponibles:
${Object.keys(MATCHING_TEST_SCENARIOS).map(key => `- ${key}: ${MATCHING_TEST_SCENARIOS[key as keyof typeof MATCHING_TEST_SCENARIOS].name}`).join('\n')}

🎯 Prestataires de test:
${this.testProviders.map(p => `- ${p.id}: ${p.title} (${p.capabilities.specializations.join(', ') || 'généraliste'})`).join('\n')}

💡 Exemples:
- matchingV2Debug.testScenario('conference_paris')
- matchingV2Debug.compareV1VsV2('birthday_dj')
- matchingV2Debug.analyzeProvider('dj-party-pro')
- matchingV2Debug.toggleV2(true)
`);
  }
}

// ============================================================================
// EXPOSITION GLOBALE
// ============================================================================

// Exposer dans window pour accès console
if (typeof window !== 'undefined') {
  const debugAPI = new MatchingDebugAPI();
  
  (window as any).matchingV2Debug = debugAPI;
  
  // Shortcuts
  (window as any).testMatching = debugAPI.testScenario.bind(debugAPI);
  (window as any).compareMatching = debugAPI.compareV1VsV2.bind(debugAPI);
  
  // Message de bienvenue si en développement
  if (process.env.NODE_ENV === 'development') {
    console.log(`
🎯 API Debug Matching V2 chargée!

Tapez 'matchingV2Debug.help()' pour l'aide
Ou 'testMatching("conference_paris")' pour un test rapide

Status: ${debugAPI.getSystemStatus().v2Enabled ? '✅ V2 Actif' : '⚠️  V1 Actif'}
    `);
  }
}

export { MatchingDebugAPI };