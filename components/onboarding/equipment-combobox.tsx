"use client";

import { useMemo, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { normalizeString } from "@/lib/equipment/equipment.helpers";
import { OTHER_KEY } from "@/lib/equipment/equipment.types";

export type EquipmentComboOption = { key: string; label: string; popular?: boolean };

type Props = {
  id: string;
  disabled?: boolean;
  placeholder: string;
  valueKey: string;
  displayText: string;
  options: EquipmentComboOption[];
  onSelect: (key: string) => void;
  otherRowLabel: string;
  /** Aucun résultat : proposer la saisie comme marque/modèle custom (other + texte). */
  onAdoptQueryAsCustom?: (query: string) => void;
  emptySearchHint?: string;
};

export function EquipmentCombobox({
  id,
  disabled,
  placeholder,
  valueKey,
  displayText,
  options,
  onSelect,
  otherRowLabel,
  onAdoptQueryAsCustom,
  emptySearchHint = "Tapez pour filtrer ou choisissez une suggestion.",
}: Props) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const n = normalizeString(q);
    if (!n) {
      const pop = options.filter((o) => o.popular);
      const rest = options.filter((o) => !o.popular);
      return [...pop, ...rest];
    }
    return options.filter((o) => normalizeString(o.label).includes(n) || normalizeString(o.key).includes(n));
  }, [options, q]);

  const showAdopt =
    Boolean(onAdoptQueryAsCustom && q.trim() && filtered.length === 0 && normalizeString(q).length > 0);

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setQ("");
      }}
    >
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            "h-11 w-full justify-between rounded-md border-gs-line bg-white px-3 font-normal text-gs-dark hover:bg-white",
            !displayText && "text-slate-500"
          )}
          aria-expanded={open}
        >
          <span className="truncate text-left text-sm">{displayText || placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="z-[10200] w-[min(calc(100vw-2rem),28rem)] p-0"
        align="start"
        sideOffset={4}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="border-b border-gs-line p-2">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher…"
            className="h-9 border-gs-line text-sm"
            autoComplete="off"
          />
        </div>
        <div className="max-h-[min(50vh,280px)] overflow-y-auto p-1">
          {!q.trim() && filtered.length === 0 ? (
            <p className="px-2 py-3 text-center text-xs text-slate-500">{emptySearchHint}</p>
          ) : null}
          {filtered.map((opt) => (
            <button
              key={opt.key}
              type="button"
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm text-gs-dark hover:bg-slate-50",
                valueKey === opt.key && "bg-gs-orange/10"
              )}
              onClick={() => {
                onSelect(opt.key);
                setOpen(false);
                setQ("");
              }}
            >
              <Check className={cn("h-4 w-4 shrink-0", valueKey === opt.key ? "opacity-100" : "opacity-0")} />
              <span className="truncate">{opt.label}</span>
              {opt.popular ? (
                <span className="ml-auto shrink-0 text-[10px] font-medium uppercase tracking-wide text-gs-orange">
                  Pop.
                </span>
              ) : null}
            </button>
          ))}
          {showAdopt ? (
            <button
              type="button"
              className="w-full rounded-md px-2 py-2 text-left text-sm font-medium text-gs-orange hover:bg-gs-orange/10"
              onClick={() => {
                onAdoptQueryAsCustom?.(q.trim());
                setOpen(false);
                setQ("");
              }}
            >
              Utiliser « {q.trim()} »
            </button>
          ) : null}
          <button
            type="button"
            className="mt-1 w-full rounded-md border border-dashed border-gs-line px-2 py-2 text-left text-sm text-slate-600 hover:bg-slate-50"
            onClick={() => {
              onSelect(OTHER_KEY);
              setOpen(false);
              setQ("");
            }}
          >
            {otherRowLabel}
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
