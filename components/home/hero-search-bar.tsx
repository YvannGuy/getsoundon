"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Search, Users } from "lucide-react";

import { VilleAutocomplete } from "@/components/search/ville-autocomplete";
import { DatePicker } from "@/components/search/date-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export function HeroSearchBar({ className }: { className?: string }) {
  const router = useRouter();
  const [ville, setVille] = useState("");
  const [date, setDate] = useState<Date | undefined>();
  const [personnes, setPersonnes] = useState("");
  const [type, setType] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (ville.trim()) params.set("ville", ville.trim());
    if (date && !isNaN(date.getTime())) params.set("date", date.toISOString().slice(0, 10));
    if (personnes.trim()) params.set("personnes", personnes.trim());
    if (type) params.set("type", type);
    router.push(`/rechercher?${params.toString()}`);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        "flex flex-col rounded-xl bg-white shadow-[0_4px_24px_rgba(15,23,42,0.12)] sm:flex-row sm:divide-x sm:divide-slate-200",
        className
      )}
    >
      <div className="relative flex-1 px-4 py-3 sm:min-w-0">
        <VilleAutocomplete
          value={ville}
          onChange={setVille}
          placeholder="Ville"
          inputClassName="h-11 rounded-lg border border-slate-200 bg-white pl-9 pr-2 focus-visible:border-[#213398] focus-visible:ring-[#213398]/20"
        />
      </div>
      <div className="relative flex-1 px-4 py-3 sm:min-w-0">
        <DatePicker
          value={date}
          onChange={setDate}
          placeholder="Date"
          inputClassName="h-11 rounded-lg border border-slate-200 bg-white pr-20 focus-visible:border-[#213398] focus-visible:ring-[#213398]/20"
        />
      </div>
      <div className="relative flex-1 px-4 py-3 sm:min-w-0">
        <Users className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          type="text"
          value={personnes}
          onChange={(e) => setPersonnes(e.target.value)}
          placeholder="Nombre de personnes"
          className="h-11 rounded-lg border border-slate-200 bg-white pl-9 pr-2 focus-visible:border-[#213398] focus-visible:ring-[#213398]/20"
        />
      </div>
      <div className="relative flex-1 px-4 py-3 sm:min-w-0">
        <Building2 className="pointer-events-none absolute left-4 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Select value={type || "all"} onValueChange={(v) => setType(v === "all" ? "" : v)}>
          <SelectTrigger className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-8 shadow-none focus:border-[#213398] focus:ring-[#213398]/20">
            <SelectValue placeholder="Type d'événement" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Type d&apos;événement</SelectItem>
            <SelectItem value="culte-regulier">Culte régulier</SelectItem>
            <SelectItem value="conference">Conférence</SelectItem>
            <SelectItem value="celebration">Célébration</SelectItem>
            <SelectItem value="bapteme">Baptême</SelectItem>
            <SelectItem value="retraite">Retraite</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="shrink-0 px-4 py-3 sm:py-2">
        <Button
          type="submit"
          className="h-11 rounded-lg bg-[#213398] px-6 text-white hover:bg-[#1a2980]"
        >
          <Search className="mr-2 h-4 w-4" />
          Rechercher
        </Button>
      </div>
    </form>
  );
}
