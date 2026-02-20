-- =============================================================================
-- Tables pour la recherche : réservations + colonnes salles (date, type, géo)
-- Exécuter APRÈS supabase-tables-complete.sql
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. RÉSERVATIONS : créneaux bloqués (quand une demande est acceptée)
-- Permet de filtrer les salles par date disponible
-- -----------------------------------------------------------------------------
create table if not exists public.reservations (
  id uuid primary key default gen_random_uuid(),
  salle_id uuid not null references public.salles(id) on delete cascade,
  demande_id uuid references public.demandes(id) on delete set null,
  date_debut date not null,
  date_fin date not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_reservations_salle on public.reservations(salle_id);
create index if not exists idx_reservations_dates on public.reservations(date_debut, date_fin);

alter table public.reservations enable row level security;

-- Public : lecture pour la recherche (vérifier disponibilité)
create policy "public_select_reservations"
  on public.reservations for select
  using (true);

-- Propriétaires : insert/update/delete sur leurs salles (via service_role ou trigger)
-- On utilise une policy pour les owners des salles
create policy "owners_manage_reservations_on_their_salles"
  on public.reservations for all
  using (
    exists (select 1 from public.salles s where s.id = salle_id and s.owner_id = auth.uid())
  )
  with check (
    exists (select 1 from public.salles s where s.id = salle_id and s.owner_id = auth.uid())
  );

-- -----------------------------------------------------------------------------
-- 2. SALLES : colonnes additionnelles pour la recherche
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='salles' AND column_name='postal_code') THEN
    ALTER TABLE public.salles ADD COLUMN postal_code text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='salles' AND column_name='department') THEN
    ALTER TABLE public.salles ADD COLUMN department text;
  END IF;
END $$;

create index if not exists idx_salles_postal_code on public.salles(postal_code) where postal_code is not null;
create index if not exists idx_salles_department on public.salles(department) where department is not null;

-- -----------------------------------------------------------------------------
-- 3. TRIGGER : créer une réservation quand une demande est acceptée
-- -----------------------------------------------------------------------------
create or replace function public.create_reservation_on_demande_accepted()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'accepted' and (old.status is null or old.status != 'accepted') then
    insert into public.reservations (salle_id, demande_id, date_debut, date_fin)
    values (
      new.salle_id,
      new.id,
      new.date_debut,
      coalesce(new.date_fin, new.date_debut)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trig_reservation_on_demande_accepted on public.demandes;
create trigger trig_reservation_on_demande_accepted
  after update on public.demandes
  for each row execute function public.create_reservation_on_demande_accepted();

-- -----------------------------------------------------------------------------
-- 4. BACKFILL : réservations pour les demandes déjà acceptées
-- -----------------------------------------------------------------------------
insert into public.reservations (salle_id, demande_id, date_debut, date_fin)
select d.salle_id, d.id, d.date_debut, coalesce(d.date_fin, d.date_debut)
from public.demandes d
where d.status = 'accepted'
  and not exists (select 1 from public.reservations r where r.demande_id = d.id);
