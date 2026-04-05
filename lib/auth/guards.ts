/**
 * Garde-fous auth / autorisation — à utiliser dans Server Actions et Route Handlers.
 * S’appuie sur getUserOrNull (session cookies) et les règles métier existantes (admin-access, auth-utils).
 */

import "server-only";

import { redirect } from "next/navigation";
import type { SupabaseClient, User } from "@supabase/supabase-js";

import { isUserAdmin } from "@/lib/admin-access";
import { canAccessOwnerDashboard, getEffectiveUserType, type EffectiveUserType } from "@/lib/auth-utils";
import { requireAdminOrThrow, type AdminContext } from "@/lib/auth/admin-guard";
import { fetchAuthProfileRow, type AuthProfileRow } from "@/lib/fetch-auth-profile";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserOrNull } from "@/lib/supabase/server";

export type AuthContext = { user: User; supabase: SupabaseClient };

/** Alias explicite : même comportement que getUserOrNull (session serveur). */
export async function getCurrentUser(): Promise<AuthContext | { user: null; supabase: SupabaseClient }> {
  return getUserOrNull();
}

/** Utilisateur connecté requis ; sinon lève une Error (à mapper en 401 dans les routes API si besoin). */
export async function requireUser(): Promise<AuthContext> {
  const { user, supabase } = await getUserOrNull();
  if (!user) {
    throw new Error("Authentification requise");
  }
  return { user, supabase };
}

/** Admin (ADMIN_EMAILS ou profiles.user_type) — aligné sur app/admin et lib/auth/admin-guard. */
export async function requireAdmin(): Promise<AdminContext> {
  return requireAdminOrThrow();
}

export { requireAdminOrThrow };

/**
 * Rôle effectif attendu (admin | owner | seeker).
 * Ne remplace pas un contrôle ownership sur une ressource : combiner avec requireListingOwner si nécessaire.
 */
export async function requireRole(
  allowed: EffectiveUserType | EffectiveUserType[],
): Promise<AuthContext & { role: EffectiveUserType }> {
  const { user, supabase } = await requireUser();
  const role = await getEffectiveUserType(user, async (id) => fetchAuthProfileRow(id, supabase));
  const list = Array.isArray(allowed) ? allowed : [allowed];
  if (!role || !list.includes(role)) {
    throw new Error("Accès refusé");
  }
  return { user, supabase, role };
}

/**
 * Vérifie que l’annonce catalogue `listingId` appartient à l’utilisateur connecté.
 * Utilise le client admin pour une lecture ciblée (owner_id uniquement) après auth.
 */
export async function requireListingOwner(listingId: string): Promise<AuthContext & { listingId: string }> {
  const ctx = await requireUser();
  const admin = createAdminClient();
  const { data, error } = await admin.from("gs_listings").select("owner_id").eq("id", listingId).maybeSingle();
  if (error || !data || data.owner_id !== ctx.user.id) {
    throw new Error("Accès refusé");
  }
  return { ...ctx, listingId };
}

// ─── Layouts (redirect Next.js, pas d’exception) ─────────────────────────────

/** Admin uniquement — même règle que `isUserAdmin` (env + profil). */
export async function redirectIfNotAdmin(redirectTo: string = "/auth/admin"): Promise<AuthContext> {
  const { user, supabase } = await getUserOrNull();
  if (!user) {
    redirect(redirectTo);
  }
  if (!(await isUserAdmin(user, supabase))) {
    redirect(redirectTo);
  }
  return { user, supabase };
}

/**
 * Espace prestataire `/proprietaire` : pas admin pur, pas suspendu, éligible owner (profil ou annonce catalogue).
 */
export async function assertProprietaireAreaOrRedirect(): Promise<
  AuthContext & { profile: AuthProfileRow | null }
> {
  const { user, supabase } = await getUserOrNull();
  if (!user) {
    redirect("/auth");
  }
  if (await isUserAdmin(user, supabase)) {
    redirect("/admin");
  }
  const profile = await fetchAuthProfileRow(user.id, supabase);
  if (profile?.suspended) {
    redirect("/auth?suspended=1");
  }
  const userType = await getEffectiveUserType(user, async () =>
    profile ? { user_type: profile.user_type } : null,
  );
  const { data: myListings } = await supabase.from("gs_listings").select("id").eq("owner_id", user.id).limit(1);
  const hasCatalogListings = (myListings ?? []).length > 0;
  if (!canAccessOwnerDashboard(userType, hasCatalogListings)) {
    redirect("/dashboard");
  }
  return { user, supabase, profile };
}

/**
 * Stripe Connect onboarding / login link : réservé aux comptes éligibles espace prestataire catalogue.
 */
export async function assertOwnerStripeConnectEligible(
  user: User,
  supabase: SupabaseClient,
): Promise<boolean> {
  if (await isUserAdmin(user, supabase)) {
    return false;
  }
  const profile = await fetchAuthProfileRow(user.id, supabase);
  const userType = await getEffectiveUserType(user, async () =>
    profile ? { user_type: profile.user_type } : null,
  );
  const { data: myListings } = await supabase.from("gs_listings").select("id").eq("owner_id", user.id).limit(1);
  const hasCatalogListings = (myListings ?? []).length > 0;
  return canAccessOwnerDashboard(userType, hasCatalogListings);
}

export { isUserAdmin, type EffectiveUserType };
