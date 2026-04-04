-- Table d'idempotence pour les webhooks Stripe
create table if not exists public.stripe_webhook_events (
  id text primary key,
  type text,
  received_at timestamptz default now()
);

create index if not exists idx_stripe_webhook_events_received_at on public.stripe_webhook_events (received_at);
