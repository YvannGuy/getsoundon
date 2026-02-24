-- Dates d'indisponibilité location (manuel propriétaire + sync paiements)
-- Exécuter dans Supabase SQL Editor

CREATE TABLE IF NOT EXISTS salle_location_exclusions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salle_id uuid NOT NULL REFERENCES salles(id) ON DELETE CASCADE,
  date_exclusion date NOT NULL,
  source text NOT NULL DEFAULT 'owner_manual' CHECK (source IN ('owner_manual', 'paid_offer', 'admin')),
  created_by uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (salle_id, date_exclusion)
);

CREATE INDEX IF NOT EXISTS idx_salle_location_exclusions_salle_date
  ON salle_location_exclusions(salle_id, date_exclusion);

ALTER TABLE salle_location_exclusions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "salle_location_exclusions_select" ON salle_location_exclusions;
DROP POLICY IF EXISTS "salle_location_exclusions_insert_owner" ON salle_location_exclusions;
DROP POLICY IF EXISTS "salle_location_exclusions_delete_owner" ON salle_location_exclusions;

CREATE POLICY "salle_location_exclusions_select"
ON salle_location_exclusions
FOR SELECT
USING (true);

CREATE POLICY "salle_location_exclusions_insert_owner"
ON salle_location_exclusions
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM salles s
    WHERE s.id = salle_location_exclusions.salle_id
      AND s.owner_id = auth.uid()
  )
);

CREATE POLICY "salle_location_exclusions_delete_owner"
ON salle_location_exclusions
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM salles s
    WHERE s.id = salle_location_exclusions.salle_id
      AND s.owner_id = auth.uid()
  )
);

COMMENT ON TABLE salle_location_exclusions IS 'Dates bloquées pour la location d''une salle';
