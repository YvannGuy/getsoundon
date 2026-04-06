import type { Metadata } from "next";
import Link from "next/link";
import { ScrollText } from "lucide-react";

import { AuditLogsTable } from "@/components/admin/audit-logs-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { redirectIfNotAdmin } from "@/lib/auth/guards";
import { cn } from "@/lib/utils";
import { fetchAuditLogsForAdmin } from "@/server/queries/admin/audit-logs";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Journal d’audit | Admin",
  robots: { index: false, follow: false },
};

type PageProps = {
  searchParams: Promise<{
    action?: string;
    target_type?: string;
    actor_user_id?: string;
    limit?: string;
  }>;
};

export default async function AdminAuditLogsPage({ searchParams }: PageProps) {
  await redirectIfNotAdmin("/auth/admin");

  const sp = await searchParams;
  const action = sp.action ?? "";
  const targetType = sp.target_type ?? "";
  const actorUserId = sp.actor_user_id ?? "";
  const limitRaw = sp.limit ?? "";
  const limitParsed = limitRaw ? parseInt(limitRaw, 10) : NaN;
  const limit = Number.isFinite(limitParsed) ? limitParsed : undefined;

  const { rows, error } = await fetchAuditLogsForAdmin({
    limit,
    action: action || null,
    targetType: targetType || null,
    actorUserId: actorUserId || null,
  });

  const qs = new URLSearchParams();
  if (action) qs.set("action", action);
  if (targetType) qs.set("target_type", targetType);
  if (actorUserId) qs.set("actor_user_id", actorUserId);
  if (limit && limit !== 80) qs.set("limit", String(limit));

  return (
    <div className="space-y-6 p-4 pb-24 md:p-8 md:pb-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <ScrollText className="mt-0.5 h-6 w-6 shrink-0 text-slate-700" aria-hidden />
          <div>
            <h1 className="text-xl font-bold text-black md:text-2xl">Journal d’audit</h1>
            <p className="mt-1 max-w-3xl text-sm text-slate-600">
              Événements métier enregistrés côté serveur (cautions, incidents, modération, factures, etc.).
              Données lues via compte service — aucun accès direct client à la table.
            </p>
          </div>
        </div>
        <Link
          href="/admin"
          className={cn(
            "inline-flex h-9 shrink-0 items-center justify-center self-start rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 transition-all hover:bg-slate-50",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2",
          )}
        >
          Retour tableau de bord
        </Link>
      </div>

      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filtres</CardTitle>
          <CardDescription>
            Filtres optionnels (correspondance exacte). Pour l’acteur, un UUID invalide est ignoré (aucune erreur).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form method="get" className="flex flex-col gap-4 md:flex-row md:flex-wrap md:items-end">
            <div className="grid w-full gap-2 md:max-w-[220px]">
              <label htmlFor="audit-action" className="text-sm font-medium text-slate-700">
                action
              </label>
              <Input
                id="audit-action"
                name="action"
                defaultValue={action}
                placeholder="ex. capture_deposit_admin"
                autoComplete="off"
                className="font-mono text-sm"
              />
            </div>
            <div className="grid w-full gap-2 md:max-w-[200px]">
              <label htmlFor="audit-target-type" className="text-sm font-medium text-slate-700">
                target_type
              </label>
              <Input
                id="audit-target-type"
                name="target_type"
                defaultValue={targetType}
                placeholder="ex. gs_booking"
                autoComplete="off"
                className="font-mono text-sm"
              />
            </div>
            <div className="grid w-full min-w-0 flex-1 gap-2 md:max-w-[320px]">
              <label htmlFor="audit-actor" className="text-sm font-medium text-slate-700">
                actor_user_id
              </label>
              <Input
                id="audit-actor"
                name="actor_user_id"
                defaultValue={actorUserId}
                placeholder="UUID"
                autoComplete="off"
                className="font-mono text-xs"
              />
            </div>
            <div className="grid w-full gap-2 md:w-28">
              <label htmlFor="audit-limit" className="text-sm font-medium text-slate-700">
                Limite
              </label>
              <Input
                id="audit-limit"
                name="limit"
                type="number"
                min={1}
                max={100}
                defaultValue={limit && limit >= 1 && limit <= 100 ? limit : 80}
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit">Appliquer</Button>
              <Link
                href="/admin/audit-logs"
                className="inline-flex h-10 items-center justify-center rounded-md px-4 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
              >
                Réinitialiser
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>

      {error ? (
        <div
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          role="alert"
        >
          <p className="font-medium">Impossible de charger les logs.</p>
          <p className="mt-1 font-mono text-xs">{error}</p>
          <p className="mt-2 text-xs text-red-700">
            Vérifiez que la migration <code className="rounded bg-red-100 px-1">audit_logs_v1.sql</code> a bien été
            appliquée sur le projet Supabase.
          </p>
        </div>
      ) : null}

      {!error ? (
        <div className="space-y-2">
          <p className="text-sm text-slate-600">
            {rows.length} événement{rows.length > 1 ? "s" : ""} affiché{rows.length > 1 ? "s" : ""}
            {qs.toString() ? ` (filtres actifs)` : ""}, tri par date décroissante.
          </p>
          <AuditLogsTable rows={rows} />
        </div>
      ) : null}
    </div>
  );
}
