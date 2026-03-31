import { describe, it, expect, beforeEach } from '@jest/globals';
import { createRobustNLPEngine, extractFromText, extractField } from '../robust-nlp-engine';
import { TestCase, ValidationResult } from '../nlp-types';
import { QuestionField } from '../types';

describe('Moteur NLP Robuste Français', () => {
  let nlpEngine: ReturnType<typeof createRobustNLPEngine>;

  beforeEach(() => {
    nlpEngine = createRobustNLPEngine({
      confidenceThreshold: 0.5,
      dateReferencePoint: new Date('2026-03-30T10:00:00Z')
    });
  });

  describe('Corpus de Tests Critiques', () => {
    const testCases: TestCase[] = [
      // NOMBRES
      {
        id: 'numbers-1',
        input: 'c\'est pour cent personnes',
        expectedExtractions: [
          { field: 'guestCount', value: 100, confidence: 0.8 }
        ],
        category: 'numbers',
        difficulty: 'easy'
      },
      {
        id: 'numbers-2', 
        input: 'on sera entre 80 et 100',
        expectedExtractions: [
          { field: 'guestCount', value: 90, confidence: 0.7 } // moyenne de la plage
        ],
        category: 'numbers',
        difficulty: 'medium'
      },
      {
        id: 'numbers-3',
        input: 'une cinquantaine de personnes environ',
        expectedExtractions: [
          { field: 'guestCount', value: 50, confidence: 0.7 }
        ],
        category: 'numbers', 
        difficulty: 'medium'
      },

      // NÉGATIONS
      {
        id: 'negations-1',
        input: 'pas besoin de DJ',
        expectedExtractions: [
          { field: 'serviceNeeds', value: expect.not.arrayContaining(['dj']) }
        ],
        category: 'negations',
        difficulty: 'medium'
      },
      {
        id: 'negations-2',
        input: 'juste deux micros HF',
        expectedExtractions: [
          { field: 'serviceNeeds', value: ['microphones'], confidence: 0.9 }
        ],
        category: 'negations',
        difficulty: 'hard'
      },
      {
        id: 'negations-3',
        input: 'pas besoin d\'installation, on gère',
        expectedExtractions: [
          { field: 'installationNeeded', value: false, confidence: 0.8 }
        ],
        category: 'negations',
        difficulty: 'medium'
      },

      // INDOOR/OUTDOOR AVEC VARIANTES
      {
        id: 'space-1',
        input: 'en extérieur mais sous barnum',
        expectedExtractions: [
          { field: 'indoorOutdoor', value: 'outdoor', confidence: 0.7 }
        ],
        category: 'mixed',
        difficulty: 'hard'
      },

      // DATES RELATIVES
      {
        id: 'dates-1',
        input: 'vendredi prochain sur Paris',
        expectedExtractions: [
          { field: 'eventDate', confidence: 0.8 },
          { field: 'location', value: expect.objectContaining({ city: 'paris' }) }
        ],
        category: 'dates',
        difficulty: 'medium'
      },

      // CORRECTIONS
      {
        id: 'corrections-1',
        input: 'non finalement ce sera samedi',
        expectedExtractions: [
          { field: 'eventDate', confidence: 0.8 }
        ],
        category: 'mixed',
        difficulty: 'hard'
      },

      // ÉQUIPEMENT EXPLICITE
      {
        id: 'equipment-1',
        input: 'je veux juste qu\'on entende bien les discours',
        expectedExtractions: [
          { field: 'serviceNeeds', value: expect.arrayContaining(['microphones']) }
        ],
        category: 'equipment',
        difficulty: 'hard'
      },
      {
        id: 'equipment-2',
        input: 'soirée privée, pas de lumière, juste son + micro',
        expectedExtractions: [
          { field: 'serviceNeeds', value: expect.arrayContaining(['sound', 'microphones']) },
          { field: 'eventType', value: 'private_party' }
        ],
        category: 'equipment',
        difficulty: 'hard'
      },

      // CAS COMPLET
      {
        id: 'complete-1',
        input: 'cocktail corporate à Paris pour environ 120 personnes dans 2 semaines',
        expectedExtractions: [
          { field: 'eventType', value: 'cocktail' },
          { field: 'guestCount', value: 120, confidence: 0.8 },
          { field: 'location', value: expect.objectContaining({ city: 'paris' }) },
          { field: 'eventDate', confidence: 0.8 }
        ],
        category: 'mixed',
        difficulty: 'hard'
      }
    ];

    testCases.forEach(testCase => {
      it(`${testCase.id}: ${testCase.input}`, () => {
        const result = nlpEngine.extractFromText(testCase.input, testCase.id);
        
        // Vérifier que les extractions attendues sont présentes
        for (const expected of testCase.expectedExtractions) {
          const actual = result.extractions.find(e => e.field === expected.field);
          
          expect(actual).toBeDefined();
          
          if (expected.value !== undefined) {
            expect(actual?.value).toEqual(expected.value);
          }
          
          if (expected.confidence !== undefined) {
            expect(actual?.confidence).toBeGreaterThanOrEqual(expected.confidence);
          }
        }
      });
    });
  });

  describe('Extraction de Nombres', () => {
    it('doit extraire nombres en chiffres', () => {
      const result = extractField('100 personnes', 'guestCount');
      
      expect(result).toBeTruthy();
      expect(result?.value).toBe(100);
      expect(result?.confidence).toBeGreaterThan(0.8);
    });

    it('doit extraire nombres en lettres', () => {
      const result = extractField('cent personnes', 'guestCount');
      
      expect(result).toBeTruthy();
      expect(result?.value).toBe(100);
      expect(result?.confidence).toBeGreaterThan(0.7);
    });

    it('doit extraire approximations', () => {
      const result = extractField('environ 80 personnes', 'guestCount');
      
      expect(result).toBeTruthy();
      expect(result?.value).toBe(80);
      expect(result?.confidence).toBeGreaterThan(0.7);
    });

    it('doit extraire plages de valeurs', () => {
      const result = extractField('80 à 100 personnes', 'guestCount');
      
      expect(result).toBeTruthy();
      expect(result?.value).toBe(90); // moyenne
      expect(result?.confidence).toBeGreaterThan(0.7);
    });

    it('doit extraire expressions spéciales', () => {
      const result = extractField('pas énorme, autour de 60', 'guestCount');
      
      expect(result).toBeTruthy();
      expect(result?.value).toBe(60);
    });
  });

  describe('Extraction de Dates', () => {
    it('doit extraire dates absolues', () => {
      const result = extractField('le 12 avril 2026', 'eventDate');
      
      expect(result).toBeTruthy();
      expect(result?.value).toEqual(
        expect.objectContaining({
          isoDate: '2026-04-12'
        })
      );
    });

    it('doit extraire dates relatives', () => {
      const result = extractField('vendredi prochain', 'eventDate');
      
      expect(result).toBeTruthy();
      expect(result?.confidence).toBeGreaterThan(0.8);
    });

    it('doit extraire périodes', () => {
      const result = extractField('début juin', 'eventDate');
      
      expect(result).toBeTruthy();
      expect(result?.value).toEqual(
        expect.objectContaining({
          raw: expect.stringMatching(/juin/i)
        })
      );
    });

    it('doit extraire week-ends', () => {
      const result = extractField('week-end du 14 juin', 'eventDate');
      
      expect(result).toBeTruthy();
    });
  });

  describe('Extraction de Lieux', () => {
    it('doit extraire villes françaises', () => {
      const result = extractField('à Paris', 'location');
      
      expect(result).toBeTruthy();
      expect(result?.value).toEqual(
        expect.objectContaining({
          city: 'paris'
        })
      );
    });

    it('doit extraire arrondissements parisiens', () => {
      const result = extractField('Paris 11', 'location');
      
      expect(result).toBeTruthy();
      expect(result?.value).toEqual(
        expect.objectContaining({
          city: 'paris',
          district: '11e arrondissement'
        })
      );
    });

    it('doit extraire types de venues', () => {
      const result = extractField('dans un hôtel', 'location');
      
      expect(result).toBeTruthy();
      expect(result?.confidence).toBeGreaterThan(0.7);
    });

    it('doit extraire expressions géographiques', () => {
      const result = extractField('en région parisienne', 'location');
      
      expect(result).toBeTruthy();
      expect(result?.value).toEqual(
        expect.objectContaining({
          region: 'île-de-france'
        })
      );
    });
  });

  describe('Indoor/Outdoor avec Variantes', () => {
    it('doit détecter intérieur standard', () => {
      const result = extractField('en intérieur dans une salle', 'indoorOutdoor');
      
      expect(result).toBeTruthy();
      expect(result?.value).toBe('indoor');
    });

    it('doit détecter extérieur', () => {
      const result = extractField('en plein air dans le jardin', 'indoorOutdoor');
      
      expect(result).toBeTruthy();
      expect(result?.value).toBe('outdoor');
    });

    it('doit gérer extérieur couvert', () => {
      const result = extractField('dehors mais sous barnum', 'indoorOutdoor');
      
      expect(result).toBeTruthy();
      expect(result?.value).toBe('outdoor');
      expect(result?.confidence).toBeGreaterThan(0.6); // Confiance réduite pour cas ambigu
    });
  });

  describe('Gestion des Négations', () => {
    it('doit détecter exclusions explicites', () => {
      const result = extractFromText('pas besoin de DJ');
      
      // Les négations sont détectées mais ne génèrent pas d'extraction positive
      expect(result.extractions.find(e => 
        e.field === 'serviceNeeds' && 
        Array.isArray(e.value) && 
        e.value.includes('dj')
      )).toBeFalsy();
    });

    it('doit gérer "juste" et "uniquement"', () => {
      const result = extractFromText('juste du son et des micros');
      
      const serviceNeeds = result.extractions.find(e => e.field === 'serviceNeeds');
      expect(serviceNeeds?.value).toEqual(expect.arrayContaining(['sound', 'microphones']));
    });

    it('doit détecter négations de services', () => {
      const result = extractFromText('sans livraison');
      
      // La négation est détectée (pas d'extraction positive pour delivery)
      expect(result.extractions.find(e => 
        e.field === 'serviceNeeds' && 
        Array.isArray(e.value) && 
        e.value.includes('delivery')
      )).toBeFalsy();
    });
  });

  describe('Équipement Explicite', () => {
    it('doit extraire quantités d\'équipement', () => {
      const result = extractFromText('2 micros HF');
      
      const serviceNeeds = result.extractions.find(e => e.field === 'serviceNeeds');
      expect(serviceNeeds?.value).toEqual(expect.arrayContaining(['microphones']));
    });

    it('doit extraire spécifications techniques', () => {
      const result = extractFromText('4 enceintes actives');
      
      const serviceNeeds = result.extractions.find(e => e.field === 'serviceNeeds');
      expect(serviceNeeds?.value).toEqual(expect.arrayContaining(['sound']));
    });

    it('doit extraire marques et modèles', () => {
      const result = extractFromText('une table Yamaha');
      
      const serviceNeeds = result.extractions.find(e => e.field === 'serviceNeeds');
      expect(serviceNeeds).toBeTruthy(); // Devrait détecter mixing/sound
    });
  });

  describe('Gestion des Corrections', () => {
    it('doit gérer corrections temporelles', () => {
      const result = extractFromText('non finalement ce sera samedi');
      
      const eventDate = result.extractions.find(e => e.field === 'eventDate');
      expect(eventDate).toBeTruthy();
      expect(eventDate?.confidence).toBeGreaterThan(0.7);
    });

    it('doit gérer corrections de quantité', () => {
      const result = extractFromText('non finalement 100 personnes');
      
      const guestCount = result.extractions.find(e => e.field === 'guestCount');
      expect(guestCount?.value).toBe(100);
    });
  });

  describe('Cas Complexes et Mixtes', () => {
    it('doit traiter phrase complète complexe', () => {
      const input = 'cocktail corporate à Paris 11e pour environ 120 personnes vendredi prochain en intérieur avec son, micros et écran LED';
      const result = extractFromText(input);
      
      // Vérifier présence de toutes les extractions attendues
      expect(result.extractions.length).toBeGreaterThan(4);
      
      // Event type
      const eventType = result.extractions.find(e => e.field === 'eventType');
      expect(eventType?.value).toMatch(/cocktail|corporate/);
      
      // Guest count
      const guestCount = result.extractions.find(e => e.field === 'guestCount');
      expect(guestCount?.value).toBe(120);
      
      // Location
      const location = result.extractions.find(e => e.field === 'location');
      expect(location?.value).toEqual(expect.objectContaining({ city: 'paris' }));
      
      // Indoor/outdoor
      const indoorOutdoor = result.extractions.find(e => e.field === 'indoorOutdoor');
      expect(indoorOutdoor?.value).toBe('indoor');
      
      // Service needs
      const serviceNeeds = result.extractions.find(e => e.field === 'serviceNeeds');
      expect(serviceNeeds?.value).toEqual(
        expect.arrayContaining(['sound', 'microphones', 'led_screen'])
      );
    });

    it('doit avoir confiance globale cohérente', () => {
      const result = extractFromText('conférence 200 personnes Paris intérieur son micros');
      
      expect(result.confidence).toBeGreaterThan(0.7);
      expect(result.processingTime).toBeLessThan(1000); // Performance
    });
  });

  describe('Performance et Robustesse', () => {
    it('doit traiter texte vide sans erreur', () => {
      const result = extractFromText('');
      
      expect(result.extractions).toEqual([]);
      expect(result.confidence).toBe(0);
    });

    it('doit traiter texte sans informations pertinentes', () => {
      const result = extractFromText('bonjour comment allez-vous');
      
      expect(result.extractions.length).toBe(0);
      expect(result.confidence).toBe(0);
    });

    it('doit traiter caractères spéciaux et accents', () => {
      const result = extractFromText('événement à Montréal avec éclairage spécial');
      
      expect(result.extractions.length).toBeGreaterThan(0);
    });

    it('doit avoir temps de traitement acceptable', () => {
      const longText = 'conférence '.repeat(100) + '200 personnes Paris';
      const result = extractFromText(longText);
      
      expect(result.processingTime).toBeLessThan(2000);
    });
  });

  describe('Edge Cases', () => {
    it('doit gérer dates ambiguës', () => {
      const result = extractField('12/03', 'eventDate'); // 12 mars ou 3 décembre?
      
      if (result) {
        expect(result.confidence).toBeLessThan(0.9); // Moins de confiance pour dates ambiguës
      }
    });

    it('doit gérer nombres avec unités multiples', () => {
      const result = extractFromText('50€ pour 100 personnes');
      
      const guestCount = result.extractions.find(e => e.field === 'guestCount');
      expect(guestCount?.value).toBe(100); // Doit extraire le bon nombre
    });

    it('doit gérer lieux homonymes', () => {
      const result = extractField('à Nice', 'location');
      
      expect(result?.value).toEqual(
        expect.objectContaining({
          city: 'nice',
          region: expect.stringMatching(/provence/i)
        })
      );
    });
  });
});

