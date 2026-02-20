-- Migration : colonnes demandes pour la page propriétaire
-- Exécuter si les colonnes n'existent pas encore
-- (supabase-demandes-alter.sql peut déjà les avoir ajoutées)

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='demandes' AND column_name='heure_debut_souhaitee') THEN
    ALTER TABLE public.demandes ADD COLUMN heure_debut_souhaitee time;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='demandes' AND column_name='heure_fin_souhaitee') THEN
    ALTER TABLE public.demandes ADD COLUMN heure_fin_souhaitee time;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='demandes' AND column_name='type_evenement') THEN
    ALTER TABLE public.demandes ADD COLUMN type_evenement text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='demandes' AND column_name='preparation_notes') THEN
    ALTER TABLE public.demandes ADD COLUMN preparation_notes text;
  END IF;
END $$;
