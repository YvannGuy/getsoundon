/** Utilitaires partagés entre l’API listings et le mode mock (filtres identiques). */

export function sanitizeIlikeToken(s: string): string {
  return s.replace(/%/g, "").replace(/,/g, " ").replace(/\s+/g, " ").trim();
}

export function locationSearchFragments(raw: string): string[] {
  const t = sanitizeIlikeToken(raw);
  if (t.length < 2) return [];
  const withoutParen = t.split("(")[0].trim();
  const set = new Set<string>();
  if (t.length >= 2) set.add(t);
  if (withoutParen.length >= 2 && withoutParen !== t) set.add(withoutParen);
  const postal = raw.match(/\b(\d{5})\b/);
  if (postal?.[1]) set.add(postal[1]);
  return [...set].map(sanitizeIlikeToken).filter((x) => x.length >= 2);
}

export function listingHaystack(title: string, description: string): string {
  return `${title} ${description}`.toLowerCase();
}

export function matchesAnyKeyword(haystack: string, keywords: readonly string[]): boolean {
  return keywords.some((k) => {
    const s = sanitizeIlikeToken(k).toLowerCase();
    return s.length >= 2 && haystack.includes(s);
  });
}

export function matchesSingleQuery(haystack: string, q: string): boolean {
  const s = sanitizeIlikeToken(q).toLowerCase();
  return s.length >= 1 && haystack.includes(s);
}

export function locationMatchesRow(rowLocation: string, rawFilter: string | undefined): boolean {
  if (!rawFilter?.trim()) return true;
  const frags = locationSearchFragments(rawFilter);
  if (frags.length === 0) return true;
  const loc = rowLocation.toLowerCase();
  return frags.some((f) => loc.includes(f.toLowerCase()));
}
