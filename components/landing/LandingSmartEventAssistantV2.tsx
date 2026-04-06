"use client";

import { Sparkles, Map, Shield } from "lucide-react";
import { AssistantEntry } from "@/components/assistant/AssistantEntry";
import { AssistantChat } from "@/components/assistant/AssistantChat";
import { useAssistantRemote } from "@/hooks/useAssistantRemote";

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

export function LandingSmartEventAssistantV2() {
  const assistant = useAssistantRemote({ sessionScope: "landing" });

  return (
    <section className="bg-gradient-to-b from-gs-beige via-gs-beige to-white px-4 py-14 sm:py-18 lg:py-24">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 lg:gap-12">
        <div className="max-w-3xl space-y-3">
          <div className="flex items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Assistant configuration
            </p>
            {assistant.version === "remote" && (
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                Serveur · persistance
              </span>
            )}
          </div>
          <h2 className="text-3xl font-bold leading-tight text-gs-dark sm:text-4xl lg:text-[42px]">
            Assistant <span className="text-gs-orange">événement</span> intelligent.
          </h2>
          <p className="text-base text-slate-600 sm:text-lg">
            Parlez-nous de votre événement, nous vous guidons vers la bonne configuration son, DJ, lumière et AV.
          </p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_60px_-30px_rgba(15,23,42,0.35)]">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">
              <div className="h-2 w-2 rounded-full bg-emerald-400" />
              <span>Assistant prêt</span>
            </div>
            
            {/* Debug info for V2 */}
            {assistant.version === "remote" && assistant.meta && (
              <div className="flex items-center gap-4 text-xs text-slate-500">
                <span>Prestataires: {assistant.meta.provider_count}</span>
                {assistant.meta.matches_stub ? <span className="text-amber-600">Stub catalogue</span> : null}
              </div>
            )}
          </div>

          <div className="space-y-5 px-5 pb-6 pt-5 sm:px-6 lg:px-8">
            {assistant.error ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                {assistant.error}
              </div>
            ) : null}
            {!assistant.state.isExpanded ? (
              <AssistantEntry
                onSubmit={(text) => void assistant.sendUserMessage(text)}
              />
            ) : (
              <AssistantChat
                state={assistant.state}
                readyForResults={assistant.readyForResults}
                rankedProviders={assistant.rankedProviders}
                sendUserMessage={(text) => void assistant.sendUserMessage(text)}
              />
            )}
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

// Debug component for development (état exposé côté UI bridge uniquement)
export function AssistantV2Debug() {
  const assistant = useAssistantRemote({ sessionScope: "landing" });

  if (assistant.version !== "remote") return null;

  const q = assistant.state.qualification;

  return (
    <div className="fixed bottom-4 right-4 w-80 rounded-lg border bg-white p-4 text-xs shadow-lg">
      <h4 className="font-semibold mb-2">Assistant serveur (debug)</h4>

      <div className="space-y-2">
        <div>
          <span className="font-medium">Session:</span> {assistant.sessionId ?? "—"}
        </div>
        <div>
          <span className="font-medium">Qualification:</span> {q.stage} ({q.completionScore}%)
        </div>
        {assistant.meta ? (
          <div>
            <span className="font-medium">Meta:</span> providers={assistant.meta.provider_count}
            {assistant.meta.matches_stub ? ", stub" : ""}
          </div>
        ) : null}
      </div>
    </div>
  );
}