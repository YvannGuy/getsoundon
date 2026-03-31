"use client";

import { cn } from "@/lib/utils";
import type { ChatMessage as ChatMessageType } from "@/lib/event-assistant/types";

type Props = { role: ChatMessageType["role"]; content: string };

export function ChatMessage({ role, content }: Props) {
  const isUser = role === "user";
  return (
    <div
      className={cn(
        "w-full rounded-2xl border px-4 py-3 text-sm shadow-sm",
        isUser
          ? "ml-auto max-w-[88%] border-slate-100 bg-slate-50 text-gs-dark"
          : "mr-auto max-w-[92%] border-slate-100 bg-white text-slate-800"
      )}
    >
      <p className="font-semibold text-[11px] uppercase tracking-[0.08em] text-slate-500">
        {isUser ? "Vous" : "Assistant"}
      </p>
      <p className="mt-1 leading-relaxed">{content}</p>
    </div>
  );
}
