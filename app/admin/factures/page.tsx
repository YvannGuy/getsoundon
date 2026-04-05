import type { Metadata } from "next";
import Link from "next/link";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { FileText } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Pagination } from "@/components/ui/pagination";
import { tryCreateSignedInvoiceReadUrl } from "@/lib/storage";
import { createAdminClient } from "@/lib/supabase/admin";

import { AdminFacturesFilters } from "./admin-factures-filters";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Factures | Admin",
  robots: { index: false, follow: false },
};

const PAGE_SIZE = 25;

const INVOICE_STATUS_LABELS: Record<string, string> = {
  issued: "Émise",
};

function labelStatus(code: string) {
  return INVOICE_STATUS_LABELS[code] ?? code;
}

function sanitizeIlikeTerm(raw: string): string {
  return raw.trim().replace(/[%_\\]/g, "");
}

function isUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    s.trim()
  );
}

function parseDayBoundary(dateStr: string, end: boolean): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
  const d = new Date(`${dateStr}T${end ? "23:59:59.999" : "00:00:00.000"}Z`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

async function resolveProfileIds(
  admin: ReturnType<typeof createAdminClient>,
  raw: string
): Promise<string[] | null> {
  const term = sanitizeIlikeTerm(raw);
  if (!term) return null;
  const pattern = `%${term}%`;
  const [em, nm] = await Promise.all([
    admin.from("profiles").select("id").ilike("email", pattern).limit(80),
    admin.from("profiles").select("id").ilike("full_name", pattern).limit(80),
  ]);
  const ids = [
    ...new Set(
      [...(em.data ?? []), ...(nm.data ?? [])].map((r: { id: string }) => r.id)
    ),
  ];
  return ids;
}

type InvoiceRow = {
  id: string;
  booking_id: string;
  provider_id: string;
  customer_id: string | null;
  invoice_number: string;
  invoice_url: string;
  invoice_generated_at: string;
  invoice_status: string;
  invoice_total_eur: number | string | null;
  currency: string | null;
};

export default async function AdminFacturesPage({
  searchParams,
}: {
  searchParams: Promise<{
    numero?: string;
    status?: string;
    date_from?: string;
    date_to?: string;
    booking_id?: string;
    prestataire?: string;
    client?: string;
    page?: string;
  }>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, parseInt(String(sp.page || "1"), 10) || 1);
  const fromIdx = (page - 1) * PAGE_SIZE;
  const toIdx = fromIdx + PAGE_SIZE - 1;

  const admin = createAdminClient();

  let emptyReason: string | null = null;

  const providerIdsFilter = sp.prestataire
    ? await resolveProfileIds(admin, sp.prestataire)
    : null;
  const customerIdsFilter = sp.client ? await resolveProfileIds(admin, sp.client) : null;

  if (providerIdsFilter !== null && providerIdsFilter.length === 0) {
    emptyReason = "Aucun prestataire ne correspond à cette recherche.";
  }
  if (!emptyReason && customerIdsFilter !== null && customerIdsFilter.length === 0) {
    emptyReason = "Aucun client ne correspond à cette recherche.";
  }

  const bookingIdFilter =
    sp.booking_id && isUuid(sp.booking_id) ? sp.booking_id.trim() : undefined;
  if (sp.booking_id && sp.booking_id.trim() && !bookingIdFilter) {
    emptyReason = "Identifiant de réservation invalide (attendu : UUID).";
  }

  const dateFromIso = sp.date_from ? parseDayBoundary(sp.date_from, false) : null;
  const dateToIso = sp.date_to ? parseDayBoundary(sp.date_to, true) : null;

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [
    { count: totalAll },
    { count: totalLast30 },
  ] = await Promise.all([
    admin.from("gs_invoices").select("id", { count: "exact", head: true }),
    admin
      .from("gs_invoices")
      .select("id", { count: "exact", head: true })
      .gte("invoice_generated_at", thirtyDaysAgo),
  ]);

  let rows: InvoiceRow[] = [];
  let filteredTotal = 0;

  if (!emptyReason) {
    let q = admin
      .from("gs_invoices")
      .select(
        "id, booking_id, provider_id, customer_id, invoice_number, invoice_url, invoice_generated_at, invoice_status, invoice_total_eur, currency",
        { count: "exact" }
      )
      .order("invoice_generated_at", { ascending: false });

    const numero = sanitizeIlikeTerm(sp.numero ?? "");
    if (numero) q = q.ilike("invoice_number", `%${numero}%`);

    if (sp.status && sp.status !== "all" && sp.status.trim()) {
      q = q.eq("invoice_status", sp.status.trim());
    }

    if (dateFromIso) q = q.gte("invoice_generated_at", dateFromIso);
    if (dateToIso) q = q.lte("invoice_generated_at", dateToIso);
    if (bookingIdFilter) q = q.eq("booking_id", bookingIdFilter);
    if (providerIdsFilter && providerIdsFilter.length > 0) {
      q = q.in("provider_id", providerIdsFilter);
    }
    if (customerIdsFilter && customerIdsFilter.length > 0) {
      q = q.in("customer_id", customerIdsFilter);
    }

    const { data, count, error } = await q.range(fromIdx, toIdx);

    if (error) {
      emptyReason =
        "Impossible de charger les factures (table ou droits). Vérifiez la migration gs_invoices.";
      rows = [];
      filteredTotal = 0;
    } else {
      rows = (data ?? []) as InvoiceRow[];
      filteredTotal = count ?? 0;
    }
  }

  const bookingIds = [...new Set(rows.map((r) => r.booking_id))];
  const providerIds = [...new Set(rows.map((r) => r.provider_id))];
  const customerIds = [...new Set(rows.map((r) => r.customer_id).filter(Boolean))] as string[];

  let listingsMap: Record<string, { id: string; title: string | null }> = {};
  let profilesMap: Record<string, { id: string; full_name: string | null; email: string | null }> =
    {};
  let bookingListingIdMap: Record<string, string | null> = {};

  if (rows.length > 0) {
    const { data: bookings } = await admin
      .from("gs_bookings")
      .select("id, listing_id")
      .in("id", bookingIds);
    for (const b of bookings ?? []) {
      const row = b as { id: string; listing_id: string | null };
      bookingListingIdMap[row.id] = row.listing_id;
    }
    const listingIds = [
      ...new Set(
        (bookings ?? [])
          .map((b: { listing_id: string | null }) => b.listing_id)
          .filter(Boolean)
      ),
    ] as string[];

    const [listingsRes, providersRes, customersRes] = await Promise.all([
      listingIds.length
        ? admin.from("gs_listings").select("id, title").in("id", listingIds)
        : Promise.resolve({ data: [] as { id: string; title: string | null }[] }),
      admin.from("profiles").select("id, full_name, email").in("id", providerIds),
      customerIds.length
        ? admin.from("profiles").select("id, full_name, email").in("id", customerIds)
        : Promise.resolve({ data: [] as { id: string; full_name: string | null; email: string | null }[] }),
    ]);

    for (const l of listingsRes.data ?? []) listingsMap[l.id] = l;
    for (const p of providersRes.data ?? []) profilesMap[p.id] = p;
    for (const p of customersRes.data ?? []) profilesMap[p.id] = p;
  }

  const withSigned = await Promise.all(
    rows.map(async (inv) => {
      const signedUrl = await tryCreateSignedInvoiceReadUrl(inv.invoice_url);
      return { ...inv, signedUrl };
    })
  );

  const totalPages = Math.ceil(filteredTotal / PAGE_SIZE) || 1;
  const currentPage = Math.min(page, totalPages);

  return (
    <div className="space-y-6 p-4 pb-24 md:p-8 md:pb-8">
      <div>
        <h1 className="text-xl font-bold text-black md:text-2xl">Factures</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-600">
          Factures générées automatiquement après réservation matériel terminée, virement prestataire effectué et sans
          incident ouvert — aligné avec l’espace prestataire.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="border-l-4 border-l-sky-500 bg-white shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Total factures</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-black">{totalAll ?? 0}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-500 bg-white shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">30 derniers jours</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-black">{totalLast30 ?? 0}</p>
          </CardContent>
        </Card>
        <Card className="bg-white shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Résultats (filtres)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-black">{emptyReason ? 0 : filteredTotal}</p>
            <p className="text-xs text-slate-500">Page {currentPage} / {totalPages || 1}</p>
          </CardContent>
        </Card>
      </div>

      <AdminFacturesFilters
        initial={{
          numero: sp.numero ?? "",
          status: sp.status ?? "all",
          date_from: sp.date_from ?? "",
          date_to: sp.date_to ?? "",
          booking_id: sp.booking_id ?? "",
          prestataire: sp.prestataire ?? "",
          client: sp.client ?? "",
        }}
      />

      {emptyReason ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {emptyReason}
        </div>
      ) : null}

      {!emptyReason && withSigned.length === 0 ? (
        <Card className="border border-dashed border-slate-200 bg-white shadow-sm">
          <CardContent className="flex flex-col items-center justify-center gap-2 py-14 text-center">
            <FileText className="h-12 w-12 text-slate-300" />
            <p className="max-w-md text-sm text-slate-600">
              Aucune facture ne correspond aux critères. Elles apparaissent ici une fois le cron / pipeline de
              génération exécuté pour les réservations éligibles.
            </p>
          </CardContent>
        </Card>
      ) : null}

      {!emptyReason && withSigned.length > 0 ? (
        <Card className="overflow-hidden border border-slate-200 bg-white shadow-sm">
          <CardHeader className="border-b border-slate-100">
            <CardTitle className="text-base">Liste des factures</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[960px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
                    <th className="px-4 py-3">N° facture</th>
                    <th className="px-4 py-3">Date d&apos;émission</th>
                    <th className="px-4 py-3">Réservation</th>
                    <th className="px-4 py-3">Client</th>
                    <th className="px-4 py-3">Prestataire</th>
                    <th className="px-4 py-3">Matériel</th>
                    <th className="px-4 py-3">Montant</th>
                    <th className="px-4 py-3">Statut</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {withSigned.map((inv) => {
                    const lid = bookingListingIdMap[inv.booking_id] ?? null;
                    const listing = lid ? listingsMap[lid] : undefined;
                    const provider = profilesMap[inv.provider_id];
                    const customer = inv.customer_id ? profilesMap[inv.customer_id] : null;
                    const total = Number(inv.invoice_total_eur ?? 0);
                    return (
                      <tr key={inv.id} className="hover:bg-slate-50/80">
                        <td className="px-4 py-3 font-semibold text-slate-900">{inv.invoice_number}</td>
                        <td className="px-4 py-3 text-slate-600">
                          {format(new Date(inv.invoice_generated_at), "d MMM yyyy HH:mm", { locale: fr })}
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs text-slate-600" title={inv.booking_id}>
                            {inv.booking_id.slice(0, 8)}…
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {customer?.full_name || customer?.email || "—"}
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {provider?.full_name || provider?.email || "—"}
                        </td>
                        <td className="max-w-[180px] truncate px-4 py-3 text-slate-600" title={listing?.title ?? ""}>
                          {listing?.title ?? "—"}
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-900">
                          {Number.isFinite(total) ? `${total.toFixed(2)} ${inv.currency ?? "EUR"}` : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                            {labelStatus(inv.invoice_status)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-1.5">
                            {inv.signedUrl ? (
                              <a
                                href={inv.signedUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-semibold text-gs-orange underline-offset-2 hover:underline"
                              >
                                Télécharger
                              </a>
                            ) : (
                              <span className="text-xs text-slate-400">PDF indisponible</span>
                            )}
                            <Link
                              href={`/admin/reservations-materiel/${inv.booking_id}`}
                              className="text-xs font-medium text-slate-600 underline-offset-2 hover:text-slate-900 hover:underline"
                            >
                              Fiche réservation
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

      {!emptyReason && filteredTotal > PAGE_SIZE ? (
        <Pagination
          baseUrl="/admin/factures"
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredTotal}
          pageSize={PAGE_SIZE}
          queryParams={buildFacturesQueryString(sp)}
        />
      ) : null}
    </div>
  );
}

function buildFacturesQueryString(sp: {
  numero?: string;
  status?: string;
  date_from?: string;
  date_to?: string;
  booking_id?: string;
  prestataire?: string;
  client?: string;
}): string {
  const p = new URLSearchParams();
  if (sp.numero?.trim()) p.set("numero", sp.numero.trim());
  if (sp.status && sp.status !== "all") p.set("status", sp.status);
  if (sp.date_from?.trim()) p.set("date_from", sp.date_from.trim());
  if (sp.date_to?.trim()) p.set("date_to", sp.date_to.trim());
  if (sp.booking_id?.trim()) p.set("booking_id", sp.booking_id.trim());
  if (sp.prestataire?.trim()) p.set("prestataire", sp.prestataire.trim());
  if (sp.client?.trim()) p.set("client", sp.client.trim());
  const s = p.toString();
  return s ? `&${s}` : "";
}
