"use server";

import sharp from "sharp";

import { STORAGE_BUCKETS } from "@/lib/storage";
import { bufferLooksLikeJpegOrPng } from "@/lib/storage/image-signature";
import { createClient } from "@/lib/supabase/server";

const BUCKET_NAME = STORAGE_BUCKETS.sallePhotos;
const WATERMARK_TEXT = "getsoundon.com";

function createWatermarkSvg(): Buffer {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="280" height="36">
      <text x="8" y="26" font-family="Arial, sans-serif" font-size="18" font-weight="600" fill="rgba(255,255,255,0.7)" stroke="rgba(0,0,0,0.4)" stroke-width="1">${WATERMARK_TEXT}</text>
    </svg>
  `;
  return Buffer.from(svg.trim());
}
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_FILES_PER_REQUEST = 20;
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

  if (files.length > MAX_FILES_PER_REQUEST) {
    return {
      success: false,
      error: `Maximum ${MAX_FILES_PER_REQUEST} fichiers par envoi.`,
    };
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

  const watermarkSvg = createWatermarkSvg();

  for (let i = 0; i < validFiles.length; i++) {
    const file = validFiles[i];
    const path = `${prefix}/${timestamp}-${i}.jpg`;

    let buffer = Buffer.from(await file.arrayBuffer());
    if (!bufferLooksLikeJpegOrPng(buffer)) {
      return {
        success: false,
        error: `Fichier non reconnu comme image JPEG/PNG (${file.name}).`,
      };
    }

    try {
      const watermarked = await sharp(buffer)
        .composite([
          {
            input: watermarkSvg,
            gravity: "southeast",
            top: 8,
            left: 8,
          },
        ])
        .jpeg({ quality: 90 })
        .toBuffer();
      buffer = Buffer.from(watermarked);
    } catch {
      // Si sharp échoue, on garde l'image originale
    }

    const { error } = await supabase.storage.from(BUCKET_NAME).upload(path, buffer, {
      contentType: "image/jpeg",
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
