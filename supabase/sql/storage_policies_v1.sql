-- =============================================================================
-- GetSoundOn — Storage policies Supabase (V1)
-- =============================================================================
-- Aligné avec : lib/storage/buckets.ts, upload client/serveur sur `salle-photos`,
-- PDF factures sur `invoices` via service_role + signed URL serveur.
--
-- À appliquer dans l’éditeur SQL Supabase (ou CLI) après relecture.
-- Le rôle service_role contourne RLS : uploads factures, createSignedUrl, cron.
--
-- Buckets couverts (seuls prouvés dans le repo) :
--   - salle-photos  (public lecture, upload JWT limité au préfixe auth.uid())
--   - invoices      (privé : pas de lecture/écriture JWT directe)
-- =============================================================================

-- ─── Buckets (création idempotente ; ne pas écraser des réglages avancés existants) ───
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'salle-photos',
  'salle-photos',
  true,
  52428800, -- 50 MiB — cohérent avec create-salle (max 50 Mo) ; ajuster si besoin
  array['image/jpeg', 'image/png']::text[]
)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('invoices', 'invoices', false)
on conflict (id) do nothing;

-- ─── salle-photos : lecture publique (catalogue + URLs getPublicUrl côté app) ───
drop policy if exists "gs_storage_salle_photos_select_public" on storage.objects;
create policy "gs_storage_salle_photos_select_public"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'salle-photos');

-- Upload JWT : uniquement sous le dossier dont le premier segment = auth.uid()
-- Chemins applicatifs : `{userId}/{timestamp}-{i}.jpg` (wizard, create-salle, upload-photos)
drop policy if exists "gs_storage_salle_photos_insert_own_prefix" on storage.objects;
create policy "gs_storage_salle_photos_insert_own_prefix"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'salle-photos'
    and (storage.foldername(name))[1] = (auth.uid())::text
  );

-- Pas de UPDATE / DELETE pour anon/authenticated : pas de flux client de suppression ;
-- nettoyage éventuel = service_role ou script admin.

-- ─── invoices : privé, aucune policy pour anon/authenticated ─────────────────
-- Comportement attendu avec RLS activée sur storage.objects :
--   - JWT ne lit pas et n’écrit pas directement dans ce bucket.
--   - Lecture : signed URL générée côté serveur (createAdminClient + createSignedUrl).
--   - Écriture PDF : generate-invoices / service_role uniquement.
--
-- Ne pas ajouter de policy SELECT/INSERT pour le rôle public : laisser le refus par défaut.

-- =============================================================================
-- Notes / écarts possibles
-- =============================================================================
-- • init-storage.ts historique : 5 Mo + createBucket — ce fichier vise 50 Mo pour
--   le bucket si créé ici ; les buckets déjà existants ne sont pas modifiés (ON CONFLICT DO NOTHING).
-- • Si des objets legacy ne sont pas sous `{uuid}/...`, les INSERT JWT échoueront jusqu’à migration manuelle.
-- • Factures : tout accès navigateur passe par URL signée ; ne pas rendre le bucket public.
-- =============================================================================
