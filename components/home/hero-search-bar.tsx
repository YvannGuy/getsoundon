"use client";

import { useEffect, useId, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, MapPin, CalendarRange, Truck, Wrench, Headphones } from "lucide-react";

import { cn } from "@/lib/utils";

const PLACEHOLDER_EXAMPLES = [
  "Ex. 2 enceintes pour une soirée samedi à Paris",
  "Ex. 2 platines Pioneer pour ce soir à 21h à Paris",
  "Ex. pack sono pour 50 personnes avec livraison",
  "Ex. vidéoprojecteur pour demain à Montreuil",
] as const;

type ChipKey = "ou" | "quand" | "livraison" | "installation" | "technicien";

const CHIPS: { key: ChipKey; label: string; icon: typeof MapPin; needsField?: "ville" | "date" }[] = [
  { key: "ou", label: "Où", icon: MapPin, needsField: "ville" },
  { key: "quand", label: "Quand", icon: CalendarRange, needsField: "date" },
  { key: "livraison", label: "Livraison", icon: Truck },
  { key: "installation", label: "Installation", icon: Wrench },
  { key: "technicien", label: "Technicien", icon: Headphones },
];

export function HeroSearchBar({ className }: { className?: string }) {
  const router = useRouter();
  const labelId = useId();
  const [query, setQuery] = useState("");
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [activeChips, setActiveChips] = useState<Partial<Record<ChipKey, boolean>>>({});
  const [ville, setVille] = useState("");
  const [dateEvent, setDateEvent] = useState("");

  useEffect(() => {
    const t = window.setInterval(() => {
      setPlaceholderIndex((i) => (i + 1) % PLACEHOLDER_EXAMPLES.length);
    }, 4800);
    return () => window.clearInterval(t);
  }, []);

  const toggleChip = (key: ChipKey) => {
    setActiveChips((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const ouOn = !!activeChips.ou;
  const quandOn = !!activeChips.quand;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    const q = query.trim();
    if (q) params.set("q", q);
    if (ouOn && ville.trim()) params.set("location", ville.trim());
    if (quandOn && dateEvent) {
      params.set("date_debut", dateEvent);
      params.set("date_fin", dateEvent);
    }
    if (activeChips.livraison) params.set("livraison", "1");
    if (activeChips.installation) params.set("installation", "1");
    if (activeChips.technicien) params.set("technicien", "1");
    const qs = params.toString();
    router.push(qs ? `/items?${qs}` : "/items");
  };

  return (
    <div className={cn("relative min-w-0", className)}>
      <form onSubmit={handleSubmit} className="relative min-w-0">
        <label
          id={labelId}
          htmlFor="hero-intelligent-q"
          className="font-landing-heading mb-3 block text-[0.95rem] font-semibold tracking-wide text-white/95 sm:text-base"
        >
          Que recherchez-vous ?
        </label>

        <div className="group relative flex flex-col gap-0 overflow-hidden rounded-2xl border border-white/25 bg-white/[0.97] shadow-[0_4px_40px_rgba(0,0,0,0.12)] backdrop-blur-sm transition-[box-shadow,border-color] focus-within:border-white/50 focus-within:shadow-[0_8px_48px_rgba(0,0,0,0.18)] sm:rounded-[1.35rem]">
          <div className="flex min-h-[3.75rem] items-stretch sm:min-h-[4.25rem]">
            <input
              id="hero-intelligent-q"
              name="q"
              type="search"
              autoComplete="off"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={PLACEHOLDER_EXAMPLES[placeholderIndex]}
              aria-labelledby={labelId}
              className="font-landing-body min-w-0 flex-1 border-0 bg-transparent px-4 py-4 text-lg leading-normal text-gs-dark outline-none placeholder:text-[#5c5c5c] placeholder:opacity-90 sm:px-5 sm:py-5 sm:text-xl sm:leading-snug sm:placeholder:text-xl"
            />
            <button
              type="submit"
              className="font-landing-btn m-1.5 inline-flex shrink-0 items-center justify-center gap-2 self-center rounded-xl bg-gs-orange px-4 py-3 text-[0.95rem] text-white transition hover:brightness-105 sm:m-2 sm:rounded-[0.85rem] sm:px-6 sm:py-3.5 sm:text-base"
              aria-label="Lancer la recherche"
            >
              <span className="hidden sm:inline">Rechercher</span>
              <ArrowRight className="h-5 w-5 sm:h-5 sm:w-5" strokeWidth={2.25} aria-hidden />
            </button>
          </div>

          {(ouOn || quandOn) && (
            <div className="flex flex-col gap-2 border-t border-gs-line/80 bg-[#faf9f7] px-4 py-3 sm:flex-row sm:items-end sm:gap-4 sm:px-5 sm:py-3.5">
              {ouOn ? (
                <div className="min-w-0 flex-1">
                  <label htmlFor="hero-chip-ville" className="font-landing-badge text-[#666]">
                    Lieu
                  </label>
                  <input
                    id="hero-chip-ville"
                    type="text"
                    value={ville}
                    onChange={(e) => setVille(e.target.value)}
                    placeholder="Ville, code postal…"
                    className="font-landing-heading mt-1 w-full border-0 border-b border-transparent bg-transparent p-0 text-sm font-bold text-gs-dark outline-none placeholder:font-normal placeholder:text-[#888] focus-visible:border-gs-orange/40"
                  />
                </div>
              ) : null}
              {quandOn ? (
                <div className="min-w-0 flex-1 sm:max-w-[200px]">
                  <label htmlFor="hero-chip-date" className="font-landing-badge text-[#666]">
                    Date
                  </label>
                  <input
                    id="hero-chip-date"
                    type="date"
                    value={dateEvent}
                    onChange={(e) => setDateEvent(e.target.value)}
                    className="font-landing-heading mt-1 w-full border-0 bg-transparent p-0 text-sm font-bold text-gs-dark outline-none [color-scheme:light]"
                  />
                </div>
              ) : null}
            </div>
          )}
        </div>

        {/* Une seule ligne : héritage text-[#222] du <main> neutralisé avec text-white + ! sur les puces */}
        <div
          className={cn(
            "mt-5 flex min-w-0 max-w-full flex-nowrap items-center gap-2 overflow-x-auto overscroll-x-contain pb-1 pr-1 [-webkit-overflow-scrolling:touch] sm:mt-6 sm:gap-3 sm:pr-2",
            "text-white [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          )}
        >
          <span className="shrink-0 font-landing-badge text-[0.65rem] uppercase tracking-wide text-white/70 sm:text-[0.72rem]">
            Précisez si besoin
          </span>
          {CHIPS.map(({ key, label, icon: Icon }) => {
            const on = !!activeChips[key];
            return (
              <button
                key={key}
                type="button"
                onClick={() => toggleChip(key)}
                className={cn(
                  "inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-1.5 text-left font-landing-nav text-xs font-medium outline-none transition sm:gap-1.5 sm:px-3.5 sm:py-2 sm:text-sm",
                  "!text-white focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent",
                  on
                    ? "!border-white/60 !bg-white/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]"
                    : "!border-white/40 !bg-white/10 hover:!border-white/55 hover:!bg-white/[0.18]"
                )}
                aria-pressed={on}
              >
                <Icon className="h-3.5 w-3.5 shrink-0 text-white opacity-95 sm:h-4 sm:w-4" aria-hidden />
                {label}
              </button>
            );
          })}
        </div>
      </form>
    </div>
  );
}
