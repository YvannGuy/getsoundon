-- Lot G : catalogue matériel 100 % `gs_*` — plus de lien `gs_listings.source_salle_id` → `salles`.

ALTER TABLE public.gs_listings
  DROP CONSTRAINT IF EXISTS gs_listings_source_salle_id_fkey;

DROP INDEX IF EXISTS public.gs_listings_source_salle_id_uidx;

ALTER TABLE public.gs_listings
  DROP COLUMN IF EXISTS source_salle_id;
