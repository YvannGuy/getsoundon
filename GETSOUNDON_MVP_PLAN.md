# GetSoundOn — Plan MVP (synthèse exécutable)

Document dérivé de `GETSOUNDON_AUDIT.md`. Objectif : trancher vite ce qu’on garde, coupe ou adapte pour un MVP **marketplace matériel événementiel / sono**.

---

## 1. Fonctionnalités à garder

| Zone | Quoi |
|------|------|
| **Auth** | Supabase Auth, pages `app/auth/*`, `login`, `signup`, garde `lib/supabase/middleware.ts` + `proxy.ts`, `lib/auth-utils.ts` |
| **Marketplace `gs_*`** | `app/items`, `app/items/[id]`, API `app/api/listings/*`, `app/api/bookings/*`, `app/api/messages/route.ts`, `app/customer/messages` |
| **Paiement MVP** | `app/api/stripe/checkout-booking/route.ts`, branche `product_type = gs_booking` + `lib/stripe-webhook-gs-booking.ts`, `app/api/stripe/webhook/route.ts` |
| **Schéma cible** | Tables `gs_*` selon `config/supabase-getsoundon-schema.sql` |
| **UI générique** | `components/ui/*`, layout `site-header`, `site-footer`, `mobile-nav`, `CookieProvider` / bannière si besoin légal |
| **Home marketing** | `app/accueil` (contenu à aligner produit), `app/page.tsx` |
| **Paramètres compte** | `dashboard/parametres`, `proprietaire/parametres`, `app/actions/parametres.ts` (tant que `profiles` reste la vérité Stripe côté legacy) |
| **Emails / notifs** | `lib/email.ts`, `lib/telegram.ts`, `lib/user-notifications.ts` — **garder l’infra**, adapter les textes au fil de l’eau |
| **SEO / légal** | `lib/seo.ts`, pages légales, `config/legal.ts` — **garder les fichiers**, réécrire contenus |

*Secondaire (OK si déjà branché en prod) :* `pricing` + `app/api/stripe/checkout/route.ts` (packs), `Analytics`, blog.

---

## 2. Fonctionnalités à supprimer (du scope MVP — code peut rester mais non parcouru)

| Zone | Quoi |
|------|------|
| **Parcours lieu** | `app/salles/*`, `app/rechercher` comme **entrée principale** (remplacer par `/items` dans nav + SEO) |
| **Visites** | `demandes_visite`, `app/dashboard/demandes/visite/*`, `proprietaire/visites`, `creneaux`, actions `*demande-visite*` |
| **EDL & litiges** | Pages + actions `etats-des-lieux`, `litiges`, admin associés, bucket `etat-des-lieux` pour le **flux MVP** |
| **Contrats auto salle** | `app/api/contract/*` (hors besoin juridique explicite), `contract-template`, uploads contrat salle |
| **Offre legacy complète** | `checkout-offer`, gros morceau `lib/stripe-webhook.ts` (réservation `offers` / `payments`), crons `balance-j-minus-7`, `deposit-release-j-plus-7`, `payout-j-plus-3`, `process-balance` — **hors MVP** si tout passe par `gs_bookings` + `checkout-booking` |
| **Wizard annonce salle** | `onboarding/salle` + `create-salle` / `proprietaire-salle` comme **chemin par défaut** — remplacer par flux listing `gs_*` |
| **Messagerie legacy** | `messagerie-client` sur `conversations`/`messages` — non prioritaire si `gs_messages` suffit |
| **Fichier mort** | `page.tsx` à la **racine** du repo (`todos`) — à supprimer ou ignorer (pas dans `app/`) |

---

## 3. Renommages métier à faire

