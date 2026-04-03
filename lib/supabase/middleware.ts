import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

function hasSupabaseAuthCookies(req: NextRequest) {
  return req.cookies.getAll().some(
    (c) =>
      c.name.includes("auth-token") ||
      c.name === "sb-access-token" ||
      c.name === "sb-refresh-token"
  );
}

function clearSupabaseCookies(req: NextRequest, res: NextResponse) {
  for (const c of req.cookies.getAll()) {
    if (c.name.startsWith("sb-") || c.name === "sb-access-token" || c.name === "sb-refresh-token") {
      res.cookies.set(c.name, "", { path: "/", maxAge: 0 });
    }
  }
  res.cookies.set("sb-access-token", "", { path: "/", maxAge: 0 });
  res.cookies.set("sb-refresh-token", "", { path: "/", maxAge: 0 });
}

export async function updateSession(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({
    request,
  });

  if (!hasSupabaseAuthCookies(request)) {
    return supabaseResponse;
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh token + validation (getUser). Une seule fois ici pour éviter double refresh avec les layouts.
  let user = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch (err: unknown) {
    const code =
      err && typeof err === "object" && "code" in err
        ? (err as { code?: string }).code
        : undefined;

    if (code === "refresh_token_not_found") {
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

      clearSupabaseCookies(request, supabaseResponse);
      return supabaseResponse;
    }

    // Ne pas faire échouer tout le site (global error) pour erreurs réseau, JWT, config, etc.
    console.error("[updateSession] auth.getUser failed:", err);
    clearSupabaseCookies(request, supabaseResponse);
    user = null;
  }

  const protectedPaths = ["/dashboard", "/proprietaire", "/onboarding", "/admin"];
  const isProtected = protectedPaths.some((p) => request.nextUrl.pathname.startsWith(p));
  if (!user && isProtected) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = request.nextUrl.pathname.startsWith("/admin") ? "/auth/admin" : "/auth";
    redirectUrl.searchParams.set("redirectedFrom", request.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  return supabaseResponse;
}
