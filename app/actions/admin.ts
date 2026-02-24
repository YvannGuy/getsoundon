"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getStripe } from "@/lib/stripe";
import type { Salle } from "@/lib/types/salle";
import { rowToSalle } from "@/lib/types/salle";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function validateSalleAction(formData: FormData) {
  const salleIds = formData.getAll("salleIds").map(String).filter(Boolean);
  const salleId = String(formData.get("salleId") ?? "");
  const status = (formData.get("status") ?? "approved") as "approved" | "rejected";

  const ids = salleIds.length > 0 ? salleIds : (salleId ? [salleId] : []);
  if (ids.length === 0) return { error: "ID manquant" };

  const supabase = createAdminClient();
  for (const id of ids) {
    const { error } = await supabase
      .from("salles")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return { error: error.message };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/annonces-a-valider");
  revalidatePath("/admin/annonces");
  return { success: true };
}

/** Wrapper pour form action (redirect au lieu de return). */
export async function validateSalleFormAction(formData: FormData): Promise<void> {
  const res = await validateSalleAction(formData);
  if (res.success) redirect("/admin");
  redirect(`/admin?error=${encodeURIComponent(res.error ?? "Erreur")}`);
}

export async function getSalleForAdminAction(id: string): Promise<{ error?: string; salle?: Salle }> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("salles")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) return { error: error.message };
  if (!data) return { error: "Salle introuvable" };
  return { salle: rowToSalle(data as Parameters<typeof rowToSalle>[0]) };
}

export async function updateSalleAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "ID manquant" };

  const name = String(formData.get("name") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const capacity = parseInt(String(formData.get("capacity") ?? "0"), 10);
  const pricePerDay = parseInt(String(formData.get("price_per_day") ?? "0"), 10);
  const description = String(formData.get("description") ?? "").trim();
  const contactPhone = String(formData.get("contact_phone") ?? "").trim() || null;
  const displayContactPhoneRaw = formData.get("display_contact_phone");
  const displayContactPhone = displayContactPhoneRaw !== null ? displayContactPhoneRaw === "1" : undefined;

  if (!name || !city || !address || capacity <= 0 || pricePerDay <= 0) {
    return { error: "Champs obligatoires manquants ou invalides" };
  }

  const supabase = createAdminClient();
  const updates: Record<string, unknown> = {
    name,
    city,
    address,
    capacity,
    price_per_day: pricePerDay,
    description,
    contact_phone: contactPhone,
    updated_at: new Date().toISOString(),
  };
  if (displayContactPhone !== undefined) {
    updates.display_contact_phone = displayContactPhone;
  }
  const { error } = await supabase.from("salles").update(updates).eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/admin");
  revalidatePath("/admin/annonces");
  return { success: true };
}

export async function deleteSalleAction(id: string) {
  if (!id) return { error: "ID manquant" };

  const supabase = createAdminClient();
  const { error } = await supabase.from("salles").delete().eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/admin");
  revalidatePath("/admin/annonces");
  return { success: true };
}

export async function resolveDepositClaimAdminAction(params: {
  offerId: string;
  decision: "capture" | "release";
  captureAmountEur?: number;
}): Promise<{ success: boolean; error?: string }> {
  const { offerId, decision, captureAmountEur } = params;
  if (!offerId) return { success: false, error: "Offre manquante" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Non connecté" };

  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  const isAdminByEnv =
    adminEmails.length > 0 && adminEmails.includes(user.email?.toLowerCase() ?? "");
  const { data: profile } = await supabase
    .from("profiles")
    .select("user_type")
    .eq("id", user.id)
    .maybeSingle();
  const isAdminByProfile = profile?.user_type === "admin";
  if (!isAdminByEnv && !isAdminByProfile) return { success: false, error: "Accès refusé" };

  const admin = createAdminClient();
  const { data: offer } = await admin
    .from("offers")
    .select(
      "id, deposit_payment_intent_id, deposit_hold_status, deposit_amount_cents, deposit_claim_amount_cents"
    )
    .eq("id", offerId)
    .maybeSingle();
  if (!offer) return { success: false, error: "Offre introuvable" };

  const row = offer as {
    id: string;
    deposit_payment_intent_id: string | null;
    deposit_hold_status: string | null;
    deposit_amount_cents: number | null;
    deposit_claim_amount_cents: number | null;
  };
  if (!row.deposit_payment_intent_id) {
    return { success: false, error: "Empreinte caution introuvable" };
  }
  if (!["claim_requested", "authorized"].includes(row.deposit_hold_status ?? "")) {
    return { success: false, error: "Statut de caution non traitable" };
  }

  const stripe = getStripe();

  if (decision === "capture") {
    const maxAmount = Math.max(0, row.deposit_amount_cents ?? 0);
    const defaultAmount = Math.max(0, row.deposit_claim_amount_cents ?? 0);
    const amountToCapture = Math.round(
      ((typeof captureAmountEur === "number" && captureAmountEur > 0 ? captureAmountEur : defaultAmount / 100) *
        100)
    );
    if (!Number.isFinite(amountToCapture) || amountToCapture <= 0) {
      return { success: false, error: "Montant de capture invalide" };
    }
    if (amountToCapture > maxAmount) {
      return { success: false, error: "Montant supérieur à la caution" };
    }

    try {
      await stripe.paymentIntents.capture(row.deposit_payment_intent_id, {
        amount_to_capture: amountToCapture,
      });
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : "Erreur Stripe capture caution",
      };
    }

    const { error } = await admin
      .from("offers")
      .update({
        deposit_hold_status: "captured",
        deposit_captured_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", offerId);
    if (error) return { success: false, error: error.message };
  } else {
    try {
      await stripe.paymentIntents.cancel(row.deposit_payment_intent_id);
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : "Erreur Stripe libération caution",
      };
    }

    const { error } = await admin
      .from("offers")
      .update({
        deposit_hold_status: "released",
        deposit_released_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", offerId);
    if (error) return { success: false, error: error.message };
  }

  revalidatePath("/admin/paiements");
  revalidatePath("/proprietaire/paiement");
  return { success: true };
}
