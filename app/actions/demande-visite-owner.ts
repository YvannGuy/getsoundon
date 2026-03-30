"use server";

import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

import { getOrCreateConversationForVisite } from "./messagerie";
import {
  sendVisiteAcceptedNotification,
  sendVisiteRefusedNotification,
  sendVisiteRescheduleNotification,
} from "@/lib/email";
import { sendUserNotification } from "@/lib/user-notifications";

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://getsoundon.com";

function formatTime(t: string | null): string {
  if (!t) return "";
  const m = String(t).match(/(\d{1,2}):(\d{2})/);
  return m ? `${m[1]}h${m[2]}` : "";
}

export async function accepterDemandeVisite(demandeVisiteId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Non connecté" };

  const { data: dv } = await supabase
    .from("demandes_visite")
    .select("salle_id, seeker_id, date_visite, heure_debut, heure_fin")
    .eq("id", demandeVisiteId)
    .single();
  if (!dv) return { success: false, error: "Demande introuvable" };

  const dvRow = dv as { salle_id: string; seeker_id: string; date_visite?: string; heure_debut?: string; heure_fin?: string };
  const { data: salle } = await supabase
    .from("salles")
    .select("id, name, address")
    .eq("id", dvRow.salle_id)
    .eq("owner_id", user.id)
    .single();
  if (!salle) return { success: false, error: "Non autorisé" };

  const { error } = await supabase
    .from("demandes_visite")
    .update({ status: "accepted", updated_at: new Date().toISOString() })
    .eq("id", demandeVisiteId);

  if (error) return { success: false, error: error.message };

  const salleRow = salle as { name: string; address?: string | null };
  const dateStr = dvRow.date_visite
    ? format(new Date(dvRow.date_visite + "T12:00:00"), "EEEE d MMMM yyyy", { locale: fr })
    : "";
  const horairesStr =
    dvRow.heure_debut && dvRow.heure_fin
      ? `${formatTime(dvRow.heure_debut)} – ${formatTime(dvRow.heure_fin)}`
      : formatTime(dvRow.heure_debut ?? null);

  const res = await getOrCreateConversationForVisite(demandeVisiteId);
  const messagerieUrl = res.conversationId
    ? `${siteUrl}/dashboard/messagerie?conversationId=${res.conversationId}`
    : `${siteUrl}/dashboard/messagerie`;

  const admin = createAdminClient();
  const { data: seekerUser } = await admin.auth.admin.getUserById(dvRow.seeker_id);
  const seekerEmail = seekerUser?.user?.email;
  if (seekerEmail) {
    await sendUserNotification({
      userId: dvRow.seeker_id,
      telegramText: [
        "Visite acceptee.",
        `Salle: ${salleRow.name}`,
        `Date: ${dateStr}`,
        `Horaire: ${horairesStr}`,
        messagerieUrl,
      ].join("\n"),
      sendEmail: () =>
        sendVisiteAcceptedNotification(seekerEmail, salleRow.name, dateStr, horairesStr, messagerieUrl),
    }).catch((e) => console.error("[accepterDemandeVisite] notification:", e));
  }

  revalidatePath("/proprietaire/visites");
  return { success: true };
}

