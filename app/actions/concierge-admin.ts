"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Non connecté" };
  const adminEmails = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  const isAdminByEnv = adminEmails.includes(user.email?.toLowerCase() ?? "");
  const { data: profile } = await supabase.from("profiles").select("user_type").eq("id", user.id).maybeSingle();
  const isAdminByProfile = profile?.user_type === "admin";
  if (!isAdminByEnv && !isAdminByProfile) return { ok: false as const, error: "Accès refusé" };
  return { ok: true as const };
}

export async function updateConciergeRequestStatus(
  id: string,
  status: string
): Promise<{ success: boolean; error?: string }> {
  const auth = await requireAdmin();
  if (!auth.ok) return { success: false, error: auth.error };

  const valid = ["new", "contacted", "in_progress", "resolved"];
  if (!valid.includes(status)) return { success: false, error: "Statut invalide" };

  const admin = createAdminClient();
  const { error } = await admin
    .from("concierge_requests")
    .update({ status })
    .eq("id", id);

  if (error) return { success: false, error: error.message };
  return { success: true };
}
