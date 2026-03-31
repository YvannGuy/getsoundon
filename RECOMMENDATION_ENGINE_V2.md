# Moteur de Recommandation V2 - Production Événementielle

## 🎯 Objectif

Transformer le moteur de recommandation simple basé sur "X personnes = Y enceintes" en un système crédible qui raisonne comme un vrai professionnel AV événementiel.

## 🔄 Problèmes Corrigés

### Avant (V1)
- Logique simpliste : audience → nombre d'enceintes
- Multiplication par facteur fixe (1, 1.2, 1.5) pour les tiers
- Pas de différenciation métier réelle
- Ignorance du contexte et contraintes
- Recommandations génériques peu crédibles

### Après (V2)
- **Profil de production événementielle** : analyse speech vs music vs dance
- **Contexte environnemental** : indoor/outdoor, acoustique, contraintes
- **Logique métier terrain** : règles AV professionnelles
- **Adaptation aux demandes explicites** : respect des requests utilisateur
- **Justifications et warnings** : transparence et crédibilité

## 🏗️ Architecture

### 1. Types Fondamentaux (`production-types.ts`)
```typescript
type EventProductionProfile = {
  speechImportance: "none" | "low" | "medium" | "high" | "critical";
  musicImportance: "none" | "low" | "medium" | "high" | "critical";
  danceIntent: boolean;
  livePerformance: boolean;
  // ... autres profils
};

type SetupRecommendationV2 = {
  tier: "essential" | "standard" | "premium";
  productionProfile: EventProductionProfile;
  venueContext: VenueContext;
  soundSystem: EquipmentLineItem[];
  microphones: EquipmentLineItem[];
  // ... équipements structurés
  rationale: string[];
  warnings: string[];
  complexity: "simple" | "moderate" | "complex";
};
```

### 2. Règles Métier (`event-production-rules.ts`)
- **Profils par type d'événement** : Conference ≠ Birthday ≠ Wedding
- **Dimensionnement intelligent** : Speech, Music Ambient, Music Dance, Live Performance
- **Adaptation environnementale** : multipliers pour extérieur, église, appartement
- **Catalogue équipements virtuels** : specs réalistes avec coverage et suitability

### 3. Moteur Central (`recommendation-engine-v2.ts`)
```typescript
class RecommendationEngineV2Impl {
  generateRecommendations(input: RecommendationInput): SetupRecommendationV2[]
  validateRecommendation(rec: SetupRecommendationV2): RecommendationValidation
  adaptToExplicitRequests(base: SetupRecommendationV2, requests: ExplicitEquipmentRequest[]): SetupRecommendationV2
}
```

### 4. Bridge de Compatibilité (`recommendation-bridge.ts`)
- **Migration transparente** : API compatible avec V1
- **Feature flag** : basculement V1/V2 via localStorage
- **Fonctions de comparaison** : analyse différences V1 vs V2

## 🎛️ Logique Métier

### Profils Événements

| Type | Speech | Music | Dance | Live | Lighting | Video | Staffing |
|------|--------|-------|-------|------|----------|-------|----------|
| Conference | Critical | None | ❌ | ❌ | ❌ | ✅ | Pro |
| Corporate | High | Low | ❌ | ❌ | ❌ | ✅ | Pro |
| Cocktail | Medium | High | ❌ | ❌ | ✅ | ❌ | Auto |
| Birthday | Low | High | ✅ | ❌ | ✅ | ❌ | Auto |
| Wedding | High | Critical | ✅ | ✅ | ✅ | ✅ | Pro |
| DJ Set | Low | Critical | ✅ | ✅ | ✅ | ❌ | Pro |

### Dimensionnement Intelligent

#### Diffusion Parole (Intelligibilité)
- **50 pers** : 2 enceintes compactes + 2 micros
- **150 pers** : 4 enceintes moyennes + 3 micros  
- **400 pers** : 6-8 enceintes + 4 micros + retours

#### Diffusion Danse (Pression sonore)
- **30 pers** : 2 enceintes + 1 caisson + DJ setup
- **80 pers** : 4 enceintes + 2 caissons + DJ pro
- **200 pers** : 6+ enceintes + caissons + éclairage dynamique

### Adaptation Environnementale

| Environnement | Multiplicateur | Spécificités |
|--------------|----------------|--------------|
| Intérieur contrôlé | 1.0x | Optimisé |
| Église/Hall | 1.2x | Directivité, réverbération |
| Appartement | 0.8x | Contraintes voisinage |
| Extérieur couvert | 1.3x | Protection IP65 |
| Plein air | 1.5x | Sur-dimensionnement |

## 🧪 Tests et Validation

### Cas Métier Couverts

```typescript
// 1. Conférence 120p intérieur - Priorité parole
expect(standard.productionProfile.speechImportance).toBe('critical');
expect(standard.microphones.length).toBeGreaterThan(0);
expect(standard.djSetup.length).toBe(0);

// 2. Anniversaire 100p danse - Système complet 
expect(standard.productionProfile.danceIntent).toBe(true);
const subwoofer = standard.soundSystem.find(item => item.subcategory === 'subwoofer');
expect(subwoofer).toBeTruthy();

// 3. Culte église - Acoustique difficile
expect(standard.warnings.some(w => w.includes('acoustique'))).toBe(true);
expect(speakers?.quantity).toBeGreaterThanOrEqual(4); // Directivité
```

