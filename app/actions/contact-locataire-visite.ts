"use server";

import { redirect } from "next/navigation";
import { getOrCreateConversationForVisite } from "./messagerie";

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://getsoundon.com";

/** Crée ou ouvre la conversation pour une demande de visite, puis redirige le propriétaire vers la messagerie */
export async function contactLocataireVisiteAction(demandeVisiteId: string) {
  const res = await getOrCreateConversationForVisite(demandeVisiteId);
  if (res.error || !res.conversationId) {
    return { success: false, error: res.error ?? "Impossible de créer la conversation" };
  }
  redirect(`${siteUrl}/proprietaire/messagerie?conversationId=${res.conversationId}`);
}
