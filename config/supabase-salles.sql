-- Table salles : annonces des propriétaires
create table if not exists public.salles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  slug text unique not null,
  name text not null,
  city text not null,
  address text not null,
  capacity int not null,
  price_per_day int not null,
  description text default '',
  images text[] not null default '{}',
  features jsonb not null default '[]',
  conditions jsonb not null default '[]',
  pricing_inclusions text[] not null default '{}',
  lat numeric,
  lng numeric,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_salles_slug on public.salles(slug);
create index if not exists idx_salles_owner on public.salles(owner_id);
create index if not exists idx_salles_status on public.salles(status);
create index if not exists idx_salles_city on public.salles(city);

alter table public.salles enable row level security;

-- Propriétaires : lecture/écriture de leurs propres salles
create policy "owners_select_own_salles"
  on public.salles for select
  using (auth.uid() = owner_id);

create policy "owners_insert_own_salles"
  on public.salles for insert
  with check (auth.uid() = owner_id);

create policy "owners_update_own_salles"
  on public.salles for update
  using (auth.uid() = owner_id);

create policy "owners_delete_own_salles"
  on public.salles for delete
  using (auth.uid() = owner_id);

-- Public : lecture des salles approuvées uniquement
create policy "public_select_approved_salles"
  on public.salles for select
  using (status = 'approved');
