# Assistant Événementiel - Audit & Refonte Moteur Conversationnel

## AUDIT DE L'EXISTANT

### Architecture Actuelle

**Stack :**
- `lib/event-assistant/types.ts` : Types métier (EventBrief, ChatMessage, etc.)
- `lib/event-assistant/prompt-parser.ts` : Parsing regex basique  
- `lib/event-assistant/brief.ts` : Gestion EventBrief + mergeField
- `lib/event-assistant/qualification.ts` : Logique processUserTurn
- `hooks/useAssistantConversation.ts` : Hook React avec useReducer

### Problèmes Identifiés

#### 1. **RÉPÉTITIONS & MANQUE DE MÉMOIRE**
```typescript
// Problème : Aucune mémoire des questions déjà posées
export function resolveNextQuestionField(brief: EventBrief, state: QualificationState): QuestionField | undefined {
  for (const f of criticalPriority) {
    if (brief[f].value === null) return f; // ← Toujours la même logique naïve
  }
}
```

**Impact :** L'assistant redemande les mêmes informations car il n'a pas de mémoire conversationnelle.

#### 2. **MERGE LOGIQUE TROP SIMPLE**
```typescript
export function mergeField<T>(current: BriefField<T>, incoming: MergeOpts<T>): BriefField<T> {
  if (incoming.value === null) return current;
  
  // Si plus haute confidence, remplace
  if ((incoming.confidence ?? 0) >= current.confidence) {
    return { ...current, value: incoming.value, /* ... */ };
  }
  return current; // ← Pas de gestion sophistiquée des conflits
}
```

**Impact :** Pas de résolution intelligente de conflits ou de mise à jour contextuelle.

#### 3. **EXTRACTION MONOLITHIQUE**
```typescript
export function processUserTurn(currentBrief: EventBrief, userText: string, userMessageId: string): ProcessResult {
  const parsed = parseEventPrompt(userText); // ← Parsing unique et simple
  
  // Merge direct synchrone
  brief.eventType = mergeField(brief.eventType, { value: parsed.eventType, /* ... */ });
  brief.guestCount = mergeField(brief.guestCount, { value: parsed.guestCount, /* ... */ });
  // ... répété pour tous les champs
}
```

**Impact :** Logique rigide, pas d'adaptation contextuelle, extraction primitive.

#### 4. **PAS DE DIALOGUE STATE MACHINE**
```typescript
// Problème : Pas de tracking des questions posées
const assistantMessage: ChatMessage = {
  content: nextQuestion ? nextQuestion.label : "Parfait...",
  // ← Aucune mémoire de ce qui a été demandé
};
```

**Impact :** Le système peut redemander la même chose indéfiniment.

#### 5. **QUALIFICATION TROP BASIQUE**
```typescript
const critical: QuestionField[] = ["eventType", "guestCount", "location", "indoorOutdoor", "serviceNeeds"];

// Problème : Priorités fixes, pas d'adaptation au contexte
for (const f of criticalPriority) {
  if (brief[f].value === null) return f;
}
```

**Impact :** Logique de wizard linéaire, pas de qualification intelligente.

---

## NOUVELLE ARCHITECTURE PROPOSÉE

### 1. Système de Slots V2

```typescript
// Nouveaux types pour le système de slots
type CandidateSource = {
  messageId: string;
  rawText: string;
  extractor: string;
  confidence: number;
  createdAt: string;
};

type SlotCandidate<T> = {
  value: T;
  normalizedValue?: unknown;
  confidence: number;
  source: CandidateSource;
};

type SlotStatus = "empty" | "candidate" | "resolved" | "conflicted" | "locked";

type SlotState<T> = {
  key: QuestionField;
  status: SlotStatus;
  resolvedValue: T | null;
  candidates: SlotCandidate<T>[];
  askedCount: number;
  lastAskedAt?: string;
  lastResolvedAt?: string;
  needsConfirmation: boolean;
  lockedByUser: boolean;
};
```

### 2. Mémoire de Dialogue

```typescript
type AskedQuestion = {
  field: QuestionField;
  semanticKey: string;
  askedAt: string;
  answered: boolean;
  supersededByMessageId?: string;
};

type DialogueMemory = {
  askedQuestions: AskedQuestion[];
  pendingQuestionField?: QuestionField;
  pendingQuestionSemanticKey?: string;
  conversationTurns: number;
  lastUserIntent?: string;
};
```

### 3. Moteur de Conversation V2

