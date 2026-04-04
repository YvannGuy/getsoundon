<wizard-report>
# PostHog post-wizard report

The wizard has completed a deep integration of PostHog analytics into the GetSoundOn Next.js App Router project. PostHog is now initialized client-side via `instrumentation-client.ts` (Next.js 15.3+ pattern), a reverse proxy is configured in `next.config.mjs` to route events through `/ingest` for better ad-blocker resistance, and a server-side client (`lib/posthog-server.ts`) is used across all API routes and Server Actions. User identification is performed server-side on login and signup via `posthog.identify()`. Error tracking is enabled via the `capture_exceptions: true` option.

| Event | Description | File |
|---|---|---|
| `user_signed_up` | User successfully creates an account | `app/actions/auth.ts` |
| `user_logged_in` | User successfully authenticates | `app/actions/auth.ts` |
| `listing_viewed` | User views an equipment listing detail page | `app/items/[id]/page.tsx` |
| `item_added_to_cart` | User adds an equipment listing to their cart | `app/items/[id]/page.tsx` |
| `booking_request_submitted` | User submits a standard rental booking request | `app/items/[id]/page.tsx` |
| `instant_booking_initiated` | User initiates an instant booking and is sent to Stripe | `app/items/[id]/page.tsx` |
| `booking_checkout_session_created` | Server creates a Stripe checkout session for a booking | `app/api/stripe/checkout-booking/route.ts` |
| `order_checkout_session_created` | Server creates a Stripe checkout session for a cart order | `app/api/stripe/checkout-order/route.ts` |
| `pass_checkout_session_created` | Server creates a Stripe checkout session for a pass/subscription | `app/api/stripe/checkout-pass/route.ts` |
| `booking_accepted` | Provider accepts a pending rental request | `app/actions/gs-bookings.ts` |
| `booking_refused` | Provider refuses a pending rental request | `app/actions/gs-bookings.ts` |
| `incident_reported` | Provider reports an incident on a completed rental | `app/actions/gs-bookings.ts` |
| `booking_cancellation_requested` | Customer requests cancellation of a booking | `app/actions/gs-booking-cancellation.ts` |

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behavior, based on the events we just instrumented:

- **Dashboard — Analytics basics**: https://eu.posthog.com/project/146794/dashboard/604398
- **Rental conversion funnel: Listing → Cart → Checkout**: https://eu.posthog.com/project/146794/insights/xHpgvLq2
- **Booking request funnel: Listing → Request → Checkout**: https://eu.posthog.com/project/146794/insights/1YNz3c5t
- **New signups over time**: https://eu.posthog.com/project/146794/insights/Cyi3WT8a
- **Booking acceptance vs refusal rate**: https://eu.posthog.com/project/146794/insights/fFchsonN
- **Churn signals: cancellations and incidents**: https://eu.posthog.com/project/146794/insights/0cE2Xcrh

### Agent skill

We've left an agent skill folder in your project. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

</wizard-report>
