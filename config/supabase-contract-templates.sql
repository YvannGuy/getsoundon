-- =====================================================
-- Modèle de contrat par salle (proprio remplit les infos)
-- Exécuter dans l'éditeur SQL Supabase
-- =====================================================

CREATE TABLE IF NOT EXISTS contract_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salle_id uuid NOT NULL REFERENCES salles(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  raison_sociale text,
  adresse text,
  code_postal text,
  ville text,
  siret text,
  conditions_particulieres text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(salle_id)
);

CREATE INDEX IF NOT EXISTS contract_templates_owner_id ON contract_templates(owner_id);
CREATE INDEX IF NOT EXISTS contract_templates_salle_id ON contract_templates(salle_id);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION set_contract_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS contract_templates_updated_at ON contract_templates;
CREATE TRIGGER contract_templates_updated_at
  BEFORE UPDATE ON contract_templates
  FOR EACH ROW
  EXECUTE FUNCTION set_contract_templates_updated_at();

-- RLS
ALTER TABLE contract_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS contract_templates_owner_all ON contract_templates;
CREATE POLICY contract_templates_owner_all ON contract_templates
  FOR ALL
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

COMMENT ON TABLE contract_templates IS 'Modèle de contrat de location par salle - rempli par le propriétaire.';
