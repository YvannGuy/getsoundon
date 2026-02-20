-- =============================================================================
-- MIGRATION : Paramètres - colonnes profiles pour la page paramètres
-- Exécuter après supabase-tables-complete.sql
-- =============================================================================

DO $$
BEGIN
  -- first_name et last_name pour le formulaire profil
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='first_name') THEN
    ALTER TABLE public.profiles ADD COLUMN first_name text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='last_name') THEN
    ALTER TABLE public.profiles ADD COLUMN last_name text;
  END IF;
  -- last_password_change pour afficher "Dernière modification il y a X"
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='last_password_change') THEN
    ALTER TABLE public.profiles ADD COLUMN last_password_change timestamptz;
  END IF;
END $$;

-- Remplir first_name / last_name depuis full_name pour les profils existants
UPDATE public.profiles
SET
  first_name = COALESCE(first_name, NULLIF(TRIM(SPLIT_PART(full_name, ' ', 1)), '')),
  last_name = COALESCE(
    last_name,
    CASE
      WHEN POSITION(' ' IN full_name) > 0 THEN TRIM(SUBSTRING(full_name FROM POSITION(' ' IN full_name) + 1))
      ELSE ''
    END
  )
WHERE full_name IS NOT NULL
  AND full_name != ''
  AND (first_name IS NULL OR last_name IS NULL);
