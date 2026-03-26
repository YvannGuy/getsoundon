-- Snapshot figé sur l'offre (matériel, accessoires, montants, caution, logistique).
alter table public.offers
  add column if not exists listing_snapshot jsonb;

comment on column public.offers.listing_snapshot is
  'JSON figé à la création de l''offre (v1) : listing, période, montants, logistique — pour contrat / litiges / EDL.';