export async function refuserDemandeVisite(demandeVisiteId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Non connecté" };

  const { data: dv } = await supabase
    .from("demandes_visite")
    .select("salle_id, seeker_id")
    .eq("id", demandeVisiteId)
    .single();
  if (!dv) return { success: false, error: "Demande introuvable" };

  const { data: salleOwned } = await supabase
    .from("salles")
    .select("id, name")
    .eq("id", (dv as { salle_id: string }).salle_id)
    .eq("owner_id", user.id)
    .single();
  if (!salleOwned) return { success: false, error: "Non autorisé" };

  const { error } = await supabase
    .from("demandes_visite")
    .update({ status: "refused", updated_at: new Date().toISOString() })
    .eq("id", demandeVisiteId);

  if (error) return { success: false, error: error.message };
  try {
    const dvRow = dv as { seeker_id: string };
    const salleRow = salleOwned as { name?: string | null };
    const admin = createAdminClient();
    const { data: seekerUser } = await admin.auth.admin.getUserById(dvRow.seeker_id);
    const seekerEmail = seekerUser?.user?.email;
    if (seekerEmail) {
      const demandeUrl = `${siteUrl}/dashboard/demandes/visite/${demandeVisiteId}`;
      await sendUserNotification({
        userId: dvRow.seeker_id,
        telegramText: [
          "Visite refusee.",
          `Salle: ${salleRow.name ?? "la salle"}`,
          demandeUrl,
        ].join("\n"),
        sendEmail: () =>
          sendVisiteRefusedNotification(
            seekerEmail,
            salleRow.name ?? "la salle",
            demandeUrl
          ),
      });
    }
  } catch (e) {
    console.error("[refuserDemandeVisite] email:", e);
  }

  revalidatePath("/dashboard/demandes");
  revalidatePath(`/dashboard/demandes/visite/${demandeVisiteId}`);
  revalidatePath("/proprietaire/visites");
  return { success: true };
}

export async function proposerAutreCreneauVisite(
  demandeVisiteId: string,
  dateProposee: string,
  heureDebutProposee: string,
  heureFinProposee: string
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Non connecté" };
  if (!dateProposee || !heureDebutProposee || !heureFinProposee) {
    return { success: false, error: "Date et horaires requis" };
  }

  const { data: dv } = await supabase
    .from("demandes_visite")
    .select("salle_id, seeker_id")
    .eq("id", demandeVisiteId)
    .single();
  if (!dv) return { success: false, error: "Demande introuvable" };

  const { data: salleOwned } = await supabase
    .from("salles")
    .select("id, name")
    .eq("id", (dv as { salle_id: string }).salle_id)
    .eq("owner_id", user.id)
    .single();
  if (!salleOwned) return { success: false, error: "Non autorisé" };

  const { error } = await supabase
    .from("demandes_visite")
    .update({
      status: "reschedule_proposed",
      date_proposee: dateProposee,
      heure_debut_proposee: `${heureDebutProposee}:00`,
      heure_fin_proposee: `${heureFinProposee}:00`,
      updated_at: new Date().toISOString(),
    })
    .eq("id", demandeVisiteId);

  if (error) return { success: false, error: error.message };

  const dateStr = format(new Date(dateProposee + "T12:00:00"), "EEEE d MMMM yyyy", { locale: fr });
  const horairesStr = `${formatTime(`${heureDebutProposee}:00`)} – ${formatTime(`${heureFinProposee}:00`)}`;

  try {
    const dvRow = dv as { seeker_id: string };
    const salleRow = salleOwned as { name?: string | null };
    const admin = createAdminClient();
    const { data: seekerUser } = await admin.auth.admin.getUserById(dvRow.seeker_id);
    const seekerEmail = seekerUser?.user?.email;
    if (seekerEmail) {
      const demandeUrl = `${siteUrl}/dashboard/demandes/visite/${demandeVisiteId}`;
      await sendUserNotification({
        userId: dvRow.seeker_id,
        telegramText: [
          "Nouveau creneau de visite propose.",
          `Salle: ${salleRow.name ?? "la salle"}`,
          `Date: ${dateStr}`,
          `Horaire: ${horairesStr}`,
          demandeUrl,
        ].join("\n"),
        sendEmail: () =>
          sendVisiteRescheduleNotification(
            seekerEmail,
            salleRow.name ?? "la salle",
            dateStr,
            horairesStr,
            demandeUrl
          ),
      });
    }
  } catch (e) {
    console.error("[proposerAutreCreneauVisite] email:", e);
  }

  revalidatePath("/dashboard/demandes");
  revalidatePath(`/dashboard/demandes/visite/${demandeVisiteId}`);
  revalidatePath("/proprietaire/visites");
  return { success: true };
}
