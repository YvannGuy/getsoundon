# GetSoundOn Target Architecture

## App Routing Target (progressive migration)

```text
app/
  (marketing)/
    page.tsx
    how-it-works/page.tsx
    testimonials/page.tsx
  (catalog)/
    items/page.tsx
    items/[slug]/page.tsx
    items/[slug]/availability/page.tsx
  (customer)/
    customer/page.tsx
    customer/bookings/page.tsx
    customer/messages/page.tsx
    customer/invoices/page.tsx
  (provider)/
    provider/page.tsx
    provider/listings/page.tsx
    provider/bookings/page.tsx
    provider/earnings/page.tsx
    provider/messages/page.tsx
  admin/
    listings/page.tsx
    bookings/page.tsx
    disputes/page.tsx
```

## Domain Modules

```text
src/modules/
  users/
  listings/
  bookings/
  messaging/
  payments/
  reviews/
  disputes/
  shared/
```

## Migration Rules

- Keep legacy routes functional while introducing new route aliases.
- Add domain adapters before renaming database tables.
- Use incremental read switches (feature flags) instead of big-bang rewrites.

## Naming Conventions

- provider: listing owner/renter
- customer: booking buyer/requester
- listing: rentable equipment/service offer
- booking: confirmed reservation (post-acceptance)
- booking_request: pre-booking inquiry
