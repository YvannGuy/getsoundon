-- Migration V2 : colonnes gs_listings, gs_bookings et salles pour instant booking, payout et caution

-- 0a. instant_booking_enabled sur la table salles (flow lieux / prestataires)
alter table public.salles
  add column if not exists instant_booking_enabled boolean not null default false;

-- 0b. Champs boutique prestataire sur profiles
alter table public.profiles
  add column if not exists boutique_slug text unique,
  add column if not exists boutique_name text,
  add column if not exists boutique_cover_url text,
  add column if not exists boutique_city text;

create index if not exists profiles_boutique_slug_idx on public.profiles (boutique_slug)
  where boutique_slug is not null;

-- 1. immediate_confirmation sur gs_listings
alter table public.gs_listings
  add column if not exists immediate_confirmation boolean not null default false;

-- 2. Payout et statut sur gs_bookings
alter table public.gs_bookings
  add column if not exists payout_due_at timestamptz,
  add column if not exists payout_status text not null default 'pending'
    check (payout_status in ('pending', 'scheduled', 'paid', 'blocked', 'skipped')),
  add column if not exists stripe_payment_intent_id text,
  add column if not exists deposit_release_due_at timestamptz;

-- 3. Caution (deposit) Stripe sur gs_bookings
alter table public.gs_bookings
  add column if not exists deposit_amount_cents integer not null default 0 check (deposit_amount_cents >= 0),
  add column if not exists deposit_payment_intent_id text,
  add column if not exists deposit_hold_status text not null default 'none'
    check (deposit_hold_status in ('none', 'authorized', 'captured', 'released', 'failed'));

-- 4. Index utiles pour les crons
create index if not exists gs_bookings_payout_due_at_idx
  on public.gs_bookings (payout_due_at)
  where payout_status in ('pending', 'scheduled', 'blocked');

create index if not exists gs_bookings_deposit_hold_idx
  on public.gs_bookings (deposit_hold_status)
  where deposit_hold_status = 'authorized';
