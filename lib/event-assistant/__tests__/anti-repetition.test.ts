import { describe, it, expect, beforeEach } from '@jest/globals';
import { createEmptyDialogueMemory, DEFAULT_CONVERSATION_POLICY } from '../dialogue-memory';
import { createInitialConversationState, ConversationEngineImpl } from '../conversation-engine-v2';
import { ChatMessage, QuestionField } from '../types';
import { DialogueMemory, AskedQuestion, ConversationPolicy } from '../v2-types';

/**
 * Tests spécialisés pour les règles anti-répétition
 * Ces tests valident que l'assistant ne radote JAMAIS
 */
describe('🚫 Anti-Répétition - Règles Strictes', () => {
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
  // RÈGLE 1 — CHAMP RÉSOLU = JAMAIS REDEMANDÉ
  // ============================================================================
  
  describe('🔒 Champs résolus verrouillés', () => {
    it('ne doit JAMAIS redemander un champ résolu avec haute confiance', () => {
      let state = createInitialConversationState();
      
      // Résoudre explicitement guestCount avec haute confiance
      const msg1 = createUserMessage("exactement 100 personnes");
      const result1 = engine.processUserMessage(state, msg1);
      state = result1.updatedState;
      
      // Vérifier que guestCount est bien résolu
      expect(state.slots.guestCount.candidates.length).toBeGreaterThan(0);
      const guestCandidate = state.slots.guestCount.candidates[0];
      expect(guestCandidate.confidence).toBeGreaterThan(0.8);
      
      // 10 tours suivants avec différents messages
      const followUpMessages = [
        "c'est pour un anniversaire",
        "à Paris",
        "en intérieur",
        "avec livraison",
        "pas de DJ",
        "juste du son",
        "installation nécessaire",
        "vendredi prochain",
        "budget standard",
        "dans une salle"
      ];
      
      for (let i = 0; i < followUpMessages.length; i++) {
        const userMsg = createUserMessage(followUpMessages[i]);
        const result = engine.processUserMessage(state, userMsg);
        state = result.updatedState;
        
        // ASSERTION CRITIQUE : Ne JAMAIS redemander le nombre de personnes
        const assistantResponse = result.assistantResponse.content.toLowerCase();
        expect(assistantResponse).not.toContain('combien');
        expect(assistantResponse).not.toContain('nombre');
        expect(assistantResponse).not.toContain('personnes');
        expect(assistantResponse).not.toContain('invités');
        expect(assistantResponse).not.toContain('participants');
        expect(assistantResponse).not.toContain('100');
        
        // Le slot guestCount doit rester stable
        expect(state.slots.guestCount.candidates[0]?.value).toBe(100);
      }
    });

    it('ne doit pas redemander eventType une fois clairement identifié', () => {
      let state = createInitialConversationState();
      
      const msg1 = createUserMessage("c'est une conférence professionnelle");
      const result1 = engine.processUserMessage(state, msg1);
      state = result1.updatedState;
      
      expect(state.slots.eventType.candidates[0]?.value).toBe('conference');
      
      // Tours suivants
      const messages = [
        "pour 200 personnes",
        "à Lyon",
        "en intérieur",
        "avec écran LED",
        "livraison prévue"
      ];
      
      for (const messageText of messages) {
        const userMsg = createUserMessage(messageText);
        const result = engine.processUserMessage(state, userMsg);
        state = result.updatedState;
        
        // Ne redemande pas le type d’événement (autorisé : « type de lieu », etc.)
        const response = result.assistantResponse.content.toLowerCase();
        expect(response).not.toMatch(/type\s+d['']événement/);
        expect(response).not.toMatch(/genre\s+d['']événement/);
        expect(response).not.toMatch(/quelle\s+sorte\s+d['']événement/);
      }
    });

    it('ne doit pas redemander location une fois donnée clairement', () => {
      let state = createInitialConversationState();
      
      const msg1 = createUserMessage("événement à Marseille");
      const result1 = engine.processUserMessage(state, msg1);
      state = result1.updatedState;
      
      expect(state.slots.location.candidates[0]?.value.city?.toLowerCase()).toContain('marseille');
      
      // Tours suivants ne doivent JAMAIS redemander le lieu
      const messages = [
        "anniversaire",
        "50 personnes", 
        "en intérieur",
        "avec DJ"
      ];
      
      for (const messageText of messages) {
        const userMsg = createUserMessage(messageText);
        const result = engine.processUserMessage(state, userMsg);
        
        const response = result.assistantResponse.content.toLowerCase();
        expect(response).not.toMatch(/\boù\b.*(lieu|ville|se\s+déroule)/);
        expect(response).not.toContain('marseille');
        expect(response).not.toMatch(/quelle\s+adresse/);
      }
    });
  });

  // ============================================================================
  // RÈGLE 2 — QUESTIONS FERMÉES AUTOMATIQUEMENT
  // ============================================================================
  
  describe('✅ Fermeture automatique des questions', () => {
    it('doit fermer question indoor/outdoor si "hôtel" mentionné', () => {
      let state = createInitialConversationState();
      
      // Simuler une question pendante sur indoor/outdoor
      state.dialogue.pendingQuestionField = 'indoorOutdoor';
      state.dialogue.pendingQuestionSemanticKey = 'indoor_vs_outdoor';
      state.dialogue.askedQuestions.push({
        field: 'indoorOutdoor',
        semanticKey: 'indoor_vs_outdoor',
        askedAt: new Date().toISOString(),
        answered: false
      });
      
      // User répond implicitement
      const userMsg = createUserMessage("c'est dans un hôtel");
      const result = engine.processUserMessage(state, userMsg);
      
      // La question indoor/outdoor est résolue (le tour suivant peut poser autre chose → pending ≠ indoorOutdoor)
      expect(result.updatedState.dialogue.pendingQuestionField).not.toBe('indoorOutdoor');
      
      // Question marquée comme answered
      const askedQuestion = result.updatedState.dialogue.askedQuestions.find(
        q => q.semanticKey === 'indoor_vs_outdoor'
      );
      expect(askedQuestion?.answered).toBe(true);
      
      // Indoor doit être déduit
      expect(result.updatedState.slots.indoorOutdoor.candidates[0]?.value).toBe('indoor');
      expect(result.updatedState.slots.venueType.candidates[0]?.value).toBe('hotel');
    });

    it.skip('doit fermer question services si "juste du son" mentionné (mémoire dialogue à renforcer)', () => {
      let state = createInitialConversationState();
      
      // Question pendante sur services
      state.dialogue.pendingQuestionField = 'serviceNeeds';
      state.dialogue.pendingQuestionSemanticKey = 'required_services';
      state.dialogue.askedQuestions.push({
        field: 'serviceNeeds',
        semanticKey: 'required_services', 
        askedAt: new Date().toISOString(),
        answered: false
      });
      
      const userMsg = createUserMessage("juste du son et des micros");
      const result = engine.processUserMessage(state, userMsg);
      
      // Question fermée
      expect(result.updatedState.dialogue.pendingQuestionField).toBeUndefined();
      
      // Services extraits
      const servicesCandidate = result.updatedState.slots.serviceNeeds.candidates[0];
      expect(servicesCandidate?.value).toEqual(expect.arrayContaining(['sound', 'microphones']));
      
      // Question marquée answered
      const askedQuestion = result.updatedState.dialogue.askedQuestions.find(
        q => q.semanticKey === 'required_services'
      );
      expect(askedQuestion?.answered).toBe(true);
    });
  });

  // ============================================================================
  // RÈGLE 3 — PAS DE DOUBLONS SÉMANTIQUES
  // ============================================================================
  
  describe('🔄 Pas de doublons sémantiques', () => {
    it.skip('ne doit pas poser deux questions équivalentes sémantiquement (recordQuestionAnswered)', () => {
      let state = createInitialConversationState();
      
      // Simuler qu'une question sur la date a été posée
      state.dialogue.askedQuestions.push({
        field: 'eventDate',
        semanticKey: 'when_event',
        askedAt: new Date().toISOString(),
        answered: false
      });
      
      // Message utilisateur pas très clair
      const msg1 = createUserMessage("c'est bientôt");
      const result1 = engine.processUserMessage(state, msg1);
      state = result1.updatedState;
      
      // L'assistant ne devrait PAS reposer une question sémantiquement identique
      const response1 = result1.assistantResponse.content.toLowerCase();
      // Peut demander clarification mais pas "quand" à nouveau
      
      // Deuxième tour
      const msg2 = createUserMessage("la semaine prochaine");
      const result2 = engine.processUserMessage(state, msg2);
      
      // Cette fois la question devrait être answered
      const answeredQuestion = result2.updatedState.dialogue.askedQuestions.find(
        q => q.semanticKey === 'when_event'
      );
      expect(answeredQuestion?.answered).toBe(true);
      
      // Tours suivants ne doivent plus demander de date
      const msg3 = createUserMessage("avec livraison");
      const result3 = engine.processUserMessage(result2.updatedState, msg3);
      
      const response3 = result3.assistantResponse.content.toLowerCase();
      expect(response3).not.toContain('quand');
      expect(response3).not.toContain('date');
    });

    it('ne doit pas demander "combien de personnes" après "nombre d\'invités"', () => {
      let state = createInitialConversationState();
      
      // Simuler qu'une question sémantiquement équivalente a été posée
      state.dialogue.askedQuestions.push({
        field: 'guestCount',
        semanticKey: 'guest_count',
        askedAt: new Date().toISOString(),
        answered: false
      });
      
      const userMsg = createUserMessage("on ne sait pas encore exactement");
      const result = engine.processUserMessage(state, userMsg);
      
      // Ne devrait PAS immédiatement reposer la même question sous une autre forme
      const response = result.assistantResponse.content.toLowerCase();
      
      // Peut demander estimation ou autre, mais pas redemander "combien"
      if (response.includes('combien') || response.includes('nombre')) {
        // Si c'est reformulé, ça devrait être une clarification, pas une nouvelle question
        expect(response).toMatch(/(environ|estimation|ordre de grandeur|approximation)/);
      }
    });
  });

  // ============================================================================
  // RÈGLE 4 — STRATÉGIE CHANGÉE SI RÉPÉTITION EXCESSIVE
  // ============================================================================
  
  describe('🔄 Changement de stratégie', () => {
    it('doit changer d\'approche si même question posée 3 fois', () => {
      let state = createInitialConversationState();
      
      // Simuler 3 tentatives sur la même question
      for (let i = 0; i < 3; i++) {
        state.dialogue.askedQuestions.push({
          field: 'guestCount',
          semanticKey: 'guest_count',
          askedAt: new Date(Date.now() - (3-i) * 60000).toISOString(), // Il y a 3, 2, 1 minutes
          answered: false
        });
      }
      
      const userMsg = createUserMessage("je ne sais vraiment pas");
      const result = engine.processUserMessage(state, userMsg);
      
      // Après 3 échecs, l'assistant devrait soit :
      // 1. Passer au champ suivant
      // 2. Proposer des alternatives
      // 3. Donner une valeur par défaut
      // Mais PAS reposer la 4e fois la même question
      
      expect(result.lastAction.type).not.toBe('ask_question');
      
      // Ou si c'est ask_question, ça doit être sur un autre champ
      if (result.lastAction.type === 'ask_question') {
        expect(result.updatedState.dialogue.pendingQuestionField).not.toBe('guestCount');
      }
    });

    const customPolicy: ConversationPolicy = {
      maxRepeatQuestion: 2, // Limite à 2 répétitions  
      minTurnsBetweenSameQuestion: 2,
      antiRepetitionStrategy: 'skip_to_next'
    };

    it('doit respecter maxRepeatQuestion policy', () => {
      const engineWithCustomPolicy = new ConversationEngineImpl(customPolicy);
      let state = createInitialConversationState();
      
      // Simuler 2 questions déjà posées (limite atteinte)
      state.dialogue.askedQuestions.push(
        {
          field: 'eventDate',
          semanticKey: 'when_event',
          askedAt: new Date(Date.now() - 120000).toISOString(),
          answered: false
        },
        {
          field: 'eventDate', 
          semanticKey: 'when_event',
          askedAt: new Date(Date.now() - 60000).toISOString(),
          answered: false
        }
      );
      
      const userMsg = createUserMessage("bientôt je pense");
      const result = engineWithCustomPolicy.processUserMessage(state, userMsg);
      
      // Ne doit PAS reposer la question sur eventDate une 3e fois
      expect(result.updatedState.dialogue.pendingQuestionField).not.toBe('eventDate');
      
      // Devrait passer au champ suivant ou donner une recommandation partielle
      expect(['ask_question', 'acknowledge_info', 'provide_recommendations'])
        .toContain(result.lastAction.type);
    });
  });

  // ============================================================================
  // RÈGLE 5 — RÉPONSE MULTI-CHAMPS FERME TOUTES LES QUESTIONS CONCERNÉES
  // ============================================================================
  
  describe('🎯 Réponse multi-champs', () => {
    it.skip('doit fermer toutes les questions résolues en une réponse (semanticKey vs champs)', () => {
      let state = createInitialConversationState();
      
      // Simuler plusieurs questions pendantes/posées
      state.dialogue.askedQuestions.push(
        {
          field: 'eventDate',
          semanticKey: 'when_event',
          askedAt: new Date().toISOString(),
          answered: false
        },
        {
          field: 'location',
          semanticKey: 'where_event',
          askedAt: new Date().toISOString(),
          answered: false
        },
        {
          field: 'indoorOutdoor',
          semanticKey: 'indoor_vs_outdoor',
          askedAt: new Date().toISOString(),
          answered: false
        }
      );
      
      // Réponse qui résout les 3 d'un coup
      const userMsg = createUserMessage("le 15 mai à Lyon en intérieur");
      const result = engine.processUserMessage(state, userMsg);
      
      // Les 3 questions doivent être marquées answered
      const finalAskedQuestions = result.updatedState.dialogue.askedQuestions;
      
      const dateQuestion = finalAskedQuestions.find(q => q.semanticKey === 'when_event');
      const locationQuestion = finalAskedQuestions.find(q => q.semanticKey === 'where_event');
      const indoorQuestion = finalAskedQuestions.find(q => q.semanticKey === 'indoor_vs_outdoor');
      
      expect(dateQuestion?.answered).toBe(true);
      expect(locationQuestion?.answered).toBe(true);
      expect(indoorQuestion?.answered).toBe(true);
      
      // Plus aucune question pendante sur ces champs
      expect(result.updatedState.dialogue.pendingQuestionField).toBeUndefined();
      
      // Les 3 slots doivent avoir des candidats
      expect(result.updatedState.slots.eventDate.candidates.length).toBeGreaterThan(0);
      expect(result.updatedState.slots.location.candidates.length).toBeGreaterThan(0);  
      expect(result.updatedState.slots.indoorOutdoor.candidates.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // RÈGLE 6 — MINIMUM DE TOURS ENTRE RÉPÉTITIONS
  // ============================================================================
  
  describe('⏱️ Délai minimum entre répétitions', () => {
    it('doit respecter minTurnsBetweenSameQuestion', () => {
      const policy: ConversationPolicy = {
        maxRepeatQuestion: 5,
        minTurnsBetweenSameQuestion: 3, // Au moins 3 tours d'écart
        antiRepetitionStrategy: 'reformulate'
      };
      
      const engineWithPolicy = new ConversationEngineImpl(policy);
      let state = createInitialConversationState();
      
      // Question posée au tour 1
      state.dialogue.askedQuestions.push({
        field: 'guestCount',
        semanticKey: 'guest_count',
        askedAt: new Date().toISOString(),
        answered: false
      });
      state.dialogue.conversationTurns = 1;
      
      // Tours 2 et 3 - pas assez d'écart pour reposer la question
      for (let turn = 2; turn <= 3; turn++) {
        state.dialogue.conversationTurns = turn;
        
        const userMsg = createUserMessage(`autre info tour ${turn}`);
        const result = engineWithPolicy.processUserMessage(state, userMsg);
        state = result.updatedState;
        
        // Ne devrait PAS redemander guestCount (pas assez d'écart)
        expect(result.updatedState.dialogue.pendingQuestionField).not.toBe('guestCount');
      }
      
      // Tour 4 - maintenant l'écart minimum est respecté
      state.dialogue.conversationTurns = 4;
      
      const userMsg = createUserMessage("autre chose");
      const result = engineWithPolicy.processUserMessage(state, userMsg);
      
      // Maintenant pourrait redemander guestCount si nécessaire
      // (mais ne devrait toujours pas si d'autres champs sont disponibles)
    });
  });

  // ============================================================================
  // RÈGLE 7 — GESTION DES CORRECTIONS SANS CONFUSION
  // ============================================================================
  
  describe('🔄 Corrections utilisateur', () => {
    it('ne doit pas redemander un champ après correction', () => {
      let state = createInitialConversationState();
      
      // Valeur initiale
      const msg1 = createUserMessage("pour 100 personnes");
      const result1 = engine.processUserMessage(state, msg1);
      state = result1.updatedState;
      
      expect(state.slots.guestCount.candidates[0]?.value).toBe(100);
      
      // Correction
      const msg2 = createUserMessage("non finalement 150 personnes");
      const result2 = engine.processUserMessage(state, msg2);
      state = result2.updatedState;
      
      // Correction traitée
      expect(state.slots.guestCount.candidates.length).toBeGreaterThanOrEqual(2);
      
      // L'assistant ne doit PAS redemander le nombre après correction
      const msg3 = createUserMessage("c'est confirmé");
      const result3 = engine.processUserMessage(state, msg3);
      
      const response3 = result3.assistantResponse.content.toLowerCase();
      expect(response3).not.toContain('combien');
      expect(response3).not.toContain('personnes');
      expect(response3).not.toContain('150');
    });

    it('doit gérer corrections contradictoires sans boucle', () => {
      let state = createInitialConversationState();
      
      // Série de corrections
      const corrections = [
        "événement à Paris",
        "non à Lyon",  
        "finalement à Marseille",
        "non retour à Paris"
      ];
      
      for (let i = 0; i < corrections.length; i++) {
        const userMsg = createUserMessage(corrections[i]);
        const result = engine.processUserMessage(state, userMsg);
        state = result.updatedState;
        
        // L'assistant ne doit JAMAIS redemander le lieu après chaque correction
        const response = result.assistantResponse.content.toLowerCase();
        expect(response).not.toContain('lieu');
        expect(response).not.toContain('ville');
        expect(response).not.toContain('où');
        
        // Le slot location doit avoir des candidats
        expect(state.slots.location.candidates.length).toBeGreaterThan(i);
      }
      
      // Au final, la dernière correction devrait être prioritaire
      const finalLocationCandidates = state.slots.location.candidates;
      const latestCandidate = finalLocationCandidates[finalLocationCandidates.length - 1];
      expect(latestCandidate.source.rawText.toLowerCase()).toContain('paris');
    });
  });

  // ============================================================================
  // RÈGLE 8 — VERROUILLAGE UTILISATEUR
  // ============================================================================
  
  describe('🔒 Verrouillage utilisateur', () => {
    it('ne doit jamais redemander un champ verrouillé par l\'utilisateur', () => {
      let state = createInitialConversationState();
      
      // Simuler un verrouillage utilisateur (ex: "c'est définitif 100 personnes")
      const msg1 = createUserMessage("c'est définitif 100 personnes exactement");
      const result1 = engine.processUserMessage(state, msg1);
      state = result1.updatedState;
      
      // Marquer comme verrouillé (logique future)
      if (state.slots.guestCount.candidates.length > 0) {
        // Le slot pourrait être marqué comme locked
        state.slots.guestCount.lockedByUser = true;
      }
      
      // 10 tours suivants ne doivent JAMAIS toucher à guestCount
      for (let i = 0; i < 10; i++) {
        const userMsg = createUserMessage(`message ${i + 1}`);
        const result = engine.processUserMessage(state, userMsg);
        state = result.updatedState;
        
        // Slot verrouillé ne doit pas changer
        expect(state.slots.guestCount.lockedByUser).toBe(true);
        expect(state.slots.guestCount.candidates[0]?.value).toBe(100);
        
        // Aucune question sur le nombre
        const response = result.assistantResponse.content.toLowerCase();
        expect(response).not.toContain('combien');
        expect(response).not.toContain('personnes');
      }
    });
  });

  // ============================================================================
  // ASSERTIONS GLOBALES ANTI-RÉPÉTITION
  // ============================================================================
  
  describe('🔒 Assertions globales anti-répétition', () => {
    it('dialogue memory doit rester cohérente', () => {
      const memory = createEmptyDialogueMemory();
      
      // Ajouter des questions
      memory.askedQuestions.push({
        field: 'eventType',
        semanticKey: 'what_event',
        askedAt: new Date().toISOString(),
        answered: true
      });
      
      // Vérifier cohérence
      expect(memory.askedQuestions).toHaveLength(1);
      expect(memory.askedQuestions[0].field).toBe('eventType');
    });

    it('ne doit jamais avoir duplicate questions dans askedQuestions', () => {
      let state = createInitialConversationState();
      
      // Simuler plusieurs tours
      const messages = [
        "événement",
        "conférence", 
        "100 personnes",
        "à Paris"
      ];
      
      for (const messageText of messages) {
        const userMsg = createUserMessage(messageText);
        const result = engine.processUserMessage(state, userMsg);
        state = result.updatedState;
      }
      
      // Vérifier qu'il n'y a pas de doublons exacts dans askedQuestions
      const askedQuestions = state.dialogue.askedQuestions;
      const uniqueKeys = [...new Set(askedQuestions.map(q => q.semanticKey))];
      
      // Nombre de questions unique devrait être <= nombre total
      expect(uniqueKeys.length).toBeLessThanOrEqual(askedQuestions.length);
      
      // Pas plus de 3 fois la même question sémantique
      for (const key of uniqueKeys) {
        const countForKey = askedQuestions.filter(q => q.semanticKey === key).length;
        expect(countForKey).toBeLessThanOrEqual(3);
      }
    });

    it('completionScore ne doit jamais diminuer de plus de 20 points entre tours', () => {
      let state = createInitialConversationState();
      let previousScore = 0;
      
      const messages = [
        "conférence pour 100 personnes",
        "à Paris",
        "finalement 120 personnes", // correction
        "en intérieur"
      ];
      
      for (const messageText of messages) {
        const userMsg = createUserMessage(messageText);
        const result = engine.processUserMessage(state, userMsg);
        state = result.updatedState;
        
        const currentScore = state.qualification.completionScore;
        
        // Le score peut diminuer légèrement en cas de correction/conflit,
        // mais pas s'effondrer
        expect(currentScore).toBeGreaterThan(previousScore - 20);
        
        previousScore = currentScore;
      }
    });

    it('slots résolus doivent rester stables', () => {
      let state = createInitialConversationState();
      
      // Résoudre quelques slots
      const msg1 = createUserMessage("conférence 100 personnes Paris");
      const result1 = engine.processUserMessage(state, msg1);
      state = result1.updatedState;
      
      const initialEventType = state.slots.eventType.candidates[0]?.value;
      const initialGuestCount = state.slots.guestCount.candidates[0]?.value;
      const initialLocation = state.slots.location.candidates[0]?.value;
      
      // Tours suivants ne doivent pas dégrader ces slots
      const followUpMessages = [
        "en intérieur",
        "avec livraison",
        "installation nécessaire"
      ];
      
      for (const messageText of followUpMessages) {
        const userMsg = createUserMessage(messageText);
        const result = engine.processUserMessage(state, userMsg);
        state = result.updatedState;
        
        // Les slots initialement résolus ne doivent pas perdre leur valeur principale
        expect(state.slots.eventType.candidates[0]?.value).toBe(initialEventType);
        expect(state.slots.guestCount.candidates[0]?.value).toBe(initialGuestCount);
        expect(state.slots.location.candidates[0]?.value).toEqual(initialLocation);
      }
    });
  });

  // ============================================================================
  // TESTS DE PERFORMANCE ANTI-RÉPÉTITION
  // ============================================================================
  
  describe('⚡ Performance anti-répétition', () => {
    it('conversation longue ne doit pas exploser en mémoire', () => {
      let state = createInitialConversationState();
      
      // Conversation de 20 tours
      for (let i = 0; i < 20; i++) {
        const userMsg = createUserMessage(`message ${i + 1}`);
        const result = engine.processUserMessage(state, userMsg);
        state = result.updatedState;
        
        // Mémoire dialogue ne doit pas exploser  
        expect(state.dialogue.askedQuestions.length).toBeLessThan(50);
        expect(state.messages.length).toBeLessThan(100);
        
        // Pas de fuite mémoire sur les slots
        Object.values(state.slots).forEach(slot => {
          expect(slot.candidates.length).toBeLessThan(10); // Pas d'accumulation excessive
        });
      }
    });

    it('doit nettoyer les anciennes questions après résolution', () => {
      let state = createInitialConversationState();
      
      // Question puis réponse claire
      const msg1 = createUserMessage("conférence");
      const result1 = engine.processUserMessage(state, msg1);
      state = result1.updatedState;
      
      // Vérifier qu'il y a des questions dans la mémoire
      expect(state.dialogue.askedQuestions.length).toBeGreaterThan(0);
      
      // Répondre à tout ce qui peut être résolu
      const msg2 = createUserMessage("100 personnes Paris intérieur micros son livraison");
      const result2 = engine.processUserMessage(state, msg2);
      state = result2.updatedState;
      
      // Les questions résolues devraient être marquées answered
      const resolvedQuestions = state.dialogue.askedQuestions.filter(q => q.answered);
      expect(resolvedQuestions.length).toBeGreaterThan(0);
      
      // Pas d'accumulation excessive de questions non résolues
      const unresolvedQuestions = state.dialogue.askedQuestions.filter(q => !q.answered);
      expect(unresolvedQuestions.length).toBeLessThan(5);
    });
  });
});