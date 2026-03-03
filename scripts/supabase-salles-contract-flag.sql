alter table public.salles
  add column if not exists has_contract_template boolean not null default false;

create index if not exists idx_salles_owner_contract_template
  on public.salles (owner_id, has_contract_template);

-- Backfill best-effort:
-- si une salle a deja servi a des offres avec contrat persiste, on la marque true.
update public.salles s
set has_contract_template = true
where exists (
  select 1
  from public.offers o
  where o.salle_id = s.id
    and o.contract_path is not null
    and o.contract_path <> ''
);
