# GetSoundOn Audit Freeze

## Scope

This audit freezes the reusable MVP scope from the current codebase and defines what should be refactored vs deferred.

## Current Reusable Core

- Search + map + filters:
  - `app/rechercher/page.tsx`
  - `components/rechercher/search-map.tsx`
  - `components/rechercher/rechercher-content.tsx`
- Listing detail flow:
  - `app/salles/[slug]/page.tsx`
  - `components/salles/salle-gallery.tsx`
  - `components/salles/location-availability-calendar.tsx`
- Booking pre-flow (request/offer model):
  - `app/actions/create-demande.ts`
  - `app/actions/demande-owner.ts`
  - `app/actions/offers.ts`
- Messaging:
  - `app/actions/messagerie.ts`
  - `app/dashboard/messagerie/page.tsx`
  - `app/proprietaire/messagerie/page.tsx`
- Stripe payments:
  - `app/api/stripe/checkout-offer/route.ts`
  - `app/api/stripe/webhook/route.ts`
  - `lib/stripe-webhook.ts`

## Must-Refactor Areas (MVP Naming/Domain)

- Domain naming:
  - `salles` -> listings
  - `proprietaire` -> provider
  - `locataire`/`seeker` -> customer
  - `demande`/`offer` -> booking request / booking quote
- Content taxonomy:
  - Event categories must become: `sound`, `dj`, `lighting`, `services`.
- Geographic defaults:
  - Remove hardcoded regional assumptions from search defaults.

## Deferred (Post-MVP)

- Concierge and editorial sections:
  - `app/conciergerie/*`
  - `app/blog/*`
- Advanced dispute pipeline and EDL-specific UX.
- Full realtime messaging channels (polling for MVP).

## Security Freeze Notes

- Keep service-role usage server-only and progressively reduce scope.
- Persist Stripe webhook idempotency in DB (not memory only).
- Enforce conversation participant checks on all messaging writes.

## MVP Freeze Decision

MVP implementation keeps existing robust mechanics (search, listing pages, request->offer->payment->message), while re-skinning and remapping terminology to GetSoundOn domain.
