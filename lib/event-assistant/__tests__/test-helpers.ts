import { EventBrief, BriefField, EventType, IndoorOutdoor, VenueType, ServiceNeed } from '../types';

/**
 * Helpers utilitaires pour les tests
 * Simplifient la création de mocks et assertions
 */

// ============================================================================
// CRÉATION DE MOCKS
// ============================================================================

/**
 * Créé un BriefField avec valeurs par défaut
 */
export function createMockBriefField<T>(
  value: T | null, 
  overrides: Partial<BriefField<T>> = {}
): BriefField<T> {
  return {
    value,
    confidence: 0.8,
    confirmationStatus: 'confirmed',
    sourceMessageIds: ['mock-message-1'],
    lastUpdatedAt: new Date().toISOString(),
    ...overrides
  };
}

/**
 * Créé un EventBrief de test avec champs optionnels
 */
export function createMockEventBrief(
  fields: Partial<{
    eventType: { value: EventType; confidence: number; confirmationStatus: any };
    guestCount: { value: number; confidence: number; confirmationStatus: any };
    location: { value: any; confidence: number; confirmationStatus: any };
    venueType: { value: VenueType; confidence: number; confirmationStatus: any };
    indoorOutdoor: { value: IndoorOutdoor; confidence: number; confirmationStatus: any };
    eventDate: { value: any; confidence: number; confirmationStatus: any };
    serviceNeeds: { value: ServiceNeed[]; confidence: number; confirmationStatus: any };
    deliveryNeeded: { value: boolean; confidence: number; confirmationStatus: any };
    installationNeeded: { value: boolean; confidence: number; confirmationStatus: any };
    technicianNeeded: { value: boolean; confidence: number; confirmationStatus: any };
    budgetRange: { value: any; confidence: number; confirmationStatus: any };
    constraints: { value: string[]; confidence: number; confirmationStatus: any };
    specialNotes: { value: string[]; confidence: number; confirmationStatus: any };
  }> = {}
): EventBrief {
  return {
    eventType: createMockBriefField(
      fields.eventType?.value || null,
      {
        confidence: fields.eventType?.confidence || 0.5,
        confirmationStatus: fields.eventType?.confirmationStatus || 'unconfirmed'
      }
    ),
    guestCount: createMockBriefField(
      fields.guestCount?.value || null,
      {
        confidence: fields.guestCount?.confidence || 0.5,
        confirmationStatus: fields.guestCount?.confirmationStatus || 'unconfirmed'
      }
    ),
    location: createMockBriefField(
      fields.location?.value || null,
      {
        confidence: fields.location?.confidence || 0.5,
        confirmationStatus: fields.location?.confirmationStatus || 'unconfirmed'
      }
    ),
    venueType: createMockBriefField(
      fields.venueType?.value || null,
      {
        confidence: fields.venueType?.confidence || 0.5,
        confirmationStatus: fields.venueType?.confirmationStatus || 'unconfirmed'
      }
    ),
    indoorOutdoor: createMockBriefField(
      fields.indoorOutdoor?.value || null,
      {
        confidence: fields.indoorOutdoor?.confidence || 0.5,
        confirmationStatus: fields.indoorOutdoor?.confirmationStatus || 'unconfirmed'
      }
    ),
    eventDate: createMockBriefField(
      fields.eventDate?.value || null,
      {
        confidence: fields.eventDate?.confidence || 0.5,
        confirmationStatus: fields.eventDate?.confirmationStatus || 'unconfirmed'
      }
    ),
    serviceNeeds: createMockBriefField(
      fields.serviceNeeds?.value || null,
      {
        confidence: fields.serviceNeeds?.confidence || 0.5,
        confirmationStatus: fields.serviceNeeds?.confirmationStatus || 'unconfirmed'
      }
    ),
    deliveryNeeded: createMockBriefField(
      fields.deliveryNeeded?.value || null,
      {
        confidence: fields.deliveryNeeded?.confidence || 0.5,
        confirmationStatus: fields.deliveryNeeded?.confirmationStatus || 'unconfirmed'
      }
    ),
    installationNeeded: createMockBriefField(
      fields.installationNeeded?.value || null,
      {
        confidence: fields.installationNeeded?.confidence || 0.5,
        confirmationStatus: fields.installationNeeded?.confirmationStatus || 'unconfirmed'
      }
    ),
    technicianNeeded: createMockBriefField(
      fields.technicianNeeded?.value || null,
      {
        confidence: fields.technicianNeeded?.confidence || 0.5,
        confirmationStatus: fields.technicianNeeded?.confirmationStatus || 'unconfirmed'
      }
    ),
    budgetRange: createMockBriefField(
      fields.budgetRange?.value || null,
      {
        confidence: fields.budgetRange?.confidence || 0.5,
        confirmationStatus: fields.budgetRange?.confirmationStatus || 'unconfirmed'
      }
    ),
    constraints: createMockBriefField(
      fields.constraints?.value || null,
      {
        confidence: fields.constraints?.confidence || 0.5,
        confirmationStatus: fields.constraints?.confirmationStatus || 'unconfirmed'
      }
    ),
    specialNotes: createMockBriefField(
      fields.specialNotes?.value || null,
      {
        confidence: fields.specialNotes?.confidence || 0.5,
        confirmationStatus: fields.specialNotes?.confirmationStatus || 'unconfirmed'
      }
    )
  };
}

