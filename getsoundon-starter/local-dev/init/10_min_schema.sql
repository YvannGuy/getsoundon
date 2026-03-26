-- Schema minimal local pour tests checkout/webhook/cron.

create table if not exists public.providers (
  id uuid primary key references public.profiles(id) on delete cascade,
  stripe_account_id text,
  business_name text,
  is_verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.gear_listings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  slug text unique not null,
  name text not null,
  city text,
  status text not null default 'pending' check (status in ('pending','approved','rejected','archived')),
  base_price_cents integer not null default 0,
  deposit_amount_cents integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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

create table if not exists public.rental_conversations (
  id uuid primary key default gen_random_uuid(),
  request_id uuid references public.rental_requests(id) on delete set null,
  seeker_id uuid not null references public.profiles(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  listing_id uuid not null references public.gear_listings(id) on delete cascade,
  last_message_at timestamptz,
  last_message_preview text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (seeker_id, owner_id, listing_id)
);

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
