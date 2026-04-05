/**
 * Rate limiting distribué (Upstash) — même stack que proxy.ts.
 * Utiliser dans les Route Handlers / actions critiques en complément du middleware.
 */

import "server-only";

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

let defaultLimiter: Ratelimit | null | undefined;

function buildLimiter(prefix: string, requests: number, window: "1 m" | "1 h"): Ratelimit | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    return null;
  }
  return new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.fixedWindow(requests, window),
    prefix: `gs:rl:${prefix}`,
  });
}

/** Limiteur par défaut (20 req / min / identifiant), aligné sur le proxy. */
export function getDefaultUpstashRateLimiter(): Ratelimit | null {
  if (defaultLimiter !== undefined) {
    return defaultLimiter;
  }
  defaultLimiter = buildLimiter("api", 20, "1 m");
  return defaultLimiter;
}

export type RateLimitResult =
  | { ok: true; limit: number; remaining: number; reset: number; skipped?: false }
  | { ok: true; skipped: true };

/** Si Upstash n’est pas configuré, ne bloque pas (skipped). */
export async function rateLimitOrThrow(
  identifier: string,
  options?: { limiter?: Ratelimit | null },
): Promise<RateLimitResult> {
  const limiter = options?.limiter !== undefined ? options.limiter : getDefaultUpstashRateLimiter();
  if (!limiter) {
    return { ok: true, skipped: true };
  }
  const { success, limit, remaining, reset } = await limiter.limit(identifier);
  if (!success) {
    const err = new Error("Too many requests");
    (err as Error & { status?: number }).status = 429;
    throw err;
  }
  return { ok: true, limit, remaining, reset };
}