/**
 * Créé un mock provider simple pour tests
 */
export function createMockProvider(overrides: any = {}) {
  return {
    id: `provider-${Math.random().toString(36).substr(2, 9)}`,
    title: "Prestataire Test",
    location: "Paris",
    serviceAreas: ["Paris", "Île-de-France"],
    categories: ["son", "micros"],
    deliveryZones: ["Paris"],
    maxGuestCapacity: 200,
    rating: 4.5,
    ratingCount: 25,
    ...overrides
  };
}

// ============================================================================
// ASSERTIONS HELPERS
// ============================================================================

/**
 * Vérifie qu'une recommandation inclut des catégories spécifiques
 */
export function assertRecommendationIncludes(
  recommendation: any,
  expectedCategories: string[]
): void {
  expectedCategories.forEach(category => {
    const hasCategory = recommendation.categories?.includes(category) ||
                       recommendation.equipment?.some((eq: any) => 
                         eq.category === category ||
                         eq.label?.toLowerCase().includes(category.toLowerCase())
                       );
    
    if (!hasCategory) {
      throw new Error(`Recommandation ne contient pas la catégorie: ${category}`);
    }
  });
}

/**
 * Vérifie qu'une recommandation exclut des catégories spécifiques
 */
export function assertRecommendationExcludes(
  recommendation: any,
  excludedCategories: string[]
): void {
  excludedCategories.forEach(category => {
    const hasCategory = recommendation.categories?.includes(category) ||
                       recommendation.equipment?.some((eq: any) => 
                         eq.category === category ||
                         eq.label?.toLowerCase().includes(category.toLowerCase())
                       );
    
    if (hasCategory) {
      throw new Error(`Recommandation contient la catégorie exclue: ${category}`);
    }
  });
}

/**
 * Vérifie qu'un message assistant ne contient pas de mots interdits (répétition)
 */
export function assertNoForbiddenWords(
  assistantMessage: string,
  forbiddenWords: string[]
): void {
  const lowerMessage = assistantMessage.toLowerCase();
  
  forbiddenWords.forEach(word => {
    if (lowerMessage.includes(word.toLowerCase())) {
      throw new Error(`Message assistant contient un mot interdit: "${word}" dans "${assistantMessage}"`);
    }
  });
}

/**
 * Vérifie la progression des scores entre setups Essential/Standard/Premium
 */
export function assertTierProgression(
  recommendations: any[]
): void {
  const essential = recommendations.find(r => r.tier === 'essential');
  const standard = recommendations.find(r => r.tier === 'standard');
  const premium = recommendations.find(r => r.tier === 'premium');
  
  if (!essential || !standard || !premium) {
    throw new Error('Tous les tiers (Essential/Standard/Premium) doivent être présents');
  }
  
  // Premium doit avoir plus d'équipements que Standard
  if (premium.equipment.length < standard.equipment.length) {
    throw new Error('Premium devrait avoir plus d\'équipements que Standard');
  }
  
  // Standard doit avoir plus que Essential
  if (standard.equipment.length < essential.equipment.length) {
    throw new Error('Standard devrait avoir plus d\'équipements qu\'Essential');
  }
}

/**
 * Vérifie qu'un slot contient une valeur attendue
 */
export function assertSlotValue(
  slots: any,
  slotKey: string,
  expectedValue: any
): void {
  const slot = slots[slotKey];
  
  if (!slot) {
    throw new Error(`Slot ${slotKey} n'existe pas`);
  }
  
  if (slot.candidates.length === 0) {
    throw new Error(`Slot ${slotKey} n'a aucun candidat`);
  }
  
  const actualValue = slot.candidates[0].value;
  
  if (actualValue !== expectedValue) {
    throw new Error(
      `Slot ${slotKey} a la valeur "${actualValue}" au lieu de "${expectedValue}"`
    );
  }
}

/**
 * Vérifie qu'un slot a été résolu (pas vide)
 */
export function assertSlotResolved(
  slots: any,
  slotKey: string
): void {
  const slot = slots[slotKey];
  
  if (!slot) {
    throw new Error(`Slot ${slotKey} n'existe pas`);
  }
  
  if (slot.status === 'empty') {
    throw new Error(`Slot ${slotKey} est toujours vide`);
  }
  
  if (slot.candidates.length === 0) {
    throw new Error(`Slot ${slotKey} n'a aucun candidat malgré status ${slot.status}`);
  }
}

