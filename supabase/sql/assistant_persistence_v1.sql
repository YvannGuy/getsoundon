-- Assistant métier : persistance serveur (phase 1)
-- Accès prévu : service_role (Next server / FastAPI) uniquement.

create table if not exists public.assistant_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.assistant_state_snapshots (
  session_id uuid primary key references public.assistant_sessions (id) on delete cascade,
  engine_state jsonb not null,
  recommended jsonb null,
  ranked_providers jsonb null,
  ready_for_results boolean not null default false,
  meta jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.assistant_messages (
  id text primary key,
  session_id uuid not null references public.assistant_sessions (id) on delete cascade,
  role text not null,
  kind text not null,
  content text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null
);

create index if not exists idx_assistant_sessions_user_id on public.assistant_sessions (user_id);
create index if not exists idx_assistant_sessions_updated_at on public.assistant_sessions (updated_at desc);
create index if not exists idx_assistant_messages_session_id on public.assistant_messages (session_id, created_at);

alter table public.assistant_sessions enable row level security;
alter table public.assistant_state_snapshots enable row level security;
alter table public.assistant_messages enable row level security;

-- Phase 1 : aucune policy JWT — lecture/écriture via service_role uniquement.

comment on table public.assistant_sessions is 'Session assistant événementiel ; user_id optionnel si anonyme.';
comment on table public.assistant_state_snapshots is 'Snapshot moteur V2 + reco/matching dérivés.';
comment on table public.assistant_messages is 'Copie des messages pour audit / futur replay ; synchronisée depuis engine_state.';
