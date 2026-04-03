import { type NextRequest, NextResponse } from "next/server";

import {
  hasPreviewBypass,
  isComingSoonMode,
  isPublicPathAllowedDuringComingSoon,
} from "@/lib/prelaunch-gate";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

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
