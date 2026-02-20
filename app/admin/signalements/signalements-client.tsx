"use client";

import { useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { AlertTriangle, Building2, ChevronDown, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateReportStatus } from "@/app/actions/signalements-admin";

type Report = {
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
};

type Props = {
  reports: Report[];
  reasonLabels: Record<string, string>;
  statusLabels: Record<string, string>;
};

export function SignalementsClient({
  reports,
  reasonLabels,
  statusLabels,
}: Props) {
  const [localReports, setLocalReports] = useState(reports);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const handleStatusChange = async (reportId: string, status: string) => {
    setUpdatingId(reportId);
    const result = await updateReportStatus(reportId, status);
    setUpdatingId(null);
    if (result.success) {
      setLocalReports((prev) =>
        prev.map((r) => (r.id === reportId ? { ...r, status } : r))
      );
    }
  };

  if (localReports.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
        <AlertTriangle className="mx-auto h-12 w-12 text-slate-300" />
        <p className="mt-4 text-slate-600">Aucun signalement pour le moment</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {localReports.map((r) => (
        <div
          key={r.id}
          className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
        >
          <div
            className="flex cursor-pointer flex-wrap items-center justify-between gap-4 p-4 hover:bg-slate-50/50"
            onClick={() => setExpandedId((x) => (x === r.id ? null : r.id))}
          >
            <div className="flex min-w-0 flex-1 items-center gap-4">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                  r.status === "pending" ? "bg-rose-100 text-rose-600" : "bg-slate-100 text-slate-600"
                }`}
              >
                <Building2 className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-black">{r.salle_name}</p>
                <p className="text-sm text-slate-500">
                  {reasonLabels[r.reason] ?? r.reason} •{" "}
                  {formatDistanceToNow(new Date(r.created_at), { addSuffix: true, locale: fr })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Select
                value={r.status}
                onValueChange={(v) => handleStatusChange(r.id, v)}
                disabled={updatingId === r.id}
              >
                <SelectTrigger
                  className="w-[150px]"
                  onClick={(e) => e.stopPropagation()}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">{statusLabels.pending}</SelectItem>
                  <SelectItem value="reviewed">{statusLabels.reviewed}</SelectItem>
                  <SelectItem value="dismissed">{statusLabels.dismissed}</SelectItem>
                  <SelectItem value="action_taken">{statusLabels.action_taken}</SelectItem>
                </SelectContent>
              </Select>
              <ChevronDown
                className={`h-5 w-5 text-slate-400 transition ${expandedId === r.id ? "rotate-180" : ""}`}
              />
            </div>
          </div>
          {expandedId === r.id && (
            <div className="border-t border-slate-100 bg-slate-50/30 px-4 py-4">
              <div className="space-y-2 text-sm">
                <p className="flex items-center gap-2 text-slate-600">
                  <Mail className="h-4 w-4" />
                  Signaleur : {r.reporter_email ?? "—"}
                </p>
                {r.details && (
                  <div>
                    <p className="font-medium text-slate-700">Détails :</p>
                    <p className="mt-1 rounded-lg bg-white p-3 text-slate-600">{r.details}</p>
                  </div>
                )}
                <Link
                  href={`/admin/annonces?salleId=${r.salle_id}`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Button variant="outline" size="sm">
                    Voir l&apos;annonce
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
