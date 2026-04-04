import { createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import { cookies } from "next/headers";

/** getUser sans lever d'erreur si le refresh token est invalide (révoqué, expiré, etc.) */
export async function getUserOrNull(): Promise<{
  user: User | null;
  supabase: Awaited<ReturnType<typeof createClient>>;
}> {
  const supabase = await createClient();
  try {
    const { data, error } = await supabase.auth.getUser();
    const user = data.user ?? null;

    if (!error) {
      return { user, supabase };
    }

    const code = error.code;
    if (process.env.AUTH_DEBUG === "1") {
      console.warn("[getUserOrNull] getUser error", { code, message: error.message });
    }

    if (code === "refresh_token_not_found") {
      try {
        await supabase.auth.signOut();
      } catch {
        /* ignore */
      }
      return { user: null, supabase };
    }

    if (code === "refresh_token_already_used") {
      return { user: null, supabase };
    }

    const msg = (error.message ?? "").toLowerCase();
    const noSessionExpected =
      msg.includes("session missing") ||
      msg.includes("no session") ||
      code === "session_not_found";

    if (noSessionExpected) {
      return { user: null, supabase };
    }

    console.error("[getUserOrNull] auth.getUser:", error.message, code);
    return { user: null, supabase };
  } catch (err: unknown) {
    const code =
      err && typeof err === "object" && "code" in err
        ? (err as { code?: string }).code
        : undefined;
    if (code === "refresh_token_not_found") {
      try {
        await supabase.auth.signOut();
      } catch {
        /* ignore */
      }
      return { user: null, supabase };
    }
    if (code === "refresh_token_already_used") {
      return { user: null, supabase };
    }
    const errMsg =
      err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
    if (errMsg.includes("session missing") || errMsg.includes("no session")) {
      return { user: null, supabase };
    }
    console.error("[getUserOrNull] auth.getUser failed:", err);
    return { user: null, supabase };
  }
}

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Cookies cannot be modified in Server Components (only in Server Actions or Route Handlers).
            // Session refresh is skipped; it will happen on the next Server Action or Route Handler.
          }
        },
      },
    },
  );
}
