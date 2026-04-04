import { notFound, redirect } from "next/navigation";

import { GsOrderDetailView } from "@/components/materiel/gs-order-detail-view";
import { loadGsOrderDetailForViewer } from "@/lib/load-gs-order-detail";
import { getUserOrNull } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ProprietaireMaterielOrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const sp = (await searchParams) ?? {};
  const paid = sp.paid === "1";

  const { user } = await getUserOrNull();
  if (!user) {
    redirect(`/auth?tab=login&next=/proprietaire/materiel/orders/${id}`);
  }

  const vm = await loadGsOrderDetailForViewer(id, user.id);
  if (!vm || vm.viewerRole !== "provider") {
    notFound();
  }

  return (
    <GsOrderDetailView
      vm={vm}
      paidQuery={paid}
      backHref="/proprietaire/materiel"
      backLabel="Locations matériel"
    />
  );
}