/**
 * Vérifie qu'une question n'est pas dans la liste des questions posées
 */
export function assertQuestionNotAsked(
  askedQuestions: any[],
  fieldToCheck: string
): void {
  const wasAsked = askedQuestions.some(q => 
    q.field === fieldToCheck && !q.answered
  );
  
  if (wasAsked) {
    throw new Error(`Question sur ${fieldToCheck} ne devrait pas être posée/reposée`);
  }
}

/**
 * Vérifie qu'une question a été marquée comme answered
 */
export function assertQuestionAnswered(
  askedQuestions: any[],
  semanticKey: string
): void {
  const question = askedQuestions.find(q => q.semanticKey === semanticKey);
  
  if (!question) {
    throw new Error(`Question avec clé sémantique ${semanticKey} n'a pas été trouvée`);
  }
  
  if (!question.answered) {
    throw new Error(`Question ${semanticKey} n'a pas été marquée comme answered`);
  }
}

// ============================================================================
// CORPUS DE TEST RÉUTILISABLES
// ============================================================================

/**
 * Messages de test pour différents types d'événements
 */
export const TEST_MESSAGES = {
  // Conférences
  CONFERENCE_BASIC: "conférence pour 100 personnes",
  CONFERENCE_COMPLETE: "conférence 150 personnes Paris intérieur micros son livraison",
  CONFERENCE_LARGE: "grande conférence 500 personnes avec écran LED",
  
  // Anniversaires
  BIRTHDAY_BASIC: "anniversaire pour 50 personnes",
  BIRTHDAY_DJ: "anniversaire 80 personnes avec DJ et danse",
  BIRTHDAY_MINIMAL: "anniversaire simple, juste du son",
  
  // Cocktails
  COCKTAIL_CORPORATE: "cocktail corporate 120 personnes Paris",
  COCKTAIL_ELEGANT: "cocktail élégant avec ambiance musicale",
  
  // Cultes
  RELIGIOUS_BASIC: "culte avec prises de parole",
  RELIGIOUS_MUSIC: "service religieux avec voix et musique",
  
  // Corrections
  CORRECTION_NUMBER: "non finalement 120 personnes",
  CORRECTION_DATE: "non samedi plutôt",
  CORRECTION_LIEU: "finalement à Lyon",
  
  // Négations  
  NO_DJ: "pas besoin de DJ",
  NO_LIGHTING: "pas de lumière",
  NO_INSTALLATION: "pas d'installation, on gère",
  JUST_SOUND: "juste du son et micros",
  
  // Outdoor
  OUTDOOR_COVERED: "extérieur mais sous barnum", 
  OUTDOOR_FULL: "plein air total",
  
  // Explicites
  EXPLICIT_MICS: "2 micros HF exactement",
  EXPLICIT_LED: "écran LED obligatoire",
  EXPLICIT_BRAND: "micros Shure si possible",
  
  // Vagues
  VAGUE_SOON: "c'est bientôt",
  VAGUE_MANY: "pas mal de monde",
  VAGUE_EVENT: "événement"
};

/**
 * Corpus d'assertions anti-répétition réutilisables
 */
export const ANTI_REPETITION_WORDS = {
  GUEST_COUNT: ["combien", "nombre", "personnes", "invités", "participants"],
  EVENT_TYPE: ["type", "événement", "quel genre", "quelle sorte"],
  LOCATION: ["où", "lieu", "ville", "adresse"],
  DATE: ["quand", "date"],
  SERVICES: ["services", "besoin", "matériel"],
  INDOOR_OUTDOOR: ["intérieur", "extérieur"]
};

/**
 * Scénarios de test réutilisables
 */
export const TEST_SCENARIOS = {
  COMPLETE_CONFERENCE: {
    messages: [
      "conférence pour 150 personnes",
      "à Lyon en intérieur",
      "avec micros et écran LED", 
      "livraison nécessaire"
    ],
    expectedSlots: {
      eventType: 'conference',
      guestCount: 150,
      location: { city: 'Lyon' },
      indoorOutdoor: 'indoor',
      serviceNeeds: ['sound', 'microphones', 'led_screen'],
      deliveryNeeded: true
    }
  },
  
  BIRTHDAY_WITH_CORRECTIONS: {
    messages: [
      "anniversaire à Paris",
      "pour 100 personnes",
      "non finalement 80",
      "en intérieur",
      "avec DJ"
    ],
    expectedSlots: {
      eventType: 'birthday',
      guestCount: 80, // Correction appliquée
      location: { city: 'Paris' },
      indoorOutdoor: 'indoor',
      serviceNeeds: ['sound', 'dj']
    }
  },
  
  MINIMAL_SETUP: {
    messages: [
      "événement simple",
      "juste qu'on entende bien les discours",
      "50 personnes",
      "pas de DJ, pas de lumière"
    ],
    expectedSlots: {
      guestCount: 50,
      serviceNeeds: ['sound', 'microphones']
      // DJ et lighting exclus
    }
  }
};

