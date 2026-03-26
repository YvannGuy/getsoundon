"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MapPin } from "lucide-react";

import { DEPT_LABELS } from "@/lib/covers";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

const DEPARTMENTS = Object.entries(DEPT_LABELS) as [string, string][];

function matchesQuery(code: string, label: string, q: string): boolean {
  const query = q.toLowerCase().trim().normalize("NFD").replace(/\p{Diacritic}/gu, "");
  if (!query) return true;
  const codeMatch = code.includes(query);
  const labelNorm = label.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
  const labelMatch = labelNorm.includes(query) || labelNorm.startsWith(query);
  return codeMatch || labelMatch;
}

function rankMatch(code: string, label: string, query: string): number {
  const q = query.toLowerCase().trim();
  if (!q) return 0;
  if (code === q) return 100;
  if (label.toLowerCase() === q) return 95;
  if (label.toLowerCase().startsWith(q)) return 80;
  if (label.toLowerCase().includes(q)) return 50;
  if (code.includes(q)) return 40;
  return 0;
}

function findDepartmentByInput(input: string): string | null {
  const q = input.trim();
  if (!q) return null;
  const exact = DEPARTMENTS.find(
    ([code, label]) =>
      label.toLowerCase() === q.toLowerCase() ||
      `${label} (${code})`.toLowerCase() === q.toLowerCase() ||
      code === q
  );
  return exact ? exact[0] : null;
}

interface DepartmentAutocompleteProps {
  value?: string;
  onChange?: (code: string) => void;
  /** Ref mis à jour avec la valeur effective (saisie ou sélection) pour la soumission du formulaire */
  valueRef?: React.MutableRefObject<string>;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
}

export function DepartmentAutocomplete({
  value = "",
  onChange,
  valueRef,
  placeholder = "Département (ex. Paris, Yvelines, 78...)",
  className,
  inputClassName,
}: DepartmentAutocompleteProps) {
  const displayValue = value ? `${DEPT_LABELS[value] ?? value} (${value})` : "";
  const [inputValue, setInputValue] = useState(displayValue);
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);

  const matches = useCallback(() => {
    const q = inputValue.trim();
    if (!q) return DEPARTMENTS;
    return DEPARTMENTS.filter(([code, label]) => matchesQuery(code, label, q))
      .map(([code, label]) => ({ code, label, rank: rankMatch(code, label, q) }))
      .filter(({ rank }) => rank > 0)
      .sort((a, b) => b.rank - a.rank)
      .map(({ code, label }) => [code, label] as [string, string]);
  }, [inputValue])();

  useEffect(() => {
    setInputValue(value ? `${DEPT_LABELS[value] ?? value} (${value})` : "");
  }, [value]);

  useEffect(() => {
    if (listRef.current && highlightedIndex >= 0 && highlightedIndex < matches.length) {
      listRef.current.children[highlightedIndex]?.scrollIntoView({ block: "nearest" });
    }
  }, [highlightedIndex, matches.length]);

  const handleSelect = useCallback(
    (code: string) => {
      const label = DEPT_LABELS[code] ?? code;
      setInputValue(`${label} (${code})`);
      onChange?.(code);
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
        if (matches[highlightedIndex]) handleSelect(matches[highlightedIndex][0]);
        break;
      case "Escape":
        setOpen(false);
        break;
      default:
        break;
    }
  };

  const effectiveValue = findDepartmentByInput(inputValue) ?? value;
  if (valueRef) valueRef.current = effectiveValue;

  const handleBlur = () => {
    setTimeout(() => {
      setOpen(false);
      const found = findDepartmentByInput(inputValue);
      if (found) handleSelect(found);
    }, 120);
  };

  return (
    <div className={cn("relative", className)}>
      <MapPin className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />
      <Input
        type="text"
        value={inputValue}
        onChange={(e) => {
          const v = e.target.value;
          setInputValue(v);
          setOpen(true);
          setHighlightedIndex(0);
          if (!v.trim()) onChange?.("");
        }}
        onFocus={() => setOpen(true)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoComplete="off"
        spellCheck={false}
        className={cn(
          "h-11 rounded-lg border-slate-200 pl-10 pr-3 text-[14px]",
          "focus-visible:border-gs-orange focus-visible:ring-gs-orange/20",
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
            matches.map(([code, label], i) => (
              <li
                key={code}
                role="option"
                aria-selected={i === highlightedIndex}
                className={cn(
                  "cursor-pointer px-3 py-2 text-[13px] text-slate-700",
                  i === highlightedIndex && "bg-gs-orange/5 text-black"
                )}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelect(code);
                }}
                onMouseEnter={() => setHighlightedIndex(i)}
              >
                {label} ({code})
              </li>
            ))
          ) : (
            <li className="px-3 py-4 text-center text-[13px] text-slate-500">Aucun département trouvé</li>
          )}
        </ul>
      )}
    </div>
  );
}
