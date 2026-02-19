"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

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
  const frequence = String(formData.get("frequence") ?? "ponctuel") as "ponctuel" | "hebdomadaire" | "mensuel";
  const nbPersonnes = parseInt(String(formData.get("nbPersonnes") ?? "0"), 10);
  const heureDebut = String(formData.get("heureDebut") ?? "").trim();
  const heureFin = String(formData.get("heureFin") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();

  if (!salleId) {
    return { success: false, error: "Salle manquante." };
  }

  const dateDebut = dateDebutStr ? new Date(dateDebutStr) : null;
  if (!dateDebut || isNaN(dateDebut.getTime())) {
    return { success: false, error: "Date de l'événement requise." };
  }

  const toTime = (s: string) => {
    if (!s || s === "--- --:--") return null;
    const match = s.match(/(\d{1,2}):(\d{2})/);
    if (!match) return null;
    return `${match[1].padStart(2, "0")}:${match[2]}:00`;
  };

  const { error } = await supabase.from("demandes").insert({
    seeker_id: user.id,
    salle_id: salleId,
    date_debut: dateDebut.toISOString().slice(0, 10),
    nb_personnes: nbPersonnes || null,
    frequence: ["ponctuel", "hebdomadaire", "mensuel"].includes(frequence) ? frequence : "ponctuel",
    heure_debut_souhaitee: toTime(heureDebut),
    heure_fin_souhaitee: toTime(heureFin),
    message: message || null,
    status: "sent",
  });

  if (error) {
    console.error("createDemande error:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}
