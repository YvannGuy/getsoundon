-- Caution catalogue matériel (euros) — utilisée lors de l’acceptation de réservation / checkout
ALTER TABLE public.gs_listings
  ADD COLUMN IF NOT EXISTS deposit_amount numeric(12,2) NOT NULL DEFAULT 0
  CHECK (deposit_amount >= 0);

COMMENT ON COLUMN public.gs_listings.deposit_amount IS
  'Montant de caution demandé pour cette annonce (€). 0 = pas de caution.';
