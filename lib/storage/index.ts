/**
 * Conventions Storage Supabase — buckets, chemins et URLs signées.
 * - Buckets métier : noms centralisés dans STORAGE_BUCKETS.
 * - Chemins objet : jamais de segments arbitraires non validés (pas de `..`, pas de `/` initial).
 * - Factures / documents privés : lecture via signed URL courte (TTL ci-dessous).
 * - Photos salle : l’app utilise encore des URLs publiques si le bucket est public (catalogue) ;
 *   toute URL fournie par le client doit être revalidée côté serveur (voir isTrustedSallePhotoPublicUrl).
 */

import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

import { MAX_SALLE_PHOTOS_PER_LISTING, STORAGE_BUCKETS, type StorageBucketName } from "./buckets";

export { MAX_SALLE_PHOTOS_PER_LISTING, STORAGE_BUCKETS, type StorageBucketName } from "./buckets";

/** Durée des liens signés pour factures PDF (secondes). Éviter > 1 h pour limiter la fenêtre de fuite. */
export const SIGNED_URL_INVOICES_TTL_SECONDS = 60 * 60; // 1 h

const ALLOWED_BUCKETS = new Set<string>(Object.values(STORAGE_BUCKETS));

/**
 * Valide un chemin d’objet Storage (pas de traversal, caractères sûrs par segment).
 * @throws Error si le chemin est invalide
 */
export function assertSafeStorageObjectPath(path: string): void {
  const trimmed = path.trim();
  if (!trimmed || trimmed.length > 512) {
    throw new Error("invalid_storage_path");
  }
  if (trimmed.includes("..") || trimmed.startsWith("/") || trimmed.includes("\\")) {
    throw new Error("invalid_storage_path");
  }
  const segments = trimmed.split("/");
  for (const seg of segments) {
    if (!seg || seg === "." || seg === "..") {
      throw new Error("invalid_storage_path");
    }
    if (!/^[a-zA-Z0-9._-]+$/.test(seg)) {
      throw new Error("invalid_storage_path");
    }
  }
}

/**
 * Indique si une URL pointe vers le bucket public salle-photos sous le préfixe de l’utilisateur
 * (même projet Supabase). À utiliser pour rejeter des imageUrls forgées côté client.
 */
export function isTrustedSallePhotoPublicUrl(url: string, userId: string): boolean {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  if (!base || !userId) return false;
  try {
    const u = new URL(url);
    const origin = new URL(base).origin;
    if (u.origin !== origin) return false;
    const prefix = `/storage/v1/object/public/${STORAGE_BUCKETS.sallePhotos}/`;
    if (!u.pathname.startsWith(prefix)) return false;
    const objectPath = decodeURIComponent(u.pathname.slice(prefix.length));
    if (objectPath.includes("..")) return false;
    const firstSegment = objectPath.split("/")[0];
    return firstSegment === userId;
  } catch {
    return false;
  }
}

/**
 * Génère une URL signée pour lecture temporaire (durée en secondes).
 * Bucket limité à STORAGE_BUCKETS ; chemin validé.
 * @throws en cas d’erreur Storage ou paramètre invalide
 */
export async function createSignedReadUrl(
  bucket: StorageBucketName,
  objectPath: string,
  expiresInSeconds: number,
): Promise<string> {
  if (!ALLOWED_BUCKETS.has(bucket)) {
    throw new Error("unknown_bucket");
  }
  if (!Number.isFinite(expiresInSeconds) || expiresInSeconds < 60 || expiresInSeconds > 60 * 60 * 6) {
    throw new Error("invalid_expires");
  }
  assertSafeStorageObjectPath(objectPath);
  const admin = createAdminClient();
  const { data, error } = await admin.storage.from(bucket).createSignedUrl(objectPath, expiresInSeconds);
  if (error || !data?.signedUrl) {
    throw new Error(error?.message ?? "signed_url_failed");
  }
  return data.signedUrl;
}

/** Signed URL facture avec TTL standard ; retourne null si chemin invalide ou erreur Storage. */
export async function tryCreateSignedInvoiceReadUrl(objectPath: string): Promise<string | null> {
  try {
    return await createSignedReadUrl(
      STORAGE_BUCKETS.invoices,
      objectPath,
      SIGNED_URL_INVOICES_TTL_SECONDS,
    );
  } catch {
    return null;
  }
}
