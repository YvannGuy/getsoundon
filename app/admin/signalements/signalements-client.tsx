"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { updateGsReportAdminAction } from "@/app/actions/admin-reports";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  GS_REPORT_STATUSES,
  gsReportReasonLabel,
  gsReportStatusLabel,
  type GsReportStatus,
} from "@/lib/gs-reports";

export type ReportRow = {
  id: string;
  created_at: string;
  updated_at?: string;
  reporter_user_id: string | null;
  reporter_email: string | null;
  target_type: string;
  target_listing_id: string | null;
  target_provider_id: string | null;
  reason_code: string;
  message: string;
  status: string;
  admin_note: string | null;
};

type Props = {
  rows: ReportRow[];
  providerBoutiqueSlugById: Record<string, string | null>;
};

export function SignalementsClient({ rows, providerBoutiqueSlugById }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const updateRow = (id: string, status: GsReportStatus, adminNote: string) => {
    startTransition(async () => {
      const r = await updateGsReportAdminAction(id, { status, admin_note: adminNote.trim() || null });
      if (r.success) router.refresh();
      else alert(r.error);
    });
  };

  if (rows.length === 0) {
    return (
      <p className="text-sm text-slate-600">
        Aucun signalement pour le moment. Les envois depuis les fiches annonce et boutique apparaîtront ici.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full min-w-[1100px] text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
            <th className="px-3 py-3">Date</th>
            <th className="px-3 py-3">Type</th>
            <th className="px-3 py-3">Cible</th>
            <th className="px-3 py-3">Motif</th>
            <th className="px-3 py-3">Message</th>
            <th className="px-3 py-3">Signaleur</th>
            <th className="px-3 py-3">Statut</th>
            <th className="px-3 py-3">Note admin</th>
            <th className="px-3 py-3">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row) => (
            <ReportRowEditor
              key={`${row.id}-${row.updated_at ?? row.created_at}`}
              row={row}
              providerBoutiqueSlugById={providerBoutiqueSlugById}
              onSave={updateRow}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ReportRowEditor({
  row,
  providerBoutiqueSlugById,
  onSave,
}: {
  row: ReportRow;
  providerBoutiqueSlugById: Record<string, string | null>;
  onSave: (id: string, status: GsReportStatus, adminNote: string) => void;
}) {
  const [status, setStatus] = useState<GsReportStatus>(row.status as GsReportStatus);
  const [note, setNote] = useState(row.admin_note ?? "");

  const targetLink =
    row.target_type === "listing" && row.target_listing_id ? (
      <Link
        href={`/items/${row.target_listing_id}`}
        className="font-semibold text-gs-orange underline-offset-2 hover:underline"
      >
        Fiche annonce
      </Link>
    ) : row.target_type === "provider" && row.target_provider_id ? (
      (() => {
        const slug = providerBoutiqueSlugById[row.target_provider_id];
        return slug ? (
          <Link
            href={`/boutique/${slug}`}
            className="font-semibold text-gs-orange underline-offset-2 hover:underline"
          >
            Boutique
          </Link>
        ) : (
          <span className="font-mono text-xs text-slate-600">{row.target_provider_id.slice(0, 8)}…</span>
        );
      })()
    ) : (
      "—"
    );

  const typeLabel = row.target_type === "listing" ? "Annonce" : "Prestataire";

  return (
    <tr className="align-top hover:bg-slate-50/80">
      <td className="whitespace-nowrap px-3 py-3 text-slate-700">
        {new Date(row.created_at).toLocaleString("fr-FR", {
          dateStyle: "short",
          timeStyle: "short",
        })}
      </td>
      <td className="px-3 py-3 font-medium text-slate-900">{typeLabel}</td>
      <td className="px-3 py-3">{targetLink}</td>
      <td className="max-w-[140px] px-3 py-3 text-slate-700">{gsReportReasonLabel(row.reason_code)}</td>
      <td className="max-w-[220px] px-3 py-3">
        <p className="line-clamp-4 whitespace-pre-wrap text-slate-700" title={row.message}>
          {row.message}
        </p>
      </td>
      <td className="max-w-[160px] px-3 py-3 break-all text-slate-600">
        {row.reporter_email ?? row.reporter_user_id?.slice(0, 8) ?? "—"}
      </td>
      <td className="px-3 py-3">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as GsReportStatus)}
          className="h-9 w-full min-w-[120px] rounded-md border border-slate-200 px-2 text-xs"
        >
          {GS_REPORT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {gsReportStatusLabel(s)}
            </option>
          ))}
        </select>
      </td>
      <td className="px-3 py-3">
        <Input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Note interne"
          className="h-9 text-xs"
        />
      </td>
      <td className="px-3 py-3">
        <Button
          type="button"
          size="sm"
          className="h-8 bg-slate-900 text-white hover:bg-slate-800"
          onClick={() => onSave(row.id, status, note)}
        >
          Enregistrer
        </Button>
      </td>
    </tr>
  );
}
