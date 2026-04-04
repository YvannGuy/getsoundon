-- Panier / commande mono-prestataire (V1) — parent `gs_orders` + lignes `gs_order_items`.
-- Ne modifie pas gs_bookings ni le legacy salles.

create table if not exists public.gs_orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.gs_users_profile (id) on delete restrict,
  provider_id uuid references public.gs_users_profile (id) on delete restrict,
  status text not null default 'draft'
    check (status in ('draft', 'pending_payment', 'accepted', 'cancelled', 'completed')),
  start_date date,
  end_date date,
  location_total_eur numeric(12, 2) not null default 0 check (location_total_eur >= 0),
  service_fee_eur numeric(12, 2) not null default 0 check (service_fee_eur >= 0),
  checkout_total_eur numeric(12, 2) not null default 0 check (checkout_total_eur >= 0),
  platform_fee_eur numeric(12, 2),
  provider_net_eur numeric(12, 2),
  deposit_amount_eur numeric(12, 2) not null default 0 check (deposit_amount_eur >= 0),
  stripe_payment_intent_id text,
  stripe_checkout_session_id text,
  payout_due_at timestamptz,
  payout_status text,
  payout_transfer_id text,
  payout_paid_at timestamptz,
  deposit_hold_status text,
  deposit_payment_intent_id text,
  deposit_amount_cents integer,
  deposit_release_due_at timestamptz,
  check_in_status text,
  check_in_at timestamptz,
  check_in_comment text,
  check_out_status text,
  check_out_at timestamptz,
  check_out_comment text,
  incident_status text,
  incident_at timestamptz,
  incident_deadline_at timestamptz,
  incident_comment text,
  incident_amount_requested numeric(12, 2),
  deposit_claim_status text,
  deposit_captured_amount numeric(12, 2),
  deposit_decision_at timestamptz,
  deposit_decision_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint gs_orders_dates_pair check (
    (start_date is null and end_date is null)
    or (
      start_date is not null
      and end_date is not null
      and end_date >= start_date
    )
  )
);

comment on table public.gs_orders is
  'Commande / panier matériel mono-prestataire, une plage de dates. Statut draft = panier éditable.';

comment on column public.gs_orders.deposit_amount_eur is
  'V1 panier : caution commande = max des cautions des lignes (une empreinte), pas la somme.';

create unique index if not exists gs_orders_one_draft_per_customer
  on public.gs_orders (customer_id)
  where status = 'draft';

create index if not exists gs_orders_provider_idx on public.gs_orders (provider_id);
create index if not exists gs_orders_status_idx on public.gs_orders (status);

create table if not exists public.gs_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.gs_orders (id) on delete cascade,
  listing_id uuid not null references public.gs_listings (id) on delete restrict,
  title_snapshot text not null,
  price_per_day_snapshot numeric(12, 2) not null check (price_per_day_snapshot >= 0),
  deposit_amount_snapshot numeric(12, 2) not null default 0 check (deposit_amount_snapshot >= 0),
  quantity integer not null default 1 check (quantity >= 1 and quantity <= 99),
  days_count integer not null default 1 check (days_count >= 1),
  line_total_eur numeric(12, 2) not null default 0 check (line_total_eur >= 0),
  created_at timestamptz not null default now(),
  unique (order_id, listing_id)
);

create index if not exists gs_order_items_order_idx on public.gs_order_items (order_id);

create table if not exists public.gs_order_payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.gs_orders (id) on delete restrict,
  amount numeric(12, 2) not null check (amount >= 0),
  platform_fee_eur numeric(12, 2),
  provider_net_eur numeric(12, 2),
  service_fee_eur numeric(12, 2),
  checkout_total_eur numeric(12, 2),
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'failed', 'refunded', 'cancelled')),
  stripe_payment_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists gs_order_payments_order_idx on public.gs_order_payments (order_id);

