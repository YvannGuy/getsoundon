# GetSoundOn Compat Layer Migration

## Objective

Migrate from legacy domain tables (`salles`, `demandes`, `offers`, `messages`, `payments`) to `gs_*` tables without downtime.

**Référence croisée :** le dossier `getsoundon-starter/` propose un autre schéma (`gear_listings`, `rental_offers`, …) pour coller au pipeline salledeculte. Le mapping **legacy ↔ rental_*** et **équivalence avec `gs_*`** est détaillé dans `getsoundon-starter/MIGRATION_MAPPING.md`.

## Phases

### Phase A - Additive schema

- Apply `config/supabase-getsoundon-schema.sql`.
- Keep all existing app routes and server actions untouched.

### Phase B - Bridge layer

- Introduce adapter functions in `src/modules/*/adapters`:
  - legacy read -> domain DTO
  - domain DTO -> dual write payload
- Add optional compatibility views for reporting/query migration.

### Phase C - Dual write

- Listings:
  - write to `salles` and `gs_listings`.
- Bookings:
  - write to legacy request/offer pipeline and `gs_bookings`.
- Messages:
  - continue legacy writes, mirror to `gs_messages`.
- Payments:
  - Stripe webhook remains source of truth, mirrors to `gs_payments`.

### Phase D - Read switch

- Introduce env feature flags:
  - `FEATURE_GS_LISTINGS_READ`
  - `FEATURE_GS_BOOKINGS_READ`
  - `FEATURE_GS_MESSAGES_READ`
  - `FEATURE_GS_PAYMENTS_READ`
- Flip reads domain by domain after parity checks.

### Phase E - Cleanup

- Remove dual writes only after:
  - 2 full billing cycles
  - no data parity drift
  - dashboards validated on new tables

## Data Backfill Plan

- `salles.images` -> `gs_listing_images`
- `offers` with paid lifecycle -> `gs_bookings` and `gs_payments`
- legacy message streams -> `gs_messages`
- ratings -> `gs_reviews`

## Safety Gates

- Add webhook idempotency table (persistent) before full cutover.
- Add strict conversation participant checks before messaging dual write.
- Audit all `service_role` paths and keep them server-only.
