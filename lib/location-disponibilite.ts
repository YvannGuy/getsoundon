import { createAdminClient } from "@/lib/supabase/admin";

function toYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function expandDateRangeInclusive(start: string, end: string): string[] {
  const startDate = new Date(`${start}T12:00:00`);
  const endDate = new Date(`${end}T12:00:00`);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || endDate < startDate) {
    return [];
  }
  const dates: string[] = [];
  const cursor = new Date(startDate);
  while (cursor <= endDate) {
    dates.push(toYmd(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

export async function getBlockedLocationDatesForSalle(salleId: string): Promise<string[]> {
  if (!salleId) return [];
  const supabase = createAdminClient();
  const blocked = new Set<string>();

  try {
    const { data: paidOffers } = await supabase
      .from("offers")
      .select("date_debut, date_fin")
      .eq("salle_id", salleId)
      .eq("status", "paid");

    for (const offer of paidOffers ?? []) {
      const row = offer as { date_debut?: string | null; date_fin?: string | null };
      const start = (row.date_debut ?? "").slice(0, 10);
      const end = (row.date_fin ?? row.date_debut ?? "").slice(0, 10);
      if (!start || !end) continue;
      for (const date of expandDateRangeInclusive(start, end)) {
        blocked.add(date);
      }
    }
  } catch {
    // Table non disponible ou RLS: on ignore pour ne pas casser l'UI.
  }

  try {
    const { data: manualExclusions } = await supabase
      .from("salle_location_exclusions")
      .select("date_exclusion")
      .eq("salle_id", salleId);

    for (const row of manualExclusions ?? []) {
      const date = ((row as { date_exclusion?: string | null }).date_exclusion ?? "").slice(0, 10);
      if (date) blocked.add(date);
    }
  } catch {
    // Table non disponible ou RLS: on ignore pour ne pas casser l'UI.
  }

  return [...blocked].sort((a, b) => a.localeCompare(b));
}
