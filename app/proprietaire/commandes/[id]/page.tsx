import DashboardMaterielBookingPage from "@/app/dashboard/materiel/[id]/page";

export const dynamic = "force-dynamic";

export default function ProprietaireCommandeDetailPage(
  props: Parameters<typeof DashboardMaterielBookingPage>[0]
) {
  return <DashboardMaterielBookingPage {...props} />;
}
