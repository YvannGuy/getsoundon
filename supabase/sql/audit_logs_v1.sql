-- V1 : journal d’audit métier (actions sensibles).
-- Écriture : côté serveur uniquement via service_role (createAdminClient).
-- Lecture : pas de policy JWT dans cette V1 — accès admin / outils via service_role ou SQL direct.
-- Le rôle service_role contourne RLS sur Supabase.

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  actor_user_id uuid null,
  actor_role text null,
  action text not null,
  target_type text not null,
  target_id text null,
  metadata jsonb not null default '{}'::jsonb,
  source text null
);

comment on table public.audit_logs is 'Audit métier V1 : actions critiques (caution, incidents, modération, etc.). Pas de données sensibles brutes (tokens, bodies).';
comment on column public.audit_logs.actor_user_id is 'Utilisateur ayant déclenché l’action ; NULL si job système (ex. cron).';
comment on column public.audit_logs.actor_role is 'Rôle métier indicatif : admin, provider, customer, system.';
comment on column public.audit_logs.action is 'Identifiant stable de l’action (ex. capture_deposit_admin).';
comment on column public.audit_logs.target_type is 'Type de ressource (ex. gs_booking, gs_listing).';
comment on column public.audit_logs.target_id is 'Identifiant de la ressource (souvent UUID).';
comment on column public.audit_logs.metadata is 'Contexte minimal : IDs, statuts, montants agrégés — pas de PII inutile.';
comment on column public.audit_logs.source is 'Origine : server_action, api, cron, …';

create index if not exists idx_audit_logs_created_at on public.audit_logs (created_at desc);
create index if not exists idx_audit_logs_actor_user_id on public.audit_logs (actor_user_id)
  where actor_user_id is not null;
create index if not exists idx_audit_logs_target on public.audit_logs (target_type, target_id);
create index if not exists idx_audit_logs_action on public.audit_logs (action);

alter table public.audit_logs enable row level security;

-- Aucune policy pour anon / authenticated : pas d’accès direct JWT à cette table.
-- Les lectures admin dans l’app devront passer par un client service_role ou une route serveur dédiée (hors scope V1 UI).
