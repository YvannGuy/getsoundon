-- =============================================================================
-- MIGRATION COMPLÈTE : tables salledeculte.com
-- Exécuter APRÈS supabase.sql et supabase-salles.sql
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. PROFILES : colonnes additionnelles
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='user_type') THEN
    ALTER TABLE public.profiles ADD COLUMN user_type text default 'seeker' check (user_type in ('seeker', 'owner'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='phone') THEN
    ALTER TABLE public.profiles ADD COLUMN phone text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='avatar_url') THEN
    ALTER TABLE public.profiles ADD COLUMN avatar_url text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='stripe_customer_id') THEN
    ALTER TABLE public.profiles ADD COLUMN stripe_customer_id text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='updated_at') THEN
    ALTER TABLE public.profiles ADD COLUMN updated_at timestamptz default now();
  END IF;
END $$;

-- Mise à jour du trigger pour inclure user_type
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, user_type)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'user_type', 'seeker')
  )
  on conflict (id) do update set
    full_name = coalesce(excluded.full_name, profiles.full_name),
    user_type = coalesce(excluded.user_type, profiles.user_type);
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- 2. SALLES : colonnes additionnelles (disponibilités, événements)
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='salles' AND column_name='heure_debut') THEN
    ALTER TABLE public.salles ADD COLUMN heure_debut time default '08:00';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='salles' AND column_name='heure_fin') THEN
    ALTER TABLE public.salles ADD COLUMN heure_fin time default '22:00';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='salles' AND column_name='jours_ouverture') THEN
    ALTER TABLE public.salles ADD COLUMN jours_ouverture text[] default '{}';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='salles' AND column_name='evenements_acceptes') THEN
    ALTER TABLE public.salles ADD COLUMN evenements_acceptes text[] default '{}';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='salles' AND column_name='places_parking') THEN
    ALTER TABLE public.salles ADD COLUMN places_parking int;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='salles' AND column_name='horaires_par_jour') THEN
    ALTER TABLE public.salles ADD COLUMN horaires_par_jour jsonb default '{}';
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 3. DEMANDES : demandes de réservation (organisateur → propriétaire)
-- -----------------------------------------------------------------------------
create table if not exists public.demandes (
  id uuid primary key default gen_random_uuid(),
  seeker_id uuid not null references auth.users(id) on delete cascade,
  salle_id uuid not null references public.salles(id) on delete cascade,
  date_debut date not null,
  date_fin date,
  nb_personnes int,
  type_evenement text,
  message text,
  status text not null default 'sent' check (status in ('sent', 'viewed', 'replied', 'accepted', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  replied_at timestamptz,
  reply_message text
);

create index if not exists idx_demandes_seeker on public.demandes(seeker_id);
create index if not exists idx_demandes_salle on public.demandes(salle_id);
create index if not exists idx_demandes_status on public.demandes(status);
create index if not exists idx_demandes_date on public.demandes(date_debut);

alter table public.demandes enable row level security;

create policy "seekers_select_own_demandes"
  on public.demandes for select
  using (auth.uid() = seeker_id);

create policy "seekers_insert_own_demandes"
  on public.demandes for insert
  with check (auth.uid() = seeker_id);

create policy "owners_select_demandes_on_their_salles"
  on public.demandes for select
  using (
    exists (select 1 from public.salles s where s.id = salle_id and s.owner_id = auth.uid())
  );

create policy "owners_update_demandes_on_their_salles"
  on public.demandes for update
  using (
    exists (select 1 from public.salles s where s.id = salle_id and s.owner_id = auth.uid())
  );

-- -----------------------------------------------------------------------------
-- 4. FAVORIS : salles sauvegardées par les organisateurs
-- -----------------------------------------------------------------------------
create table if not exists public.favoris (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  salle_id uuid not null references public.salles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(user_id, salle_id)
);

create index if not exists idx_favoris_user on public.favoris(user_id);
create index if not exists idx_favoris_salle on public.favoris(salle_id);

alter table public.favoris enable row level security;

create policy "users_manage_own_favoris"
  on public.favoris for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- 5. SUBSCRIPTIONS : abonnements Stripe
-- -----------------------------------------------------------------------------
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  stripe_subscription_id text unique,
  stripe_price_id text,
  stripe_customer_id text,
  plan_id text,
  status text not null default 'active' check (status in ('active', 'canceled', 'past_due', 'unpaid', 'trialing')),
  current_period_start timestamptz,
  current_period_end timestamptz,
  credits_total int default 0,
  credits_used int default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_subscriptions_user on public.subscriptions(user_id);
create index if not exists idx_subscriptions_stripe on public.subscriptions(stripe_subscription_id);

alter table public.subscriptions enable row level security;

create policy "users_select_own_subscriptions"
  on public.subscriptions for select
  using (auth.uid() = user_id);

-- Inserts/updates via service_role (webhook Stripe) ; bypass RLS

-- -----------------------------------------------------------------------------
-- 6. CREDITS_USAGE : historique d'utilisation des crédits
-- -----------------------------------------------------------------------------
create table if not exists public.credits_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  demande_id uuid references public.demandes(id) on delete set null,
  credits_spent int not null default 1,
  created_at timestamptz not null default now()
);

create index if not exists idx_credits_usage_user on public.credits_usage(user_id);

alter table public.credits_usage enable row level security;

create policy "users_select_own_credits_usage"
  on public.credits_usage for select
  using (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- 7. CONVERSATIONS : fil de discussion organisateur ↔ propriétaire
-- -----------------------------------------------------------------------------
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  demande_id uuid references public.demandes(id) on delete set null,
  seeker_id uuid not null references auth.users(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  salle_id uuid not null references public.salles(id) on delete cascade,
  last_message_at timestamptz default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(seeker_id, owner_id, salle_id)
);

create index if not exists idx_conversations_seeker on public.conversations(seeker_id);
create index if not exists idx_conversations_owner on public.conversations(owner_id);
create index if not exists idx_conversations_salle on public.conversations(salle_id);

alter table public.conversations enable row level security;

create policy "participants_select_conversations"
  on public.conversations for select
  using (auth.uid() = seeker_id or auth.uid() = owner_id);

create policy "participants_insert_conversations"
  on public.conversations for insert
  with check (auth.uid() = seeker_id or auth.uid() = owner_id);

create policy "participants_update_conversations"
  on public.conversations for update
  using (auth.uid() = seeker_id or auth.uid() = owner_id);

-- -----------------------------------------------------------------------------
-- 8. MESSAGES : messages dans les conversations
-- -----------------------------------------------------------------------------
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_messages_conversation on public.messages(conversation_id);
create index if not exists idx_messages_sender on public.messages(sender_id);
create index if not exists idx_messages_created on public.messages(created_at);

alter table public.messages enable row level security;

create policy "participants_select_messages"
  on public.messages for select
  using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id and (c.seeker_id = auth.uid() or c.owner_id = auth.uid())
    )
  );

create policy "participants_insert_messages"
  on public.messages for insert
  with check (
    auth.uid() = sender_id
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id and (c.seeker_id = auth.uid() or c.owner_id = auth.uid())
    )
  );

create policy "participants_update_messages"
  on public.messages for update
  using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id and (c.seeker_id = auth.uid() or c.owner_id = auth.uid())
    )
  );

-- -----------------------------------------------------------------------------
-- 9. SALLE_VIEWS : vues/consultations d'une salle (stats)
-- -----------------------------------------------------------------------------
create table if not exists public.salle_views (
  id uuid primary key default gen_random_uuid(),
  salle_id uuid not null references public.salles(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  viewed_at timestamptz not null default now()
);

create index if not exists idx_salle_views_salle on public.salle_views(salle_id);
create index if not exists idx_salle_views_viewed on public.salle_views(viewed_at);

alter table public.salle_views enable row level security;

create policy "anyone_insert_salle_views"
  on public.salle_views for insert
  with check (true);

create policy "owners_select_views_on_their_salles"
  on public.salle_views for select
  using (
    exists (select 1 from public.salles s where s.id = salle_id and s.owner_id = auth.uid())
  );
