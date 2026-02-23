-- Tables pour le flow "Organiser une visite" (créneaux + demandes de visite)
-- Exécuter dans Supabase SQL Editor

-- Colonne jours_visite : jours de la semaine où les visites sont possibles (ex: ['lundi','mercredi','samedi'])
ALTER TABLE salles ADD COLUMN IF NOT EXISTS jours_visite text[];

COMMENT ON COLUMN salles.jours_visite IS 'Jours de la semaine où les visites sont proposées. Si vide, on utilise jours_ouverture.';

-- Calendrier de visites : dates précises + horaires (prioritaire sur jours_visite)
ALTER TABLE salles ADD COLUMN IF NOT EXISTS visite_dates date[];
ALTER TABLE salles ADD COLUMN IF NOT EXISTS visite_heure_debut time;
ALTER TABLE salles ADD COLUMN IF NOT EXISTS visite_heure_fin time;
ALTER TABLE salles ADD COLUMN IF NOT EXISTS visite_horaires_par_date jsonb;
COMMENT ON COLUMN salles.visite_dates IS 'Dates précises où les visites sont possibles. Si rempli, prioritaire sur jours_visite.';
COMMENT ON COLUMN salles.visite_heure_debut IS 'Heure de début des créneaux de visite (legacy, si visite_dates utilisé sans horaires par date).';
COMMENT ON COLUMN salles.visite_heure_fin IS 'Heure de fin des créneaux de visite (legacy).';
COMMENT ON COLUMN salles.visite_horaires_par_date IS 'Horaires par date pour les visites : { "YYYY-MM-DD": { "debut": "HH:mm", "fin": "HH:mm" }, ... }';

-- Exclusions : dates bloquées par le propriétaire (pas de visites ce jour-là)
CREATE TABLE IF NOT EXISTS salle_visite_exclusions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salle_id uuid NOT NULL REFERENCES salles(id) ON DELETE CASCADE,
  date_exclusion date NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(salle_id, date_exclusion)
);

CREATE INDEX IF NOT EXISTS idx_salle_visite_exclusions_salle_date ON salle_visite_exclusions(salle_id, date_exclusion);

-- Demandes de visite (remplace partiellement le flow "Vérifier la disponibilité")
CREATE TABLE IF NOT EXISTS demandes_visite (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salle_id uuid NOT NULL REFERENCES salles(id) ON DELETE CASCADE,
  seeker_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date_visite date NOT NULL,
  heure_debut time NOT NULL,
  heure_fin time NOT NULL,
  message text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'refused', 'reschedule_proposed')),
  -- Proposition de reprogrammation par le propriétaire (quand status = reschedule_proposed)
  date_proposee date,
  heure_debut_proposee time,
  heure_fin_proposee time,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_demandes_visite_salle ON demandes_visite(salle_id);
CREATE INDEX IF NOT EXISTS idx_demandes_visite_seeker ON demandes_visite(seeker_id);
CREATE INDEX IF NOT EXISTS idx_demandes_visite_status ON demandes_visite(status);

-- RLS
ALTER TABLE salle_visite_exclusions ENABLE ROW LEVEL SECURITY;
ALTER TABLE demandes_visite ENABLE ROW LEVEL SECURITY;

-- Exclusions : lecture publique (pour afficher créneaux), écriture owner uniquement
DROP POLICY IF EXISTS "salle_visite_exclusions_select" ON salle_visite_exclusions;
DROP POLICY IF EXISTS "salle_visite_exclusions_insert" ON salle_visite_exclusions;
DROP POLICY IF EXISTS "salle_visite_exclusions_delete" ON salle_visite_exclusions;
CREATE POLICY "salle_visite_exclusions_select" ON salle_visite_exclusions FOR SELECT USING (true);
CREATE POLICY "salle_visite_exclusions_insert" ON salle_visite_exclusions FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM salles WHERE salles.id = salle_id AND salles.owner_id = auth.uid()));
CREATE POLICY "salle_visite_exclusions_delete" ON salle_visite_exclusions FOR DELETE
  USING (EXISTS (SELECT 1 FROM salles WHERE salles.id = salle_id AND salles.owner_id = auth.uid()));

-- Demandes visite : seeker voit les siennes, owner voit celles de ses salles
DROP POLICY IF EXISTS "demandes_visite_select_seeker" ON demandes_visite;
DROP POLICY IF EXISTS "demandes_visite_select_owner" ON demandes_visite;
DROP POLICY IF EXISTS "demandes_visite_insert_seeker" ON demandes_visite;
DROP POLICY IF EXISTS "demandes_visite_update_owner" ON demandes_visite;
CREATE POLICY "demandes_visite_select_seeker" ON demandes_visite FOR SELECT
  USING (seeker_id = auth.uid());
CREATE POLICY "demandes_visite_select_owner" ON demandes_visite FOR SELECT
  USING (EXISTS (SELECT 1 FROM salles WHERE salles.id = salle_id AND salles.owner_id = auth.uid()));
CREATE POLICY "demandes_visite_insert_seeker" ON demandes_visite FOR INSERT
  WITH CHECK (seeker_id = auth.uid());
CREATE POLICY "demandes_visite_update_owner" ON demandes_visite FOR UPDATE
  USING (EXISTS (SELECT 1 FROM salles WHERE salles.id = salle_id AND salles.owner_id = auth.uid()));

COMMENT ON TABLE demandes_visite IS 'Demandes de visite sur créneaux (organiser une visite)';
COMMENT ON TABLE salle_visite_exclusions IS 'Dates exclues des créneaux de visite';
