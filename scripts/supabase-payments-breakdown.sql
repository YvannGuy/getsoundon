alter table public.payments
  add column if not exists breakdown jsonb;
