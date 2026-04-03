import type { NextRequest } from "next/server";

/** Hostname canonique du sous-domaine admin (sans port). */
export const ADMIN_SUBDOMAIN_HOST = "admin.getsoundon.com";

/**
 * Hostname de la requête (Vercel : préférer x-forwarded-host, premier host si liste).
 */
export function getRequestHostname(request: NextRequest): string {
  const fwd = request.headers.get("x-forwarded-host");
  const fromFwd = fwd?.split(",")[0]?.trim().split(":")[0]?.toLowerCase();
  if (fromFwd) return fromFwd;
  return request.nextUrl.hostname.toLowerCase();
}
