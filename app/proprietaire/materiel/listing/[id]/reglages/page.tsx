import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { GsListingReglagesEditor } from "@/components/materiel/gs-listing-reglages-editor";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserOrNull } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

export default async function GsListingReglagesPage(props: PageProps) {
  const { id } = await props.params;
  const { user } = await getUserOrNull();
  if (!user) redirect("/auth");

  const admin = createAdminClient();
  const { data: listing, error } = await admin
    .from("gs_listings")
    .select("id, owner_id, title, deposit_amount, immediate_confirmation, cancellation_policy")
    .eq("id", id)
    .maybeSingle();

  if (error || !listing) notFound();
  const row = listing as {
    owner_id: string;
    title: string;
    deposit_amount: number | string | null;
    immediate_confirmation: boolean | null;
    cancellation_policy: string | null;
  };
  if (row.owner_id !== user.id) notFound();

  const { data: prof } = await admin
    .from("profiles")
    .select("stripe_account_id")
    .eq("id", user.id)
    .maybeSingle();
  const stripeConnectReady = !!(
    (prof as { stripe_account_id?: string | null } | null)?.stripe_account_id
  );

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <p className="mb-4 text-sm text-slate-500">
        <Link href="/proprietaire/materiel" className="text-gs-orange hover:underline">
          ← Matériel — Location
        </Link>
      </p>
      <GsListingReglagesEditor
        listingId={id}
        listingTitle={row.title}
        initialDeposit={Number(row.deposit_amount ?? 0)}
        initialImmediate={row.immediate_confirmation === true}
        initialCancellationPolicy={row.cancellation_policy}
        stripeConnectReady={stripeConnectReady}
      />
    </div>
  );
}
