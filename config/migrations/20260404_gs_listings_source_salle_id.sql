-- Lien 1:1 optionnel entre annonce catalogue matériel et ligne legacy `salles` créée au même moment (onboarding).
-- Permet upsert idempotent côté app : au plus un `gs_listings` par `salle` source.
ALTER TABLE public.gs_listings
  ADD COLUMN IF NOT EXISTS source_salle_id uuid REFERENCES public.salles(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.gs_listings.source_salle_id IS
  'Si renseigné : listing matériel synchronisé depuis cette annonce `salles` (onboarding). NULL pour les listings créés uniquement via API / autre chemin.';

-- Index unique : une ligne non-null par salle source. Plusieurs `NULL` autorisés (listings sans lien salles).
CREATE UNIQUE INDEX IF NOT EXISTS gs_listings_source_salle_id_uidx
  ON public.gs_listings (source_salle_id);
