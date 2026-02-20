-- Colonne Stripe Customer ID pour lier le profil au compte Stripe
alter table public.profiles
  add column if not exists stripe_customer_id text;
