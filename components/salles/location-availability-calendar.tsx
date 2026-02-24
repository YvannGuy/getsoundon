"use client";

import { useMemo } from "react";

import { Calendar } from "@/components/ui/calendar";

const DOW_TO_JOUR: Record<number, string> = {
  0: "dimanche",
  1: "lundi",
  2: "mardi",
  3: "mercredi",
  4: "jeudi",
  5: "vendredi",
  6: "samedi",
};

function toYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function isOpenDay(date: Date, joursOuverture?: string[]): boolean {
  if (!joursOuverture || joursOuverture.length === 0) return true;
  const jour = DOW_TO_JOUR[date.getDay()];
  return joursOuverture.includes(jour);
}

export function LocationAvailabilityCalendar({
  blockedDates,
  joursOuverture,
}: {
  blockedDates: string[];
  joursOuverture?: string[];
}) {
  const { availableDates, unavailableDates } = useMemo(() => {
    const blockedSet = new Set(blockedDates);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const available: Date[] = [];
    const unavailable: Date[] = [];

    for (let i = 0; i < 180; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const key = toYmd(d);
      if (!isOpenDay(d, joursOuverture) || blockedSet.has(key)) {
        unavailable.push(d);
      } else {
        available.push(d);
      }
    }

    return { availableDates: available, unavailableDates: unavailable };
  }, [blockedDates, joursOuverture]);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-base font-semibold text-black">Disponibilités location</h3>
      <p className="mt-1 text-xs text-slate-500">
        Vert = disponible, rouge = déjà réservé ou indisponible.
      </p>

      <div className="mt-3 rounded-lg border border-slate-100">
        <Calendar
          className="w-full"
          disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
          modifiers={{
            available: availableDates,
            unavailable: unavailableDates,
          }}
          modifiersClassNames={{
            available: "bg-emerald-100 text-emerald-800 rounded-md",
            unavailable: "bg-rose-100 text-rose-700 rounded-md",
          }}
        />
      </div>

      <div className="mt-3 flex items-center gap-4 text-xs text-slate-600">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
          Disponible
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
          Indisponible
        </span>
      </div>
    </div>
  );
}
