"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

import { VilleAutocomplete } from "@/components/search/ville-autocomplete";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

type SearchModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type SearchModalButtonProps = {
  children: React.ReactNode;
  className?: string;
};

export function SearchModal({ open, onOpenChange }: SearchModalProps) {
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
    onOpenChange(false);
    const qs = params.toString();
    router.push(qs ? `/catalogue?${qs}` : "/catalogue");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showClose={true}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto"
      >
        <DialogHeader>
          <DialogTitle>Rechercher du matériel</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="space-y-2">
            <label className="text-[13px] font-medium text-slate-700">
              Matériel ou prestation
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Ex. enceinte, console DJ, micro…"
                className="h-11 rounded-lg border-slate-200 pl-10 text-[14px]"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[13px] font-medium text-slate-700">
              Zone (ville, code postal…)
            </label>
            <VilleAutocomplete
              value={location}
              onChange={setLocation}
              placeholder="Paris, Montreuil, 92…"
              inputClassName="h-11 rounded-lg border-slate-200 pl-10 text-[14px]"
            />
          </div>
          <Button
            type="submit"
            className="mt-4 h-12 w-full rounded-lg bg-gs-orange text-[15px] font-medium hover:brightness-95"
          >
            Voir le catalogue
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function SearchModalButton({
  children,
  className,
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
      <SearchModal open={open} onOpenChange={setOpen} />
    </>
  );
}
