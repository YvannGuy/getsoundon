-- =====================================================
-- Fix : ajouter 'reservation' à la contrainte product_type
-- Exécuter dans l'éditeur SQL Supabase
-- =====================================================

-- Supprimer l'ancienne contrainte (si elle existe)
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_product_type_check;

-- Recréer avec toutes les valeurs supportées
ALTER TABLE payments ADD CONSTRAINT payments_product_type_check
  CHECK (product_type IN ('reservation', 'pass_24h', 'pass_48h', 'abonnement'));
