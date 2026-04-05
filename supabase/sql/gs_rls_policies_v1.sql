-- =============================================================================
-- GetSoundOn — RLS ciblée tables métier `gs_*` (V1)
-- =============================================================================
-- À appliquer dans l’éditeur SQL Supabase ou via CLI après revue.
-- Le rôle `service_role` / clé service contourne RLS (API Next.js `createAdminClient`).
-- Les clés anon / authenticated respectent ces policies.
--
-- Prérequis colonnes : `gs_listings.moderation_status` (voir gs_listings_moderation.sql).
-- Sinon : coalesce(moderation_status, 'approved') reste compatible.
--
-- Après application : vérifier les flux panier, catalogue, réservations, messages.
-- =============================================================================

-- ─── gs_listings ───────────────────────────────────────────────────────────
alter table public.gs_listings enable row level security;

drop policy if exists "gs_listings_select_catalog" on public.gs_listings;
create policy "gs_listings_select_catalog"
  on public.gs_listings
  for select
  to anon, authenticated
  using (
    is_active = true
    and coalesce(moderation_status, 'approved') = 'approved'
  );

drop policy if exists "gs_listings_select_own" on public.gs_listings;
create policy "gs_listings_select_own"
  on public.gs_listings
  for select
  to authenticated
  using (owner_id = (select auth.uid()));

drop policy if exists "gs_listings_insert_own" on public.gs_listings;
create policy "gs_listings_insert_own"
  on public.gs_listings
  for insert
  to authenticated
  with check (owner_id = (select auth.uid()));

drop policy if exists "gs_listings_update_own" on public.gs_listings;
create policy "gs_listings_update_own"
  on public.gs_listings
  for update
  to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

-- ─── gs_listing_images ─────────────────────────────────────────────────────
alter table public.gs_listing_images enable row level security;

drop policy if exists "gs_listing_images_select_visible" on public.gs_listing_images;
create policy "gs_listing_images_select_visible"
  on public.gs_listing_images
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.gs_listings l
      where l.id = listing_id
        and (
          (
            l.is_active = true
            and coalesce(l.moderation_status, 'approved') = 'approved'
          )
          or l.owner_id = (select auth.uid())
        )
    )
  );

-- Écriture images : réservée au propriétaire de l’annonce (flux admin create-salle inchangé).
drop policy if exists "gs_listing_images_insert_owner" on public.gs_listing_images;
create policy "gs_listing_images_insert_owner"
  on public.gs_listing_images
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.gs_listings l
      where l.id = listing_id
        and l.owner_id = (select auth.uid())
    )
  );

drop policy if exists "gs_listing_images_update_owner" on public.gs_listing_images;
create policy "gs_listing_images_update_owner"
  on public.gs_listing_images
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.gs_listings l
      where l.id = listing_id
        and l.owner_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.gs_listings l
      where l.id = listing_id
        and l.owner_id = (select auth.uid())
    )
  );

drop policy if exists "gs_listing_images_delete_owner" on public.gs_listing_images;
create policy "gs_listing_images_delete_owner"
  on public.gs_listing_images
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.gs_listings l
      where l.id = listing_id
        and l.owner_id = (select auth.uid())
    )
  );

-- ─── gs_bookings ────────────────────────────────────────────────────────────
alter table public.gs_bookings enable row level security;

drop policy if exists "gs_bookings_select_participant" on public.gs_bookings;
create policy "gs_bookings_select_participant"
  on public.gs_bookings
  for select
  to authenticated
  using (
    customer_id = (select auth.uid())
    or provider_id = (select auth.uid())
  );

drop policy if exists "gs_bookings_insert_customer" on public.gs_bookings;
create policy "gs_bookings_insert_customer"
  on public.gs_bookings
  for insert
  to authenticated
  with check (customer_id = (select auth.uid()));

-- Pas de policy UPDATE/DELETE pour authenticated : mutations via service_role
-- (server actions, webhooks, API interne) pour éviter escalade de statut côté client.

-- ─── gs_orders ─────────────────────────────────────────────────────────────
alter table public.gs_orders enable row level security;

