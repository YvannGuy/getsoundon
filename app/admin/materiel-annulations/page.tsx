import type { Metadata } from "next";

import { getGsCancellationRequestsForAdmin } from "@/app/actions/gs-booking-cancellation";
import { AdminMaterielCancellationsClient } from "@/components/admin/admin-materiel-cancellations-client";

export const metadata: Metadata = {
  title: "Annulations matériel | Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminMaterielAnnulationsPage() {
  const rows = await getGsCancellationRequestsForAdmin();

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <h1 className="text-2xl font-bold text-slate-900">Demandes d&apos;annulation — matériel</h1>
      <p className="mt-1 max-w-2xl text-sm text-slate-600">
        Revue des demandes clients (gs_bookings). La politique affichée provient de l&apos;annonce ; la
        décision finale reste manuelle.
      </p>
      <div className="mt-8">
        <AdminMaterielCancellationsClient rows={rows} />
      </div>
    </div>
  );
}
