/** Détection minimale JPEG / PNG sur les premiers octets (ne remplace pas une analyse complète). */
export function bufferLooksLikeJpegOrPng(buffer: Buffer): boolean {
  if (buffer.length < 4) return false;
  if (buffer[0] === 0xff && buffer[1] === 0xd8) return true;
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) return true;
  return false;
}
