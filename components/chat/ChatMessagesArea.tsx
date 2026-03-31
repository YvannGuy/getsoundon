"use client";

import { useEffect, useRef } from "react";
import { ChatMessage } from "@/lib/event-assistant/types";
import { ChatBubble } from "./ChatBubble";
import { Bot } from "lucide-react";

interface ChatMessagesAreaProps {
  messages: ChatMessage[];
  isTyping?: boolean;
}

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="flex flex-row gap-2 max-w-[80%]">
        <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-gray-100 text-gray-600">
          <Bot className="w-4 h-4" />
        </div>
        <div className="px-4 py-3 rounded-2xl rounded-bl-md bg-white border border-gray-200 shadow-sm flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce [animation-delay:0ms]" />
          <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce [animation-delay:150ms]" />
          <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  );
}

export function ChatMessagesArea({ messages, isTyping = false }: ChatMessagesAreaProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
      {messages.map((message) => (
        <ChatBubble key={message.id} message={message} />
      ))}
      {isTyping && <TypingIndicator />}
      <div ref={messagesEndRef} />
    </div>
  );
}
