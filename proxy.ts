import { type NextRequest, NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

import { ADMIN_SUBDOMAIN_HOST, getRequestHostname } from "@/lib/admin-host";
import {
  hasPreviewBypass,
  isComingSoonMode,
  isPublicPathAllowedDuringComingSoon,
} from "@/lib/prelaunch-gate";
import { updateSession } from "@/lib/supabase/middleware";

const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
const ratelimit =
  redisUrl && redisToken
    ? new Ratelimit({
        redis: new Redis({ url: redisUrl, token: redisToken }),
        limiter: Ratelimit.fixedWindow(20, "1 m"), // 20 req / minute / IP
      })
    : null;

const rateLimitedPaths = [
  "/auth/admin",
  "/auth",
  "/api/stripe/checkout-booking",
  "/api/stripe/webhook",
  "/api/cron/",
  "/api/messages",
  "/api/reports",
];

function shouldRateLimit(pathname: string) {
  return rateLimitedPaths.some((p) => pathname.startsWith(p));
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const hostname = getRequestHostname(request);

  if (ratelimit && shouldRateLimit(pathname)) {
    const forwarded = request.headers.get("x-forwarded-for");
    const ip =
      request.headers.get("x-real-ip") ||
      (forwarded ? forwarded.split(",")[0]?.trim() : null) ||
      "anonymous";

    const { success, limit, remaining, reset } = await ratelimit.limit(ip);
    if (!success) {
      return new NextResponse("Too Many Requests", {
        status: 429,
        headers: {
          "X-RateLimit-Limit": limit.toString(),
          "X-RateLimit-Remaining": remaining.toString(),
          "X-RateLimit-Reset": reset.toString(),
        },
      });
    }
  }

  /**
   * Legacy lieux publics (Lot B) : recherche lieux → catalogue ; fiches /salles/* → 410 Gone.
   */
  if (pathname === "/rechercher" || pathname.startsWith("/rechercher/")) {
    const url = request.nextUrl.clone();
    url.pathname = "/catalogue";
    return NextResponse.redirect(url, 301);
  }
  if (pathname.startsWith("/salles/")) {
    return new NextResponse(null, {
      status: 410,
      headers: { "Cache-Control": "public, max-age=86400" },
    });
  }

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

export default proxy;

export const config = {
  matcher: [
    "/auth",
    "/auth/admin",
    "/api/stripe/checkout-booking",
    "/api/stripe/webhook",
    "/api/cron/:path*",
    "/api/messages",
    "/((?!api|auth|_next/static|_next/image|favicon|.well-known|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|json)$).*)",
  ],
};
