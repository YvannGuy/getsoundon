"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Users } from "lucide-react";

import { VilleAutocomplete } from "@/components/search/ville-autocomplete";
import { DatePicker } from "@/components/search/date-picker";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function SearchForm() {
  const router = useRouter();

  const [ville, setVille] = useState("");
  const [date, setDate] = useState<Date | undefined>();
  const [personnes, setPersonnes] = useState("50");
  const [type, setType] = useState("culte-regulier");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (ville) params.set("ville", ville);
    if (date) params.set("date", date.toISOString().slice(0, 10));
    if (personnes) params.set("personnes", personnes);
    if (type) params.set("type", type);
    router.push(`/rechercher?${params.toString()}`);
  };

  return (
    <Card className="overflow-hidden rounded-xl border-0 border-slate-100 bg-white shadow-[0_4px_20px_rgba(15,23,42,0.08)]">
      <CardContent className="p-4 sm:p-5">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-[13px] font-medium text-slate-700">Ville</label>
            <VilleAutocomplete value={ville} onChange={setVille} />
          </div>
          <div className="space-y-2">
            <label className="text-[13px] font-medium text-slate-700">Date</label>
            <DatePicker value={date} onChange={setDate} />
          </div>
          <div className="space-y-2">
            <label className="text-[13px] font-medium text-slate-700">Nombre de personnes</label>
            <div className="relative">
              <Users className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-sky-500" />
              <Input
                type="number"
                value={personnes}
                onChange={(e) => setPersonnes(e.target.value)}
                min={1}
                className="h-11 rounded-lg border-slate-200 pl-10 pr-2 text-[14px]"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[13px] font-medium text-slate-700">Type d&apos;événement</label>
            <div className="relative">
              <Building2 className="pointer-events-none absolute left-3 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-sky-500" />
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="h-11 rounded-lg border-slate-200 pl-10 pr-9 text-[14px]">
                  <SelectValue placeholder="Culte régulier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="culte-regulier">Culte régulier</SelectItem>
                  <SelectItem value="conference">Conférence</SelectItem>
                  <SelectItem value="celebration">Célébration</SelectItem>
                  <SelectItem value="bapteme">Baptême</SelectItem>
                  <SelectItem value="retraite">Retraite</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" className="mt-1 h-12 w-full rounded-lg bg-sky-500 px-4 text-[15px] font-medium hover:bg-sky-600">
              Voir les salles
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
