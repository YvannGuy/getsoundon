-- Modération admin des annonces matériel (gs_listings)
-- À appliquer sur la base Supabase (SQL editor ou migration CLI).

alter table public.gs_listings
  add column if not exists moderation_status text not null default 'approved'
    check (moderation_status in ('pending', 'approved', 'rejected'));

alter table public.gs_listings
  add column if not exists moderation_rejection_reason text;

comment on column public.gs_listings.moderation_status is
  'pending = en attente validation admin ; approved = modération OK ; rejected = refusée.';
comment on column public.gs_listings.moderation_rejection_reason is
  'Motif affiché au prestataire si moderation_status = rejected (optionnel).';

-- Données existantes : tout était traité comme « approuvé » côté modération (pas de refus historique).
-- Les annonces is_active = false restent approved + inactive = masquées par prestataire ou avant ce workflow.

create index if not exists gs_listings_moderation_status_idx
  on public.gs_listings (moderation_status);
