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

  const errorMessages = [
    errors.departement,
    errors.date,
    errors.personnes,
    errors.type,
  ].filter(Boolean) as string[];

  return (
    <div className={cn("relative", className)}>
      <form
        onSubmit={handleSubmit}
        className="relative overflow-visible rounded-[36px] border border-slate-200/90 bg-white p-2.5 shadow-[0_14px_34px_rgba(15,23,42,0.16)] sm:rounded-[999px]"
      >
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-[1.05fr_1.15fr_0.8fr_0.85fr_auto] sm:items-center lg:gap-0">
          <div className="min-w-0 rounded-[18px] px-4 py-3 sm:px-5 sm:py-2.5 lg:border-r lg:border-slate-200">
            <p className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              <MapPin className="h-3.5 w-3.5 text-slate-400" />
              Département
            </p>
            <DepartmentAutocomplete
              value={departement}
              onChange={setDepartement}
              valueRef={deptValueRef}
              placeholder="Paris, Yvelines, 78..."
              inputClassName={cn(
                "mt-2 h-11 rounded-full border border-slate-200 bg-white pl-10 pr-4 text-[14px] font-medium text-slate-950 shadow-none placeholder:text-slate-400 focus-visible:border-[#213398] focus-visible:ring-[#213398]/15",
                errors.departement && "text-rose-600 placeholder:text-rose-300"
              )}
            />
          </div>

          <div className="min-w-0 rounded-[18px] px-4 py-3 sm:px-5 sm:py-2.5 lg:border-r lg:border-slate-200">
            <p className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
              Période
            </p>
            <DateRangePicker
              value={dateRange}
              onChange={setDateRange}
              placeholder="Du jj/mm/aaaa au jj/mm/aaaa"
              className="mt-2 w-full"
              inputClassName={cn(
                "min-h-[44px] rounded-full border border-slate-200 bg-white px-3 py-2 text-[14px] font-medium text-slate-950 shadow-none hover:border-slate-300 focus:ring-0",
                errors.date && "border-rose-500"
              )}
              error={!!errors.date}
            />
          </div>

          <div className="min-w-0 rounded-[18px] px-4 py-3 sm:px-5 sm:py-2.5 lg:border-r lg:border-slate-200">
            <label htmlFor="hero-cap-min" className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              <Users className="h-3.5 w-3.5 text-slate-400" />
              Capacité
            </label>
            <div className="mt-2 flex items-center gap-2">
              <Input
                id="hero-cap-min"
                type="number"
                min={1}
                value={personnesMin}
                onChange={(e) => setPersonnesMin(e.target.value)}
                placeholder="Min"
                className={cn(
                  "h-11 w-full rounded-full border border-slate-200 bg-white px-4 text-[14px] font-medium text-slate-950 shadow-none placeholder:text-slate-400 focus-visible:border-[#213398] focus-visible:ring-[#213398]/15",
                  errors.personnes && "placeholder:text-rose-300 text-rose-600"
                )}
              />
              <span className="shrink-0 text-sm text-slate-300">-</span>
              <Input
                type="number"
                min={1}
                value={personnesMax}
                onChange={(e) => setPersonnesMax(e.target.value)}
                placeholder="Max"
                className={cn(
                  "h-11 w-full rounded-full border border-slate-200 bg-white px-4 text-[14px] font-medium text-slate-950 shadow-none placeholder:text-slate-400 focus-visible:border-[#213398] focus-visible:ring-[#213398]/15",
                  errors.personnes && "placeholder:text-rose-300 text-rose-600"
                )}
              />
            </div>
          </div>

          <div className="min-w-0 rounded-[18px] px-4 py-3 sm:px-5 sm:py-2.5 lg:border-r lg:border-slate-200">
            <label htmlFor="hero-type" className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              <Building2 className="h-3.5 w-3.5 text-slate-400" />
              Type
            </label>
            <Select value={type || "all"} onValueChange={(v) => setType(v === "all" ? "" : v)}>
              <SelectTrigger
                id="hero-type"
                className={cn(
                  "mt-2 h-11 w-full rounded-full border border-slate-200 bg-white px-4 text-[14px] font-medium text-slate-950 shadow-none focus:border-[#213398] focus:ring-[#213398]/15",
                  errors.type && "border-rose-500 text-rose-600"
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
          </div>

          <div className="pt-1 sm:col-span-2 lg:col-span-1 lg:pl-1.5 lg:pt-0">
            <Button
              type="submit"
              className="h-11 w-full rounded-full bg-[#213398] px-5 text-[14px] font-semibold text-white shadow-[0_10px_24px_rgba(33,51,152,0.24)] transition hover:bg-[#1a2980] lg:min-w-[145px]"
            >
              Rechercher
              <span className="ml-2 flex h-6 w-6 items-center justify-center rounded-full bg-white/15">
                <Search className="h-3 w-3" />
              </span>
            </Button>
          </div>
        </div>
      </form>

      {errorMessages.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {errorMessages.map((message) => (
            <p
              key={message}
              className="rounded-full bg-rose-50 px-3 py-1.5 text-[12px] font-medium text-rose-700 shadow-sm"
            >
              {message}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
