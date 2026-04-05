-- V1 signalements (annonce / prestataire) — outil modération / support, pas de sanction auto.

create table if not exists public.gs_reports (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  reporter_user_id uuid references auth.users (id) on delete set null,
  reporter_email text,
  target_type text not null check (target_type in ('listing', 'provider')),
  target_listing_id uuid references public.gs_listings (id) on delete set null,
  target_provider_id uuid references public.profiles (id) on delete set null,
  reason_code text not null,
  message text not null,
  status text not null default 'new' check (status in ('new', 'in_review', 'resolved', 'dismissed')),
  admin_note text,
  constraint gs_reports_target_shape check (
    (
      target_type = 'listing'
      and target_listing_id is not null
      and target_provider_id is null
    )
    or (
      target_type = 'provider'
      and target_provider_id is not null
      and target_listing_id is null
    )
  )
);

create index if not exists gs_reports_status_created_idx on public.gs_reports (status, created_at desc);
create index if not exists gs_reports_target_listing_idx on public.gs_reports (target_listing_id)
  where target_listing_id is not null;
create index if not exists gs_reports_target_provider_idx on public.gs_reports (target_provider_id)
  where target_provider_id is not null;

comment on table public.gs_reports is 'Signalements utilisateurs (V1) — revue manuelle admin uniquement.';

alter table public.gs_reports enable row level security;

-- Aucune policy : lecture / écriture via service_role (API Next.js admin client) uniquement.
