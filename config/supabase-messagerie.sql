-- Messagerie : conversations et messages liés aux demandes
-- Une conversation = 1 demande (propriétaire <-> organisateur)

-- Table conversations (1 par demande)
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  demande_id uuid not null unique references public.demandes(id) on delete cascade,
  last_message_at timestamptz,
  last_message_preview text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_conversations_demande on public.conversations(demande_id);
create index if not exists idx_conversations_last_message on public.conversations(last_message_at desc);

alter table public.conversations enable row level security;

-- Propriétaire et organisateur peuvent voir la conversation de leur demande
create policy "conversations_select_owner_or_seeker"
  on public.conversations for select
  using (
    exists (
      select 1 from public.demandes d
      join public.salles s on s.id = d.salle_id
      where d.id = demande_id
      and (s.owner_id = auth.uid() or d.seeker_id = auth.uid())
    )
  );

create policy "conversations_insert_owner_or_seeker"
  on public.conversations for insert
  with check (
    exists (
      select 1 from public.demandes d
      join public.salles s on s.id = d.salle_id
      where d.id = demande_id
      and (s.owner_id = auth.uid() or d.seeker_id = auth.uid())
    )
  );

create policy "conversations_update_owner_or_seeker"
  on public.conversations for update
  using (
    exists (
      select 1 from public.demandes d
      join public.salles s on s.id = d.salle_id
      where d.id = demande_id
      and (s.owner_id = auth.uid() or d.seeker_id = auth.uid())
    )
  );

-- Table messages
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  sent_at timestamptz not null default now(),
  read_at timestamptz
);

-- Si la table existait déjà avec created_at au lieu de sent_at
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='messages')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='messages' AND column_name='sent_at') THEN
    ALTER TABLE public.messages ADD COLUMN sent_at timestamptz not null default now();
  END IF;
END $$;

create index if not exists idx_messages_conversation on public.messages(conversation_id);
create index if not exists idx_messages_sent_at on public.messages(sent_at);

alter table public.messages enable row level security;

create policy "messages_select_conversation_member"
  on public.messages for select
  using (
    exists (
      select 1 from public.conversations c
      join public.demandes d on d.id = c.demande_id
      join public.salles s on s.id = d.salle_id
      where c.id = conversation_id
      and (s.owner_id = auth.uid() or d.seeker_id = auth.uid())
    )
  );

create policy "messages_insert_conversation_member"
  on public.messages for insert
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.conversations c
      join public.demandes d on d.id = c.demande_id
      join public.salles s on s.id = d.salle_id
      where c.id = conversation_id
      and (s.owner_id = auth.uid() or d.seeker_id = auth.uid())
    )
  );

create policy "messages_update_read_at"
  on public.messages for update
  using (
    exists (
      select 1 from public.conversations c
      join public.demandes d on d.id = c.demande_id
      join public.salles s on s.id = d.salle_id
      where c.id = conversation_id
      and (s.owner_id = auth.uid() or d.seeker_id = auth.uid())
    )
  );

-- Fonction pour créer une conversation à la création d'une demande (optionnel)
-- L'utilisateur peut aussi créer la conversation au premier message
