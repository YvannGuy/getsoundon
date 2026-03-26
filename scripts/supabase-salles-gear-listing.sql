-- =============================================================================
-- GetSoundOn — `public.salles` + champs matériel (listing_kind, gear_*)
--
-- À exécuter tel quel dans Supabase → SQL Editor (un seul script).
--
-- • Base vide / pas de table `salles` : crée la table, RLS de base, index.
-- • Base legacy sans colonnes matériel : CREATE ignoré, les ALTER ajoutent les colonnes.
-- • Prod déjà à jour : opérations en IF NOT EXISTS / idempotentes.
--
-- Ne pas utiliser sur une prod déjà migrée avec un schéma différent sans revue.
-- =============================================================================

create extension if not exists "pgcrypto";

create table if not exists public.salles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  slug text not null,
  name text not null,
  city text not null,
  address text not null default '',
  postal_code text,
  department text,
  contact_phone text,
  display_contact_phone boolean not null default false,
  caution_requise boolean not null default false,
  lat double precision,
  lng double precision,
  capacity integer not null default 0,
  price_per_day integer not null default 0,
  price_per_month integer,
  price_per_hour integer,
  description text,
  images text[] not null default array[]::text[],
  video_url text,
  features jsonb not null default '[]'::jsonb,
  conditions jsonb not null default '[]'::jsonb,
  pricing_inclusions text[] not null default array[]::text[],
  heure_debut text,
  heure_fin text,
  horaires_par_jour jsonb not null default '{}'::jsonb,
  jours_ouverture text[] not null default array[]::text[],
  jours_visite text[],
  visite_dates text[],
  visite_heure_debut text,
  visite_heure_fin text,
  visite_horaires_par_date jsonb,
  evenements_acceptes text[] not null default array[]::text[],
  places_parking integer,
  status text not null default 'pending',
  has_contract_template boolean not null default false,
  listing_kind text default 'equipment',
  gear_category text,
  gear_brand text,
  gear_model text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint salles_slug_unique unique (slug)
);

create index if not exists idx_salles_owner_id on public.salles (owner_id);
create index if not exists idx_salles_status on public.salles (status);
create index if not exists idx_salles_city on public.salles (city);
create index if not exists idx_salles_department on public.salles (department);

comment on table public.salles is
  'Annonces (matériel / lieu) — nom de table conservé pour le moteur transactionnel legacy.';

-- RLS de base (catalogue public + lignes du propriétaire)
alter table public.salles enable row level security;

drop policy if exists "salles_select_public_approved" on public.salles;
create policy "salles_select_public_approved"
  on public.salles for select to anon, authenticated
  using (status = 'approved');

drop policy if exists "salles_select_own" on public.salles;
create policy "salles_select_own"
  on public.salles for select to authenticated
  using (owner_id = auth.uid());

drop policy if exists "salles_insert_own" on public.salles;
create policy "salles_insert_own"
  on public.salles for insert to authenticated
  with check (owner_id = auth.uid());

drop policy if exists "salles_update_own" on public.salles;
create policy "salles_update_own"
  on public.salles for update to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists "salles_delete_own" on public.salles;
create policy "salles_delete_own"
  on public.salles for delete to authenticated
  using (owner_id = auth.uid());

-- Anciennes bases : ajout des colonnes matériel si la table existait déjà sans elles
alter table public.salles
  add column if not exists listing_kind text default 'equipment';

comment on column public.salles.listing_kind is
  'equipment | pack | service | venue — v1 matériel utilise equipment ou pack; venue = annonces lieu historiques';

alter table public.salles
  add column if not exists gear_category text;

comment on column public.salles.gear_category is
  'Catégorie matériel (ex: son, lumiere, dj, pack, structure)';

alter table public.salles
  add column if not exists gear_brand text;

alter table public.salles
  add column if not exists gear_model text;

create index if not exists idx_salles_listing_kind on public.salles (listing_kind);
create index if not exists idx_salles_gear_category on public.salles (gear_category);

-- Optionnel : contrainte sur listing_kind (décommenter si besoin)
-- alter table public.salles drop constraint if exists salles_listing_kind_check;
-- alter table public.salles add constraint salles_listing_kind_check
--   check (listing_kind is null or listing_kind in ('equipment', 'pack', 'service', 'venue'));
