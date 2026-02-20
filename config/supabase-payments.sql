-- Table des paiements Stripe (Pass 24h, 48h, abonnement)
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  stripe_session_id text,
  amount integer not null default 0,
  currency text default 'eur',
  product_type text not null check (product_type in ('pass_24h', 'pass_48h', 'abonnement', 'autre')),
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed', 'refunded')),
  created_at timestamptz not null default now()
);

create index if not exists idx_payments_user_id on public.payments(user_id);
create index if not exists idx_payments_status on public.payments(status);

alter table public.payments enable row level security;

-- Les utilisateurs ne voient que leurs propres paiements
create policy "users_can_read_own_payments"
  on public.payments
  for select
  using (auth.uid() = user_id);
