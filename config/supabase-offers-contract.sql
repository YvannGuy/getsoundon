-- =====================================================
-- Offres : chemin du contrat PDF
-- Exécuter après supabase-offers-connect.sql
-- =====================================================

ALTER TABLE offers ADD COLUMN IF NOT EXISTS contract_path text;

COMMENT ON COLUMN offers.contract_path IS 'Chemin du contrat PDF dans le bucket storage (contrats).';
