"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export type AuthFormState = {
  error?: string;
  success?: string;
  redirectTo?: string;
};

const defaultError = "Une erreur est survenue. Veuillez réessayer.";

export async function loginAction(_: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message || defaultError };
  }

  const userType = data.user?.user_metadata?.user_type ?? "seeker";
  revalidatePath("/", "layout");

  if (userType === "owner") {
    redirect("/proprietaire");
  }

  redirect("/dashboard");
}

export async function signupAction(_: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("fullName") ?? "");
  const userType = String(formData.get("userType") ?? "seeker");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName, user_type: userType },
    },
  });

  if (error) {
    return { error: error.message || defaultError };
  }

  revalidatePath("/", "layout");

  // Session disponible = pas de confirmation email requise → redirection immédiate
  const hasSession = !!data.session;

  if (hasSession && userType === "owner") {
    return { success: "Compte créé.", redirectTo: "/onboarding/salle" };
  }

  if (hasSession && userType === "seeker") {
    return { success: "Compte créé.", redirectTo: "/dashboard" };
  }

  // Confirmation email requise : pas de redirection (l'utilisateur n'a pas encore de session)
  return {
    success:
      "Compte créé. Vérifiez votre email pour confirmer votre inscription, puis connectez-vous.",
  };
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/auth");
}
