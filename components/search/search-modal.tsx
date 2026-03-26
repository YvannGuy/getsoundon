"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Search, Users } from "lucide-react";

import { VilleAutocomplete } from "@/components/search/ville-autocomplete";
import { DatePicker } from "@/components/search/date-picker";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type SearchModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Préfixe URL (ex: "" pour /rechercher) */
  basePath?: string;
};

type SearchModalButtonProps = {
  children: React.ReactNode;
  className?: string;
  basePath?: string;
};

export function SearchModal({
  open,
  onOpenChange,
  basePath = "",
}: SearchModalProps) {
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
    onOpenChange(false);
    const path = basePath ? `${basePath}/rechercher` : "/rechercher";
    router.push(`${path}?${params.toString()}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showClose={true}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto"
      >
        <DialogHeader>
          <DialogTitle>Rechercher une salle</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="space-y-2">
            <label className="text-[13px] font-medium text-slate-700">
              Ville ou adresse
            </label>
            <VilleAutocomplete
              value={ville}
              onChange={setVille}
              placeholder="Paris, Versailles, Meaux..."
            />
          </div>
          <div className="space-y-2">
            <label className="text-[13px] font-medium text-slate-700">Date</label>
            <DatePicker value={date} onChange={setDate} />
          </div>
          <div className="space-y-2">
            <label className="text-[13px] font-medium text-slate-700">
              Nombre de personnes
            </label>
            <div className="relative">
              <Users className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-black" />
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
            <label className="text-[13px] font-medium text-slate-700">
              Type d&apos;événement
            </label>
            <div className="relative">
              <Building2 className="pointer-events-none absolute left-3 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-black" />
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
          <Button
            type="submit"
            className="mt-4 h-12 w-full rounded-lg bg-gs-orange text-[15px] font-medium hover:brightness-95"
          >
            Voir les salles
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function SearchModalButton({
  children,
  className,
  basePath = "",
}: SearchModalButtonProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <span
        role="button"
        tabIndex={0}
        onClick={() => setOpen(true)}
        onKeyDown={(e) => e.key === "Enter" && setOpen(true)}
        className={className}
      >
        {children}
      </span>
      <SearchModal open={open} onOpenChange={setOpen} basePath={basePath} />
    </>
  );
}
