# getsoundon-starter

Starter technique pour lancer getsoundon en réutilisant le noyau transactionnel de `salledeculte.com`.

## Contenu

- `sql/001_getsoundon_min_schema.sql`
  - schéma minimal marketplace matériel (providers/listings/offers/orders/payments/incidents/check reports)
  - policies RLS de base (owner/renter/admin)
- `templates/app/api/stripe/checkout-gear-rental/route.ts`
  - template endpoint checkout Stripe pour une offre de location matériel
  - basé sur la logique existante de `app/api/stripe/checkout-offer/route.ts`
- `templates/lib/stripe-webhook-gear.ts`
  - handler webhook Stripe minimal pour `checkout.session.completed` et `payment_intent.payment_failed`
- `templates/app/api/stripe/webhook/route.ts`
  - route webhook Stripe branchée sur `handleStripeWebhookGear`
- `templates/app/api/stripe/process-balance/route.ts`
  - template J-7 prélèvement solde off-session
- `templates/app/api/cron/balance-j-minus-7/route.ts`
  - proxy cron vers `process-balance`
- `templates/app/api/cron/payout-j-plus-3/route.ts`
  - template versement provider J+3 (Stripe Connect transfer)
- `templates/app/api/cron/deposit-release-j-plus-7/route.ts`
  - template libération caution J+7
- `MIGRATION_MAPPING.md`
  - mapping legacy -> getsoundon + stratégie migration progressive
- `templates/lib/user-notifications-gear.ts`
  - template notifications user/admin (email/ops hook)
- `templates/lib/cancellation-policy-gear.ts`
  - politique d'annulation minimaliste pour location materiel
- `templates/app/actions/cancellations-gear.ts`
  - action server annulation + remboursement Stripe
- `templates/app/api/offers/cancel/route.ts`
  - endpoint annulation d'offre/location
- `tests/cancellation-policy-gear.spec.ts`
  - exemple test Node.js policy annulation
- `tests/API_SMOKE_CHECKLIST.md`
  - checklist smoke tests checkout/webhook/cron/cancel
- `local-dev/docker-compose.yml`
  - stack locale rapide (Postgres + Adminer)
- `local-dev/init/*.sql`
  - bootstrap schema + seed minimal
- `local-dev/README.md`
  - commandes de demarrage/reset

## Positionnement

- Ce dossier est un **starter isolé** : il ne modifie pas l'app actuelle.
- Objectif : accélérer un projet getsoundon sans repartir de zéro sur le flux transactionnel (offres, split, caution, crons).

### Important : schéma différent de l'app racine

L'application Next à la racine du repo utilise aujourd'hui le schéma **`gs_*`** défini dans `config/supabase-getsoundon-schema.sql` (listings, bookings, messages). Les fichiers SQL de **ce** starter créent **`gear_listings`**, **`rental_*`** et supposent une table **`profiles`** : ce n'est pas le même jeu de tables que `gs_*`.

- Pour faire tourner les **templates** (`checkout-gear-rental`, webhooks, crons) tels quels : appliquer `sql/001_getsoundon_min_schema.sql` (ou la stack `local-dev`) et brancher l'app sur ces tables.
- Pour garder uniquement le **MVP** actuel : rester sur `gs_*` et adapter les templates (noms de tables, clés étrangères) ou consommer les adaptateurs décrits dans `MIGRATION_MAPPING.md`.

Voir `MIGRATION_MAPPING.md` pour le tableau **legacy → rental_*** et l'équivalence **legacy / starter → gs_*** (site).

## Utilisation rapide

1. Créer un nouveau projet Next.js getsoundon.
2. Copier les modules coeur depuis ce repo:
   - `lib/stripe.ts`
   - `lib/supabase/*`
   - `lib/payment-processing-fee.ts`
3. Exécuter `sql/001_getsoundon_min_schema.sql` sur Supabase.
4. Copier le template checkout dans `app/api/stripe/checkout-gear-rental/route.ts`.
5. Copier les templates webhook + cron.
6. Adapter les imports (`siteConfig`, settings, notifications) et les URLs de retour.
7. Exécuter les tests/checklists du dossier `tests`.
8. Pour une sandbox DB locale immediate: lancer `local-dev/docker-compose.yml`.

## Variables attendues

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_SITE_URL`
