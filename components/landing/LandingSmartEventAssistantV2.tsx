"use client";

import { Sparkles, Map, Shield } from "lucide-react";
import { AssistantEntry } from "@/components/assistant/AssistantEntry";
import { AssistantChat } from "@/components/assistant/AssistantChat";
import { useAssistantConversationAdapter } from "@/hooks/useAssistantConversationAdapter";

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
  const assistant = useAssistantConversationAdapter();

  return (
    <section className="bg-gradient-to-b from-gs-beige via-gs-beige to-white px-4 py-14 sm:py-18 lg:py-24">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 lg:gap-12">
        <div className="max-w-3xl space-y-3">
          <div className="flex items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Assistant configuration
            </p>
            {assistant.version === "v2" && (
              <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                Moteur V2
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
            {assistant.version === "v2" && assistant.dialogueStats && (
              <div className="flex items-center gap-4 text-xs text-slate-500">
                <span>Tours: {assistant.dialogueStats.conversationTurns}</span>
                <span>Extractions: {assistant.dialogueStats.extractionCount}</span>
              </div>
            )}
          </div>

          <div className="space-y-5 px-5 pb-6 pt-5 sm:px-6 lg:px-8">
            {!assistant.state.isExpanded ? (
              <AssistantEntry
                onSubmit={assistant.sendUserMessage}
                placeholder={
                  assistant.version === "v2" 
                    ? "Décrivez votre événement : type, nombre de personnes, lieu, besoins..." 
                    : "Décrivez votre événement..."
                }
              />
            ) : (
              <AssistantChat
                messages={assistant.state.messages}
                onSendMessage={assistant.sendUserMessage}
                isLoading={assistant.state.status === "chatting"}
                recommendations={assistant.readyForResults ? assistant.recommended : undefined}
                providers={assistant.readyForResults ? assistant.rankedProviders : undefined}
              />
            )}
          </div>
        </div>

        {assistant.version === "v2" && assistant.canUpgrade && (
          <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
            <div className="flex items-center gap-2 text-sm text-blue-700">
              <Sparkles className="h-4 w-4" />
              <span className="font-medium">Nouveau moteur conversationnel V2 disponible !</span>
            </div>
            <p className="mt-1 text-xs text-blue-600">
              Anti-répétition, meilleure mémoire, qualification plus intelligente.
            </p>
            <button
              onClick={() => {
                // Enable V2 for this session
                if (typeof window !== "undefined") {
                  localStorage.setItem("assistant_force_v2", "true");
                  window.location.reload();
                }
              }}
              className="mt-2 rounded-md bg-blue-600 px-3 py-1 text-xs text-white hover:bg-blue-700"
            >
              Activer V2
            </button>
          </div>
        )}

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

// Debug component for development
export function AssistantV2Debug() {
  const assistant = useAssistantConversationAdapter();
  
  if (assistant.version !== "v2" || !assistant.engineState) return null;
  
  const { slots, dialogue, qualification } = assistant.engineState;
  
  return (
    <div className="fixed bottom-4 right-4 w-80 rounded-lg border bg-white p-4 text-xs shadow-lg">
      <h4 className="font-semibold mb-2">Assistant V2 Debug</h4>
      
      <div className="space-y-2">
        <div>
          <span className="font-medium">Qualification:</span> {qualification.stage} ({qualification.completionScore}%)
        </div>
        
        <div>
          <span className="font-medium">Dialogue:</span> {dialogue.conversationTurns} tours, {dialogue.askedQuestions.length} questions
        </div>
        
        <div>
          <span className="font-medium">Slots résolus:</span>
          <div className="ml-2">
            {Object.entries(slots)
              .filter(([_, slot]) => slot.status === "resolved")
              .map(([key, slot]) => (
                <div key={key} className="text-green-600">
                  {key}: {JSON.stringify(slot.resolvedValue)}
                </div>
              ))
            }
          </div>
        </div>
        
        <div>
          <span className="font-medium">Candidats:</span>
          <div className="ml-2">
            {Object.entries(slots)
              .filter(([_, slot]) => slot.candidates.length > 0 && slot.status !== "resolved")
              .map(([key, slot]) => (
                <div key={key} className="text-orange-600">
                  {key}: {slot.candidates.length} candidats
                </div>
              ))
            }
          </div>
        </div>
      </div>
    </div>
  );
}