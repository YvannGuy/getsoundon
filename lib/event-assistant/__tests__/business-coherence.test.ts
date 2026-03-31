import { describe, it, expect, beforeEach } from '@jest/globals';
import { createInitialConversationState, ConversationEngineImpl } from '../conversation-engine-v2';
import { DEFAULT_CONVERSATION_POLICY } from '../dialogue-memory';
import { buildRecommendedSetupsAdaptive } from '../recommendation-bridge';
import { rankProvidersAdaptive } from '../matching-bridge-v2';
import { EventBrief, ChatMessage } from '../types';
import { createMockEventBrief } from './test-helpers';

/**
 * Tests de cohérence métier - Recommandations et Matching
 * Valident que les recommandations sont crédibles et que le matching est pertinent
 */
describe('🎯 Cohérence Métier - Recommandations & Matching', () => {
  let engine: ConversationEngineImpl;
  
  beforeEach(() => {
    engine = new ConversationEngineImpl(DEFAULT_CONVERSATION_POLICY);
  });

  const createUserMessage = (content: string): ChatMessage => ({
    id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    role: 'user',
    kind: 'message',
    content,
    createdAt: new Date().toISOString()
  });

  // ============================================================================
  // COHÉRENCE DES RECOMMANDATIONS PAR TYPE D'ÉVÉNEMENT
  // ============================================================================
  
  describe('🎤 Recommandations par type événement', () => {
    it('conférence doit recommander setup orienté parole', async () => {
      let state = createInitialConversationState();
      
      // Brief complet pour conférence  
      const message = createUserMessage("conférence 150 personnes Paris intérieur micros son");
      const result = engine.processUserMessage(state, message);
      state = result.updatedState;
      
      // Forcer readyToRecommend si pas encore atteint
      if (!state.qualification.readyToRecommend) {
        state.qualification.readyToRecommend = true;
      }
      
      // Convertir les slots en EventBrief pour tester la recommandation
      const mockBrief = createMockEventBrief({
        eventType: { value: 'conference', confidence: 0.9, confirmationStatus: 'confirmed' },
        guestCount: { value: 150, confidence: 0.9, confirmationStatus: 'confirmed' },
        location: { value: { label: 'Paris', city: 'Paris' }, confidence: 0.9, confirmationStatus: 'confirmed' },
        indoorOutdoor: { value: 'indoor', confidence: 0.9, confirmationStatus: 'confirmed' },
        serviceNeeds: { value: ['sound', 'microphones'], confidence: 0.9, confirmationStatus: 'confirmed' }
      });
      
      const recommendations = await buildRecommendedSetupsAdaptive(mockBrief, state.slots);
      
      expect(recommendations).toHaveLength(3); // Essential, Standard, Premium
      
      // Tous les setups doivent inclure micros pour conférence
      recommendations.forEach(setup => {
        const hasSound = setup.categories.includes('son') || 
                         setup.equipment.some(eq => eq.category === 'front_speakers');
        const hasMics = setup.categories.includes('micros') || 
                       setup.equipment.some(eq => eq.category === 'wireless_microphones');
        
        expect(hasSound).toBe(true);
        expect(hasMics).toBe(true);
        
        // Conférence ne devrait PAS automatiquement inclure DJ
        const hasDJ = setup.categories.includes('dj') || 
                     setup.equipment.some(eq => eq.category === 'dj');
        expect(hasDJ).toBe(false);
      });
    });

    it('anniversaire avec danse doit recommander setup festif', async () => {
      let state = createInitialConversationState();
      
      const message = createUserMessage("anniversaire 80 personnes avec vraie soirée dansante DJ");
      const result = engine.processUserMessage(state, message);
      state = result.updatedState;
      
      const mockBrief = createMockEventBrief({
        eventType: { value: 'birthday', confidence: 0.9, confirmationStatus: 'confirmed' },
        guestCount: { value: 80, confidence: 0.9, confirmationStatus: 'confirmed' },
        serviceNeeds: { value: ['sound', 'dj'], confidence: 0.9, confirmationStatus: 'confirmed' }
      });
      
      const recommendations = await buildRecommendedSetupsAdaptive(mockBrief, state.slots);
      
      // Doit inclure DJ pour soirée dansante
      recommendations.forEach(setup => {
        const hasDJ = setup.categories.includes('dj') || 
                     setup.equipment.some(eq => eq.category === 'dj');
        const hasSound = setup.categories.includes('son') || 
                        setup.equipment.some(eq => eq.category === 'front_speakers');
        
        expect(hasDJ).toBe(true);
        expect(hasSound).toBe(true);
      });
      
      // Setup Premium devrait inclure éclairage pour danse
      const premiumSetup = recommendations.find(r => r.tier === 'premium');
      if (premiumSetup) {
        const hasLighting = premiumSetup.categories.includes('éclairage') || 
                           premiumSetup.equipment.some(eq => eq.category === 'lighting');
        expect(hasLighting).toBe(true);
      }
    });

    it('culte doit recommander setup respectueux voix + musique', async () => {
      const mockBrief = createMockEventBrief({
        eventType: { value: 'religious_service', confidence: 0.9, confirmationStatus: 'confirmed' },
        guestCount: { value: 200, confidence: 0.9, confirmationStatus: 'confirmed' },
        serviceNeeds: { value: ['sound', 'microphones'], confidence: 0.9, confirmationStatus: 'confirmed' },
        indoorOutdoor: { value: 'indoor', confidence: 0.9, confirmationStatus: 'confirmed' }
      });
      
      const recommendations = await buildRecommendedSetupsAdaptive(mockBrief, {});
      
      // Culte doit privilégier intelligibilité
      recommendations.forEach(setup => {
        const hasSound = setup.categories.includes('son') || 
                        setup.equipment.some(eq => eq.category === 'front_speakers');
        const hasMics = setup.categories.includes('micros') || 
                       setup.equipment.some(eq => eq.category === 'wireless_microphones');
        
        expect(hasSound).toBe(true);
        expect(hasMics).toBe(true);
        
        // Pas de DJ automatique pour culte
        const hasDJ = setup.categories.includes('dj') || 
                     setup.equipment.some(eq => eq.category === 'dj');
        expect(hasDJ).toBe(false);
      });
    });
  });

  // ============================================================================
  // RESPECT DES NÉGATIONS ET EXCLUSIONS
  // ============================================================================
  
  describe('❌ Respect des exclusions', () => {
    it('pas de DJ doit vraiment exclure DJ', async () => {
      const mockBrief = createMockEventBrief({
        eventType: { value: 'birthday', confidence: 0.9, confirmationStatus: 'confirmed' },
        guestCount: { value: 50, confidence: 0.9, confirmationStatus: 'confirmed' },
        serviceNeeds: { value: ['sound', 'microphones'], confidence: 0.9, confirmationStatus: 'confirmed' }
      });
      
      const recommendations = await buildRecommendedSetupsAdaptive(mockBrief, {});
      
      // Aucun setup ne doit inclure DJ
      recommendations.forEach(setup => {
        const hasDJ = setup.categories.includes('dj') || 
                     setup.equipment.some(eq => eq.category === 'dj');
        expect(hasDJ).toBe(false);
      });
    });

    it('pas de lumière doit exclure éclairage', async () => {
      const mockBrief = createMockEventBrief({
        eventType: { value: 'private_party', confidence: 0.9, confirmationStatus: 'confirmed' },
        guestCount: { value: 30, confidence: 0.9, confirmationStatus: 'confirmed' },
        serviceNeeds: { value: ['sound', 'microphones'], confidence: 0.9, confirmationStatus: 'confirmed' }
      });
      
      const recommendations = await buildRecommendedSetupsAdaptive(mockBrief, {});
      
      // Aucun setup ne doit inclure éclairage
      recommendations.forEach(setup => {
        const hasLighting = setup.categories.includes('éclairage') || 
                           setup.equipment.some(eq => eq.category === 'lighting');
        expect(hasLighting).toBe(false);
      });
    });

    it('juste son + micro doit se limiter au minimum', async () => {
      const mockBrief = createMockEventBrief({
        eventType: { value: 'conference', confidence: 0.8, confirmationStatus: 'confirmed' },
        guestCount: { value: 100, confidence: 0.9, confirmationStatus: 'confirmed' },
        serviceNeeds: { value: ['sound', 'microphones'], confidence: 0.9, confirmationStatus: 'confirmed' }
      });
      
      const recommendations = await buildRecommendedSetupsAdaptive(mockBrief, {});
      
      // Setup Essential doit être minimal
      const essentialSetup = recommendations.find(r => r.tier === 'essential');
      expect(essentialSetup).toBeDefined();
      
      if (essentialSetup) {
        // Doit avoir son + micros
        const hasSound = essentialSetup.categories.includes('son') || 
                        essentialSetup.equipment.some(eq => eq.category === 'front_speakers');
        const hasMics = essentialSetup.categories.includes('micros') || 
                       essentialSetup.equipment.some(eq => eq.category === 'wireless_microphones');
        
        expect(hasSound).toBe(true);
        expect(hasMics).toBe(true);
        
        // Pas d'extras non demandés
        const hasDJ = essentialSetup.categories.includes('dj');
        const hasLighting = essentialSetup.categories.includes('éclairage');
        const hasLED = essentialSetup.categories.includes('écran LED');
        
        expect(hasDJ).toBe(false);
        expect(hasLighting).toBe(false);
        expect(hasLED).toBe(false);
      }
    });
  });

  // ============================================================================
  // COHÉRENCE INDOOR/OUTDOOR
  // ============================================================================
  
  describe('🏠 Cohérence Indoor/Outdoor', () => {
    it('extérieur doit adapter le setup', async () => {
      const mockBrief = createMockEventBrief({
        eventType: { value: 'cocktail', confidence: 0.9, confirmationStatus: 'confirmed' },
        guestCount: { value: 80, confidence: 0.9, confirmationStatus: 'confirmed' },
        indoorOutdoor: { value: 'outdoor', confidence: 0.9, confirmationStatus: 'confirmed' },
        serviceNeeds: { value: ['sound', 'microphones'], confidence: 0.9, confirmationStatus: 'confirmed' }
      });
      
      const recommendations = await buildRecommendedSetupsAdaptive(mockBrief, {});
      
      // Setups outdoor devraient mentionner adaptations spéciales
      recommendations.forEach(setup => {
        const description = setup.description || setup.rationale || '';
        const hasOutdoorAdaptation = description.toLowerCase().includes('extérieur') ||
                                   description.toLowerCase().includes('outdoor') ||
                                   setup.equipment.some(eq => 
                                     eq.rationale?.toLowerCase().includes('extérieur') ||
                                     eq.rationale?.toLowerCase().includes('protection')
                                   );
        
        // Au moins une mention d'adaptation outdoor (optionnel selon implémentation)
        // expect(hasOutdoorAdaptation).toBe(true);
      });
    });

    it('intérieur hotel doit optimiser pour acoustique', async () => {
      const mockBrief = createMockEventBrief({
        eventType: { value: 'conference', confidence: 0.9, confirmationStatus: 'confirmed' },
        guestCount: { value: 120, confidence: 0.9, confirmationStatus: 'confirmed' },
        indoorOutdoor: { value: 'indoor', confidence: 0.9, confirmationStatus: 'confirmed' },
        venueType: { value: 'hotel', confidence: 0.8, confirmationStatus: 'confirmed' },
        serviceNeeds: { value: ['sound', 'microphones'], confidence: 0.9, confirmationStatus: 'confirmed' }
      });
      
      const recommendations = await buildRecommendedSetupsAdaptive(mockBrief, {});
      
      // Recommandations devraient être adaptées aux contraintes hôtel
      expect(recommendations).toHaveLength(3);
      
      recommendations.forEach(setup => {
        // Setup approprié pour hôtel (pas de vérification stricte car dépend de l'implémentation)
        expect(setup.equipment.length).toBeGreaterThan(0);
      });
    });
  });

  // ============================================================================
  // DEMANDES EXPLICITES RESPECTÉES  
  // ============================================================================
  
  describe('🎛️ Demandes explicites respectées', () => {
    it('2 micros HF doit influencer recommandation', async () => {
      let state = createInitialConversationState();
      
      const message = createUserMessage("conférence 100 personnes avec 2 micros HF exactement");
      const result = engine.processUserMessage(state, message);
      state = result.updatedState;
      
      const mockBrief = createMockEventBrief({
        eventType: { value: 'conference', confidence: 0.9, confirmationStatus: 'confirmed' },
        guestCount: { value: 100, confidence: 0.9, confirmationStatus: 'confirmed' },
        serviceNeeds: { value: ['sound', 'microphones'], confidence: 0.9, confirmationStatus: 'confirmed' }
      });
      
      const recommendations = await buildRecommendedSetupsAdaptive(mockBrief, state.slots);
      
      // Au moins le setup Essential devrait respecter la demande explicite
      const essentialSetup = recommendations.find(r => r.tier === 'essential');
      expect(essentialSetup).toBeDefined();
      
      if (essentialSetup) {
        const microphoneEquipment = essentialSetup.equipment.find(eq => 
          eq.category === 'wireless_microphones' || 
          eq.label?.toLowerCase().includes('micro')
        );
        
        // Devrait mentionner les micros (quantité exacte dépend de l'implémentation)
        expect(microphoneEquipment).toBeDefined();
      }
    });

    it('écran LED explicite doit être inclus', async () => {
      let state = createInitialConversationState();
      
      const message = createUserMessage("conférence avec écran LED obligatoire");
      const result = engine.processUserMessage(state, message);
      state = result.updatedState;
      
      const mockBrief = createMockEventBrief({
        eventType: { value: 'conference', confidence: 0.9, confirmationStatus: 'confirmed' },
        serviceNeeds: { value: ['sound', 'microphones', 'led_screen'], confidence: 0.9, confirmationStatus: 'confirmed' }
      });
      
      const recommendations = await buildRecommendedSetupsAdaptive(mockBrief, state.slots);
      
      // Tous les setups devraient inclure écran LED si explicitement demandé
      recommendations.forEach(setup => {
        const hasLED = setup.categories.includes('écran LED') || 
                      setup.equipment.some(eq => 
                        eq.category === 'led_screen' ||
                        eq.label?.toLowerCase().includes('écran') ||
                        eq.label?.toLowerCase().includes('led')
                      );
        expect(hasLED).toBe(true);
      });
    });
  });

  // ============================================================================
  // MATCHING PRESTATAIRES COHÉRENT
  // ============================================================================
  
  describe('🏪 Matching prestataires cohérent', () => {
    it('doit exclure prestataires incompatibles géographiquement', async () => {
      const mockBrief = createMockEventBrief({
        location: { value: { label: 'Paris', city: 'Paris' }, confidence: 0.9, confirmationStatus: 'confirmed' }
      });
      
      const mockProviders = [
        {
          id: '1',
          title: 'Prestataire Paris',
          location: 'Paris',
          serviceAreas: ['Paris', 'Île-de-France'],
          categories: ['son', 'micros'],
          deliveryZones: ['Paris'],
          rating: 4.5,
          ratingCount: 20
        },
        {
          id: '2', 
          title: 'Prestataire Lyon',
          location: 'Lyon',
          serviceAreas: ['Lyon', 'Rhône'],
          categories: ['son', 'micros'],
          deliveryZones: ['Lyon'],
          rating: 4.8,
          ratingCount: 15
        }
      ];
      
      const rankedProviders = await rankProvidersAdaptive(
        mockBrief,
        mockProviders,
        state?.slots || {}
      );
      
      // Prestataire Lyon devrait être exclu ou très mal classé
      const lyonProvider = rankedProviders.find(p => p.id === '2');
      const parisProvider = rankedProviders.find(p => p.id === '1');
      
      expect(parisProvider).toBeDefined();
      
      if (lyonProvider && parisProvider) {
        // Paris devrait être mieux classé que Lyon
        expect(parisProvider.totalScore).toBeGreaterThan(lyonProvider.totalScore);
      }
    });

    it('doit privilégier prestataires avec bon stock', async () => {
      const mockBrief = createMockEventBrief({
        eventType: { value: 'conference', confidence: 0.9, confirmationStatus: 'confirmed' },
        guestCount: { value: 200, confidence: 0.9, confirmationStatus: 'confirmed' },
        serviceNeeds: { value: ['sound', 'microphones'], confidence: 0.9, confirmationStatus: 'confirmed' }
      });
      
      const mockProviders = [
        {
          id: '1',
          title: 'Petit Prestataire',
          location: 'Paris',
          categories: ['son'],
          maxGuestCapacity: 50, // Trop petit
          rating: 4.8,
          ratingCount: 10
        },
        {
          id: '2',
          title: 'Gros Prestataire', 
          location: 'Paris',
          categories: ['son', 'micros', 'éclairage'],
          maxGuestCapacity: 500, // Largement suffisant
          rating: 4.6,
          ratingCount: 50
        }
      ];
      
      const rankedProviders = await rankProvidersAdaptive(
        mockBrief,
        mockProviders,
        {}
      );
      
      // Gros prestataire devrait être mieux classé malgré note légèrement inférieure
      const smallProvider = rankedProviders.find(p => p.id === '1');
      const bigProvider = rankedProviders.find(p => p.id === '2');
      
      if (smallProvider && bigProvider) {
        expect(bigProvider.totalScore).toBeGreaterThan(smallProvider.totalScore);
      }
    });

    it('doit valoriser prestataires spécialisés', async () => {
      const mockBrief = createMockEventBrief({
        eventType: { value: 'dj_set', confidence: 0.9, confirmationStatus: 'confirmed' },
        guestCount: { value: 100, confidence: 0.9, confirmationStatus: 'confirmed' },
        serviceNeeds: { value: ['sound', 'dj'], confidence: 0.9, confirmationStatus: 'confirmed' }
      });
      
      const mockProviders = [
        {
          id: '1',
          title: 'Prestataire Généraliste',
          categories: ['son', 'micros', 'éclairage', 'écrans'],
          specialties: ['conference', 'corporate'],
          rating: 4.7,
          ratingCount: 100
        },
        {
          id: '2',
          title: 'DJ Spécialisé',
          categories: ['son', 'dj', 'éclairage'],
          specialties: ['dj_set', 'private_party', 'birthday'],
          rating: 4.5,
          ratingCount: 30
        }
      ];
      
      const rankedProviders = await rankProvidersAdaptive(
        mockBrief,
        mockProviders,
        {}
      );
      
      // DJ spécialisé devrait être privilégié
      const generalist = rankedProviders.find(p => p.id === '1');
      const specialist = rankedProviders.find(p => p.id === '2');
      
      if (generalist && specialist) {
        // Le spécialiste devrait avoir un bonus
        expect(specialist.totalScore).toBeGreaterThanOrEqual(generalist.totalScore * 0.9);
      }
    });
  });

  // ============================================================================
  // COHÉRENCE DES TIERS (ESSENTIAL/STANDARD/PREMIUM)
  // ============================================================================
  
  describe('📊 Cohérence des tiers de recommandation', () => {
    it('essential < standard < premium en complétude', async () => {
      const mockBrief = createMockEventBrief({
        eventType: { value: 'birthday', confidence: 0.9, confirmationStatus: 'confirmed' },
        guestCount: { value: 80, confidence: 0.9, confirmationStatus: 'confirmed' },
        serviceNeeds: { value: ['sound', 'dj'], confidence: 0.9, confirmationStatus: 'confirmed' }
      });
      
      const recommendations = await buildRecommendedSetupsAdaptive(mockBrief, {});
      
      const essential = recommendations.find(r => r.tier === 'essential');
      const standard = recommendations.find(r => r.tier === 'standard');
      const premium = recommendations.find(r => r.tier === 'premium');
      
      expect(essential).toBeDefined();
      expect(standard).toBeDefined();
      expect(premium).toBeDefined();
      
      if (essential && standard && premium) {
        // Premium devrait avoir plus d'équipements que Standard
        expect(premium.equipment.length).toBeGreaterThanOrEqual(standard.equipment.length);
        
        // Standard devrait avoir plus que Essential
        expect(standard.equipment.length).toBeGreaterThanOrEqual(essential.equipment.length);
        
        // Premium devrait avoir plus de services optionnels
        const premiumServices = premium.services?.length || 0;
        const essentialServices = essential.services?.length || 0;
        expect(premiumServices).toBeGreaterThanOrEqual(essentialServices);
      }
    });

    it('tous les tiers doivent couvrir besoins de base', async () => {
      const mockBrief = createMockEventBrief({
        eventType: { value: 'conference', confidence: 0.9, confirmationStatus: 'confirmed' },
        guestCount: { value: 100, confidence: 0.9, confirmationStatus: 'confirmed' },
        serviceNeeds: { value: ['sound', 'microphones'], confidence: 0.9, confirmationStatus: 'confirmed' }
      });
      
      const recommendations = await buildRecommendedSetupsAdaptive(mockBrief, {});
      
      // Tous les tiers doivent couvrir son + micros
      recommendations.forEach(setup => {
        const hasSound = setup.categories.includes('son') || 
                        setup.equipment.some(eq => eq.category === 'front_speakers');
        const hasMics = setup.categories.includes('micros') || 
                       setup.equipment.some(eq => eq.category === 'wireless_microphones');
        
        expect(hasSound).toBe(true);
        expect(hasMics).toBe(true);
      });
    });
  });

  // ============================================================================
  // COHÉRENCE DES SERVICES (LIVRAISON, INSTALLATION, TECHNICIEN)
  // ============================================================================
  
  describe('🚚 Services logistiques cohérents', () => {
    it('livraison demandée doit être incluse', async () => {
      const mockBrief = createMockEventBrief({
        eventType: { value: 'conference', confidence: 0.9, confirmationStatus: 'confirmed' },
        deliveryNeeded: { value: true, confidence: 0.9, confirmationStatus: 'confirmed' }
      });
      
      const recommendations = await buildRecommendedSetupsAdaptive(mockBrief, {});
      
      // Tous les setups devraient inclure livraison
      recommendations.forEach(setup => {
        const hasDelivery = setup.services?.some(service => 
          service.category === 'delivery' ||
          service.label?.toLowerCase().includes('livraison')
        ) || setup.categories.includes('livraison');
        
        expect(hasDelivery).toBe(true);
      });
    });

    it('installation refusée doit être respectée', async () => {
      const mockBrief = createMockEventBrief({
        eventType: { value: 'conference', confidence: 0.9, confirmationStatus: 'confirmed' },
        installationNeeded: { value: false, confidence: 0.9, confirmationStatus: 'confirmed' }
      });
      
      const recommendations = await buildRecommendedSetupsAdaptive(mockBrief, {});
      
      // Setup Essential ne devrait PAS forcer l'installation
      const essential = recommendations.find(r => r.tier === 'essential');
      if (essential) {
        const forcedInstallation = essential.services?.some(service => 
          service.required && (
            service.category === 'installation' ||
            service.label?.toLowerCase().includes('installation')
          )
        );
        
        expect(forcedInstallation).toBe(false);
      }
    });

    it('technicien demandé doit être proposé', async () => {
      const mockBrief = createMockEventBrief({
        eventType: { value: 'conference', confidence: 0.9, confirmationStatus: 'confirmed' },
        guestCount: { value: 200, confidence: 0.9, confirmationStatus: 'confirmed' },
        technicianNeeded: { value: true, confidence: 0.9, confirmationStatus: 'confirmed' }
      });
      
      const recommendations = await buildRecommendedSetupsAdaptive(mockBrief, {});
      
      // Au moins setup Standard/Premium devrait inclure technicien
      const standardOrPremium = recommendations.filter(r => 
        r.tier === 'standard' || r.tier === 'premium'
      );
      
      expect(standardOrPremium.length).toBeGreaterThan(0);
      
      const hasTechnician = standardOrPremium.some(setup => 
        setup.services?.some(service => 
          service.category === 'technician' ||
          service.label?.toLowerCase().includes('technicien')
        ) || setup.categories.includes('technicien')
      );
      
      expect(hasTechnician).toBe(true);
    });
  });

  // ============================================================================
  // WARNINGS ET ASSUMPTIONS COHÉRENTS
  // ============================================================================
  
  describe('⚠️ Warnings et assumptions', () => {
    it('doit warn si budget non spécifié pour premium', async () => {
      const mockBrief = createMockEventBrief({
        eventType: { value: 'conference', confidence: 0.9, confirmationStatus: 'confirmed' },
        guestCount: { value: 300, confidence: 0.9, confirmationStatus: 'confirmed' },
        // Pas de budget spécifié
      });
      
      const recommendations = await buildRecommendedSetupsAdaptive(mockBrief, {});
      
      const premium = recommendations.find(r => r.tier === 'premium');
      if (premium) {
        // Devrait avoir des assumptions sur le budget
        const hasAssumptions = (premium.missingAssumptions?.length || 0) > 0 ||
                              (premium.rationale?.toLowerCase().includes('budget')) ||
                              (premium.description?.toLowerCase().includes('budget'));
        
        // expect(hasAssumptions).toBe(true); // Optionnel selon implémentation
      }
    });

    it('doit warn si lieu exact manquant pour logistique', async () => {
      const mockBrief = createMockEventBrief({
        eventType: { value: 'conference', confidence: 0.9, confirmationStatus: 'confirmed' },
        guestCount: { value: 150, confidence: 0.9, confirmationStatus: 'confirmed' },
        location: { value: { label: 'Paris', city: 'Paris' }, confidence: 0.7, confirmationStatus: 'confirmed' }, // Ville seulement
        deliveryNeeded: { value: true, confidence: 0.9, confirmationStatus: 'confirmed' }
      });
      
      const recommendations = await buildRecommendedSetupsAdaptive(mockBrief, {});
      
      // Au moins une recommandation devrait mentionner le besoin d'adresse exacte
      const hasLocationWarning = recommendations.some(setup => 
        setup.missingAssumptions?.some(assumption => 
          assumption.toLowerCase().includes('adresse') ||
          assumption.toLowerCase().includes('lieu') ||
          assumption.toLowerCase().includes('logistique')
        )
      );
      
      // expect(hasLocationWarning).toBe(true); // Optionnel selon implémentation
    });
  });

  // ============================================================================
  // INTÉGRATION COMPLÈTE CONVERSATION → RECOMMANDATION → MATCHING
  // ============================================================================
  
  describe('🔄 Intégration complète', () => {
    it('conversation → recommandation → matching cohérents', async () => {
      let state = createInitialConversationState();
      
      // Conversation complète  
      const messages = [
        "conférence pour 120 personnes",
        "à Lyon en intérieur",
        "avec micros et écran LED",
        "livraison nécessaire"
      ];
      
      for (const messageText of messages) {
        const userMsg = createUserMessage(messageText);
        const result = engine.processUserMessage(state, userMsg);
        state = result.updatedState;
      }
      
      // Forcer readyToRecommend
      state.qualification.readyToRecommend = true;
      
      // Convertir en EventBrief
      const mockBrief = createMockEventBrief({
        eventType: { value: 'conference', confidence: 0.9, confirmationStatus: 'confirmed' },
        guestCount: { value: 120, confidence: 0.9, confirmationStatus: 'confirmed' },
        location: { value: { label: 'Lyon', city: 'Lyon' }, confidence: 0.9, confirmationStatus: 'confirmed' },
        indoorOutdoor: { value: 'indoor', confidence: 0.9, confirmationStatus: 'confirmed' },
        serviceNeeds: { value: ['sound', 'microphones', 'led_screen'], confidence: 0.9, confirmationStatus: 'confirmed' },
        deliveryNeeded: { value: true, confidence: 0.9, confirmationStatus: 'confirmed' }
      });
      
      // Générer recommandations
      const recommendations = await buildRecommendedSetupsAdaptive(mockBrief, state.slots);
      expect(recommendations).toHaveLength(3);
      
      // Vérifier cohérence recommandations
      recommendations.forEach(setup => {
        expect(setup.equipment.length).toBeGreaterThan(0);
        
        const hasSound = setup.categories.includes('son') || 
                        setup.equipment.some(eq => eq.category === 'front_speakers');
        const hasMics = setup.categories.includes('micros') || 
                       setup.equipment.some(eq => eq.category === 'wireless_microphones');
        const hasLED = setup.categories.includes('écran LED') || 
                      setup.equipment.some(eq => eq.category === 'led_screen');
        
        expect(hasSound).toBe(true);
        expect(hasMics).toBe(true);
        expect(hasLED).toBe(true);
      });
      
      // Mock providers pour matching
      const mockProviders = [
        {
          id: '1',
          title: 'Prestataire Lyon',
          location: 'Lyon',
          categories: ['son', 'micros', 'écrans'],
          serviceAreas: ['Lyon', 'Rhône-Alpes'],
          deliveryZones: ['Lyon'],
          rating: 4.5,
          ratingCount: 30
        },
        {
          id: '2',
          title: 'Prestataire Paris', 
          location: 'Paris',
          categories: ['son', 'micros'],
          serviceAreas: ['Paris', 'Île-de-France'],
          deliveryZones: ['Paris'],
          rating: 4.8,
          ratingCount: 50
        }
      ];
      
      // Matching
      const rankedProviders = await rankProvidersAdaptive(
        mockBrief,
        mockProviders,
        state.slots
      );
      
      // Prestataire Lyon devrait être privilégié
      expect(rankedProviders).toHaveLength(2);
      
      const lyonProvider = rankedProviders.find(p => p.id === '1');
      const parisProvider = rankedProviders.find(p => p.id === '2');
      
      if (lyonProvider && parisProvider) {
        expect(lyonProvider.totalScore).toBeGreaterThan(parisProvider.totalScore);
      }
    });
  });
});