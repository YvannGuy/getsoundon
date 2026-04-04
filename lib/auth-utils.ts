import type { User } from "@supabase/supabase-js";

export type EffectiveUserType = "admin" | "owner" | "seeker";

function normalizeUserType(raw: string | null | undefined): string {
  return (raw ?? "").trim().toLowerCase();
}

/**
 * Détermine le type effectif de l'utilisateur (admin, owner, seeker).
 * La source de vérité pour le menu header / dashboard est **`profiles.user_type`** dès qu’une ligne profil existe.
 * Les métadonnées auth ne peuvent **pas** promouvoir « owner » si un profil existe (corrige locataires avec ancien tab prestataire).
 */
export async function getEffectiveUserType(
  user: User | null,
  getProfile: (userId: string) => Promise<{ user_type: string | null } | null>
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

  const profile = await getProfile(user.id);
  const fromDb = normalizeUserType(profile?.user_type ?? undefined);

  if (fromDb === "admin") return "admin";
  if (fromDb === "owner") return "owner";
  if (fromDb === "seeker") return "seeker";

  // Ligne `profiles` présente mais user_type vide ou inattendu → locataire (pas de repli metadata « owner »)
  if (profile != null) {
    return "seeker";
  }

  // Aucune ligne profil (fenêtre très courte après signup, avant trigger) : métadonnées uniquement
  const meta = normalizeUserType(
    typeof user.user_metadata?.user_type === "string" ? user.user_metadata.user_type : undefined
  );
  if (meta === "owner") return "owner";
  if (meta === "admin") return "admin";

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