| Aujourd’hui | Cible MVP GetSoundOn |
|-------------|----------------------|
| Propriétaire de **salle** | **Prestataire** / **loueur de matériel** (UI + emails) |
| **Seeker** / organisateur | **Client** / **organisateur** |
| **Salle**, **lieu**, **annonce salle** | **Annonce matériel**, **listing**, **pack** (si produit) |
| **Demande** (flux `demandes`) | **Demande de réservation** / **booking** (`gs_bookings`) |
| **Visite** | Ne plus utiliser dans le copy MVP (ou renommer en « prise de contact » si besoin) |
| Bucket **`salle-photos`** | **`listing-photos`** ou **`gear-photos`** (nom + policies storage) |
| **`package.json` name** `salleculte` | `getsoundon` (ou équivalent npm) |
| SEO « réservation de salle », « lieu » | **sono, DJ, lumière, matériel événementiel** (`lib/seo.ts`, `config/site.ts`, `app/layout.tsx` SearchAction) |

*Optionnel plus tard :* route `/proprietaire` → `/prestataire` (gros impact liens + middleware).

---

## 4. Routes / pages à créer ou adapter

| Action | Cible |
|--------|--------|
| **Créer ou finaliser** | Formulaire **publication listing** `gs_listings` + images (`gs_listing_images`) — aujourd’hui surtout via API ; pas de parcours propriétaire unifié `gs_*` dans l’audit |
| **Adapter** | `dashboard/*` : vue **« mes réservations »** basée sur `GET /api/bookings/me` + lien paiement + messagerie `bookingId` |
| **Adapter** | `proprietaire/*` : **demandes entrantes** = bookings `gs_*` (statuts pending/accepted/refused) au lieu de `demandes`/`offers` |
| **Adapter** | `admin/annonces-a-valider` : modération **`gs_listings.is_active`** (ou statut équivalent) au lieu de seulement `salles.status` |
| **Adapter** | `onboarding/*` : remplacer **salle** par **matériel** (ou rediriger vers nouveau wizard) |
| **Adapter** | `site-header` / `site-footer` / `mobile-nav` : CTA **Recherche** → `/items`, publication → flux `gs_*` |
| **Adapter** | `app/layout.tsx` : `SearchAction` → URL type `/items?q=...` (plus `/rechercher?ville=`) |
| **Garder tel quel** | `app/items`, `app/items/[id]`, `app/api/stripe/checkout-booking`, `customer/messages` |

---

## 5. Tables / data models à adapter

| Modèle | Décision MVP |
|--------|----------------|
| **`gs_users_profile`** | Source de vérité **rôle** `customer` / `provider` / `admin` pour le flux marketplace ; aligner création au **signup** (trigger ou action) |
| **`gs_listings`**, **`gs_listing_images`** | Cœur catalogue ; champs `category` (sound, dj, lighting, services) déjà dans le schéma |
| **`gs_bookings`**, **`gs_messages`**, **`gs_payments`** | Réservation + chat + trace paiement Stripe |
| **`profiles`** | Aujourd’hui utilisé partout (Stripe Connect, admin) ; **pont obligatoire** tant que Connect/legacy vit : même `id` que `auth.users`, sync ou vue avec `gs_users_profile` |
| **Legacy** `salles`, `demandes`, `offers`, `payments`, `conversations`, `messages`, … | **Gel** ou lecture seule pour admin historique ; **pas** nouvelles features MVP dessus |
| **Signalements** | `salles_reports` → à dupliquer ou généraliser en `listing_reports` / flag sur `gs_listings` si modération requise vite |

---

## 6. Composants réutilisables

| Composant / dossier | Usage MVP |
|---------------------|-----------|
| `components/ui/*` | Formulaires, modales, boutons |
| `components/home/hero-search-bar.tsx` | Déjà orienté `/items` dans l’audit — garder, affiner filtres |
| `components/checkout-button.tsx`, `pass-checkout-button.tsx` | Patron bouton Stripe — réutiliser pour CTA paiement booking si besoin client |
| `components/dashboard/dashboard-sidebar.tsx`, `owner-sidebar.tsx`, `welcome-onboarding-banner.tsx` | Navigation + onboarding — changer textes/liens |
| `components/paiement/connect-onboarding-button.tsx` | Seulement si Connect repris post-MVP |
| `components/search/*` (adresse, dates) | Réutilisable pour **localisation matériel** / créneaux |
| `components/layout/header-auth.tsx`, `header-auth-dropdown.tsx` | Garder |
| **Ne pas réutiliser tels quels pour MVP** | `components/salles/*`, `salle-wizard.tsx`, `messagerie-client.tsx` (offres), gros blocs `etats-des-lieux/*`, `demandes/*` liés visites |

