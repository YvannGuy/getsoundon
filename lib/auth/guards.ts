/**
 * Garde-fous auth / autorisation — à utiliser dans Server Actions et Route Handlers.
 * S’appuie sur getUserOrNull (session cookies) et les règles métier existantes (admin-access, auth-utils).
 */

import "server-only";

import type { SupabaseClient, User } from "@supabase/supabase-js";

import { getEffectiveUserType, type EffectiveUserType } from "@/lib/auth-utils";
import { requireAdminOrThrow, type AdminContext } from "@/lib/auth/admin-guard";
import { fetchAuthProfileRow } from "@/lib/fetch-auth-profile";
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
