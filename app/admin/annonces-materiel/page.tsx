import type { Metadata } from "next";
import Link from "next/link";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Megaphone } from "lucide-react";

import { AdminAnnoncesFilters } from "./annonces-filters";
import { AdminAnnoncesModerationButtons } from "@/components/admin/admin-annonces-moderation-buttons";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Pagination } from "@/components/ui/pagination";
import { GS_LISTING_MODERATION } from "@/lib/gs-listing-moderation";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Annonces | Admin",
  robots: { index: false, follow: false },
};

const PAGE_SIZE = 25;

type ListingRow = {
  id: string;
  owner_id: string;
  title: string;
  category: string | null;
  price_per_day: number | string | null;
  location: string | null;
  is_active: boolean | null;
  moderation_status: string | null;
  moderation_rejection_reason: string | null;
  created_at: string;
  updated_at: string;
};

function normalizeModerationFilter(status: string | undefined): string {
  const s = (status ?? "all").trim();
  if (s === "active") return "online";
  if (s === "inactive") return "hidden";
  return s || "all";
}

function listingStateLabel(r: ListingRow): { label: string; className: string } {
  const mod = r.moderation_status ?? GS_LISTING_MODERATION.APPROVED;
  if (mod === GS_LISTING_MODERATION.REJECTED) {
    return { label: "Refusée", className: "bg-red-100 text-red-800" };
  }
  if (mod === GS_LISTING_MODERATION.PENDING) {
    return { label: "En attente", className: "bg-amber-100 text-amber-800" };
  }
  if (r.is_active) {
    return { label: "En ligne", className: "bg-emerald-100 text-emerald-700" };
  }
  return { label: "Masquée", className: "bg-slate-100 text-slate-700" };
}

function sanitize(raw: string): string {
  return raw.trim().replace(/[%_\\]/g, "");
}

