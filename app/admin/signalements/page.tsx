import type { Metadata } from "next";
import { Flag } from "lucide-react";

import { SignalementsClient, type ReportRow } from "./signalements-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Signalements | Admin",
  robots: { index: false, follow: false },
};

export default async function AdminSignalementsPage() {
  const admin = createAdminClient();
  let rows: ReportRow[] = [];
  let loadError: string | null = null;

  const { data, error } = await admin
    .from("gs_reports")
    .select(
      "id, created_at, updated_at, reporter_user_id, reporter_email, target_type, target_listing_id, target_provider_id, reason_code, message, status, admin_note"
    )
    .order("created_at", { ascending: false })
    .limit(300);

  if (error) {
    loadError = error.message;
  } else {
    rows = (data ?? []) as ReportRow[];
  }

  const providerIds = [...new Set(rows.map((r) => r.target_provider_id).filter(Boolean))] as string[];
  const providerBoutiqueSlugById: Record<string, string | null> = {};
  if (providerIds.length > 0) {
    const { data: profs } = await admin
      .from("profiles")
      .select("id, boutique_slug")
      .in("id", providerIds);
    for (const p of profs ?? []) {
      const row = p as { id: string; boutique_slug: string | null };
      providerBoutiqueSlugById[row.id] = row.boutique_slug ?? null;
    }
  }

  const newCount = rows.filter((r) => r.status === "new").length;

  return (
    <div className="space-y-6 p-4 pb-24 md:p-8 md:pb-8">
      <div className="flex items-center gap-3">
        <Flag className="h-6 w-6 text-amber-600" />
        <div>
          <h1 className="text-xl font-bold text-black md:text-2xl">Signalements</h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-600">
            Signalements utilisateurs sur les annonces et les boutiques prestataires. Aucune action automatique : traitement
            manuel uniquement.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Card className="border-l-4 border-l-amber-500 bg-white shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Nouveaux (liste chargée)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-black">{loadError ? "—" : newCount}</p>
          </CardContent>
        </Card>
        <Card className="bg-white shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Total affiché</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-black">{loadError ? "—" : rows.length}</p>
          </CardContent>
        </Card>
      </div>

      {loadError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          <p className="font-semibold">Impossible de charger les signalements.</p>
          <p className="mt-1 font-mono text-xs">{loadError}</p>
          <p className="mt-2 text-red-800">
            Vérifiez que la migration <code className="rounded bg-red-100 px-1">gs_reports_v1.sql</code> a bien été
            appliquée.
          </p>
        </div>
      ) : (
        <SignalementsClient rows={rows} providerBoutiqueSlugById={providerBoutiqueSlugById} />
      )}
    </div>
  );
}
