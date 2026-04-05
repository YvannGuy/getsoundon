"use server";

import { revalidatePath } from "next/cache";

import { requireAdminOrThrow } from "@/lib/auth/admin-guard";
import { GS_REPORT_STATUSES, type GsReportStatus } from "@/lib/gs-reports";
import { createAdminClient } from "@/lib/supabase/admin";

export async function updateGsReportAdminAction(
  reportId: string,
  input: { status: GsReportStatus; admin_note?: string | null }
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    await requireAdminOrThrow();
  } catch {
    return { success: false, error: "Accès refusé." };
  }

  if (!GS_REPORT_STATUSES.includes(input.status)) {
    return { success: false, error: "Statut invalide." };
  }

  const admin = createAdminClient();
  const note =
    input.admin_note === undefined
      ? undefined
      : input.admin_note === null
        ? null
        : String(input.admin_note).trim() || null;

  const payload: Record<string, unknown> = {
    status: input.status,
    updated_at: new Date().toISOString(),
  };
  if (note !== undefined) payload.admin_note = note;

  const { error } = await admin.from("gs_reports").update(payload).eq("id", reportId);

  if (error) return { success: false, error: error.message };

  revalidatePath("/admin/signalements");
  return { success: true };
}
