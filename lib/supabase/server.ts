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
    const { data } = await supabase.auth.getUser();
    return { user: data.user, supabase };
  } catch (err: unknown) {
    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      (err as { code?: string }).code === "refresh_token_not_found"
    ) {
      await supabase.auth.signOut();
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
