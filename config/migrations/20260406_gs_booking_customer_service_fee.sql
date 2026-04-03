-- Frais de service client (3 % de la location) + total Checkout.
-- gs_bookings.total_price = montant location (base prestataire), inchangé.

alter table public.gs_bookings
  add column if not exists service_fee_eur numeric(12,2),
  add column if not exists checkout_total_eur numeric(12,2);

alter table public.gs_payments
  add column if not exists service_fee_eur numeric(12,2),
  add column if not exists checkout_total_eur numeric(12,2);

comment on column public.gs_bookings.total_price is 'Montant de la location (base prestataire), EUR — hors frais de service client.';
comment on column public.gs_bookings.service_fee_eur is 'Frais de service client (3 % de la location), EUR — payés en sus par le locataire.';
comment on column public.gs_bookings.checkout_total_eur is 'Total débité sur le PaymentIntent principal : location + frais de service, EUR.';
comment on column public.gs_payments.amount is 'Total encaissé sur le PI principal (location + frais de service), EUR.';
comment on column public.gs_payments.service_fee_eur is 'Frais de service client au moment du paiement, EUR.';
comment on column public.gs_payments.checkout_total_eur is 'Égal au total encaissé (redondance explicite avec amount), EUR.';

-- Anciennes réservations payées : pas de frais de service, total encaissé = location.
update public.gs_bookings
set
  service_fee_eur = 0,
  checkout_total_eur = total_price
where stripe_payment_intent_id is not null
  and checkout_total_eur is null;

update public.gs_payments p
set
  service_fee_eur = 0,
  checkout_total_eur = p.amount
where service_fee_eur is null;
