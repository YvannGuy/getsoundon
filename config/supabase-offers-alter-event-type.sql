-- =====================================================
-- Offres : type évènement + valable du X au Y
-- Exécuter après supabase-offers-connect.sql
-- =====================================================

ALTER TABLE offers
ADD COLUMN IF NOT EXISTS event_type text CHECK (event_type IN ('ponctuel', 'mensuel'));

ALTER TABLE offers
ADD COLUMN IF NOT EXISTS date_debut date;

ALTER TABLE offers
ADD COLUMN IF NOT EXISTS date_fin date;

COMMENT ON COLUMN offers.event_type IS 'Type d''évènement : ponctuel (une fois) ou mensuel.';
COMMENT ON COLUMN offers.date_debut IS 'Début de la période de réservation (valable du).';
COMMENT ON COLUMN offers.date_fin IS 'Fin de la période de réservation (valable au).';
