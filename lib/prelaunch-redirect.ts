/**
 * Valide un chemin de redirection pour /api/prelaunch/enable (anti open redirect).
 * N’accepte que les URLs résolues sur la même origine que la requête, en path + query relatifs.
 */
export function getSafeSameOriginRedirectPath(requestUrl: string, redirectParam: string | null): string {
  const fallback = "/";
  if (!redirectParam?.trim()) return fallback;
  const raw = redirectParam.trim();
  if (!raw.startsWith("/") || raw.startsWith("//")) return fallback;
  if (raw.includes("\\") || raw.includes("\0")) return fallback;
  try {
    const base = new URL(requestUrl);
    const resolved = new URL(raw, base);
    if (resolved.origin !== base.origin) return fallback;
    const path = resolved.pathname + resolved.search;
    if (!path.startsWith("/")) return fallback;
    return path;
  } catch {
    return fallback;
  }
}
