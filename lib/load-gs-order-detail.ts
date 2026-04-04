import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

import { fetchListingCoverUrlMap } from "@/lib/gs-listing-cover-urls";

export type GsOrderDetailItem = {
  id: string;
  listing_id: string;
  title_snapshot: string;
  quantity: number;
  days_count: number;
  price_per_day_snapshot: number;
  line_total_eur: number;
  cover_url: string | null;
};

export type GsOrderDetailRow = {
  id: string;
  customer_id: string;
  provider_id: string | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
  location_total_eur: number;
  service_fee_eur: number;
  checkout_total_eur: number;
  deposit_amount_eur: number;
  stripe_payment_intent_id: string | null;
  payout_status: string | null;
  deposit_hold_status: string | null;
  deposit_payment_intent_id: string | null;
  created_at: string;
};

export type GsOrderDetailPayload = {
  viewerRole: "customer" | "provider";
  order: GsOrderDetailRow;
  items: GsOrderDetailItem[];
  customerLabel: string;
  providerLabel: string;
};

function profileLabel(row: { full_name?: string | null; first_name?: string | null } | null): string {
  if (!row) return "—";
  return row.full_name?.trim() || row.first_name?.trim() || "—";
}

export async function loadGsOrderDetailForViewer(
  orderId: string,
  viewerUserId: string
): Promise<GsOrderDetailPayload | null> {
  const supabase = await createClient();
  const { data: order, error } = await supabase
    .from("gs_orders")
    .select(
      "id, customer_id, provider_id, status, start_date, end_date, location_total_eur, service_fee_eur, checkout_total_eur, deposit_amount_eur, stripe_payment_intent_id, payout_status, deposit_hold_status, deposit_payment_intent_id, created_at"
    )
    .eq("id", orderId)
    .maybeSingle();

  if (error || !order) return null;

  const o = order as GsOrderDetailRow;
  const isCustomer = o.customer_id === viewerUserId;
  const isProvider = o.provider_id === viewerUserId;
  if (!isCustomer && !isProvider) return null;

  const { data: lines } = await supabase
    .from("gs_order_items")
    .select(
      "id, listing_id, title_snapshot, quantity, days_count, price_per_day_snapshot, line_total_eur"
    )
    .eq("order_id", orderId)
    .order("created_at", { ascending: true });

  const rawItems = (lines ?? []) as Omit<GsOrderDetailItem, "cover_url">[];
  const listingIds = [...new Set(rawItems.map((i) => i.listing_id))];
  const covers = await fetchListingCoverUrlMap(supabase, listingIds);

  const items: GsOrderDetailItem[] = rawItems.map((i) => ({
    ...i,
    cover_url: covers[i.listing_id] ?? null,
    quantity: Number(i.quantity),
    days_count: Number(i.days_count),
    price_per_day_snapshot: Number(i.price_per_day_snapshot),
    line_total_eur: Number(i.line_total_eur),
  }));

  const admin = createAdminClient();
  const { data: custData } = await admin
    .from("profiles")
    .select("full_name, first_name")
    .eq("id", o.customer_id)
    .maybeSingle();

  let provData: { full_name?: string | null; first_name?: string | null } | null = null;
  if (o.provider_id) {
    const { data } = await admin
      .from("profiles")
      .select("full_name, first_name")
      .eq("id", o.provider_id)
      .maybeSingle();
    provData = data as typeof provData;
  }

  const payload: GsOrderDetailPayload = {
    viewerRole: isCustomer ? "customer" : "provider",
    order: {
      ...o,
      location_total_eur: Number(o.location_total_eur),
      service_fee_eur: Number(o.service_fee_eur ?? 0),
      checkout_total_eur: Number(o.checkout_total_eur ?? 0),
      deposit_amount_eur: Number(o.deposit_amount_eur ?? 0),
    },
    items,
    customerLabel: profileLabel(custData as { full_name?: string | null; first_name?: string | null } | null),
    providerLabel: profileLabel(provData),
  };
  return payload;
}
