-- Table: concierge_requests
-- Stocke les demandes de conciergerie (brief recherche)

create table if not exists public.concierge_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  email text,
  phone text,
  status text not null default 'new',
  source text not null default 'other',
  payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);

-- Index pour lister par status et date
create index if not exists idx_concierge_requests_status_created
  on public.concierge_requests (status, created_at desc);

-- Index pour les demandes d'un user
create index if not exists idx_concierge_requests_user_id
  on public.concierge_requests (user_id)
  where user_id is not null;

-- RLS
alter table public.concierge_requests enable row level security;

-- Policy INSERT : tout le monde peut insérer (authenticated et anon)
create policy "concierge_requests_insert_all"
  on public.concierge_requests for insert
  with check (true);

-- Policy SELECT : user ne voit que ses propres demandes (si user_id non null)
create policy "concierge_requests_select_own"
  on public.concierge_requests for select
  using (
    auth.uid() is not null
    and user_id = auth.uid()
  );

-- Policy UPDATE/DELETE : réservé aux admins (à ajouter si nécessaire)
-- Pour l'instant, pas de policy update/delete pour les users standards.
-- Les admins peuvent utiliser le service_role pour accéder à tout.