create table if not exists public.gs_order_messages (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.gs_orders (id) on delete cascade,
  sender_id uuid not null references public.gs_users_profile (id) on delete restrict,
  content text not null check (char_length(content) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists gs_order_messages_order_idx on public.gs_order_messages (order_id, created_at desc);

drop trigger if exists gs_orders_set_updated_at on public.gs_orders;
create trigger gs_orders_set_updated_at
before update on public.gs_orders
for each row execute function public.gs_set_updated_at();

drop trigger if exists gs_order_payments_set_updated_at on public.gs_order_payments;
create trigger gs_order_payments_set_updated_at
before update on public.gs_order_payments
for each row execute function public.gs_set_updated_at();

drop trigger if exists gs_order_messages_set_updated_at on public.gs_order_messages;
create trigger gs_order_messages_set_updated_at
before update on public.gs_order_messages
for each row execute function public.gs_set_updated_at();

alter table public.gs_orders enable row level security;
alter table public.gs_order_items enable row level security;
alter table public.gs_order_payments enable row level security;
alter table public.gs_order_messages enable row level security;

drop policy if exists gs_orders_select_participant on public.gs_orders;
create policy gs_orders_select_participant
on public.gs_orders
for select
to authenticated
using (customer_id = auth.uid() or provider_id = auth.uid());

drop policy if exists gs_orders_insert_customer_draft on public.gs_orders;
create policy gs_orders_insert_customer_draft
on public.gs_orders
for insert
to authenticated
with check (customer_id = auth.uid() and status = 'draft');

drop policy if exists gs_orders_update_participant on public.gs_orders;
create policy gs_orders_update_participant
on public.gs_orders
for update
to authenticated
using (customer_id = auth.uid() or provider_id = auth.uid())
with check (customer_id = auth.uid() or provider_id = auth.uid());

drop policy if exists gs_order_items_select_participant on public.gs_order_items;
create policy gs_order_items_select_participant
on public.gs_order_items
for select
to authenticated
using (
  exists (
    select 1
    from public.gs_orders o
    where o.id = gs_order_items.order_id
      and (o.customer_id = auth.uid() or o.provider_id = auth.uid())
  )
);

drop policy if exists gs_order_items_write_customer_draft on public.gs_order_items;
create policy gs_order_items_write_customer_draft
on public.gs_order_items
for insert
to authenticated
with check (
  exists (
    select 1
    from public.gs_orders o
    where o.id = order_id
      and o.customer_id = auth.uid()
      and o.status = 'draft'
  )
);

drop policy if exists gs_order_items_update_customer_draft on public.gs_order_items;
create policy gs_order_items_update_customer_draft
on public.gs_order_items
for update
to authenticated
using (
  exists (
    select 1
    from public.gs_orders o
    where o.id = gs_order_items.order_id
      and o.customer_id = auth.uid()
      and o.status = 'draft'
  )
)
with check (
  exists (
    select 1
    from public.gs_orders o
    where o.id = gs_order_items.order_id
      and o.customer_id = auth.uid()
      and o.status = 'draft'
  )
);

drop policy if exists gs_order_items_delete_customer_draft on public.gs_order_items;
create policy gs_order_items_delete_customer_draft
on public.gs_order_items
for delete
to authenticated
using (
  exists (
    select 1
    from public.gs_orders o
    where o.id = gs_order_items.order_id
      and o.customer_id = auth.uid()
      and o.status = 'draft'
  )
);

drop policy if exists gs_order_payments_select_participant on public.gs_order_payments;
create policy gs_order_payments_select_participant
on public.gs_order_payments
for select
to authenticated
using (
  exists (
    select 1
    from public.gs_orders o
    where o.id = gs_order_payments.order_id
      and (o.customer_id = auth.uid() or o.provider_id = auth.uid())
  )
);

drop policy if exists gs_order_messages_select_participant on public.gs_order_messages;
create policy gs_order_messages_select_participant
on public.gs_order_messages
for select
to authenticated
using (
  exists (
    select 1
    from public.gs_orders o
    where o.id = gs_order_messages.order_id
      and (o.customer_id = auth.uid() or o.provider_id = auth.uid())
  )
);

drop policy if exists gs_order_messages_insert_participant on public.gs_order_messages;
create policy gs_order_messages_insert_participant
on public.gs_order_messages
for insert
to authenticated
with check (
  sender_id = auth.uid()
  and exists (
    select 1
    from public.gs_orders o
    where o.id = order_id
      and (o.customer_id = auth.uid() or o.provider_id = auth.uid())
  )
);

drop policy if exists gs_order_messages_update_sender_read on public.gs_order_messages;
create policy gs_order_messages_update_sender_read
on public.gs_order_messages
for update
to authenticated
using (sender_id = auth.uid())
with check (sender_id = auth.uid());
