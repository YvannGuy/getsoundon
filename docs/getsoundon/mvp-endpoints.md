# GetSoundOn MVP Endpoints and Server Actions

## Listings

- `GET /api/listings`
  - Query: `q`, `location`, `category`, `minPrice`, `maxPrice`, `startDate`, `endDate`, `lat`, `lng`.
  - Returns paginated cards for list + map.
- `GET /api/listings/:id`
  - Returns listing detail + images + provider profile + rating summary.
- `POST /api/listings` (provider only)
  - Creates listing draft.
- `PATCH /api/listings/:id` (provider owner only)
  - Updates listing content and pricing.
- `DELETE /api/listings/:id` (provider owner only)
  - Soft delete (`is_active = false`).

## Bookings

- `POST /api/bookings`
  - Creates booking request (`pending`).
- `PATCH /api/bookings/:id/status`
  - Provider can set `accepted` or `refused`.
  - Customer can set `cancelled`.
- `GET /api/bookings/me`
  - Role-aware list (`customer` or `provider`) with filters.

## Messaging (Polling MVP)

- `GET /api/messages?bookingId=...&cursor=...`
  - Poll every 5-10s on active conversation.
- `POST /api/messages`
  - Body: `bookingId`, `content`.
  - Guard: sender must be booking participant.

## Payments

- **MVP marketplace (`gs_*`)** : `POST /api/stripe/checkout-booking` avec `{ bookingId }` — session Checkout en `mode: payment`, montant lu depuis `gs_bookings.total_price`. Webhook : `checkout.session.completed` avec `metadata.product_type = gs_booking` met `gs_bookings.status` à `accepted` et insère `gs_payments` (`lib/stripe-webhook-gs-booking.ts`).
- **Legacy salles** : `app/api/stripe/checkout-offer/route.ts` + `lib/stripe-webhook.ts` (`product_type = reservation`).

## Existing Files to Reuse First

- Listing actions:
  - `app/actions/create-salle.ts`
  - `app/actions/proprietaire-salle.ts`
- Booking actions:
  - `app/actions/create-demande.ts`
  - `app/actions/demande-owner.ts`
  - `app/actions/offers.ts`
- Messaging actions:
  - `app/actions/messagerie.ts`
- Payment:
  - `lib/stripe-webhook.ts`

## Security Requirements

- Require authenticated session on all write endpoints.
- Enforce provider ownership checks on listing writes.
- Enforce booking participant checks on message reads/writes.
- Persist webhook idempotency in DB before production cutover.
