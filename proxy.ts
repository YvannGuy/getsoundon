import { type NextRequest, NextResponse } from "next/server";

import { ADMIN_SUBDOMAIN_HOST, getRequestHostname } from "@/lib/admin-host";
import {
  hasPreviewBypass,
  isComingSoonMode,
  isPublicPathAllowedDuringComingSoon,
} from "@/lib/prelaunch-gate";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const hostname = getRequestHostname(request);

  /**
   * Sous-domaine admin : pas de page marketing / pré-lancement publique ici.
   * La racine et /coming-soon renvoient vers /admin ; session absente ou non-admin
   * → updateSession ou layout admin redirigent ensuite vers /auth/admin.
   */
  if (hostname === ADMIN_SUBDOMAIN_HOST) {
    const isComingSoonPath = pathname === "/coming-soon" || pathname.startsWith("/coming-soon/");
    if (pathname === "/" || isComingSoonPath) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin";
      url.search = "";
      return NextResponse.redirect(url, 307);
    }
  }

  /**
   * Pré-lancement (SITE_MODE=coming_soon) : sans cookie gso_preview, seules les routes
   * allowlistées atteignent l’app ; le reste → /coming-soon (307).
   * Avec cookie preview ou en mode live : comportement inchangé → updateSession (Supabase).
   */
  if (isComingSoonMode()) {
    if (!hasPreviewBypass(request) && !isPublicPathAllowedDuringComingSoon(pathname)) {
      const url = request.nextUrl.clone();
      url.pathname = "/coming-soon";
      url.search = "";
      return NextResponse.redirect(url, 307);
    }
  }

  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!api|auth|_next/static|_next/image|favicon|.well-known|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|json)$).*)",
  ],
};
