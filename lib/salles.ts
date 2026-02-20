import { createClient } from "@/lib/supabase/server";
import type { Salle } from "@/lib/types/salle";
import { rowToSalle } from "@/lib/types/salle";

export type SearchFilters = {
  ville?: string;
  date?: string;
  personnes?: string;
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

  // Filtre par capacité (nombre de personnes)
  const capaciteMin = filters.personnes ? parseInt(filters.personnes, 10) : 0;
  if (!isNaN(capaciteMin) && capaciteMin > 0) {
    query = query.gte("capacity", capaciteMin);
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

  let salles = (data ?? []).map((row) =>
    rowToSalle(row as Parameters<typeof rowToSalle>[0])
  );

  // Filtre par date : exclure les salles avec une réservation sur cette date
  if (filters.date?.trim()) {
    try {
      const searchDate = filters.date.slice(0, 10);
      const { data: resaData } = await supabase
        .from("reservations")
        .select("salle_id")
        .lte("date_debut", searchDate)
        .gte("date_fin", searchDate);

      const blockedSalleIds = new Set((resaData ?? []).map((r) => r.salle_id));
      salles = salles.filter((s) => !blockedSalleIds.has(s.id));
    } catch {
      // Table reservations inexistante ou erreur → pas de filtre date
    }
  }

  return salles;
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
