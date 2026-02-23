"use server";

import { createClient } from "@/lib/supabase/server";

export async function saveContractTemplateAction(formData: FormData): Promise<{
  success: boolean;
  error?: string;
}> {
  const salleId = String(formData.get("salleId") ?? "").trim();
  if (!salleId) return { success: false, error: "Salle manquante" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Non authentifié" };

  // Vérifier que la salle appartient au user
  const { data: salle, error: salleError } = await supabase
    .from("salles")
    .select("id, owner_id")
    .eq("id", salleId)
    .single();

  if (salleError || !salle) return { success: false, error: "Salle introuvable" };
  if ((salle as { owner_id: string }).owner_id !== user.id) {
    return { success: false, error: "Non autorisé" };
  }

  const raisonSociale = String(formData.get("raisonSociale") ?? "").trim() || null;
  const adresse = String(formData.get("adresse") ?? "").trim() || null;
  const codePostal = String(formData.get("codePostal") ?? "").trim() || null;
  const ville = String(formData.get("ville") ?? "").trim() || null;
  const siret = String(formData.get("siret") ?? "").trim() || null;
  const conditionsParticulieres = String(formData.get("conditionsParticulieres") ?? "").trim() || null;

  const { error: upsertError } = await supabase.from("contract_templates").upsert(
    {
      salle_id: salleId,
      owner_id: user.id,
      raison_sociale: raisonSociale,
      adresse: adresse,
      code_postal: codePostal,
      ville: ville,
      siret: siret,
      conditions_particulieres: conditionsParticulieres,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "salle_id" }
  );

  if (upsertError) return { success: false, error: upsertError.message };
  return { success: true };
}
