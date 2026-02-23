-- =====================================================
-- Table payments (paiements Pass, abonnements, réservations)
-- Exécuter dans l'éditeur SQL Supabase
-- =====================================================

-- 1. Créer la table payments si elle n'existe pas
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount int NOT NULL,
  currency text DEFAULT 'eur',
  product_type text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  stripe_session_id text,
  subscription_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Ajouter les colonnes manquantes (si la table existait déjà)
ALTER TABLE payments ADD COLUMN IF NOT EXISTS offer_id uuid;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS currency text DEFAULT 'eur';

-- 2b. FK offer_id -> offers (si offers existe ; sinon exécuter supabase-offers-connect.sql après)
-- ALTER TABLE payments ADD CONSTRAINT payments_offer_id_fkey
--   FOREIGN KEY (offer_id) REFERENCES offers(id) ON DELETE SET NULL;

-- 3. Contrainte product_type
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_product_type_check;
ALTER TABLE payments ADD CONSTRAINT payments_product_type_check
  CHECK (product_type IN ('reservation', 'pass_24h', 'pass_48h', 'abonnement'));

-- 4. Index
CREATE INDEX IF NOT EXISTS payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS payments_created_at ON payments(created_at DESC);
CREATE INDEX IF NOT EXISTS payments_product_type ON payments(product_type);
CREATE INDEX IF NOT EXISTS payments_offer_id ON payments(offer_id) WHERE offer_id IS NOT NULL;

COMMENT ON TABLE payments IS 'Paiements Stripe : Pass, abonnements, réservations (offres payées)';
COMMENT ON COLUMN payments.offer_id IS 'Référence vers une offre payée (product_type=reservation). Null pour Pass/abonnement.';

-- 5. RLS : chaque utilisateur voit ses propres paiements
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS payments_user_select ON payments;
CREATE POLICY payments_user_select ON payments
  FOR SELECT
  USING (auth.uid() = user_id);

-- Pas de INSERT/UPDATE via client (webhook utilise service_role)
