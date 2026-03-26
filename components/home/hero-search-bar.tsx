"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, MapPin, Search } from "lucide-react";

import { DateRangePicker } from "@/components/search/date-range-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export function HeroSearchBar({ className }: { className?: string }) {
  const router = useRouter();
  const locationValueRef = useRef<string>("");
  const [location, setLocation] = useState("");
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date } | undefined>();
  const [category, setCategory] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedLocation = (locationValueRef.current || location).trim();
    const hasDateRange = dateRange?.from && dateRange?.to && !isNaN(dateRange.from.getTime()) && !isNaN(dateRange.to.getTime());

    const newErrors: Record<string, string> = {};
    if (!selectedLocation) newErrors.location = "Veuillez renseigner une localisation";
    if (!category || category === "all") newErrors.category = "Veuillez selectionner une categorie";
    if (!hasDateRange) newErrors.date = "Veuillez selectionner une periode";

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    const params = new URLSearchParams();
    params.set("location", selectedLocation);
    params.set("category", category);
    params.set("startDate", dateRange!.from!.toISOString().slice(0, 10));
    params.set("endDate", dateRange!.to!.toISOString().slice(0, 10));
    router.push(`/items?${params.toString()}`);
  };

  const errorMessages = [
    errors.location,
    errors.date,
    errors.category,
  ].filter(Boolean) as string[];

  return (
    <div className={cn("relative", className)}>
      <form
        onSubmit={handleSubmit}
        className="relative overflow-visible rounded-[36px] border border-slate-200/90 bg-white p-2.5 shadow-[0_14px_34px_rgba(15,23,42,0.16)] sm:rounded-[999px]"
      >
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-[1fr_1.35fr_0.95fr_170px] sm:items-center lg:gap-0">
          <div className="min-w-0 rounded-[18px] px-4 py-3 sm:px-5 sm:py-2.5 lg:border-r lg:border-slate-200">
            <p className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              <MapPin className="h-3.5 w-3.5 text-slate-400" />
              Localisation
            </p>
            <Input
              value={location}
              onChange={(e) => {
                setLocation(e.target.value);
                locationValueRef.current = e.target.value;
              }}
              placeholder="Paris, Lyon, Marseille..."
              className={cn(
                "mt-2 h-11 rounded-full border border-slate-200 bg-white px-4 text-[14px] font-medium text-slate-950 shadow-none placeholder:text-slate-400 focus-visible:border-gs-orange focus-visible:ring-gs-orange/15",
                errors.location && "text-rose-600 placeholder:text-rose-300"
              )}
            />
          </div>

          <div className="min-w-0 rounded-[18px] px-4 py-3 sm:px-5 sm:py-2.5 lg:min-w-[0] lg:border-r lg:border-slate-200">
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
            <label htmlFor="hero-category" className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              Categorie
            </label>
            <Select value={category || "all"} onValueChange={(v) => setCategory(v === "all" ? "" : v)}>
              <SelectTrigger
                id="hero-category"
                className={cn(
                  "mt-2 h-11 w-full rounded-full border border-slate-200 bg-white px-4 text-[14px] font-medium text-slate-950 shadow-none focus:border-gs-orange focus:ring-gs-orange/15",
                  errors.category && "border-rose-500 text-rose-600"
                )}
              >
                <SelectValue placeholder="Sélectionnez" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Selectionnez une categorie</SelectItem>
                <SelectItem value="sound">Sound</SelectItem>
                <SelectItem value="dj">DJ</SelectItem>
                <SelectItem value="lighting">Lighting</SelectItem>
                <SelectItem value="services">Services</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="pt-1 sm:col-span-2 lg:col-span-1 lg:pl-2 lg:pt-0">
            <Button
              type="submit"
              className="h-11 w-full rounded-full bg-gs-orange px-5 text-[14px] font-semibold text-white shadow-[0_10px_24px_rgba(33,51,152,0.24)] transition hover:brightness-95"
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
