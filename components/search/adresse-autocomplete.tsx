"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MapPin } from "lucide-react";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

const IDF_POSTCODES = ["75", "77", "78", "91", "92", "93", "94", "95"];
const API_URL = "https://api-adresse.data.gouv.fr/search";
const MAX_SUGGESTIONS = 8;
const DEBOUNCE_MS = 300;

function isInIdf(postcode: string): boolean {
  const prefix = postcode.slice(0, 2);
  return IDF_POSTCODES.includes(prefix);
}

interface AdresseFeature {
  properties: { label: string; postcode?: string; city?: string };
  geometry?: { coordinates: [number, number] };
}

interface AdresseAutocompleteProps {
  value?: string;
  onChange?: (value: string) => void;
  onSelectAddress?: (
    address: string,
    city?: string,
    postcode?: string,
    coords?: { lat: number; lng: number }
  ) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
}

export function AdresseAutocomplete({
  value = "",
  onChange,
  onSelectAddress,
  placeholder = "Ex: 12 rue de la République, Paris",
  className,
  inputClassName,
}: AdresseAutocompleteProps) {
  const [inputValue, setInputValue] = useState(value);
  const [suggestions, setSuggestions] = useState<AdresseFeature[]>([]);
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const listRef = useRef<HTMLUListElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const fetchSuggestions = useCallback(async (q: string) => {
    if (!q || q.length < 3) {
      setSuggestions([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `${API_URL}?q=${encodeURIComponent(q)}&limit=15&autocomplete=1`
      );
      const data = await res.json();
      const features = (data.features ?? []) as AdresseFeature[];
      const idfFeatures = features
        .filter((f) => f.properties?.postcode && isInIdf(String(f.properties.postcode)))
        .slice(0, MAX_SUGGESTIONS);

      setSuggestions(idfFeatures);
      setHighlightedIndex(0);
    } catch {
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!inputValue.trim()) {
      setSuggestions([]);
      return;
    }
    debounceRef.current = setTimeout(() => {
      fetchSuggestions(inputValue.trim());
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [inputValue, fetchSuggestions]);

  useEffect(() => {
    if (listRef.current && highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
      listRef.current.children[highlightedIndex]?.scrollIntoView({ block: "nearest" });
    }
  }, [highlightedIndex, suggestions]);


  const handleSelect = useCallback(
    (feature: AdresseFeature) => {
      const addr = feature.properties.label;
      setInputValue(addr);
      onChange?.(addr);
      const match = addr.match(/^(.*?)\s+(\d{5})\s+(.+)$/);
      const coords = feature.geometry?.coordinates
        ? { lng: feature.geometry.coordinates[0], lat: feature.geometry.coordinates[1] }
        : undefined;
      if (onSelectAddress && match) {
        onSelectAddress(addr, match[3], match[2], coords);
      } else if (onSelectAddress) {
        onSelectAddress(addr, undefined, undefined, coords);
      }
      setOpen(false);
    },
    [onChange, onSelectAddress]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open && e.key !== "Escape") setOpen(true);
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((i) => Math.min(i + 1, suggestions.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((i) => Math.max(i - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        if (suggestions[highlightedIndex]) handleSelect(suggestions[highlightedIndex] as AdresseFeature);
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

  return (
    <div className={cn("relative", className)}>
      <MapPin className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />
      <Input
        type="text"
        value={inputValue}
        onChange={(e) => {
          setInputValue(e.target.value);
          setOpen(true);
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
      {open && (suggestions.length > 0 || loading) && (
        <ul
          ref={listRef}
          role="listbox"
          className="absolute z-50 mt-1 max-h-[220px] w-full overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
        >
          {loading ? (
            <li className="px-3 py-4 text-center text-[13px] text-slate-500">
              Recherche...
            </li>
          ) : (
            suggestions.map((f, i) => (
              <li
                key={`${f.properties.label}-${i}`}
                role="option"
                aria-selected={i === highlightedIndex}
                className={cn(
                  "cursor-pointer px-3 py-2 text-[13px] text-slate-700",
                  i === highlightedIndex && "bg-[#213398]/5 text-black"
                )}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelect(f);
                }}
                onMouseEnter={() => setHighlightedIndex(i)}
              >
                {f.properties.label}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
