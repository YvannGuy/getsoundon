/**
 * Utilitaires de debug pour le moteur de recommandation V2
 * Exposés dans window pour faciliter les tests console
 */

import { createRecommendationEngineV2 } from "./recommendation-engine-v2";
import { 
  enableRecommendationV2, 
  isRecommendationV2Enabled,
  compareV1VsV2Recommendations,
  debugRecommendationProcess
} from "./recommendation-bridge";
import { createEmptyBrief } from "./brief";
import { RecommendationInput } from "./production-types";

// ============================================================================
// SCÉNARIOS DE TEST PRÉ-DÉFINIS
// ============================================================================

export const TEST_SCENARIOS = {
  conference: {
    name: "Conférence 120p intérieur",
    input: {
      eventType: 'conference' as const,
      guestCount: 120,
      indoorOutdoor: 'indoor' as const,
      venueType: 'conference_room' as const,
      speechExpected: true
    }
  },

  cocktail: {
    name: "Cocktail 80p ambiance",
    input: {
      eventType: 'cocktail' as const,
      guestCount: 80,
      indoorOutdoor: 'indoor' as const,
      venueType: 'hotel' as const,
      speechExpected: true,
      dancingExpected: false
    }
  },

  birthday_dance: {
    name: "Anniversaire 100p danse",
    input: {
      eventType: 'birthday' as const,
      guestCount: 100,
      indoorOutdoor: 'indoor' as const,
      venueType: 'private_home' as const,
      dancingExpected: true,
      serviceNeeds: ['sound', 'dj', 'lighting']
    }
  },

  religious_service: {
    name: "Culte avec voix + musique",
    input: {
      eventType: 'religious_service' as const,
      guestCount: 150,
      indoorOutdoor: 'indoor' as const,
      venueType: 'church' as const,
      speechExpected: true,
      livePerformance: true,
      serviceNeeds: ['sound', 'microphones']
    }
  },

  outdoor_showcase: {
    name: "Showcase extérieur couvert",
    input: {
      eventType: 'showcase' as const,
      guestCount: 200,
      indoorOutdoor: 'outdoor' as const,
      isCovered: true,
      livePerformance: true,
      serviceNeeds: ['sound', 'lighting', 'technician']
    }
  },

  simple_private: {
    name: "Soirée privée simple - son + micro",
    input: {
      eventType: 'private_party' as const,
      guestCount: 60,
      indoorOutdoor: 'indoor' as const,
      venueType: 'apartment' as const,
      serviceNeeds: ['sound', 'microphones'],
      simplicityPreference: 'simple' as const
    }
  },

  explicit_request: {
    name: "Demande explicite 2 micros HF",
    input: {
      eventType: 'corporate' as const,
      guestCount: 80,
      explicitEquipmentRequests: [
        {
          category: 'microphones' as const,
          subcategory: 'handheld_wireless',
          quantity: { kind: 'exact' as const, value: 2 },
          qualifiers: ['hf'],
          brand: 'Shure'
        }
      ]
    }
  },

  no_technician: {
    name: "Setup autonome sans technicien",
    input: {
      eventType: 'birthday' as const,
      guestCount: 40,
      indoorOutdoor: 'indoor' as const,
      technicianNeeded: false,
      simplicityPreference: 'simple' as const
    }
  },

  premium_wedding: {
    name: "Mariage premium complet",
    input: {
      eventType: 'wedding' as const,
      guestCount: 150,
      indoorOutdoor: 'outdoor' as const,
      isCovered: true,
      speechExpected: true,
      dancingExpected: true,
      livePerformance: true,
      technicianNeeded: true,
      installationNeeded: true,
      serviceNeeds: ['sound', 'microphones', 'dj', 'lighting', 'led_screen']
    }
  }
};

// ============================================================================
// API DEBUG CONSOLE
// ============================================================================

export class RecommendationDebugAPI {
  private engine = createRecommendationEngineV2();

