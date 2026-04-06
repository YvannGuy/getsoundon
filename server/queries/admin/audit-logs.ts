import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type AuditLogRow = {
  id: string;
  created_at: string;
  actor_user_id: string | null;
  actor_role: string | null;
  action: string;
  target_type: string;
  target_id: string | null;
  metadata: Record<string, unknown>;
  source: string | null;
};

export type FetchAuditLogsParams = {
  limit?: number;
  action?: string | null;
  targetType?: string | null;
  actorUserId?: string | null;
};

/**
 * Lecture `audit_logs` via service_role uniquement (RLS fermée côté JWT).
 * À appeler depuis une page / route déjà protégée admin.
 */
export async function fetchAuditLogsForAdmin(
  params: FetchAuditLogsParams,
): Promise<{ rows: AuditLogRow[]; error: string | null }> {
  const limit = Math.min(Math.max(params.limit ?? 80, 1), 100);
  const action = params.action?.trim() || null;
  const targetType = params.targetType?.trim() || null;
  const actorRaw = params.actorUserId?.trim() || null;
  const actorUserId = actorRaw && UUID_RE.test(actorRaw) ? actorRaw : null;

  try {
    const admin = createAdminClient();
    let q = admin
      .from("audit_logs")
      .select(
        "id, created_at, actor_user_id, actor_role, action, target_type, target_id, metadata, source",
      );

    if (action) {
      if (action.length > 160) {
        return { rows: [], error: "Filtre « action » trop long (max 160 caractères)." };
      }
      q = q.eq("action", action);
    }
    if (targetType) {
      if (targetType.length > 120) {
        return { rows: [], error: "Filtre « target_type » trop long (max 120 caractères)." };
      }
      q = q.eq("target_type", targetType);
    }
    if (actorUserId) {
      q = q.eq("actor_user_id", actorUserId);
    }

    const { data, error } = await q.order("created_at", { ascending: false }).limit(limit);

    if (error) {
      return { rows: [], error: error.message };
    }

    const rows = (data ?? []) as AuditLogRow[];
    return { rows, error: null };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erreur lors du chargement des logs.";
    return { rows: [], error: msg };
  }
}
