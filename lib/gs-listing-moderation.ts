/** Statut de modération admin — colonne `gs_listings.moderation_status`. */
export const GS_LISTING_MODERATION = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
} as const;

export type GsListingModerationStatus = (typeof GS_LISTING_MODERATION)[keyof typeof GS_LISTING_MODERATION];

export function isGsListingVisibleOnCatalogue(row: {
  is_active?: boolean | null;
  moderation_status?: string | null;
}): boolean {
  return (
    row.moderation_status === GS_LISTING_MODERATION.APPROVED && row.is_active === true
  );
}
