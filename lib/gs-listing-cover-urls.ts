import type { SupabaseClient } from "@supabase/supabase-js";

type ImageRow = {
  listing_id: string;
  url: string;
  is_cover: boolean | null;
  position: number | null;
};

/** Une URL de couverture par listing (priorité `is_cover`, sinon plus petite `position`). */
export async function fetchListingCoverUrlMap(
  supabase: SupabaseClient,
  listingIds: string[]
): Promise<Record<string, string | null>> {
  const out: Record<string, string | null> = {};
  if (listingIds.length === 0) return out;

  const { data, error } = await supabase
    .from("gs_listing_images")
    .select("listing_id, url, is_cover, position")
    .in("listing_id", listingIds);

  if (error || !data?.length) return out;

  const byListing = new Map<string, ImageRow[]>();
  for (const row of data as ImageRow[]) {
    const list = byListing.get(row.listing_id) ?? [];
    list.push(row);
    byListing.set(row.listing_id, list);
  }

  for (const [lid, rows] of byListing) {
    const cover = rows.find((r) => r.is_cover === true);
    if (cover?.url) {
      out[lid] = cover.url;
      continue;
    }
    const sorted = [...rows].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    out[lid] = sorted[0]?.url ?? null;
  }

  return out;
}
