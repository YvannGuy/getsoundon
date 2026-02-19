-- Colonne horaires_par_jour pour stocker les horaires spécifiques par jour
-- Format JSONB : { "dimanche": { "debut": "09:00", "fin": "18:00" }, "jeudi": { ... } }
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='salles' AND column_name='horaires_par_jour') THEN
    ALTER TABLE public.salles ADD COLUMN horaires_par_jour jsonb default '{}';
  END IF;
END $$;
