-- Ajout caution (empreinte bancaire) + frais de service fixes sur les offres
-- Exécuter dans Supabase SQL Editor

ALTER TABLE offers
  ADD COLUMN IF NOT EXISTS deposit_amount_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS service_fee_cents integer NOT NULL DEFAULT 1500,
  ADD COLUMN IF NOT EXISTS deposit_payment_intent_id text,
  ADD COLUMN IF NOT EXISTS deposit_hold_status text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS deposit_claim_amount_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deposit_claim_reason text,
  ADD COLUMN IF NOT EXISTS deposit_claim_requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS deposit_released_at timestamptz,
  ADD COLUMN IF NOT EXISTS deposit_captured_at timestamptz,
  ADD COLUMN IF NOT EXISTS deposit_refunded_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deposit_status text NOT NULL DEFAULT 'none'
    CHECK (deposit_status IN ('none', 'held', 'partially_refunded', 'refunded'));

COMMENT ON COLUMN offers.deposit_amount_cents IS 'Montant caution en centimes';
COMMENT ON COLUMN offers.service_fee_cents IS 'Frais de service fixes en centimes (15€)';
COMMENT ON COLUMN offers.deposit_payment_intent_id IS 'PaymentIntent Stripe de l''empreinte de caution';
COMMENT ON COLUMN offers.deposit_hold_status IS 'Etat empreinte: none, authorized, claim_requested, released, captured, failed, expired';
COMMENT ON COLUMN offers.deposit_claim_amount_cents IS 'Montant demandé en retenue (en centimes)';
COMMENT ON COLUMN offers.deposit_claim_reason IS 'Motif de retenue saisi par le propriétaire';
COMMENT ON COLUMN offers.deposit_claim_requested_at IS 'Date de demande de retenue';
COMMENT ON COLUMN offers.deposit_released_at IS 'Date de libération de l''empreinte';
COMMENT ON COLUMN offers.deposit_captured_at IS 'Date de capture de la caution';
COMMENT ON COLUMN offers.deposit_refunded_cents IS 'Montant total de caution remboursé';
COMMENT ON COLUMN offers.deposit_status IS 'Etat de la caution: none, held, partially_refunded, refunded';
