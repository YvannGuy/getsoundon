# Audit technique — GetSoundOn (base forkée salledeculte)

Document généré à partir de l’état **actuel** du dépôt (lecture du code et des chemins). Aucune modification de code n’a été effectuée pour produire cet audit.

---

## 1. Vue d’ensemble du projet

### Stack utilisée

- **Framework** : Next.js **16** (App Router), React **19**, TypeScript **5**.
- **UI** : Tailwind CSS **3**, composants type shadcn/Radix (`components/ui/*`, `@radix-ui/*`).
- **Formulaires / validation** : `react-hook-form`, `@hookform/resolvers`, **zod**.
- **Cartes** : **Leaflet** + `react-leaflet`, `react-leaflet-cluster`.
- **PDF** : `pdf-lib`.
- **Markdown** : `react-markdown`.

### Architecture globale

- **`app/`** : routes App Router (`page.tsx`, `layout.tsx`), **API Routes** sous `app/api/**/route.ts`, **Server Actions** sous `app/actions/*.ts`.
- **`components/`** : UI par domaine (`salles/`, `rechercher/`, `messagerie/`, `proprietaire/`, `dashboard/`, `admin/`, etc.).
- **`lib/`** : intégrations (Supabase serveur/admin, Stripe, email, télégramme, SEO, notifications utilisateur, webhooks Stripe, etc.).
- **`config/`** : `site.ts`, `legal.ts`.
- **`getsoundon-starter/`** : schémas SQL templates, routes/cron Stripe « gear rental », documentation de migration (hors runtime de l’app principale sauf si copié).
- **`utils/supabase/`** et **`lib/supabase/`** : deux emplacements de clients Supabase (cohérence à clarifier en phase de refactor).
- **`proxy.ts`** : point d’entrée type middleware qui délègue à `lib/supabase/middleware.ts` (`updateSession`) avec un `matcher` excluant en partie `api` et assets.

### Dépendances importantes

- `@supabase/ssr`, `@supabase/supabase-js`
- `stripe`, `@stripe/stripe-js`
- `resend`
- `sharp` (traitement d’images / filigrane)
- `date-fns`, `lucide-react`, `clsx`, `tailwind-merge`, `class-variance-authority`

**Note** : le **`package.json`** porte encore le nom npm **`salleculte`** (héritage du projet source).

### Services externes utilisés

| Service        | Usage dans le code (indicatif) |
|----------------|--------------------------------|
| **Supabase**   | Auth, base Postgres (PostgREST), stockage fichiers |
| **Stripe**     | Checkout (abonnement, offre, pass, booking), Connect (onboarding, login link), webhooks, portal, crons métier (solde, caution, payout) |
| **Resend**     | Emails transactionnels (`lib/email.ts`) |
| **Telegram**   | Notifications admin / utilisateur (`lib/telegram.ts`, `lib/user-notifications.ts`) |
| **APIs gouv**  | Script npm `update-communes` (génération `lib/data/communes-idf.json`) |

