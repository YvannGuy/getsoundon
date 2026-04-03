"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { isUserAdmin } from "@/lib/admin-access";
import { createClient } from "@/lib/supabase/server";

export type AuthFormState = {
  error?: string;
};

function getSafeAdminRedirect(formData: FormData): string {
  const redirectTo = String(formData.get("redirectTo") ?? "");
  if (!redirectTo.startsWith("/admin")) return "/admin";
  return redirectTo;
}

export async function loginAdminAction(_: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const redirectTo = getSafeAdminRedirect(formData);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    const msg = error.message === "Invalid login credentials" ? "Identifiants incorrects." : error.message || "Une erreur est survenue.";
    return { error: msg };
  }

  if (!data.user || !(await isUserAdmin(data.user, supabase))) {
    await supabase.auth.signOut();
    return { error: "Accès refusé. Vous n'avez pas les droits administrateur." };
  }

  revalidatePath("/", "layout");
  redirect(redirectTo);
}

export async function signOutAdminAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/auth/admin");
}
