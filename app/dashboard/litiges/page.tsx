import { AdminEvidenceViewer } from "@/components/etats-des-lieux/admin-evidence-viewer";
import { SeekerDisputeResponseForm } from "@/components/etats-des-lieux/seeker-dispute-response-form";
import { Card, CardContent } from "@/components/ui/card";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type OfferRow = {
  id: string;
  salle_id: string;
  owner_id: string;
  amount_cents: number;
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

export default async function SeekerLitigesPage({
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
    .select("id, salle_id, owner_id, amount_cents, created_at")
    .eq("seeker_id", user.id)
    .eq("status", "paid")
    .order("created_at", { ascending: false })
    .limit(200);

  const offerRows = (offers ?? []) as OfferRow[];
  const filteredOffers = offerId ? offerRows.filter((o) => o.id === offerId) : offerRows;
  const offerIds = filteredOffers.map((o) => o.id);

  const { data: disputes } =
    offerIds.length > 0
      ? await admin
          .from("refund_cases")
          .select("id, offer_id, status, side, reason, created_at")
          .eq("case_type", "dispute")
          .eq("side", "owner")
          .in("offer_id", offerIds)
          .order("created_at", { ascending: false })
      : { data: [] as DisputeRow[] };
  const disputeRows = (disputes ?? []) as DisputeRow[];
  const disputeIds = disputeRows.map((d) => d.id);

  const [{ data: evidences }, { data: salles }, { data: owners }] = await Promise.all([
    disputeIds.length > 0
      ? admin
          .from("refund_case_evidences")
          .select("id, case_id, storage_path, uploaded_by, description")
          .in("case_id", disputeIds)
      : Promise.resolve({ data: [] as EvidenceRow[] }),
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
            [...new Set(filteredOffers.map((o) => o.owner_id))]
          )
      : Promise.resolve({ data: [] as { id: string; full_name: string | null; email: string | null }[] }),
  ]);

  const evidenceRows = (evidences ?? []) as EvidenceRow[];
  const fileUrlMap = new Map<string, string>();
  for (const row of evidenceRows) {
    const { data } = await admin.storage.from("etat-des-lieux").createSignedUrl(row.storage_path, 60 * 60);
    if (data?.signedUrl) fileUrlMap.set(row.id, data.signedUrl);
  }

  const disputeByOffer = new Map<string, DisputeRow>();
  for (const row of disputeRows) {
    if (!row.offer_id || disputeByOffer.has(row.offer_id)) continue;
    disputeByOffer.set(row.offer_id, row);
  }
  const evidencesByCase = new Map<string, EvidenceRow[]>();
  for (const row of evidenceRows) {
    const list = evidencesByCase.get(row.case_id) ?? [];
    list.push(row);
    evidencesByCase.set(row.case_id, list);
  }
  const salleMap = new Map((salles ?? []).map((s) => [s.id, s.name]));
  const ownerMap = new Map((owners ?? []).map((o) => [o.id, o.full_name || o.email || "Propriétaire"]));

  const rowsWithDispute = filteredOffers.filter((offer) => disputeByOffer.has(offer.id));

  return (
    <div className="space-y-5 p-4 pb-24 md:space-y-6 md:p-8 md:pb-8">
      <div>
        <h1 className="text-xl font-bold text-black md:text-2xl">Litiges</h1>
        <p className="mt-1 text-sm text-slate-600 md:text-base">
          Consultez les litiges ouverts par le propriétaire et ajoutez votre contestation.
        </p>
      </div>

      <div className="space-y-4">
        {rowsWithDispute.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-slate-500">
              Aucun litige ouvert par un propriétaire pour le moment.
            </CardContent>
          </Card>
        ) : (
          rowsWithDispute.map((offer) => {
            const dispute = disputeByOffer.get(offer.id)!;
            const evidenceList = evidencesByCase.get(dispute.id) ?? [];
            const ownerPhotos = evidenceList
              .filter((e) => e.uploaded_by === offer.owner_id)
              .map((e) => ({ id: e.id, url: fileUrlMap.get(e.id) ?? "" }))
              .filter((e) => !!e.url);
            const seekerPhotos = evidenceList
              .filter((e) => e.uploaded_by === user.id)
              .map((e) => ({ id: e.id, url: fileUrlMap.get(e.id) ?? "" }))
              .filter((e) => !!e.url);
            const seekerText = evidenceList.find((e) => e.uploaded_by === user.id && e.description)?.description ?? null;

            return (
              <details key={offer.id} open className="rounded-xl border border-slate-200 bg-white p-4 md:p-5">
                <summary className="cursor-pointer list-none">
                  <p className="text-base font-semibold text-black md:text-lg">
                    {salleMap.get(offer.salle_id) ?? "Salle"} • {(offer.amount_cents / 100).toFixed(2)} €
                  </p>
                  <p className="mt-1 text-xs text-slate-500 md:text-sm">
                    Propriétaire : {ownerMap.get(offer.owner_id) ?? "—"} • Offre : {offer.id}
                  </p>
                </summary>

                <div className="mt-4 space-y-3">
                  <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
                    <p className="text-sm font-semibold text-slate-900">
                      Statut litige: {STATUS_LABEL[dispute.status]}
                    </p>
                    {dispute.reason && (
                      <p className="mt-1 text-sm text-slate-700">Motif propriétaire: {dispute.reason}</p>
                    )}
                    {seekerText && (
                      <p className="mt-1 text-sm text-slate-700">Votre contestation: {seekerText}</p>
                    )}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <AdminEvidenceViewer label="Voir preuves propriétaire" photos={ownerPhotos} />
                      <AdminEvidenceViewer label="Voir vos preuves" photos={seekerPhotos} />
                    </div>
                  </div>

                  {dispute.status === "open" ? (
                    <SeekerDisputeResponseForm offerId={offer.id} />
                  ) : (
                    <p className="text-xs text-slate-600">Le litige est clôturé, la contestation est désactivée.</p>
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
