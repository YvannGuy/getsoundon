"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

/** Vérifie que l'utilisateur est propriétaire de la salle de la demande. Retourne aussi seeker_id et owner_id. */
async function ensureOwnerAccess(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  demandeId: string
): Promise<{ ok: boolean; seekerId?: string; ownerId?: string; salleId?: string }> {
  const { data: demande } = await supabase
    .from("demandes")
    .select("salle_id, seeker_id")
    .eq("id", demandeId)
    .maybeSingle();
  if (!demande) return { ok: false };
  const d = demande as { salle_id: string; seeker_id: string };
  const { data: salle } = await supabase
    .from("salles")
    .select("owner_id")
    .eq("id", d.salle_id)
    .eq("owner_id", userId)
    .maybeSingle();
  return {
    ok: !!salle,
    seekerId: d.seeker_id,
    ownerId: salle ? (salle as { owner_id: string }).owner_id : undefined,
    salleId: d.salle_id,
  };
}

/** Met à jour le statut d'une demande (accepted, rejected, replied). Pour replied, envoie aussi le message dans la conversation. */
export async function updateDemandeStatusAction(
  demandeId: string,
  status: "accepted" | "rejected" | "replied",
  replyMessage?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Non connecté" };

  const { ok, seekerId, ownerId, salleId } = await ensureOwnerAccess(supabase, user.id, demandeId);
  if (!ok) return { success: false, error: "Non autorisé" };

  const msg =
    status === "accepted"
      ? "Ma salle est disponible pour cette date."
      : status === "rejected"
        ? "Ma salle n'est pas disponible pour cette date."
        : replyMessage ?? "J'aurais besoin de quelques précisions avant de confirmer.";

  const { error } = await supabase
    .from("demandes")
    .update({
      status,
      replied_at: new Date().toISOString(),
      reply_message: msg,
    })
    .eq("id", demandeId);

  if (error) return { success: false, error: error.message };

  if (status === "replied") {
    const { data: conv } = await supabase
      .from("conversations")
      .select("id")
      .eq("demande_id", demandeId)
      .maybeSingle();
    let convId = conv?.id;
    if (!convId && seekerId && ownerId && salleId) {
      const { data: newConv } = await supabase
        .from("conversations")
        .insert({ demande_id: demandeId, seeker_id: seekerId, owner_id: ownerId, salle_id: salleId })
        .select("id")
        .single();
      convId = newConv?.id;
    }
    if (convId) {
      await supabase.from("messages").insert({
        conversation_id: convId,
        sender_id: user.id,
        content: msg,
      });
      await supabase
        .from("conversations")
        .update({
          last_message_at: new Date().toISOString(),
          last_message_preview: msg.length > 80 ? msg.slice(0, 77) + "..." : msg,
          updated_at: new Date().toISOString(),
        })
        .eq("id", convId);
    }
  }

  return { success: true };
}

export async function rejectDemandeAction(formData: FormData): Promise<void> {
  const demandeId = formData.get("demandeId") as string | null;
  if (!demandeId) return;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: salle } = await supabase
    .from("demandes")
    .select("salle_id")
    .eq("id", demandeId)
    .maybeSingle();

  if (!salle) return;

  const { data: salleRow } = await supabase
    .from("salles")
    .select("owner_id")
    .eq("id", (salle as { salle_id: string }).salle_id)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!salleRow) return;

  const { error } = await supabase
    .from("demandes")
    .update({
      status: "rejected",
      replied_at: new Date().toISOString(),
      reply_message: "Demande refusée.",
    })
    .eq("id", demandeId);

  if (error) return;
  redirect("/proprietaire/demandes");
}
