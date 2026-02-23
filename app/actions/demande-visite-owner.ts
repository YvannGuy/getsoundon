"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function accepterDemandeVisite(demandeVisiteId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Non connecté" };

  const { data: dv } = await supabase
    .from("demandes_visite")
    .select("salle_id")
    .eq("id", demandeVisiteId)
    .single();
  if (!dv) return { success: false, error: "Demande introuvable" };

  const { data: salle } = await supabase
    .from("salles")
    .select("id")
    .eq("id", (dv as { salle_id: string }).salle_id)
    .eq("owner_id", user.id)
    .single();
  if (!salle) return { success: false, error: "Non autorisé" };

  const { error } = await supabase
    .from("demandes_visite")
    .update({ status: "accepted", updated_at: new Date().toISOString() })
    .eq("id", demandeVisiteId);

  if (error) return { success: false, error: error.message };
  revalidatePath("/proprietaire/visites");
  return { success: true };
}

export async function refuserDemandeVisite(demandeVisiteId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Non connecté" };

  const { data: salle } = await supabase
    .from("demandes_visite")
    .select("salle_id")
    .eq("id", demandeVisiteId)
    .single();
  if (!salle) return { success: false, error: "Demande introuvable" };

  const { data: salleOwned } = await supabase
    .from("salles")
    .select("id")
    .eq("id", (salle as { salle_id: string }).salle_id)
    .eq("owner_id", user.id)
    .single();
  if (!salleOwned) return { success: false, error: "Non autorisé" };

  const { error } = await supabase
    .from("demandes_visite")
    .update({ status: "refused", updated_at: new Date().toISOString() })
    .eq("id", demandeVisiteId);

  if (error) return { success: false, error: error.message };
  revalidatePath("/proprietaire/visites");
  return { success: true };
}
