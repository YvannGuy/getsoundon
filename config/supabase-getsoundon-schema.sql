-- GetSoundOn progressive schema (compat_layer safe)
-- This script adds new tables prefixed with gs_ without dropping legacy tables.

create extension if not exists pgcrypto;

create or replace function public.gs_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.gs_users_profile (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'customer' check (role in ('customer', 'provider', 'admin')),
  name text,
  email text,
  avatar text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.gs_listings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.gs_users_profile(id) on delete cascade,
  title text not null,
  description text not null,
  category text not null check (category in ('sound', 'dj', 'lighting', 'services')),
  price_per_day numeric(12,2) not null check (price_per_day >= 0),
  location text not null,
  lat double precision,
  lng double precision,
  is_active boolean not null default true,
  rating_avg numeric(3,2) not null default 0 check (rating_avg >= 0 and rating_avg <= 5),
  rating_count integer not null default 0 check (rating_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.gs_listing_images (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.gs_listings(id) on delete cascade,
  url text not null,
  position integer not null default 0,
  is_cover boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.gs_bookings (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.gs_listings(id) on delete restrict,
  customer_id uuid not null references public.gs_users_profile(id) on delete restrict,
  provider_id uuid not null references public.gs_users_profile(id) on delete restrict,
  start_date date not null,
  end_date date not null,
  total_price numeric(12,2) not null check (total_price >= 0),
  deposit_amount numeric(12,2) not null default 0 check (deposit_amount >= 0),
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'refused', 'cancelled', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date >= start_date)
);

create table if not exists public.gs_messages (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.gs_bookings(id) on delete cascade,
  sender_id uuid not null references public.gs_users_profile(id) on delete restrict,
  content text not null check (char_length(content) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  read_at timestamptz
);

create table if not exists public.gs_payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.gs_bookings(id) on delete restrict,
  amount numeric(12,2) not null check (amount >= 0),
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'failed', 'refunded', 'cancelled')),
  stripe_payment_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.gs_reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.gs_bookings(id) on delete cascade,
  reviewer_id uuid not null references public.gs_users_profile(id) on delete restrict,
  reviewee_id uuid not null references public.gs_users_profile(id) on delete restrict,
  rating integer not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  unique (booking_id, reviewer_id)
);

create index if not exists gs_listings_owner_idx on public.gs_listings(owner_id);
create index if not exists gs_listings_category_idx on public.gs_listings(category);
create index if not exists gs_listings_price_idx on public.gs_listings(price_per_day);
create index if not exists gs_listings_location_idx on public.gs_listings(location);
create index if not exists gs_listings_geo_idx on public.gs_listings(lat, lng);
create index if not exists gs_listing_images_listing_idx on public.gs_listing_images(listing_id, position);
create index if not exists gs_bookings_listing_idx on public.gs_bookings(listing_id);
create index if not exists gs_bookings_customer_idx on public.gs_bookings(customer_id);
create index if not exists gs_bookings_provider_idx on public.gs_bookings(provider_id);
create index if not exists gs_bookings_status_idx on public.gs_bookings(status);
create index if not exists gs_messages_booking_idx on public.gs_messages(booking_id, created_at desc);
create index if not exists gs_messages_unread_recipient_idx on public.gs_messages(booking_id) where read_at is null;
create index if not exists gs_payments_booking_idx on public.gs_payments(booking_id);
create index if not exists gs_reviews_reviewee_idx on public.gs_reviews(reviewee_id);

drop trigger if exists gs_users_profile_set_updated_at on public.gs_users_profile;
create trigger gs_users_profile_set_updated_at
before update on public.gs_users_profile
for each row execute function public.gs_set_updated_at();

drop trigger if exists gs_listings_set_updated_at on public.gs_listings;
create trigger gs_listings_set_updated_at
before update on public.gs_listings
for each row execute function public.gs_set_updated_at();

drop trigger if exists gs_bookings_set_updated_at on public.gs_bookings;
create trigger gs_bookings_set_updated_at
before update on public.gs_bookings
for each row execute function public.gs_set_updated_at();

drop trigger if exists gs_messages_set_updated_at on public.gs_messages;
create trigger gs_messages_set_updated_at
before update on public.gs_messages
for each row execute function public.gs_set_updated_at();

drop trigger if exists gs_payments_set_updated_at on public.gs_payments;
create trigger gs_payments_set_updated_at
before update on public.gs_payments
for each row execute function public.gs_set_updated_at();

alter table public.gs_users_profile enable row level security;
alter table public.gs_listings enable row level security;
alter table public.gs_listing_images enable row level security;
alter table public.gs_bookings enable row level security;
alter table public.gs_messages enable row level security;
alter table public.gs_payments enable row level security;
alter table public.gs_reviews enable row level security;

drop policy if exists gs_users_profile_select_own on public.gs_users_profile;
create policy gs_users_profile_select_own
on public.gs_users_profile
for select
to authenticated
using (id = auth.uid());

