import type { SupabaseClient, User } from "@supabase/supabase-js";

export function parseAdminEmailsFromEnv(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/** Même règle que app/admin/layout.tsx : ADMIN_EMAILS ou profiles.user_type === admin */
export async function isUserAdmin(user: User, supabase: SupabaseClient): Promise<boolean> {
  const adminEmails = parseAdminEmailsFromEnv();
  const isAdminByEnv =
    adminEmails.length > 0 && adminEmails.includes(user.email?.toLowerCase() ?? "");

  const { data: profile } = await supabase
    .from("profiles")
    .select("user_type")
    .eq("id", user.id)
    .maybeSingle();

  const isAdminByProfile = profile?.user_type === "admin";
  return isAdminByEnv || isAdminByProfile;
}
