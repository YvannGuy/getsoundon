"use client";

import { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Clock, Lightbulb, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/search/date-picker";
import { createDemande } from "@/app/actions/create-demande";
import type { Salle } from "@/lib/types/salle";
import { cn } from "@/lib/utils";

const FREQUENCES = [
  { id: "ponctuel", label: "Ponctuel" },
  { id: "hebdomadaire", label: "Hebdomadaire" },
  { id: "mensuel", label: "Mensuel" },
] as const;

export function FormulaireDisponibilite({ salle }: { salle: Salle }) {
  const [dateDebut, setDateDebut] = useState<Date | undefined>();
  const [frequence, setFrequence] = useState<string>("ponctuel");
  const [nbPersonnes, setNbPersonnes] = useState("");
  const [heureDebut, setHeureDebut] = useState("");
  const [heureFin, setHeureFin] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData();
    formData.set("salleId", salle.id);
    formData.set("dateDebut", dateDebut ? format(dateDebut, "yyyy-MM-dd") : "");
    formData.set("frequence", frequence);
    formData.set("nbPersonnes", nbPersonnes);
    formData.set("heureDebut", heureDebut || "--- --:--");
    formData.set("heureFin", heureFin || "--- --:--");
    formData.set("message", message);
    formData.set("redirectTo", `/salles/${salle.slug}/disponibilite`);

    const result = await createDemande(formData);

    if (result.success) {
      setSuccess(true);
    } else {
      setError(result.error);
    }
    setIsSubmitting(false);
  };

  if (success) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-8 text-center">
        <p className="text-lg font-semibold text-emerald-800">Demande envoyée !</p>
        <p className="mt-2 text-sm text-emerald-700">
          Le propriétaire a été notifié et vous répondra dans les plus brefs délais.
        </p>
        <Link href="/dashboard/demandes" className="mt-6 inline-block">
          <Button variant="outline" className="border-emerald-300 bg-white hover:bg-emerald-50">
            Voir mes demandes
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-bold text-[#304256]">Vérifier la disponibilité</h2>
      <p className="mt-1 text-sm text-slate-600">
        Décrivez votre événement pour contacter le propriétaire
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Date de l&apos;événement *
          </label>
          <DatePicker
            value={dateDebut}
            onChange={setDateDebut}
            placeholder="jj/mm/aaaa"
            className="w-full"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Fréquence *
          </label>
          <div className="flex gap-2">
            {FREQUENCES.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFrequence(f.id)}
                className={cn(
                  "flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors",
                  frequence === f.id
                    ? "border-violet-500 bg-violet-600 text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Nombre de participants *
          </label>
          <div className="relative">
            <Users className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              type="number"
              placeholder="Ex: 120"
              value={nbPersonnes}
              onChange={(e) => setNbPersonnes(e.target.value)}
              min={1}
              max={salle.capacity}
              className="h-11 rounded-lg border-slate-200 pl-4 pr-10"
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Horaires souhaités *
          </label>
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Clock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                type="time"
                value={heureDebut}
                onChange={(e) => setHeureDebut(e.target.value)}
                className="h-11 rounded-lg border-slate-200 pl-10"
              />
            </div>
            <span className="text-slate-400">→</span>
            <div className="relative flex-1">
              <Clock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                type="time"
                value={heureFin}
                onChange={(e) => setHeureFin(e.target.value)}
                className="h-11 rounded-lg border-slate-200 pl-10"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Message (optionnel)
          </label>
          <textarea
            placeholder="Précisions complémentaires..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-1"
          />
        </div>

        <Button
          type="submit"
          disabled={isSubmitting || !dateDebut}
          className="h-12 w-full rounded-lg bg-violet-600 font-semibold hover:bg-violet-700"
        >
          {isSubmitting ? "Envoi en cours..." : "Envoyer la demande"}
        </Button>

        <p className="flex items-center justify-center gap-2 text-xs text-slate-500">
          <span>Réponse rapide</span>
          <span>•</span>
          <span>Demande sans engagement</span>
        </p>
      </form>

      <div className="mt-6 flex gap-3 rounded-lg border border-amber-200 bg-amber-50/80 p-4">
        <Lightbulb className="h-5 w-5 shrink-0 text-amber-600" />
        <p className="text-sm text-amber-900">
          Soyez précis dans votre description pour obtenir une réponse plus rapide et adaptée à vos
          besoins.
        </p>
      </div>
    </div>
  );
}
