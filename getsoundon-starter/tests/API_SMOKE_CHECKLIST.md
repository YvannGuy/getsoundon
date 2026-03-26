# API_SMOKE_CHECKLIST

Checklist de tests manuels rapides pour le starter getsoundon.

## Pre-requis

- Variables env configurees (`STRIPE_*`, `SUPABASE_*`, `CRON_SECRET`).
- Une offre `rental_offers` en `pending`.
- Un user seeker connecte.

## 1) Checkout gear rental

Endpoint:

`POST /api/stripe/checkout-gear-rental`

Payload exemple:

```json
{
  "offerId": "UUID_OFFRE",
  "acceptedContract": true,
  "acceptedTerms": true,
  "acceptanceVersion": "v1",
  "acceptedAt": "2026-03-04T12:00:00.000Z"
}
```

Attendu:

- 200 + `{ sessionId, url }`
- `rental_offers.stripe_session_id` renseigne

## 2) Webhook Stripe

Endpoint:

`POST /api/stripe/webhook`

Attendu apres `checkout.session.completed`:

- `rental_offers.status = paid`
- insertion `rental_payments`
- message ajoute dans `rental_messages`

## 3) Process balance (J-7)

Endpoint:

`POST /api/stripe/process-balance`

Header:

`Authorization: Bearer <STRIPE_BALANCE_CRON_SECRET>`

Attendu:

- offres split eligibles passees en `fully_paid` ou `balance_failed`

## 4) Cron proxy J-7

Endpoint:

`POST /api/cron/balance-j-minus-7`

Header:

`Authorization: Bearer <CRON_SECRET>`

Attendu:

- payload proxy de `process-balance`

## 5) Payout J+3

Endpoint:

`POST /api/cron/payout-j-plus-3`

Header:

`Authorization: Bearer <CRON_SECRET>`

Attendu:

- transfer Stripe cree
- `owner_payout_status = paid` ou `blocked`

## 6) Deposit release J+7

Endpoint:

`POST /api/cron/deposit-release-j-plus-7`

Header:

`Authorization: Bearer <CRON_SECRET>`

Attendu:

- caution releasee si pas de litige ouvert

## 7) Cancel order

Endpoint:

`POST /api/offers/cancel`

Payload:

```json
{
  "offerId": "UUID_OFFRE",
  "reason": "Annulation test"
}
```

Attendu:

- 200 + montants refund/ownerKeeps
- case cree dans `rental_incident_cases`
