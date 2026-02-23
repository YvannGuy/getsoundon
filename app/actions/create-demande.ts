"use server";

import { getPlatformSettings } from "@/app/actions/admin-settings";
import { checkCanCreateDemande } from "@/lib/pass-utils";
import { sendNewDemandeNotification } from "@/lib/email";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export type CreateDemandeResult =
  | { success: true }
  | { success: false; error: string };

export async function createDemande(formData: FormData): Promise<CreateDemandeResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const redirectTo = String(formData.get("redirectTo") ?? "").trim();
    redirect("/auth?redirectedFrom=" + encodeURIComponent(redirectTo || "/"));
  }

  const salleId = String(formData.get("salleId") ?? "").trim();
  const dateDebutStr = String(formData.get("dateDebut") ?? "").trim();
  const dateFinStr = String(formData.get("dateFin") ?? "").trim();
  const frequence = String(formData.get("frequence") ?? "ponctuel") as "ponctuel" | "hebdomadaire" | "mensuel";
  const joursSemaine = JSON.parse(String(formData.get("joursSemaine") ?? "[]")) as string[];
  const nbPersonnes = parseInt(String(formData.get("nbPersonnes") ?? "0"), 10);
  const typeEvenement = String(formData.get("typeEvenement") ?? "").trim() || null;
  const heureDebut = String(formData.get("heureDebut") ?? "").trim();
  const heureFin = String(formData.get("heureFin") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();

  if (!salleId) {
    return { success: false, error: "Salle manquante." };
  }

  const dateDebut = dateDebutStr ? new Date(dateDebutStr) : null;
  if (!dateDebut || isNaN(dateDebut.getTime())) {
    return { success: false, error: "Date de début requise." };
  }

  const dateFin = dateFinStr ? new Date(dateFinStr) : null;
  if (frequence === "hebdomadaire") {
    if (joursSemaine.length === 0) {
      return { success: false, error: "Sélectionnez au moins un jour de la semaine." };
    }
    if (!heureDebut || !heureFin || heureDebut === "--- --:--" || heureFin === "--- --:--") {
      return { success: false, error: "Les horaires sont requis pour une location hebdomadaire." };
    }
    if (!dateFin || isNaN(dateFin.getTime())) {
      return { success: false, error: "La date de fin de période est requise." };
    }
  }
  if (frequence === "mensuel") {
    if (joursSemaine.length === 0) {
      return { success: false, error: "Sélectionnez au moins un jour (ex. dimanche, mardi, jeudi)." };
    }
    if (!heureDebut || !heureFin || heureDebut === "--- --:--" || heureFin === "--- --:--") {
      return { success: false, error: "Les horaires sont requis pour une location mensuelle." };
    }
    if (!dateFin || isNaN(dateFin.getTime())) {
      return { success: false, error: "La date de fin de période est requise." };
    }
  }
  if (dateFin && dateDebut && dateFin < dateDebut) {
    return { success: false, error: "La date de fin doit être après la date de début." };
  }

  const toTime = (s: string) => {
    if (!s || s === "--- --:--") return null;
    const match = s.match(/(\d{1,2}):(\d{2})/);
    if (!match) return null;
    return `${match[1].padStart(2, "0")}:${match[2]}:00`;
  };

  const settings = await getPlatformSettings();
  const passCheck = await checkCanCreateDemande(user.id, settings);
  if (!passCheck.allowed) {
    return { success: false, error: passCheck.message };
  }

  const { error } = await supabase.from("demandes").insert({
    seeker_id: user.id,
    salle_id: salleId,
    type_evenement: typeEvenement,
    date_debut: dateDebut.toISOString().slice(0, 10),
    date_fin: dateFin && !isNaN(dateFin.getTime()) ? dateFin.toISOString().slice(0, 10) : null,
    nb_personnes: nbPersonnes || null,
    frequence: ["ponctuel", "hebdomadaire", "mensuel"].includes(frequence) ? frequence : "ponctuel",
    jours_semaine: (frequence === "hebdomadaire" || frequence === "mensuel") && joursSemaine.length > 0 ? joursSemaine : [],
    heure_debut_souhaitee: toTime(heureDebut),
    heure_fin_souhaitee: toTime(heureFin),
    message: message || null,
    status: "sent",
  });

  if (error) {
    console.error("createDemande error:", error);
    return { success: false, error: error.message };
  }

  // Notification email au propriétaire (non bloquant)
  try {
    const adminSupabase = createAdminClient();
    const { data: salle } = await adminSupabase
      .from("salles")
      .select("name, owner_id")
      .eq("id", salleId)
      .single();
    if (salle?.owner_id) {
      const { data: ownerProfile } = await adminSupabase
        .from("profiles")
        .select("email")
        .eq("id", salle.owner_id)
        .single();
      const { data: seekerProfile } = await adminSupabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();
      const ownerEmail = (ownerProfile as { email?: string } | null)?.email;
      const seekerName = (seekerProfile as { full_name?: string } | null)?.full_name ?? "Un organisateur";
      const salleName = (salle as { name?: string }).name ?? "votre salle";
      if (ownerEmail) {
        await sendNewDemandeNotification(
          ownerEmail,
          seekerName,
          salleName,
          `${siteUrl}/proprietaire/demandes`
        );
      }
    }
  } catch (e) {
    console.error("createDemande: erreur email propriétaire", e);
  }

  return { success: true };
}
