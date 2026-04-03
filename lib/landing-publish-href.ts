import type { SupabaseClient, User } from "@supabase/supabase-js";

import { getEffectiveUserType, getPublishMaterialListingHref } from "@/lib/auth-utils";

/** Pour footer / shell landing : même règle que la sidebar dashboard (prestataire vs inscription). */
export async function resolvePublishListingHref(
  user: User | null,
  supabase: SupabaseClient,
): Promise<string> {
  if (!user) return getPublishMaterialListingHref(null, false, false);

  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  const isAdminByEnv =
    adminEmails.length > 0 && adminEmails.includes(user.email?.toLowerCase() ?? "");

  const { data: profile } = await supabase
    .from("profiles")
    .select("user_type")
    .eq("id", user.id)
    .maybeSingle();

  const userType = isAdminByEnv
    ? "admin"
    : await getEffectiveUserType(user, async () => ({
        user_type: (profile as { user_type?: string | null } | null)?.user_type ?? "seeker",
      }));

  const { data: mySalles } = await supabase
    .from("salles")
    .select("id")
    .eq("owner_id", user.id)
    .limit(1);
  const hasSalles = (mySalles ?? []).length > 0;

  return getPublishMaterialListingHref(userType, hasSalles, true);
}
