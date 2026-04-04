"use server";

import { revalidatePath } from "next/cache";

import { requireAdminOrThrow } from "@/lib/auth/admin-guard";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Suspend un utilisateur (profiles.suspended) — à combiner avec vos règles catalogue / RLS.
 */
export async function suspendUserAction(userId: string) {
  if (!userId) return { error: "ID manquant" };
  try {
    await requireAdminOrThrow();
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Accès refusé." };
  }

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
  try {
    await requireAdminOrThrow();
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Accès refusé." };
  }

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
  try {
    await requireAdminOrThrow();
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Accès refusé." };
  }

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
  try {
    await requireAdminOrThrow();
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Accès refusé." };
  }

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
