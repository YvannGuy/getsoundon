"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { EffectiveUserType } from "@/lib/auth-utils";
import { sendWelcomeOwnerEmail, sendWelcomeSeekerEmail } from "@/lib/email";
import { getDashboardHref, getEffectiveUserType } from "@/lib/auth-utils";
import { createClient } from "@/lib/supabase/server";

export type AuthFormState = {
  error?: string;
  success?: string;
  redirectTo?: string;
};

const defaultError = "Une erreur est survenue. Veuillez réessayer.";

function resolveSiteUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

export async function loginAction(_: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const redirectedFrom = String(formData.get("redirectedFrom") ?? "").trim();

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    const msg = error.message === "Invalid login credentials" ? "Identifiants incorrects." : error.message || defaultError;
    return { error: msg };
  }

  const user = data.user;
  if (!user) {
    redirect("/auth");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("suspended")
    .eq("id", user.id)
    .maybeSingle();

  if ((profile as { suspended?: boolean } | null)?.suspended) {
    await supabase.auth.signOut();
    revalidatePath("/", "layout");
    return { error: "Votre compte a été suspendu. Contactez l'administrateur." };
  }

  revalidatePath("/", "layout");

  const getProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("user_type")
      .eq("id", userId)
      .maybeSingle();
    return data;
  };
  const userType = await getEffectiveUserType(user, getProfile);
  const target =
    redirectedFrom && redirectedFrom.startsWith("/")
      ? resolveRedirectForUser(redirectedFrom, userType)
      : getDashboardHref(userType ?? "seeker");
  redirect(target);
}

/** Redirige les owners de /dashboard/paiement vers /proprietaire/paiement */
function resolveRedirectForUser(path: string, userType: EffectiveUserType | null): string {
  if (userType !== "owner") return path;
  const [base, query] = path.split("?");
  if (base === "/dashboard/paiement" || base.endsWith("/dashboard/paiement"))
    return "/proprietaire/paiement" + (query ? `?${query}` : "");
  return path;
}

export async function signupAction(_: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("fullName") ?? "");
  const raw = String(formData.get("userType") ?? "seeker");
  const userType = raw === "owner" ? "owner" : "seeker";
  const redirectedFrom = String(formData.get("redirectedFrom") ?? "").trim();

  const supabase = await createClient();
  const siteUrl = resolveSiteUrl();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${siteUrl}/auth/confirm`,
      data: { full_name: fullName, user_type: userType },
    },
  });

  if (error) {
    return { error: error.message || defaultError };
  }

  revalidatePath("/", "layout");

  // Session disponible = pas de confirmation email requise → redirection immédiate
  const hasSession = !!data.session;

  if (hasSession && userType === "seeker") {
    await sendWelcomeSeekerEmail(email, fullName).catch((e) =>
      console.error("[auth] welcome seeker email:", e)
    );
    return {
      success: "Compte créé.",
      redirectTo: redirectedFrom && redirectedFrom.startsWith("/") ? redirectedFrom : "/dashboard",
    };
  }

  if (hasSession && userType === "owner") {
    await sendWelcomeOwnerEmail(email, fullName).catch((e) =>
      console.error("[auth] welcome owner email:", e)
    );
    return {
      success: "Félicitations, votre compte est créé.",
      redirectTo:
        redirectedFrom && redirectedFrom.startsWith("/")
          ? resolveRedirectForUser(redirectedFrom, "owner")
          : "/proprietaire",
    };
  }

  // Confirmation email requise : pas de redirection (l'utilisateur n'a pas encore de session)
  return {
    success:
      "Félicitations ! Votre compte est créé. Vérifiez votre boîte mail pour confirmer l'inscription (pensez à regarder vos dossiers Spam/Indésirables). Une fois confirmé, vous pourrez vous connecter et accéder à votre dashboard.",
  };
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/auth");
}

export async function requestPasswordResetAction(_: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { error: "Veuillez indiquer votre adresse email." };

  const supabase = await createClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://getsoundon.com";
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/auth/callback?next=/auth/mot-de-passe-oublie/nouveau`,
  });

  if (error) {
    return { error: error.message || "Une erreur est survenue." };
  }
  revalidatePath("/", "layout");
  return {
    success:
      "Un email de réinitialisation a été envoyé. Consultez votre boîte de réception et suivez le lien pour définir un nouveau mot de passe.",
  };
}

export async function updatePasswordAction(_: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) return { error: "Le mot de passe doit faire au moins 8 caractères." };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return { error: error.message || "Une erreur est survenue." };
  }
  revalidatePath("/", "layout");
  redirect("/auth?reset=success");
}
