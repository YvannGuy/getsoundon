"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { addMonths, startOfDay, subMonths } from "date-fns";
import { Calendar, ChevronLeft, ChevronRight, Clock, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar as CalendarUi } from "@/components/ui/calendar";
import { getCreneauxForSalle } from "@/app/actions/creneaux";
import { createDemandeVisite } from "@/app/actions/create-demande-visite";
import { type Creneau } from "@/lib/creneaux";
import { cn } from "@/lib/utils";

export function FormulaireVisite({ slug }: { slug: string }) {
  const [creneaux, setCreneaux] = useState<Creneau[]>([]);
  const [salleId, setSalleId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedCreneau, setSelectedCreneau] = useState<Creneau | null>(null);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const now = startOfDay(new Date());
  const minMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const maxMonth = addMonths(minMonth, 3);
  const [month, setMonth] = useState<Date>(minMonth);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getCreneauxForSalle(slug).then((r) => {
      if (cancelled) return;
      setCreneaux(r.creneaux);
      setSalleId(r.salle?.id ?? null);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [slug]);

  const { groupedByDate, availableDates, disabledMatcher } = useMemo(() => {
    const grouped: Record<string, Creneau[]> = {};
    for (const c of creneaux) {
      if (!grouped[c.date]) grouped[c.date] = [];
      grouped[c.date].push(c);
    }
    const available = new Set(Object.keys(grouped));
    const today = new Date().toISOString().slice(0, 10);
    const disabled = (date: Date) => {
      const d = date.toISOString().slice(0, 10);
      if (d < today) return true;
      return !available.has(d);
    };
    return {
      groupedByDate: grouped,
      availableDates: available,
      disabledMatcher: disabled,
    };
  }, [creneaux]);

  const creneauxDuJour = selectedDate
    ? (groupedByDate[selectedDate.toISOString().slice(0, 10)] ?? []).sort(
        (a, b) => a.heureDebut.localeCompare(b.heureDebut)
      )
    : [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCreneau || !salleId) return;
    setError(null);
    setIsSubmitting(true);
    const formData = new FormData();
    formData.set("salleId", salleId);
    formData.set("dateVisite", selectedCreneau.date);
    formData.set("heureDebut", selectedCreneau.heureDebut);
    formData.set("heureFin", selectedCreneau.heureFin);
    formData.set("message", message);
    formData.set("redirectTo", `/salles/${slug}/disponibilite`);

    const result = await createDemandeVisite(formData);
    setIsSubmitting(false);
    if (result.success) {
      setSuccess(true);
    } else {
      setError(result.error);
    }
  };

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    setSelectedCreneau(null);
  };

  if (success) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
          <Calendar className="h-7 w-7 text-emerald-600" />
        </div>
        <p className="mt-4 text-lg font-semibold text-emerald-800">Demande envoyée !</p>
        <p className="mt-2 text-sm text-emerald-700">
          Le propriétaire a été notifié. Il acceptera, refusera ou vous proposera un autre créneau.
        </p>
        <Link href="/dashboard" className="mt-6 inline-block">
          <Button variant="outline" className="border-emerald-300 bg-white hover:bg-emerald-50">
            Retour au tableau de bord
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-bold text-black">Organiser une visite</h2>
      <p className="mt-1 text-sm text-slate-600">
        Choisissez une date puis un créneau pour découvrir la salle avec le propriétaire
      </p>

      {loading ? (
        <div className="mt-8 flex items-center justify-center gap-2 py-12 text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Chargement des créneaux...</span>
        </div>
      ) : creneaux.length === 0 ? (
        <div className="mt-8 rounded-lg border border-amber-200 bg-amber-50/80 p-6 text-center">
          <p className="text-sm font-medium text-amber-900">
            Cette salle n&apos;a pas encore défini ses créneaux de visite.
          </p>
          <p className="mt-2 text-sm text-amber-800">
            Revenez plus tard ou contactez directement le propriétaire.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Date * — Les dates disponibles sont cliquables
            </label>
            <div className="flex flex-col items-center gap-2">
              <div className="flex w-full max-w-[280px] items-center justify-between rounded-t-lg border border-b-0 border-slate-200 bg-slate-50/80 px-3 py-2">
                <button
                  type="button"
                  onClick={() => setMonth((m) => subMonths(m, 1))}
                  disabled={
                    month.getFullYear() <= minMonth.getFullYear() &&
                    month.getMonth() <= minMonth.getMonth()
                  }
                  className="flex h-8 w-8 items-center justify-center rounded-md text-slate-600 transition hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label="Mois précédent"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <span className="text-sm font-semibold capitalize text-slate-800">
                  {month.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}
                </span>
                <button
                  type="button"
                  onClick={() => setMonth((m) => addMonths(m, 1))}
                  disabled={
                    month.getFullYear() >= maxMonth.getFullYear() &&
                    month.getMonth() >= maxMonth.getMonth()
                  }
                  className="flex h-8 w-8 items-center justify-center rounded-md text-slate-600 transition hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label="Mois suivant"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
              <CalendarUi
                mode="single"
                selected={selectedDate}
                onSelect={handleDateSelect}
                month={month}
                onMonthChange={setMonth}
                disabled={disabledMatcher}
                startMonth={minMonth}
                endMonth={maxMonth}
                hideNavigation
                className="rounded-b-lg border border-slate-200 p-3"
                classNames={{
                  month_caption: "hidden",
                  day_button: cn(
                    "h-9 w-9 rounded-md text-sm font-normal",
                    "aria-disabled:opacity-40 aria-disabled:cursor-not-allowed",
                    "hover:bg-violet-100 hover:text-violet-900",
                    "aria-selected:bg-violet-600 aria-selected:text-white aria-selected:hover:bg-violet-600 aria-selected:hover:text-white"
                  ),
                  disabled: "text-slate-400",
                  outside: "text-slate-300",
                  today: "bg-slate-100 font-medium",
                }}
              />
            </div>
          </div>

          {selectedDate && creneauxDuJour.length > 0 && (
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Créneau *
              </label>
              <div className="flex flex-wrap gap-2">
                {creneauxDuJour.map((c) => (
                  <button
                    key={`${c.date}-${c.heureDebut}`}
                    type="button"
                    onClick={() => setSelectedCreneau(c)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                      selectedCreneau?.date === c.date && selectedCreneau?.heureDebut === c.heureDebut
                        ? "border-violet-500 bg-violet-600 text-white"
                        : "border-slate-200 bg-white text-slate-700 hover:border-violet-300 hover:bg-violet-50"
                    )}
                  >
                    <Clock className="h-3.5 w-3.5" />
                    {c.heureDebut} – {c.heureFin}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Message (optionnel)
            </label>
            <textarea
              placeholder="Ex: Je souhaite visiter pour un culte régulier..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-1"
            />
          </div>

          <Button
            type="submit"
            disabled={!selectedCreneau || isSubmitting}
            className="h-12 w-full rounded-lg bg-violet-600 font-semibold hover:bg-violet-700 disabled:opacity-50"
          >
            {isSubmitting ? "Envoi en cours..." : "Envoyer la demande de visite"}
          </Button>

          <p className="flex items-center justify-center gap-2 text-xs text-slate-500">
            <span>Sans engagement</span>
            <span>•</span>
            <span>Le propriétaire confirmera ou proposera un autre créneau</span>
          </p>
        </form>
      )}
    </div>
  );
}
