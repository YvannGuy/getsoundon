# ✅ Checklist QA - Assistant GetSoundOn V2

## 🎯 Objectif

Cette checklist valide que l'assistant GetSoundOn V2 est **crédible, anti-répétitif et métier premium** avant tout déploiement.

Chaque point doit être vérifié et **✅ coché** après validation.

---

## 📋 VALIDATION FONCTIONNELLE DE BASE

### 🔤 Compréhension du Français Naturel

- [ ] **Nombres en lettres** : Comprend "cent personnes", "cinquantaine", "une centaine"
- [ ] **Plages de nombres** : Comprend "entre 80 et 100", "autour de 120" 
- [ ] **Approximations** : Comprend "environ", "à peu près", "pas mal"
- [ ] **Dates relatives** : Comprend "vendredi prochain", "dans 2 semaines", "fin mai"
- [ ] **Dates absolues** : Comprend "le 12 avril", "15/06", "samedi 20"
- [ ] **Lieux précis** : Comprend "Paris 11", "Lyon centre", "proche de Marseille"
- [ ] **Types de lieux** : Comprend "hôtel", "salle des fêtes", "domicile", "rooftop"
- [ ] **Indoor/Outdoor nuancé** : Distingue "extérieur", "extérieur couvert", "sous barnum"

### ❌ Gestion des Négations

- [ ] **Exclusions simples** : Respecte "pas besoin de DJ", "pas de lumière"
- [ ] **Exclusions de services** : Respecte "pas d'installation", "pas de technicien"
- [ ] **Demandes minimales** : Respecte "juste du son", "uniquement micros"
- [ ] **Négations multiples** : Gère "pas de DJ, pas de lumière, juste son"

### 🎛️ Demandes Explicites de Matériel

- [ ] **Quantités précises** : Respecte "2 micros HF", "4 enceintes"
- [ ] **Équipement spécifique** : Respecte "console de mixage", "écran LED", "caisson"
- [ ] **Marques mentionnées** : Prend en compte "micros Shure", "enceintes JBL"
- [ ] **Spécifications techniques** : Gère "micros HF", "enceintes actives"

---

## 🚫 VALIDATION ANTI-RÉPÉTITION

### 🔒 Règles Strictes de Non-Répétition

- [ ] **Champ résolu jamais redemandé** : Ne repose JAMAIS une question sur un champ déjà résolu avec confiance
- [ ] **Fermeture automatique** : Ferme les questions quand la réponse arrive implicitement
- [ ] **Pas de doublons sémantiques** : Ne pose pas "combien de personnes" après "nombre d'invités"
- [ ] **Une question à la fois** : Pose UNE seule question utile par tour

### 🔄 Gestion des Corrections

- [ ] **Corrections simples** : Gère "non finalement 120 personnes"
- [ ] **Corrections de date** : Gère "non samedi plutôt"
- [ ] **Corrections de lieu** : Gère "finalement à Lyon"
- [ ] **Corrections multiples** : Reste stable sur 3-4 corrections consécutives
- [ ] **Pas de redemande après correction** : N'interroge plus le champ corrigé

### 📝 Mémoire Conversationnelle

- [ ] **Dialogue memory cohérente** : Historique des questions posées maintenu
- [ ] **Questions answered marquées** : Questions résolues correctement flaggées
- [ ] **Pas de boucles infinies** : Maximum 3 tentatives par champ
- [ ] **Stratégie adaptative** : Change d'approche si echecs répétés

---

## 🎯 VALIDATION MÉTIER ÉVÉNEMENTIELLE

### 🎤 Recommandations par Type d'Événement

#### Conférence
- [ ] **Setup orienté parole** : Priorité son + micros pour intelligibilité
- [ ] **Pas de DJ automatique** : N'ajoute pas DJ sauf demande explicite
- [ ] **Écran si demandé** : Inclut LED/vidéo si mentionné
- [ ] **Installation conseillée** : Recommande technicien pour 150+ personnes

#### Anniversaire / Soirée Privée
- [ ] **Adaptation danse** : DJ + éclairage si "soirée dansante"
- [ ] **Setup familial** : Configuration adaptée si "anniversaire enfant"
- [ ] **Respect exclusions** : Pas de DJ si "pas de DJ"

