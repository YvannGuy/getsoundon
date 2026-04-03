import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";

const VALID_OTP_TYPES: EmailOtpType[] = ["signup", "email_change", "invite", "recovery"];

function sanitizeNextPath(raw: string | null): string | null {
  if (!raw) return null;
  if (!raw.startsWith("/")) return null;
  if (raw.startsWith("//")) return null;
  return raw;
}

async function resolvePostConfirmationTarget(userId: string): Promise<string> {
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("user_type")
    .eq("id", userId)
    .maybeSingle();

  const userType = (profile as { user_type?: string | null } | null)?.user_type ?? "seeker";

  // Heuristique d'onboarding propriétaire: aucune annonce publiée => onboarding à faire.
  if (userType === "owner") {
    const { count } = await supabase
      .from("salles")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", userId);

    if (!count || count === 0) {
      return "/proprietaire/ajouter-annonce";
    }
  }

  return "/dashboard";
}

/**
 * Confirmation email dédiée:
 * - vérifie token_hash/type (flow recommandé Supabase),
 * - fallback sur échange code PKCE si présent,
 * - crée/récupère la session,
 * - redirige vers onboarding/dashboard.
 */
export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const token = requestUrl.searchParams.get("token");
  const email = requestUrl.searchParams.get("email");
  const typeParam = requestUrl.searchParams.get("type");
  const code = requestUrl.searchParams.get("code");
  const safeNext = sanitizeNextPath(requestUrl.searchParams.get("next"));

  const supabase = await createClient();

  if ((tokenHash && typeParam) || (token && typeParam && email)) {
    const type = VALID_OTP_TYPES.includes(typeParam as EmailOtpType)
      ? (typeParam as EmailOtpType)
      : null;
    if (!type) {
      const redirect = new URL("/auth", requestUrl.origin);
      redirect.searchParams.set("error", "confirm_missing_params");
      return NextResponse.redirect(redirect);
    }

    const { error } = tokenHash
      ? await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type,
        })
      : await supabase.auth.verifyOtp({
          email: email as string,
          token: token as string,
          type,
        });
    if (error) {
      const redirect = new URL("/auth", requestUrl.origin);
      redirect.searchParams.set("error", "confirm_invalid_or_expired");
      return NextResponse.redirect(redirect);
    }
  } else if (code) {
    // Compatibilité: certains templates/flows passent encore par code PKCE.
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      const redirect = new URL("/auth", requestUrl.origin);
      redirect.searchParams.set("error", "confirm_invalid_or_expired");
      return NextResponse.redirect(redirect);
    }
  } else {
    const redirect = new URL("/auth", requestUrl.origin);
    redirect.searchParams.set("error", "confirm_missing_params");
    return NextResponse.redirect(redirect);
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    const redirect = new URL("/auth", requestUrl.origin);
    redirect.searchParams.set("error", "confirm_session_not_created");
    return NextResponse.redirect(redirect);
  }

  const destination = safeNext ?? (await resolvePostConfirmationTarget(user.id));
  return NextResponse.redirect(new URL(destination, requestUrl.origin));
}

