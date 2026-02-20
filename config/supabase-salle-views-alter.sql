-- Ajout de viewer_id et created_at à salle_views pour compter les organisateurs distincts
-- Exécutez ce script si la table salle_views existe déjà

alter table public.salle_views add column if not exists viewer_id uuid references auth.users(id) on delete set null;
alter table public.salle_views add column if not exists created_at timestamptz default now();

create index if not exists idx_salle_views_salle_created on public.salle_views(salle_id, created_at desc);
