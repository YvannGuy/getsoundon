import { describe, it, expect, beforeEach } from '@jest/globals';
import { createRecommendationEngineV2 } from '../recommendation-engine-v2';
import { RecommendationInput, RecommendationEngineV2 } from '../production-types';

describe('Moteur de Recommandation V2 - Production Événementielle', () => {
  let engine: RecommendationEngineV2;

  beforeEach(() => {
    engine = createRecommendationEngineV2();
  });

  describe('Cas Métier Critiques', () => {
    
    it('Conférence 120 personnes intérieur - Priorité parole', () => {
      const input: RecommendationInput = {
        eventType: 'conference',
        guestCount: 120,
        indoorOutdoor: 'indoor',
        venueType: 'conference_room',
        speechExpected: true,
        presentationNeed: true
      };

      const recommendations = engine.generateRecommendations(input);
      const standard = recommendations.find(r => r.tier === 'standard')!;

      // Doit avoir système son adapté
      expect(standard.soundSystem.length).toBeGreaterThan(1);
      const speakers = standard.soundSystem.find(item => item.subcategory.includes('speakers'));
      expect(speakers?.quantity).toBeGreaterThanOrEqual(4); // 120 personnes = speakers medium/large

      // Doit avoir micros prioritaires
      expect(standard.microphones.length).toBeGreaterThan(0);
      const totalMics = standard.microphones.reduce((sum, item) => sum + item.quantity, 0);
      expect(totalMics).toBeGreaterThanOrEqual(2);

      // Profil production correct
      expect(['critical', 'high']).toContain(standard.productionProfile.speechImportance);
      expect(standard.productionProfile.presentationNeed).toBe(true);
      
      // Pas de DJ ou lighting par défaut pour conférence
      expect(standard.djSetup.length).toBe(0);
      expect(standard.lighting.length).toBe(0);
    });

    it('Cocktail corporate 80 personnes - Ambiance musicale légère', () => {
      const input: RecommendationInput = {
        eventType: 'cocktail',
        guestCount: 80,
        indoorOutdoor: 'indoor',
        venueType: 'hotel',
        speechExpected: true,
        dancingExpected: false // Ambiance, pas danse
      };

      const recommendations = engine.generateRecommendations(input);
      const standard = recommendations.find(r => r.tier === 'standard')!;

      // Système son modéré (ambiance)
      expect(standard.soundSystem.length).toBeGreaterThan(0);
      const speakers = standard.soundSystem.find(item => item.subcategory.includes('speakers'));
      expect(speakers?.quantity).toBeGreaterThanOrEqual(2);

      // Micros pour discours
      expect(standard.microphones.length).toBeGreaterThan(0);

      // Éclairage d'ambiance
      expect(standard.lighting.length).toBeGreaterThan(0);

      // Profil production
      expect(standard.productionProfile.musicImportance).toEqual(expect.stringMatching(/medium|high/));
      expect(standard.productionProfile.danceIntent).toBe(false);
    });

    it('Anniversaire 100 personnes - Vraie danse', () => {
      const input: RecommendationInput = {
        eventType: 'birthday', 
        guestCount: 100,
        indoorOutdoor: 'indoor',
        venueType: 'private_home',
        dancingExpected: true,
        serviceNeeds: ['sound', 'dj', 'lighting']
      };

      const recommendations = engine.generateRecommendations(input);
      const standard = recommendations.find(r => r.tier === 'standard')!;

      // Système son avec caisson pour danse
      expect(standard.soundSystem.length).toBeGreaterThan(1);
      const subwoofer = standard.soundSystem.find(item => 
        item.subcategory === 'subwoofer'
      );
      expect(subwoofer).toBeTruthy(); // Caisson obligatoire pour danse

      // Setup DJ
      expect(standard.djSetup.length).toBeGreaterThan(0);
      const djController = standard.djSetup.find(item => 
        item.subcategory.includes('controller')
      );
      expect(djController).toBeTruthy();

      // Éclairage dynamique
      expect(standard.lighting.length).toBeGreaterThan(0);

      // Profil production
      expect(standard.productionProfile.danceIntent).toBe(true);
      expect(standard.productionProfile.musicImportance).toBe('critical');
    });

    it('Culte avec voix + musique', () => {
      const input: RecommendationInput = {
        eventType: 'religious_service',
        guestCount: 150,
        indoorOutdoor: 'indoor',
        venueType: 'church',
        speechExpected: true,
        livePerformance: true, // Musique live
        serviceNeeds: ['sound', 'microphones']
      };

      const recommendations = engine.generateRecommendations(input);
      const standard = recommendations.find(r => r.tier === 'standard')!;

      // Système son adapté à église (réverbération)
      expect(standard.soundSystem.length).toBeGreaterThan(1);
      const speakers = standard.soundSystem.find(item => item.subcategory.includes('speakers'));
      expect(speakers?.quantity).toBeGreaterThanOrEqual(4); // Église = besoin directionnel

      // Micros adaptés aux prises de parole + chant
      expect(standard.microphones.length).toBeGreaterThan(0);
      const totalMics = standard.microphones.reduce((sum, item) => sum + item.quantity, 0);
      expect(totalMics).toBeGreaterThanOrEqual(3); // Parole + musique live

      // Profil production
      expect(['critical', 'high']).toContain(standard.productionProfile.speechImportance);
      expect(standard.productionProfile.livePerformance).toBe(true);
      expect(['high', 'critical', 'medium']).toContain(
        standard.productionProfile.musicImportance
      );

      // Warnings environnement
      expect(standard.warnings.length).toBeGreaterThan(0);
      expect(standard.warnings.some(w => w.toLowerCase().includes('acoustique'))).toBe(true);
    });

    it('Showcase extérieur couvert', () => {
      const input: RecommendationInput = {
        eventType: 'showcase',
        guestCount: 200,
        indoorOutdoor: 'outdoor',
        isCovered: true,
        livePerformance: true,
        serviceNeeds: ['sound', 'lighting', 'technician']
      };

      const recommendations = engine.generateRecommendations(input);
      const premium = recommendations.find(r => r.tier === 'premium')!;

      // Système son sur-dimensionné pour extérieur
      const speakers = premium.soundSystem.find(item => item.subcategory.includes('speakers'));
      expect(speakers?.quantity).toBeGreaterThanOrEqual(6); // Extérieur + 200 personnes

      // Infrastructure renforcée
      expect(premium.infrastructure.length).toBeGreaterThan(1);
      const powerDistrib = premium.infrastructure.find(item => 
        item.subcategory === 'power_distribution'
      );
      expect(powerDistrib).toBeTruthy(); // Alimentation extérieur

      // Services professionnels
      const technicianService = premium.services.find(s => s.service === 'technician');
      expect(technicianService).toBeTruthy();
      expect(technicianService?.priority).toBe('required');

      // Couvert : pas d’alerte exposition directe ; extérieur reflété au minimum dans la rationale
      expect(
        premium.warnings.some(w => w.includes('météo') || w.includes('IP65')) ||
          premium.rationale.some(r => /extérieur/i.test(r))
      ).toBe(true);
    });

    it('Soirée privée - JUSTE son + micro (négation)', () => {
      const input: RecommendationInput = {
        eventType: 'private_party',
        guestCount: 60,
        indoorOutdoor: 'indoor',
        venueType: 'apartment',
        serviceNeeds: ['sound', 'microphones'], // Juste son + micro
        simplicityPreference: 'simple'
      };

      const recommendations = engine.generateRecommendations(input);
      const essential = recommendations.find(r => r.tier === 'essential')!;

      // Son basique seulement
      expect(essential.soundSystem.length).toBeGreaterThan(0);
      const speakers = essential.soundSystem.find(item => item.subcategory.includes('speakers'));
      expect(speakers?.quantity).toBeGreaterThanOrEqual(2);
      expect(speakers?.quantity).toBeLessThanOrEqual(8);

      // Micros présents
      expect(essential.microphones.length).toBeGreaterThan(0);

      // PAS de DJ setup (pas demandé)
      expect(essential.djSetup.length).toBe(0);

      // PAS de lighting (pas demandé malgré type private_party)
      expect(essential.lighting.length).toBe(0);

      // Profil autonomie
      expect(essential.productionProfile.autonomyRequired).toBe(true);
    });

    it('Demande explicite : 2 micros HF spécifiques', () => {
      const input: RecommendationInput = {
        eventType: 'corporate',
        guestCount: 80,
        explicitEquipmentRequests: [
          {
            category: 'microphones',
            subcategory: 'handheld_wireless',
            quantity: { kind: 'exact', value: 2 },
            qualifiers: ['hf'],
            brand: 'Shure'
          }
        ]
      };

      const recommendations = engine.generateRecommendations(input);
      const standard = recommendations.find(r => r.tier === 'standard')!;

      // Doit respecter la demande explicite
      expect(standard.explicitRequestsHandled.length).toBeGreaterThan(0);
      expect(standard.explicitRequestsHandled[0]).toContain('2');
      expect(standard.explicitRequestsHandled[0]).toContain('Shure');

      const micItem = standard.microphones.find(item => 
        item.subcategory === 'handheld_wireless'
      );
      expect(micItem?.quantity).toBe(2);
      expect(micItem?.reasoning).toContain('explicite');
    });

    it('Cas simple SANS technicien', () => {
      const input: RecommendationInput = {
        eventType: 'birthday',
        guestCount: 40,
        indoorOutdoor: 'indoor',
        technicianNeeded: false,
        simplicityPreference: 'simple'
      };

      const recommendations = engine.generateRecommendations(input);
      const essential = recommendations.find(r => r.tier === 'essential')!;

      // Pas de service technicien
      const technicianService = essential.services.find(s => s.service === 'technician');
      expect(technicianService).toBeFalsy();

      // Setup autonome
      expect(essential.productionProfile.autonomyRequired).toBe(true);
      expect(['simple', 'moderate']).toContain(essential.complexity);

      // Instructions autonomie dans rationale
      expect(essential.rationale.some(r => 
        r.includes('autonome') || r.includes('simple')
      )).toBe(true);
    });

    it('Cas premium avec installation + technicien', () => {
      const input: RecommendationInput = {
        eventType: 'wedding',
        guestCount: 150,
        indoorOutdoor: 'outdoor',
        isCovered: true,
        technicianNeeded: true,
        installationNeeded: true,
        speechExpected: true,
        dancingExpected: true,
        livePerformance: true
      };

      const recommendations = engine.generateRecommendations(input);
      const premium = recommendations.find(r => r.tier === 'premium')!;

      // Services complets
      const technicianService = premium.services.find(s => s.service === 'technician');
      const installationService = premium.services.find(s => s.service === 'installation');
      
      expect(technicianService?.priority).toBe('required');
      expect(installationService?.priority).toBe('required');

      // Setup professionnel  
      expect(premium.productionProfile.professionalStaffing).toBe(true);
      expect(premium.complexity).toEqual(expect.stringMatching(/moderate|complex/));
      expect(premium.staffingRequired).toBeGreaterThanOrEqual(2);

      // Équipement complet
      expect(premium.soundSystem.length).toBeGreaterThanOrEqual(2);
      expect(premium.djSetup.length).toBeGreaterThan(0); // DJ pour danse
      expect(premium.lighting.length).toBeGreaterThan(0); // Ambiance
    });
  });

  describe('Logique de Dimensionnement', () => {
    
    it('doit adapter la puissance selon audience', () => {
      const smallInput: RecommendationInput = { eventType: 'corporate', guestCount: 30 };
      const largeInput: RecommendationInput = { eventType: 'corporate', guestCount: 300 };
      
      const smallRecs = engine.generateRecommendations(smallInput);
      const largeRecs = engine.generateRecommendations(largeInput);
      
      const smallSpeakers = smallRecs[0].soundSystem.find(item => item.subcategory.includes('speakers'));
      const largeSpeakers = largeRecs[0].soundSystem.find(item => item.subcategory.includes('speakers'));
      
      expect(largeSpeakers?.quantity).toBeGreaterThan(smallSpeakers?.quantity || 0);
    });

    it('doit sur-dimensionner pour extérieur', () => {
      const indoorInput: RecommendationInput = { 
        eventType: 'birthday', 
        guestCount: 100, 
        indoorOutdoor: 'indoor' 
      };
      const outdoorInput: RecommendationInput = { 
        eventType: 'birthday', 
        guestCount: 100, 
        indoorOutdoor: 'outdoor' 
      };
      
      const indoorRecs = engine.generateRecommendations(indoorInput);
      const outdoorRecs = engine.generateRecommendations(outdoorInput);
      
      const indoorSpeakers = indoorRecs[0].soundSystem.find(item => item.subcategory.includes('speakers'));
      const outdoorSpeakers = outdoorRecs[0].soundSystem.find(item => item.subcategory.includes('speakers'));
      
      expect(outdoorSpeakers?.quantity).toBeGreaterThanOrEqual(indoorSpeakers?.quantity || 0);
      
      // Warnings pour extérieur
      expect(outdoorRecs[0].warnings.length).toBeGreaterThan(0);
    });
  });

  describe('Profils Événements Différenciés', () => {
    
    it('Conference vs Birthday - Profils opposés', () => {
      const conferenceInput: RecommendationInput = {
        eventType: 'conference',
        guestCount: 100,
        speechExpected: true
      };
      
      const birthdayInput: RecommendationInput = {
        eventType: 'birthday', 
        guestCount: 100,
        dancingExpected: true
      };

      const confRecs = engine.generateRecommendations(conferenceInput);
      const birthdayRecs = engine.generateRecommendations(birthdayInput);
      
      const confProfile = confRecs[0].productionProfile;
      const birthdayProfile = birthdayRecs[0].productionProfile;

      // Conférence = parole prioritaire, pas de danse
      expect(['critical', 'high']).toContain(confProfile.speechImportance);
      expect(confProfile.danceIntent).toBe(false);
      expect(['none', 'low', 'medium']).toContain(confProfile.musicImportance);

      // Anniversaire = danse, musique forte
      expect(['low', 'medium']).toContain(birthdayProfile.speechImportance);
      expect(birthdayProfile.danceIntent).toBe(true);
      expect(['high', 'critical']).toContain(birthdayProfile.musicImportance);
      
      // Équipements différents
      const confDJ = confRecs[0].djSetup;
      const birthdayDJ = birthdayRecs[0].djSetup;
      
      expect(confDJ.length).toBe(0); // Pas de DJ pour conférence
      expect(birthdayDJ.length).toBeGreaterThan(0); // DJ pour anniversaire
    });

    it('Wedding - Profil complexe mixte', () => {
      const input: RecommendationInput = {
        eventType: 'wedding',
        guestCount: 120,
        speechExpected: true,
        dancingExpected: true,
        livePerformance: true
      };

      const recommendations = engine.generateRecommendations(input);
      const premium = recommendations.find(r => r.tier === 'premium')!;

      // Profil hybride  
      expect(premium.productionProfile.speechImportance).toBe('high');
      expect(premium.productionProfile.musicImportance).toBe('critical');
      expect(premium.productionProfile.danceIntent).toBe(true);
      expect(premium.productionProfile.livePerformance).toBe(true);

      // Équipement complet
      expect(premium.soundSystem.length).toBeGreaterThanOrEqual(2);
      expect(premium.microphones.length).toBeGreaterThan(0); // Discours
      expect(premium.djSetup.length).toBeGreaterThan(0); // Danse
      expect(premium.lighting.length).toBeGreaterThan(0); // Ambiance

      // Staffing professionnel
      expect(premium.productionProfile.professionalStaffing).toBe(true);
    });
  });

  describe('Gestion Demandes Explicites', () => {
    
    it('doit respecter quantités explicites', () => {
      const input: RecommendationInput = {
        eventType: 'corporate',
        guestCount: 60,
        explicitEquipmentRequests: [
          {
            category: 'microphones',
            quantity: { kind: 'exact', value: 4 },
            qualifiers: []
          }
        ]
      };

      const recommendations = engine.generateRecommendations(input);
      const standard = recommendations.find(r => r.tier === 'standard')!;

      expect(standard.explicitRequestsHandled.length).toBeGreaterThan(0);
      
      const micItem = standard.microphones.find(item => 
        item.quantity === 4
      );
      expect(micItem).toBeTruthy();
      expect(micItem?.reasoning).toContain('explicite');
    });

    it('doit ajouter équipement non prévu par défaut', () => {
      const input: RecommendationInput = {
        eventType: 'conference', // Pas de lighting par défaut
        guestCount: 80,
        explicitEquipmentRequests: [
          {
            category: 'lighting',
            subcategory: 'wash_rgb',
            quantity: { kind: 'exact', value: 2 },
            qualifiers: []
          }
        ]
      };

      const recommendations = engine.generateRecommendations(input);
      const standard = recommendations.find(r => r.tier === 'standard')!;

      // Lighting ajouté malgré type conférence
      expect(standard.lighting.length).toBeGreaterThan(0);
      const lightItem = standard.lighting.find(item => 
        item.subcategory === 'wash_rgb'
      );
      expect(lightItem?.quantity).toBe(2);
    });
  });

  describe('Validation et Qualité', () => {
    
    it('doit valider cohérence des recommandations', () => {
      const input: RecommendationInput = {
        eventType: 'conference',
        guestCount: 100,
        speechExpected: true
      };

      const recommendations = engine.generateRecommendations(input);
      
      for (const rec of recommendations) {
        const validation = engine.validateRecommendation(rec);
        
        expect(validation.isRealistic).toBe(true);
        expect(validation.quality.credibilityScore).toBeGreaterThan(0.7);
      }
    });

    it('doit expliquer les recommandations clairement', () => {
      const input: RecommendationInput = {
        eventType: 'cocktail',
        guestCount: 80
      };

      const recommendations = engine.generateRecommendations(input);
      const explanations = engine.explainRecommendation(recommendations[0]);
      
      expect(explanations.length).toBeGreaterThan(0);
      expect(explanations.join(' ')).toContain('enceintes');
    });
  });

  describe('Edge Cases et Robustesse', () => {
    
    it('doit gérer brief minimal', () => {
      const input: RecommendationInput = {
        guestCount: 50 // Minimal
      };

      const recommendations = engine.generateRecommendations(input);
      
      expect(recommendations.length).toBe(3); // 3 tiers
      expect(recommendations[0].soundSystem.length).toBeGreaterThan(0); // Au moins du son
      expect(recommendations[0].assumptions.length).toBeGreaterThan(0); // Hypothèses
    });

    it('doit gérer brief complexe complet', () => {
      const input: RecommendationInput = {
        eventType: 'wedding',
        guestCount: 200,
        indoorOutdoor: 'outdoor',
        isCovered: false,
        speechExpected: true,
        dancingExpected: true, 
        livePerformance: true,
        installationNeeded: true,
        technicianNeeded: true,
        serviceNeeds: ['sound', 'microphones', 'dj', 'lighting', 'led_screen'],
        budgetRange: { min: 2000, max: 5000 }
      };

      const recommendations = engine.generateRecommendations(input);
      const premium = recommendations.find(r => r.tier === 'premium')!;

      expect(premium.soundSystem.length).toBeGreaterThanOrEqual(2);
      expect(premium.microphones.length).toBeGreaterThan(0);
      expect(premium.djSetup.length).toBeGreaterThan(0);
      expect(premium.lighting.length).toBeGreaterThan(0);
      expect(premium.video.length).toBeGreaterThan(0);
      expect(premium.services.length).toBeGreaterThan(2);
      
      // Complexité élevée
      expect(premium.complexity).toBe('complex');
      expect(premium.staffingRequired).toBeGreaterThanOrEqual(2);
    });

    it('doit gérer contradictions et conflits', () => {
      const input: RecommendationInput = {
        eventType: 'conference', // Pas de danse normalement
        dancingExpected: true,   // Mais danse demandée
        guestCount: 80
      };

      const recommendations = engine.generateRecommendations(input);
      const standard = recommendations.find(r => r.tier === 'standard')!;

      // Doit adapter le profil selon intention explicite
      expect(standard.productionProfile.danceIntent).toBe(true);
      expect(standard.djSetup.length).toBeGreaterThan(0); // DJ ajouté
    });
  });

  describe('Tiers Essential/Standard/Premium', () => {
    
    it('doit différencier les 3 niveaux', () => {
      const input: RecommendationInput = {
        eventType: 'private_party',
        guestCount: 100,
        dancingExpected: true
      };

      const [essential, standard, premium] = engine.generateRecommendations(input);

      // Escalade quantités
      const essentialSpeakers = essential.soundSystem.find(item => item.subcategory.includes('speakers'))?.quantity || 0;
      const standardSpeakers = standard.soundSystem.find(item => item.subcategory.includes('speakers'))?.quantity || 0;
      const premiumSpeakers = premium.soundSystem.find(item => item.subcategory.includes('speakers'))?.quantity || 0;
      
      expect(standardSpeakers).toBeGreaterThanOrEqual(essentialSpeakers);
      expect(premiumSpeakers).toBeGreaterThanOrEqual(standardSpeakers);

      // Complexité croissante
      const complexityOrder = ['simple', 'moderate', 'complex'];
      const essentialComplexityIndex = complexityOrder.indexOf(essential.complexity);
      const standardComplexityIndex = complexityOrder.indexOf(standard.complexity);
      const premiumComplexityIndex = complexityOrder.indexOf(premium.complexity);
      
      expect(standardComplexityIndex).toBeGreaterThanOrEqual(essentialComplexityIndex);
      expect(premiumComplexityIndex).toBeGreaterThanOrEqual(standardComplexityIndex);
    });
  });
});