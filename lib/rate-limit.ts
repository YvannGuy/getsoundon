/**
 * Rate limiter in-memory (par instance serveur).
 * Pour un usage distribué (multi-instances), préférer Redis/Upstash.
 */

const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS = 5;

const store = new Map<string, number[]>();

function pruneOldEntries(entries: number[], now: number): number[] {
  return entries.filter((t) => now - t < WINDOW_MS);
}

export function checkRateLimit(identifier: string): { ok: true } | { ok: false; retryAfter: number } {
  const now = Date.now();
  let entries = store.get(identifier) ?? [];
  entries = pruneOldEntries(entries, now);

  if (entries.length >= MAX_REQUESTS) {
    const oldest = entries[0] ?? now;
    return { ok: false, retryAfter: Math.ceil((oldest + WINDOW_MS - now) / 1000) };
  }

  entries.push(now);
  store.set(identifier, entries);
  return { ok: true };
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() ?? "unknown";
  }
  return request.headers.get("x-real-ip") ?? "unknown";
}
