import { AdminEvidenceViewer } from "@/components/etats-des-lieux/admin-evidence-viewer";
import { OwnerOpenDisputeForm } from "@/components/etats-des-lieux/owner-open-dispute-form";
import { Card, CardContent } from "@/components/ui/card";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type OfferRow = {
  id: string;
  salle_id: string;
  seeker_id: string;
  amount_cents: number;
  deposit_amount_cents: number | null;
  created_at: string;
};

type DisputeRow = {
  id: string;
  offer_id: string | null;
  status: "open" | "resolved" | "rejected";
  side: "owner" | "seeker" | "none";
  reason: string | null;
  created_at: string;
};

type EvidenceRow = {
  id: string;
  case_id: string;
  storage_path: string;
  uploaded_by: string | null;
  description: string | null;
};

const STATUS_LABEL: Record<DisputeRow["status"], string> = {
  open: "Ouvert",
  resolved: "Résolu",
  rejected: "Rejeté",
};

export const dynamic = "force-dynamic";

export default async function ProprietaireLitigesPage({
  searchParams,
}: {
  searchParams: Promise<{ offerId?: string }>;
}) {
  const { offerId } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = createAdminClient();
  const { data: offers } = await admin
    .from("offers")
    .select("id, salle_id, seeker_id, amount_cents, deposit_amount_cents, created_at")
    .eq("owner_id", user.id)
    .eq("status", "paid")
    .order("created_at", { ascending: false })
    .limit(200);

  const offerRows = (offers ?? []) as OfferRow[];
  const filteredOffers = offerId ? offerRows.filter((o) => o.id === offerId) : offerRows;
  const offerIds = filteredOffers.map((o) => o.id);

  const [{ data: disputes }, { data: salles }, { data: seekers }] = await Promise.all([
    offerIds.length > 0
      ? admin
          .from("refund_cases")
          .select("id, offer_id, status, side, reason, created_at")
          .eq("case_type", "dispute")
          .in("offer_id", offerIds)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] as DisputeRow[] }),
    filteredOffers.length > 0
      ? admin
          .from("salles")
          .select("id, name")
          .in(
            "id",
            [...new Set(filteredOffers.map((o) => o.salle_id))]
          )
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    filteredOffers.length > 0
      ? admin
          .from("profiles")
          .select("id, full_name, email")
          .in(
            "id",
            [...new Set(filteredOffers.map((o) => o.seeker_id))]
          )
      : Promise.resolve({ data: [] as { id: string; full_name: string | null; email: string | null }[] }),
  ]);

  const disputeRows = (disputes ?? []) as DisputeRow[];
  const disputeIds = disputeRows.map((d) => d.id);
  const { data: evidences } =
    disputeIds.length > 0
      ? await admin
          .from("refund_case_evidences")
          .select("id, case_id, storage_path, uploaded_by, description")
          .in("case_id", disputeIds)
      : { data: [] as EvidenceRow[] };
  const evidenceRows = (evidences ?? []) as EvidenceRow[];

  const fileUrlMap = new Map<string, string>();
  for (const row of evidenceRows) {
    const { data } = await admin.storage.from("etat-des-lieux").createSignedUrl(row.storage_path, 60 * 60);
    if (data?.signedUrl) fileUrlMap.set(row.id, data.signedUrl);
  }

  const salleMap = new Map((salles ?? []).map((s) => [s.id, s.name]));
  const seekerMap = new Map((seekers ?? []).map((s) => [s.id, s.full_name || s.email || "Locataire"]));
  const disputesByOffer = new Map<string, DisputeRow[]>();
  for (const row of disputeRows) {
    if (!row.offer_id) continue;
    const list = disputesByOffer.get(row.offer_id) ?? [];
    list.push(row);
    disputesByOffer.set(row.offer_id, list);
  }
  const evidencesByCase = new Map<string, EvidenceRow[]>();
  for (const row of evidenceRows) {
    const list = evidencesByCase.get(row.case_id) ?? [];
    list.push(row);
    evidencesByCase.set(row.case_id, list);
  }

  return (
    <div className="space-y-5 p-4 pb-24 md:space-y-6 md:p-8 md:pb-8">
      <div>
        <h1 className="text-xl font-bold text-black md:text-2xl">Litiges</h1>
        <p className="mt-1 text-sm text-slate-600 md:text-base">
          Ouvrez un litige depuis cette section, puis suivez les preuves des deux parties.
        </p>
      </div>

      <div className="space-y-4">
        {filteredOffers.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-slate-500">
              Aucune réservation trouvée.
            </CardContent>
          </Card>
        ) : (
          filteredOffers.map((offer) => {
            const disputesForOffer = disputesByOffer.get(offer.id) ?? [];
            const activeDispute = disputesForOffer.find((d) => d.status === "open") ?? disputesForOffer[0] ?? null;
            const hasOpenDispute = !!disputesForOffer.find((d) => d.status === "open");
            const evidenceList = activeDispute ? evidencesByCase.get(activeDispute.id) ?? [] : [];
            const ownerPhotos = evidenceList
              .filter((e) => e.uploaded_by === user.id)
              .map((e) => ({ id: e.id, url: fileUrlMap.get(e.id) ?? "" }))
              .filter((e) => !!e.url);
            const seekerPhotos = evidenceList
              .filter((e) => e.uploaded_by === offer.seeker_id)
              .map((e) => ({ id: e.id, url: fileUrlMap.get(e.id) ?? "" }))
              .filter((e) => !!e.url);

            return (
              <details key={offer.id} open className="rounded-xl border border-slate-200 bg-white p-4 md:p-5">
                <summary className="cursor-pointer list-none">
                  <p className="text-base font-semibold text-black md:text-lg">
                    {salleMap.get(offer.salle_id) ?? "Salle"} • {(offer.amount_cents / 100).toFixed(2)} €
                  </p>
                  <p className="mt-1 text-xs text-slate-500 md:text-sm">
                    Locataire : {seekerMap.get(offer.seeker_id) ?? "—"} • Offre : {offer.id}
                  </p>
                </summary>

                <div className="mt-4 space-y-3">
                  {activeDispute ? (
                    <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
                      <p className="text-sm font-semibold text-slate-900">
                        Statut litige: {STATUS_LABEL[activeDispute.status]}
                      </p>
                      {activeDispute.reason && (
                        <p className="mt-1 text-sm text-slate-700">Votre motif: {activeDispute.reason}</p>
                      )}
                      <div className="mt-3 flex flex-wrap gap-2">
                        <AdminEvidenceViewer label="Voir preuves propriétaire" photos={ownerPhotos} />
                        <AdminEvidenceViewer label="Voir preuves locataire" photos={seekerPhotos} />
                      </div>
                    </div>
                  ) : null}

                  {!hasOpenDispute ? (
                    <OwnerOpenDisputeForm offerId={offer.id} />
                  ) : (
                    <p className="text-xs text-slate-600">
                      Un litige est déjà ouvert pour cette réservation.
                    </p>
                  )}
                </div>
              </details>
            );
          })
        )}
      </div>
    </div>
  );
}
