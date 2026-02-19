import { createClient } from "@/lib/supabase/server";
import type { Salle } from "@/lib/types/salle";
import { rowToSalle } from "@/lib/types/salle";

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
