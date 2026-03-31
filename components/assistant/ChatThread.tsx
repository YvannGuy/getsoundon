"use client";

import type { ChatMessage as ChatMessageType } from "@/lib/event-assistant/types";
import { ChatMessage } from "./ChatMessage";

type Props = { messages: ChatMessageType[] };

export function ChatThread({ messages }: Props) {
  return (
    <div className="space-y-3.5">
      {messages.map((msg) => (
        <ChatMessage key={msg.id} role={msg.role} content={msg.content} />
      ))}
    </div>
  );
}