### Scénarios de Test
- ✅ Conférence 120p intérieur
- ✅ Cocktail 80p ambiance musicale
- ✅ Anniversaire 100p vraie danse  
- ✅ Culte avec voix + musique
- ✅ Showcase extérieur couvert
- ✅ Soirée privée "juste son + micro"
- ✅ Demande explicite 2 micros HF
- ✅ Setup autonome sans technicien
- ✅ Mariage premium complet

## 🛠️ Utilisation

### Intégration Transparente
```typescript
// Le hook existant bascule automatiquement
import { buildRecommendedSetupsAdaptive as buildRecommendedSetups } from "@/lib/event-assistant/recommendation-bridge";

// Compatible avec l'API V1
const recommendations = buildRecommendedSetups(brief);
```

### Feature Flag
```typescript
// Activer V2 dans localStorage
enableRecommendationV2(true);

// Vérifier l'état
if (isRecommendationV2Enabled()) {
  console.log("Moteur V2 actif");
}
```

### Debug Console
```javascript
// API debug exposée globalement en dev
recommendationDebug.help()
recommendationDebug.testScenario('conference')
recommendationDebug.compareV1V2('birthday_dance')
recommendationDebug.testAllScenarios()
```

### Page de Debug
Accès via `/debug/recommendation` pour interface complète de test.

## 📊 Résultats Attendus

### Avant vs Après

**Conférence 100p (V1)**
```
- 4 enceintes actives (logique simpliste)
- Console de mixage
- "Confort supérieur : plus de pression sonore"
```

**Conférence 100p (V2)**
```
- 4 enceintes moyennes actives (directivité parole)
- Console professionnelle (entrées multiples)
- 3 micros sans fil (2 main + 1 serre-tête)
- "Dimensionnement speech clarity avec intelligibilité critique"
- Warning: "Prévoir formation rapide si usage sans technicien"
```

### Métriques de Qualité
- **Crédibilité** : 85%+ sur tous les cas métier
- **Complétude** : Équipements + Services + Infrastructure
- **Praticité** : Complexity simple/moderate/complex avec temps setup

## 🚀 Déploiement

### Phase 1 : Test Interne
- ✅ Feature flag localStorage
- ✅ Page debug `/debug/recommendation`
- ✅ API console pour tests rapides
- ✅ Tests automatisés 15+ scénarios

### Phase 2 : A/B Test  
- 🔄 Comparaison V1/V2 sur échantillon
- 🔄 Métriques engagement + conversion
- 🔄 Feedback utilisateur qualité recommandations

### Phase 3 : Migration Complète
- 🔄 V2 par défaut
- 🔄 Suppression V1 legacy
- 🔄 Intégration catalogue réel prestataires

## ⚙️ Configuration

### Variables d'Environnement
```bash
# Feature flags
NEXT_PUBLIC_RECOMMENDATION_V2_DEFAULT=false

# Debug
NEXT_PUBLIC_DEBUG_RECOMMENDATION=true
```

### Constants Métier
```typescript
// Ajustement multiplicateurs environnement
ENVIRONMENT_MULTIPLIERS = {
  indoor_controlled: 1.0,
  indoor_reverberant: 1.2,
  outdoor_covered: 1.3,
  outdoor_open: 1.5
}

// Seuils audience
AUDIENCE_THRESHOLDS = {
  small: 50,
  medium: 150, 
  large: 400,
  xlarge: 1000
}
```

## 🔍 Monitoring

### Métriques Clés
- **Adoption Rate** : % sessions utilisant V2
- **Recommendation Quality** : Score validation moyen
- **User Engagement** : Temps sur recommandations, clics provider cards
- **Conversion Impact** : Taux de passage brief → provider contact

### Debug Tools
- **Console API** : Tests scenarii instantanés 
- **Validation Engine** : Score crédibilité automatique
- **Comparison Tool** : Analyse différences V1/V2
- **Performance Metrics** : Temps génération recommandations

## 📝 Limitations Actuelles

### Données Manquantes
- ❌ Catalogue réel équipements prestataires
- ❌ Pricing et disponibilité temps réel
- ❌ Géolocalisation précise contraintes logistiques
- ❌ Historique préférences utilisateur

### Extensions Futures
- 🔮 IA générative pour rationales personnalisées
- 🔮 Optimisation automatique basée sur feedback
- 🔮 Intégration APIs prestataires temps réel
- 🔮 Recommendations cross-sell services additionnels

## 👥 Contribution

### Structure Code
```
lib/event-assistant/
├── production-types.ts          # Types V2
├── event-production-rules.ts    # Règles métier terrain
├── recommendation-engine-v2.ts  # Moteur principal
├── recommendation-bridge.ts     # Compatibilité V1/V2
├── recommendation-debug-utils.ts # API debug
└── __tests__/
    └── recommendation-engine-v2.test.ts # Tests complets
```

### Guidelines
1. **Crédibilité avant tout** : Chaque règle doit refléter la réalité terrain AV
2. **Tests obligatoires** : Nouveau cas métier = nouveau test
3. **Justifications explicites** : Rationale + warnings transparents
4. **Performance** : Génération < 100ms même pour cas complexes
5. **Évolutivité** : Architecture modulaire pour extensions futures

---

*Moteur V2 développé pour GetSoundOn - Production événementielle crédible et professionnelle*