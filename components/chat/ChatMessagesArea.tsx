"use client";

import { useEffect, useRef } from "react";
import { ChatMessage } from "@/lib/event-assistant/types";
import { ChatBubble } from "./ChatBubble";

interface ChatMessagesAreaProps {
  messages: ChatMessage[];
}

export function ChatMessagesArea({ messages }: ChatMessagesAreaProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll vers le bas à chaque nouveau message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
      {messages.map((message) => (
        <ChatBubble
          key={message.id}
          message={message}
        />
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
}