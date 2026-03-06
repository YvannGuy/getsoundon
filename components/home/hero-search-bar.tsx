"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, CalendarDays, MapPin, Search, Users } from "lucide-react";

import { DepartmentAutocomplete } from "@/components/search/department-autocomplete";
import { DateRangePicker } from "@/components/search/date-range-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export function HeroSearchBar({ className }: { className?: string }) {
  const router = useRouter();
  const deptValueRef = useRef<string>("");
  const [departement, setDepartement] = useState("");
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date } | undefined>();
  const [personnesMin, setPersonnesMin] = useState("");
  const [personnesMax, setPersonnesMax] = useState("");
  const [type, setType] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const dept = (deptValueRef.current || departement).trim();
    const hasDateRange = dateRange?.from && dateRange?.to && !isNaN(dateRange.from.getTime()) && !isNaN(dateRange.to.getTime());
    const min = personnesMin.trim() ? parseInt(personnesMin, 10) : 0;
    const max = personnesMax.trim() ? parseInt(personnesMax, 10) : 0;
    const hasCapacity = !isNaN(min) && min > 0 && !isNaN(max) && max > 0 && min <= max;
    const hasType = type && type !== "all";

    const newErrors: Record<string, string> = {};
    if (!dept) newErrors.departement = "Veuillez sélectionner un département";
    if (!hasDateRange) newErrors.date = "Veuillez sélectionner une période (date début et date fin)";
    if (!hasCapacity) newErrors.personnes = "Veuillez entrer une fourchette de personnes (min et max)";
    if (!hasType) newErrors.type = "Veuillez sélectionner un type d'événement";

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    const params = new URLSearchParams();
    params.set("departement", dept);
    params.set("date_debut", dateRange!.from!.toISOString().slice(0, 10));
    params.set("date_fin", dateRange!.to!.toISOString().slice(0, 10));
    params.set("personnes_min", String(min));
    params.set("personnes_max", String(max));
    params.set("type", type);
    router.push(`/rechercher?${params.toString()}`);
  };

  const fieldBase = "flex flex-col gap-1.5";
  const labelClass = "text-[11px] font-semibold uppercase tracking-wider text-slate-500";

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        "relative overflow-visible rounded-2xl bg-white shadow-[0_8px_32px_rgba(15,23,42,0.12)]",
        className
      )}
    >
      {/* Desktop: grille horizontale avec labels */}
      <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 sm:gap-5 sm:p-5 lg:grid-cols-5 lg:items-end lg:gap-0 lg:divide-x lg:divide-slate-200 lg:p-0">
        {/* Département */}
        <div className={cn(fieldBase, "lg:flex-1 lg:px-5 lg:py-5")}>
          <label className={labelClass}>
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" />
              Département
            </span>
          </label>
          <DepartmentAutocomplete
            value={departement}
            onChange={setDepartement}
            valueRef={deptValueRef}
            placeholder="Paris, Yvelines, 78..."
            inputClassName={cn(
              "h-11 w-full rounded-lg border bg-white text-[14px]",
              errors.departement ? "border-rose-500 bg-rose-50/50" : "border-slate-200",
              "focus-visible:border-[#213398] focus-visible:ring-[#213398]/20"
            )}
          />
          {errors.departement && (
            <p className="text-[11px] text-rose-600">{errors.departement}</p>
          )}
        </div>

        {/* Période (Du / au) */}
        <div className={cn(fieldBase, "lg:min-w-[220px] lg:flex-[1.2] lg:px-5 lg:py-5")}>
          <label className={labelClass}>
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5" />
              Période
            </span>
          </label>
          <DateRangePicker
            value={dateRange}
            onChange={setDateRange}
            placeholder="Du jj/mm/aaaa au jj/mm/aaaa"
            className="w-full"
            inputClassName={cn(
              "h-11 w-full rounded-lg border bg-white text-[14px]",
              errors.date ? "border-rose-500 bg-rose-50/50" : "border-slate-200",
              "focus-visible:border-[#213398] focus-visible:ring-[#213398]/20"
            )}
            error={!!errors.date}
          />
          {errors.date && (
            <p className="text-[11px] text-rose-600">{errors.date}</p>
          )}
        </div>

        {/* Capacité */}
        <div className={cn(fieldBase, "lg:flex-1 lg:px-5 lg:py-5")}>
          <label htmlFor="hero-cap-min" className={labelClass}>
            <span className="inline-flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" />
              Capacité
            </span>
          </label>
          <div className="flex items-center gap-2">
            <Input
              id="hero-cap-min"
              type="number"
              min={1}
              value={personnesMin}
              onChange={(e) => setPersonnesMin(e.target.value)}
              placeholder="Min"
              className={cn(
                "h-11 flex-1 rounded-lg border bg-white text-[14px]",
                errors.personnes ? "border-rose-500 bg-rose-50/50" : "border-slate-200",
                "focus-visible:border-[#213398] focus-visible:ring-[#213398]/20"
              )}
            />
            <span className="text-slate-400">à</span>
            <Input
              type="number"
              min={1}
              value={personnesMax}
              onChange={(e) => setPersonnesMax(e.target.value)}
              placeholder="Max"
              className={cn(
                "h-11 flex-1 rounded-lg border bg-white text-[14px]",
                errors.personnes ? "border-rose-500 bg-rose-50/50" : "border-slate-200",
                "focus-visible:border-[#213398] focus-visible:ring-[#213398]/20"
              )}
            />
          </div>
          {errors.personnes && (
            <p className="text-[11px] text-rose-600">{errors.personnes}</p>
          )}
        </div>

        {/* Type d'événement */}
        <div className={cn(fieldBase, "lg:flex-1 lg:px-5 lg:py-5")}>
          <label htmlFor="hero-type" className={labelClass}>
            <span className="inline-flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5" />
              Type d&apos;événement
            </span>
          </label>
          <Select value={type || "all"} onValueChange={(v) => setType(v === "all" ? "" : v)}>
            <SelectTrigger
              id="hero-type"
              className={cn(
                "h-11 w-full rounded-lg border bg-white text-[14px] shadow-none",
                errors.type ? "border-rose-500 bg-rose-50/50" : "border-slate-200",
                "focus:border-[#213398] focus:ring-[#213398]/20"
              )}
            >
              <SelectValue placeholder="Sélectionnez" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Sélectionnez un type</SelectItem>
              <SelectItem value="culte-regulier">Culte régulier</SelectItem>
              <SelectItem value="conference">Conférence</SelectItem>
              <SelectItem value="celebration">Célébration</SelectItem>
              <SelectItem value="bapteme">Baptême</SelectItem>
              <SelectItem value="retraite">Retraite</SelectItem>
            </SelectContent>
          </Select>
          {errors.type && (
            <p className="text-[11px] text-rose-600">{errors.type}</p>
          )}
        </div>

        {/* Bouton Rechercher */}
        <div className="flex flex-col gap-1.5 pt-1 sm:col-span-2 lg:col-span-1 lg:min-w-[140px] lg:flex-shrink-0 lg:px-5 lg:py-5 lg:pt-0">
          <label className="hidden text-[11px] font-semibold uppercase tracking-wider text-slate-500 lg:block">
            &nbsp;
          </label>
          <Button
            type="submit"
            className="h-12 w-full rounded-xl bg-[#213398] px-6 text-[15px] font-semibold text-white shadow-md transition hover:bg-[#1a2980] hover:shadow-lg lg:h-11"
          >
            <Search className="mr-2 h-4 w-4" />
            Rechercher
          </Button>
        </div>
      </div>
    </form>
  );
}
