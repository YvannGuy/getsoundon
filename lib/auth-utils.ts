import type { User } from "@supabase/supabase-js";

export type EffectiveUserType = "admin" | "owner" | "seeker";

/**
 * Détermine le type effectif de l'utilisateur (admin, owner, seeker).
 * Admin : ADMIN_EMAILS ou profiles.user_type = 'admin'
 * Owner : profiles.user_type = 'owner' ou user_metadata.user_type = 'owner'
 * Seeker : par défaut
 */
export async function getEffectiveUserType(
  user: User | null,
  getProfile: (userId: string) => Promise<{ user_type: string } | null>
): Promise<EffectiveUserType | null> {
  if (!user) return null;

  // 1. Admin par ADMIN_EMAILS
  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (adminEmails.length > 0 && adminEmails.includes(user.email?.toLowerCase() ?? "")) {
    return "admin";
  }

  // 2. Admin ou owner par profil
  const profile = await getProfile(user.id);
  if (profile?.user_type === "admin") return "admin";
  if (profile?.user_type === "owner") return "owner";

  // 3. Fallback user_metadata (inscription)
  const meta = user.user_metadata?.user_type;
  if (meta === "owner") return "owner";

  return "seeker";
}

export function getDashboardHref(type: EffectiveUserType): string {
  switch (type) {
    case "admin":
      return "/admin";
    case "owner":
      return "/proprietaire";
    default:
      return "/dashboard";
  }
}

/**
 * Accès espace prestataire : profil owner ou au moins une annonce catalogue (`gs_listings`).
 */
export function canAccessOwnerDashboard(
  userType: EffectiveUserType | null,
  hasCatalogListings: boolean
): boolean {
  if (!userType || userType === "admin") return false;
  return userType === "owner" || hasCatalogListings;
}

/**
 * Lien « publier une annonce matériel » : espace prestataire si éligible, sinon inscription loueur.
 */
export function getPublishMaterialListingHref(
  userType: EffectiveUserType | null,
  hasCatalogListings: boolean,
  isLoggedIn: boolean,
): string {
  if (!isLoggedIn) return "/auth?tab=signup&userType=owner";
  if (canAccessOwnerDashboard(userType, hasCatalogListings)) {
    return "/proprietaire/ajouter-annonce";
  }
  return "/auth?tab=signup&userType=owner";
}
