import { describe, it, expect, beforeEach } from '@jest/globals';
import { createInitialConversationState, ConversationEngineImpl } from '../conversation-engine-v2';
import { DEFAULT_CONVERSATION_POLICY } from '../dialogue-memory';
import { ChatMessage } from '../types';

describe('ConversationEngineV2', () => {
  let engine: ConversationEngineImpl;
  let initialState: ReturnType<typeof createInitialConversationState>;

  beforeEach(() => {
    engine = new ConversationEngineImpl(DEFAULT_CONVERSATION_POLICY);
    initialState = createInitialConversationState();
  });

  describe('Initial State', () => {
    it('should create valid initial state', () => {
      expect(initialState.sessionId).toBeDefined();
      expect(initialState.messages).toEqual([]);
      expect(initialState.dialogue.conversationTurns).toBe(0);
      expect(initialState.qualification.readyToRecommend).toBe(false);
    });

    it('should have all slots in empty state', () => {
      Object.values(initialState.slots).forEach(slot => {
        expect(slot.status).toBe('empty');
        expect(slot.resolvedValue).toBe(null);
        expect(slot.candidates).toEqual([]);
      });
    });
  });

  describe('Message Processing', () => {
    it('should extract event type from user message', () => {
      const userMessage: ChatMessage = {
        id: 'user-1',
        role: 'user',
        kind: 'message',
        content: 'Je organise une conférence pour 100 personnes',
        createdAt: new Date().toISOString()
      };

      const result = engine.processUserMessage(initialState, userMessage);
      
      expect(result.updatedState.messages).toHaveLength(2); // user + assistant
      expect(result.updatedState.dialogue.conversationTurns).toBe(1);
      
      // Should have extracted event type and guest count
      expect(result.updatedState.slots.eventType.candidates.length).toBeGreaterThan(0);
      expect(result.updatedState.slots.guestCount.candidates.length).toBeGreaterThan(0);
    });

    it('should not re-ask resolved questions', () => {
      // First message with event type
      const message1: ChatMessage = {
        id: 'user-1',
        role: 'user', 
        kind: 'message',
        content: 'Je fais une conférence',
        createdAt: new Date().toISOString()
      };

      const state1 = engine.processUserMessage(initialState, message1).updatedState;
      
      // Second message with same event type
      const message2: ChatMessage = {
        id: 'user-2',
        role: 'user',
        kind: 'message', 
        content: 'Oui c\'est bien une conférence',
        createdAt: new Date().toISOString()
      };

      const state2 = engine.processUserMessage(state1, message2).updatedState;
      
      // Should not ask about event type again
      const lastAssistantMessage = state2.messages[state2.messages.length - 1];
      expect(lastAssistantMessage.content.toLowerCase()).not.toContain('type');
    });

    it('should handle multiple extractions in one message', () => {
      const userMessage: ChatMessage = {
        id: 'user-1',
        role: 'user',
        kind: 'message',
        content: 'Conférence 200 personnes à Paris en intérieur avec son et micros',
        createdAt: new Date().toISOString()
      };

      const result = engine.processUserMessage(initialState, userMessage);
      const { slots } = result.updatedState;
      
      // Should extract multiple fields
      expect(slots.eventType.candidates.length).toBeGreaterThan(0);
      expect(slots.guestCount.candidates.length).toBeGreaterThan(0);
      expect(slots.location.candidates.length).toBeGreaterThan(0);
      expect(slots.indoorOutdoor.candidates.length).toBeGreaterThan(0);
      expect(slots.serviceNeeds.candidates.length).toBeGreaterThan(0);
    });
  });

  describe('Dialogue Memory', () => {
    it('should track asked questions', () => {
      const message1: ChatMessage = {
        id: 'user-1',
        role: 'user',
        kind: 'message', 
        content: 'Je fais un événement',
        createdAt: new Date().toISOString()
      };

      const state1 = engine.processUserMessage(initialState, message1).updatedState;
      
      // Should have asked a question and tracked it
      expect(state1.dialogue.askedQuestions.length).toBeGreaterThan(0);
      
      const message2: ChatMessage = {
        id: 'user-2',
        role: 'user',
        kind: 'message',
        content: 'C\'est une conférence', 
        createdAt: new Date().toISOString()
      };

      const state2 = engine.processUserMessage(state1, message2).updatedState;
      
      // Should mark question as answered
      const answeredQuestions = state2.dialogue.askedQuestions.filter(q => q.answered);
      expect(answeredQuestions.length).toBeGreaterThan(0);
    });

    it('should prevent excessive repetition', () => {
      let currentState = initialState;
      
      // Simulate multiple turns with incomplete answers
      for (let i = 0; i < 5; i++) {
        const message: ChatMessage = {
          id: `user-${i}`,
          role: 'user',
          kind: 'message',
          content: 'Je ne sais pas',
          createdAt: new Date().toISOString()
        };
        
        currentState = engine.processUserMessage(currentState, message).updatedState;
      }
      
      // Should eventually stop asking the same questions
      const questionCounts: Record<string, number> = {};
      currentState.dialogue.askedQuestions.forEach(q => {
        questionCounts[q.field] = (questionCounts[q.field] || 0) + 1;
      });
      
      // No field should be asked more than policy allows
      Object.values(questionCounts).forEach(count => {
        expect(count).toBeLessThanOrEqual(DEFAULT_CONVERSATION_POLICY.maxRepeatQuestion);
      });
    });
  });

  describe('Conflict Resolution', () => {
    it('should resolve conflicts with higher confidence', () => {
      const message1: ChatMessage = {
        id: 'user-1',
        role: 'user',
        kind: 'message',
        content: 'C\'est pour 50 personnes', // Lower confidence location inference
        createdAt: new Date().toISOString()
      };

      let state = engine.processUserMessage(initialState, message1).updatedState;
      
      const message2: ChatMessage = {
        id: 'user-2', 
        role: 'user',
        kind: 'message',
        content: 'Non finalement 100 personnes', // Explicit correction  
        createdAt: new Date().toISOString()
      };

      state = engine.processUserMessage(state, message2).updatedState;
      
      // Should resolve to the higher confidence value (100)
      const guestCountSlot = state.slots.guestCount;
      if (guestCountSlot.status === 'resolved') {
        expect(guestCountSlot.resolvedValue).toBe(100);
      }
    });
  });

  describe('Qualification Logic', () => {
    it('should progress through qualification stages', () => {
      let currentState = initialState;
      expect(currentState.qualification.stage).toBe('initial');
      
      // Add event type 
      const message1: ChatMessage = {
        id: 'user-1',
        role: 'user',
        kind: 'message',
        content: 'Conférence avec 200 personnes à Paris',
        createdAt: new Date().toISOString()
      };
      
      currentState = engine.processUserMessage(currentState, message1).updatedState;
      expect(['understanding', 'core_qualification']).toContain(
        currentState.qualification.stage
      );
      
      // Add more critical info
      const message2: ChatMessage = {
        id: 'user-2',
        role: 'user', 
        kind: 'message',
        content: 'En intérieur avec son et micros',
        createdAt: new Date().toISOString()
      };
      
      currentState = engine.processUserMessage(currentState, message2).updatedState;
      expect(['core_qualification', 'service_qualification', 'ready_to_recommend'])
        .toContain(currentState.qualification.stage);
    });

    it('should mark ready to recommend with sufficient info', () => {
      const completeMessage: ChatMessage = {
        id: 'user-1',
        role: 'user', 
        kind: 'message',
        content: 'Conférence 200 personnes Paris intérieur son micros écran LED le 15 avril',
        createdAt: new Date().toISOString()
      };

      const result = engine.processUserMessage(initialState, completeMessage);
      
      // Should be ready to recommend or very close
      expect(result.updatedState.qualification.completionScore).toBeGreaterThan(60);
    });
  });

  describe('Anti-repetition Logic', () => {
    it('should use alternative phrasing on second ask', () => {
      let currentState = initialState;
      
      // First vague message
      const message1: ChatMessage = {
        id: 'user-1',
        role: 'user',
        kind: 'message',
        content: 'J\'ai un événement',
        createdAt: new Date().toISOString()
      };
      
      currentState = engine.processUserMessage(currentState, message1).updatedState;
      const firstQuestion = currentState.messages[currentState.messages.length - 1].content;
      
      // Second vague message
      const message2: ChatMessage = {
        id: 'user-2',
        role: 'user',
        kind: 'message', 
        content: 'Je ne sais pas trop',
        createdAt: new Date().toISOString()
      };
      
      currentState = engine.processUserMessage(currentState, message2).updatedState;
      const secondQuestion = currentState.messages[currentState.messages.length - 1].content;
      
      // Questions should be different (alternative phrasing)
      expect(firstQuestion).not.toBe(secondQuestion);
    });
  });
});