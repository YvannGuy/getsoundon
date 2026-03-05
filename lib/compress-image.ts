/**
 * Compression client-side pour réduire la taille des images avant upload.
 * Redimensionne (max 1600px côté long), JPEG qualité 0.75.
 * HEIC non converti ici (nécessiterait heic2any) ; les fichiers non supportés sont renvoyés tels quels ou rejetés.
 */

const DEFAULT_MAX_PX = 1600;
const DEFAULT_QUALITY = 0.75;
const JPEG = "image/jpeg";

export type CompressImageOptions = {
  maxSizePx?: number;
  quality?: number;
};

/**
 * Compresse un fichier image pour le web (JPEG, max dimension, qualité).
 * Retourne un Blob JPEG. Si le fichier n'est pas une image exploitable par le canvas, le rejette.
 */
export async function compressImage(
  file: File,
  options: CompressImageOptions = {}
): Promise<Blob> {
  const { maxSizePx = DEFAULT_MAX_PX, quality = DEFAULT_QUALITY } = options;

  const type = file.type?.toLowerCase() ?? "";
  const isHeic = type === "image/heic" || type === "image/heif" || file.name?.toLowerCase().endsWith(".heic");
  if (isHeic) {
    return Promise.reject(new Error("Format HEIC non supporté. Convertissez en JPEG ou PNG avant d'ajouter la photo."));
  }

  if (!type.startsWith("image/")) {
    return Promise.reject(new Error("Fichier non reconnu comme image."));
  }

  return new Promise((resolve, reject) => {
    const img = document.createElement("img");
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      if (!w || !h) {
        reject(new Error("Dimensions d'image invalides."));
        return;
      }
      let width = w;
      let height = h;
      if (w > maxSizePx || h > maxSizePx) {
        if (w >= h) {
          width = maxSizePx;
          height = Math.round((h * maxSizePx) / w);
        } else {
          height = maxSizePx;
          width = Math.round((w * maxSizePx) / h);
        }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas non disponible."));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Échec de la compression."));
        },
        JPEG,
        quality
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Impossible de charger l'image."));
    };
    img.src = url;
  });
}