  // Test d'un scénario prédéfini
  testScenario(scenarioKey: keyof typeof TEST_SCENARIOS) {
    const scenario = TEST_SCENARIOS[scenarioKey];
    if (!scenario) {
      console.error("Scénario non trouvé:", scenarioKey);
      return;
    }

    console.group(`🎯 Test: ${scenario.name}`);
    console.log("Input:", scenario.input);

    const recommendations = this.engine.generateRecommendations(scenario.input);
    
    console.log("Recommandations générées:", recommendations.length);
    recommendations.forEach((rec, i) => {
      console.group(`${rec.tier.toUpperCase()}`);
      console.log("Profil:", {
        speech: rec.productionProfile.speechImportance,
        music: rec.productionProfile.musicImportance,
        dance: rec.productionProfile.danceIntent,
        live: rec.productionProfile.livePerformance
      });
      console.log("Équipements:", {
        son: rec.soundSystem.length,
        micros: rec.microphones.length,
        dj: rec.djSetup.length,
        éclairage: rec.lighting.length,
        vidéo: rec.video.length
      });
      console.log("Services:", rec.services.map(s => s.service));
      console.log("Complexité:", rec.complexity, "- Setup:", rec.setupTime);
      
      if (rec.warnings.length > 0) {
        console.warn("Warnings:", rec.warnings);
      }
      
      if (rec.explicitRequestsHandled.length > 0) {
        console.log("Demandes explicites:", rec.explicitRequestsHandled);
      }
      
      console.groupEnd();
    });

    console.groupEnd();
    return recommendations;
  }

  // Test de tous les scénarios
  testAllScenarios() {
    console.group("🧪 Test de tous les scénarios");
    
    const results: Record<string, any> = {};
    
    Object.keys(TEST_SCENARIOS).forEach(key => {
      try {
        results[key] = this.testScenario(key as keyof typeof TEST_SCENARIOS);
      } catch (error) {
        console.error(`Erreur scénario ${key}:`, error);
        results[key] = null;
      }
    });

    console.log("📊 Résumé des tests:", 
      Object.entries(results).map(([key, result]) => ({
        scenario: key,
        success: !!result,
        tiers: result?.length || 0
      }))
    );

    console.groupEnd();
    return results;
  }

  // Test de montée en charge audience
  testAudienceScaling() {
    console.group("📈 Test dimensionnement audience");

    const audiences = [20, 50, 100, 200, 500, 1000];
    const results = audiences.map(audience => {
      const input: RecommendationInput = {
        eventType: 'corporate',
        guestCount: audience,
        speechExpected: true
      };

      const recommendations = this.engine.generateRecommendations(input);
      const standard = recommendations.find(r => r.tier === 'standard');
      
      const speakers = standard?.soundSystem.find(item => item.subcategory.includes('speakers'));
      
      return {
        audience,
        speakers: speakers?.quantity || 0,
        complexity: standard?.complexity,
        staffing: standard?.staffingRequired
      };
    });

    console.table(results);
    console.groupEnd();
    return results;
  }

