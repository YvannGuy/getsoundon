import { createAdminClient } from "@/lib/supabase/admin";
import { Flag } from "lucide-react";
import { SignalementsClient } from "./signalements-client";
import { Pagination } from "@/components/ui/pagination";

const PAGE_SIZE = 25;

const REASON_LABELS: Record<string, string> = {
  escroquerie: "Escroquerie",
  fausse_annonce: "Fausse annonce",
  contenu_inappropriate: "Contenu inapproprié",
  informations_fausses: "Informations fausses ou trompeuses",
  autres: "Autres",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "En attente",
  reviewed: "Examiné",
  dismissed: "Rejeté",
  action_taken: "Mesure prise",
};

export default async function SignalementsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(String(pageParam || "1"), 10) || 1);
  const admin = createAdminClient();
  let reports: Array<{
    id: string;
    salle_id: string;
    reporter_id: string;
    reason: string;
    details: string | null;
    status: string;
    created_at: string;
    salle_name: string;
    salle_slug: string;
    reporter_email: string | null;
  }> = [];

  let total = 0;
  try {
    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    const { data: rows, count: totalCount } = await admin
      .from("salles_reports")
      .select("id, salle_id, reporter_id, reason, details, status, created_at", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);
    total = totalCount ?? 0;

    if (rows && rows.length > 0) {
      const salleIds = [...new Set(rows.map((r) => r.salle_id))];
      const reporterIds = [...new Set(rows.map((r) => r.reporter_id))];

      const [sallesRes, reportersRes] = await Promise.all([
        admin.from("salles").select("id, name, slug").in("id", salleIds),
        admin.from("profiles").select("id, email").in("id", reporterIds),
      ]);

      const salleMap = new Map((sallesRes?.data ?? []).map((s) => [s.id, s]));
      const reporterMap = new Map((reportersRes?.data ?? []).map((r) => [r.id, r.email]));

      reports = rows.map((r) => ({
        ...r,
        salle_name: salleMap.get(r.salle_id)?.name ?? "—",
        salle_slug: salleMap.get(r.salle_id)?.slug ?? "",
        reporter_email: reporterMap.get(r.reporter_id) ?? null,
      }));
    }
  } catch {
    // Table peut ne pas exister
  }

  const pendingCount = reports.filter((r) => r.status === "pending").length;
  const totalPages = Math.ceil(total / PAGE_SIZE) || 1;
  const currentPage = Math.min(page, totalPages);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-black">
          <Flag className="h-7 w-7 text-rose-500" />
          Signalements
        </h1>
        <p className="mt-1 text-slate-600">
          {pendingCount > 0
            ? `${pendingCount} signalement${pendingCount > 1 ? "s" : ""} en attente`
            : "Aucun signalement en attente"}
        </p>
      </div>
      <SignalementsClient
        reports={reports}
        reasonLabels={REASON_LABELS}
        statusLabels={STATUS_LABELS}
      />
      <Pagination
        baseUrl="/admin/signalements"
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={total}
        pageSize={PAGE_SIZE}
      />
    </div>
  );
}
