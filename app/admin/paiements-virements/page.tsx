import type { Metadata } from "next";
import Link from "next/link";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Banknote, Shield, Timer, Wallet } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Pagination } from "@/components/ui/pagination";
import { createAdminClient } from "@/lib/supabase/admin";
import { computeGsBookingPaymentSplit } from "@/lib/gs-booking-platform-fee";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Paiements & virements | Admin",
  robots: { index: false, follow: false },
};

const PAGE_SIZE = 25;

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
  checkout_total_eur: number | string | null;
  total_price: number | string | null;
  service_fee_eur: number | string | null;
  provider_net_eur: number | string | null;
  deposit_hold_status: string | null;
  deposit_claim_status: string | null;
  stripe_payment_intent_id: string | null;
};

const PAYOUT_LABEL: Record<string, string> = {
  pending: "En attente",
  scheduled: "Planifié",
  paid: "Payé",
  blocked: "Bloqué",
  failed: "Échoué",
};

function sanitize(raw: string): string {
  return raw.trim().replace(/[%_\\]/g, "");
}

function isUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
}

function parseDayBoundary(dateStr: string, end: boolean): string | null {
  if (!/^\\d{4}-\\d{2}-\\d{2}$/.test(dateStr)) return null;
  const d = new Date(`${dateStr}T${end ? "23:59:59.999" : "00:00:00.000"}Z`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

async function resolveProfileIds(admin: ReturnType<typeof createAdminClient>, term: string): Promise<string[] | null> {
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

function netAmount(row: BookingRow): number {
  if (row.provider_net_eur != null && row.provider_net_eur !== "") {
    const n = Number(row.provider_net_eur);
    if (Number.isFinite(n)) return n;
  }
  const gross = Number(row.checkout_total_eur ?? row.total_price ?? 0);
  if (!Number.isFinite(gross)) return 0;
  try {
    return computeGsBookingPaymentSplit(gross).providerNetEur;
  } catch {
    return 0;
  }
}

export default async function AdminPaiementsPage({
  searchParams,
}: {
  searchParams: Promise<{
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
  const profileIds = sp.search ? await resolveProfileIds(admin, sp.search) : null;
  const listingIds = sp.search ? await resolveListingIds(admin, sp.search) : null;
  const termBooking = sp.search ? sanitize(sp.search) : "";
  const bookingIdFilter = termBooking && isUuid(termBooking) ? termBooking : null;

  let rows: BookingRow[] = [];
  let total = 0;
  let emptyReason: string | null = null;
  let errorDetail: string | null = null;

  if (profileIds !== null && profileIds.length === 0 && listingIds !== null && listingIds.length === 0 && !termBooking) {
    emptyReason = "Aucun résultat pour cette recherche.";
  }

  if (!emptyReason) {
    let q = admin
      .from("gs_bookings")
      .select(
        "id, provider_id, customer_id, listing_id, start_date, end_date, status, payout_status, incident_status, checkout_total_eur, total_price, service_fee_eur, provider_net_eur, deposit_hold_status, deposit_claim_status, stripe_payment_intent_id",
        { count: "exact" },
      )
      .not("stripe_payment_intent_id", "is", null)
      .order("end_date", { ascending: false });

    if (sp.payout_status && sp.payout_status !== "all") q = q.eq("payout_status", sp.payout_status);
    if (sp.incident === "open") q = q.eq("incident_status", "open");
    if (sp.incident === "none") q = q.or("incident_status.is.null,incident_status.eq.dismissed,incident_status.eq.resolved");
    if (dateFromIso) q = q.gte("end_date", dateFromIso);
    if (dateToIso) q = q.lte("end_date", dateToIso);
    if (profileIds && profileIds.length > 0) {
      q = q.or(`provider_id.in.(${profileIds.join(",")}),customer_id.in.(${profileIds.join(",")})`);
    }
    if (listingIds && listingIds.length > 0) q = q.in("listing_id", listingIds);
    if (bookingIdFilter) q = q.eq("id", bookingIdFilter);

    const { data, count, error } = await q.range(fromIdx, toIdx);
    if (error) {
      emptyReason = "Impossible de charger les paiements (table ou droits).";
      errorDetail = error.message ?? null;
    } else {
      rows = (data ?? []) as BookingRow[];
      total = count ?? 0;
    }
  }

  const bookingIds = [...new Set(rows.map((r) => r.id))];
  const providerIds = [...new Set(rows.map((r) => r.provider_id))];
  const customerIds = [...new Set(rows.map((r) => r.customer_id))];
  const listingIdsAll = [...new Set(rows.map((r) => r.listing_id).filter(Boolean))] as string[];

  const [providersRes, customersRes, listingsRes, invoicesRes] = await Promise.all([
    providerIds.length ? admin.from("profiles").select("id, full_name, email").in("id", providerIds) : Promise.resolve({ data: [] }),
    customerIds.length ? admin.from("profiles").select("id, full_name, email").in("id", customerIds) : Promise.resolve({ data: [] }),
    listingIdsAll.length ? admin.from("gs_listings").select("id, title").in("id", listingIdsAll) : Promise.resolve({ data: [] }),
    bookingIds.length ? admin.from("gs_invoices").select("booking_id, invoice_number").in("booking_id", bookingIds) : Promise.resolve({ data: [] }),
  ]);

  const profileMap = new Map<string, { full_name: string | null; email: string | null }>();
  for (const p of providersRes.data ?? []) profileMap.set((p as any).id, { full_name: (p as any).full_name, email: (p as any).email });
  for (const p of customersRes.data ?? []) profileMap.set((p as any).id, { full_name: (p as any).full_name, email: (p as any).email });
  const listingMap = new Map<string, { title: string | null }>();
  for (const l of listingsRes.data ?? []) listingMap.set((l as any).id, { title: (l as any).title });
  const invoiceMap = new Map<string, string>();
  for (const inv of invoicesRes.data ?? []) invoiceMap.set((inv as any).booking_id, (inv as any).invoice_number);

  const totalPages = Math.ceil(total / PAGE_SIZE) || 1;
  const currentPage = Math.min(page, totalPages);

  const gainsEnAttente = rows
    .filter((r) => r.payout_status === null || r.payout_status === "pending" || r.payout_status === "scheduled")
    .reduce((sum, r) => sum + netAmount(r), 0);
  const gainsPayes = rows.filter((r) => r.payout_status === "paid").reduce((sum, r) => sum + netAmount(r), 0);
  const gainsBloques = rows
    .filter((r) => r.payout_status === "blocked" || r.incident_status === "open")
    .reduce((sum, r) => sum + netAmount(r), 0);

  // Vues rapides (échantillon)
  const waitingRows = rows.filter(
    (r) =>
      (r.payout_status === null || r.payout_status === "pending" || r.payout_status === "scheduled") &&
      r.incident_status !== "open",
  );
  const blockedRows = rows.filter((r) => r.payout_status === "blocked" || r.incident_status === "open");
  const paidRows = rows.filter((r) => r.payout_status === "paid");

  return (
    <div className="space-y-6 p-4 pb-24 md:p-8 md:pb-8">
      <div>
        <h1 className="text-xl font-bold text-black md:text-2xl">Paiements & virements</h1>
        <p className="mt-1 max-w-4xl text-sm text-slate-600">
          Vue admin des flux financiers : réservations payées, virements prestataires, montants en attente ou bloqués
          (incidents/caution). Complémentaire de Stripe Dashboard.
        </p>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-sky-500 bg-white shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Gains en attente</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-black">{gainsEnAttente.toFixed(2)} €</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-500 bg-white shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Virements effectués (résultats)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-black">{gainsPayes.toFixed(2)} €</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500 bg-white shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Montants bloqués</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-black">{gainsBloques.toFixed(2)} €</p>
          </CardContent>
        </Card>
        <Card className="bg-white shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Réservations filtrées</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-black">{emptyReason ? 0 : rows.length}</p>
            <p className="text-xs text-slate-500">
              Page {currentPage} / {totalPages || 1}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filtres */}
      <PaiementsFilters
        initial={{
          payout_status: sp.payout_status ?? "all",
          incident: sp.incident ?? "all",
          date_from: sp.date_from ?? "",
          date_to: sp.date_to ?? "",
          search: sp.search ?? "",
        }}
      />

      {emptyReason ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {emptyReason}
          {errorDetail ? <div className="mt-1 text-xs text-amber-800">Détail: {errorDetail}</div> : null}
        </div>
      ) : null}

      {/* Vues rapides */}
      {!emptyReason && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <QuickList title="En attente / planifié" icon={<Timer className="h-4 w-4 text-slate-500" />} rows={waitingRows.slice(0, 8)} profileMap={profileMap} listingMap={listingMap} invoiceMap={invoiceMap} />
          <QuickList title="Bloqués (incident / caution / payout)" icon={<Shield className="h-4 w-4 text-amber-600" />} rows={blockedRows.slice(0, 8)} profileMap={profileMap} listingMap={listingMap} invoiceMap={invoiceMap} />
          <QuickList title="Virements récents" icon={<Wallet className="h-4 w-4 text-emerald-600" />} rows={paidRows.slice(0, 8)} profileMap={profileMap} listingMap={listingMap} invoiceMap={invoiceMap} />
        </div>
      )}

      {/* Table principale */}
      {!emptyReason && rows.length > 0 ? (
        <Card className="overflow-hidden border border-slate-200 bg-white shadow-sm">
          <CardHeader className="border-b border-slate-100">
            <CardTitle className="text-base">Réservations (paiements & virements)</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
                    <th className="px-4 py-3">Réservation</th>
                    <th className="px-4 py-3">Prestataire</th>
                    <th className="px-4 py-3">Client</th>
                    <th className="px-4 py-3">Annonce</th>
                    <th className="px-4 py-3">Fin</th>
                    <th className="px-4 py-3">Payout</th>
                    <th className="px-4 py-3">Incident / Caution</th>
                    <th className="px-4 py-3">Net</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((r) => {
                    const provider = profileMap.get(r.provider_id);
                    const customer = profileMap.get(r.customer_id);
                    const listing = r.listing_id ? listingMap.get(r.listing_id) : null;
                    const net = netAmount(r);
                    const invoiceNum = invoiceMap.get(r.id);
                    return (
                      <tr key={r.id} className="hover:bg-slate-50/80">
                        <td className="px-4 py-3 font-mono text-xs text-slate-700" title={r.id}>
                          {r.id.slice(0, 8)}…
                        </td>
                        <td className="px-4 py-3 text-slate-700">{provider?.full_name || provider?.email || "—"}</td>
                        <td className="px-4 py-3 text-slate-700">{customer?.full_name || customer?.email || "—"}</td>
                        <td className="max-w-[200px] truncate px-4 py-3 text-slate-600" title={listing?.title ?? ""}>
                          {listing?.title ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-slate-700">{format(new Date(r.end_date), "d MMM yyyy", { locale: fr })}</td>
                        <td className="px-4 py-3">
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                            {r.payout_status ? PAYOUT_LABEL[r.payout_status] ?? r.payout_status : "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-0.5 text-xs text-slate-600">
                            <span>Incident : {r.incident_status ?? "—"}</span>
                            <span>Caution : {r.deposit_hold_status ?? "—"}</span>
                            {r.deposit_claim_status ? <span>Claim : {r.deposit_claim_status}</span> : null}
                          </div>
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-900">{net.toFixed(2)} €</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-1.5">
                            <Link
                              href={`/admin/reservations-materiel/${r.id}`}
                              className="text-sm font-semibold text-gs-orange underline-offset-2 hover:underline"
                            >
                              Voir réservation
                            </Link>
                            {invoiceNum && (
                              <Link
                                href={`/admin/factures?booking_id=${r.id}`}
                                className="text-xs font-medium text-slate-600 underline-offset-2 hover:underline"
                              >
                                Facture {invoiceNum}
                              </Link>
                            )}
                            <Link
                              href={`/admin/incidents-materiel/${r.id}`}
                              className="text-xs font-medium text-slate-600 underline-offset-2 hover:underline"
                            >
                              Incident
                            </Link>
                          </div>
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
          baseUrl="/admin/paiements-virements"
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

function buildQuery(sp: { payout_status?: string; incident?: string; date_from?: string; date_to?: string; search?: string }) {
  const p = new URLSearchParams();
  if (sp.payout_status && sp.payout_status !== "all") p.set("payout_status", sp.payout_status);
  if (sp.incident && sp.incident !== "all") p.set("incident", sp.incident);
  if (sp.date_from?.trim()) p.set("date_from", sp.date_from.trim());
  if (sp.date_to?.trim()) p.set("date_to", sp.date_to.trim());
  if (sp.search?.trim()) p.set("search", sp.search.trim());
  const s = p.toString();
  return s ? `&${s}` : "";
}

function fmtBookingShort(id: string) {
  return id.slice(0, 8) + "…";
}

function QuickList({
  title,
  icon,
  rows,
  profileMap,
  listingMap,
  invoiceMap,
}: {
  title: string;
  icon: React.ReactNode;
  rows: BookingRow[];
  profileMap: Map<string, { full_name: string | null; email: string | null }>;
  listingMap: Map<string, { title: string | null }>;
  invoiceMap: Map<string, string>;
}) {
  return (
    <Card className="border border-slate-200 bg-white shadow-sm">
      <CardHeader className="flex flex-row items-center gap-2 border-b border-slate-100">
        {icon}
        <CardTitle className="text-sm font-semibold text-slate-700">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 p-0">
        {rows.length === 0 ? (
          <p className="px-4 py-3 text-sm text-slate-500">Aucun élément.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {rows.map((r) => {
              const provider = profileMap.get(r.provider_id);
              const listing = r.listing_id ? listingMap.get(r.listing_id) : null;
              const invoiceNum = invoiceMap.get(r.id);
              return (
                <li key={r.id} className="px-4 py-3 text-sm">
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-slate-600" title={r.id}>
                        {fmtBookingShort(r.id)}
                      </span>
                      <span className="text-xs text-slate-500">{format(new Date(r.end_date), "d MMM", { locale: fr })}</span>
                    </div>
                    <p className="text-slate-800">{provider?.full_name || provider?.email || "—"}</p>
                    <p className="truncate text-xs text-slate-500" title={listing?.title ?? ""}>
                      {listing?.title ?? "—"}
                    </p>
                    <div className="flex flex-wrap gap-2 text-xs">
                      <Link
                        href={`/admin/reservations-materiel/${r.id}`}
                        className="font-semibold text-gs-orange underline-offset-2 hover:underline"
                      >
                        Réservation
                      </Link>
                      <Link
                        href={`/admin/incidents-materiel/${r.id}`}
                        className="font-medium text-slate-600 underline-offset-2 hover:underline"
                      >
                        Incident
                      </Link>
                      {invoiceNum && (
                        <Link
                          href={`/admin/factures?booking_id=${r.id}`}
                          className="font-medium text-slate-600 underline-offset-2 hover:underline"
                        >
                          Facture {invoiceNum}
                        </Link>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function PaiementsFilters({
  initial,
}: {
  initial: { payout_status: string; incident: string; date_from: string; date_to: string; search: string };
}) {
  return (
    <form
      method="get"
      className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
    >
      <input type="hidden" name="page" value="1" />
      <p className="text-sm font-medium text-slate-700">Filtres</p>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <div>
          <label htmlFor="f-payout" className="mb-1 block text-xs font-medium text-slate-500">
            Statut payout
          </label>
          <select
            id="f-payout"
            name="payout_status"
            defaultValue={initial.payout_status}
            className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-800"
          >
            <option value="all">Tous</option>
            <option value="pending">En attente</option>
            <option value="scheduled">Planifié</option>
            <option value="paid">Payé</option>
            <option value="blocked">Bloqué</option>
            <option value="failed">Échoué</option>
          </select>
        </div>
        <div>
          <label htmlFor="f-incident" className="mb-1 block text-xs font-medium text-slate-500">
            Incident / blocage
          </label>
          <select
            id="f-incident"
            name="incident"
            defaultValue={initial.incident}
            className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-800"
          >
            <option value="all">Tous</option>
            <option value="open">Incident ouvert</option>
            <option value="none">Sans incident / traité</option>
          </select>
        </div>
        <div>
          <label htmlFor="f-from" className="mb-1 block text-xs font-medium text-slate-500">
            Fin à partir du
          </label>
          <input id="f-from" name="date_from" type="date" defaultValue={initial.date_from} className="h-9 w-full rounded-md border border-slate-200 px-3 text-sm text-slate-800" />
        </div>
        <div>
          <label htmlFor="f-to" className="mb-1 block text-xs font-medium text-slate-500">
            Fin jusqu’au
          </label>
          <input id="f-to" name="date_to" type="date" defaultValue={initial.date_to} className="h-9 w-full rounded-md border border-slate-200 px-3 text-sm text-slate-800" />
        </div>
        <div className="md:col-span-2 lg:col-span-2 xl:col-span-2">
          <label htmlFor="f-search" className="mb-1 block text-xs font-medium text-slate-500">
            Recherche (réservation / prestataire / client / annonce)
          </label>
          <input
            id="f-search"
            name="search"
            defaultValue={initial.search}
            placeholder="UUID réservation, nom ou email, titre annonce"
            className="h-9 w-full rounded-md border border-slate-200 px-3 text-sm text-slate-800"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          className="inline-flex h-10 items-center justify-center rounded-md bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Appliquer
        </button>
        <Link
          href="/admin/paiements-virements"
          className="inline-flex h-10 items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          Réinitialiser
        </Link>
      </div>
    </form>
  );
}
