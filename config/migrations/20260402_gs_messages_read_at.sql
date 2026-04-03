-- Phase 6B : lu / non lu pour la messagerie matériel (gs_messages)
-- À appliquer sur le projet Supabase (SQL editor ou migration CLI).

alter table public.gs_messages
  add column if not exists read_at timestamptz;

comment on column public.gs_messages.read_at is
  'Horodatage de lecture par le destinataire (participant autre que sender_id). Null = non lu.';

create index if not exists gs_messages_unread_recipient_idx
  on public.gs_messages (booking_id)
  where read_at is null;
