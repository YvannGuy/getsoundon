/**
 * Constantes buckets Storage (importables côté client ou serveur).
 * La logique signée / admin reste dans `lib/storage/index.ts` (server-only).
 */

export const STORAGE_BUCKETS = {
  sallePhotos: "salle-photos",
  invoices: "invoices",
} as const;

export type StorageBucketName = (typeof STORAGE_BUCKETS)[keyof typeof STORAGE_BUCKETS];

/** Limite du nombre de photos par création d’annonce (URLs client ou fichiers formulaire). */
export const MAX_SALLE_PHOTOS_PER_LISTING = 24;
