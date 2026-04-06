import type { AuditLogRow } from "@/server/queries/admin/audit-logs";

function formatMetadata(metadata: Record<string, unknown> | null | undefined): string {
  if (!metadata || typeof metadata !== "object") {
    return "—";
  }
  try {
    const s = JSON.stringify(metadata, null, 2);
    if (s.length > 2000) {
      return `${s.slice(0, 2000)}\n…`;
    }
    return s;
  } catch {
    return "—";
  }
}

type AuditLogsTableProps = {
  rows: AuditLogRow[];
};

export function AuditLogsTable({ rows }: AuditLogsTableProps) {
  if (rows.length === 0) {
    return (
      <p className="rounded-lg border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-600">
        Aucun événement à afficher pour ces critères.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
      <table className="w-full min-w-[960px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
            <th className="whitespace-nowrap px-3 py-3">Date (UTC)</th>
            <th className="px-3 py-3">Action</th>
            <th className="px-3 py-3">Acteur</th>
            <th className="px-3 py-3">Rôle</th>
            <th className="px-3 py-3">Cible</th>
            <th className="px-3 py-3">Source</th>
            <th className="min-w-[200px] px-3 py-3">Métadonnées</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row) => (
            <tr key={row.id} className="align-top text-slate-800">
              <td className="whitespace-nowrap px-3 py-2 font-mono text-xs text-slate-600">
                {new Date(row.created_at).toISOString().replace("T", " ").slice(0, 19)}
              </td>
              <td className="max-w-[200px] break-words px-3 py-2 font-medium">{row.action}</td>
              <td className="max-w-[140px] break-all px-3 py-2 font-mono text-xs">
                {row.actor_user_id ?? "—"}
              </td>
              <td className="whitespace-nowrap px-3 py-2 text-slate-600">{row.actor_role ?? "—"}</td>
              <td className="px-3 py-2">
                <span className="font-mono text-xs text-slate-700">{row.target_type}</span>
                {row.target_id ? (
                  <>
                    <br />
                    <span className="break-all font-mono text-[11px] text-slate-500">{row.target_id}</span>
                  </>
                ) : null}
              </td>
              <td className="whitespace-nowrap px-3 py-2 text-slate-600">{row.source ?? "—"}</td>
              <td className="px-3 py-2">
                <pre className="max-h-36 max-w-md overflow-auto rounded bg-slate-50 p-2 font-mono text-[11px] leading-relaxed text-slate-700">
                  {formatMetadata(row.metadata)}
                </pre>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
