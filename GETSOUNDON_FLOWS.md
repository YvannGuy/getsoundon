# GetSoundOn — Flows complets (Utilisateur & Propriétaire)

> Document de référence produit — à jour avec le code en production.

---

## Table des matières

1. [Première arrivée sur le site](#1-première-arrivée-sur-le-site)
2. [Inscription / Connexion](#2-inscription--connexion)
3. [Flow locataire — réserver une salle (via messagerie)](#3-flow-locataire--réserver-une-salle-via-messagerie)
4. [Flow locataire — réservation instantanée (instant booking)](#4-flow-locataire--réservation-instantanée-instant-booking)
5. [Flow locataire — louer du matériel catalogue](#5-flow-locataire--louer-du-matériel-catalogue)
6. [Cas multi-matériel (plusieurs annonces)](#6-cas-multi-matériel-plusieurs-annonces)
7. [Flow propriétaire — publier une annonce](#7-flow-propriétaire--publier-une-annonce)
8. [Flow propriétaire — gérer une réservation](#8-flow-propriétaire--gérer-une-réservation)
9. [Où va l'argent — timing complet](#9-où-va-largent--timing-complet)
10. [Caution / Dépôt de garantie](#10-caution--dépôt-de-garantie)
11. [États des lieux (check-in / check-out)](#11-états-des-lieux-check-in--check-out)
12. [Litiges](#12-litiges)
13. [Annulation](#13-annulation)
14. [Résumé des frais](#14-résumé-des-frais)

---

## 1. Première arrivée sur le site

```
Visiteur → Page d'accueil (getsoundon.com)
```

Ce que le visiteur voit :
- **Landing page** : hero, catégories de matériel, salles à proximité, carousel prestataires, FAQ
- **Navigation publique** : Catalogue matériel, Salles, Prix, Blog, Centre d'aide
- **CTA principal** : "Trouver du matériel" → `/catalogue` ou `/rechercher`

Le visiteur peut **naviguer librement** :
- Consulter toutes les fiches salles (`/salles/[slug]`)
- Consulter toutes les fiches matériel (`/items/[id]`)
- Voir les prix, photos, disponibilités, carte

**La connexion n'est requise qu'au moment d'agir** (envoyer une demande, réserver, contacter).

---

## 2. Inscription / Connexion

### Inscription locataire

```
/signup → email + mot de passe → email de confirmation → /dashboard
```

1. L'utilisateur remplit son email et son mot de passe sur `/signup`
2. Un email de confirmation Supabase est envoyé
3. Clic sur le lien → `/auth/confirm` → redirection vers `/dashboard`
4. Profil créé automatiquement dans la table `profiles` avec `user_type = "seeker"`

### Inscription propriétaire

```
/signup → email + mot de passe → email de confirmation → /onboarding/salle
```

Même flow, mais si le rôle choisi est propriétaire :
1. Après confirmation email → `/auth/confirm?type=signup` → `/onboarding/salle`
2. Le wizard d'onboarding guide la publication de la première annonce

### Connexion

```
/login → email + mot de passe → redirect vers la page précédente ou /dashboard
```

- Si `user_type = "owner"` → redirigé vers `/proprietaire`
- Si `user_type = "seeker"` → redirigé vers `/dashboard`
- Les deux rôles peuvent basculer entre les vues

---

## 3. Flow locataire — réserver une salle (via messagerie)

C'est le **flow principal pour les salles** (lieux). Il passe obligatoirement par la messagerie avant le paiement.

### Étape 1 — Consulter la fiche

```
/rechercher ou /salles → /salles/[slug]
```

Le locataire voit : galerie, tarifs, capacité, conditions, calendrier disponibilités.

CTA sidebar :
- **Non connecté** → "Voir les disponibilités" → reste accessible
- **Connecté** → "Organiser une visite" → `/salles/[slug]/disponibilite`
- **Instant booking activé** → "Réserver maintenant" → `/salles/[slug]/reserver` *(voir section 4)*

### Étape 2 — Demande de visite

```
/salles/[slug]/disponibilite → FormulaireVisite → table demandes_visite
```

1. Le locataire choisit une date et un créneau de visite
2. Envoie une demande → `demandes_visite` créée en base
3. Une `conversation` est ouverte entre locataire et propriétaire
4. Le propriétaire reçoit une notification (email + Telegram si configuré)

### Étape 3 — Messagerie

```
/dashboard/messagerie ↔ /proprietaire/messagerie
```

- Le locataire et le propriétaire échangent dans la conversation
- Le propriétaire visite sa salle avec le locataire
- S'il est intéressé, le propriétaire **envoie une offre** depuis la messagerie

**Important : pas de chat libre avant offre.** La conversation est liée à la demande.

### Étape 4 — Réception et acceptation de l'offre

Le propriétaire envoie une offre contenant :
- Montant total
- Mode de paiement : **complet** (full) ou **fractionné** (acompte + solde)
- Caution éventuelle
- Politique d'annulation (strict / modéré / flexible)
- Dates de début et fin

Le locataire voit l'offre dans la messagerie avec un bouton **"Payer"**.

### Étape 5 — Paiement

```
Clic "Payer" → acceptation CGV + contrat → POST /api/stripe/checkout-offer → Stripe Checkout
```

La session Stripe comprend :
- Montant de la location (ou acompte si split)
- Frais de service plateforme (fixe, par défaut **15 €**, configurable admin)
- Frais de traitement paiement (**1,5% + 0,25 €** sur la charge totale)

Après paiement réussi :
- Webhook Stripe `checkout.session.completed` déclenché
- Offre passée en `status = "paid"`
- `gs_payments` / `payments` insert
- Contrat PDF généré et stocké
- Facture générée
- Notifications envoyées (email + Telegram)
- Empreinte caution créée si applicable *(voir section 10)*

Retour URL : `/dashboard/messagerie?offer=paid`

---

## 4. Flow locataire — réservation instantanée (instant booking)

Disponible uniquement si le propriétaire a activé `instant_booking_enabled = true` **ET** que son compte Stripe Connect est actif.

```
/salles/[slug] → "Réserver maintenant" → /salles/[slug]/reserver
```

### Étape 1 — Choisir les dates

```
/salles/[slug]/reserver → date début + date fin → calcul prix live
```

- Prix calculé automatiquement : `price_per_day × nb_jours`
- Caution affichée si requise
- Bouton **"Réserver maintenant"**

### Étape 2 — Paiement direct

```
Clic → createInstantBookingOfferAction → offre créée auto → POST /api/stripe/checkout-offer → Stripe
```

Une conversation et une offre sont créées automatiquement en arrière-plan. Le locataire est directement envoyé vers Stripe Checkout **sans passer par la messagerie**.

Retour URL : `/dashboard/messagerie?offer=paid`

---

## 5. Flow locataire — louer du matériel catalogue

Pour les annonces matériel (`/items/[id]`), le flow est différent et plus direct.

### Étape 1 — Consulter la fiche

```
/catalogue → /items/[id]
```

CTA conditionnel selon la configuration du listing :
- `immediate_confirmation = false` → bouton **"Envoyer la demande"**
- `immediate_confirmation = true` → bouton **"Réserver maintenant"**

### Étape 2 — Créer la réservation

```
Sélection dates → POST /api/bookings → gs_bookings créé
```

- Statut initial : `pending` (demande standard) ou `accepted` (instant booking)
- Le prix est calculé : `price_per_day × nb_jours`

### Étape 3 — Payer

```
Bouton "Payer avec Stripe" → POST /api/stripe/checkout-booking → Stripe Checkout
```

- Vérification que le provider a un compte Connect actif
- Session Stripe créée avec le montant total

Après paiement :
- Webhook `checkout.session.completed` → `gs_bookings.status = "accepted"`
- `gs_payments` insert
- `payout_due_at` calculé = `end_date + 3 jours`
- Empreinte caution si `deposit_amount > 0`

Retour URL : `/items/[id]?bookingPaid=1&bookingId=...`

---

## 6. Cas multi-matériel (plusieurs annonces)

### Situation actuelle

**GetSoundOn ne supporte pas le panier multi-prestataire.** C'est une contrainte produit intentionnelle.

- **Un checkout = une réservation = un prestataire**
- Pas de panier commun entre plusieurs providers
- Chaque réservation est traitée et payée séparément

### Comment réserver plusieurs équipements

Le locataire doit créer **une réservation distincte** pour chaque annonce :

```
Annonce A (prestataire 1) → réservation + paiement séparé
Annonce B (prestataire 2) → réservation + paiement séparé
```

Chaque paiement déclenche son propre webhook, ses propres notifications, et son propre cycle payout.

### Pourquoi ce choix

- Comptabilité claire par prestataire
- Chaque payout est indépendant (pas de dépendance entre prestataires)
- Évite les complications de split payment multi-destinataires en temps réel
- Chaque contrat / facture est distinct

---

## 7. Flow propriétaire — publier une annonce

### Première annonce (onboarding)

```
/proprietaire/ajouter-annonce → GetSoundOnOnboardingWizard
```

Le wizard guide en plusieurs étapes :
1. Informations de base (nom, type, catégorie)
2. Photos
3. Tarifs (jour / heure / mois)
4. Conditions et caution
5. Disponibilités et créneaux de visite
6. Publication → `salles.status = "pending"`

L'annonce attend la **validation admin** avant d'être visible publiquement (`status = "approved"`).

### Annonces suivantes

```
/proprietaire/annonces → "Ajouter une annonce" → même wizard
```

---

## 8. Flow propriétaire — gérer une réservation

### Réception d'une demande

1. Notification reçue (email + Telegram)
2. `/proprietaire/demandes` ou `/proprietaire/visites`
3. Le propriétaire consulte la demande, accepte ou refuse la visite

### Après la visite — envoyer une offre

```
/proprietaire/messagerie → sélectionner la conversation → formulaire d'offre
```

Le propriétaire remplit :
- **Montant total** (en euros)
- **Mode** : complet ou fractionné (acompte + solde J-7 avant l'événement)
- **Caution** (optionnel, en euros)
- **Politique d'annulation** : strict / modéré / flexible
- **Dates** de début et fin
- **Type d'événement** : ponctuel ou mensuel

Conditions : son **compte Stripe Connect doit être actif** pour envoyer une offre.

### Suivi

- `/proprietaire/reservations` → liste des réservations payées
- `/proprietaire/contrat` → factures et contrats
- `/proprietaire/cautions` → état des dépôts de garantie
- `/proprietaire/etats-des-lieux` → check-in / check-out
- `/proprietaire/litiges` → disputes en cours

### Activer les paiements (Stripe Connect)

```
/proprietaire/paiement → "Activer les paiements" → POST /api/stripe/connect/onboarding
```

1. Création d'un compte Stripe Express (type "FR")
2. Redirection vers le formulaire Stripe (identité, IBAN)
3. Retour sur `/proprietaire/paiement?connect=success`
4. `profiles.stripe_account_id` enregistré en base

**Sans compte Connect actif :**
- Impossible d'envoyer une offre
- Le checkout est bloqué côté locataire
- Le payout cron met le statut en `blocked`

---

## 9. Où va l'argent — timing complet

### Architecture de paiement

GetSoundOn utilise **Stripe Connect** avec un modèle de **transferts manuels différés**.

```
Locataire → Compte plateforme GetSoundOn → Transfert → Compte provider (Stripe Express)
```

Le paiement du locataire va d'abord sur le compte Stripe de GetSoundOn. Le virement au propriétaire se fait automatiquement **3 jours après la fin de l'événement**.

### Timeline complète (flow salle)

```
J0          Locataire paie → argent sur compte GetSoundOn
            Webhook → offre "paid", empreinte caution créée

J0 à J_fin  Période de location / événement

J_fin       Fin de l'événement
J_fin+1     Délai de 24h pour EDL (état des lieux)
J_fin+2     Délai de 48h pour déclarer un litige (incident_deadline_at)
J_fin+3     Cron payout-j-plus-3 → stripe.transfers.create → virement au propriétaire
J_fin+7     Cron deposit-release-j-plus-7 → caution libérée (si pas de litige)
```

### Conditions du payout J+3

Le virement est **bloqué automatiquement** si :
- `payment_plan_status ≠ "fully_paid"` (solde split pas encore prélevé)
- `incident_status = "reported"` ou `"under_review"` (litige ouvert)
- `stripe_account_id` absent sur le profil du propriétaire
- Montant ≤ 0

Si bloqué → `payout_status = "blocked"` → l'admin débloque manuellement après résolution.

### Timeline complète (flow matériel / gs_bookings)

```
J0          Locataire paie → argent sur compte GetSoundOn
            Webhook → gs_bookings "accepted", payout_due_at = end_date + 3j

end_date    Fin de la période de location
end_date+3  Cron payout-gs-bookings → stripe.transfers.create → virement au provider
end_date+7  (si caution) libération automatique de l'empreinte
```

### Paiement fractionné (split — flow salle uniquement)

Pour les grosses réservations, le propriétaire peut proposer un paiement en 2 fois :

```
J0          Locataire paie l'acompte (ex: 50% du total)
J_fin-7     Cron balance-j-minus-7 → prélèvement automatique du solde (off-session)
J_fin+3     Virement total au propriétaire
```

Si le prélèvement du solde échoue → notifications + retry. Si toujours en échec → `payment_plan_status = "balance_failed"`.

---

## 10. Caution / Dépôt de garantie

### Principe

La caution est une **empreinte bancaire** (autorisation sans capture immédiate). La carte du locataire est autorisée mais **pas débitée** tant qu'il n'y a pas de litige.

### Cycle de vie de la caution

```
Paiement offre → Webhook → PaymentIntent caution créé (capture_method: manual)
                           → deposit_hold_status = "authorized"

Fin événement + 7j → Cron deposit-release-j-plus-7
                    → Vérif : pas de litige ouvert
                    → paymentIntents.cancel → caution annulée (0 € débité)
                    → deposit_hold_status = "released"
```

### Si litige ouvert avant J+7

- Le cron **ne libère pas** la caution (skipped)
- L'admin tranche le litige via `/admin/litiges`
- L'admin peut **capturer** (débiter le locataire) ou **annuler** (libérer) la caution
- `resolveDepositClaimAdminAction` → `paymentIntents.capture` ou `paymentIntents.cancel`

### Montants

- Défini par le propriétaire dans l'offre (en euros)
- Affiché au locataire dans le récapitulatif Stripe
- Séparé du montant de location dans la comptabilité

### Cas matériel catalogue (gs_bookings)

Même principe, déclenché dans le webhook `handleGsBookingCheckoutCompleted` :
1. Récupère la PM du PaymentIntent principal
2. Crée un nouveau PI d'autorisation avec `capture_method: manual`
3. Stocke `deposit_payment_intent_id` sur `gs_bookings`

---

## 11. États des lieux (check-in / check-out)

### Fenêtres temporelles

| Phase | Disponible à partir de | Expire après |
|-------|----------------------|--------------|
| **Avant** (check-in) | `date_debut` | `date_debut + 24h` |
| **Après** (check-out) | `date_fin` | `date_fin + 24h` |

### Qui remplit quoi

Les deux parties (locataire ET propriétaire) remplissent chacun leur EDL :

```
Owner → EDL before (état avant)
Seeker → EDL before (état avant)
--- événement / location ---
Owner → EDL after (état après)
Seeker → EDL after (état après)
```

### Condition d'ouverture d'un litige

Le propriétaire peut ouvrir un litige **uniquement** :
- S'il a rempli ses deux EDL (before + after)
- Dans les **48h après la fin** de l'événement (`incident_deadline_at`)
- Si une caution est active (`deposit_hold_status = "authorized"`)

---

## 12. Litiges

### Ouverture (par le propriétaire)

```
/proprietaire/etats-des-lieux → "Ouvrir un litige" → openUserDisputeCaseAction
```

Conditions : EDL remplis, délai 48h non dépassé, caution active.

Le propriétaire indique :
- Le montant réclamé (plafonné à la caution)
- La raison (dommages, non-respect des conditions, etc.)

### Réponse (par le locataire)

```
/dashboard/etats-des-lieux → "Répondre au litige" → submitSeekerDisputeResponseAction
```

Le locataire peut accepter ou contester.

### Résolution (par l'admin)

```
/admin/litiges → résolution manuelle
```

L'admin peut :
- **Capturer** la caution → `paymentIntents.capture` → locataire débité
- **Libérer** la caution → `paymentIntents.cancel` → 0 € débité
- **Remboursement partiel** via `refunds.create`

---

## 13. Annulation

### Politiques disponibles

| Politique | Locataire annule > 30j avant | Locataire annule 14-30j avant | Locataire annule 7-14j avant | Locataire annule < 7j avant |
|-----------|------------------------------|-------------------------------|-------------------------------|------------------------------|
| **Strict** | 80% remboursé | 0% | 0% | 0% |
| **Modéré** | 100% | 100% | 50% | 0% |
| **Flexible** | 100% | 100% | 100% | 70% (si > 48h) / 20% (si < 48h) |

### Cas particuliers

| Situation | Remboursement |
|-----------|---------------|
| **Propriétaire annule** | 100% au locataire |
| **Admin annule** | 100% au locataire |
| **No-show (locataire absent, signalé par le propriétaire)** | 0% — propriétaire garde tout |
| **No-show (propriétaire absent, signalé par le locataire)** | 100% au locataire |

Le remboursement est effectué via `stripe.refunds.create` sur le `stripe_payment_intent_id` de l'offre.

---

## 14. Résumé des frais

### Ce que paie le locataire

| Composant | Montant |
|-----------|---------|
| Montant de location | Fixé par le propriétaire |
| **Frais plateforme** | **15 € fixe** (ponctuel, configurable admin) / 0 € (mensuel par défaut) |
| **Frais de traitement** | **1,5% + 0,25 €** sur (location + frais plateforme) |
| Caution | Empreinte uniquement, 0 € sauf litige |

**Exemple :** Location 500 €
- Frais plateforme : 15 €
- Frais de traitement : (515 × 1,5%) + 0,25 = 7,73 + 0,25 = **7,98 €**
- **Total locataire : 522,98 €**

### Ce que reçoit le propriétaire

| Composant | Montant |
|-----------|---------|
| Montant de location | 500 € |
| Frais plateforme | −15 € (restent chez GetSoundOn) |
| **Net propriétaire** | **500 €** *(les frais plateforme sont à la charge du locataire, pas du propriétaire)* |

> Les frais plateforme et de traitement sont ajoutés **en sus** du montant de la location. Le propriétaire reçoit donc son montant brut.

### Frais Stripe Connect (coût interne GetSoundOn)

Stripe prélève ses propres frais sur le transfert vers le compte Express du propriétaire. Ces frais sont à la charge de GetSoundOn et n'apparaissent pas dans le checkout locataire.

---

## Schéma récapitulatif global

```
LOCATAIRE                    GETSOUNDON                   PROPRIÉTAIRE
    │                             │                             │
    │── Paiement ──────────────→  │  Stripe compte plateforme   │
    │   (location + frais)        │                             │
    │                             │── J+3 transfert ──────────→ │
    │                             │   (montant location brut)   │
    │                             │                             │
    │  [Caution : empreinte]      │                             │
    │  Aucun débit immédiat       │                             │
    │                             │                             │
    │  Si pas de litige J+7       │                             │
    │── Caution annulée ─────────→│                             │
    │   (0 € débité)              │                             │
    │                             │                             │
    │  Si litige                  │                             │
    │                          Admin décide                     │
    │←── Caution libérée ────────│                             │
    │    ou capturée             │──→ Propriétaire reçoit       │
```