// ============================================================================
// VALIDATEURS MÉTIER
// ============================================================================

/**
 * Valide qu'une recommandation est crédible pour le type d'événement
 */
export function validateRecommendationForEventType(
  recommendation: any,
  eventType: EventType
): string[] {
  const issues: string[] = [];
  
  switch (eventType) {
    case 'conference':
      if (!hasEquipmentCategory(recommendation, ['sound', 'microphones'])) {
        issues.push('Conférence doit inclure son et micros');
      }
      if (hasEquipmentCategory(recommendation, ['dj'])) {
        issues.push('Conférence ne devrait pas inclure DJ par défaut');
      }
      break;
      
    case 'birthday':
    case 'private_party':
      if (!hasEquipmentCategory(recommendation, ['sound'])) {
        issues.push('Anniversaire doit inclure son');
      }
      break;
      
    case 'religious_service':
      if (!hasEquipmentCategory(recommendation, ['sound', 'microphones'])) {
        issues.push('Service religieux doit inclure son et micros');
      }
      break;
      
    case 'dj_set':
      if (!hasEquipmentCategory(recommendation, ['sound', 'dj'])) {
        issues.push('DJ Set doit inclure son et DJ');
      }
      break;
  }
  
  return issues;
}

/**
 * Helper pour vérifier si une recommandation inclut certaines catégories
 */
function hasEquipmentCategory(recommendation: any, categories: string[]): boolean {
  return categories.some(category => 
    recommendation.categories?.includes(category) ||
    recommendation.equipment?.some((eq: any) => 
      eq.category === category ||
      eq.label?.toLowerCase().includes(category.toLowerCase())
    )
  );
}

/**
 * Valide la cohérence d'un matching provider
 */
export function validateProviderMatching(
  provider: any,
  eventBrief: EventBrief,
  expectedScore?: number
): string[] {
  const issues: string[] = [];
  
  // Vérifier géolocalisation
  if (eventBrief.location.value?.city && provider.location) {
    const eventCity = eventBrief.location.value.city.toLowerCase();
    const providerLocation = provider.location.toLowerCase();
    const serviceAreas = provider.serviceAreas || [];
    
    const isCompatible = providerLocation.includes(eventCity) ||
                        serviceAreas.some((area: string) => 
                          area.toLowerCase().includes(eventCity) ||
                          eventCity.includes(area.toLowerCase())
                        );
    
    if (!isCompatible) {
      issues.push(`Provider ${provider.title} incompatible géographiquement avec ${eventCity}`);
    }
  }
  
  // Vérifier capacité
  if (eventBrief.guestCount.value && provider.maxGuestCapacity) {
    if (provider.maxGuestCapacity < eventBrief.guestCount.value) {
      issues.push(`Provider ${provider.title} capacité insuffisante: ${provider.maxGuestCapacity} < ${eventBrief.guestCount.value}`);
    }
  }
  
  // Vérifier catégories
  if (eventBrief.serviceNeeds.value && provider.categories) {
    const missingCategories = eventBrief.serviceNeeds.value.filter(need => 
      !provider.categories.includes(need)
    );
    
    if (missingCategories.length > 0) {
      issues.push(`Provider ${provider.title} manque catégories: ${missingCategories.join(', ')}`);
    }
  }
  
  return issues;
}

/**
 * Valide qu'un score de matching est cohérent
 */
export function validateMatchingScore(
  provider: any,
  score: number,
  eventBrief: EventBrief
): string[] {
  const issues: string[] = [];
  
  if (score < 0 || score > 100) {
    issues.push(`Score ${score} hors limites [0-100]`);
  }
  
  // Score très bas devrait avoir des raisons valides
  if (score < 20) {
    const validationIssues = validateProviderMatching(provider, eventBrief);
    if (validationIssues.length === 0) {
      issues.push(`Score très bas ${score} sans raison apparente`);
    }
  }
  
  // Score très haut devrait être justifié
  if (score > 90) {
    const hasExcellentFit = provider.specialties?.some((spec: string) => 
      spec === eventBrief.eventType.value
    ) || provider.rating >= 4.8;
    
    if (!hasExcellentFit) {
      issues.push(`Score très haut ${score} pas suffisamment justifié`);
    }
  }
  
  return issues;
}

/**
 * Génère un ID de test unique
 */
export function generateTestId(): string {
  return `test-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
}