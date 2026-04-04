import { MergeGuestCartClient } from "@/components/panier/merge-guest-cart-client";
import { PanierGuestClient } from "@/components/panier/panier-guest-client";
import { PanierView, type PanierLine, type PanierOrderPayload } from "@/components/panier/panier-view";
import { fetchListingCoverUrlMap } from "@/lib/gs-listing-cover-urls";
import { getStripe } from "@/lib/stripe";
import { refreshStaleGsOrderCheckoutSession } from "@/lib/gs-orders-stale-checkout";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Panier | GetSoundOn",
};

export default async function PanierPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = (await searchParams) ?? {};
  const stripeCancelled = sp.orderCancel === "1";
  const mergeGuest = sp.mergeGuest === "1" || sp.mergeGuest === "true";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <PanierGuestClient stripeCheckoutCancelled={stripeCancelled} />;
  }

  await refreshStaleGsOrderCheckoutSession(user.id);

  const { data: pendingOrder } = await supabase
    .from("gs_orders")
    .select(
      "id, status, start_date, end_date, location_total_eur, service_fee_eur, checkout_total_eur, deposit_amount_eur, provider_id, stripe_checkout_session_id"
    )
    .eq("customer_id", user.id)
    .eq("status", "pending_payment")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let order = pendingOrder;
  if (!order) {
    const { data: draftOrder } = await supabase
      .from("gs_orders")
      .select(
        "id, status, start_date, end_date, location_total_eur, service_fee_eur, checkout_total_eur, deposit_amount_eur, provider_id, stripe_checkout_session_id"
      )
      .eq("customer_id", user.id)
      .eq("status", "draft")
      .maybeSingle();
    order = draftOrder;
  }

  const o = order as {
    id: string;
    status: string;
    start_date: string | null;
    end_date: string | null;
    location_total_eur: number | string;
    service_fee_eur: number | string;
    checkout_total_eur: number | string;
    deposit_amount_eur: number | string;
    provider_id: string | null;
    stripe_checkout_session_id: string | null;
  } | null;

  if (!o) {
    return <PanierView loggedIn initial={null} stripeCheckoutCancelled={stripeCancelled} />;
  }

  const { data: items } = await supabase
    .from("gs_order_items")
    .select(
      "id, listing_id, title_snapshot, price_per_day_snapshot, quantity, days_count, line_total_eur"
    )
    .eq("order_id", o.id)
    .order("created_at", { ascending: true });

  const rawLines = (items ?? []) as Omit<PanierLine, "cover_url">[];
  const listingIds = [...new Set(rawLines.map((r) => r.listing_id))];
  const covers = await fetchListingCoverUrlMap(supabase, listingIds);
  const lineRows: PanierLine[] = rawLines.map((r) => ({
    ...r,
    cover_url: covers[r.listing_id] ?? null,
  }));

  let providerLabel: string | null = null;
  if (o.provider_id) {
    const admin = createAdminClient();
    const { data: prof } = await admin
      .from("profiles")
      .select("full_name, first_name")
      .eq("id", o.provider_id)
      .maybeSingle();
    const pr = prof as { full_name?: string | null; first_name?: string | null } | null;
    providerLabel = pr?.full_name?.trim() || pr?.first_name?.trim() || "Prestataire";
  }

  let stripeCheckoutResumeUrl: string | null = null;
  if (o.status === "pending_payment" && o.stripe_checkout_session_id) {
    try {
      const stripe = getStripe();
      const session = await stripe.checkout.sessions.retrieve(o.stripe_checkout_session_id);
      if (session.status === "open" && session.url) {
        stripeCheckoutResumeUrl = session.url;
      }
    } catch {
      stripeCheckoutResumeUrl = null;
    }
  }

  const payload: PanierOrderPayload = {
    id: o.id,
    status: o.status,
    start_date: o.start_date,
    end_date: o.end_date,
    location_total_eur: Number(o.location_total_eur),
    service_fee_eur: Number(o.service_fee_eur),
    checkout_total_eur: Number(o.checkout_total_eur),
    deposit_amount_eur: Number(o.deposit_amount_eur),
    provider_id: o.provider_id,
    provider_label: providerLabel,
    stripe_checkout_resume_url: stripeCheckoutResumeUrl,
    items: lineRows,
  };

  return (
    <>
      <MergeGuestCartClient enabled={mergeGuest} />
      <PanierView loggedIn initial={payload} stripeCheckoutCancelled={stripeCancelled} />
    </>
  );
}
