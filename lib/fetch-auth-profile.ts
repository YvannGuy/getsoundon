import type { SupabaseClient } from "@supabase/supabase-js";

import { createAdminClient } from "@/lib/supabase/admin";

export type AuthProfileRow = {
  user_type: string | null;
  full_name: string | null;
  first_name: string | null;
  suspended?: boolean | null;
};

/**
 * Profil pour le rôle UI (header, liens dashboard). Repli service_role si la ligne
 * n’est pas lisible avec le client session (RLS), pour éviter un menu « prestataire »
 * basé uniquement sur d’anciennes métadonnées auth.
 */
export async function fetchAuthProfileRow(
  userId: string,
  supabase: SupabaseClient,
): Promise<AuthProfileRow | null> {
  const { data } = await supabase
    .from("profiles")
    .select("user_type, full_name, first_name, suspended")
    .eq("id", userId)
    .maybeSingle();

  if (data) return data as AuthProfileRow;

  try {
    const admin = createAdminClient();
    const { data: d2 } = await admin
      .from("profiles")
      .select("user_type, full_name, first_name, suspended")
      .eq("id", userId)
      .maybeSingle();
    return (d2 as AuthProfileRow | null) ?? null;
  } catch {
    return null;
  }
}