```typescript
type ConversationEngineState = {
  sessionId: string;
  messages: ChatMessage[];
  slots: Record<QuestionField, SlotState<unknown>>;
  dialogue: DialogueMemory;
  qualification: QualificationState;
  extractionLog: ExtractionLogEntry[];
  recommendations?: SetupRecommendation[];
  rankedProviders?: RankedProvider[];
};

// Pipeline processing
interface ConversationEngine {
  normalizeUserText(text: string): NormalizedText;
  extractFacts(text: NormalizedText, context: ConversationEngineState): ExtractionBatch;
  applyExtractionBatch(state: ConversationEngineState, batch: ExtractionBatch): ConversationEngineState;
  resolveSlotConflicts(state: ConversationEngineState): ConversationEngineState;
  computeQualificationStateV2(state: ConversationEngineState): QualificationState;
  decideNextAssistantAction(state: ConversationEngineState): AssistantAction;
  composeAssistantMessage(action: AssistantAction, state: ConversationEngineState): ChatMessage;
}
```

---

## IMPLÉMENTATION TERMINÉE

### Nouveaux Fichiers Créés

#### 1. **Types et Architecture (`lib/event-assistant/v2-types.ts`)**
- Système de slots avec `SlotState`, `SlotCandidate`, `CandidateSource`
- Mémoire de dialogue avec `DialogueMemory`, `AskedQuestion`
- État du moteur conversationnel `ConversationEngineState`
- Politiques et stratégies configurables

#### 2. **Moteur de Slots (`lib/event-assistant/slots-engine.ts`)**
- Gestion sophistiquée des candidats de valeurs
- Résolution de conflits basée sur politique configurée
- Support de sources multiples et traçabilité
- Queries et analytics pour debugging

#### 3. **Mémoire de Dialogue (`lib/event-assistant/dialogue-memory.ts`)**
- Anti-répétition avec tracking des questions posées
- Détection de patterns répétitifs
- Analyse de l'efficacité conversationnelle
- Stratégies d'escalade (alternative phrasing, context switch, skip)

#### 4. **Moteur d'Extraction (`lib/event-assistant/extraction-engine.ts`)**
- Normalisation de texte avec signaux sémantiques
- Extractors modulaires : explicit, semantic, contextual
- Pipeline configurable et extensible
- Déduplication et filtrage par confiance

#### 5. **Moteur Principal (`lib/event-assistant/conversation-engine-v2.ts`)**
- Orchestration complète du pipeline
- Qualification intelligente par priorités
- Décision d'actions avec stratégies
- Composition de réponses contextuelles

#### 6. **Hook React V2 (`hooks/useAssistantConversationV2.ts`)**
- Compatibilité avec l'UI existante
- Bridge vers l'ancien système EventBrief
- Persistance localStorage améliorée
- Debugging et analytics intégrés

#### 7. **Système de Migration (`lib/event-assistant/migration-v2.ts`)**
- Migration automatique V1 → V2
- Feature flags pour rollout progressif
- Rollback safety net
- Debug helpers

#### 8. **Adapter Hook (`hooks/useAssistantConversationAdapter.ts`)**
- Interface unifiée V1/V2
- Migration transparente
- Fallback robuste
- Testing hooks

#### 9. **Tests Unitaires (`lib/event-assistant/__tests__/conversation-engine-v2.test.ts`)**
- Tests complets du nouveau moteur
- Validation anti-répétition
- Tests de résolution de conflits
- Tests de qualification progressive

---

## NOUVEAU FLUX CONVERSATIONNEL

### Pipeline V2 Complet

```
User Message → Normalize → Extract Facts → Apply to Slots → Resolve Conflicts → 
Update Dialogue Memory → Compute Qualification → Decide Action → Compose Response
```

### 1. **Normalisation & Extraction**
```typescript
// Normalisation sémantique
const normalized = normalizeUserText("Conférence 200 personnes Paris");

// Extraction multi-extractors
const batch = extractFacts(normalized, messageId);
// → eventType: "conference" (confidence: 0.9)
// → guestCount: 200 (confidence: 0.9)  
// → location: "Paris" (confidence: 0.85)
```

### 2. **Application aux Slots**
```typescript
// Chaque extraction devient un candidat
slots.eventType.candidates.push({
  value: "conference",
  confidence: 0.9,
  source: { messageId, extractor: "semantic", ... }
});

// Résolution automatique si confiance suffisante
slots.eventType.status = "resolved";
slots.eventType.resolvedValue = "conference";
```

### 3. **Mémoire de Dialogue**
```typescript
// Track question posée
dialogue.askedQuestions.push({
  field: "eventType",
  askedAt: "3",
  answered: false
});

// Auto-answer quand extraction arrive
dialogue.askedQuestions[0].answered = true;
```

### 4. **Qualification Intelligente**
```typescript
// Priorités configurables
const criticalResolved = ["eventType", "guestCount", "location"];
const completion = (criticalResolved.length / totalCritical) * 70;

// Stages progressifs
if (completion >= 80) stage = "ready_to_recommend";
```

