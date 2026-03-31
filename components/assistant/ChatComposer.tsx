"use client";

import { FormEvent, KeyboardEvent, useState } from "react";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  onSend: (text: string) => void;
  placeholder?: string;
};

export function ChatComposer({ onSend, placeholder }: Props) {
  const [value, setValue] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!value.trim()) return;
    onSend(value);
    setValue("");
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!value.trim()) return;
      onSend(value);
      setValue("");
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-slate-100 bg-white/90 p-3 shadow-[0_8px_30px_-18px_rgba(15,23,42,0.18)] backdrop-blur"
    >
      <label className="sr-only" htmlFor="assistant-chat-input">
        Répondre à l’assistant
      </label>
      <Textarea
        id="assistant-chat-input"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={2}
        className="min-h-[64px] w-full resize-none rounded-xl border border-slate-100 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gs-orange/30"
        placeholder={placeholder ?? "Décrivez votre besoin..."}
        onKeyDown={handleKeyDown}
      />
      <div className="mt-3 flex justify-end">
        <Button
          type="submit"
          className="h-10 rounded-full bg-gs-orange px-4 text-sm font-semibold text-white shadow-lg shadow-gs-orange/25 transition hover:translate-y-px hover:shadow-gs-orange/35"
        >
          Envoyer
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </form>
  );
}
