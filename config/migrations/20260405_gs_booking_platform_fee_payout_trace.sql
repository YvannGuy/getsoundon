-- Commission 15 % matériel + traçabilité payout (Stripe Transfer id, date).
-- total_price = montant brut payé par le client (hors caution séparée).

alter table public.gs_bookings
  add column if not exists platform_fee_eur numeric(12,2),
  add column if not exists provider_net_eur numeric(12,2),
  add column if not exists payout_transfer_id text,
  add column if not exists payout_paid_at timestamptz;

alter table public.gs_payments
  add column if not exists platform_fee_eur numeric(12,2),
  add column if not exists provider_net_eur numeric(12,2);

comment on column public.gs_bookings.platform_fee_eur is 'Commission plateforme (15%) sur la location, EUR.';
comment on column public.gs_bookings.provider_net_eur is 'Net prestataire avant versement Connect (= brut - commission), EUR.';
comment on column public.gs_bookings.payout_transfer_id is 'Stripe Transfer id (tr_...) après versement Connect.';
comment on column public.gs_bookings.payout_paid_at is 'Horodatage du versement prestataire réussi.';
comment on column public.gs_payments.amount is 'Montant brut payé par le client pour la location (EUR).';
comment on column public.gs_payments.platform_fee_eur is 'Commission plateforme au moment du paiement, EUR.';
comment on column public.gs_payments.provider_net_eur is 'Net prestataire attendu au moment du paiement, EUR.';

-- Réservations déjà encaissées mais pas encore versées : aligner sur round(grossCents*15/100) comme en TypeScript.
with src as (
  select
    id,
    round((total_price::numeric * 100)::numeric)::bigint as gross_cents
  from public.gs_bookings
  where stripe_payment_intent_id is not null
    and payout_status in ('pending', 'scheduled', 'blocked')
    and platform_fee_eur is null
),
calc as (
  select
    id,
    gross_cents,
    round(gross_cents * 15::numeric / 100)::bigint as fee_cents
  from src
)
update public.gs_bookings b
set
  platform_fee_eur = (calc.fee_cents / 100.0)::numeric(12,2),
  provider_net_eur = ((calc.gross_cents - calc.fee_cents) / 100.0)::numeric(12,2)
from calc
where b.id = calc.id;

-- Réservations déjà « paid » avant traçabilité : le transfert était le brut (pas de commission appliquée).
update public.gs_bookings
set
  platform_fee_eur = 0,
  provider_net_eur = total_price
where payout_status = 'paid'
  and payout_transfer_id is null
  and stripe_payment_intent_id is not null
  and platform_fee_eur is null;
