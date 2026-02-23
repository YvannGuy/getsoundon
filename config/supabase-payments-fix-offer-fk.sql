-- =====================================================
-- Fix : supprimer la FK offer_id qui bloque les insertions
-- (conflit possible si payments créé avant offers, ou ordre des migrations)
-- Exécuter dans l'éditeur SQL Supabase
-- =====================================================

ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_offer_id_fkey;