drop policy if exists gs_users_profile_select_public_provider on public.gs_users_profile;
create policy gs_users_profile_select_public_provider
on public.gs_users_profile
for select
to public
using (role = 'provider');

drop policy if exists gs_users_profile_insert_own on public.gs_users_profile;
create policy gs_users_profile_insert_own
on public.gs_users_profile
for insert
to authenticated
with check (id = auth.uid());

drop policy if exists gs_users_profile_update_own on public.gs_users_profile;
create policy gs_users_profile_update_own
on public.gs_users_profile
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists gs_listings_select_public_active on public.gs_listings;
create policy gs_listings_select_public_active
on public.gs_listings
for select
to public
using (is_active = true);

drop policy if exists gs_listings_insert_provider_own on public.gs_listings;
create policy gs_listings_insert_provider_own
on public.gs_listings
for insert
to authenticated
with check (
  owner_id = auth.uid()
  and exists (
    select 1
    from public.gs_users_profile p
    where p.id = auth.uid()
      and p.role in ('provider', 'admin')
  )
);

drop policy if exists gs_listings_update_provider_own on public.gs_listings;
create policy gs_listings_update_provider_own
on public.gs_listings
for update
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists gs_listings_delete_provider_own on public.gs_listings;
create policy gs_listings_delete_provider_own
on public.gs_listings
for delete
to authenticated
using (owner_id = auth.uid());

drop policy if exists gs_listing_images_select_public_active on public.gs_listing_images;
create policy gs_listing_images_select_public_active
on public.gs_listing_images
for select
to public
using (
  exists (
    select 1
    from public.gs_listings l
    where l.id = gs_listing_images.listing_id
      and l.is_active = true
  )
);

drop policy if exists gs_listing_images_write_owner on public.gs_listing_images;
create policy gs_listing_images_write_owner
on public.gs_listing_images
for all
to authenticated
using (
  exists (
    select 1
    from public.gs_listings l
    where l.id = gs_listing_images.listing_id
      and l.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.gs_listings l
    where l.id = gs_listing_images.listing_id
      and l.owner_id = auth.uid()
  )
);

drop policy if exists gs_bookings_select_participant on public.gs_bookings;
create policy gs_bookings_select_participant
on public.gs_bookings
for select
to authenticated
using (customer_id = auth.uid() or provider_id = auth.uid());

drop policy if exists gs_bookings_insert_customer on public.gs_bookings;
create policy gs_bookings_insert_customer
on public.gs_bookings
for insert
to authenticated
with check (
  customer_id = auth.uid()
  and exists (
    select 1
    from public.gs_listings l
    where l.id = listing_id
      and l.owner_id = provider_id
      and l.is_active = true
  )
);

drop policy if exists gs_bookings_update_participant on public.gs_bookings;
create policy gs_bookings_update_participant
on public.gs_bookings
for update
to authenticated
using (customer_id = auth.uid() or provider_id = auth.uid())
with check (customer_id = auth.uid() or provider_id = auth.uid());

drop policy if exists gs_messages_select_booking_participant on public.gs_messages;
create policy gs_messages_select_booking_participant
on public.gs_messages
for select
to authenticated
using (
  exists (
    select 1
    from public.gs_bookings b
    where b.id = gs_messages.booking_id
      and (b.customer_id = auth.uid() or b.provider_id = auth.uid())
  )
);

drop policy if exists gs_messages_insert_booking_participant on public.gs_messages;
create policy gs_messages_insert_booking_participant
on public.gs_messages
for insert
to authenticated
with check (
  sender_id = auth.uid()
  and exists (
    select 1
    from public.gs_bookings b
    where b.id = booking_id
      and (b.customer_id = auth.uid() or b.provider_id = auth.uid())
  )
);

drop policy if exists gs_messages_update_sender_only on public.gs_messages;
create policy gs_messages_update_sender_only
on public.gs_messages
for update
to authenticated
using (sender_id = auth.uid())
with check (sender_id = auth.uid());

drop policy if exists gs_payments_select_booking_participant on public.gs_payments;
create policy gs_payments_select_booking_participant
on public.gs_payments
for select
to authenticated
using (
  exists (
    select 1
    from public.gs_bookings b
    where b.id = gs_payments.booking_id
      and (b.customer_id = auth.uid() or b.provider_id = auth.uid())
  )
);

drop policy if exists gs_reviews_select_public on public.gs_reviews;
create policy gs_reviews_select_public
on public.gs_reviews
for select
to public
using (true);

drop policy if exists gs_reviews_insert_customer_completed_booking on public.gs_reviews;
create policy gs_reviews_insert_customer_completed_booking
on public.gs_reviews
for insert
to authenticated
with check (
  reviewer_id = auth.uid()
  and exists (
    select 1
    from public.gs_bookings b
    where b.id = booking_id
      and b.customer_id = auth.uid()
      and b.provider_id = reviewee_id
      and b.status = 'completed'
  )
);
