"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { sendComingSoonConfirmationEmail } from "@/lib/email";

export async function subscribeComingSoonAction(email: string): Promise<{ success: boolean; message?: string; error?: string }> {
  const emailTrimmed = email.trim().toLowerCase();
  if (!emailTrimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) {
    return { success: false, error: "Email invalide." };
  }

  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from("coming_soon_signups").insert({
      email: emailTrimmed,
      created_at: new Date().toISOString(),
    });

    if (error) {
      if (error.code === "23505") {
        return { success: true, message: "Vous êtes déjà inscrit !" };
      }
      // Table inexistante ou autre erreur DB : succès pour ne pas bloquer
      console.warn("coming-soon-signup:", error);
      return { success: true, message: "Merci ! Vous serez informé de l'ouverture." };
    }

    // Envoi de l'email de confirmation (non bloquant)
    sendComingSoonConfirmationEmail(emailTrimmed).catch((e) =>
      console.warn("coming-soon-email:", e)
    );

    return { success: true, message: "Merci ! Vous serez informé de l'ouverture." };
  } catch (e) {
    console.error("coming-soon-signup:", e);
    // Si la table n'existe pas encore, succès pour ne pas bloquer l'UX
    return { success: true, message: "Merci ! Vous serez informé de l'ouverture." };
  }
}
