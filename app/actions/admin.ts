"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { Salle } from "@/lib/types/salle";
import { rowToSalle } from "@/lib/types/salle";
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
