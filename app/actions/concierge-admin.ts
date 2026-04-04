"use server";

import { requireAdminOrThrow } from "@/lib/auth/admin-guard";
import { createAdminClient } from "@/lib/supabase/admin";

export async function updateConciergeRequestStatus(
  id: string,
  status: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdminOrThrow();
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Accès refusé" };
  }

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
