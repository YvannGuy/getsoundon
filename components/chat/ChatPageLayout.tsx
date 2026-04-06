"use client";

import { useAssistantRemote } from "@/hooks/useAssistantRemote";
import { ChatHeader } from "./ChatHeader";
import { ChatMessagesArea } from "./ChatMessagesArea";
import { ChatInputComposer } from "./ChatInputComposer";
import { ProvidersCarousel } from "./ProvidersCarousel";
import { RecommendedSetupsPanel } from "./RecommendedSetupsPanel";

interface ChatPageLayoutProps {
  initialPrompt: string;
}

export function ChatPageLayout({ initialPrompt }: ChatPageLayoutProps) {
  const assistant = useAssistantRemote({
    initialPrompt: initialPrompt?.trim() ?? "",
    sessionScope: "chat",
  });

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header fixe */}
      <ChatHeader />
      
      {/* Zone de messages scrollable */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {assistant.error ? (
          <div className="mx-4 mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {assistant.error}
          </div>
        ) : null}
        <ChatMessagesArea messages={assistant.state.messages} isTyping={assistant.isTyping} />

        {assistant.readyForResults && assistant.recommended ? (
          <RecommendedSetupsPanel recommended={assistant.recommended} />
        ) : null}

        {/* Carousel des prestataires si prêt */}
        {assistant.readyForResults && assistant.rankedProviders.length > 0 && (
          <div className="border-t bg-white px-4 py-3">
            <ProvidersCarousel providers={assistant.rankedProviders} />
          </div>
        )}
      </div>
      
      {/* Input composer fixe en bas */}
      <div className="border-t bg-white">
        <ChatInputComposer
          onSendMessage={(msg) => void assistant.sendUserMessage(msg)}
          disabled={assistant.isLoading}
        />
      </div>
    </div>
  );
}