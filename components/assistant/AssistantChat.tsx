"use client";

import { ChatComposer } from "./ChatComposer";
import { ChatThread } from "./ChatThread";
import { ProvidersInline } from "./ProvidersInline";
import type { ReturnTypeUseAssistant } from "@/hooks/useAssistantConversation";

type Props = ReturnTypeUseAssistant;

export function AssistantChat({
  state,
  nextQuestion,
  readyForResults,
  rankedProviders,
  sendUserMessage,
}: Props) {
  return (
    <div className="space-y-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_18px_50px_-30px_rgba(15,23,42,0.25)]">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Assistant</p>

      <ChatThread messages={state.messages} />

      {nextQuestion && !readyForResults && (
        <div className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-3 text-sm text-amber-900">
          <p className="font-semibold">{nextQuestion.label}</p>
          {nextQuestion.placeholder && <p className="text-xs text-amber-800">{nextQuestion.placeholder}</p>}
        </div>
      )}

      <ChatComposer
        onSend={sendUserMessage}
        placeholder={
          nextQuestion?.placeholder ??
          "Exemple : 150 personnes en intérieur, livraison + installation, besoin micros + LED."
        }
      />

      {readyForResults && (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-gs-dark">
            Voici une configuration adaptée et des prestataires compatibles.
          </p>
          <ProvidersInline providers={rankedProviders.slice(0, 6)} />
        </div>
      )}
    </div>
  );
}
