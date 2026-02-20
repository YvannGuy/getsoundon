-- Table payments : historique des paiements (Stripe checkout, etc.)
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  stripe_payment_intent_id text,
  stripe_session_id text,
  amount integer not null,
  currency text not null default 'eur',
  product_type text not null check (product_type in ('pass_24h', 'pass_48h', 'abonnement', 'autre')),
  status text not null default 'pending' check (status in ('paid', 'pending', 'failed', 'refunded')),
  reference text,
  created_at timestamptz not null default now()
);

create index if not exists idx_payments_user on public.payments(user_id);
create index if not exists idx_payments_status on public.payments(status);
create index if not exists idx_payments_created on public.payments(created_at);

alter table public.payments enable row level security;

create policy "users_select_own_payments"
  on public.payments for select
  using (auth.uid() = user_id);
