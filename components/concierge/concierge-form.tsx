"use client";

import { useRef, useState } from "react";
import { DepartmentAutocomplete } from "@/components/search/department-autocomplete";
import { VilleAutocomplete } from "@/components/search/ville-autocomplete";
import { DateRangePicker } from "@/components/search/date-range-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { submitConciergeRequest, type ConciergeFormPayload } from "@/app/actions/concierge";
import { DEPT_LABELS } from "@/lib/covers";

export type ConciergeInitialValues = {
  ville?: string;
  departement?: string;
  date_debut?: string;
  date_fin?: string;
  personnes_min?: string;
  personnes_max?: string;
  type?: string;
};

type ConciergeFormProps = {
  initialValues: ConciergeInitialValues;
  isLoggedIn: boolean;
  source: "homepage" | "search_zero_results" | "other";
};

export function ConciergeForm({ initialValues, isLoggedIn, source }: ConciergeFormProps) {
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const deptRef = useRef(initialValues.departement ?? "");
  const hasVille = !!initialValues.ville;
  const hasDept = !!initialValues.departement;
  const [zone, setZone] = useState(
    initialValues.ville ??
      (hasDept ? DEPT_LABELS[initialValues.departement!] ?? initialValues.departement : "")
  );
  const [codePostal, setCodePostal] = useState("");
  const [capacite, setCapacite] = useState(
    initialValues.personnes_max ?? initialValues.personnes_min ?? ""
  );
  const [type, setType] = useState<"ponctuel" | "mensuel">(
    initialValues.date_debut ? "ponctuel" : "mensuel"
  );
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date } | undefined>(() => {
    if (initialValues.date_debut && initialValues.date_fin) {
      const from = new Date(initialValues.date_debut);
      const to = new Date(initialValues.date_fin);
      if (!isNaN(from.getTime()) && !isNaN(to.getTime())) {
        return { from, to };
      }
    }
    return undefined;
  });
  const [frequence, setFrequence] = useState("");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [contraintes, setContraintes] = useState("");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const msg = message.trim();
    if (msg.length < 10) {
      setError("Décrivez votre besoin en 2–3 phrases (au moins 10 caractères).");
      setLoading(false);
      return;
    }

    if (!isLoggedIn && (!email.trim() || !email.includes("@"))) {
      setError("Indiquez une adresse email valide.");
      setLoading(false);
      return;
    }

    const payload: ConciergeFormPayload = {
      zone: zone.trim() || undefined,
      code_postal: codePostal.trim() || undefined,
      capacite: capacite ? parseInt(capacite, 10) : undefined,
      type,
      date_debut: dateRange?.from?.toISOString().slice(0, 10),
      date_fin: dateRange?.to?.toISOString().slice(0, 10),
      frequence: type === "mensuel" ? frequence.trim() || undefined : undefined,
      budget_min: budgetMin ? parseInt(budgetMin, 10) : undefined,
      budget_max: budgetMax ? parseInt(budgetMax, 10) : undefined,
      contraintes: contraintes.trim() || undefined,
      message: msg,
      email: isLoggedIn ? undefined : email.trim(),
      phone: isLoggedIn ? undefined : phone.trim(),
      ville: initialValues.ville,
      departement: initialValues.departement || deptRef.current || undefined,
      personnes_min: initialValues.personnes_min,
      personnes_max: initialValues.personnes_max,
      date_debut_search: initialValues.date_debut,
      date_fin_search: initialValues.date_fin,
      type_evenement: initialValues.type,
    };

    const result = await submitConciergeRequest(payload, source);

    setLoading(false);
    if (result.success) {
      setSubmitted(true);
    } else {
      setError(result.error ?? "Erreur.");
    }
  };

  if (submitted) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-8 text-center">
        <h3 className="text-xl font-semibold text-emerald-800">Merci !</h3>
        <p className="mt-3 text-[15px] leading-relaxed text-emerald-700">
          On vous recontacte sous 24–72h. Nous préparerons une shortlist de 3 à 5 lieux adaptés à votre besoin.
        </p>
        <a
          href="/rechercher"
          className="mt-6 inline-flex h-11 items-center justify-center rounded-lg bg-gs-orange px-5 text-[14px] font-semibold text-white transition hover:brightness-95"
        >
          Retour aux salles
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" id="form">
      {error && (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[14px] text-rose-700">
          {error}
        </p>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-[13px] font-medium text-slate-700">Zone (département / ville)</label>
          {hasVille ? (
            <VilleAutocomplete
              value={zone}
              onChange={setZone}
              placeholder="Paris, Versailles, Meaux..."
              inputClassName="h-11 rounded-lg border-slate-200"
            />
          ) : (
            <DepartmentAutocomplete
              value={zone}
              onChange={(v) => {
                setZone(v);
                deptRef.current = v;
              }}
              valueRef={deptRef}
              placeholder="Paris, Yvelines, 78..."
              inputClassName="h-11 rounded-lg border-slate-200"
            />
          )}
        </div>
        <div className="space-y-1.5">
          <label className="text-[13px] font-medium text-slate-700">Code postal (optionnel)</label>
          <Input
            type="text"
            placeholder="75001"
            value={codePostal}
            onChange={(e) => setCodePostal(e.target.value)}
            className="h-11"
          />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-[13px] font-medium text-slate-700">Capacité (nombre de personnes)</label>
          <Input
            type="number"
            placeholder="Ex: 100"
            min={1}
            value={capacite}
            onChange={(e) => setCapacite(e.target.value)}
            className="h-11"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[13px] font-medium text-slate-700">Type</label>
          <Select value={type} onValueChange={(v) => setType(v as "ponctuel" | "mensuel")}>
            <SelectTrigger className="h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ponctuel">Ponctuel</SelectItem>
              <SelectItem value="mensuel">Mensuel</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {type === "ponctuel" && (
        <div className="space-y-1.5">
          <label className="text-[13px] font-medium text-slate-700">Date (période)</label>
          <DateRangePicker
            value={dateRange}
            onChange={setDateRange}
            placeholder="Du jj/mm/aaaa au jj/mm/aaaa"
            className="w-full"
            inputClassName="h-11 rounded-lg border-slate-200"
          />
        </div>
      )}

      {type === "mensuel" && (
        <div className="space-y-1.5">
          <label className="text-[13px] font-medium text-slate-700">Fréquence (ex: dimanche, veillée)</label>
          <Input
            type="text"
            placeholder="Ex: dimanche matin, veillée de prière"
            value={frequence}
            onChange={(e) => setFrequence(e.target.value)}
            className="h-11"
          />
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-[13px] font-medium text-slate-700">Budget min (€, optionnel)</label>
          <Input
            type="number"
            placeholder="Ex: 100"
            min={0}
            value={budgetMin}
            onChange={(e) => setBudgetMin(e.target.value)}
            className="h-11"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[13px] font-medium text-slate-700">Budget max (€, optionnel)</label>
          <Input
            type="number"
            placeholder="Ex: 500"
            min={0}
            value={budgetMax}
            onChange={(e) => setBudgetMax(e.target.value)}
            className="h-11"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-[13px] font-medium text-slate-700">Contraintes (optionnel)</label>
        <Input
          type="text"
          placeholder="Son, parking, accès PMR..."
          value={contraintes}
          onChange={(e) => setContraintes(e.target.value)}
          className="h-11"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-[13px] font-medium text-slate-700">
          Décrivez votre besoin en 2–3 phrases <span className="text-rose-500">*</span>
        </label>
        <Textarea
          placeholder="Ex: Nous recherchons une salle pour un culte régulier le dimanche matin, capacité 80–100 personnes, avec sono et parking."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
          required
          className="resize-none rounded-lg border-slate-200"
        />
      </div>

      {!isLoggedIn && (
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-[13px] font-medium text-slate-700">
              Email <span className="text-rose-500">*</span>
            </label>
            <Input
              type="email"
              placeholder="vous@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-11"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[13px] font-medium text-slate-700">Téléphone (optionnel)</label>
            <Input
              type="tel"
              placeholder="06 12 34 56 78"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="h-11"
            />
          </div>
        </div>
      )}

      <Button
        type="submit"
        disabled={loading}
        className="h-12 w-full sm:w-auto bg-gs-orange px-8 hover:brightness-95"
      >
        {loading ? "Envoi en cours..." : "Confier ma recherche"}
      </Button>
    </form>
  );
}
