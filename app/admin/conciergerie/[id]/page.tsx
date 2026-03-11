import { notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ArrowLeft } from "lucide-react";

import { AdminPageHeader } from "@/components/admin/page-header";
import { ConciergeStatusForm } from "@/components/admin/concierge-status-form";
import { createAdminClient } from "@/lib/supabase/admin";

const SOURCE_LABELS: Record<string, string> = {
  homepage: "Homepage",
  search_zero_results: "0 résultat recherche",
  other: "Autre",
};

type ConciergePayload = Record<
  string,
  string | number | undefined | null
>;

export default async function AdminConciergerieDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const admin = createAdminClient();

  const { data: req, error } = await admin
    .from("concierge_requests")
    .select("id, user_id, email, phone, status, source, payload, created_at")
    .eq("id", id)
    .single();

  if (error || !req) notFound();

  const payload = (req.payload ?? {}) as ConciergePayload;
  const profile = req.user_id
    ? (await admin.from("profiles").select("id, full_name, email").eq("id", req.user_id).single()).data
    : null;
  const contact = profile?.email ?? req.email ?? req.phone ?? "—";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/admin/conciergerie"
          className="inline-flex items-center gap-2 text-sm font-medium text-[#213398] hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour aux demandes
        </Link>
      </div>

      <AdminPageHeader
        title={`Demande du ${format(new Date(req.created_at), "d MMMM yyyy à HH:mm", { locale: fr })}`}
        subtitle={`Source: ${SOURCE_LABELS[req.source] ?? req.source} • Contact: ${contact}`}
      />

      <div className="flex items-center gap-4">
        <span className="text-sm font-medium text-slate-700">Statut :</span>
        <ConciergeStatusForm id={req.id} currentStatus={req.status} />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h3 className="mb-4 text-lg font-semibold text-black">Détails du brief</h3>
        <dl className="space-y-3 text-sm">
          {payload.zone && (
            <div>
              <dt className="font-medium text-slate-500">Zone</dt>
              <dd className="text-slate-800">{String(payload.zone)}</dd>
            </div>
          )}
          {payload.code_postal && (
            <div>
              <dt className="font-medium text-slate-500">Code postal</dt>
              <dd className="text-slate-800">{String(payload.code_postal)}</dd>
            </div>
          )}
          {payload.capacite && (
            <div>
              <dt className="font-medium text-slate-500">Capacité</dt>
              <dd className="text-slate-800">{String(payload.capacite)} personnes</dd>
            </div>
          )}
          {payload.type && (
            <div>
              <dt className="font-medium text-slate-500">Type</dt>
              <dd className="text-slate-800">{String(payload.type)}</dd>
            </div>
          )}
          {(payload.date_debut || payload.date_fin) && (
            <div>
              <dt className="font-medium text-slate-500">Date</dt>
              <dd className="text-slate-800">
                {payload.date_debut && payload.date_fin
                  ? `${payload.date_debut} → ${payload.date_fin}`
                  : payload.date_debut ?? payload.date_fin}
              </dd>
            </div>
          )}
          {payload.frequence && (
            <div>
              <dt className="font-medium text-slate-500">Fréquence</dt>
              <dd className="text-slate-800">{String(payload.frequence)}</dd>
            </div>
          )}
          {(payload.budget_min || payload.budget_max) && (
            <div>
              <dt className="font-medium text-slate-500">Budget</dt>
              <dd className="text-slate-800">
                {payload.budget_min && payload.budget_max
                  ? `${payload.budget_min}–${payload.budget_max} €`
                  : payload.budget_min
                    ? `À partir de ${payload.budget_min} €`
                    : `Jusqu'à ${payload.budget_max} €`}
              </dd>
            </div>
          )}
          {payload.contraintes && (
            <div>
              <dt className="font-medium text-slate-500">Contraintes</dt>
              <dd className="text-slate-800">{String(payload.contraintes)}</dd>
            </div>
          )}
          <div>
            <dt className="font-medium text-slate-500">Message</dt>
            <dd className="mt-1 whitespace-pre-wrap rounded-lg bg-slate-50 p-4 text-slate-800">
              {String(payload.message ?? "—")}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
