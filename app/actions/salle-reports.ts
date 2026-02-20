"use server";

import { REPORT_REASONS } from "@/lib/salle-reports";
import type { ReportReason, ReportResult } from "@/lib/salle-reports";
import { createClient } from "@/lib/supabase/server";

export async function reportSalle(
  salleId: string,
  reason: ReportReason,
  details?: string | null
): Promise<ReportResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Connexion requise pour signaler" };
  }

  const validReasons = REPORT_REASONS.map((r) => r.id);
  if (!validReasons.includes(reason)) {
    return { success: false, error: "Raison invalide" };
  }

  const { error } = await supabase.from("salles_reports").insert({
    reporter_id: user.id,
    salle_id: salleId,
    reason,
    details: details?.trim() || null,
  });

  if (error) return { success: false, error: error.message };
  return { success: true };
}
