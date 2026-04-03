"use server";

import { revalidatePath } from "next/cache";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Accès refusé." };

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
  const isAdminByProfile = profile?.user_type === "admin";

  if (!isAdminByEnv && !isAdminByProfile) {
    return { ok: false as const, error: "Accès refusé." };
  }
  return { ok: true as const };
}

/**
 * Suspend un utilisateur (profiles.suspended) — à combiner avec vos règles catalogue / RLS.
 */
export async function suspendUserAction(userId: string) {
  if (!userId) return { error: "ID manquant" };
  const auth = await requireAdmin();
  if (!auth.ok) return { error: auth.error };

  const supabase = createAdminClient();

  const { error } = await supabase
    .from("profiles")
    .update({ suspended: true })
    .eq("id", userId);
  if (error) return { error: error.message };

  revalidatePath("/admin/utilisateurs");
  revalidatePath("/admin");
  return { success: true };
}

export async function reactivateUserAction(userId: string) {
  if (!userId) return { error: "ID manquant" };
  const auth = await requireAdmin();
  if (!auth.ok) return { error: auth.error };

  const supabase = createAdminClient();

  const { error } = await supabase
    .from("profiles")
    .update({ suspended: false })
    .eq("id", userId);
  if (error) return { error: error.message };

  revalidatePath("/admin/utilisateurs");
  revalidatePath("/admin");
  return { success: true };
}

export async function deleteUserAction(userId: string) {
  if (!userId) return { error: "ID manquant" };
  const auth = await requireAdmin();
  if (!auth.ok) return { error: auth.error };

  const supabase = createAdminClient();

  const { error } = await supabase.auth.admin.deleteUser(userId);

  if (error) return { error: error.message };

  revalidatePath("/admin/utilisateurs");
  revalidatePath("/admin");
  return { success: true };
}

/** Supprime plusieurs utilisateurs en une fois. */
export async function deleteUsersBulkAction(userIds: string[]) {
  if (!userIds.length) return { error: "Aucun utilisateur sélectionné" };
  const auth = await requireAdmin();
  if (!auth.ok) return { error: auth.error };

  const supabase = createAdminClient();
  const errors: string[] = [];

  for (const userId of userIds) {
    const { error } = await supabase.auth.admin.deleteUser(userId);
    if (error) errors.push(`${userId}: ${error.message}`);
  }

  revalidatePath("/admin/utilisateurs");
  revalidatePath("/admin");

  if (errors.length > 0) {
    return { error: `Échec pour ${errors.length} utilisateur(s): ${errors.join("; ")}` };
  }
  return { success: true };
}
