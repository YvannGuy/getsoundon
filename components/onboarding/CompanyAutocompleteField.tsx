"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CompanySuggestion } from "@/lib/company/company.types";

type Props = {
  value: string;
  placeholder?: string;
  onChange: (v: string) => void;
  onSelect: (c: CompanySuggestion) => void;
  onManual: () => void;
};

const MIN_LEN = 2;
const DEBOUNCE_MS = 350;

export function CompanyAutocompleteField({ value, placeholder, onChange, onSelect, onManual }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<CompanySuggestion[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const canSearch = value.trim().length >= MIN_LEN;

  useEffect(() => {
    if (!canSearch) {
      setResults([]);
      setError(null);
      setLoading(false);
      return;
    }
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      if (abortRef.current) {
        abortRef.current.abort();
        abortRef.current = null;
      }
      const controller = new AbortController();
      abortRef.current = controller;
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/company-search?q=${encodeURIComponent(value.trim())}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as { suggestions?: CompanySuggestion[] };
        setResults(json.suggestions ?? []);
      } catch (e) {
        if ((e as Error).name === "AbortError") {
          // ignore abort; controller already cancelled
        } else {
          setError("Recherche indisponible pour le moment.");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
        abortRef.current = null;
      }
    }, DEBOUNCE_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (abortRef.current) {
        abortRef.current.abort();
        abortRef.current = null;
      }
    };
  }, [value, canSearch]);

  const empty = useMemo(() => !loading && canSearch && results.length === 0 && !error, [loading, canSearch, results, error]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div
          className={cn(
            "relative w-full rounded-md border border-gs-line bg-white",
            open ? "ring-2 ring-gs-orange/30" : ""
          )}
        >
          <Input
            value={value}
            onChange={(e) => {
              onChange(e.target.value);
              if (!open) setOpen(true);
            }}
            placeholder={placeholder}
            className="h-11 border-none pr-10"
            autoComplete="off"
          />
          <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-400">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </div>
        </div>
      </PopoverTrigger>
      <PopoverContent
        className="z-[10200] w-[min(520px,calc(100vw-2.5rem))] p-0"
        align="start"
        sideOffset={6}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="max-h-[320px] overflow-y-auto">
          {!canSearch ? (
            <p className="px-3 py-3 text-sm text-slate-500">Tapez au moins {MIN_LEN} caractères.</p>
          ) : null}
          {error ? (
            <p className="px-3 py-3 text-sm text-red-600">{error}</p>
          ) : null}
          {empty ? (
            <p className="px-3 py-3 text-sm text-slate-500">Aucune entreprise trouvée.</p>
          ) : null}
          {results.map((c) => (
            <button
              key={c.id}
              type="button"
              className="flex w-full flex-col gap-0.5 border-b border-slate-100 px-3 py-2.5 text-left hover:bg-slate-50"
              onClick={() => {
                onSelect(c);
                setOpen(false);
              }}
            >
              <span className="text-sm font-semibold text-gs-dark">{c.name}</span>
              <span className="text-xs text-slate-600">
                {c.siret || c.siren ? `${c.siret ?? c.siren}` : "Identifiant indisponible"}
                {c.city ? ` — ${c.city}${c.postalCode ? ` (${c.postalCode})` : ""}` : ""}
              </span>
              {c.legalForm ? <span className="text-[11px] text-slate-500">{c.legalForm}</span> : null}
            </button>
          ))}
        </div>
        <div className="border-t border-slate-200 px-3 py-2">
          <Button
            type="button"
            variant="ghost"
            className="h-9 px-0 text-sm text-slate-700 hover:text-gs-dark"
            onClick={() => {
              onManual();
              setOpen(false);
            }}
          >
            Je ne trouve pas mon entreprise
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
