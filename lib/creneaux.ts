/**
 * Génération des créneaux de visite disponibles à partir des horaires de la salle.
 */

import type { Salle } from "./types/salle";

const JOUR_TO_DOW: Record<string, number> = {
  dimanche: 0,
  lundi: 1,
  mardi: 2,
  mercredi: 3,
  jeudi: 4,
  vendredi: 5,
  samedi: 6,
};

const SLOT_DURATION_MINUTES = 60;

export type Creneau = {
  date: string; // YYYY-MM-DD
  heureDebut: string; // HH:mm
  heureFin: string; // HH:mm
  jourLabel: string;
};

/**
 * Parse "09:00" ou "09:00:00" en minutes depuis minuit
 */
function timeToMinutes(s: string): number {
  const m = s.match(/(\d{1,2}):(\d{2})/);
  if (!m) return 0;
  return parseInt(m[1]!, 10) * 60 + parseInt(m[2]!, 10);
}

function minutesToTime(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Génère les créneaux pour les N prochaines semaines.
 * Exclut les dates bloquées et les créneaux déjà réservés.
 */
export function getCreneauxDisponibles(
  salle: Salle,
  weeksAhead: number = 12, // ~3 mois pour permettre la sélection sur plusieurs mois
  excludedDates: string[] = [], // YYYY-MM-DD
  takenSlots: { date: string; heure_debut: string; heure_fin: string }[] = []
): Creneau[] {
  const excludedSet = new Set(excludedDates);
  const takenSet = new Set(
    takenSlots.map((s) => `${s.date}|${s.heure_debut}|${s.heure_fin}`)
  );

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const creneaux: Creneau[] = [];

  const JOUR_LABELS: Record<string, string> = {
    lundi: "Lundi",
    mardi: "Mardi",
    mercredi: "Mercredi",
    jeudi: "Jeudi",
    vendredi: "Vendredi",
    samedi: "Samedi",
    dimanche: "Dimanche",
  };

  // Mode calendrier : dates précises + horaires par date ou horaires fixes
  if (salle.visiteDates?.length) {
    const defaultDebut = salle.visiteHeureDebut ?? "14:00";
    const defaultFin = salle.visiteHeureFin ?? "18:00";

    for (const dateStr of salle.visiteDates) {
      if (dateStr < todayStr) continue;
      if (excludedSet.has(dateStr)) continue;

      const h = salle.visiteHorairesParDate?.[dateStr] ?? { debut: defaultDebut, fin: defaultFin };
      const startMin = timeToMinutes(h.debut);
      const endMin = timeToMinutes(h.fin);

      const d = new Date(dateStr + "T12:00:00");
      const jourLabel = d.toLocaleDateString("fr-FR", { weekday: "long" });

      for (let slotStart = startMin; slotStart + SLOT_DURATION_MINUTES <= endMin; slotStart += SLOT_DURATION_MINUTES) {
        if (dateStr === todayStr && slotStart < nowMinutes) continue;
        const slotEnd = slotStart + SLOT_DURATION_MINUTES;
        const heureDebut = minutesToTime(slotStart);
        const heureFin = minutesToTime(slotEnd);
        const key = `${dateStr}|${heureDebut}|${heureFin}`;
        if (takenSet.has(key)) continue;

        creneaux.push({
          date: dateStr,
          heureDebut,
          heureFin,
          jourLabel,
        });
      }
    }

    return creneaux.sort(
      (a, b) =>
        a.date.localeCompare(b.date) ||
        a.heureDebut.localeCompare(b.heureDebut)
    );
  }

  // Mode hebdomadaire : jours de la semaine + horaires par jour
  const jours = (salle.joursVisite?.length ? salle.joursVisite : salle.joursOuverture) ?? [];
  const horaires = salle.horairesParJour ?? {};
  if (jours.length === 0 || Object.keys(horaires).length === 0) {
    return [];
  }

  for (let w = 0; w < weeksAhead; w++) {
    for (const jour of jours) {
      const h = horaires[jour];
      if (!h?.debut || !h?.fin) continue;

      const startMin = timeToMinutes(h.debut);
      const endMin = timeToMinutes(h.fin);
      const jourDow = JOUR_TO_DOW[jour] ?? -1;
      if (jourDow < 0) continue;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const d = new Date(today);
      d.setDate(d.getDate() + w * 7);
      const currDow = d.getDay();
      let diff = jourDow - currDow;
      if (diff < 0) diff += 7;
      d.setDate(d.getDate() + diff);
      if (w === 0 && d < today) continue;

      const dateStr = d.toISOString().slice(0, 10);
      if (excludedSet.has(dateStr)) continue;

      for (let slotStart = startMin; slotStart + SLOT_DURATION_MINUTES <= endMin; slotStart += SLOT_DURATION_MINUTES) {
        if (dateStr === todayStr && slotStart < nowMinutes) continue;
        const slotEnd = slotStart + SLOT_DURATION_MINUTES;
        const heureDebut = minutesToTime(slotStart);
        const heureFin = minutesToTime(slotEnd);
        const key = `${dateStr}|${heureDebut}|${heureFin}`;
        if (takenSet.has(key)) continue;

        creneaux.push({
          date: dateStr,
          heureDebut,
          heureFin,
          jourLabel: JOUR_LABELS[jour] ?? jour,
        });
      }
    }
  }

  return creneaux.sort(
    (a, b) =>
      a.date.localeCompare(b.date) ||
      a.heureDebut.localeCompare(b.heureDebut)
  );
}

/** Formate un créneau pour affichage court */
export function formatCreneauLabel(c: Creneau): string {
  const d = new Date(c.date + "T12:00:00");
  const opts: Intl.DateTimeFormatOptions = {
    weekday: "long",
    day: "numeric",
    month: "long",
  };
  const dateLabel = d.toLocaleDateString("fr-FR", opts);
  return `${dateLabel}, ${c.heureDebut} – ${c.heureFin}`;
}
