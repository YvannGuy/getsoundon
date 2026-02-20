-- Colonne pour marquer l'activation de l'essai (3 demandes offertes) - valable une seule fois
alter table public.profiles
  add column if not exists trial_activated_at timestamptz;
