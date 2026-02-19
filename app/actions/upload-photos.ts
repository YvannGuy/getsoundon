"use server";

import { createClient } from "@/lib/supabase/server";

const BUCKET_NAME = "salle-photos";
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png"];

export type UploadPhotosResult =
  | { success: true; urls: string[] }
  | { success: false; error: string };

export async function uploadSallePhotos(formData: FormData): Promise<UploadPhotosResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Vous devez être connecté pour ajouter des photos." };
  }

  const files = formData.getAll("photos") as File[];
  if (!files.length) {
    return { success: true, urls: [] };
  }

  const validFiles = files.filter((f) => {
    if (!ALLOWED_TYPES.includes(f.type)) return false;
    if (f.size > MAX_FILE_SIZE) return false;
    return true;
  });

  if (validFiles.length !== files.length) {
    const rejected = files.length - validFiles.length;
    return {
      success: false,
      error: `${rejected} fichier(s) ignoré(s) : formats acceptés JPG/PNG, max 5 Mo par fichier.`,
    };
  }

  const urls: string[] = [];
  const prefix = `${user.id}`;
  const timestamp = Date.now();

  for (let i = 0; i < validFiles.length; i++) {
    const file = validFiles[i];
    const ext = file.name.match(/\.(jpe?g|png)$/i)?.[1] ?? "jpg";
    const path = `${prefix}/${timestamp}-${i}.${ext}`;

    const buffer = Buffer.from(await file.arrayBuffer());

    const { error } = await supabase.storage.from(BUCKET_NAME).upload(path, buffer, {
      contentType: file.type,
      upsert: false,
    });

    if (error) {
      return {
        success: false,
        error: `Erreur lors de l'upload (${file.name}) : ${error.message}`,
      };
    }

    const { data: urlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(path);
    urls.push(urlData.publicUrl);
  }

  return { success: true, urls };
}
