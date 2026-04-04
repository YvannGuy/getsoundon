import type { Metadata } from "next";
import Link from "next/link";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Calendar, ClipboardList } from "lucide-react";

import { AdminReservationsFilters } from "./reservations-filters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Pagination } from "@/components/ui/pagination";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Réservations | Admin",
  robots: { index: false, follow: false },
};

const PAGE_SIZE = 25;

const BOOKING_STATUS_LABEL: Record<string, string> = {
  pending: "En attente",
  accepted: "Acceptée",
  refused: "Refusée",
  cancelled: "Annulée",
  completed: "Terminée",
};

const PAYOUT_STATUS_LABEL: Record<string, string> = {
  pending: "En attente",
  scheduled: "Planifié",
  paid: "Payé",
  blocked: "Bloqué",
  failed: "Échoué",
};

const INCIDENT_LABEL: Record<string, string> = {
  open: "Ouvert",
  resolved: "Validé",
  dismissed: "Rejeté",
};

function sanitize(raw: string): string {
  return raw.trim().replace(/[%_\\]/g, "");
}

async function resolveProfileIds(
  admin: ReturnType<typeof createAdminClient>,
  term: string,
): Promise<string[] | null> {
  const t = sanitize(term);
  if (!t) return null;
  const pattern = `%${t}%`;
  const [em, nm] = await Promise.all([
    admin.from("profiles").select("id").ilike("email", pattern).limit(80),
    admin.from("profiles").select("id").ilike("full_name", pattern).limit(80),
  ]);
  return [...new Set([...(em.data ?? []), ...(nm.data ?? [])].map((r: { id: string }) => r.id))];
}

async function resolveListingIds(admin: ReturnType<typeof createAdminClient>, term: string): Promise<string[] | null> {
  const t = sanitize(term);
  if (!t) return null;
  const { data } = await admin.from("gs_listings").select("id").ilike("title", `%${t}%`).limit(80);
  return data?.map((r: { id: string }) => r.id) ?? [];
}

