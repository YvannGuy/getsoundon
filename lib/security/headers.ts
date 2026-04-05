/**
 * En-têtes HTTP utiles pour les réponses API (réduction surface XSS / MIME sniffing).
 */

import "server-only";

export const securityHeaders: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
};
