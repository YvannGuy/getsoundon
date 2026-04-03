import { type NextRequest, NextResponse } from "next/server";

import { PREVIEW_COOKIE_NAME } from "@/lib/prelaunch-gate";

/** Supprime gso_preview et renvoie vers la page publique pré-lancement. */
export async function GET(request: NextRequest) {
  const url = new URL("/coming-soon", request.url);
  const res = NextResponse.redirect(url, 307);

  res.cookies.set(PREVIEW_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  return res;
}
