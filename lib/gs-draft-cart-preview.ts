import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

import { fetchListingCoverUrlMap } from "@/lib/gs-listing-cover-urls";

export type DraftCartPreviewLine = {
  id: string;
  listing_id: string;
  title_snapshot: string;
  quantity: number;
  line_total_eur: number;
  cover_url: string | null;
};

export type DraftCartPreview = {
  orderId: string;
  providerLabel: string | null;
  locationTotalEur: number;
  lines: DraftCartPreviewLine[];
  /** Somme des quantités (badge header). */
  units: number;
};

/**
 * Aperçu panier brouillon pour header / dropdown (RLS client).
 */
export async function getDraftCartPreviewForUser(userId: string): Promise<DraftCartPreview | null> {
  const supabase = await createClient();
  const { data: order } = await supabase
    .from("gs_orders")
    .select("id, provider_id, location_total_eur")
    .eq("customer_id", userId)
    .eq("status", "draft")
    .maybeSingle();

  const oid = (order as { id?: string; provider_id?: string | null; location_total_eur?: number | string } | null)
    ?.id;
  if (!oid) return null;

  const { data: items } = await supabase
    .from("gs_order_items")
    .select("id, listing_id, title_snapshot, quantity, line_total_eur")
    .eq("order_id", oid)
    .order("created_at", { ascending: true });

  const rows = (items ?? []) as {
    id: string;
    listing_id: string;
    title_snapshot: string;
    quantity: number;
    line_total_eur: number;
  }[];

  let units = 0;
  for (const r of rows) {
    units += Math.max(0, Math.floor(Number(r.quantity)));
  }

  const listingIds = [...new Set(rows.map((r) => r.listing_id))];
  const covers = await fetchListingCoverUrlMap(supabase, listingIds);

  let providerLabel: string | null = null;
  const providerId = (order as { provider_id?: string | null }).provider_id;
  if (providerId) {
    const admin = createAdminClient();
    const { data: prof } = await admin
      .from("profiles")
      .select("full_name, first_name")
      .eq("id", providerId)
      .maybeSingle();
    const pr = prof as { full_name?: string | null; first_name?: string | null } | null;
    providerLabel = pr?.full_name?.trim() || pr?.first_name?.trim() || "Prestataire";
  }

  const lines: DraftCartPreviewLine[] = rows.map((r) => ({
    id: r.id,
    listing_id: r.listing_id,
    title_snapshot: r.title_snapshot,
    quantity: Math.max(1, Math.floor(Number(r.quantity))),
    line_total_eur: Number(r.line_total_eur),
    cover_url: covers[r.listing_id] ?? null,
  }));

  return {
    orderId: oid,
    providerLabel,
    locationTotalEur: Number((order as { location_total_eur?: number | string }).location_total_eur ?? 0),
    lines,
    units,
  };
}
