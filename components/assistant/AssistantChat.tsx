"use client";

import { ChatComposer } from "./ChatComposer";
import { ChatThread } from "./ChatThread";
import { ProvidersInline } from "./ProvidersInline";
import type { ChatMessage, MatchingProvider, ProviderScoreBreakdown } from "@/lib/event-assistant/types";

interface AssistantChatProps {
  state: { messages: ChatMessage[]; [key: string]: unknown };
  readyForResults: boolean;
  rankedProviders: Array<{ provider: MatchingProvider; score: ProviderScoreBreakdown }>;
  sendUserMessage: (text: string) => void;
  recommended?: unknown;
  expand?: () => void;
}

export function AssistantChat({
  state,
  readyForResults,
  rankedProviders,
  sendUserMessage,
}: AssistantChatProps) {
  return (
    <div className="space-y-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_18px_50px_-30px_rgba(15,23,42,0.25)]">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Assistant</p>

      <ChatThread messages={state.messages} />

      <ChatComposer
        onSend={sendUserMessage}
        placeholder="Exemple : 150 personnes en intérieur, livraison + installation, besoin micros + LED."
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