#### Cocktail Corporate
- [ ] **Ambiance élégante** : Setup discret et professionnel
- [ ] **Musique d'ambiance** : Pas de setup festif excessif
- [ ] **Qualité premium** : Privilégie qualité sur quantité

#### Événements Religieux (Culte)
- [ ] **Respect du contexte** : Setup sobre et respectueux
- [ ] **Voix + musique** : Configuration adaptée prises de parole + chant
- [ ] **Pas de DJ/éclairage festif** : Évite équipements inappropriés

### ⚠️ Cohérence des Recommandations

- [ ] **Essential < Standard < Premium** : Progression cohérente des setups
- [ ] **Tous les tiers couvrent le besoin** : Même Essential résout le problème de base
- [ ] **Premium justifié** : Tier premium apporte vraie valeur ajoutée
- [ ] **Warnings appropriés** : Avertit si informations manquantes importantes

### 🚚 Services Logistiques

- [ ] **Livraison demandée** : Inclut si explicitement demandé
- [ ] **Installation refusée** : Respecte "on gère nous-mêmes"
- [ ] **Technicien adapté** : Recommande selon complexité + nombre invités
- [ ] **Démontage cohérent** : Propose si installation proposée

---

## 🏪 VALIDATION MATCHING PRESTATAIRES

### 🔍 Hard Filtering (Exclusions)

- [ ] **Zone géographique** : Exclut prestataires hors zone de service
- [ ] **Disponibilité date** : Exclut si indisponible (quand données disponibles)
- [ ] **Capacité insuffisante** : Exclut si capacité < nombre invités
- [ ] **Services manquants** : Exclut si service critique manquant (ex: livraison obligatoire)
- [ ] **Contraintes opérationnelles** : Respecte contraintes spécifiques

### 📊 Scoring Cohérent

- [ ] **Spécialisation valorisée** : DJ spécialisé > généraliste pour soirée DJ
- [ ] **Proximité géographique** : Prestataire local > distant
- [ ] **Adéquation stock** : Prestataire avec bon stock > stock limite
- [ ] **Services complets** : Full-service > spécialisé si besoins multiples
- [ ] **Qualité/confiance** : Vérifiés + avis > nouveaux prestataires

### 🔄 Justifications Lisibles

- [ ] **Compatibilité expliquée** : "Couvre Paris + a le matériel DJ"
- [ ] **Limites mentionnées** : "Pas de livraison" si applicable
- [ ] **Différenciateurs clairs** : "Spécialisé mariages" vs "Généraliste"
- [ ] **Warnings utilisateur** : Prévient si prestataire partiel

---

## 🧪 VALIDATION TECHNIQUE

### 📱 Intégration UI

- [ ] **Messages fluides** : Conversation naturelle dans l'interface
- [ ] **Cartes prestataires** : Affichage correct des résultats
- [ ] **États de chargement** : Loading states appropriés
- [ ] **Erreurs gérées** : Messages d'erreur compréhensibles

### 💾 Persistance et Performance

- [ ] **Session sauvegardée** : Conversation survit au refresh page
- [ ] **Performance correcte** : < 2s par tour de conversation
- [ ] **Mémoire maîtrisée** : Pas de fuite mémoire sur longue conversation
- [ ] **États cohérents** : Pas de bugs d'état après restauration

---

## 🚀 VALIDATION EXPÉRIENCE UTILISATEUR

### 💬 Qualité Conversationnelle

- [ ] **Ton premium** : Langage professionnel mais accessible
- [ ] **Concision** : Messages courts et utiles
- [ ] **Proactivité** : Pose les bonnes questions sans être lourd
- [ ] **Bienveillance** : Accompagne sans juger les choix utilisateur

### 🎯 Efficacité Produit

- [ ] **Qualification rapide** : Atteint recommandation en 3-5 tours maximum
- [ ] **Recommandations crédibles** : Setups réalistes et utiles
- [ ] **Matching pertinent** : Prestataires vraiment compatibles
- [ ] **Conversion** : Encourage passage à l'action (contact prestataire)

