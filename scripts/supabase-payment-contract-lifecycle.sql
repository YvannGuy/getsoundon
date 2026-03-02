-- Paiement/Contrat lifecycle hardening (ponctuel/mensuel)
-- Run in Supabase SQL editor.

alter table public.offers
  add column if not exists cancellation_policy text not null default 'strict',
  add column if not exists contract_accepted_at timestamptz,
  add column if not exists contract_acceptance_version text,
  add column if not exists contract_terms_snapshot text,
  add column if not exists event_end_at timestamptz,
  add column if not exists incident_deadline_at timestamptz,
  add column if not exists owner_payout_due_at timestamptz,
  add column if not exists owner_payout_status text not null default 'pending',
  add column if not exists deposit_release_due_at timestamptz,
  add column if not exists incident_status text not null default 'none',
  add column if not exists incident_reported_at timestamptz,
  add column if not exists no_show_reported_by text not null default 'none',
  add column if not exists no_show_reported_at timestamptz,
  add column if not exists cancellation_outcome_status text not null default 'none';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'offers_cancellation_policy_check'
  ) then
    alter table public.offers
      add constraint offers_cancellation_policy_check
      check (cancellation_policy in ('strict', 'moderate', 'flexible'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'offers_owner_payout_status_check'
  ) then
    alter table public.offers
      add constraint offers_owner_payout_status_check
      check (owner_payout_status in ('pending', 'scheduled', 'paid', 'blocked', 'skipped'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'offers_incident_status_check'
  ) then
    alter table public.offers
      add constraint offers_incident_status_check
      check (incident_status in ('none', 'reported', 'under_review', 'resolved'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'offers_no_show_reported_by_check'
  ) then
    alter table public.offers
      add constraint offers_no_show_reported_by_check
      check (no_show_reported_by in ('none', 'owner', 'seeker'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'offers_cancellation_outcome_status_check'
  ) then
    alter table public.offers
      add constraint offers_cancellation_outcome_status_check
      check (cancellation_outcome_status in ('none', 'pending', 'applied'));
  end if;
end $$;

create index if not exists idx_offers_owner_payout_due
  on public.offers (owner_payout_due_at)
  where status = 'paid';

create index if not exists idx_offers_deposit_release_due
  on public.offers (deposit_release_due_at)
  where status = 'paid';

create index if not exists idx_offers_incident_deadline
  on public.offers (incident_deadline_at)
  where status = 'paid';
