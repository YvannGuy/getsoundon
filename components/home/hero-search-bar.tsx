"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MapPin, Search } from "lucide-react";

import { HeroLocationAutocomplete } from "@/components/home/hero-location-autocomplete";
import { cn } from "@/lib/utils";

/** Un mot-clé à la fois — même liste que les suggestions rapides (cohérence UX) */
const KEYWORD_EXAMPLES = [
  "Enceinte",
  "Écran",
  "Vidéoprojecteur",
  "Lumière",
  "DJ",
  "Micro",
  "Pack sono",
] as const;

const PLACEHOLDER_ROTATE_MS = 3800;

const LOCATION_PLACEHOLDER = "Paris, Versailles, Montreuil, code postal…";

const fieldShell =
  "relative flex min-h-[3.25rem] w-full flex-1 items-center rounded-2xl border border-white/35 bg-white/[0.97] shadow-[0_4px_28px_rgba(0,0,0,0.1)] transition-[box-shadow,border-color] focus-within:border-white/55 focus-within:shadow-[0_8px_36px_rgba(0,0,0,0.14)] sm:min-h-[3.65rem] md:min-h-[3.75rem] md:rounded-[1.25rem]";

const submitBtnClass =
  "font-landing-btn h-[3.25rem] rounded-[1.35rem] bg-gs-orange px-6 text-white transition hover:brightness-105 sm:h-[3.65rem] md:h-[3.75rem] md:rounded-[1.25rem] md:px-8";

export function HeroSearchBar({ className }: { className?: string }) {
  const router = useRouter();
  const queryHeadingId = useId();
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [pausePlaceholder, setPausePlaceholder] = useState(false);
  const quickTagsId = useId();

  useEffect(() => {
    if (pausePlaceholder) return;
    const t = window.setInterval(() => {
      setPlaceholderIndex((i) => (i + 1) % KEYWORD_EXAMPLES.length);
    }, PLACEHOLDER_ROTATE_MS);
    return () => window.clearInterval(t);
  }, [pausePlaceholder]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    const q = query.trim();
    const loc = location.trim();
    if (q) params.set("q", q);
    if (loc) params.set("location", loc);
    const qs = params.toString();
    router.push(qs ? `/catalogue?${qs}` : "/catalogue");
  };

  return (
    <div className={cn("relative min-w-0", className)}>
      <form onSubmit={handleSubmit} className="relative min-w-0">
        <h2
          id={queryHeadingId}
          className="font-landing-heading mb-3 text-[0.95rem] font-semibold tracking-wide text-white/95 sm:mb-3.5 sm:text-base"
        >
          Que recherchez-vous ?
        </h2>

        {/* Mobile : colonne · md+ : quoi | (lieu + bouton Rechercher sous le lieu) */}
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:gap-3 lg:gap-4">
          <div className={cn(fieldShell, "md:min-h-[3.75rem] md:flex-1")}>
            <label htmlFor="hero-intelligent-q" className="sr-only">
              Matériel, prestation ou mot-clé — un mot suffit, tu peux ajouter détails, date ou capacité
            </label>
            <Search
              className="pointer-events-none ml-3 h-5 w-5 shrink-0 text-[#9a9a9a] sm:ml-4"
              strokeWidth={2}
              aria-hidden
            />
            <input
              id="hero-intelligent-q"
              name="q"
              type="search"
              autoComplete="off"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setPausePlaceholder(true)}
              onBlur={() => setPausePlaceholder(false)}
              placeholder={KEYWORD_EXAMPLES[placeholderIndex]}
              aria-labelledby={queryHeadingId}
              className="font-landing-body min-w-0 flex-1 border-0 bg-transparent py-3 pl-3 pr-4 text-base leading-normal text-gs-dark outline-none placeholder:text-[#5c5c5c] placeholder:opacity-90 sm:py-3.5 sm:pl-3.5 sm:text-lg sm:leading-snug md:pr-5 md:text-xl"
            />
          </div>

          <div className="flex min-w-0 w-full flex-col gap-3 md:flex-1">
            <div className={cn(fieldShell, "items-stretch")}>
              <label htmlFor="hero-intelligent-lieu" className="sr-only">
                Lieu (ville ou code postal)
              </label>
              <MapPin
                className="pointer-events-none ml-3 h-5 w-5 shrink-0 self-center text-[#9a9a9a] sm:ml-4"
                strokeWidth={2}
                aria-hidden
              />
              <HeroLocationAutocomplete
                id="hero-intelligent-lieu"
                name="location"
                value={location}
                onChange={setLocation}
                placeholder={LOCATION_PLACEHOLDER}
              />
            </div>
            {/* Desktop : sous le lieu, même largeur qu’avant (pas pleine colonne) */}
            <button
              type="submit"
              className={cn(
                submitBtnClass,
                "hidden md:ml-auto md:block md:w-[min(46%,260px)] md:max-w-[280px] lg:w-[min(42%,240px)]"
              )}
            >
              Rechercher
            </button>
          </div>
        </div>

        <div className="mt-3 space-y-2 md:mt-3.5">
          <p
            id={quickTagsId}
            className="font-landing-body text-center text-[0.7rem] font-medium uppercase tracking-[0.12em] text-white/55 md:text-left"
          >
            Suggestions rapides
          </p>
          <div
            className="flex flex-wrap justify-center gap-2 md:justify-start"
            role="group"
            aria-labelledby={quickTagsId}
          >
            {KEYWORD_EXAMPLES.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => {
                  setQuery(tag);
                  document.getElementById("hero-intelligent-q")?.focus();
                }}
                className="font-landing-body rounded-full border border-white/35 bg-white/10 px-3 py-1.5 text-xs font-medium text-white/95 backdrop-blur-sm transition hover:border-white/55 hover:bg-white/20 sm:text-[13px]"
              >
                {tag}
              </button>
            ))}
          </div>
          <p className="font-landing-body max-w-[52rem] text-center text-[13px] leading-relaxed text-white/80 md:text-left md:text-sm">
            Un mot suffit pour commencer. Tu peux préciser la ville, une date ou la capacité dans le même
            champ, ou indiquer la ville à droite. Les deux fonctionnent ensemble.
          </p>
        </div>

        <p className="font-landing-body mt-2.5 text-center text-sm leading-snug text-white/90 md:mt-3 md:text-left">
          Ou parcourir le{" "}
          <Link
            href="/catalogue"
            className="font-semibold text-white underline decoration-white/70 underline-offset-2 transition hover:decoration-white"
          >
            catalogue
          </Link>
          .
        </p>

        {/* Mobile / tablette : bouton en bas, largeur confortable · masqué sur md+ (bouton sous le lieu) */}
        <div className="mt-3 flex w-full flex-col items-center sm:mt-4 md:hidden">
          <button type="submit" className={cn(submitBtnClass, "w-[64%] max-w-[280px] shrink-0")}>
            Rechercher
          </button>
        </div>
      </form>
    </div>
  );
}
