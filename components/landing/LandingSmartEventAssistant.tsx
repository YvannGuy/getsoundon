"use client";

import { Sparkles, Map, Shield } from "lucide-react";
import { AssistantEntry } from "@/components/assistant/AssistantEntry";

const featureCards = [
  {
    icon: Sparkles,
    title: "Logique événementielle",
    desc: "Traduisez votre brief en configuration son, lumière, vidéo et équipe.",
  },
  {
    icon: Map,
    title: "Matching prestataires",
    desc: "Trouvez des équipes locales pour livrer, installer et assister sur place.",
  },
  {
    icon: Shield,
    title: "Guidage matériel",
    desc: "Sonorisation, micros, LED et lumières : un chemin clair vers la bonne config.",
  },
];

export function LandingSmartEventAssistant() {

  return (
    <section className="bg-gradient-to-b from-gs-beige via-gs-beige to-white px-4 py-14 sm:py-18 lg:py-24">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 lg:gap-12">
        <div className="max-w-3xl space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Assistant configuration</p>
          <h2 className="text-3xl font-bold leading-tight text-gs-dark sm:text-4xl lg:text-[42px]">
            Assistant <span className="text-gs-orange">événement</span> intelligent.
          </h2>
          <p className="text-base text-slate-600 sm:text-lg">
            Parlez-nous de votre événement, nous vous guidons vers la bonne configuration son, DJ, lumière et AV.
          </p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_60px_-30px_rgba(15,23,42,0.35)]">
          <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">
            <div className="h-2 w-2 rounded-full bg-emerald-400" />
            <span>Assistant prêt</span>
          </div>

          <div className="space-y-5 px-5 pb-6 pt-5 sm:px-6 lg:px-8">
            <AssistantEntry
              onSubmit={(text) => {
                // Rediriger vers la page de chat avec le prompt initial
                const searchParams = new URLSearchParams({ prompt: text });
                window.open(`/chat?${searchParams.toString()}`, '_blank');
              }}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {featureCards.map((card) => (
            <div
              key={card.title}
              className="group rounded-xl border border-slate-200 bg-white p-5 shadow-[0_14px_40px_-32px_rgba(0,0,0,0.35)] transition hover:-translate-y-0.5 hover:shadow-[0_20px_60px_-32px_rgba(0,0,0,0.35)]"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gs-orange/10 text-gs-orange">
                <card.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-3 text-base font-semibold text-gs-dark">{card.title}</h3>
              <p className="mt-1 text-sm text-slate-600">{card.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
