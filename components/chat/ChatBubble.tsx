"use client";

import { Bot, User } from "lucide-react";
import { ChatMessage } from "@/lib/event-assistant/types";

interface ChatBubbleProps {
  message: ChatMessage;
}

export function ChatBubble({ message }: ChatBubbleProps) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`flex max-w-[80%] ${isUser ? "flex-row-reverse" : "flex-row"} gap-2`}>
        {/* Avatar */}
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isUser 
            ? "bg-orange-500 text-white" 
            : "bg-gray-100 text-gray-600"
        }`}>
          {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
        </div>
        
        {/* Message bubble */}
        <div className={`px-4 py-2 rounded-2xl ${
          isUser 
            ? "bg-orange-500 text-white rounded-br-md" 
            : "bg-white border border-gray-200 text-gray-900 rounded-bl-md shadow-sm"
        }`}>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">
            {message.content}
          </p>
        </div>
      </div>
    </div>
  );
}