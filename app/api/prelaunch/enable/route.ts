import { type NextRequest, NextResponse } from "next/server";

import { PREVIEW_COOKIE_NAME } from "@/lib/prelaunch-gate";
import { getSafeSameOriginRedirectPath } from "@/lib/prelaunch-redirect";

/**
 * Active le cookie httpOnly gso_preview=1 après vérification du secret serveur.
 * GET /api/prelaunch/enable?token=...&redirect=/chemin-optionnel
 */
export async function GET(request: NextRequest) {
  const expected = process.env.PRELAUNCH_BYPASS_TOKEN?.trim();
  const token = request.nextUrl.searchParams.get("token");

  if (!expected || token !== expected) {
    return new NextResponse("Non autorisé", { status: 401 });
  }

  const path = getSafeSameOriginRedirectPath(
    request.url,
    request.nextUrl.searchParams.get("redirect"),
  );
  const target = new URL(path, request.url);
  const res = NextResponse.redirect(target, 307);

  res.cookies.set(PREVIEW_COOKIE_NAME, "1", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 14, // 14 jours
  });

  return res;
}
