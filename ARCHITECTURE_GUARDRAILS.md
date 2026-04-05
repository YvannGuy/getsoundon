# Garde-fous d’architecture — GetSoundOn

Où placer le code et comment ajouter une feature sans régression sécurité.

## Arborescence utile

| Besoin | Emplacement typique |
|--------|---------------------|
| Page publique | `app/<segment>/page.tsx` |
| Dashboard client | `app/dashboard/…` (+ `layout.tsx` session) |
| Dashboard prestataire | `app/proprietaire/…` |
| Admin | `app/admin/…` (+ garde `requireAdmin`) |
| API REST / webhooks | `app/api/<domaine>/route.ts` |
| Server Actions | `app/actions/*.ts` (`"use server"`) |
| Auth session serveur | `lib/supabase/server.ts` (`getUserOrNull`, `createClient`) |
| Accès bypass RLS contrôlé | `lib/supabase/admin.ts` (`createAdminClient`) **uniquement serveur** |
| Règles métier / fees | `lib/gs-*`, `lib/stripe-*` |
| Schémas Zod réutilisables | `lib/validation/index.ts` ou à côté de l’action si très local |

## Nouvelle page dashboard / admin

1. Vérifier le **layout** parent (redirect si non auth, rôle attendu).
2. Données : préférer **client session** (`createClient`) + RLS ; `createAdminClient` seulement si RLS bloque légitimement et le contrôle d’accès est fait avant (ownership / admin).

## Nouvelle Server Action

1. `"use server"` en tête de fichier ou de fonction exportée.
2. **`requireUser`** ou **`requireAdmin`** / **`requireRole`** selon le cas.
3. Parser les entrées avec **Zod** (`parseFormData` / JSON).
4. Ne jamais prendre un `userId` ou `ownerId` du body sans vérifier qu’il correspond à l’utilisateur authentifié (sauf action admin explicite).

## Nouvelle route `app/api/.../route.ts`

1. Méthode HTTP explicite.
2. Auth + autorisation si ce n’est pas un webhook signé.
3. **Rate limit** : `lib/security/rate-limit.ts` (Upstash) ou pattern existant `lib/rate-limit.ts` pour cas simples.
4. Body / query validés Zod.
5. Réponses sans fuite de stack en prod.

## Nouvelle table Supabase

1. Migration SQL dans `supabase/sql/` (convention existante).
2. **RLS activé** ; policies SELECT/INSERT/UPDATE/DELETE par rôle.
3. Documenter dans la PR : qui lit / qui écrit.
4. Pas d’exposition directe au client sans passer par policies testées.

## Nouveau bucket Storage

1. Bucket **privé** par défaut.
2. Nom référencé dans `lib/storage/index.ts` (`STORAGE_BUCKETS`).
3. Upload : vérifier taille, type MIME, chemin (pas de `..`, pas de chemin arbitraire client).
4. Lecture : **`createSignedUrl`** durée courte (ex. 1h, 24h max si besoin métier).

## Nouveau flux Stripe / Connect

1. Montants et line items calculés **serveur** (DB + `computeGsBookingPaymentSplit` ou équivalent).
2. Checkout Session créée côté serveur uniquement.
3. Webhook : `constructStripeWebhookEvent` + traitement idempotent.
4. Connect : ne jamais exposer de compte connecté d’un autre utilisateur.

## Feature admin

1. **`requireAdminOrThrow`** (ou `requireAdmin` depuis `lib/auth/guards.ts`) en entrée d’action / route sensible.
2. Données utilisateurs : minimiser les champs ; pas d’export massif sans audit.
3. Modération / signalements : tracer l’acteur (`auditLog`).

## Ce qu’il ne faut pas faire

- Dupliquer la logique « suis-je admin ? » avec une règle différente de `lib/admin-access.ts`.
- Ajouter `NEXT_PUBLIC_STRIPE_SECRET_KEY` ou équivalent.
- Faire confiance aux metadata Stripe seules sans recouper avec la DB.
- S’appuyer uniquement sur le middleware pour bloquer une API.
