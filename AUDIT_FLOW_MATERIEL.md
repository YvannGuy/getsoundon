# Audit Flow Matériel / Catalogue — GetSoundOn
> Staff Product Engineer + Senior Full-Stack Architect  
> Périmètre : **flow matériel uniquement** (`gs_*`). Le flow salles (legacy `offers`) n'est pas touché.

---

## Table des matières

1. [Vue d'ensemble du flow actuel](#1-vue-densemble-du-flow-actuel)
2. [Pages matériel](#2-pages-matériel)
3. [Modèles de données](#3-modèles-de-données)
4. [Logique de conversion](#4-logique-de-conversion)
5. [Dépendance Stripe Connect](#5-dépendance-stripe-connect)
6. [Retour post-paiement](#6-retour-post-paiement)
7. [Dashboards impliqués](#7-dashboards-impliqués)
8. [Logique caution sur gs_bookings](#8-logique-caution-sur-gs_bookings)
9. [Payout logic gs_bookings](#9-payout-logic-gs_bookings)
10. [Manques exacts pour la V1](#10-manques-exacts-pour-la-v1)
11. [Ce qu'il ne faut surtout pas casser](#11-ce-quil-ne-faut-surtout-pas-casser)
12. [Ordre d'implémentation recommandé](#12-ordre-dimplémentation-recommandé)

---

## 1. Vue d'ensemble du flow actuel

```
/catalogue → /items/[id] → (2 clics) → gs_bookings créé → checkout Stripe → webhook → gs_payments
```

Le flow existe de bout en bout côté backend. Côté UI, il y a **deux étapes explicites** séparées pour l'utilisateur alors que ça devrait être transparent :

| Étape | Action utilisateur | Ce qui se passe |
|-------|-------------------|-----------------|
| 1 | "Réserver maintenant" ou "Envoyer la demande" | `POST /api/bookings` → `gs_bookings` créé |
| 2 | "Payer avec Stripe" (apparaît après étape 1) | `POST /api/stripe/checkout-booking` → redirect Stripe |

Ce double clic est du **UX friction inutile** pour l'instant booking. C'est le problème #1 à corriger.

---

## 2. Pages matériel

### `/catalogue` — `app/catalogue/page.tsx`

**Ce qui existe :**
- Page mince avec `<Suspense>` + `<ItemsSearchContent>`
- Layout avec métadonnées SEO (titre, canonical, description Île-de-France)
- Filtres : `category`, `q` (full-text), `location`, `minPrice`/`maxPrice`, pagination
- Mode mock (`mockGsListingsEnabled()`) = repli sur `lib/mock-gs-listings.ts` si DB vide
- Carte recherche intégrée (`ListingsSearchMap`)

**Ce qui manque :**
- Filtre par **disponibilité** (plage de dates)
- Filtre par **prestataire** / boutique
- **Badge "Instant Booking"** dans les cards de listing (aucun signal visuel)
- Aucune information sur si un listing est disponible pour les dates cherchées

---

### `/items/[id]` — `app/items/[id]/page.tsx` + `components/items/listing-detail-premium-view.tsx`

**Ce qui existe :**
- Chargement dynamique via `GET /api/listings/:id` (`cache: "no-store"`)
- Sélection des dates début / fin
- Calcul du prix estimé côté client (`price_per_day × days × quantity`)
- `immediate_confirmation` lue et utilisée pour afficher le bon CTA
- Gestion des query params de retour (`bookingPaid=1`, `bookingCancel=1`)
- Galerie photos (dynamique depuis `gs_listing_images`)
- Carte de zone (approximée, pas l'adresse précise)
- Breadcrumb catégorie

**Problèmes critiques détectés :**

#### 🔴 `depositAmount` toujours à 0
Le champ `depositAmount` est initialisé à `"0"` et **aucun contrôle UI** ne permet de le modifier dans `ListingDetailPremiumView`. Résultat : la caution envoyée à `/api/bookings` est toujours **0**, donc aucune empreinte Stripe n'est jamais créée pour les réservations matériel.

#### 🔴 Total UI ≠ Total API
Le composant affiche des options (livraison 35 €, installation 120 €, technicien 150 €) qui sont **hardcodées** et **jamais envoyées** à `/api/bookings`. Le `total_price` en base = `price_per_day × jours` seulement. Décalage entre ce que l'utilisateur voit et ce qu'il paie.

#### 🔴 Profil prestataire entièrement démo
La section "Prestataire" affiche :
- Photo Unsplash fixe
- Nom "SoundElite Paris" hardcodé
- 28 avis / 4.9 étoiles hardcodés
- Pas de lien dynamique vers la boutique sauf si `owner_boutique_slug` est présent (via démo slug)

`/api/listings/[id]` **ne joint pas `profiles`** en production — donc `owner_boutique_slug` ne remonte jamais depuis la DB.

#### 🟡 UX double étape (friction)
Pour `immediate_confirmation = true`, le bouton "Payer avec Stripe" n'apparaît qu'**après** avoir cliqué "Réserver maintenant". C'est contre-intuitif. L'utilisateur ne comprend pas pourquoi il doit cliquer deux fois.

#### 🟡 Flow demande standard incomplet
Pour `immediate_confirmation = false`, après "Envoyer la demande" → message feedback "Demande envoyée. Tu recevras une réponse sous peu." mais **aucun moyen de payer une fois la demande acceptée** depuis cette page. Le `gs_booking` reste en `pending` et l'utilisateur n'a aucun chemin vers le checkout.

#### 🟡 Specs techniques hardcodées
`specsForCategory()` génère des specs démo (Pioneer DJ XDJ-RX3, etc.) selon la catégorie — pas de champ `specs` en DB.

#### 🟡 Informations logistiques hardcodées
"Retrait gratuit à l'entrepôt (Paris 11e)", "Livraison à partir de 35€" — ces données ne viennent pas de `gs_listings`.

---

### `/boutique/[slug]` — `app/boutique/[slug]/page.tsx`

**Ce qui existe :**
- Slug démo (`DEMO_PROVIDER_SLUG`) → page vitrine statique
- Slug réel → recherche dans `profiles` par `boutique_slug` → affiche les **`salles`** approuvées

**Problème critique :**

#### 🔴 Boutique n'affiche pas les `gs_listings`
La boutique prestataire liste uniquement les **salles** (`/salles/[slug]`). Un prestataire matériel qui n'a pas de salle est **invisible** sur sa vitrine. Le lien depuis `/items/[id]` (`owner_boutique_slug`) mène vers une page qui ne montre pas son matériel.

---

## 3. Modèles de données

### `gs_listings` (schéma de base)

| Colonne | Type | État |
|---------|------|------|
| `id` | UUID | ✅ |
| `owner_id` | UUID → `gs_users_profile` | ✅ |
| `title`, `description` | TEXT | ✅ |
| `category` | ENUM (sound/dj/lighting/services) | ✅ |
| `price_per_day` | NUMERIC | ✅ |
| `location`, `lat`, `lng` | TEXT/FLOAT | ✅ |
| `is_active` | BOOLEAN | ✅ |
| `rating_avg`, `rating_count` | NUMERIC/INT | ✅ (non alimentés) |
| `immediate_confirmation` | BOOLEAN | ✅ (migration V2) |
| **`zone_label`** | TEXT | ⚠️ absent du schéma initial (ajouté dans mock uniquement) |
| **`deposit_amount`** | NUMERIC | ✅ mais non utilisé côté prestataire |
| **`specs`** | JSONB | ❌ absent → specs hardcodées UI |
| **`logistics`** | JSONB | ❌ absent → logistique hardcodée UI |
| **`included_items`** | JSONB | ❌ absent |
| **`owner_profile_id`** → `profiles` | UUID | ❌ absent (owner_id pointe vers `gs_users_profile`, pas `profiles`) |

**Problème de double profil :** `gs_listings.owner_id` → `gs_users_profile`, mais Stripe Connect est stocké sur `profiles`. Le webhook et le checkout font un join `profiles` sur `provider_id`, ce qui suppose que `provider_id` dans `gs_bookings` correspond bien à l'UUID dans `profiles`. À vérifier lors de chaque création de listing.

---

### `gs_bookings` (schéma initial + migrations V2)

| Colonne | Schéma initial | Migration V2 | Usage actuel |
|---------|---------------|--------------|-------------|
| `listing_id` | ✅ | — | ✅ |
| `customer_id` | ✅ | — | ✅ |
| `provider_id` | ✅ | — | ✅ |
| `start_date`, `end_date` | ✅ | — | ✅ |
| `total_price` | ✅ | — | ✅ |
| `deposit_amount` | ✅ | — | ⚠️ toujours 0 |
| `status` | ✅ (pending/accepted/refused/cancelled/completed) | — | ✅ |
| `stripe_payment_intent_id` | ❌ | ✅ ajouté | ✅ |
| `payout_due_at` | ❌ | ✅ ajouté | ✅ |
| `payout_status` | ❌ | ✅ ajouté | ✅ |
| `deposit_release_due_at` | ❌ | ✅ ajouté | ✅ |
| `deposit_amount_cents` | ❌ | ✅ ajouté | ⚠️ doublon avec `deposit_amount` |
| `deposit_payment_intent_id` | ❌ | ✅ ajouté | ✅ |
| `deposit_hold_status` | ❌ | ✅ ajouté | ✅ |

**Problème doublon caution :** `deposit_amount` (schéma initial, en euros) + `deposit_amount_cents` (migration V2, en centimes) — deux colonnes pour la même donnée. À consolider.

---

### `gs_payments`

| Colonne | État | Usage actuel |
|---------|------|-------------|
| `booking_id` | ✅ | ✅ |
| `amount` | ✅ | ✅ (montant en euros depuis `session.amount_total / 100`) |
| `status` | ✅ (pending/paid/failed/refunded/cancelled) | ✅ (`paid` après webhook) |
| `stripe_payment_id` | ✅ UNIQUE | ✅ |
| **`platform_fee`** | ❌ | ❌ (frais plateforme non stockés) |
| **`provider_payout_amount`** | ❌ | ❌ (montant transféré non tracé) |

---

### `gs_messages`

| État | Détail |
|------|--------|
| Schéma créé | ✅ (`booking_id`, `sender_id`, `content`, timestamps, RLS) |
| API route | ❌ aucune (`app/api/gs-messages/` n'existe pas) |
| UI | ❌ aucune |
| Usage | ❌ complètement inutilisé |

---

### Types TypeScript

❌ **Aucun fichier dans `lib/types/`** dédié aux `gs_*`. Les modèles sont définis inline dans les composants et routes API (`ListingDetailModel` dans le composant, types anonymes dans les routes). Fragile et non partageable.

---

## 4. Logique de conversion

### État actuel de la machine d'états

```
[visiteur]
  → /catalogue → /items/[id]
  
[connecté, immediate_confirmation = true]  
  → CTA : "Réserver maintenant"
  → click 1 → POST /api/bookings → gs_bookings(status: "accepted")
  → apparition bouton "Payer avec Stripe"
  → click 2 → POST /api/stripe/checkout-booking → Stripe Checkout
  → succès → webhook → gs_bookings(status: "accepted"), gs_payments(paid), payout_due_at set
  
[connecté, immediate_confirmation = false]
  → CTA : "Envoyer la demande"
  → click → POST /api/bookings → gs_bookings(status: "pending")
  → feedback : "Demande envoyée. Tu recevras une réponse sous peu."
  → ??? → DEAD END — aucun chemin vers le paiement depuis cette page
```

### Ce qui manque dans le flow demande standard

Il manque **tout le parcours d'acceptation** :
1. Le prestataire doit pouvoir voir les demandes `pending` (dashboard)
2. Le prestataire doit pouvoir accepter → `status: "accepted"`
3. Le locataire doit être notifié
4. Le locataire doit pouvoir payer depuis son dashboard (pas depuis `/items/[id]`)

---

## 5. Dépendance Stripe Connect

### Vérifications en place

| Étape | Vérification |
|-------|-------------|
| `POST /api/stripe/checkout-booking` | ✅ `profiles.stripe_account_id` requis |
| `POST /api/stripe/checkout-booking` | ✅ `capabilities.transfers === "active"` vérifié |
| `POST /api/bookings` (création) | ❌ aucune vérification Connect |
| UI `/items/[id]` | ❌ aucun gating — le bouton "Réserver maintenant" s'affiche même si le prestataire n'a pas de compte Connect |
| Cron payout | ✅ skip si pas de `stripe_account_id` sur le profil |

**Problème :** un utilisateur peut créer une `gs_booking` pour un prestataire sans Connect actif. La création réussit, mais le checkout échoue ensuite avec un message d'erreur technique. L'UX est cassée — le blocage doit se faire **en amont** (CTA ou page listing).

### Remarque sur le pattern Stripe utilisé

- Paiement **collecté sur le compte plateforme** (pas de `transfer_data` ni `on_behalf_of` sur la Checkout Session)
- Virement **différé via `stripe.transfers.create`** dans le cron J+3
- Ce pattern nécessite que GetSoundOn ait suffisamment de solde Stripe pour couvrir les transfers → à monitorer

---

## 6. Retour post-paiement

**Success URL :** `/items/${listing_id}?bookingPaid=1&bookingId=${bookingId}`

**Ce qui se passe :**
1. La page recharge, détecte `bookingPaid=1`
2. Affiche un message texte : "Paiement réussi pour la réservation {id}. Statut mis à jour."
3. Nettoie l'URL avec `history.replaceState`

**Problèmes :**
- ❌ L'utilisateur reste sur la **fiche produit** — pas de redirection vers son dashboard
- ❌ Aucune **confirmation email** déclenchée côté UI (le webhook envoie des notifications mais pas de redirect vers une page de succès dédiée)
- ❌ Pas de page `/dashboard/commandes` ou équivalent listant les réservations matériel
- ❌ `lastBookingId` est en mémoire locale → rechargement de page = perte de l'état = le bouton "Payer avec Stripe" disparaît

**Cancel URL :** `/items/${listing_id}?bookingCancel=1`
- Même problème : reste sur la fiche, feedback textuel seulement
- La `gs_booking` reste en base à l'état `pending`/`accepted` sans moyen de la reprendre facilement

---

## 7. Dashboards impliqués

### Côté locataire

| Page | Ce qu'elle affiche | gs_bookings ? |
|------|------------------|---------------|
| `/dashboard/reservations` | Offres `offers` payées (flow salle) | ❌ |
| `/dashboard/paiement` | Gestion de la carte bancaire | ❌ |

❌ **Aucune page dashboard ne liste les `gs_bookings` du locataire.**

### Côté prestataire

| Page | Ce qu'elle affiche | gs_bookings ? |
|------|------------------|---------------|
| `/proprietaire/reservations` | Offres `offers` payées (flow salle) | ❌ |
| `/proprietaire/annonces` | Gestion des `salles` | ❌ |
| `/proprietaire/paiement` | Stripe Connect onboarding | Partiel |

❌ **Aucune page dashboard ne liste les `gs_bookings` côté prestataire.**  
❌ Le prestataire ne peut pas voir les **demandes `pending`** de matériel.  
❌ Le prestataire ne peut pas **accepter ou refuser** une demande matériel.  
❌ Le prestataire ne peut pas gérer ses **annonces matériel** (`gs_listings`).

---

## 8. Logique caution sur `gs_bookings`

### Ce qui est implémenté

Dans `lib/stripe-webhook-gs-booking.ts`, après paiement réussi :

```
SI deposit_amount_cents > 0 :
  → stripe.paymentIntents.create(capture_method: "manual", off_session: true)
  → update gs_bookings SET deposit_payment_intent_id, deposit_hold_status = "authorized"
```

### Ce qui manque / est cassé

1. **`deposit_amount_cents` est toujours 0** (voir problème `depositAmount` côté UI)  
   → la caution n'est **jamais créée** dans les faits actuels

2. **Aucun cron de libération caution pour `gs_bookings`**  
   Le cron `deposit-release-j-plus-7` ne traite que les **`offers`** (flow salle), pas les `gs_bookings`.  
   → les empreintes caution matériel ne seraient **jamais libérées automatiquement**

3. **Aucune interface de gestion des cautions matériel**  
   `/proprietaire/cautions` ne liste que les cautions `offers`

4. **Aucun flow litige pour `gs_bookings`**  
   Pas de `incident_status`, `refund_cases` ni EDL côté matériel

5. **Empreinte créée sans `on_behalf_of`**  
   En mode Connect plateforme, la caution est sur le compte GetSoundOn, pas sur le compte connecté — cohérent avec le pattern utilisé, mais à documenter clairement

---

## 9. Payout logic `gs_bookings`

### Ce qui est implémenté (`app/api/cron/payout-gs-bookings/route.ts`)

✅ **Cron fonctionnel** :
- Sélection : `gs_bookings` où `payout_due_at <= now` et `payout_status IN (pending, scheduled, blocked)` et `status IN (accepted, completed)`
- `stripe.transfers.create` vers `profiles.stripe_account_id` du provider
- Idempotency key : `payout-gs-bookings-${id}`
- Mise à jour `payout_status: "paid"` ou `"blocked"`

### Ce qui manque

1. **Pas de commission plateforme déduite**  
   Le transfer = `total_price` brut. GetSoundOn ne prend aucun frais service sur le matériel (contrairement au flow salles avec ses 15 €). À clarifier si intentionnel.

2. **`gs_bookings.status` ne passe jamais en `"completed"`**  
   Le cron accepte `completed` mais rien dans le code ne fait cette transition. Si un payout échoue pour booking `accepted` et repasse en `blocked`, il n'y a pas de route admin pour le débloquer manuellement.

3. **Pas de vérification de litige**  
   Le cron payout salles vérifie `incident_status` et `refund_cases` avant de virer. Le cron matériel **ne fait aucune vérification** — le virement est effectué même si l'équipement a été endommagé.

4. **Pas de notification au prestataire** lors du virement effectif.

5. **`vercel.json`** : les deux crons `payout-j-plus-3` et `payout-gs-bookings` ont le **même horaire `0 9 * * *`** → collision potentielle (charge double au même moment).

---

## 10. Manques exacts pour la V1

### 🔴 Critique (bloquant la V1)

| # | Manque | Fichiers concernés |
|---|--------|--------------------|
| 1 | **Pas de dashboard locataire pour les réservations matériel** | `app/dashboard/` (à créer) |
| 2 | **Pas de dashboard prestataire pour les demandes + réservations matériel** | `app/proprietaire/` (à créer) |
| 3 | **Pas d'action prestataire pour accepter/refuser une demande** | `app/actions/` + API route |
| 4 | **Pas de notification au locataire quand sa demande est acceptée** | `lib/user-notifications.ts` à utiliser |
| 5 | **`depositAmount` toujours 0** | `listing-detail-premium-view.tsx` + `app/items/[id]/page.tsx` |
| 6 | **Boutique ne liste pas `gs_listings`** | `app/boutique/[slug]/page.tsx` |
| 7 | **Gating Stripe Connect absent côté UI** | `listing-detail-premium-view.tsx` + `app/api/listings/[id]/route.ts` |
| 8 | **Cron de libération caution matériel absent** | `app/api/cron/deposit-release-j-plus-7/route.ts` à étendre |

### 🟡 Important (dégradation UX significative)

| # | Manque | Fichiers concernés |
|---|--------|--------------------|
| 9 | **Double clic pour payer (instant booking)** | `listing-detail-premium-view.tsx` → merger les 2 actions |
| 10 | **Retour post-paiement sur la fiche produit** → devrait aller au dashboard | `app/api/stripe/checkout-booking/route.ts` (success URL) |
| 11 | **`lastBookingId` volatile** (perdu au rechargement) | `app/items/[id]/page.tsx` → stocker en `sessionStorage` ou query param |
| 12 | **`/api/listings/[id]` ne joint pas `profiles`** → `owner_boutique_slug` absent en prod | `app/api/listings/[id]/route.ts` |
| 13 | **Aucun type TypeScript partagé pour `gs_*`** | `lib/types/` (à créer) |
| 14 | **Gestion page prestataire d'annonces matériel** (`gs_listings`) | `app/proprietaire/annonces/` (salles seulement) |

### 🟢 Nice-to-have (post-V1)

| # | Manque |
|---|--------|
| 15 | Specs techniques dynamiques (champ `specs` JSONB en DB) |
| 16 | Logistique dynamique (livraison/installation configurables par prestataire) |
| 17 | Avis dynamiques depuis `gs_reviews` |
| 18 | Filtre disponibilité dans `/catalogue` |
| 19 | Badge "Instant Booking" dans les cards catalogue |
| 20 | Flow litige pour matériel (EDL, `incident_status` sur `gs_bookings`) |
| 21 | Vérification double-booking (chevauchement de dates) |
| 22 | Commission plateforme sur matériel (actuellement 0) |
| 23 | Page de confirmation post-paiement dédiée (`/confirmation/booking/[id]`) |
| 24 | `gs_messages` API + UI (messagerie post-réservation matériel) |

---

## 11. Ce qu'il ne faut surtout pas casser

| Élément | Pourquoi |
|---------|----------|
| `lib/stripe-webhook-gs-booking.ts` | Pont critique entre Stripe et la DB — toute modification peut désynchroniser le statut des réservations payées |
| `app/api/cron/payout-gs-bookings/route.ts` | Virements réels vers les prestataires — idempotency key doit rester stable |
| `app/api/stripe/checkout-booking/route.ts` | Vérification Connect + session Stripe — ne pas retirer les vérifications de capabilities |
| `app/api/bookings/route.ts` | Création de `gs_bookings` — ne pas casser le mapping `provider_id` → `profiles` |
| `vercel.json` crons déclarés | Modifier les schedules peut stopper les payouts et libérations de caution |
| RLS `gs_bookings` | Ne pas la désactiver — chaque participant ne doit voir que ses bookings |
| `mockGsListingsEnabled()` | Flag de fallback utilisé en dev — ne pas supprimer sans avoir des données réelles en place |

---

## 12. Ordre d'implémentation recommandé

### Phase 1 — Débloquer le flow de base (critique, 1-2 jours)

```
P1.1 — Gating Connect sur la fiche produit
  → app/api/listings/[id]/route.ts : joindre profiles pour remonter has_connect_active
  → listing-detail-premium-view.tsx : désactiver CTA si prestataire sans Connect

P1.2 — Merger les 2 clics (instant booking)
  → app/items/[id]/page.tsx : fusionner submitBooking() + payBooking() en un seul
  → Stocker lastBookingId en sessionStorage pour résistance au rechargement

P1.3 — Success URL → dashboard au lieu de la fiche
  → app/api/stripe/checkout-booking/route.ts : success_url vers /dashboard/materiel?paid=1&bookingId=...

P1.4 — Corriger depositAmount
  → listing-detail-premium-view.tsx : exposer la prop deposit_amount depuis le listing
  → app/items/[id]/page.tsx : passer deposit_amount depuis l'API au composant
  → La caution n'a pas besoin d'être saisie par l'utilisateur — elle vient du listing
```

### Phase 2 — Dashboard locataire matériel (1 jour)

```
P2.1 — Page /dashboard/materiel
  → Lister les gs_bookings où customer_id = user.id
  → Statuts : pending / accepted / payé / terminé
  → Bouton "Payer" si status = "accepted" et pas encore payé

P2.2 — Notification locataire quand demande acceptée
  → Action accepter côté prestataire → sendUserNotification vers locataire
```

### Phase 3 — Dashboard prestataire matériel (1-2 jours)

```
P3.1 — Page /proprietaire/materiel/demandes
  → Lister les gs_bookings où provider_id = user.id et status = "pending"
  → Bouton "Accepter" / "Refuser"

P3.2 — Action accepter / refuser
  → app/actions/gs-bookings.ts : acceptBookingAction / refuseBookingAction
  → Vérification : provider_id === user.id
  → Notification au locataire

P3.3 — Page /proprietaire/materiel/reservations
  → Lister les gs_bookings acceptés et payés
  → Statuts payout (pending / paid / blocked)

P3.4 — Gestion annonces matériel
  → Étendre /proprietaire/annonces pour lister aussi les gs_listings
  → CRUD basique (toggle is_active, modifier prix, immediate_confirmation)
```

### Phase 4 — Boutique prestataire matériel (0.5 jour)

```
P4.1 — /boutique/[slug] : afficher gs_listings en plus des salles
  → JOIN gs_listings sur profiles.id (via owner_id dans gs_users_profile OU via un champ profile_id à ajouter)
  → Section "Matériel disponible" dans la page boutique

P4.2 — /api/listings/[id] : joindre profiles pour owner_boutique_slug
  → Activer la section prestataire dynamique dans listing-detail-premium-view.tsx
```

### Phase 5 — Caution et cron libération (0.5 jour)

```
P5.1 — Étendre deposit-release-j-plus-7 pour gs_bookings
  → app/api/cron/deposit-release-j-plus-7/route.ts : ajouter un bloc gs_bookings après le bloc offers
  → Même logique : authorized + pas de litige + deposit_release_due_at dépassé → cancel PI

P5.2 — Vérification litige avant payout gs_bookings
  → app/api/cron/payout-gs-bookings/route.ts : ajouter check incident_status si la colonne est ajoutée
```

### Phase 6 — Types et qualité code (à faire en parallèle des phases 1-5)

```
P6.1 — lib/types/gs-listing.ts + lib/types/gs-booking.ts
  → Types partagés entre les routes API, actions et composants
  
P6.2 — Consolider deposit_amount vs deposit_amount_cents
  → Choisir un standard (centimes recommandé) et migrer
```

---

## Résumé cartographique des fichiers

```
FLOW MATÉRIEL — CARTE DES FICHIERS

Pages :
  app/catalogue/page.tsx                    ← liste des annonces
  app/items/[id]/page.tsx                   ← fiche détail + orchestration booking
  app/boutique/[slug]/page.tsx              ← vitrine (🔴 gs_listings manquants)

Composants :
  components/items/listing-detail-premium-view.tsx   ← UI fiche (🔴 démo hardcodée)
  components/items/items-search-content.tsx          ← grid catalogue
  components/items/listings-search-map.tsx           ← carte catalogue

APIs :
  app/api/listings/route.ts                 ← GET liste, POST créer listing
  app/api/listings/[id]/route.ts            ← GET détail (🔴 pas de join profiles)
  app/api/bookings/route.ts                 ← POST créer gs_booking
  app/api/stripe/checkout-booking/route.ts  ← POST créer session Stripe
  app/api/cron/payout-gs-bookings/route.ts  ← cron virement J+3

Webhook :
  lib/stripe-webhook-gs-booking.ts          ← checkout.session.completed → gs_bookings

Manquants :
  app/dashboard/materiel/page.tsx           ← ❌ à créer
  app/proprietaire/materiel/page.tsx        ← ❌ à créer
  app/actions/gs-bookings.ts                ← ❌ à créer
  lib/types/gs-listing.ts                   ← ❌ à créer
  lib/types/gs-booking.ts                   ← ❌ à créer
  Extension deposit-release cron            ← ❌ à faire
```
