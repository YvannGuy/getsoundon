"use server";

import { createClient } from "@/lib/supabase/server";
import {
  sendConciergeConfirmationEmail,
  sendConciergeRequestAdminNotification,
} from "@/lib/email";

export type ConciergeFormPayload = {
  zone?: string;
  code_postal?: string;
  capacite?: number;
  type?: "ponctuel" | "mensuel";
  date_debut?: string;
  date_fin?: string;
  frequence?: string;
  budget_min?: number;
  budget_max?: number;
  contraintes?: string;
  message: string;
  email?: string;
  phone?: string;
  // Search params (origin)
  ville?: string;
  departement?: string;
  personnes_min?: string;
  personnes_max?: string;
  date_debut_search?: string;
  date_fin_search?: string;
  type_evenement?: string;
};

export type ConciergeSubmitResult =
  | { success: true }
  | { success: false; error: string };

export async function submitConciergeRequest(
  payload: ConciergeFormPayload,
  source: "homepage" | "search_zero_results" | "other"
): Promise<ConciergeSubmitResult> {
  const message = String(payload.message ?? "").trim();
  if (!message || message.length < 10) {
    return { success: false, error: "Décrivez votre besoin en au moins 10 caractères." };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const row = {
    user_id: user?.id ?? null,
    email: user ? null : payload.email?.trim() || null,
    phone: user ? null : payload.phone?.trim() || null,
    status: "new",
    source,
    payload: payload as Record<string, unknown>,
  };

  const { error } = await supabase.from("concierge_requests").insert(row);

  if (error) {
    console.error("concierge_requests insert error:", error);
    return { success: false, error: "Erreur lors de l'envoi. Réessayez." };
  }

  const recipientEmail = user?.email ?? payload.email?.trim();
  if (recipientEmail) {
    await sendConciergeConfirmationEmail(recipientEmail).catch((e) =>
      console.error("[concierge] confirmation email:", e)
    );
  }

  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (adminEmails.length > 0) {
    const contactForAdmin = recipientEmail ?? payload.phone ?? "non renseigné";
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://salledeculte.com";
    await sendConciergeRequestAdminNotification(
      adminEmails,
      contactForAdmin,
      source,
      message,
      `${siteUrl}/admin/conciergerie`
    ).catch((e) => console.error("[concierge] admin notification:", e));
  }

  return { success: true };
}
