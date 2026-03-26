-- getsoundon minimal schema
-- Base sur les patterns observes dans salledeculte.com (offers/payments/disputes/check reports/messaging).
--
-- Prerequis Supabase : schema auth (auth.users). Si tu as deja une table public.profiles (autre projet),
-- ce bloc est ignore (IF NOT EXISTS) : verifie que les colonnes ci-dessous existent pour les policies RLS.

create extension if not exists pgcrypto;

-- Table profil attendue par tout le starter (FK vers les utilisateurs).
-- Sur une base vide sans legacy salledeculte, cette definition suffit.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  user_type text not null default 'seeker'
    check (user_type in ('seeker', 'owner', 'admin')),
  full_name text,
  email text,
  stripe_account_id text,
  stripe_customer_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_profiles_user_type on public.profiles(user_type);

-- Providers (extension profil)
create table if not exists public.providers (
  id uuid primary key references public.profiles(id) on delete cascade,
  stripe_account_id text,
  business_name text,
  is_verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Listings de materiel
create table if not exists public.gear_listings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  slug text unique not null,
  name text not null,
  city text,
  address text,
  lat double precision,
  lng double precision,
  description text,
  images jsonb not null default '[]'::jsonb,
  status text not null default 'pending' check (status in ('pending','approved','rejected','archived')),
  base_price_cents integer not null default 0,
  deposit_amount_cents integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_gear_listings_owner_id on public.gear_listings(owner_id);
create index if not exists idx_gear_listings_status on public.gear_listings(status);

-- Demandes locataire
create table if not exists public.rental_requests (
  id uuid primary key default gen_random_uuid(),
  seeker_id uuid not null references public.profiles(id) on delete cascade,
  listing_id uuid not null references public.gear_listings(id) on delete cascade,
  message text,
  start_at timestamptz,
  end_at timestamptz,
  status text not null default 'sent' check (status in ('sent','viewed','replied','accepted','rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_rental_requests_seeker_id on public.rental_requests(seeker_id);
create index if not exists idx_rental_requests_listing_id on public.rental_requests(listing_id);

-- Conversations
create table if not exists public.rental_conversations (
  id uuid primary key default gen_random_uuid(),
  request_id uuid references public.rental_requests(id) on delete set null,
  seeker_id uuid not null references public.profiles(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  listing_id uuid not null references public.gear_listings(id) on delete cascade,
  last_message_at timestamptz,
  last_message_preview text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists uq_rental_conversations_triplet
  on public.rental_conversations(seeker_id, owner_id, listing_id);

-- Messages
create table if not exists public.rental_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.rental_conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  sent_at timestamptz not null default now(),
  read_at timestamptz,
  edited_at timestamptz,
  deleted_at timestamptz
);

create index if not exists idx_rental_messages_conversation_id on public.rental_messages(conversation_id);

-- Offres transactionnelles
create table if not exists public.rental_offers (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.rental_conversations(id) on delete cascade,
  request_id uuid references public.rental_requests(id) on delete set null,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  seeker_id uuid not null references public.profiles(id) on delete cascade,
  listing_id uuid not null references public.gear_listings(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','paid','refused','expired')),
  amount_cents integer not null,
  payment_mode text not null default 'full' check (payment_mode in ('full','split')),
  upfront_amount_cents integer,
  balance_amount_cents integer,
  balance_due_at timestamptz,
  payment_plan_status text not null default 'pending_deposit'
    check (payment_plan_status in ('pending_deposit','deposit_paid','balance_scheduled','balance_paid','balance_failed','fully_paid','expired_unpaid')),
  deposit_amount_cents integer not null default 0,
  deposit_status text not null default 'none'
    check (deposit_status in ('none','held','partially_refunded','refunded')),
  deposit_hold_status text not null default 'none'
    check (deposit_hold_status in ('none','authorized','claim_requested','captured','released','failed')),
  deposit_payment_intent_id text,
  stripe_session_id text,
  stripe_payment_intent_id text,
  balance_payment_intent_id text,
  balance_retry_count integer not null default 0,
  balance_last_error text,
  owner_payout_due_at timestamptz,
  owner_payout_status text not null default 'pending'
    check (owner_payout_status in ('pending','scheduled','paid','blocked','skipped')),
  incident_status text not null default 'none'
    check (incident_status in ('none','reported','under_review','resolved')),
  expires_at timestamptz not null default (now() + interval '72 hours'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_rental_offers_conversation_id on public.rental_offers(conversation_id);
create index if not exists idx_rental_offers_status on public.rental_offers(status);

-- Orders (projection commande)
create table if not exists public.rental_orders (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null unique references public.rental_offers(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  seeker_id uuid not null references public.profiles(id) on delete cascade,
  listing_id uuid not null references public.gear_listings(id) on delete cascade,
  start_at timestamptz,
  end_at timestamptz,
  status text not null default 'confirmed'
    check (status in ('confirmed','active','completed','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Paiements
create table if not exists public.rental_payments (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.rental_offers(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  stripe_session_id text,
  amount integer not null,
  currency text not null default 'eur',
  product_type text not null default 'rental_order',
  payment_type text not null check (payment_type in ('deposit','balance','full','refund')),
  status text not null check (status in ('paid','failed','refunded','pending')),
  breakdown jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_rental_payments_offer_id on public.rental_payments(offer_id);

-- Litiges incidents
create table if not exists public.rental_incident_cases (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.rental_offers(id) on delete cascade,
  payment_id uuid references public.rental_payments(id) on delete set null,
  requested_by_role text not null check (requested_by_role in ('owner','seeker','admin')),
  side text not null check (side in ('owner','seeker')),
  case_type text not null check (case_type in ('dispute','refund','damage','no_show')),
  status text not null default 'open' check (status in ('open','under_review','resolved','rejected')),
  amount_cents integer not null default 0,
  reason text not null,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_rental_incident_cases_offer_id on public.rental_incident_cases(offer_id);

create table if not exists public.rental_incident_evidences (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.rental_incident_cases(id) on delete cascade,
  storage_path text not null,
  description text,
  uploaded_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Check in/out
create table if not exists public.rental_check_reports (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.rental_offers(id) on delete cascade,
  role text not null check (role in ('owner','seeker')),
  phase text not null check (phase in ('before','after')),
  notes text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (offer_id, role, phase)
);

create table if not exists public.rental_check_report_photos (
  id uuid primary key default gen_random_uuid(),
  check_report_id uuid not null references public.rental_check_reports(id) on delete cascade,
  offer_id uuid not null references public.rental_offers(id) on delete cascade,
  storage_path text not null,
  description text,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- ==================================
-- RLS (minimal starter)
-- ==================================

alter table public.providers enable row level security;
alter table public.gear_listings enable row level security;
alter table public.rental_requests enable row level security;
alter table public.rental_conversations enable row level security;
alter table public.rental_messages enable row level security;
alter table public.rental_offers enable row level security;
alter table public.rental_orders enable row level security;
alter table public.rental_payments enable row level security;
alter table public.rental_incident_cases enable row level security;
alter table public.rental_incident_evidences enable row level security;
alter table public.rental_check_reports enable row level security;
alter table public.rental_check_report_photos enable row level security;

-- providers
drop policy if exists "providers_select_self_or_admin" on public.providers;
create policy "providers_select_self_or_admin"
on public.providers for select to authenticated
using (id = auth.uid() or exists (
  select 1 from public.profiles p where p.id = auth.uid() and p.user_type = 'admin'
));

drop policy if exists "providers_upsert_self" on public.providers;
create policy "providers_upsert_self"
on public.providers for all to authenticated
using (id = auth.uid())
with check (id = auth.uid());

-- listings
drop policy if exists "gear_listings_public_read_approved" on public.gear_listings;
create policy "gear_listings_public_read_approved"
on public.gear_listings for select
using (status = 'approved' or owner_id = auth.uid() or exists (
  select 1 from public.profiles p where p.id = auth.uid() and p.user_type = 'admin'
));

drop policy if exists "gear_listings_owner_write" on public.gear_listings;
create policy "gear_listings_owner_write"
on public.gear_listings for all to authenticated
using (owner_id = auth.uid() or exists (
  select 1 from public.profiles p where p.id = auth.uid() and p.user_type = 'admin'
))
with check (owner_id = auth.uid() or exists (
  select 1 from public.profiles p where p.id = auth.uid() and p.user_type = 'admin'
));

-- requests
drop policy if exists "rental_requests_participants_read" on public.rental_requests;
create policy "rental_requests_participants_read"
on public.rental_requests for select to authenticated
using (
  seeker_id = auth.uid()
  or exists (select 1 from public.gear_listings gl where gl.id = listing_id and gl.owner_id = auth.uid())
  or exists (select 1 from public.profiles p where p.id = auth.uid() and p.user_type = 'admin')
);

drop policy if exists "rental_requests_seeker_insert" on public.rental_requests;
create policy "rental_requests_seeker_insert"
on public.rental_requests for insert to authenticated
with check (seeker_id = auth.uid());

drop policy if exists "rental_requests_participants_update" on public.rental_requests;
create policy "rental_requests_participants_update"
on public.rental_requests for update to authenticated
using (
  seeker_id = auth.uid()
  or exists (select 1 from public.gear_listings gl where gl.id = listing_id and gl.owner_id = auth.uid())
  or exists (select 1 from public.profiles p where p.id = auth.uid() and p.user_type = 'admin')
)
with check (
  seeker_id = auth.uid()
  or exists (select 1 from public.gear_listings gl where gl.id = listing_id and gl.owner_id = auth.uid())
  or exists (select 1 from public.profiles p where p.id = auth.uid() and p.user_type = 'admin')
);

-- conversations/messages/offers/orders/payments/incidents/check reports
drop policy if exists "rental_conversations_participants" on public.rental_conversations;
create policy "rental_conversations_participants"
on public.rental_conversations for all to authenticated
using (
  seeker_id = auth.uid() or owner_id = auth.uid() or exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.user_type = 'admin'
  )
)
with check (
  seeker_id = auth.uid() or owner_id = auth.uid() or exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.user_type = 'admin'
  )
);

drop policy if exists "rental_messages_participants" on public.rental_messages;
create policy "rental_messages_participants"
on public.rental_messages for all to authenticated
using (
  exists (
    select 1 from public.rental_conversations c
    where c.id = conversation_id
      and (c.seeker_id = auth.uid() or c.owner_id = auth.uid())
  )
  or exists (select 1 from public.profiles p where p.id = auth.uid() and p.user_type = 'admin')
)
with check (
  exists (
    select 1 from public.rental_conversations c
    where c.id = conversation_id
      and (c.seeker_id = auth.uid() or c.owner_id = auth.uid())
  )
  or exists (select 1 from public.profiles p where p.id = auth.uid() and p.user_type = 'admin')
);

drop policy if exists "rental_offers_participants" on public.rental_offers;
create policy "rental_offers_participants"
on public.rental_offers for all to authenticated
using (
  seeker_id = auth.uid() or owner_id = auth.uid() or exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.user_type = 'admin'
  )
)
with check (
  seeker_id = auth.uid() or owner_id = auth.uid() or exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.user_type = 'admin'
  )
);

drop policy if exists "rental_orders_participants" on public.rental_orders;
create policy "rental_orders_participants"
on public.rental_orders for all to authenticated
using (
  seeker_id = auth.uid() or owner_id = auth.uid() or exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.user_type = 'admin'
  )
)
with check (
  seeker_id = auth.uid() or owner_id = auth.uid() or exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.user_type = 'admin'
  )
);

drop policy if exists "rental_payments_participants" on public.rental_payments;
create policy "rental_payments_participants"
on public.rental_payments for select to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1 from public.rental_offers o where o.id = offer_id and (o.owner_id = auth.uid() or o.seeker_id = auth.uid())
  )
  or exists (select 1 from public.profiles p where p.id = auth.uid() and p.user_type = 'admin')
);

drop policy if exists "rental_incident_cases_participants" on public.rental_incident_cases;
create policy "rental_incident_cases_participants"
on public.rental_incident_cases for all to authenticated
using (
  exists (
    select 1 from public.rental_offers o where o.id = offer_id and (o.owner_id = auth.uid() or o.seeker_id = auth.uid())
  )
  or exists (select 1 from public.profiles p where p.id = auth.uid() and p.user_type = 'admin')
)
with check (
  exists (
    select 1 from public.rental_offers o where o.id = offer_id and (o.owner_id = auth.uid() or o.seeker_id = auth.uid())
  )
  or exists (select 1 from public.profiles p where p.id = auth.uid() and p.user_type = 'admin')
);

drop policy if exists "rental_incident_evidences_participants" on public.rental_incident_evidences;
create policy "rental_incident_evidences_participants"
on public.rental_incident_evidences for all to authenticated
using (
  exists (
    select 1
    from public.rental_incident_cases c
    join public.rental_offers o on o.id = c.offer_id
    where c.id = case_id and (o.owner_id = auth.uid() or o.seeker_id = auth.uid())
  )
  or exists (select 1 from public.profiles p where p.id = auth.uid() and p.user_type = 'admin')
)
with check (
  exists (
    select 1
    from public.rental_incident_cases c
    join public.rental_offers o on o.id = c.offer_id
    where c.id = case_id and (o.owner_id = auth.uid() or o.seeker_id = auth.uid())
  )
  or exists (select 1 from public.profiles p where p.id = auth.uid() and p.user_type = 'admin')
);

drop policy if exists "rental_check_reports_participants" on public.rental_check_reports;
create policy "rental_check_reports_participants"
on public.rental_check_reports for all to authenticated
using (
  exists (
    select 1 from public.rental_offers o where o.id = offer_id and (o.owner_id = auth.uid() or o.seeker_id = auth.uid())
  )
  or exists (select 1 from public.profiles p where p.id = auth.uid() and p.user_type = 'admin')
)
with check (
  exists (
    select 1 from public.rental_offers o where o.id = offer_id and (o.owner_id = auth.uid() or o.seeker_id = auth.uid())
  )
  or exists (select 1 from public.profiles p where p.id = auth.uid() and p.user_type = 'admin')
);

drop policy if exists "rental_check_report_photos_participants" on public.rental_check_report_photos;
create policy "rental_check_report_photos_participants"
on public.rental_check_report_photos for all to authenticated
using (
  exists (
    select 1 from public.rental_offers o where o.id = offer_id and (o.owner_id = auth.uid() or o.seeker_id = auth.uid())
  )
  or exists (select 1 from public.profiles p where p.id = auth.uid() and p.user_type = 'admin')
)
with check (
  exists (
    select 1 from public.rental_offers o where o.id = offer_id and (o.owner_id = auth.uid() or o.seeker_id = auth.uid())
  )
  or exists (select 1 from public.profiles p where p.id = auth.uid() and p.user_type = 'admin')
);
