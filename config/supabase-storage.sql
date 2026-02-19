-- Storage bucket "salle-photos" pour les photos de l'onboarding
-- Créez d'abord le bucket via le Dashboard Supabase (Storage > New bucket)
-- ou via le script: npm run supabase:init-storage

-- Politique INSERT : les utilisateurs authentifiés peuvent uploader dans leur dossier
create policy "salle_photos_insert_authenticated"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'salle-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Politique SELECT : lecture publique (bucket public)
-- Pour un bucket public, la lecture est déjà permise. Cette policy permet
-- aux utilisateurs authentifiés de lire leurs propres fichiers si besoin.
create policy "salle_photos_select_public"
on storage.objects for select
to public
using (bucket_id = 'salle-photos');
