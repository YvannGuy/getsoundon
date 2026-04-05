/**
 * Journal d’audit minimal (stdout JSON). Remplaçable plus tard par une table `audit_logs` + ingestion.
 */

import "server-only";

export type AuditPayload = {
  action: string;
  actorUserId?: string | null;
  subject?: string;
  meta?: Record<string, unknown>;
};

export function auditLog(payload: AuditPayload): void {
  if (process.env.AUDIT_LOG_DISABLED === "1") {
    return;
  }
  const line = JSON.stringify({
    type: "audit",
    ts: new Date().toISOString(),
    ...payload,
  });
  console.info(line);
}
