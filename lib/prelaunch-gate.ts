import type { NextRequest } from "next/server";

/** Cookie httpOnly défini par /api/prelaunch/enable — accès au site réel en mode coming_soon. */
export const PREVIEW_COOKIE_NAME = "gso_preview";

/**
 * Mode site : `coming_soon` = gate actif pour les visiteurs sans cookie preview.
 * Toute autre valeur (ou absent) = comportement normal (live).
 */
export function isComingSoonMode(): boolean {
  const m = (process.env.SITE_MODE ?? "").trim().toLowerCase();
  return m === "coming_soon" || m === "coming-soon";
}

/**
 * Pages accessibles sans cookie preview quand SITE_MODE=coming_soon.
 * (Les routes /api/* et /auth/* sont hors proxy via matcher — ne pas supposer qu’elles passent ici.)
 */
const EXACT_ALLOW = new Set([
  "/coming-soon",
  "/robots.txt",
  "/sitemap.xml",
  "/manifest.json",
  "/site.webmanifest",
  "/favicon.ico",
  /* Pages légales : accessibles sans cookie (conformité / liens footer). */
  "/mentions-legales",
  "/confidentialite",
  "/cgu",
  "/cgv",
]);

/** Préfixes : correspondance stricte (évite ex. /administration si on autorise /admin). */
const PREFIX_ROOTS = ["/coming-soon", "/admin", "/_next"];

function matchesPrefixRoot(pathname: string, root: string): boolean {
  return pathname === root || pathname.startsWith(`${root}/`);
}

export function isPublicPathAllowedDuringComingSoon(pathname: string): boolean {
  if (EXACT_ALLOW.has(pathname)) return true;
  return PREFIX_ROOTS.some((root) => matchesPrefixRoot(pathname, root));
}

/** Cookie preview présent et valide (valeur attendue côté API : "1"). */
export function hasPreviewBypass(request: NextRequest): boolean {
  return request.cookies.get(PREVIEW_COOKIE_NAME)?.value === "1";
}