  // Comparaison V1 vs V2 sur un scénario
  compareV1V2(scenarioKey: keyof typeof TEST_SCENARIOS) {
    const scenario = TEST_SCENARIOS[scenarioKey];
    if (!scenario) {
      console.error("Scénario non trouvé:", scenarioKey);
      return;
    }

    // Créer un brief équivalent
    const brief = createEmptyBrief();
    brief.eventType.value = scenario.input.eventType || null;
    brief.guestCount.value = scenario.input.guestCount || null;
    brief.indoorOutdoor.value = scenario.input.indoorOutdoor || null;
    brief.venueType.value = scenario.input.venueType || null;
    brief.serviceNeeds.value = scenario.input.serviceNeeds || null;
    brief.deliveryNeeded.value = scenario.input.deliveryNeeded || null;
    brief.installationNeeded.value = scenario.input.installationNeeded || null;
    brief.technicianNeeded.value = scenario.input.technicianNeeded || null;

    const comparison = compareV1VsV2Recommendations(brief);

    console.group(`⚖️ Comparaison V1/V2: ${scenario.name}`);
    
    console.group("V1 (Actuel)");
    comparison.v1.tiers.forEach(tier => {
      console.log(`${tier.title}:`, {
        équipements: tier.items.length,
        services: tier.services.length,
        rationale: tier.rationale
      });
    });
    console.groupEnd();

    console.group("V2 (Nouveau)");
    comparison.v2.tiers.forEach(tier => {
      console.log(`${tier.title}:`, {
        équipements: tier.items.length,
        services: tier.services.length,
        rationale: tier.rationale
      });
    });
    console.groupEnd();

    console.log("Différences:", comparison.comparison);
    console.groupEnd();

    return comparison;
  }

  // État du système
  getSystemStatus() {
    return {
      v2Enabled: isRecommendationV2Enabled(),
      scenarios: Object.keys(TEST_SCENARIOS),
      engineVersion: "2.0.0"
    };
  }

  // Toggle V2
  toggleV2(enable?: boolean) {
    const newState = enable !== undefined ? enable : !isRecommendationV2Enabled();
    enableRecommendationV2(newState);
    console.log(`✅ Moteur V2 ${newState ? 'activé' : 'désactivé'}`);
    return newState;
  }

  // Custom test avec input libre
  testCustom(input: RecommendationInput) {
    console.group("🎛️ Test personnalisé");
    console.log("Input:", input);

    const recommendations = this.engine.generateRecommendations(input);
    
    recommendations.forEach(rec => {
      const validation = this.engine.validateRecommendation(rec);
      const explanations = this.engine.explainRecommendation(rec);
      
      console.group(`${rec.tier.toUpperCase()} (Score: ${Math.round(validation.quality.credibilityScore * 100)}%)`);
      console.log("Explication:", explanations);
      console.log("Validation:", validation);
      console.groupEnd();
    });

    console.groupEnd();
    return recommendations;
  }

  // Aide
  help() {
    console.log(`
🎛️ DEBUG API Moteur Recommandation V2

📋 Commandes disponibles:
- testScenario(key)     Test un scénario prédéfini
- testAllScenarios()    Test tous les scénarios  
- testAudienceScaling() Test dimensionnement audience
- compareV1V2(key)      Compare V1 vs V2 sur un scénario
- testCustom(input)     Test avec input personnalisé
- toggleV2()            Active/désactive moteur V2
- getSystemStatus()     État du système
- help()                Cette aide

📝 Scénarios disponibles:
${Object.keys(TEST_SCENARIOS).map(key => `- ${key}: ${TEST_SCENARIOS[key as keyof typeof TEST_SCENARIOS].name}`).join('\n')}

💡 Exemples:
- debug.testScenario('conference')
- debug.compareV1V2('birthday_dance')  
- debug.testCustom({eventType: 'wedding', guestCount: 200})
`);
  }
}

// ============================================================================
// EXPOSITION GLOBALE
// ============================================================================

// Exposer dans window pour accès console
if (typeof window !== 'undefined') {
  const debugAPI = new RecommendationDebugAPI();
  
  (window as any).recommendationDebug = debugAPI;
  
  // Shortcuts
  (window as any).testReco = debugAPI.testScenario.bind(debugAPI);
  (window as any).compareReco = debugAPI.compareV1V2.bind(debugAPI);
  
  // Message de bienvenue si en développement
  if (process.env.NODE_ENV === 'development') {
    console.log(`
🎛️ API Debug Recommandation V2 chargée!

Tapez 'recommendationDebug.help()' pour l'aide
Ou 'testReco("conference")' pour un test rapide
    `);
  }
}

export { RecommendationDebugAPI };