"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

const API_URL = "https://api-adresse.data.gouv.fr/search";
const DEBOUNCE_MS = 280;
const MIN_CHARS = 2;
const MAX_SUGGESTIONS = 8;

/** Préfixes département (code postal ou 2 premiers chiffres du code INSEE commune) — Île-de-France */
const IDF_DEPT_PREFIXES = ["75", "77", "78", "91", "92", "93", "94", "95"];

function isIdfPostcodeOrCitycode(postcode?: string, citycode?: string): boolean {
  const pc = postcode?.trim();
  if (pc && pc.length >= 2 && IDF_DEPT_PREFIXES.includes(pc.slice(0, 2))) return true;
  const cc = citycode?.trim();
  if (cc && cc.length >= 2 && IDF_DEPT_PREFIXES.includes(cc.slice(0, 2))) return true;
  return false;
}

type BanFeature = {
  properties?: { label?: string; postcode?: string; citycode?: string };
};

function uniqueLabelsIdf(features: BanFeature[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const f of features) {
    const p = f.properties;
    if (!p || !isIdfPostcodeOrCitycode(p.postcode, p.citycode)) continue;
    const label = p.label?.trim();
    if (!label || seen.has(label)) continue;
    seen.add(label);
    out.push(label);
    if (out.length >= MAX_SUGGESTIONS) break;
  }
  return out;
}

async function fetchSuggestions(q: string): Promise<string[]> {
  const trimmed = q.trim();
  if (trimmed.length < MIN_CHARS) return [];

  const params = new URLSearchParams({
    q: trimmed,
    limit: "30",
    autocomplete: "1",
  });
  // Codes postaux / numériques : recherche large ; sinon communes uniquement
  if (!/^\d/.test(trimmed)) {
    params.set("type", "municipality");
  }

  const res = await fetch(`${API_URL}?${params}`);
  if (!res.ok) return [];
  const data = (await res.json()) as { features?: BanFeature[] };
  return uniqueLabelsIdf(data.features ?? []);
}

type HeroLocationAutocompleteProps = {
  id: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  inputClassName?: string;
};

export function HeroLocationAutocomplete({
  id,
  name,
  value,
  onChange,
  placeholder,
  inputClassName,
}: HeroLocationAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [idfEmpty, setIdfEmpty] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const listRef = useRef<HTMLUListElement>(null);

  const runFetch = useCallback(async (q: string) => {
    if (q.trim().length < MIN_CHARS) {
      setSuggestions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setIdfEmpty(false);
    try {
      const list = await fetchSuggestions(q);
      setSuggestions(list);
      setIdfEmpty(list.length === 0);
      setHighlightedIndex(0);
    } catch {
      setSuggestions([]);
      setIdfEmpty(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = value.trim();
    if (q.length < MIN_CHARS) {
      setSuggestions([]);
      setIdfEmpty(false);
      return;
    }
    debounceRef.current = setTimeout(() => {
      void runFetch(value);
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value, runFetch]);

  useEffect(() => {
    if (listRef.current && highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
      listRef.current.children[highlightedIndex]?.scrollIntoView({ block: "nearest" });
    }
  }, [highlightedIndex, suggestions.length]);

  const selectLabel = (label: string) => {
    onChange(label);
    setOpen(false);
    setSuggestions([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open && e.key !== "Escape") setOpen(true);

    switch (e.key) {
      case "ArrowDown":
        if (suggestions.length === 0) return;
        e.preventDefault();
        setHighlightedIndex((i) => Math.min(i + 1, suggestions.length - 1));
        break;
      case "ArrowUp":
        if (suggestions.length === 0) return;
        e.preventDefault();
        setHighlightedIndex((i) => Math.max(i - 1, 0));
        break;
      case "Enter":
        if (open && suggestions[highlightedIndex]) {
          e.preventDefault();
          selectLabel(suggestions[highlightedIndex]);
        }
        break;
      case "Escape":
        setOpen(false);
        break;
      default:
        break;
    }
  };

  const handleBlur = () => {
    setTimeout(() => setOpen(false), 150);
  };

  const showList =
    open && value.trim().length >= MIN_CHARS && (loading || suggestions.length > 0 || idfEmpty);

  return (
    <div className="relative min-w-0 flex-1">
      <input
        id={id}
        name={name}
        type="text"
        autoComplete="off"
        spellCheck={false}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={`${id}-listbox`}
        aria-autocomplete="list"
        className={cn(
          "font-landing-body w-full min-w-0 border-0 bg-transparent py-3 pl-3 pr-4 text-base leading-normal text-gs-dark outline-none placeholder:text-[#5c5c5c] placeholder:opacity-90 sm:py-3.5 sm:pl-3.5 sm:text-lg sm:leading-snug md:pr-5 md:text-xl",
          inputClassName
        )}
      />
      {showList && (
        <ul
          ref={listRef}
          id={`${id}-listbox`}
          role="listbox"
          className="absolute left-0 right-0 top-[calc(100%+0.25rem)] z-[100] max-h-[min(40vh,280px)] overflow-auto rounded-xl border border-black/10 bg-white py-1 shadow-[0_12px_40px_rgba(0,0,0,0.18)]"
        >
          {loading ? (
            <li className="px-3 py-3 text-center text-sm text-[#5c5c5c]">Recherche…</li>
          ) : idfEmpty ? (
            <li className="px-3 py-3 text-center text-sm text-[#5c5c5c]">
              Aucun résultat en Île-de-France.
            </li>
          ) : (
            suggestions.map((label, i) => (
              <li
                key={`${label}-${i}`}
                role="option"
                aria-selected={i === highlightedIndex}
                className={cn(
                  "cursor-pointer px-3 py-2.5 text-left text-sm text-gs-dark sm:text-[15px]",
                  i === highlightedIndex && "bg-gs-orange/10 text-black"
                )}
                onMouseDown={(ev) => {
                  ev.preventDefault();
                  selectLabel(label);
                }}
                onMouseEnter={() => setHighlightedIndex(i)}
              >
                {label}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
