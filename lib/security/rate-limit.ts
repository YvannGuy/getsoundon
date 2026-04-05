/**
 * Rate limiting distribué (Upstash) — même stack que proxy.ts.
 * Utiliser dans les Route Handlers / actions critiques en complément du middleware.
 */

import "server-only";

import { NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

import { getClientIp } from "@/lib/rate-limit";

let defaultLimiter: Ratelimit | null | undefined;

const fixedLimiterCache = new Map<string, Ratelimit | null>();

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

/**
 * Limiteur fenêtre fixe (mis en cache par préfixe + quota + fenêtre).
 * Retourne null si Upstash n’est pas configuré (pas de blocage).
 */
export function createFixedWindowLimiter(
  prefix: string,
  maxRequests: number,
  window: "1 m" | "1 h" = "1 m",
): Ratelimit | null {
  const cacheKey = `${prefix}:${maxRequests}:${window}`;
  if (!fixedLimiterCache.has(cacheKey)) {
    fixedLimiterCache.set(cacheKey, buildLimiter(prefix, maxRequests, window));
  }
  return fixedLimiterCache.get(cacheKey) ?? null;
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

const RATE_LIMIT_MESSAGE = "Trop de requêtes. Réessayez dans une minute.";

/**
 * Route Handler : retourne une réponse 429 ou null si OK / limiter désactivé.
 */
export async function rateLimitOr429Response(
  identifier: string,
  limiter: Ratelimit | null,
): Promise<NextResponse | null> {
  if (!limiter) return null;
  try {
    await rateLimitOrThrow(identifier, { limiter });
    return null;
  } catch (e) {
    const err = e as Error & { status?: number };
    if (err.status === 429) {
      return NextResponse.json({ error: RATE_LIMIT_MESSAGE }, { status: 429 });
    }
    throw e;
  }
}

/**
 * Limite par IP (optionnellement combinée à un suffixe, ex. userId).
 */
export async function rateLimitByRequest(
  request: Request,
  options: {
    limiterPrefix: string;
    max: number;
    window?: "1 m" | "1 h";
    /** Ex. user.id pour compter par compte en plus de l’IP */
    keySuffix?: string;
  },
): Promise<NextResponse | null> {
  const ip = getClientIp(request);
  const id = options.keySuffix ? `${options.keySuffix}:${ip}` : ip;
  const limiter = createFixedWindowLimiter(
    options.limiterPrefix,
    options.max,
    options.window ?? "1 m",
  );
  return rateLimitOr429Response(id, limiter);
}

/**
 * Limite par identifiant stable (ex. userId seul), sans IP.
 */
export async function rateLimitByKey(
  key: string,
  options: { limiterPrefix: string; max: number; window?: "1 m" | "1 h" },
): Promise<NextResponse | null> {
  const limiter = createFixedWindowLimiter(
    options.limiterPrefix,
    options.max,
    options.window ?? "1 m",
  );
  return rateLimitOr429Response(key, limiter);
}

/**
 * Server Action : message d’erreur ou null si OK.
 */
export async function rateLimitServerActionMessage(
  identifier: string,
  limiter: Ratelimit | null,
): Promise<string | null> {
  if (!limiter) return null;
  try {
    await rateLimitOrThrow(identifier, { limiter });
    return null;
  } catch (e) {
    const err = e as Error & { status?: number };
    if (err.status === 429) {
      return RATE_LIMIT_MESSAGE;
    }
    throw e;
  }
}
