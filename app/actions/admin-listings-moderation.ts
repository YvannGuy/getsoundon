"use server";

import { revalidatePath } from "next/cache";

import { siteConfig } from "@/config/site";
import {
  sendGsListingDeactivatedProviderEmail,
  sendGsListingPublishedProviderEmail,
  sendGsListingRejectedProviderEmail,
} from "@/lib/email";
import { GS_LISTING_MODERATION } from "@/lib/gs-listing-moderation";
import { requireAdminOrThrow } from "@/lib/auth/admin-guard";
import { getAuthUserEmail } from "@/lib/auth-user-email";
import { createAdminClient } from "@/lib/supabase/admin";

export type AdminListingModerationDecision = "publish" | "hide" | "reject";

/**
 * Modération admin : publier, masquer ou refuser une annonce catalogue.
 * Ne pas utiliser pour les flux prestataire (PATCH API).
 */
export async function moderateGsListingAdminAction(
  listingId: string,
  decision: AdminListingModerationDecision,
  rejectionReason?: string | null
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    await requireAdminOrThrow();
  } catch {
    return { success: false, error: "Accès refusé." };
  }

  const admin = createAdminClient();
  const { data: row, error: fetchErr } = await admin
    .from("gs_listings")
    .select("id, owner_id, title, is_active, moderation_status, moderation_rejection_reason")
    .eq("id", listingId)
    .maybeSingle();

  if (fetchErr || !row) {
    return { success: false, error: "Annonce introuvable." };
  }

  const r = row as {
    id: string;
    owner_id: string;
    title: string;
    is_active: boolean | null;
    moderation_status: string | null;
    moderation_rejection_reason: string | null;
  };

  const mod = r.moderation_status ?? GS_LISTING_MODERATION.APPROVED;
  const wasActive = r.is_active === true;
  const title = r.title?.trim() || "Annonce";
  const siteBase = siteConfig.url.replace(/\/$/, "");
  const manageUrl = `${siteBase}/proprietaire/materiel/listing/${listingId}/reglages`;
  const catalogueUrl = `${siteBase}/catalogue`;

  const ownerEmail = await getAuthUserEmail(admin, r.owner_id);

  if (decision === "publish") {
    if (mod === GS_LISTING_MODERATION.APPROVED && wasActive) {
      return { success: false, error: "L’annonce est déjà publiée." };
    }
    const { error: upErr } = await admin
      .from("gs_listings")
      .update({
        moderation_status: GS_LISTING_MODERATION.APPROVED,
        is_active: true,
        moderation_rejection_reason: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", listingId);

    if (upErr) return { success: false, error: upErr.message };

    if (ownerEmail) {
      await sendGsListingPublishedProviderEmail(ownerEmail, {
        listingTitle: title,
        catalogueUrl,
        manageUrl,
        validatedByAdmin: true,
      }).catch(() => null);
    }

    revalidatePath("/admin/annonces-materiel");
    return { success: true };
  }

  if (decision === "hide") {
    if (mod !== GS_LISTING_MODERATION.APPROVED) {
      return {
        success: false,
        error: "Seules les annonces validées (non refusées, non en attente) peuvent être masquées ainsi. Utilisez « Refuser » pour un refus.",
      };
    }
    if (!wasActive) {
      return { success: false, error: "L’annonce est déjà masquée." };
    }
    const { error: upErr } = await admin
      .from("gs_listings")
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", listingId);

    if (upErr) return { success: false, error: upErr.message };

    if (ownerEmail) {
      await sendGsListingDeactivatedProviderEmail(ownerEmail, {
        listingTitle: title,
        manageUrl,
        deactivatedByAdmin: true,
      }).catch(() => null);
    }

    revalidatePath("/admin/annonces-materiel");
    return { success: true };
  }

  if (decision === "reject") {
    const reason = (rejectionReason ?? "").trim() || null;
    const { error: upErr } = await admin
      .from("gs_listings")
      .update({
        moderation_status: GS_LISTING_MODERATION.REJECTED,
        is_active: false,
        moderation_rejection_reason: reason,
        updated_at: new Date().toISOString(),
      })
      .eq("id", listingId);

    if (upErr) return { success: false, error: upErr.message };

    if (ownerEmail) {
      await sendGsListingRejectedProviderEmail(ownerEmail, {
        listingTitle: title,
        manageUrl,
        reason,
      }).catch(() => null);
    }

    revalidatePath("/admin/annonces-materiel");
    return { success: true };
  }

  return { success: false, error: "Action inconnue." };
}
