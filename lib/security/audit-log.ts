/**
 * Journal d’audit : stdout JSON (toujours, sauf désactivation) + persistance best-effort en `audit_logs`.
 * L’échec d’insertion en base ne bloque jamais l’action métier appelante.
 */

import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export type AuditPayload = {
  action: string;
  actorUserId?: string | null;
  /** Rôle métier indicatif (admin, provider, customer, system). */
  actorRole?: string | null;
  /** @deprecated Préférer targetType + targetId ; encore parsé si présent seul. */
  subject?: string;
  targetType?: string;
  targetId?: string | null;
  meta?: Record<string, unknown>;
  /** Ex. server_action, api, cron */
  source?: string | null;
};

const SUBJECT_PATTERN = /^([a-z0-9_]+):([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;

const SENSITIVE_META_KEY = /^(password|token|secret|authorization|cookie|set-cookie|apikey|api_key)$/i;

const MAX_METADATA_JSON_CHARS = 12000;
const MAX_STRING_VALUE_LEN = 2000;

function resolveTarget(payload: AuditPayload): { targetType: string; targetId: string | null } {
  if (payload.targetType) {
    return {
      targetType: payload.targetType,
      targetId: payload.targetId ?? null,
    };
  }
  const sub = payload.subject?.trim();
  if (sub) {
    const m = sub.match(SUBJECT_PATTERN);
    if (m) {
      return { targetType: m[1], targetId: m[2] };
    }
    return { targetType: "subject", targetId: null };
  }
  return { targetType: "unknown", targetId: null };
}

function sanitizeMetadata(meta: Record<string, unknown> | undefined): Record<string, unknown> {
  if (!meta || typeof meta !== "object") {
    return {};
  }
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(meta)) {
    if (SENSITIVE_META_KEY.test(k)) continue;
    if (v === undefined) continue;
    if (typeof v === "string") {
      out[k] =
        v.length > MAX_STRING_VALUE_LEN ? `${v.slice(0, MAX_STRING_VALUE_LEN)}…` : v;
      continue;
    }
    if (
      typeof v === "number" ||
      typeof v === "boolean" ||
      v === null ||
      typeof v === "bigint"
    ) {
      out[k] = v;
      continue;
    }
    if (Array.isArray(v)) {
      out[k] = v.slice(0, 50).map((x) => (typeof x === "string" && x.length > 200 ? `${x.slice(0, 200)}…` : x));
      continue;
    }
    if (typeof v === "object") {
      out[k] = "[object]";
      continue;
    }
  }
  let json = JSON.stringify(out);
  if (json.length > MAX_METADATA_JSON_CHARS) {
    return { truncated: true, originalApproxChars: json.length };
  }
  return out;
}

function logToStdout(payload: AuditPayload): void {
  const line = JSON.stringify({
    type: "audit",
    ts: new Date().toISOString(),
    ...payload,
  });
  console.info(line);
}

async function persistAuditLog(payload: AuditPayload): Promise<void> {
  try {
    const { targetType, targetId } = resolveTarget(payload);
    const metadata = sanitizeMetadata(payload.meta);
    if (targetType === "subject" && payload.subject) {
      metadata.subject = payload.subject;
    }

    const admin = createAdminClient();
    const { error } = await admin.from("audit_logs").insert({
      actor_user_id: payload.actorUserId ?? null,
      actor_role: payload.actorRole ?? null,
      action: payload.action,
      target_type: targetType,
      target_id: targetId,
      metadata,
      source: payload.source ?? "server_action",
    });

    if (error) {
      console.warn("[audit] persist failed", error.message, { action: payload.action, targetType });
    }
  } catch (e) {
    console.warn("[audit] persist failed", e instanceof Error ? e.message : e, { action: payload.action });
  }
}

/**
 * Enregistre un événement d’audit (console + base en arrière-plan).
 * Ne lance pas d’exception vers l’appelant ; ne pas await.
 */
export function auditLog(payload: AuditPayload): void {
  if (process.env.AUDIT_LOG_DISABLED === "1") {
    return;
  }
  logToStdout(payload);

  if (process.env.AUDIT_LOG_DB_DISABLED === "1") {
    return;
  }

  void persistAuditLog(payload);
}

/**
 * Variante async si vous devez garantir l’ordre avant fin de process (tests, scripts).
 * Toujours best-effort : ne propage pas d’erreur insert.
 */
export async function auditLogAwait(payload: AuditPayload): Promise<void> {
  if (process.env.AUDIT_LOG_DISABLED === "1") {
    return;
  }
  logToStdout(payload);
  if (process.env.AUDIT_LOG_DB_DISABLED === "1") {
    return;
  }
  try {
    await persistAuditLog(payload);
  } catch (e) {
    console.warn("[audit] persist unexpected error", e instanceof Error ? e.message : e);
  }
}
