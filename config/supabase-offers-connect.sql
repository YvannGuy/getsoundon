-- =====================================================
-- Offres & Stripe Connect Express
-- Exécuter dans l'éditeur SQL Supabase
-- =====================================================

-- 1. Ajouter stripe_account_id aux profiles (pour Connect Express)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS stripe_account_id text;

COMMENT ON COLUMN profiles.stripe_account_id IS 'Stripe Connect Express account ID (acct_xxx). Null = pas onboardé.';

-- 2. Créer la table offers
CREATE TABLE IF NOT EXISTS offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  demande_id uuid NOT NULL REFERENCES demandes(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seeker_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  salle_id uuid NOT NULL REFERENCES salles(id) ON DELETE CASCADE,
  amount_cents int NOT NULL CHECK (amount_cents > 0),
  expires_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'refused', 'expired')),
  message text,
  stripe_payment_intent_id text,
  stripe_session_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Une seule offre pending par conversation
CREATE UNIQUE INDEX IF NOT EXISTS offers_one_pending_per_conversation
  ON offers (conversation_id)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS offers_conversation_id ON offers(conversation_id);
CREATE INDEX IF NOT EXISTS offers_owner_id ON offers(owner_id);
CREATE INDEX IF NOT EXISTS offers_seeker_id ON offers(seeker_id);
CREATE INDEX IF NOT EXISTS offers_status ON offers(status);
CREATE INDEX IF NOT EXISTS offers_expires_at ON offers(expires_at);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION set_offers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS offers_updated_at ON offers;
CREATE TRIGGER offers_updated_at
  BEFORE UPDATE ON offers
  FOR EACH ROW
  EXECUTE FUNCTION set_offers_updated_at();

-- 3. RLS
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS offers_owner_select ON offers;
DROP POLICY IF EXISTS offers_owner_insert ON offers;
DROP POLICY IF EXISTS offers_owner_update ON offers;
DROP POLICY IF EXISTS offers_seeker_select ON offers;
DROP POLICY IF EXISTS offers_seeker_update ON offers;

CREATE POLICY offers_owner_select ON offers
  FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY offers_owner_insert ON offers
  FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY offers_owner_update ON offers
  FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY offers_seeker_select ON offers
  FOR SELECT
  USING (auth.uid() = seeker_id);

CREATE POLICY offers_seeker_update ON offers
  FOR UPDATE
  USING (auth.uid() = seeker_id);

-- 4. Colonne offer_id dans payments (pour lier paiements de réservation)
-- Sans FK pour éviter conflits si payments créé avant offers ; la cohérence est assurée par l'appli
ALTER TABLE payments ADD COLUMN IF NOT EXISTS offer_id uuid;

COMMENT ON COLUMN payments.offer_id IS 'Référence vers une offre payée (product_type=reservation). Null pour Pass/abonnement.';