---

## 📋 SCÉNARIOS DE VALIDATION OBLIGATOIRES

### ✅ Scénarios À Tester Manuellement

1. **Conférence complète**
   - Input: "conférence 150 personnes Paris intérieur micros son livraison"
   - Attendu: Qualification rapide, setup adapté, prestataires parisiens

2. **Anniversaire avec corrections**
   - Input: "anniversaire 100 personnes" → "non finalement 80" → "avec DJ"
   - Attendu: Pas de redemande nombre, setup DJ inclus

3. **Demande minimale**
   - Input: "juste qu'on entende bien les discours, 50 personnes"
   - Attendu: Setup son+micros uniquement, pas d'extras

4. **Négations multiples**
   - Input: "soirée privée, pas de lumière, pas de DJ, juste son + micro"
   - Attendu: Respect strict des exclusions

5. **Outdoor couvert**
   - Input: "événement extérieur mais sous barnum, 120 personnes"
   - Attendu: Setup adapté outdoor protégé

6. **Corrections géographiques**
   - Input: "Paris" → "non Lyon" → "finalement Marseille"
   - Attendu: Pas de redemande lieu, matching final sur Marseille

7. **Culte avec musique**
   - Input: "culte avec prises de parole et musique, 200 personnes"
   - Attendu: Setup respectueux, voix + musique, pas de festif

8. **Demande explicite matériel**
   - Input: "2 micros HF exactement + écran LED obligatoire"
   - Attendu: Recommandation respecte quantités et équipements précis

---

## 🔥 TESTS DE NON-RÉGRESSION

### ⛔ Ce qui ne doit JAMAIS arriver

- [ ] **Redemander un champ résolu** ❌
- [ ] **Proposer DJ quand exclu** ❌  
- [ ] **Proposer éclairage quand refusé** ❌
- [ ] **Boucle infinie de questions** ❌
- [ ] **Perte d'informations déjà données** ❌
- [ ] **Prestataires géographiquement incompatibles** ❌
- [ ] **Setup incohérent avec type événement** ❌
- [ ] **Conversation qui ne progresse jamais** ❌

---

## 📊 MÉTRIQUES DE VALIDATION

### 🎯 Objectifs Quantitatifs

- [ ] **Qualification < 5 tours** : 90% des cas résolus en moins de 5 échanges
- [ ] **Zéro répétition** : 0% de questions reposées sur champs résolus
- [ ] **Recommandations crédibles** : 100% des setups métier cohérents
- [ ] **Matching pertinent** : 90% des premiers prestataires vraiment compatibles
- [ ] **Performance** : < 2s par tour de conversation
- [ ] **Stabilité** : 0 crash sur 100 conversations test

---

## ✅ VALIDATION FINALE

### 🏆 Critères de Passage en Production

- [ ] **Tous les tests unitaires passent** ✅
- [ ] **Tous les tests d'intégration passent** ✅  
- [ ] **Tous les scénarios manuels validés** ✅
- [ ] **Aucune régression détectée** ✅
- [ ] **Performance acceptable** ✅
- [ ] **UX premium confirmée** ✅

### 📝 Sign-off

**Date de validation** : ___________

**Validé par** : ___________

**Commentaires** :
```
[Notes sur la qualité, points d'attention, améliorations futures]
```

**Statut** : 
- [ ] ✅ **VALIDÉ - Prêt pour production**
- [ ] ⚠️ **VALIDÉ AVEC RÉSERVES - À surveiller**
- [ ] ❌ **NON VALIDÉ - Corrections nécessaires**

---

## 📚 RESSOURCES

- **Tests automatisés** : `npm run test`
- **Tests conversation** : `/lib/event-assistant/__tests__/integration-scenarios.test.ts`
- **Tests anti-répétition** : `/lib/event-assistant/__tests__/anti-repetition.test.ts` 
- **Tests métier** : `/lib/event-assistant/__tests__/business-coherence.test.ts`
- **Debug console** : `window.recommendationDebug` et `window.matchingV2Debug` (dev mode)

---

*Cette checklist doit être mise à jour à chaque évolution majeure de l'assistant.*