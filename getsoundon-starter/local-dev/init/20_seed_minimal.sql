-- Seed minimal pour tests checkout/webhook/cron.

-- IDs fixes pour faciliter les tests manuels.
-- provider: 11111111-1111-1111-1111-111111111111
-- renter:   22222222-2222-2222-2222-222222222222
-- admin:    99999999-9999-9999-9999-999999999999
-- listing:  33333333-3333-3333-3333-333333333333
-- request:  44444444-4444-4444-4444-444444444444
-- conv:     55555555-5555-5555-5555-555555555555
-- offer:    66666666-6666-6666-6666-666666666666

insert into public.profiles (id, user_type, full_name, email, stripe_account_id, stripe_customer_id, updated_at)
values
  ('11111111-1111-1111-1111-111111111111', 'owner', 'Provider Demo', 'provider@getsoundon.local', 'acct_demo_provider', null, now()),
  ('22222222-2222-2222-2222-222222222222', 'seeker', 'Renter Demo', 'renter@getsoundon.local', null, 'cus_demo_renter', now()),
  ('99999999-9999-9999-9999-999999999999', 'admin', 'Admin Demo', 'admin@getsoundon.local', null, null, now())
on conflict (id) do update set
  user_type = excluded.user_type,
  full_name = excluded.full_name,
  email = excluded.email,
  stripe_account_id = excluded.stripe_account_id,
  stripe_customer_id = excluded.stripe_customer_id,
  updated_at = now();

insert into public.providers (id, stripe_account_id, business_name, is_verified, updated_at)
values
  ('11111111-1111-1111-1111-111111111111', 'acct_demo_provider', 'Provider Demo SAS', true, now())
on conflict (id) do update set
  stripe_account_id = excluded.stripe_account_id,
  business_name = excluded.business_name,
  is_verified = excluded.is_verified,
  updated_at = now();

insert into public.gear_listings (
  id, owner_id, slug, name, city, status, base_price_cents, deposit_amount_cents, updated_at
)
values (
  '33333333-3333-3333-3333-333333333333',
  '11111111-1111-1111-1111-111111111111',
  'pack-sono-2x1000w-demo',
  'Pack sono 2x1000W demo',
  'Paris',
  'approved',
  12000,
  30000,
  now()
)
on conflict (id) do update set
  owner_id = excluded.owner_id,
  slug = excluded.slug,
  name = excluded.name,
  city = excluded.city,
  status = excluded.status,
  base_price_cents = excluded.base_price_cents,
  deposit_amount_cents = excluded.deposit_amount_cents,
  updated_at = now();

insert into public.rental_requests (
  id, seeker_id, listing_id, message, start_at, end_at, status, updated_at
)
values (
  '44444444-4444-4444-4444-444444444444',
  '22222222-2222-2222-2222-222222222222',
  '33333333-3333-3333-3333-333333333333',
  'Besoin d''un pack sono pour samedi soir.',
  now() + interval '10 days',
  now() + interval '11 days',
  'sent',
  now()
)
on conflict (id) do update set
  seeker_id = excluded.seeker_id,
  listing_id = excluded.listing_id,
  message = excluded.message,
  start_at = excluded.start_at,
  end_at = excluded.end_at,
  status = excluded.status,
  updated_at = now();

insert into public.rental_conversations (
  id, request_id, seeker_id, owner_id, listing_id, last_message_at, last_message_preview, updated_at
)
values (
  '55555555-5555-5555-5555-555555555555',
  '44444444-4444-4444-4444-444444444444',
  '22222222-2222-2222-2222-222222222222',
  '11111111-1111-1111-1111-111111111111',
  '33333333-3333-3333-3333-333333333333',
  now(),
  'Bonjour, je peux proposer une offre.',
  now()
)
on conflict (id) do update set
  request_id = excluded.request_id,
  seeker_id = excluded.seeker_id,
  owner_id = excluded.owner_id,
  listing_id = excluded.listing_id,
  last_message_at = excluded.last_message_at,
  last_message_preview = excluded.last_message_preview,
  updated_at = now();

insert into public.rental_messages (conversation_id, sender_id, content)
values
  ('55555555-5555-5555-5555-555555555555', '22222222-2222-2222-2222-222222222222', 'Bonjour, toujours disponible ?'),
  ('55555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111', 'Oui, je vous envoie une offre.')
on conflict do nothing;

insert into public.rental_offers (
  id,
  conversation_id,
  request_id,
  owner_id,
  seeker_id,
  listing_id,
  status,
  amount_cents,
  payment_mode,
  upfront_amount_cents,
  balance_amount_cents,
  balance_due_at,
  payment_plan_status,
  deposit_amount_cents,
  deposit_status,
  deposit_hold_status,
  owner_payout_due_at,
  owner_payout_status,
  incident_status,
  expires_at,
  updated_at
)
values (
  '66666666-6666-6666-6666-666666666666',
  '55555555-5555-5555-5555-555555555555',
  '44444444-4444-4444-4444-444444444444',
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  '33333333-3333-3333-3333-333333333333',
  'pending',
  12000,
  'split',
  3000,
  9000,
  now() + interval '3 days',
  'pending_deposit',
  30000,
  'none',
  'none',
  now() + interval '14 days',
  'scheduled',
  'none',
  now() + interval '72 hours',
  now()
)
on conflict (id) do update set
  conversation_id = excluded.conversation_id,
  request_id = excluded.request_id,
  owner_id = excluded.owner_id,
  seeker_id = excluded.seeker_id,
  listing_id = excluded.listing_id,
  status = excluded.status,
  amount_cents = excluded.amount_cents,
  payment_mode = excluded.payment_mode,
  upfront_amount_cents = excluded.upfront_amount_cents,
  balance_amount_cents = excluded.balance_amount_cents,
  balance_due_at = excluded.balance_due_at,
  payment_plan_status = excluded.payment_plan_status,
  deposit_amount_cents = excluded.deposit_amount_cents,
  deposit_status = excluded.deposit_status,
  deposit_hold_status = excluded.deposit_hold_status,
  owner_payout_due_at = excluded.owner_payout_due_at,
  owner_payout_status = excluded.owner_payout_status,
  incident_status = excluded.incident_status,
  expires_at = excluded.expires_at,
  updated_at = now();