Variables typiques (d’après le code) : `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, clés Stripe, `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`, `ADMIN_EMAILS`, variables Telegram, `NEXT_PUBLIC_SITE_URL`, etc.

### Système d’auth

- **Supabase Auth** (cookies SSR via `@supabase/ssr`).
- Rafraîchissement / garde d’accès : **`lib/supabase/middleware.ts`** (chemins protégés `/dashboard`, `/proprietaire`, `/onboarding`, `/admin` → redirection `/auth` ou `/auth/admin`).
- **Rôles métier** dérivés de `profiles.user_type`, `user_metadata.user_type`, et liste **`ADMIN_EMAILS`** : logique dans **`lib/auth-utils.ts`** (`EffectiveUserType`: `admin` | `owner` | `seeker`).
- Connexion / inscription dédiées : `app/auth/*`, `app/login`, `app/signup`, `app/auth/admin`.

### Base de données

Le code interroge principalement des tables **legacy « salle / réservation »** :

- **`profiles`**, **`salles`**, **`demandes`**, **`demandes_visite`**, **`conversations`**, **`messages`**, **`offers`**, **`payments`**, **`etat_des_lieux`**, **`etat_des_lieux_photos`**, **`refund_cases`**, **`refund_case_evidences`**, **`favoris`**, **`salle_views`**, **`salles_reports`**, **`salle_location_exclusions`**, **`salle_visite_exclusions`**, **`contract_templates`**, **`platform_settings`**, **`concierge_requests`**, **`user_conversation_preferences`**, **`message_attachments`**, **`telegram_link_tokens`**, etc.

Parallèlement, un socle **MVP GetSoundOn** cible des tables préfixées **`gs_*`** (schéma documenté dans `config/supabase-getsoundon-schema.sql`) :

- **`gs_users_profile`**, **`gs_listings`**, **`gs_listing_images`**, **`gs_bookings`**, **`gs_messages`**, **`gs_payments`**, **`gs_reviews`**

Consommé notamment par : `app/api/listings/*`, `app/api/bookings/*`, `app/api/messages/route.ts`, `app/api/stripe/checkout-booking/route.ts`, `lib/stripe-webhook-gs-booking.ts`.

**Conséquence** : la base réelle doit soit contenir les deux mondes (legacy + `gs_*`), soit l’une des branches sera non fonctionnelle tant que la migration / le choix de schéma n’est pas figé.

### Stockage (Supabase Storage)

Buckets référencés dans le code (exemples) :

- **`salle-photos`** — photos d’annonces (`app/actions/upload-photos.ts`, `create-salle`, `proprietaire-salle`, wizard).
- **`contrats`** — PDF contrats / factures (`app/api/contract/*`, `invoice`, webhook).
- **`etat-des-lieux`** — photos et preuves EDL / litiges.

### Paiements

- **Abonnement** « packs » : `app/api/stripe/checkout/route.ts` + `pricingPlans` dans `config/site.ts`.
- **Réservation legacy** (offre liée à `offers`, Connect, acompte/solde/caution) : `app/api/stripe/checkout-offer/route.ts`, `lib/stripe-webhook.ts`, crons sous `app/api/cron/*`, `app/api/stripe/process-balance/route.ts`.
- **Pass / essai** : `app/api/stripe/checkout-pass/route.ts`.
- **MVP booking `gs_*`** : `app/api/stripe/checkout-booking/route.ts` + branche webhook dédiée.

### Emails / notifications

- **Resend** : `lib/email.ts` (nombreux modèles : demandes, visites, paiements, réservations, etc.).
- **Telegram** : alertes admin et canaux utilisateur selon config (`lib/telegram.ts`, `lib/user-notifications.ts`).

### Géolocalisation / cartes

- **Leaflet** : `components/salles/salle-map*.tsx`, `components/rechercher/map-inner.tsx`, `rechercher/search-map.tsx`.
- **Autocomplétion** : `components/search/adresse-autocomplete.tsx`, `ville-autocomplete.tsx`, `department-autocomplete.tsx`.
- Données **communes IDF** : `lib/data/communes-idf.json` (script `update-communes`).

### Dashboards / espaces admin

- **Organisateur / locataire** : `app/dashboard/*` (demandes, messagerie, réservations, paiements, litiges, EDL, favoris, paramètres, etc.).
- **Propriétaire de lieux** : `app/proprietaire/*` (annonces, demandes, visites, messagerie, réservations, cautions, contrat, paiements Connect, etc.).
- **Admin** : `app/admin/*` (tableau de bord, annonces à valider, utilisateurs, paiements, réservations, litiges, EDL, conciergerie, signalements, paramètres).
- Composants : `components/dashboard/*`, `components/admin/*`, sidebars `dashboard-sidebar.tsx`, `owner-sidebar.tsx`, `admin-sidebar.tsx`.

---

## 2. Mapping fonctionnel actuel

Pour chaque bloc : objectif, routes / fichiers clés, tables / APIs, réutilisabilité GetSoundOn.

| Fonctionnalité | Objectif | Pages / routes | Composants / actions / API (principaux) | Tables / schémas | Réutilisable tel quel ? | À modifier ? | À supprimer (MVP matériel) ? |
|----------------|----------|----------------|----------------------------------------|------------------|-------------------------|--------------|------------------------------|
| **Accueil & marketing** | SEO, conversion, présentation | `app/page.tsx` → `app/accueil/page.tsx`, `avantages`, `blog`, `centre-aide`, `cgu`, `cgv`, etc. | `components/home/*`, `ConciergeSection`, footers/headers | Peu ou pas de tables métier directes | Partiellement (textes/SEO) | Oui (positionnement matériel vs lieux) | Non (à adapter) |
| **Recherche lieux** | Liste + carte + filtres | `app/rechercher/page.tsx`, `dashboard/rechercher` | `rechercher-content.tsx`, `search-map.tsx`, `search-form.tsx` | `salles`, stats vues/visites | Non pour MVP matériel identique | Oui — basculer vers listings matériel ou `/items` | Scope MVP peut **réduire** à `/items` uniquement |
| **Fiche lieu** | Détail salle, réservation contextuelle | `app/salles/[slug]/*` | `components/salles/*` | `salles`, `salle_views`, etc. | Non | Oui — équivalent « fiche matériel » | **Hors MVP** si remplacé par `items/[id]` |
| **Marketplace MVP (`gs_*`)** | Listings matériel, booking simple, messages | `app/items`, `app/items/[id]`, `customer/messages` | Pages client + fetch API | `gs_listings`, `gs_bookings`, `gs_messages` | **Oui** (cœur GetSoundOn) | Oui (profondeur produit, paiement Connect) | **Garder** |
| **Création annonce lieu** | Wizard proprio | `onboarding/salle`, actions `create-salle`, `proprietaire-salle` | `salle-wizard.tsx`, `add-salle-modal.tsx` | `salles`, storage `salle-photos` | Logique réutilisable, **pas** le modèle `salles` | **Oui** — aligner sur `gs_listings` ou `gear_listings` | Remplacer / fusionner avec flux matériel |
| **Demandes de réservation (lieu)** | Demande → conversation → offre | `dashboard/demandes`, `proprietaire/demandes`, actions `create-demande`, `demande-owner` | Composants `demandes/*` | `demandes`, `conversations`, `messages` | Pattern réutilisable | Oui (entités, champs, statuts) | Simplifier pour MVP |
| **Visites de lieux** | Demande de visite, créneaux | `dashboard/demandes/visite/*`, `proprietaire/visites`, actions `create-demande-visite`, `demande-visite-*`, `creneaux` | `visites-table.tsx`, `calendrier-visites-manager.tsx` | `demandes_visite`, exclusions | Spécifique « visite lieu » | Fortement | **Hors MVP** matériel pur (souvent) |
| **Messagerie legacy** | Chat lié conversations/offres | `dashboard/messagerie`, `proprietaire/messagerie` | `messagerie-client.tsx`, modals offre/contrat | `conversations`, `messages`, `message_attachments` | Oui (concept) | Oui (liaison booking/listing) | Réduire si messagerie uniquement `gs_messages` |
| **Offres & paiement complexe** | Split, caution, EDL, litiges | Nombreuses pages dashboard/proprio/admin + `checkout-offer`, webhooks | `offer-card`, `contract-accept-modal`, EDL, litiges | `offers`, `payments`, EDL, `refund_*` | Très mature pour **location événementielle lieux** | Adapter au matériel ou **simplifier** | **Retirer du MVP** si objectif = parcours simple |
| **Stripe Connect proprio** | Encaissement propriétaire | `api/stripe/connect/*`, pages paiement | `connect-onboarding-button.tsx` | `profiles.stripe_account_id` | Réutilisable | Oui (KYC, labels) | Optionnel MVP minimal |
| **Abonnement / packs** | Monétisation plateforme | `pricing`, `api/stripe/checkout` | `checkout-button`, packs dans `config/site.ts` | Stripe Prices | Optionnel selon business | Oui | Peut rester **secondaire** |
| **Favoris** | Signets sur salles | `dashboard/favoris` | — | `favoris` + `salles` | Concept réutilisable | Cible `gs_listings` | Secondaire MVP |
| **Contrats PDF** | Contrat / template par salle | `dashboard/contrat`, `proprietaire/contrat`, `api/contract/*`, actions `contract-template` | `contract-upload`, `contract-template-form` | `contract_templates`, storage `contrats` | Lourd, spécifique lieux | Fortement | **Hors MVP** simple |
| **États des lieux & litiges** | Workflow post-réservation | `etats-des-lieux`, `litiges`, admin, actions `etats-des-lieux` | Nombreux composants `etats-des-lieux/*` | `etat_des_lieux*`, `refund_*` | Métier très spécifique | Adapter ou reporter | **Hors MVP** initial |
| **Conciergerie** | Demandes manuelles | `conciergerie`, `admin/conciergerie` | `concierge-form`, actions `concierge*` | `concierge_requests` | Optionnel produit | Textes / process | Secondaire |
| **Signalements** | Modération annonces | `admin/signalements`, action `signalements-admin` | — | `salles_reports` | Réutilisable | Cible listings matériel | Secondaire |
| **Admin** | Opération / validation / stats | `app/admin/*` | KPI, sidebars, filtres | Agrégats sur `salles`, `payments`, etc. | **Oui** | Recâbler requêtes sur nouveau modèle | Garder en version **allégée** |
| **Auth / compte** | Login, signup, MDP oublié | `auth`, `login`, `signup` | `login-form`, `signup-form` | `profiles`, Auth | **Oui** | Rôles / onboarding | **Garder** |
| **Paramètres compte** | Profil, Telegram, etc. | `dashboard/parametres`, `proprietaire/parametres` | `parametres-content.tsx`, actions `parametres` | `profiles`, `telegram_link_tokens` | **Oui** | Libellés | **Garder** |
| **Essai / trial seeker** | Freemium | actions `trial`, `admin-trial` | boutons essai | `profiles` | Selon produit | Oui | Secondaire |
| **SEO / légal** | Référencement, conformité | `lib/seo.ts`, `plan-du-site`, pages légales | — | — | Partiel | Mots-clés « salle / lieu » encore présents dans `lib/seo.ts` et parfois `siteConfig.description` | À **réécrire** |

---

## 3. Éléments fortement liés à salledeculte.com (ou au métier « salle / lieu »)

### Vocabulaire & produit

- Routes et dossiers : **`proprietaire`**, **`salles`**, **`rechercher`**, **`onboarding/salle`**, **`demandes_visite`**, **« salle »** partout dans composants (`components/salles/`, `salle-wizard`, `uploadSallePhotos`, bucket **`salle-photos`**).
- Types utilisateurs **`owner` / `seeker`** centrés « propriétaire de lieu » vs « organisateur ».
- Métier **visite de lieu**, **capacité**, **disponibilité calendrier**, **départements** (`department-autocomplete`, carrousels départements).
- **EDL**, **caution**, **solde J-7**, **payout J+3**, **litiges**, **contrat par salle** : workflow location de **lieu** événementiel.

### Textes & SEO

- **`lib/seo.ts`** : titre/description/keywords encore orientés **« lieu », « réservation de salle »** malgré un `siteName` GetSoundOn.
- **`config/site.ts`** : `description` encore « **lieux d’évenements** ».
- **`app/layout.tsx`** : `SearchAction` pointe vers **`/rechercher?ville=...`** (flux ville / lieu).
- Nombreux emails dans **`lib/email.ts`** structurés autour de réservations de **salle** / visites (à vérifier ligne par ligne lors du rebranding complet).

### Schéma données & nommage SQL

- Tables **`salles`**, **`demandes`**, **`offers.salle_id`**, **`conversations`** liées aux demandes, etc.
- Fichiers d’actions : **`create-salle.ts`**, **`proprietaire-salle.ts`**, **`salle-ratings.ts`**, **`salle-views.ts`**, **`salle-reports.ts`**.

### Variables & scripts

- **`package.json`** : nom **`salleculte`**, scripts `supabase:init-*` orientés **salle / message / contrat / edl**.
- **`page.tsx` à la racine du repo** (`todos`) : fichier **hors App Router** `app/` — ressemble à un reste de template Supabase, **non aligné** avec `app/page.tsx` (dette / confusion).

### Liste explicite — à renommer, refactorer ou supprimer pour getsoundon.com (cible matériel)

| Catégorie | Éléments |
|-----------|----------|
| **Routes** | `app/salles/*`, `app/rechercher`, `app/onboarding/salle`, renommage conceptuel de `proprietaire` → `prestataire` / `vendeur` (optionnel produit) |
| **Composants** | Dossier `components/salles/`, préfixes `salle-*`, `add-salle-link`, wizard « salle » |
| **Actions** | `create-salle`, `proprietaire-salle`, `salle-*`, `create-demande-visite`, `demande-visite-*`, `creneaux`, `etats-des-lieux`, `contract-template`, partie lourde de `cancellations` / `offers` si simplification |
| **API** | Toutes les routes sous `api/contract/*` liées au modèle salle/offre legacy si MVP sans contrat auto |
| **Tables** | Migration ou abandon progressif : `salles`, `demandes_visite`, `etat_des_lieux*`, `refund_*`, `contract_templates`, etc. |
| **Storage** | Renommage bucket ou stratégie unifiée (`salle-photos` → `listing-photos` / `gear-photos`) |
| **SEO** | `lib/seo.ts`, structured data dans `app/layout.tsx` (cible de recherche), métadonnées par page blog/plan du site |
| **Libellés UI** | Headers, footers, centre d’aide, CGV/CGU (revue juridique + vocabulaire) |

---

## 4. Éléments réutilisables pour GetSoundOn (marketplace matériel)

| Élément | Pourquoi réutiliser | Maturité | Ajustements nécessaires |
|---------|---------------------|----------|-------------------------|
| **Auth Supabase** | Standard, déjà câblé SSR + middleware | **Élevée** | Profils : champs / rôles (`customer`/`provider` vs `seeker`/`owner`) si besoin ; aligner `gs_users_profile` vs `profiles` |
| **Onboarding** | Patterns wizard / étapes | **Moyenne** | Remplacer données « salle » par « matériel / pack », validation zod |
| **Dashboard (structure)** | Navigation, layouts, sidebars | **Élevée** | Requêtes et libellés ; KPI admin à rebrancher |
| **Demandes / réservation** | Machine à états conversation + statuts | **Élevée** côté legacy | Simplifier ou mapper vers `gs_bookings` + messagerie |
| **Publication d’annonces** | Upload, images, statut validation admin | **Élevée** | Nouveau schéma listing ; filigrane déjà paramétrable (`upload-photos.ts`) |
| **Paiement** | Stripe Checkout + webhooks + crons | **Très élevée** | Décider : MVP plateforme seule (`checkout-booking`) vs Connect (offre legacy) |
| **Admin** | Validation annonces, users, paiements | **Élevée** | Pointage vers tables MVP |
| **Notifications** | Email + Telegram | **Moyenne** | Templates, textes, liens dashboard |
| **Géolocalisation** | Carte + autocomplete | **Moyenne** | Passer de « ville salle » à « zone de prêt / retrait » si pertinent |
| **Messagerie** | Threads, pièces jointes (legacy) | **Moyenne** | `gs_messages` polling déjà présent ; feature parity à trancher |
| **Statuts** | Bookings, offres, paiements | **Élevée** | Redéfinir graphe minimal MVP |
| **Profils** | `profiles` + Stripe ids | **Élevée** | Cohabitation avec `gs_users_profile` à résoudre |

---

## 5. Risques techniques et dettes

1. **Double modèle de données** (`legacy` vs **`gs_*`**) : risque de confusion, features partiellement branchées, migrations incomplètes sans documentation d’exécution stricte.
2. **`page.tsx` racine** (`todos`) : fichier **orphelin** ou trompeur par rapport à `app/page.tsx`.
3. **Deux arborescences Supabase** (`lib/supabase` vs `utils/supabase`) : risque d’imports incohérents.
4. **Webhooks Stripe** : logique **très volumineuse** dans `lib/stripe-webhook.ts` (offres, EDL, emails, PDF) — difficile à maintenir pour un MVP réduit ; idempotence **en mémoire** sur les events (redémarrage = reprocessing possible — commentaire risque prod).
5. **Couplage fort** pages ↔ tables legacy : tout changement de schéma impacte un grand nombre de fichiers.
6. **SEO / marque** : incohérences résiduelles (nom package `salleculte`, `lib/seo` « lieux », `siteConfig` partiellement migré).
7. **Sécurité** : tout accès sensible doit rester sur **service role** côté serveur uniquement (déjà documenté dans `lib/supabase/admin.ts`) ; recheck RLS sur nouvelles tables `gs_*` en prod.
8. **Complexité fonctionnelle** : visites, EDL, litiges, split payment — **surdimensionnés** pour un premier MVP matériel.
9. **Scripts npm** : références à des scripts potentiellement absents ou obsolètes (`seo:crawl` selon historique git) — à vérifier avant CI.
10. **Tests automatisés** : peu ou pas de suite visible sur le cœur app (hors `getsoundon-starter/tests`).

---

## 6. Proposition MVP GetSoundOn (simple, à partir de cette base)

### Indispensable

- Auth + profil minimal (un seul modèle de profil cible à terme).
- **Catalogue** : recherche / liste / fiche **matériel** (piste actuelle : **`/items`** + API `gs_*`).
- **Demande de réservation** : création booking **`pending`**, message optionnel (**`gs_messages`** ou équivalent).
- **Paiement** : un flux Stripe **clair** (aujourd’hui : `checkout-booking` + webhook `gs_booking`) OU décision explicite de reporter le paiement en v2.
- **Dashboard prestataire** : voir demandes / bookings, accepter ou refuser (**`PATCH /api/bookings/[id]/status`** existe).
- **Dashboard client** : voir ses réservations / messages.
- **Admin minimal** : valider listings, lister users ou signalements basiques (peut être réduit aux annonces `gs_listings.is_active` / modération).

### Secondaire

- Abonnement packs (`pricing` / `checkout` subscription).
- Favoris sur listings.
- Notifications Telegram / emails enrichis.
- Stripe Connect (versement prestataire).
- Blog / centre d’aide (contenu à réécrire).

### À sortir du scope MVP initial (à réintégrer plus tard si besoin)

- Visites de lieux, calendriers d’exclusion dédiés.
- Contrats PDF par annonce, upload modèle propriétaire.
- États des lieux, litiges, remboursements avancés, crons J-7 / J+3 / caution **tels quels** pour le flux **offers** legacy.
- Parcours **`/salles/[slug]`** et **`/rechercher`** complets si la stratégie est 100 % **`/items`**.

### Parcours utilisateur minimum viable

1. S’inscrire / se connecter.
2. Parcourir **`/items`**, ouvrir une fiche, choisir dates, **créer réservation**.
3. (Option) **Payer** via Stripe.
4. Échanger via **messagerie** liée au booking.
5. Prestataire **accepte ou refuse** dans son espace.

### Parcours admin minimum viable

1. Lister les listings en attente / actifs.
2. Désactiver ou valider une annonce.
3. Voir les réservations récentes et statuts de paiement (selon tables choisies).

---

## 7. Plan de transformation

### A. À garder immédiatement

- **`lib/supabase/*`** (server, admin, middleware), **`proxy.ts`**.
- Auth pages et **`lib/auth-utils.ts`** (en adaptant les types si besoin).
- **API + pages `gs_*`** : `app/api/listings`, `bookings`, `messages`, `stripe/checkout-booking`, `app/items/*`, `customer/messages`.
- **`config/supabase-getsoundon-schema.sql`** comme référence schéma MVP.
- **Composants UI génériques** : `components/ui/*`, layout `site-header` / `site-footer` (textes à ajuster).
- **`lib/email.ts`**, **`lib/stripe.ts`**, webhook router **`app/api/stripe/webhook`**.

### B. À modifier en priorité

- **`lib/seo.ts`**, **`config/site.ts`**, métadonnées **`app/layout.tsx`** (SearchAction, descriptions).
- **`package.json`** : nom du projet, scripts obsolètes.
- **Alignement profil** : `profiles` vs `gs_users_profile` (triggers, signup, RLS).
- **Dashboard** : routes `proprietaire` / `dashboard` pour pointer vers **bookings `gs_*`** ou nouveau naming.
- **Suppression ou isolation** du **`page.tsx` racine** `todos`.
- Décision **unique** : soit migration progressive (**compat layer**, déjà documentée dans `docs/getsoundon/`), soit gel du legacy sur une branche.

### C. À enlever / geler pour ne pas complexifier le MVP

- Parcours **`salles` + rechercher + visites + EDL + litiges + contrats** pour la **v1 matériel**.
- Crons et endpoints liés uniquement au cycle **`offers`** si non utilisés.

### Les 10 modifications prioritaires (ordre logique)

1. Figurer **schéma cible unique** en prod (`gs_*` seul ou coexistence documentée) et l’appliquer sur Supabase.
2. Corriger **SEO + métadonnées + package name** pour cohérence GetSoundOn.
3. Brancher **onboarding / publication** sur **`gs_listings`** (ou abandonner `create-salle` pour le MVP).
4. Unifier **profil utilisateur** (un seul endroit pour rôle + Stripe ids).
5. Simplifier **navigation** (header / footers / liens `/rechercher` vs `/items`).
6. **Dashboard prestataire** : liste bookings `gs_*` + actions statut.
7. **Dashboard client** : liste bookings + lien paiement + messagerie.
8. **Admin** : modération `gs_listings` minimal.
9. Durcir **webhook** (idempotence persistante pour la partie critique).
10. Nettoyer **fichiers morts** (`page.tsx` racine, doublons `utils/supabase` si inutiles).

### Fichiers / dossiers les plus touchés

- `app/proprietaire/*`, `app/dashboard/*`, `app/admin/*`
- `app/actions/create-salle.ts`, `proprietaire-salle.ts`, `create-demande*.ts`, `offers.ts`, `messagerie.ts`
- `components/salles/*`, `components/rechercher/*`, `components/proprietaire/salle-wizard.tsx`
- `lib/stripe-webhook.ts`, `lib/seo.ts`, `config/site.ts`
- `app/api/listings/*`, `app/api/bookings/*`, `app/items/*`

---

## 8. Résumé exécutif

- **Bonne base pour getsoundon.com ?** **Oui**, avec réserves : le socle **Next + Supabase + Stripe + messagerie + dashboards** est mature ; le **gros du métier et du schéma** est encore **calibré « location de salle »**, alors qu’une **piste MVP matériel (`gs_*` + `/items`)** est déjà amorcée dans le code.
- **Estimation de réutilisation** : **~45–60 %** du code « infrastructure » (auth, UI, paiement, admin shell, emails) ; **~25–40 %** du code « métier » sans adaptation (tout ce qui parle de `salles`, visites, EDL, offres legacy).
- **Stratégie recommandée** : **refactor progressif** — consolider **`gs_*` + routes API associées** comme spine produit, faire cohabiter le legacy le temps de la bascule (comme esquissé dans `docs/getsoundon/compat-layer-migration.md`), plutôt qu’un big-bang destructif immédiat.
- **Next step concret** : **(1)** Appliquer / vérifier le schéma **`config/supabase-getsoundon-schema.sql`** sur l’instance Supabase utilisée par l’app, **(2)** enchaîner avec une **cartographie 1 fichier = table cible** pour les pages encore sur `salles`/`demandes`, **(3)** trancher officiellement **Paiement MVP** (`checkout-booking` seul vs Connect).

---

*Fin du document `GETSOUNDON_AUDIT.md`.*