// ============================================================================
// TESTS D'INTÉGRATION AVEC V2 ENGINE
// ============================================================================

describe('Intégration avec Moteur Conversationnel V2', () => {
  it('doit s\'intégrer avec le système de slots', () => {
    const result = extractFromText('conférence 200 personnes Paris');
    
    // Le format doit être compatible avec le système de slots
    expect(result.extractions).toBeInstanceOf(Array);
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
    
    // Chaque extraction doit avoir le format attendu
    result.extractions.forEach(extraction => {
      expect(extraction).toHaveProperty('field');
      expect(extraction).toHaveProperty('value');
      expect(extraction).toHaveProperty('confidence');
      expect(extraction).toHaveProperty('source');
      expect(extraction).toHaveProperty('rawEvidence');
    });
  });
});

// ============================================================================
// BENCHMARK ET VALIDATION
// ============================================================================

function runValidationSuite(testCases: TestCase[]): ValidationResult[] {
  const results: ValidationResult[] = [];
  
  for (const testCase of testCases) {
    const startTime = Date.now();
    const extraction = extractFromText(testCase.input, testCase.id);
    const processingTime = Date.now() - startTime;
    
    let matches = true;
    let score = 1.0;
    const errors: string[] = [];
    
    // Vérifier chaque extraction attendue
    for (const expected of testCase.expectedExtractions) {
      const actual = extraction.extractions.find(e => e.field === expected.field);
      
      if (!actual) {
        matches = false;
        score -= 0.5;
        errors.push(`Missing extraction for field: ${expected.field}`);
        continue;
      }
      
      if (expected.value !== undefined && actual.value !== expected.value) {
        matches = false;
        score -= 0.3;
        errors.push(`Value mismatch for ${expected.field}: expected ${expected.value}, got ${actual.value}`);
      }
      
      if (expected.confidence !== undefined && actual.confidence < expected.confidence) {
        score -= 0.2;
        errors.push(`Low confidence for ${expected.field}: expected ${expected.confidence}, got ${actual.confidence}`);
      }
    }
    
    results.push({
      testCase,
      actualExtractions: extraction.extractions,
      matches,
      score: Math.max(0, score),
      errors
    });
  }
  
  return results;
}

// Export pour benchmarks externes
export { runValidationSuite };