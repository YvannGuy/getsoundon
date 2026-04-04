import type { SupabaseClient, User } from "@supabase/supabase-js";

import { isUserAdmin } from "@/lib/admin-access";
import { getUserOrNull } from "@/lib/supabase/server";

export type AdminContext = { user: User; supabase: SupabaseClient };

/**
 * Vérifie qu'un utilisateur est admin (ADMIN_EMAILS ou profiles.user_type === 'admin').
 * Lance une erreur en cas d'accès refusé.
 */
export async function requireAdminOrThrow(): Promise<AdminContext> {
  const { user, supabase } = await getUserOrNull();
  if (!user) {
    throw new Error("Accès refusé");
  }
  const isAdmin = await isUserAdmin(user, supabase);
  if (!isAdmin) {
    throw new Error("Accès refusé");
  }
  return { user, supabase };
}
