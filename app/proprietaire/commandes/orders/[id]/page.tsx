import DashboardMaterielOrderPage from "@/app/dashboard/materiel/orders/[id]/page";

export const dynamic = "force-dynamic";

export default function ProprietaireCommandeOrderDetailPage(
  props: Parameters<typeof DashboardMaterielOrderPage>[0]
) {
  return <DashboardMaterielOrderPage {...props} />;
}
