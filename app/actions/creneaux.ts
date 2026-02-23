"use server";

import { createClient } from "@/lib/supabase/server";
import { getSalleBySlug } from "@/lib/salles";
import {
  getCreneauxDisponibles,
  type Creneau,
} from "@/lib/creneaux";

export async function getCreneauxForSalle(slug: string): Promise<{
  creneaux: Creneau[];
  salle: { id: string; name: string } | null;
  error?: string;
}> {
  const salle = await getSalleBySlug(slug);
  if (!salle) {
    return { creneaux: [], salle: null, error: "Salle introuvable" };
  }

  const supabase = await createClient();

  let excludedDates: string[] = [];
  let takenSlots: { date: string; heure_debut: string; heure_fin: string }[] = [];
  try {
    const { data: exclusions } = await supabase
      .from("salle_visite_exclusions")
      .select("date_exclusion")
      .eq("salle_id", salle.id);
    excludedDates = (exclusions ?? []).map((e) => (e as { date_exclusion: string }).date_exclusion);

    const { data: demandesVisite } = await supabase
      .from("demandes_visite")
      .select("date_visite, heure_debut, heure_fin")
      .eq("salle_id", salle.id)
      .in("status", ["pending", "accepted"]);

    takenSlots =
      (demandesVisite ?? []).map((d) => ({
      date: (d as { date_visite: string }).date_visite,
      heure_debut: (d as { heure_debut: string }).heure_debut?.slice(0, 5) ?? "",
      heure_fin: (d as { heure_fin: string }).heure_fin?.slice(0, 5) ?? "",
    }));
  } catch {
    // Tables peuvent ne pas exister
  }

  const creneaux = getCreneauxDisponibles(
    salle,
    12, // 3 mois
    excludedDates,
    takenSlots
  );

  return {
    creneaux,
    salle: salle ? { id: salle.id, name: salle.name } : null,
  };
}
