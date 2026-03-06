import { createClient } from "@/lib/supabase/server";
import type { Salle } from "@/lib/types/salle";
import { rowToSalle } from "@/lib/types/salle";
import { DEPT_LABELS, getDepartmentCoverUrl } from "@/lib/covers";

export type SearchFilters = {
  ville?: string;
  departement?: string;
  date_debut?: string;
  date_fin?: string;
  personnes_min?: string;
  personnes_max?: string;
  type?: string;
};

export async function getSalles(): Promise<Salle[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("salles")
    .select("*")
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getSalles error:", error);
    return [];
  }
  return (data ?? []).map((row) => rowToSalle(row as Parameters<typeof rowToSalle>[0]));
}

// Mapping type formulaire recherche → type DB (evenements_acceptes)
const TYPE_TO_DB: Record<string, string> = {
  "culte-regulier": "culte",
  celebration: "culte",
  bapteme: "bapteme",
  conference: "conference",
  retraite: "retraite",
  concert: "concert",
};

export async function searchSalles(filters: SearchFilters): Promise<Salle[]> {
  const supabase = await createClient();
  let query = supabase
    .from("salles")
    .select("*")
    .eq("status", "approved");

  // Filtre par ville/département/arrondissement
  if (filters.ville?.trim()) {
    const villes = filters.ville
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
    if (villes.length > 0) {
      if (villes.length === 1) {
        query = query.ilike("city", villes[0]);
      } else {
        query = query.or(villes.map((v) => `city.ilike.${v}`).join(","));
      }
    }
  }

  if (filters.departement?.trim()) {
    query = query.eq("department", filters.departement.trim());
  }

  // Filtre par capacité (fourchette min-max)
  const capaciteMin = filters.personnes_min ? parseInt(filters.personnes_min, 10) : 0;
  const capaciteMax = filters.personnes_max ? parseInt(filters.personnes_max, 10) : 0;
  if (!isNaN(capaciteMin) && capaciteMin > 0) {
    query = query.gte("capacity", capaciteMin);
  }
  if (!isNaN(capaciteMax) && capaciteMax > 0) {
    query = query.lte("capacity", capaciteMax);
  }

  // Filtre par type d'événement (evenements_acceptes contient le type)
  if (filters.type?.trim()) {
    const dbType = TYPE_TO_DB[filters.type] ?? filters.type;
    query = query.contains("evenements_acceptes", [dbType]);
  }

  query = query.order("created_at", { ascending: false });

  const { data, error } = await query;
  if (error) {
    console.error("searchSalles error:", error);
    return [];
  }

  const dbType = filters.type?.trim() ? (TYPE_TO_DB[filters.type] ?? filters.type) : null;
  const rawRows = (data ?? []).filter((row) => {
    if (!dbType) return true;
    const evts = (row as { evenements_acceptes?: string[] | null }).evenements_acceptes;
    if (!evts || !Array.isArray(evts)) return false;
    return evts.includes(dbType);
  });

  let salles = rawRows.map((row) =>
    rowToSalle(row as Parameters<typeof rowToSalle>[0])
  );

  // Filtre par plage de dates : exclure les salles avec une réservation qui chevauche la période
  const dateDebut = filters.date_debut?.trim()?.slice(0, 10);
  const dateFin = filters.date_fin?.trim()?.slice(0, 10);
  if (dateDebut && dateFin) {
    try {
      // Offres qui commencent avant la fin de la recherche (candidats au chevauchement)
      const { data: offerData } = await supabase
        .from("offers")
        .select("salle_id, date_debut, date_fin")
        .eq("status", "paid")
        .lte("date_debut", dateFin);

      const blockedSalleIds = new Set(
        (offerData ?? []).filter((r: { salle_id?: string; date_debut?: string; date_fin?: string | null }) => {
          const offerEnd = (r.date_fin ?? r.date_debut ?? "").slice(0, 10);
          return offerEnd >= dateDebut; // chevauchement : offerEnd >= searchStart
        }).map((r: { salle_id: string }) => r.salle_id)
      );
      salles = salles.filter((s) => !blockedSalleIds.has(s.id));
    } catch {
      // Table offers inexistante ou erreur → pas de filtre date
    }
  }

  return salles;
}

