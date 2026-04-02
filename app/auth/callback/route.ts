import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

function sanitizeNextPath(raw: string | null): string {
  if (!raw) return "/auth";
  if (!raw.startsWith("/")) return "/auth";
  if (raw.startsWith("//")) return "/auth";
  return raw;
}

/** Échange le code PKCE pour une session et redirige vers la page cible. */
export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = sanitizeNextPath(requestUrl.searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      const redirect = new URL("/auth", requestUrl.origin);
      redirect.searchParams.set("error", "session_expired");
      return NextResponse.redirect(redirect);
    }
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin));
}