drop policy if exists "gs_orders_select_participant" on public.gs_orders;
create policy "gs_orders_select_participant"
  on public.gs_orders
  for select
  to authenticated
  using (
    customer_id = (select auth.uid())
    or provider_id = (select auth.uid())
  );

drop policy if exists "gs_orders_insert_customer_draft" on public.gs_orders;
create policy "gs_orders_insert_customer_draft"
  on public.gs_orders
  for insert
  to authenticated
  with check (
    customer_id = (select auth.uid())
    and status = 'draft'
  );

drop policy if exists "gs_orders_update_customer_draft" on public.gs_orders;
create policy "gs_orders_update_customer_draft"
  on public.gs_orders
  for update
  to authenticated
  using (
    customer_id = (select auth.uid())
    and status = 'draft'
  )
  with check (
    customer_id = (select auth.uid())
    and status = 'draft'
  );

-- Transitions pending_payment / accepted : service_role (checkout-order, webhook).

-- ─── gs_order_items ──────────────────────────────────────────────────────────
alter table public.gs_order_items enable row level security;

drop policy if exists "gs_order_items_select_via_order" on public.gs_order_items;
create policy "gs_order_items_select_via_order"
  on public.gs_order_items
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.gs_orders o
      where o.id = order_id
        and (
          o.customer_id = (select auth.uid())
          or o.provider_id = (select auth.uid())
        )
    )
  );

drop policy if exists "gs_order_items_insert_draft" on public.gs_order_items;
create policy "gs_order_items_insert_draft"
  on public.gs_order_items
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.gs_orders o
      where o.id = order_id
        and o.customer_id = (select auth.uid())
        and o.status = 'draft'
    )
  );

drop policy if exists "gs_order_items_update_draft" on public.gs_order_items;
create policy "gs_order_items_update_draft"
  on public.gs_order_items
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.gs_orders o
      where o.id = order_id
        and o.customer_id = (select auth.uid())
        and o.status = 'draft'
    )
  )
  with check (
    exists (
      select 1
      from public.gs_orders o
      where o.id = order_id
        and o.customer_id = (select auth.uid())
        and o.status = 'draft'
    )
  );

drop policy if exists "gs_order_items_delete_draft" on public.gs_order_items;
create policy "gs_order_items_delete_draft"
  on public.gs_order_items
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.gs_orders o
      where o.id = order_id
        and o.customer_id = (select auth.uid())
        and o.status = 'draft'
    )
  );

-- ─── gs_messages ────────────────────────────────────────────────────────────
alter table public.gs_messages enable row level security;

drop policy if exists "gs_messages_select_participant" on public.gs_messages;
create policy "gs_messages_select_participant"
  on public.gs_messages
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.gs_bookings b
      where b.id = booking_id
        and (
          b.customer_id = (select auth.uid())
          or b.provider_id = (select auth.uid())
        )
    )
  );

drop policy if exists "gs_messages_insert_participant" on public.gs_messages;
create policy "gs_messages_insert_participant"
  on public.gs_messages
  for insert
  to authenticated
  with check (
    sender_id = (select auth.uid())
    and exists (
      select 1
      from public.gs_bookings b
      where b.id = booking_id
        and (
          b.customer_id = (select auth.uid())
          or b.provider_id = (select auth.uid())
        )
    )
  );

-- Mise à jour read_at : actuellement via service_role (markGsMaterialMessagesRead).

-- ─── gs_users_profile ───────────────────────────────────────────────────────
alter table public.gs_users_profile enable row level security;

drop policy if exists "gs_users_profile_select_self" on public.gs_users_profile;
create policy "gs_users_profile_select_self"
  on public.gs_users_profile
  for select
  to authenticated
  using (id = (select auth.uid()));

-- INSERT/UPDATE réservés au service_role (évite élévation de rôle côté client).

-- ─── Tables sensibles : RLS sans policy client (service_role uniquement) ───
alter table if exists public.gs_payments enable row level security;
alter table if exists public.gs_order_payments enable row level security;
alter table if exists public.gs_invoices enable row level security;
alter table if exists public.gs_booking_cancellation_requests enable row level security;
alter table if exists public.stripe_webhook_events enable row level security;

-- gs_reports : déjà RLS + commentaire « admin only » dans gs_reports_v1.sql
