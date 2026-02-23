-- =====================================================
-- Facture : chemin du PDF dans storage
-- Exécuter après supabase-payments.sql
-- =====================================================

ALTER TABLE payments ADD COLUMN IF NOT EXISTS invoice_path text;

COMMENT ON COLUMN payments.invoice_path IS 'Chemin de la facture PDF dans le bucket storage (contrats).';
