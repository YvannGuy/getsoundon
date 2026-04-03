"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

import { VilleAutocomplete } from "@/components/search/ville-autocomplete";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

/** Formulaire public orienté catalogue matériel (évite d’exposer le flux recherche salles legacy). */
export function SearchForm() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [location, setLocation] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    const qt = q.trim();
    const loc = location.trim();
    if (qt) params.set("q", qt);
    if (loc) params.set("location", loc);
    const qs = params.toString();
    router.push(qs ? `/catalogue?${qs}` : "/catalogue");
  };

  return (
    <Card className="overflow-hidden rounded-xl border-0 border-slate-100 bg-white shadow-[0_4px_20px_rgba(15,23,42,0.08)]">
      <CardContent className="p-4 sm:p-5">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <label className="text-[13px] font-medium text-slate-700">Matériel ou prestation</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Ex. enceinte, console DJ…"
                className="h-11 rounded-lg border-slate-200 pl-10 text-[14px]"
              />
            </div>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <label className="text-[13px] font-medium text-slate-700">Zone</label>
            <VilleAutocomplete value={location} onChange={setLocation} />
          </div>
          <div className="sm:col-span-2">
            <Button
              type="submit"
              className="mt-1 h-12 w-full rounded-lg bg-gs-orange px-4 text-[15px] font-medium hover:brightness-95"
            >
              Voir le catalogue matériel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
