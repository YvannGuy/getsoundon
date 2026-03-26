"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight, Info } from "lucide-react";
import { useEffect, useState } from "react";

import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";
import { SectionReveal } from "@/components/ui/section-reveal";

const AUTOPLAY_INTERVAL_MS = 5000;

const BLOCS = [
  {
    id: "verifiees",
    title: "Annonces vérifiées",
    desc: "Réservez en toute confiance grâce à des lieux contrôlés et présentés avec précision.",
    sub: "Des informations fiables pour éviter les mauvaises surprises.",
    image: "/images/caroussel/annoncesvérifié.png",
  },
  {
    id: "informations",
    title: "Informations claires",
    desc: "Capacité, équipements, contraintes, accessibilité…",
    sub: "Tout ce dont vous avez besoin pour choisir rapidement.",
    image: "/images/caroussel/informationsclaires.png",
  },
  {
    id: "demandes",
    title: "Demandes simples",
    desc: "Contactez plusieurs propriétaires facilement et recevez des réponses rapides.",
    sub: "Un processus fluide, sans friction.",
    image: "/images/caroussel/demandessimples.png",
  },
  {
    id: "lieux",
    title: "Lieux réellement adaptés",
    desc: "Des salles pensées pour accueillir cultes, cérémonies et rassemblements.",
    sub: null,
    image: "/images/caroussel/lieuxréellementadapté.png",
  },
];

export function PourquoiReserverCarousel() {
  const [index, setIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const bloc = BLOCS[index];

  useEffect(() => {
    if (isPaused) return;
    const id = setInterval(() => {
      setIndex((i) => (i === BLOCS.length - 1 ? 0 : i + 1));
    }, AUTOPLAY_INTERVAL_MS);
    return () => clearInterval(id);
  }, [isPaused]);

  return (
    <SectionReveal className="bg-white py-12">
      <div className="container max-w-[1120px]">
        <h2 className="text-center text-[38px] font-semibold tracking-[-0.02em] text-black sm:text-[42px] md:text-[46px]">
          Pourquoi réserver avec{" "}
          <span className="font-bold text-gs-orange">{siteConfig.name}</span>
        </h2>

        <div
          className="mt-10 grid gap-8 lg:grid-cols-[1fr_1.2fr] lg:items-start"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          {/* Bloc texte + contrôles */}
          <div className="flex flex-col">
            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gs-orange">
                <Info className="h-6 w-6 text-white" />
              </div>
              <h3 className="mt-4 text-xl font-bold text-black">{bloc.title}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-slate-700">{bloc.desc}</p>
              {bloc.sub && <p className="mt-2 text-sm text-slate-600">{bloc.sub}</p>}
            </div>

            {/* Contrôles carousel */}
            <div className="mt-6 flex items-center justify-center gap-3 sm:justify-start">
              <button
                type="button"
                onClick={() => setIndex((i) => (i === 0 ? BLOCS.length - 1 : i - 1))}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 hover:text-black"
                aria-label="Précédent"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div className="flex gap-2">
                {BLOCS.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setIndex(i)}
                    className={cn(
                      "h-2.5 w-2.5 rounded-full transition",
                      i === index ? "bg-gs-orange" : "bg-slate-300 hover:bg-slate-400"
                    )}
                    aria-label={`Slide ${i + 1}`}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={() => setIndex((i) => (i === BLOCS.length - 1 ? 0 : i + 1))}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 hover:text-black"
                aria-label="Suivant"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Image défilante */}
          <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-slate-200 bg-slate-100 lg:aspect-auto lg:min-h-[320px]">
            <Image
              key={bloc.id}
              src={bloc.image}
              alt=""
              fill
              className="object-cover transition-opacity duration-300"
              sizes="(max-width: 768px) 100vw, 50vw"
              priority={index === 0}
            />
            <div className="absolute inset-0 bg-black/35" aria-hidden />
            <div className="absolute bottom-3 right-3 flex h-10 w-10 items-center justify-center rounded-lg bg-white/95 shadow-md">
              <span className="text-amber-500">★</span>
            </div>
          </div>
        </div>
      </div>
    </SectionReveal>
  );
}
