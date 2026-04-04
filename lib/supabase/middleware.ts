import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

/** Réponse « next » avec en-têtes de requête alignés sur les cookies actuels (indispensable pour les RSC). */
function nextWithRequestHeaders(request: NextRequest) {
  return NextResponse.next({
    request: {
      headers: new Headers(request.headers),
    },
  });
}

function hasSupabaseAuthCookies(req: NextRequest) {
  return req.cookies.getAll().some((c) => {
    const n = c.name;
    return (
      n.startsWith("sb-") ||
      n.includes("auth-token") ||
      n === "sb-access-token" ||
      n === "sb-refresh-token"
    );
  });
}

/** Nettoie session côté navigateur + enlève les sb-* du Cookie de la requête pour la suite du pipeline. */
function clearSupabaseCookies(req: NextRequest, res: NextResponse) {
  const names = new Set<string>();
  for (const c of req.cookies.getAll()) {
    if (c.name.startsWith("sb-") || c.name === "sb-access-token" || c.name === "sb-refresh-token") {
      names.add(c.name);
      req.cookies.delete(c.name);
    }
  }
  names.add("sb-access-token");
  names.add("sb-refresh-token");
  req.cookies.delete("sb-access-token");
  req.cookies.delete("sb-refresh-token");

  for (const name of names) {
    res.cookies.set(name, "", { path: "/", maxAge: 0 });
  }
}

export async function updateSession(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return nextWithRequestHeaders(request);
  }

  let supabaseResponse = nextWithRequestHeaders(request);

  if (!hasSupabaseAuthCookies(request)) {
    return supabaseResponse;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          if (!value || options?.maxAge === 0) {
            request.cookies.delete(name);
          } else {
            request.cookies.set(name, value);
          }
        });
        supabaseResponse = nextWithRequestHeaders(request);
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  let user = null;
  let refreshTokenNotFound = false;

  try {
    const { data, error } = await supabase.auth.getUser();
    user = data.user ?? null;
    if (!user && error?.code === "refresh_token_not_found") {
      refreshTokenNotFound = true;
    }
  } catch (err: unknown) {
    const code =
      err && typeof err === "object" && "code" in err
        ? (err as { code?: string }).code
        : undefined;

    if (code === "refresh_token_not_found") {
      refreshTokenNotFound = true;
    } else {
      console.error("[updateSession] auth.getUser failed:", err);
    }
  }

  if (refreshTokenNotFound) {
    const protectedPaths = ["/dashboard", "/proprietaire", "/onboarding", "/admin"];
    const isProtected = protectedPaths.some((p) => request.nextUrl.pathname.startsWith(p));

    if (isProtected) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = request.nextUrl.pathname.startsWith("/admin") ? "/auth/admin" : "/auth";
      redirectUrl.searchParams.set("redirectedFrom", request.nextUrl.pathname);

      const redirectResponse = NextResponse.redirect(redirectUrl);
      clearSupabaseCookies(request, redirectResponse);
      return redirectResponse;
    }

    const cleared = nextWithRequestHeaders(request);
    clearSupabaseCookies(request, cleared);
    return cleared;
  }

  const protectedPaths = ["/dashboard", "/proprietaire", "/onboarding", "/admin"];
  const isProtected = protectedPaths.some((p) => request.nextUrl.pathname.startsWith(p));
  if (!user && isProtected) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = request.nextUrl.pathname.startsWith("/admin") ? "/auth/admin" : "/auth";
    redirectUrl.searchParams.set("redirectedFrom", request.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (process.env.AUTH_DEBUG === "1" && request.nextUrl.pathname === "/") {
    console.warn("[updateSession] /", { hasUser: !!user, refreshTokenNotFound });
  }

  return supabaseResponse;
}
