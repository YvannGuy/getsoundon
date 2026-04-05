/**
 * Conventions Storage Supabase — buckets et URLs signées.
 * Toujours privé par défaut ; lecture via signed URL courte.
 */

import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

/** Noms de buckets référencés dans le code (éviter les chaînes magiques). */
export const STORAGE_BUCKETS = {
  sallePhotos: "salle-photos",
  invoices: "invoices",
} as const;

export type StorageBucketName = (typeof STORAGE_BUCKETS)[keyof typeof STORAGE_BUCKETS];

/**
 * Génère une URL signée pour lecture temporaire (durée en secondes).
 * @throws en cas d’erreur Storage
 */
export async function createSignedReadUrl(
  bucket: StorageBucketName | string,
  objectPath: string,
  expiresInSeconds: number,
): Promise<string> {
  const admin = createAdminClient();
  const { data, error } = await admin.storage.from(bucket).createSignedUrl(objectPath, expiresInSeconds);
  if (error || !data?.signedUrl) {
    throw new Error(error?.message ?? "signed_url_failed");
  }
  return data.signedUrl;
}
