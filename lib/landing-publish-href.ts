import type { SupabaseClient, User } from "@supabase/supabase-js";

import type { EffectiveUserType } from "@/lib/auth-utils";
import {
  getDashboardHref,
  getEffectiveUserType,
  getPublishMaterialListingHref,
} from "@/lib/auth-utils";
import { fetchAuthProfileRow } from "@/lib/fetch-auth-profile";
import type { DraftCartPreview } from "@/lib/gs-draft-cart-preview";
import { getDraftCartPreviewForUser } from "@/lib/gs-draft-cart-preview";

/** Pour footer / shell landing : même règle que la sidebar dashboard (prestataire vs inscription). */
export async function resolvePublishListingHref(
  user: User | null,
  supabase: SupabaseClient,
): Promise<string> {
  if (!user) return getPublishMaterialListingHref(null, false, false);

  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  const isAdminByEnv =
    adminEmails.length > 0 && adminEmails.includes(user.email?.toLowerCase() ?? "");

  const profileRow = await fetchAuthProfileRow(user.id, supabase);

  const userType = isAdminByEnv
    ? "admin"
    : await getEffectiveUserType(user, async () =>
        profileRow ? { user_type: profileRow.user_type } : null,
      );

  const { data: myListings } = await supabase
    .from("gs_listings")
    .select("id")
    .eq("owner_id", user.id)
    .limit(1);
  const hasCatalogListings = (myListings ?? []).length > 0;

  return getPublishMaterialListingHref(userType, hasCatalogListings, true);
}

/** Header landing : lien « publier » + tableau de bord si connecté (aligné sur le footer). */
export async function getLandingHeaderProps(
  user: User | null,
  supabase: SupabaseClient,
): Promise<{
  publishListingHref: string;
  dashboardHref?: string;
  userType?: EffectiveUserType;
  draftCartPreview?: DraftCartPreview | null;
  accountAvatarUrl?: string | null;
  accountDisplayName?: string | null;
  accountEmail?: string | null;
}> {
  const publishListingHref = await resolvePublishListingHref(user, supabase);
  if (!user) return { publishListingHref };

  const profileRow = await fetchAuthProfileRow(user.id, supabase);

  const userType = await getEffectiveUserType(user, async () =>
    profileRow ? { user_type: profileRow.user_type } : null,
  );

  const effective = (userType ?? "seeker") as EffectiveUserType;

  const draftCartPreview = await getDraftCartPreviewForUser(user.id);

  const meta = user.user_metadata as Record<string, unknown> | undefined;
  const avatarFromMeta =
    (typeof meta?.avatar_url === "string" && meta.avatar_url.trim()) ||
    (typeof meta?.picture === "string" && meta.picture.trim()) ||
    null;
  const accountDisplayName =
    profileRow?.full_name?.trim() ||
    profileRow?.first_name?.trim() ||
    (typeof meta?.full_name === "string" ? meta.full_name.trim() : null) ||
    null;

  return {
    publishListingHref,
    dashboardHref: getDashboardHref(effective),
    userType: effective,
    draftCartPreview,
    accountAvatarUrl: avatarFromMeta,
    accountDisplayName,
    accountEmail: user.email ?? null,
  };
}