function parseDayBoundary(dateStr: string, end: boolean): string | null {
  if (!/^\\d{4}-\\d{2}-\\d{2}$/.test(dateStr)) return null;
  const d = new Date(`${dateStr}T${end ? "23:59:59.999" : "00:00:00.000"}Z`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

type BookingRow = {
  id: string;
  provider_id: string;
  customer_id: string;
  listing_id: string | null;
  start_date: string;
  end_date: string;
  status: string;
  payout_status: string | null;
  incident_status: string | null;
  total_price: number | string | null;
  checkout_total_eur: number | string | null;
  service_fee_eur: number | string | null;
};

export default async function AdminReservationsPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    payout_status?: string;
    incident?: string;
    date_from?: string;
    date_to?: string;
    search?: string;
    page?: string;
  }>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, parseInt(String(sp.page || "1"), 10) || 1);
  const fromIdx = (page - 1) * PAGE_SIZE;
  const toIdx = fromIdx + PAGE_SIZE - 1;

  const admin = createAdminClient();

  const dateFromIso = sp.date_from ? parseDayBoundary(sp.date_from, false) : null;
  const dateToIso = sp.date_to ? parseDayBoundary(sp.date_to, true) : null;

  const profilesIds = sp.search ? await resolveProfileIds(admin, sp.search) : null;
  const listingIds = sp.search ? await resolveListingIds(admin, sp.search) : null;

  let rows: BookingRow[] = [];
  let total = 0;
  let emptyReason: string | null = null;

  if (profilesIds !== null && profilesIds.length === 0 && listingIds !== null && listingIds.length === 0) {
    emptyReason = "Aucun résultat pour cette recherche.";
  }

  if (!emptyReason) {
    let q = admin
      .from("gs_bookings")
      .select(
        "id, provider_id, customer_id, listing_id, start_date, end_date, status, payout_status, incident_status, total_price, checkout_total_eur, service_fee_eur",
        { count: "exact" },
      )
      .order("start_date", { ascending: false });

    if (sp.status && sp.status !== "all") q = q.eq("status", sp.status);
    if (sp.payout_status && sp.payout_status !== "all") q = q.eq("payout_status", sp.payout_status);
    if (sp.incident === "open") q = q.eq("incident_status", "open");
    if (sp.incident === "none") q = q.or("incident_status.is.null,incident_status.eq.dismissed,incident_status.eq.resolved");
    if (dateFromIso) q = q.gte("start_date", dateFromIso);
    if (dateToIso) q = q.lte("start_date", dateToIso);
    if (profilesIds && profilesIds.length > 0) {
      q = q.or(`provider_id.in.(${profilesIds.join(",")}),customer_id.in.(${profilesIds.join(",")})`);
    }
    if (listingIds && listingIds.length > 0) {
      q = q.in("listing_id", listingIds);
    }

    const { data, count, error } = await q.range(fromIdx, toIdx);
    if (error) {
      emptyReason = "Impossible de charger les réservations (table ou droits).";
    } else {
      rows = (data ?? []) as BookingRow[];
      total = count ?? 0;
    }
  }

  // Hydrate profils + listing titres
  const providerIds = [...new Set(rows.map((r) => r.provider_id))];
  const customerIds = [...new Set(rows.map((r) => r.customer_id))];
  const listingIdsUnique = [...new Set(rows.map((r) => r.listing_id).filter(Boolean))] as string[];

  const [providersRes, customersRes, listingsRes] = await Promise.all([
    providerIds.length ? admin.from("profiles").select("id, full_name, email").in("id", providerIds) : Promise.resolve({ data: [] }),
    customerIds.length ? admin.from("profiles").select("id, full_name, email").in("id", customerIds) : Promise.resolve({ data: [] }),
    listingIdsUnique.length ? admin.from("gs_listings").select("id, title").in("id", listingIdsUnique) : Promise.resolve({ data: [] }),
  ]);

  const profileMap = new Map<string, { full_name: string | null; email: string | null }>();
  for (const p of providersRes.data ?? []) profileMap.set((p as any).id, { full_name: (p as any).full_name, email: (p as any).email });
  for (const p of customersRes.data ?? []) profileMap.set((p as any).id, { full_name: (p as any).full_name, email: (p as any).email });
  const listingMap = new Map<string, { title: string | null }>();
  for (const l of listingsRes.data ?? []) listingMap.set((l as any).id, { title: (l as any).title });

  const totalPages = Math.ceil(total / PAGE_SIZE) || 1;
  const currentPage = Math.min(page, totalPages);

  return (
    <div className="space-y-6 p-4 pb-24 md:p-8 md:pb-8">
      <div className="flex items-center gap-3">
        <ClipboardList className="h-6 w-6 text-slate-600" />
        <div>
          <h1 className="text-xl font-bold text-black md:text-2xl">Réservations</h1>
          <p className="mt-1 max-w-4xl text-sm text-slate-600">
            Vue globale des réservations matériel : statuts, paiements, incidents, période et montants. Source de vérité
            admin indépendante des incidents.
          </p>
        </div>
      </div>

      <AdminReservationsFilters
        initial={{
          status: sp.status ?? "all",
          payout_status: sp.payout_status ?? "all",
          incident: sp.incident ?? "all",
          date_from: sp.date_from ?? "",
          date_to: sp.date_to ?? "",
          search: sp.search ?? "",
        }}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="border-l-4 border-l-sky-500 bg-white shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Réservations (toutes)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-black">{total ?? 0}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500 bg-white shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Incident ouvert</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-black">
              {rows.filter((r) => r.incident_status === "open").length}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-white shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Résultats (page)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-black">{emptyReason ? 0 : rows.length}</p>
            <p className="text-xs text-slate-500">
              Page {currentPage} / {totalPages || 1}
            </p>
          </CardContent>
        </Card>
      </div>

      {emptyReason ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {emptyReason}
        </div>
      ) : null}

      {!emptyReason && rows.length === 0 ? (
        <Card className="border border-dashed border-slate-200 bg-white shadow-sm">
          <CardContent className="flex flex-col items-center justify-center gap-2 py-14 text-center">
            <Calendar className="h-12 w-12 text-slate-300" />
            <p className="max-w-md text-sm text-slate-600">
              Aucune réservation ne correspond aux critères. Ajustez les filtres ou vérifiez le cron de génération.
            </p>
          </CardContent>
        </Card>
      ) : null}

      {!emptyReason && rows.length > 0 ? (
        <Card className="overflow-hidden border border-slate-200 bg-white shadow-sm">
          <CardHeader className="border-b border-slate-100">
            <CardTitle className="text-base">Liste des réservations</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
                    <th className="px-4 py-3">Réservation</th>
                    <th className="px-4 py-3">Client</th>
                    <th className="px-4 py-3">Prestataire</th>
                    <th className="px-4 py-3">Matériel</th>
                    <th className="px-4 py-3">Période</th>
                    <th className="px-4 py-3">Statut</th>
                    <th className="px-4 py-3">Payout</th>
                    <th className="px-4 py-3">Incident</th>
                    <th className="px-4 py-3">Montant</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((r) => {
                    const customer = profileMap.get(r.customer_id);
                    const provider = profileMap.get(r.provider_id);
                    const listing = r.listing_id ? listingMap.get(r.listing_id) : null;
                    const total = Number(r.checkout_total_eur ?? r.total_price ?? 0);
                    return (
                      <tr key={r.id} className="hover:bg-slate-50/80">
                        <td className="px-4 py-3 font-mono text-xs text-slate-700" title={r.id}>
                          {r.id.slice(0, 8)}…
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {customer?.full_name || customer?.email || "—"}
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {provider?.full_name || provider?.email || "—"}
                        </td>
                        <td className="max-w-[200px] truncate px-4 py-3 text-slate-600" title={listing?.title ?? ""}>
                          {listing?.title ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          <div className="text-xs text-slate-600">
                            {format(new Date(r.start_date), "d MMM yyyy", { locale: fr })} →{" "}
                            {format(new Date(r.end_date), "d MMM yyyy", { locale: fr })}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                            {BOOKING_STATUS_LABEL[r.status] ?? r.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                            {r.payout_status ? PAYOUT_STATUS_LABEL[r.payout_status] ?? r.payout_status : "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {r.incident_status ? (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                              {INCIDENT_LABEL[r.incident_status] ?? r.incident_status}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-500">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-900">
                          {Number.isFinite(total) ? `${total.toFixed(2)} €` : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            href={`/admin/reservations-materiel/${r.id}`}
                            className="text-sm font-semibold text-gs-orange underline-offset-2 hover:underline"
                          >
                            Voir le détail
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {!emptyReason && total > PAGE_SIZE ? (
        <Pagination
          baseUrl="/admin/reservations-materiel"
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={total}
          pageSize={PAGE_SIZE}
          queryParams={buildQuery(sp)}
        />
      ) : null}
    </div>
  );
}

function buildQuery(sp: { status?: string; payout_status?: string; incident?: string; date_from?: string; date_to?: string; search?: string }) {
  const p = new URLSearchParams();
  if (sp.status && sp.status !== "all") p.set("status", sp.status);
  if (sp.payout_status && sp.payout_status !== "all") p.set("payout_status", sp.payout_status);
  if (sp.incident && sp.incident !== "all") p.set("incident", sp.incident);
  if (sp.date_from?.trim()) p.set("date_from", sp.date_from.trim());
  if (sp.date_to?.trim()) p.set("date_to", sp.date_to.trim());
  if (sp.search?.trim()) p.set("search", sp.search.trim());
  const s = p.toString();
  return s ? `&${s}` : "";
}
