# GetSoundOn MVP QA Checklist

## Functional

- Auth:
  - customer signup/login/logout works
  - provider signup/login/logout works
- Home:
  - search form works with location + category + date
- Marketplace:
  - list and map views render same result set
  - filters (price/category/availability/rating) work together
- Listing detail:
  - images load
  - availability calendar renders
  - provider profile is visible
- Booking:
  - customer creates booking request
  - provider accepts/refuses booking
  - customer can cancel pending/accepted booking based on rules
- Messaging (polling):
  - both participants can exchange messages
  - unauthorized user cannot read/write messages
- Payments:
  - Stripe checkout starts correctly
  - webhook updates booking/payment status
  - invoice link is available after successful payment

## Security

- No service-role key usage on client paths.
- All write APIs require authenticated users.
- Listing write APIs enforce provider ownership.
- Messaging APIs enforce booking participant checks.
- Webhook signature is verified and idempotency is persisted.

## Data Integrity

- FK constraints prevent orphan rows.
- Booking dates validation blocks invalid ranges.
- Payment and booking status transitions are consistent.
- Reviews only possible after completed booking.

## Performance

- Search query p95 under acceptable threshold in staging.
- Polling interval degrades when tab is hidden.
- Map + list pagination prevents large payloads.

## Release Gates

- `npm run build` passes.
- SQL script applied successfully on staging.
- Smoke tests pass for customer and provider flows.
- Manual rollback procedure documented before production deploy.