function parseDayBoundary(dateStr: string, end: boolean): string | null {
  if (!/^\\d{4}-\\d{2}-\\d{2}$/.test(dateStr)) return null;
  const d = new Date(`${dateStr}T${end ? "23:59:59.999" : "00:00:00.000"}Z`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

async function resolveOwnerIds(admin: ReturnType<typeof createAdminClient>, term: string): Promise<string[] | null> {
  const t = sanitize(term);
  if (!t) return null;
  const pattern = `%${t}%`;
  const [em, nm] = await Promise.all([
    admin.from("profiles").select("id").ilike("email", pattern).limit(80),
    admin.from("profiles").select("id").ilike("full_name", pattern).limit(80),
  ]);
  return [...new Set([...(em.data ?? []), ...(nm.data ?? [])].map((r: { id: string }) => r.id))];
}

export default async function AdminAnnoncesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; date_from?: string; date_to?: string; search?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, parseInt(String(sp.page || "1"), 10) || 1);
  const fromIdx = (page - 1) * PAGE_SIZE;
  const toIdx = fromIdx + PAGE_SIZE - 1;
  const filterStatus = normalizeModerationFilter(sp.status);

  const admin = createAdminClient();

  const dateFromIso = sp.date_from ? parseDayBoundary(sp.date_from, false) : null;
  const dateToIso = sp.date_to ? parseDayBoundary(sp.date_to, true) : null;
  const ownerIds = sp.search ? await resolveOwnerIds(admin, sp.search) : null;
  const titleTerm = sp.search ? sanitize(sp.search) : "";

  let rows: ListingRow[] = [];
  let total = 0;
  let emptyReason: string | null = null;

  if (ownerIds !== null && ownerIds.length === 0 && !titleTerm) {
    emptyReason = "Aucun prestataire ne correspond à cette recherche.";
  }

  if (!emptyReason) {
    let q = admin
      .from("gs_listings")
      .select(
        "id, owner_id, title, category, price_per_day, location, is_active, moderation_status, moderation_rejection_reason, created_at, updated_at",
        { count: "exact" }
      )
      .order("created_at", { ascending: false });

    if (filterStatus === "pending") q = q.eq("moderation_status", GS_LISTING_MODERATION.PENDING);
    if (filterStatus === "online") {
      q = q.eq("moderation_status", GS_LISTING_MODERATION.APPROVED).eq("is_active", true);
    }
    if (filterStatus === "rejected") q = q.eq("moderation_status", GS_LISTING_MODERATION.REJECTED);
    if (filterStatus === "hidden") {
      q = q.eq("moderation_status", GS_LISTING_MODERATION.APPROVED).eq("is_active", false);
    }
    if (dateFromIso) q = q.gte("created_at", dateFromIso);
    if (dateToIso) q = q.lte("created_at", dateToIso);

    if (titleTerm) q = q.ilike("title", `%${titleTerm}%`);
    if (ownerIds && ownerIds.length > 0) q = q.in("owner_id", ownerIds);

    const { data, count, error } = await q.range(fromIdx, toIdx);
    if (error) {
      emptyReason = "Impossible de charger les annonces (table ou droits).";
    } else {
      rows = (data ?? []) as ListingRow[];
      total = count ?? 0;
    }
  }

  const ownerIdsUnique = [...new Set(rows.map((r) => r.owner_id))];
  const { data: owners } = ownerIdsUnique.length
    ? await admin.from("profiles").select("id, full_name, email").in("id", ownerIdsUnique)
    : { data: [] };
  const ownerMap = new Map<string, { full_name: string | null; email: string | null }>();
  for (const p of owners ?? []) ownerMap.set((p as any).id, { full_name: (p as any).full_name, email: (p as any).email });

  const totalPages = Math.ceil(total / PAGE_SIZE) || 1;
  const currentPage = Math.min(page, totalPages);

  const totalActive = rows.filter((r) => r.is_active).length; // page-level info

  return (
    <div className="space-y-6 p-4 pb-24 md:p-8 md:pb-8">
      <div className="flex items-center gap-3">
        <Megaphone className="h-6 w-6 text-slate-600" />
        <div>
          <h1 className="text-xl font-bold text-black md:text-2xl">Annonces</h1>
          <p className="mt-1 max-w-4xl text-sm text-slate-600">
            Modération des annonces catalogue : publier, masquer ou refuser, avec notification email au prestataire. Les
            annonces « en ligne » sont <code className="rounded bg-slate-100 px-1 text-xs">approved</code> + visibles.
          </p>
        </div>
      </div>

      <AdminAnnoncesFilters
        initial={{
          status: filterStatus,
          date_from: sp.date_from ?? "",
          date_to: sp.date_to ?? "",
          search: sp.search ?? "",
        }}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="border-l-4 border-l-sky-500 bg-white shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Total annonces (filtres)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-black">{emptyReason ? 0 : total}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-500 bg-white shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Actives (page)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-black">{emptyReason ? 0 : totalActive}</p>
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
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{emptyReason}</div>
      ) : null}

      {!emptyReason && rows.length === 0 ? (
        <Card className="border border-dashed border-slate-200 bg-white shadow-sm">
          <CardContent className="flex flex-col items-center justify-center gap-2 py-14 text-center">
            <p className="text-sm font-semibold text-slate-800">Aucune annonce</p>
            <p className="max-w-md text-sm text-slate-600">Ajustez les filtres ou vérifiez les données.</p>
          </CardContent>
        </Card>
      ) : null}

      {!emptyReason && rows.length > 0 ? (
        <Card className="overflow-hidden border border-slate-200 bg-white shadow-sm">
          <CardHeader className="border-b border-slate-100">
            <CardTitle className="text-base">Liste des annonces</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
                    <th className="px-4 py-3">Titre</th>
                    <th className="px-4 py-3">Prestataire</th>
                    <th className="px-4 py-3">Modération</th>
                    <th className="px-4 py-3">Prix / jour</th>
                    <th className="px-4 py-3">Localisation</th>
                    <th className="px-4 py-3">Créée le</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((r) => {
                    const owner = ownerMap.get(r.owner_id);
                    const price = Number(r.price_per_day ?? 0);
                    const st = listingStateLabel(r);
                    return (
                      <tr key={r.id} className="hover:bg-slate-50/80">
                        <td className="max-w-[240px] truncate px-4 py-3 font-semibold text-slate-900" title={r.title}>
                          {r.title}
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {owner?.full_name || owner?.email || "—"}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${st.className}`}>
                            {st.label}
                          </span>
                          {r.moderation_rejection_reason ? (
                            <p className="mt-1 max-w-[200px] truncate text-[11px] text-slate-500" title={r.moderation_rejection_reason}>
                              {r.moderation_rejection_reason}
                            </p>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-900">
                          {Number.isFinite(price) ? `${price.toFixed(2)} €` : "—"}
                        </td>
                        <td className="px-4 py-3 text-slate-700">{r.location ?? "—"}</td>
                        <td className="px-4 py-3 text-slate-700">{format(new Date(r.created_at), "d MMM yyyy", { locale: fr })}</td>
                        <td className="px-4 py-3 align-top">
                          <div className="flex max-w-[220px] flex-col gap-2">
                            <span className="text-xs font-mono text-slate-500" title={r.id}>
                              {r.id.slice(0, 8)}…
                            </span>
                            <Link
                              href={`/items/${r.id}`}
                              className="text-sm font-semibold text-gs-orange underline-offset-2 hover:underline"
                            >
                              Voir la fiche
                            </Link>
                            <AdminAnnoncesModerationButtons
                              listingId={r.id}
                              moderationStatus={r.moderation_status}
                              isActive={r.is_active}
                            />
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
          baseUrl="/admin/annonces-materiel"
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

function buildQuery(sp: { status?: string; date_from?: string; date_to?: string; search?: string }) {
  const p = new URLSearchParams();
  const st = normalizeModerationFilter(sp.status);
  if (st && st !== "all") p.set("status", st);
  if (sp.date_from?.trim()) p.set("date_from", sp.date_from.trim());
  if (sp.date_to?.trim()) p.set("date_to", sp.date_to.trim());
  if (sp.search?.trim()) p.set("search", sp.search.trim());
  const s = p.toString();
  return s ? `&${s}` : "";
}
