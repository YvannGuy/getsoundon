import { mapCompanyResponse } from "./company.mapper";
import type { CompanySearchQuery, CompanySearchResult } from "./company.types";

const ENTREPRISE_API_URL = "https://recherche-entreprises.api.gouv.fr/search";
const DEFAULT_LIMIT = 8;
const TIMEOUT_MS = 4500;

export async function searchCompany(query: CompanySearchQuery): Promise<CompanySearchResult> {
  const q = query.q.trim();
  if (q.length < 2) {
    return { suggestions: [] };
  }

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const url = new URL(ENTREPRISE_API_URL);
    url.searchParams.set("q", q);
    url.searchParams.set("page_size", String(query.limit ?? DEFAULT_LIMIT));
    // focus on sieges to get siret in response
    url.searchParams.set("types", "personne_morale");

    const res = await fetch(url.toString(), { signal: controller.signal });
    if (!res.ok) {
      throw new Error(`Upstream ${res.status}`);
    }
    const json = (await res.json()) as unknown;
    const suggestions = mapCompanyResponse(json as never, query.limit ?? DEFAULT_LIMIT);
    return { suggestions };
  } catch (e) {
    if ((e as Error).name === "AbortError") {
      throw new Error("Timeout API entreprises");
    }
    throw e;
  } finally {
    clearTimeout(id);
  }
}