export async function getFeaturedDepartments(): Promise<
  { departmentCode: string; departmentLabel: string; count: number; image: string }[]
> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("salles")
    .select("department")
    .eq("status", "approved");

  if (error) {
    console.error("getFeaturedDepartments error:", error);
    return [];
  }

  const validIdf = new Set(["75", "77", "78", "91", "92", "93", "94", "95"]);
  const byDept = new Map<string, number>();

  (data ?? []).forEach((r) => {
    const dept = String((r as { department?: string | null }).department ?? "").trim();
    if (!dept || !validIdf.has(dept)) return;
    byDept.set(dept, (byDept.get(dept) ?? 0) + 1);
  });

  return Array.from(byDept.entries())
    .map(([departmentCode, count]) => ({
      departmentCode,
      departmentLabel: DEPT_LABELS[departmentCode] ?? `Département ${departmentCode}`,
      count,
      image: getDepartmentCoverUrl(departmentCode),
    }))
    .sort((a, b) => b.count - a.count);
}

export async function getSalleBySlug(slug: string): Promise<Salle | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("salles")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error || !data) return null;
  return rowToSalle(data as Parameters<typeof rowToSalle>[0]);
}

/** Période en ms pour la rotation des villes à la une (4 jours) */
const FEATURED_CITIES_PERIOD_MS = 4 * 24 * 60 * 60 * 1000;

/** Max 6 villes affichées dans "Découvrir les lieux en Île-de-France" */
const FEATURED_CITIES_MAX = 6;

/**
 * Retourne les 6 villes à mettre en avant sur la homepage.
 * Priorise les villes avec des salles ajoutées dans les 4 derniers jours.
 * Les villes changent automatiquement en fonction de ce qui est ajouté.
 */
export async function getFeaturedCities(
  getVilleImage: (city: string) => string
): Promise<{ city: string; count: number; image: string }[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("salles")
    .select("city, created_at")
    .eq("status", "approved");

  if (error) {
    console.error("getFeaturedCities error:", error);
    return [];
  }

  const cutoff = new Date(Date.now() - FEATURED_CITIES_PERIOD_MS);
  const byCity = new Map<
    string,
    { total: number; recent: number }
  >();

  (data ?? []).forEach((r) => {
    const city = r.city ?? "";
    if (!city) return;
    const prev = byCity.get(city) ?? { total: 0, recent: 0 };
    prev.total += 1;
    const created = r.created_at ? new Date(r.created_at) : null;
    if (created && created >= cutoff) prev.recent += 1;
    byCity.set(city, prev);
  });

  const sorted = Array.from(byCity.entries())
    .map(([city, stats]) => ({ city, count: stats.total, recent: stats.recent }))
    .sort((a, b) => {
      if (a.recent !== b.recent) return b.recent - a.recent;
      return b.count - a.count;
    })
    .slice(0, FEATURED_CITIES_MAX)
    .map(({ city, count }) => ({ city, count, image: getVilleImage(city) }));

  return sorted;
}

export async function getSallesByCity(
  city: string,
  excludeSlug?: string
): Promise<Salle[]> {
  const supabase = await createClient();
  let query = supabase
    .from("salles")
    .select("*")
    .eq("status", "approved")
    .ilike("city", city)
    .limit(10);

  if (excludeSlug) {
    query = query.neq("slug", excludeSlug);
  }

  const { data, error } = await query;
  if (error) return [];
  const salles = (data ?? []).map((row) =>
    rowToSalle(row as Parameters<typeof rowToSalle>[0])
  );
  return excludeSlug ? salles.slice(0, 2) : salles;
}
