"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MapPin } from "lucide-react";

import communesIdf from "@/lib/data/communes-idf.json";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

const communes = communesIdf as string[];
const MAX_SUGGESTIONS = 10;

function matchesQuery(ville: string, q: string): boolean {
  const v = ville.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
  const query = q.toLowerCase().trim().normalize("NFD").replace(/\p{Diacritic}/gu, "");
  if (!query) return true;
  return v.includes(query) || v.startsWith(query);
}

function rankMatch(ville: string, query: string): number {
  const v = ville.toLowerCase();
  const q = query.toLowerCase().trim();
  if (!q) return 0;
  if (v === q) return 100;
  if (v.startsWith(q)) return 80;
  if (v.includes(q)) return 40;
  return 0;
}

interface VilleAutocompleteProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
}

export function VilleAutocomplete({
  value = "",
  onChange,
  placeholder = "Paris, Versailles, Meaux...",
  className,
  inputClassName,
}: VilleAutocompleteProps) {
  const [inputValue, setInputValue] = useState(value);
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const matches = useCallback(() => {
    const q = inputValue.trim();
    if (!q) return communes.slice(0, MAX_SUGGESTIONS);
    return communes
      .filter((v) => matchesQuery(v, q))
      .map((v) => ({ ville: v, rank: rankMatch(v, q) }))
      .filter(({ rank }) => rank > 0)
      .sort((a, b) => b.rank - a.rank)
      .slice(0, MAX_SUGGESTIONS)
      .map(({ ville }) => ville);
  }, [inputValue])();

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  useEffect(() => {
    if (listRef.current && highlightedIndex >= 0 && highlightedIndex < matches.length) {
      listRef.current.children[highlightedIndex]?.scrollIntoView({ block: "nearest" });
    }
  }, [highlightedIndex, matches.length]);

  const handleSelect = useCallback(
    (ville: string) => {
      setInputValue(ville);
      onChange?.(ville);
      setOpen(false);
    },
    [onChange]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open && e.key !== "Escape") setOpen(true);
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((i) => Math.min(i + 1, matches.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((i) => Math.max(i - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        if (matches[highlightedIndex]) handleSelect(matches[highlightedIndex]);
        break;
      case "Escape":
        setOpen(false);
        break;
      default:
        break;
    }
  };

  const handleBlur = () => {
    setTimeout(() => setOpen(false), 120);
  };

  return (
    <div className={cn("relative", className)}>
      <MapPin className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />
      <Input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={(e) => {
          setInputValue(e.target.value);
          setOpen(true);
          setHighlightedIndex(0);
        }}
        onFocus={() => setOpen(true)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoComplete="off"
        spellCheck={false}
        className={cn(
          "h-11 rounded-lg border-slate-200 pl-10 pr-3 text-[14px]",
          "focus-visible:border-[#213398] focus-visible:ring-[#213398]/20",
          inputClassName
        )}
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
      />
      {open && (
        <ul
          ref={listRef}
          role="listbox"
          className="absolute z-50 mt-1 max-h-[220px] w-full overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
        >
          {matches.length > 0 ? (
            matches.map((ville, i) => (
              <li
                key={`${ville}-${i}`}
                role="option"
                aria-selected={i === highlightedIndex}
                className={cn(
                  "cursor-pointer px-3 py-2 text-[13px] text-slate-700",
                  i === highlightedIndex && "bg-[#213398]/5 text-black"
                )}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelect(ville);
                }}
                onMouseEnter={() => setHighlightedIndex(i)}
              >
                {ville}
              </li>
            ))
          ) : (
            <li className="px-3 py-4 text-center text-[13px] text-slate-500">Aucun résultat</li>
          )}
        </ul>
      )}
    </div>
  );
}
