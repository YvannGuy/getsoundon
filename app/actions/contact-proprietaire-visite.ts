"use server";

import { redirect } from "next/navigation";
import { getOrCreateConversationForVisite } from "./messagerie";
import { createClient } from "@/lib/supabase/server";

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://getsoundon.com";

/** Crée ou ouvre la conversation pour une demande de visite, puis redirige vers la messagerie */
export async function contactProprietaireVisiteAction(demandeVisiteId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Non connecté" };
  }

  const res = await getOrCreateConversationForVisite(demandeVisiteId);
  if (res.error || !res.conversationId) {
    return { success: false, error: res.error ?? "Impossible de créer la conversation" };
  }

  const { data: demandeVisite } = await supabase
    .from("demandes_visite")
    .select("date_visite, heure_debut")
    .eq("id", demandeVisiteId)
    .maybeSingle();

  const dateLabel = (demandeVisite as { date_visite?: string | null } | null)?.date_visite
    ? new Date(`${(demandeVisite as { date_visite: string }).date_visite}T12:00:00`).toLocaleDateString(
        "fr-FR",
        { day: "2-digit", month: "long", year: "numeric" }
      )
    : "la date prévue";
  const heureRaw = (demandeVisite as { heure_debut?: string | null } | null)?.heure_debut ?? null;
  const heureLabel = heureRaw
    ? (() => {
        const m = String(heureRaw).match(/(\d{1,2}):(\d{2})/);
        return m ? `${m[1]}h${m[2]}` : "l'horaire prévu";
      })()
    : "l'horaire prévu";

  const compose = `Bonjour, je reviens vers vous concernant la visite du ${dateLabel} à ${heureLabel}.`;

  const { data: alreadySent } = await supabase
    .from("messages")
    .select("id")
    .eq("conversation_id", res.conversationId)
    .eq("sender_id", user.id)
    .eq("content", compose)
    .is("deleted_at", null)
    .limit(1);

  if (alreadySent && alreadySent.length > 0) {
    redirect(`${siteUrl}/dashboard/messagerie?conversationId=${res.conversationId}`);
  }

  redirect(
    `${siteUrl}/dashboard/messagerie?conversationId=${res.conversationId}&compose=${encodeURIComponent(compose)}`
  );
}
