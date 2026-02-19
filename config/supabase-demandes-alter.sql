-- Colonnes additionnelles pour le formulaire "Vérifier la disponibilité"
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='demandes' AND column_name='frequence') THEN
    ALTER TABLE public.demandes ADD COLUMN frequence text check (frequence in ('ponctuel', 'hebdomadaire', 'mensuel'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='demandes' AND column_name='heure_debut_souhaitee') THEN
    ALTER TABLE public.demandes ADD COLUMN heure_debut_souhaitee time;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='demandes' AND column_name='heure_fin_souhaitee') THEN
    ALTER TABLE public.demandes ADD COLUMN heure_fin_souhaitee time;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='demandes' AND column_name='jours_semaine') THEN
    ALTER TABLE public.demandes ADD COLUMN jours_semaine text[] default '{}';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='demandes' AND column_name='jour_mois') THEN
    ALTER TABLE public.demandes ADD COLUMN jour_mois int check (jour_mois is null or (jour_mois >= 1 and jour_mois <= 31));
  END IF;
END $$;