---

## 7. Les 15 tâches de dev prioritaires (ordre recommandé)

1. Appliquer / vérifier en prod le SQL **`config/supabase-getsoundon-schema.sql`** + RLS + **trigger création `gs_users_profile`** à l’inscription.
2. **Sync profil** : à chaque signup, `profiles` **et** `gs_users_profile` (même uuid) avec rôle cohérent.
3. Remplacer les **liens globaux** (header, footer, layout SEO) : recherche → **`/items`**, structured data.
4. Implémenter **page + action** « **Publier une annonce** » → `POST /api/listings` + upload images vers bucket renommé ou existant (même logique que `upload-photos.ts`).
5. **Dashboard client** : page liste réservations via **`GET /api/bookings/me`** + CTA messagerie + **Payer** (`checkout-booking`).
6. **Dashboard prestataire** : liste bookings entrants + **`PATCH /api/bookings/[id]/status`** (accepter/refuser).
7. **Admin minimal** : liste `gs_listings` à modérer (`is_active` / flag) — nouvelle requête ou page dédiée.
8. Réécrire **`lib/seo.ts`** + **`config/site.ts` description** + métadonnées home (plus « salle/lieu »).
9. Renommer **`package.json`** + nettoyer **`page.tsx` racine** (`todos`).
10. Unifier imports Supabase : privilégier **`lib/supabase/*`**, documenter ou retirer **`utils/supabase/*`** si doublon.
11. Emails : passer 3–5 **templates critiques** (signup, booking créé, paiement OK) en vocabulaire matériel.
12. **Idempotence webhook** : planifier table `stripe_webhook_events` avant montée en charge (aujourd’hui cache mémoire sur partie legacy).
13. Tests manuels **E2E** : inscription → publish listing → book → pay (Stripe test) → message.
14. Décision écrite : **MVP sans Connect** (argent plateforme) vs branchement Connect — si oui, planifier après point 6.
15. Marquer routes **legacy** comme deprecated dans la doc interne (ou feature flag) pour éviter les PRs qui les ré-étendent.

---

## 8. Pièges techniques à éviter

| Piège | Comment l’éviter |
|-------|-------------------|
| **Deux vérités** `profiles` vs `gs_users_profile` | Règle unique : qui crée quoi au signup ; même `id` = `auth.users.id` |
| **Booking créé côté client sans profil `gs_users_profile`** | Rôle `customer` requis dans `app/api/bookings/route.ts` — prévoir insert profil avant premier booking |
| **Paiement** : montant client vs DB | Toujours recalculer / comparer depuis **`gs_bookings.total_price`** (déjà fait dans `checkout-booking` / webhook gs) |
| **RLS** : service role uniquement pour webhook / admin | Ne jamais exposer `SUPABASE_SERVICE_ROLE_KEY` au client |
| **CORS / cookies** | Ne pas dupliquer `getUser` + refresh : laisser **`proxy.ts`** / middleware gérer le cycle |
| **Supprimer trop tôt le legacy** | Tant que dashboard admin/proprio lit `salles`/`offers`, couper les liens UI avant de drop tables |
| **SEO duplicate** | Une seule URL canonique pour la recherche (**`/items`**) |
| **Stripe** | Un webhook = une stratégie : bien séparer **`gs_booking`** vs **`reservation`** dans les metadata pour ne pas mélanger les handlers |
| **Storage** | Renommer bucket = mettre à jour **toutes** les références (`upload-photos`, wizard, RLS storage policies Supabase) |

---

*Fin — `GETSOUNDON_MVP_PLAN.md`*
