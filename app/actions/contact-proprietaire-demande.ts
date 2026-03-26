"use server";

import { redirect } from "next/navigation";
import { getOrCreateConversation } from "./messagerie";

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://getsoundon.com";

/** Crée ou ouvre la conversation pour une demande de location, puis redirige le locataire vers la messagerie */
export async function contactProprietaireDemandeAction(demandeId: string) {
  const res = await getOrCreateConversation(demandeId);
  if (res.error || !res.conversationId) {
    return { success: false, error: res.error ?? "Impossible de créer la conversation" };
  }
  redirect(`${siteUrl}/dashboard/messagerie?demandeId=${demandeId}`);
}
