"use client";

import { useEffect, useRef } from "react";

import { useAssistantConversation } from "@/hooks/useAssistantConversation";
import { ChatHeader } from "./ChatHeader";
import { ChatMessagesArea } from "./ChatMessagesArea";
import { ChatInputComposer } from "./ChatInputComposer";
import { ProvidersCarousel } from "./ProvidersCarousel";

interface ChatPageLayoutProps {
  initialPrompt: string;
}

export function ChatPageLayout({ initialPrompt }: ChatPageLayoutProps) {
  const assistant = useAssistantConversation({ freshSession: !!initialPrompt?.trim() });
  const sentInitialRef = useRef(false);

  useEffect(() => {
    if (initialPrompt?.trim() && !sentInitialRef.current) {
      sentInitialRef.current = true;
      assistant.sendUserMessage(initialPrompt, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPrompt]);

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header fixe */}
      <ChatHeader />
      
      {/* Zone de messages scrollable */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <ChatMessagesArea messages={assistant.state.messages} isTyping={assistant.isTyping} />
        
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
          onSendMessage={assistant.sendUserMessage}
          disabled={false}
        />
      </div>
    </div>
  );
}