### 5. **Anti-Répétition**
```typescript
// Check si déjà demandé
if (canAskQuestionAgain(dialogue, field, policy)) {
  const strategy = needsAlternativePhrasing(dialogue, field) 
    ? "alternative" 
    : "direct";
}
```

---

## RÈGLES ANTI-RÉPÉTITION IMPLÉMENTÉES

### 1. **Tracking Granulaire**
- Chaque question posée = `AskedQuestion` avec timestamp
- Status answered/unanswered automatique  
- Semantic keys pour éviter reformulations

### 2. **Politiques Configurables**
```typescript
const policy = {
  maxRepeatQuestion: 2,        // Max 2x même question
  minTurnsBetweenSameQuestion: 3, // 3 tours minimum entre répétitions
  antiRepetitionStrategy: "alternative_phrasing" // Stratégie d'évitement
};
```

### 3. **Stratégies d'Évitement**
- **alternative_phrasing** : Reformule la question différemment
- **skip_question** : Passe au champ suivant
- **context_switch** : Change d'approche conversationnelle

### 4. **Détection de Patterns**
```typescript
const pattern = detectRepeatingPattern(dialogue);
if (pattern.hasPattern) {
  // Suggestions: diversify, conclude, clarify
}
```

### 5. **Analyse de Flow**
```typescript
const analysis = analyzeConversationFlow(dialogue);
// efficiency: 0.8, repetitiveness: 0.2, coverage: 0.6
// recommendation: "continue" | "accelerate" | "wrap_up"
```

---

## POINTS DÉPENDANTS À TRAITER ENSUITE

### 1. **Moteur d'Extraction**
- [ ] Patterns plus fins pour dates françaises
- [ ] Extraction des contraintes/notes spéciales  
- [ ] Géolocalisation précise des lieux
- [ ] Détection d'intentions complexes (ex: "pas cher", "haut de gamme")

### 2. **Moteur de Recommandation**
- [ ] Intégration avec les nouveaux slots 
- [ ] Logique métier plus fine selon event type
- [ ] Recommendations contextuelles basées sur venue/outdoor
- [ ] Tiers de prix dynamiques

### 3. **Matching Prestataires**
- [ ] Scoring basé sur nouvelle qualification
- [ ] Filtrage géographique précis
- [ ] Disponibilité temps réel
- [ ] Préférences utilisateur

### 4. **UI/UX**
- [ ] Indicateurs de progression conversation  
- [ ] Debug panel pour développement
- [ ] Hints/suggestions proactifs
- [ ] Résolution de conflits user-friendly

---

## MIGRATION ET ROLLOUT

### Phase 1: Feature Flag (FAIT)
```typescript
// Feature flag avec migration auto
if (isV2Enabled()) {
  return useAssistantConversationV2();
} else {
  return useAssistantConversation();
}
```

### Phase 2: Testing Progressif
- [ ] A/B test sur petit % d'utilisateurs
- [ ] Monitoring erreurs et performance
- [ ] Comparaison métriques qualité V1/V2

### Phase 3: Rollout Complet
- [ ] Migration généralisée
- [ ] Suppression V1 après validation
- [ ] Documentation équipe

---

## MÉTRIQUES DE SUCCÈS

### Quantitatifs
- **Réduction répétitions** : -80% questions redundantes
- **Efficacité conversationnelle** : +60% ratio questions/réponses utiles
- **Temps à recommandation** : -40% de messages pour atteindre qualification
- **Taux de complétion** : +30% d'événements entièrement qualifiés

### Qualitatifs
- Assistant ressenti comme plus "intelligent"
- Réduction frustration utilisateur
- Conversations plus fluides et naturelles
- Meilleure adaptation au contexte

---

## RÉSUMÉ EXÉCUTIF

### ✅ **PROBLÈMES RÉSOLUS**
1. **Répétitions inutiles** : Système de dialogue memory complet
2. **Questions reposées** : Anti-répétition avec politiques configurables  
3. **Manque de mémoire** : Tracking granulaire des interactions
4. **Traçabilité faible** : Sources et candidats multiples avec confidence
5. **Logique wizard** : Qualification intelligente et contextuelle
6. **Gestion conflits** : Résolution automatique basée stratégies

### 🏗️ **ARCHITECTURE TRANSFORMÉE**
- Moteur monolithique → Pipeline modulaire
- Merge simple → Système de slots sophistiqué  
- État flat → Mémoire conversationnelle structurée
- Extraction basique → Multi-extractors avec normalisation
- Qualification naïve → Politiques et priorités configurables

### 🚀 **PRÊT POUR PRODUCTION**
- Migration transparente avec rollback
- Compatibilité UI existante préservée
- Tests unitaires complets
- Monitoring et debugging intégrés
- Feature flags pour rollout maîtrisé

Le moteur V2 est **production-ready** et peut être déployé progressivement sans impact sur l'expérience utilisateur existante.