import Link from "next/link";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { AlertTriangle, CheckCircle2, Package } from "lucide-react";

import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type IncidentRow = {
  id: string;
  listing_id: string;
  customer_id: string;
  provider_id: string;
  start_date: string;
  end_date: string;
  total_price: number | string;
  deposit_amount: number | string | null;
  status: string;
  payout_status: string | null;
  deposit_hold_status: string | null;
  incident_status: string;
  incident_at: string | null;
  incident_comment: string | null;
  incident_amount_requested: number | string | null;
};

type ProfileRow = { id: string; full_name: string | null; email: string | null };
type ListingRow = { id: string; title: string };

const INCIDENT_LABEL: Record<string, string> = {
  open: "Ouvert",
  resolved: "Validé",
  dismissed: "Rejeté",
};

const INCIDENT_CLASS: Record<string, string> = {
  open: "bg-amber-100 text-amber-700",
  resolved: "bg-emerald-100 text-emerald-700",
  dismissed: "bg-slate-100 text-slate-600",
};

function formatDate(iso: string | null) {
  if (!iso) return "—";
  try {
    return format(new Date(iso), "d MMM yyyy à HH:mm", { locale: fr });
  } catch {
    return iso;
  }
}

export default async function AdminIncidentsMaterielPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  const filter = params.status === "resolved" || params.status === "dismissed" ? params.status : "open";

  const admin = createAdminClient();

  const { data: incidents } = await admin
    .from("gs_bookings")
    .select(
      "id, listing_id, customer_id, provider_id, start_date, end_date, total_price, deposit_amount, status, payout_status, deposit_hold_status, incident_status, incident_at, incident_comment, incident_amount_requested"
    )
    .eq("incident_status", filter)
    .order("incident_at", { ascending: false })
    .limit(50);

  const rows = (incidents ?? []) as IncidentRow[];

  // Profils
  const allIds = [...new Set([...rows.map((r) => r.customer_id), ...rows.map((r) => r.provider_id)])];
  let profilesMap: Record<string, ProfileRow> = {};
  if (allIds.length > 0) {
    const { data: profiles } = await admin.from("profiles").select("id, full_name, email").in("id", allIds);
    for (const p of (profiles ?? []) as ProfileRow[]) profilesMap[p.id] = p;
  }

  // Listings
  const listingIds = [...new Set(rows.map((r) => r.listing_id))];
  let listingsMap: Record<string, ListingRow> = {};
  if (listingIds.length > 0) {
    const { data: listings } = await admin.from("gs_listings").select("id, title").in("id", listingIds);
    for (const l of (listings ?? []) as ListingRow[]) listingsMap[l.id] = l;
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <div className="mb-6 flex items-center gap-3">
        <AlertTriangle className="h-6 w-6 text-amber-500" />
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Incidents matériel</h1>
          <p className="text-sm text-slate-500">Incidents signalés sur les réservations matériel</p>
        </div>
      </div>

      {/* Filtres */}
      <div className="mb-6 flex gap-2">
        {(["open", "resolved", "dismissed"] as const).map((s) => (
          <Link
            key={s}
            href={`/admin/incidents-materiel?status=${s}`}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
              filter === s
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {INCIDENT_LABEL[s]} {s === "open" ? `(${rows.length})` : ""}
          </Link>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="flex items-center gap-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-slate-500">
          <Package className="h-6 w-6 shrink-0 text-slate-300" />
          Aucun incident {INCIDENT_LABEL[filter].toLowerCase()} pour le moment.
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => {
            const listing = listingsMap[row.listing_id];
            const customer = profilesMap[row.customer_id];
            const provider = profilesMap[row.provider_id];
            const totalEur = Number(row.total_price);
            const depositEur = Number(row.deposit_amount ?? 0);
            const amountRequested = Number(row.incident_amount_requested ?? 0);

            return (
              <li key={row.id} className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${INCIDENT_CLASS[row.incident_status]}`}
                      >
                        {INCIDENT_LABEL[row.incident_status]}
                      </span>
                      {row.incident_status === "open" && (
                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-700">
                          Action requise
                        </span>
                      )}
                    </div>
                    <p className="mt-2 font-bold text-slate-900">
                      {listing?.title ?? `Réservation ${row.id.slice(0, 8)}`}
                    </p>
                    <p className="mt-0.5 text-sm text-slate-500">
                      {format(new Date(row.start_date), "d MMM", { locale: fr })} —{" "}
                      {format(new Date(row.end_date), "d MMM yyyy", { locale: fr })}
                    </p>
                    <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-[12px] text-slate-500">
                      <span>Client : {customer?.full_name ?? customer?.email ?? "—"}</span>
                      <span>Prestataire : {provider?.full_name ?? provider?.email ?? "—"}</span>
                      <span>Location : {Number.isFinite(totalEur) ? `${totalEur} €` : "—"}</span>
                      {depositEur > 0 && <span>Caution : {depositEur} € ({row.deposit_hold_status ?? "—"})</span>}
                      <span>Payout : {row.payout_status ?? "—"}</span>
                      {amountRequested > 0 && (
                        <span className="font-semibold text-amber-700">Montant réclamé : {amountRequested} €</span>
                      )}
                    </div>
                    {row.incident_comment && (
                      <div className="mt-3 rounded-lg bg-amber-50 px-3 py-2">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-700">
                          Commentaire prestataire
                        </p>
                        <p className="mt-1 text-sm text-slate-700">{row.incident_comment}</p>
                      </div>
                    )}
                    <p className="mt-2 text-[11px] text-slate-400">
                      Signalé le {formatDate(row.incident_at)}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <Link
                      href={`/admin/incidents-materiel/${row.id}`}
                      className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
                    >
                      Examiner →
                    </Link>
                    {row.incident_status !== "open" && (
                      <span className="flex items-center gap-1 text-[12px] text-emerald-600">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Traité
                      </span>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
