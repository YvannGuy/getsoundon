"use server";

import { sendNewVisiteRequestNotification } from "@/lib/email";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export type CreateDemandeVisiteResult =
  | { success: true; demandeVisiteId?: string }
  | { success: false; error: string };

export async function createDemandeVisite(formData: FormData): Promise<CreateDemandeVisiteResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const redirectTo = String(formData.get("redirectTo") ?? "").trim();
    redirect("/auth?redirectedFrom=" + encodeURIComponent(redirectTo || "/"));
  }

  const salleId = String(formData.get("salleId") ?? "").trim();
  const dateVisite = String(formData.get("dateVisite") ?? "").trim();
  const heureDebut = String(formData.get("heureDebut") ?? "").trim();
  const heureFin = String(formData.get("heureFin") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();

  if (!salleId || !dateVisite || !heureDebut || !heureFin) {
    return { success: false, error: "Créneau incomplet." };
  }

  const { error } = await supabase.from("demandes_visite").insert({
    salle_id: salleId,
    seeker_id: user.id,
    date_visite: dateVisite,
    heure_debut: `${heureDebut}:00`,
    heure_fin: `${heureFin}:00`,
    message: message || null,
    status: "pending",
  });

  if (error) {
    console.error("createDemandeVisite error:", error);
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
      const d = new Date(dateVisite + "T12:00:00");
      const creneauLabel = `${d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}, ${heureDebut} – ${heureFin}`;
      if (ownerEmail) {
        await sendNewVisiteRequestNotification(
          ownerEmail,
          seekerName,
          salleName,
          creneauLabel,
          `${siteUrl}/proprietaire/visites`
        );
      }
    }
  } catch (e) {
    console.error("createDemandeVisite: erreur email propriétaire", e);
  }

  return { success: true };
}
