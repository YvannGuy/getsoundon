-- Table des factures finales liées aux réservations matériel
create table if not exists public.gs_invoices (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.gs_bookings (id) on delete cascade,
  provider_id uuid not null references public.profiles (id),
  customer_id uuid references public.profiles (id),
  invoice_number text not null unique,
  invoice_url text not null,
  invoice_generated_at timestamptz not null default timezone('utc', now()),
  invoice_status text not null default 'issued',
  invoice_total_eur numeric,
  currency text not null default 'EUR',
  metadata jsonb default '{}'::jsonb
);

create index if not exists idx_gs_invoices_provider on public.gs_invoices(provider_id);
create index if not exists idx_gs_invoices_booking on public.gs_invoices(booking_id);
