"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type ParametresState = {
  error?: string;
  success?: string;
};

const defaultError = "Une erreur est survenue. Veuillez réessayer.";

export async function updateProfileAction(
  _: ParametresState,
  formData: FormData
): Promise<ParametresState> {
  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim() || null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Non authentifié." };
  }

  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();

  const { error } = await supabase
    .from("profiles")
    .update({
      first_name: firstName || null,
      last_name: lastName || null,
      full_name: fullName || null,
      phone,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) {
    return { error: error.message || defaultError };
  }

  revalidatePath("/proprietaire/parametres");
  revalidatePath("/dashboard/parametres");
  revalidatePath("/proprietaire", "layout");
  return { success: "Profil enregistré." };
}

export async function updatePasswordAction(
  _: ParametresState,
  formData: FormData
): Promise<ParametresState> {
  const newPassword = String(formData.get("newPassword") ?? "");

  if (newPassword.length < 6) {
    return { error: "Le mot de passe doit contenir au moins 6 caractères." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Non authentifié." };
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword });

  if (error) {
    return { error: error.message || defaultError };
  }

  // Enregistrer la date de changement
  await supabase
    .from("profiles")
    .update({
      last_password_change: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  revalidatePath("/proprietaire/parametres");
  revalidatePath("/dashboard/parametres");
  return { success: "Mot de passe mis à jour." };
}

export async function deleteAccountAction(): Promise<ParametresState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Non authentifié." };
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(user.id);

  if (error) {
    return { error: error.message || defaultError };
  }

  revalidatePath("/", "layout");
  redirect("/auth");
}
