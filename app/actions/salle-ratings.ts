"use server";

import { createClient } from "@/lib/supabase/server";

export type RatingResult =
  | { success: true }
  | { success: false; error: string };

export async function rateSalle(salleId: string, stars: number): Promise<RatingResult> {
  if (stars < 1 || stars > 5) return { success: false, error: "Note invalide" };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Connexion requise" };
  }

  const { error } = await supabase
    .from("salles_ratings")
    .upsert(
      [{ user_id: user.id, salle_id: salleId, stars }],
      { onConflict: "user_id,salle_id" }
    );
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function getSalleRatingStats(salleId: string): Promise<{
  avg: number;
  count: number;
  userStars: number | null;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: rows } = await supabase
    .from("salles_ratings")
    .select("stars")
    .eq("salle_id", salleId);

  const count = rows?.length ?? 0;
  const avg =
    count > 0
      ? Math.round((rows!.reduce((s, r) => s + r.stars, 0) / count) * 10) / 10
      : 0;

  let userStars: number | null = null;
  if (user) {
    const { data: userRow } = await supabase
      .from("salles_ratings")
      .select("stars")
      .eq("salle_id", salleId)
      .eq("user_id", user.id)
      .maybeSingle();
    userStars = userRow?.stars ?? null;
  }

  return { avg, count, userStars };
}

export async function getBulkRatingStats(
  salleIds: string[]
): Promise<Record<string, { avg: number; count: number }>> {
  if (salleIds.length === 0) return {};
  try {
    const supabase = await createClient();
    const { data: rows } = await supabase
      .from("salles_ratings")
      .select("salle_id, stars")
      .in("salle_id", salleIds);

    const bySalle = new Map<string, number[]>();
    for (const r of rows ?? []) {
      const list = bySalle.get(r.salle_id) ?? [];
      list.push(r.stars);
      bySalle.set(r.salle_id, list);
    }

    const result: Record<string, { avg: number; count: number }> = {};
    for (const [id, stars] of bySalle) {
      const count = stars.length;
      const avg = Math.round((stars.reduce((a, b) => a + b, 0) / count) * 10) / 10;
      result[id] = { avg, count };
    }
    return result;
  } catch {
    return {};
  }
}
