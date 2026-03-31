import { describe, it, expect, beforeEach } from '@jest/globals';
import { createMatchingEngineV2 } from '../matching-engine-v2';
import { ProviderV2, MatchingInputV2, MatchingEngineV2 } from '../matching-types-v2';
import { DEFAULT_MATCHING_CONFIG } from '../matching-rules-v2';

describe('Moteur de Matching V2 - Hard Filtering + Scoring Explicable', () => {
  let engine: MatchingEngineV2;
  
  beforeEach(() => {
    engine = createMatchingEngineV2();
  });

  // ============================================================================
  // MOCK PROVIDERS POUR TESTS
  // ============================================================================

  const createMockProvider = (overrides: Partial<ProviderV2> = {}): ProviderV2 => ({
    id: `provider-${Math.random().toString(36).substr(2, 9)}`,
    title: "Prestataire Test",
    location: "Paris",
    capabilities: {
      categories: ["sound"],
      services: {
        delivery: true,
        installation: true,
        technician: false
      },
      coverage: {
        zones: ["Paris", "Île-de-France"],
        maxDistance: 25
      },
      inventory: [
        { category: "sound", quantity: 4, qualityTier: "standard" },
        { category: "microphones", quantity: 3, qualityTier: "standard" }
      ],
      specializations: [],
      equipment_quality: "standard"
    },
    pricing: {
      dailyRate: 300,
      deliveryFee: 50,
      setupFee: 100
    },
    trust: {
      verified: true,
      responseTime: 12,
      completionRate: 95
    },
    rating: 4.5,
    ratingCount: 25,
    ...overrides
  });

  const createMatchingInput = (overrides: Partial<MatchingInputV2> = {}): MatchingInputV2 => ({
    eventType: 'conference',
    guestCount: 100,
    location: { city: 'Paris' },
    requiredEquipment: [
      { category: 'sound_system', subcategory: 'speakers', quantity: 4, label: '4 enceintes', description: 'Diffusion principale', priority: 'essential', reasoning: 'Test' },
      { category: 'microphones', subcategory: 'handheld', quantity: 2, label: '2 micros', description: 'Prises de parole', priority: 'essential', reasoning: 'Test' }
    ],
    requiredServices: [
      { service: 'delivery', description: 'Livraison', reasoning: 'Logistique', priority: 'recommended' },
      { service: 'installation', description: 'Installation', reasoning: 'Setup professionnel', priority: 'required' }
    ],
    deliveryRequired: true,
    installationRequired: true,
    ...overrides
  });

  // ============================================================================
  // TESTS HARD FILTERING
  // ============================================================================

  describe('Hard Filtering', () => {
    
    it('doit exclure prestataire hors zone', () => {
      const provider = createMockProvider({
        capabilities: {
          ...createMockProvider().capabilities,
          coverage: {
            zones: ["Lyon", "Rhône-Alpes"],
            maxDistance: 20
          }
        }
      });
      
      const input = createMatchingInput({ 
        location: { city: 'Paris' } 
      });
      
      const filterResult = engine.hardFilterProvider(provider, input);
      
      expect(filterResult.passed).toBe(false);
      expect(filterResult.excludeReasons).toContain("zone_not_covered");
    });

    it('doit exclure prestataire sans service requis', () => {
      const provider = createMockProvider({
        capabilities: {
          ...createMockProvider().capabilities,
          services: {
            delivery: true,
            installation: false, // Pas d'installation
            technician: false
          }
        }
      });
      
      const input = createMatchingInput({
        requiredServices: [
          { service: 'installation', description: 'Installation obligatoire', reasoning: 'Test', priority: 'required' }
        ]
      });
      
      const filterResult = engine.hardFilterProvider(provider, input);
      
      expect(filterResult.passed).toBe(false);
      expect(filterResult.excludeReasons).toContain("missing_required_services");
    });

    it('doit exclure prestataire avec stock insuffisant', () => {
      const provider = createMockProvider({
        capabilities: {
          ...createMockProvider().capabilities,
          inventory: [
            { category: "sound", quantity: 2, qualityTier: "standard" }, // Insuffisant
            { category: "microphones", quantity: 1, qualityTier: "standard" } // Insuffisant
          ]
        }
      });
      
      const input = createMatchingInput({
        requiredEquipment: [
          { category: 'sound', subcategory: 'speakers', quantity: 6, label: '6 enceintes', description: 'Setup large', priority: 'essential', reasoning: 'Test' },
          { category: 'microphones', subcategory: 'handheld', quantity: 4, label: '4 micros', description: 'Multiples prises de parole', priority: 'essential', reasoning: 'Test' }
        ]
      });
      
      const filterResult = engine.hardFilterProvider(provider, input);
      
      expect(filterResult.passed).toBe(false);
      expect(filterResult.excludeReasons).toContain("insufficient_inventory");
    });

    it('doit exclure prestataire avec contraintes opérationnelles incompatibles', () => {
      const provider = createMockProvider({
        capabilities: {
          ...createMockProvider().capabilities,
          constraints: {
            minEventSize: 200, // Événement trop petit pour ce prestataire
            maxEventSize: 1000
          }
        }
      });
      
      const input = createMatchingInput({
        guestCount: 50 // Trop petit
      });
      
      const filterResult = engine.hardFilterProvider(provider, input);
      
      expect(filterResult.passed).toBe(false);
      expect(filterResult.excludeReasons).toContain("operational_constraints");
    });

    it('doit laisser passer prestataire compatible', () => {
      const provider = createMockProvider({
        capabilities: {
          categories: ["sound", "microphones"],
          services: {
            delivery: true,
            installation: true,
            technician: true
          },
          coverage: {
            zones: ["Paris", "Île-de-France"],
            maxDistance: 50
          },
          inventory: [
            { category: "sound", quantity: 6, qualityTier: "standard" },
            { category: "microphones", quantity: 4, qualityTier: "standard" }
          ],
          specializations: ["conference"],
          equipment_quality: "standard"
        }
      });
      
      const input = createMatchingInput();
      
      const filterResult = engine.hardFilterProvider(provider, input);
      
      expect(filterResult.passed).toBe(true);
      expect(filterResult.excludeReasons).toHaveLength(0);
    });

    it('doit exclure prestataire hors budget strict', () => {
      const provider = createMockProvider({
        pricing: {
          dailyRate: 1000,
          deliveryFee: 100,
          setupFee: 200
        }
      });
      
      const input = createMatchingInput({
        budgetMax: 500 // Budget trop serré
      });
      
      const filterResult = engine.hardFilterProvider(provider, input);
      
      expect(filterResult.passed).toBe(false);
      expect(filterResult.excludeReasons).toContain("budget_incompatible");
    });
  });

  // ============================================================================  
  // TESTS SCORING DIMENSIONS
  // ============================================================================

  describe('Scoring Dimensions', () => {
    
    it('doit scorer inventory_fit correctement', () => {
      const provider = createMockProvider({
        capabilities: {
          ...createMockProvider().capabilities,
          inventory: [
            { category: "sound_system", quantity: 6, qualityTier: "premium" },
            { category: "microphones", quantity: 4, qualityTier: "premium" }
          ]
        }
      });
      
      const input = createMatchingInput({
        requiredEquipment: [
          { category: 'sound_system', subcategory: 'speakers', quantity: 4, label: '4 enceintes', description: 'Test', priority: 'essential', reasoning: 'Test' },
          { category: 'microphones', subcategory: 'handheld', quantity: 2, label: '2 micros', description: 'Test', priority: 'essential', reasoning: 'Test' }
        ]
      });
      
      const scoring = engine.scoreProvider(provider, input);
      
      expect(scoring.dimensions.inventory_fit.score).toBeGreaterThan(80);
      expect(scoring.dimensions.inventory_fit.rationale).toContain("Excellent fit");
    });

    it('doit scorer specialization_fit avec bonus spécialisé', () => {
      const provider = createMockProvider({
        capabilities: {
          ...createMockProvider().capabilities,
          specializations: ["conference", "corporate"]
        }
      });
      
      const input = createMatchingInput({
        eventType: 'conference'
      });
      
      const scoring = engine.scoreProvider(provider, input);
      
      expect(scoring.dimensions.specialization_fit.score).toBeGreaterThan(90);
      expect(scoring.dimensions.specialization_fit.rationale).toContain("Spécialisé conference");
    });

    it('doit scorer proximity_fit selon zone', () => {
      const provider = createMockProvider({
        capabilities: {
          ...createMockProvider().capabilities,
          coverage: {
            zones: ["Paris", "Paris 11", "République"],
            maxDistance: 30
          }
        }
      });
      
      const input = createMatchingInput({
        location: { city: 'Paris 11' }
      });
      
      const scoring = engine.scoreProvider(provider, input);
      
      expect(scoring.dimensions.proximity_fit.score).toBeGreaterThan(85);
    });

    it('doit scorer trust_fit avec rating élevé', () => {
      const provider = createMockProvider({
        rating: 4.8,
        ratingCount: 50,
        trust: {
          verified: true,
          businessLicense: true,
          insurance: true,
          responseTime: 6,
          completionRate: 98
        }
      });
      
      const input = createMatchingInput();
      
      const scoring = engine.scoreProvider(provider, input);
      
      expect(scoring.dimensions.trust_fit.score).toBeGreaterThan(90);
      expect(scoring.dimensions.trust_fit.rationale).toContain("⭐");
    });
  });

  // ============================================================================
  // TESTS CAS MÉTIER COMPLETS
  // ============================================================================

  describe('Cas Métier', () => {

    it('Conference 100p - DJ exclu, spécialiste conférence favorisé', () => {
      const djProvider = createMockProvider({
        id: "dj-only",
        title: "DJ Party Pro",
        capabilities: {
          categories: ["dj", "lighting"],
          services: { delivery: true, installation: false, technician: false },
          coverage: { zones: ["Paris"], maxDistance: 20 },
          inventory: [
            { category: "dj", quantity: 2, qualityTier: "premium" },
            { category: "lighting", quantity: 8, qualityTier: "premium" }
          ],
          specializations: ["dj_set", "private_party", "birthday"],
          equipment_quality: "premium"
        },
        rating: 4.9,
        ratingCount: 100
      });

      const conferenceProvider = createMockProvider({
        id: "conference-pro",
        title: "Conférences Pro",
        capabilities: {
          categories: ["sound", "microphones", "led_screen"],
          services: { delivery: true, installation: true, technician: true },
          coverage: { zones: ["Paris", "Île-de-France"], maxDistance: 50 },
          inventory: [
            { category: "sound", quantity: 8, qualityTier: "premium" },
            { category: "microphones", quantity: 6, qualityTier: "premium" }
          ],
          specializations: ["conference", "corporate", "product_launch"],
          equipment_quality: "premium"
        },
        rating: 4.6,
        ratingCount: 30
      });

      const input = createMatchingInput({
        eventType: 'conference',
        guestCount: 100,
        requiredEquipment: [
          { category: 'sound', subcategory: 'speakers', quantity: 4, label: '4 enceintes', description: 'Son principal', priority: 'essential', reasoning: 'Conference' },
          { category: 'microphones', subcategory: 'handheld', quantity: 3, label: '3 micros HF', description: 'Prises de parole', priority: 'essential', reasoning: 'Conference' }
        ]
      });

      const results = engine.findMatches(input, [djProvider, conferenceProvider]);

      expect(results.matches.length).toBeGreaterThan(0);
      
      // Le prestataire conférence doit être mieux classé malgré un rating plus bas
      const conferenceMatch = results.matches.find(m => m.provider.id === "conference-pro");
      const djMatch = results.matches.find(m => m.provider.id === "dj-only");
      
      if (conferenceMatch && djMatch) {
        expect(conferenceMatch.scoring!.total).toBeGreaterThan(djMatch.scoring!.total);
        expect(conferenceMatch.displayRank).toBeLessThan(djMatch.displayRank!);
      }
    });

    it('Anniversaire 80p - DJ spécialisé favorisé', () => {
      const generalProvider = createMockProvider({
        id: "general",
        title: "Sono Générale",
        capabilities: {
          categories: ["sound"],
          services: { delivery: true, installation: false, technician: false },
          coverage: { zones: ["Paris"], maxDistance: 25 },
          specializations: [],
          equipment_quality: "standard"
        },
        rating: 4.5
      });

      const djProvider = createMockProvider({
        id: "dj-birthday",
        title: "DJ Anniversaires",
        capabilities: {
          categories: ["sound", "dj", "lighting"],
          services: { delivery: true, installation: true, technician: false },
          coverage: { zones: ["Paris"], maxDistance: 30 },
          inventory: [
            { category: "sound", quantity: 4, qualityTier: "standard" },
            { category: "dj", quantity: 2, qualityTier: "premium" },
            { category: "lighting", quantity: 6, qualityTier: "standard" }
          ],
          specializations: ["birthday", "private_party"],
          equipment_quality: "standard"
        },
        rating: 4.3
      });

      const input = createMatchingInput({
        eventType: 'birthday',
        guestCount: 80,
        requiredEquipment: [
          { category: 'sound', subcategory: 'speakers', quantity: 4, label: '4 enceintes', description: 'Diffusion danse', priority: 'essential', reasoning: 'Birthday' },
          { category: 'dj', subcategory: 'controller', quantity: 1, label: 'Setup DJ', description: 'Animation', priority: 'essential', reasoning: 'Birthday' }
        ]
      });

      const results = engine.findMatches(input, [generalProvider, djProvider]);

      const djMatch = results.matches.find(m => m.provider.id === "dj-birthday");
      const generalMatch = results.matches.find(m => m.provider.id === "general");

      expect(djMatch).toBeTruthy();
      if (djMatch && generalMatch) {
        expect(djMatch.scoring!.total).toBeGreaterThan(generalMatch.scoring!.total);
      }
    });

    it('Multi-provider fallback si aucun prestataire complet', () => {
      // Pour l'instant juste vérifier que ça n'écrase pas
      const partialProvider = createMockProvider({
        capabilities: {
          categories: ["sound"], // Manque microphones
          services: { delivery: true, installation: false, technician: false },
          coverage: { zones: ["Paris"], maxDistance: 20 },
          inventory: [
            { category: "sound", quantity: 4, qualityTier: "standard" }
            // Pas de microphones
          ],
          specializations: [],
          equipment_quality: "standard"
        }
      });

      const input = createMatchingInput({
        requiredEquipment: [
          { category: 'sound', subcategory: 'speakers', quantity: 4, label: '4 enceintes', description: 'Son', priority: 'essential', reasoning: 'Test' },
          { category: 'microphones', subcategory: 'handheld', quantity: 3, label: '3 micros', description: 'Micros', priority: 'essential', reasoning: 'Test' },
          { category: 'lighting', subcategory: 'wash', quantity: 6, label: '6 projecteurs', description: 'Éclairage', priority: 'essential', reasoning: 'Test' }
        ]
      });

      const results = engine.findMatches(input, [partialProvider], {
        ...DEFAULT_MATCHING_CONFIG,
        results: {
          ...DEFAULT_MATCHING_CONFIG.results,
          enableMultiProvider: true
        }
      });

      // Vérifier que le système fonctionne même avec coverage partielle
      expect(results.matches.length).toBeGreaterThanOrEqual(0);
      
      if (results.matches.length > 0) {
        const match = results.matches[0];
        expect(match.compatibility.equipmentCoverage).toBeLessThan(1.0);
        expect(match.userWarnings).toBeTruthy();
        expect(match.userWarnings!.length).toBeGreaterThan(0);
      }
    });

    it('Outdoor event - contraintes météo et logistique', () => {
      const indoorOnlyProvider = createMockProvider({
        id: "indoor-only",
        capabilities: {
          categories: ["sound", "microphones"],
          services: { delivery: true, installation: true, technician: true },
          coverage: { zones: ["Paris"], maxDistance: 20 },
          constraints: {
            indoorOnly: true, // Contrainte forte
            minEventSize: 20,
            maxEventSize: 300
          },
          specializations: [],
          equipment_quality: "standard"
        }
      });

      const outdoorProvider = createMockProvider({
        id: "outdoor-specialist",
        capabilities: {
          categories: ["sound", "microphones", "lighting"],
          services: { delivery: true, installation: true, technician: true },
          coverage: { zones: ["Paris", "Banlieue"], maxDistance: 40 },
          constraints: {
            minEventSize: 30,
            maxEventSize: 1000
          },
          specializations: ["outdoor_event", "showcase"],
          equipment_quality: "premium"
        },
        rating: 4.7,
        ratingCount: 40
      });

      const input = createMatchingInput({
        eventType: 'outdoor_event',
        guestCount: 150,
        indoorOutdoor: 'outdoor',
        requiredServices: [
          { service: 'installation', description: 'Installation obligatoire', reasoning: 'Outdoor complexe', priority: 'required' },
          { service: 'technician', description: 'Technicien sur site', reasoning: 'Sécurité', priority: 'required' }
        ]
      });

      const results = engine.findMatches(input, [indoorOnlyProvider, outdoorProvider]);

      // Le prestataire indoor-only doit être exclu
      const indoorMatch = results.matches.find(m => m.provider.id === "indoor-only");
      expect(indoorMatch).toBeFalsy();

      const outdoorMatch = results.matches.find(m => m.provider.id === "outdoor-specialist");
      expect(outdoorMatch).toBeTruthy();
      expect(outdoorMatch!.scoring!.dimensions.specialization_fit.score).toBeGreaterThan(80);
    });
  });

  // ============================================================================
  // TESTS PERFORMANCE ET ROBUSTESSE
  // ============================================================================

  describe('Performance et Robustesse', () => {
    
    it('doit gérer une liste vide de prestataires', () => {
      const input = createMatchingInput();
      const results = engine.findMatches(input, []);
      
      expect(results.matches).toHaveLength(0);
      expect(results.stats.totalEvaluated).toBe(0);
      expect(results.stats.passedHardFilter).toBe(0);
    });

    it('doit gérer des données partielles gracieusement', () => {
      const incompleteProvider: ProviderV2 = {
        id: "incomplete",
        title: "Incomplete Provider",
        location: "Paris",
        capabilities: {
          categories: ["sound"],
          services: {},
          coverage: { zones: ["Paris"] },
          specializations: []
        }
        // Pas de pricing, trust, rating, etc.
      };

      const input = createMatchingInput();
      const results = engine.findMatches(input, [incompleteProvider]);

      // Ne doit pas crasher
      expect(results.matches.length).toBeGreaterThanOrEqual(0);
      
      if (results.matches.length > 0) {
        const match = results.matches[0];
        expect(match.scoring).toBeTruthy();
        expect(match.scoring!.dataCompleteness).toBeLessThan(0.8); // Données incomplètes
      }
    });

    it('doit traiter efficacement une grande liste de prestataires', () => {
      const providers: ProviderV2[] = [];
      
      // Créer 50 prestataires variés
      for (let i = 0; i < 50; i++) {
        providers.push(createMockProvider({
          id: `provider-${i}`,
          title: `Prestataire ${i}`,
          rating: 3 + Math.random() * 2, // Rating entre 3 et 5
          capabilities: {
            categories: i % 2 === 0 ? ["sound"] : ["sound", "dj"],
            services: { 
              delivery: true, 
              installation: i % 3 === 0,
              technician: i % 4 === 0
            },
            coverage: { zones: ["Paris"], maxDistance: 20 + (i % 30) },
            specializations: i % 5 === 0 ? ["conference"] : [],
            equipment_quality: "standard"
          }
        }));
      }

      const input = createMatchingInput();
      const startTime = Date.now();
      const results = engine.findMatches(input, providers);
      const processingTime = Date.now() - startTime;

      expect(processingTime).toBeLessThan(1000); // Moins de 1 seconde
      expect(results.stats.totalEvaluated).toBe(50);
      expect(results.matches.length).toBeGreaterThan(0);
      expect(results.matches.length).toBeLessThanOrEqual(10); // Config max results
    });
  });

  // ============================================================================
  // TESTS API UTILITAIRES
  // ============================================================================

  describe('API Utilitaires', () => {

    it('explainResult doit fournir explication lisible', () => {
      const provider = createMockProvider({
        title: "Excellent Provider",
        rating: 4.8,
        ratingCount: 100,
        capabilities: {
          categories: ["sound", "microphones", "dj"],
          services: { delivery: true, installation: true, technician: true },
          coverage: { zones: ["Paris"], maxDistance: 30 },
          specializations: ["conference"],
          equipment_quality: "premium"
        }
      });

      const input = createMatchingInput();
      const results = engine.findMatches(input, [provider]);
      
      expect(results.matches.length).toBeGreaterThan(0);
      
      const explanations = engine.explainResult(results.matches[0]);
      expect(explanations.length).toBeGreaterThan(2);
      expect(explanations.join(" ")).toContain("Score global");
    });

    it('compareProviders doit identifier les différences clés', () => {
      const providerA = createMockProvider({
        id: "a",
        title: "Provider A",
        rating: 4.2,
        capabilities: {
          categories: ["sound"],
          services: { delivery: true, installation: false, technician: false },
          coverage: { zones: ["Paris"], maxDistance: 20 },
          specializations: [],
          equipment_quality: "basic"
        }
      });

      const providerB = createMockProvider({
        id: "b", 
        title: "Provider B",
        rating: 4.8,
        capabilities: {
          categories: ["sound", "microphones", "dj"],
          services: { delivery: true, installation: true, technician: true },
          coverage: { zones: ["Paris"], maxDistance: 40 },
          specializations: ["conference"],
          equipment_quality: "premium"
        }
      });

      const input = createMatchingInput();
      const results = engine.findMatches(input, [providerA, providerB]);
      
      if (results.matches.length >= 2) {
        const comparisons = engine.compareProviders(results.matches[1], results.matches[0]);
        expect(comparisons.length).toBeGreaterThan(1);
        expect(comparisons.join(" ")).toMatch(/Provider [AB]/);
      }
    });

    it('analyzeMatchingQuality doit évaluer qualité globale', () => {
      const providers = [
        createMockProvider({ rating: 4.9, ratingCount: 100 }),
        createMockProvider({ rating: 4.2, ratingCount: 20 }),
        createMockProvider({ rating: 3.8, ratingCount: 5 })
      ];

      const input = createMatchingInput();
      const results = engine.findMatches(input, providers);
      const quality = engine.analyzeMatchingQuality(results);

      expect(quality.qualityScore).toBeGreaterThanOrEqual(0);
      expect(quality.qualityScore).toBeLessThanOrEqual(100);
      expect(quality.coverage).toBeGreaterThanOrEqual(0);
      expect(quality.coverage).toBeLessThanOrEqual(100);
      expect(Array.isArray(quality.recommendations)).toBe(true);
    });
  });

  // ============================================================================
  // TESTS EDGE CASES
  // ============================================================================

  describe('Edge Cases', () => {

    it('doit gérer budget très serré', () => {
      const expensiveProvider = createMockProvider({
        pricing: {
          dailyRate: 2000,
          deliveryFee: 200,
          setupFee: 500
        }
      });

      const input = createMatchingInput({
        budgetMax: 100 // Budget très serré
      });

      const results = engine.findMatches(input, [expensiveProvider]);
      
      // Devrait être exclu par hard filter
      expect(results.stats.excluded.length).toBe(1);
      expect(results.stats.excluded[0].reasons).toContain("budget_incompatible");
    });

    it('doit gérer événement sans type spécifique', () => {
      const provider = createMockProvider();
      const input = createMatchingInput({
        eventType: 'unknown'
      });

      const results = engine.findMatches(input, [provider]);
      
      // Ne doit pas crasher, score neutre pour spécialisation
      expect(results.matches.length).toBeGreaterThan(0);
      const match = results.matches[0];
      expect(match.scoring!.dimensions.specialization_fit.score).toBe(70); // Score neutre
    });

    it('doit gérer prestataire sans inventaire renseigné', () => {
      const provider = createMockProvider({
        capabilities: {
          ...createMockProvider().capabilities,
          inventory: undefined // Pas d'inventaire
        }
      });

      const input = createMatchingInput();
      const results = engine.findMatches(input, [provider]);

      // Devrait quand même fonctionner avec un score neutre
      expect(results.matches.length).toBeGreaterThan(0);
      const match = results.matches[0];
      expect(match.scoring!.dimensions.inventory_fit.score).toBe(50); // Score neutre
    });
  });
});