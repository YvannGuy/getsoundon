"use client";

import { FormEvent, useState } from "react";
import { ArrowRight, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const promptChips = [
  "Anniversaire avec DJ",
  "Conférence corporate",
  "Son + livraison + technicien",
  "Écran LED pour scène",
];

type Props = {
  onSubmit: (text: string) => void;
};

export function AssistantEntry({ onSubmit }: Props) {
  const [prompt, setPrompt] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    onSubmit(prompt);
    setPrompt("");
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gs-orange/15 text-gs-orange">
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-semibold text-gs-dark">Comment pouvons-nous aider votre événement ?</p>
          <p className="text-sm text-slate-600">
            Décrivez l’événement, le nombre d’invités, le lieu et vos besoins. Nous vous guidons vers la bonne configuration.
          </p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-3xl border border-slate-100 bg-white/90 p-3 shadow-[0_18px_50px_-30px_rgba(15,23,42,0.22)] backdrop-blur sm:p-4"
      >
        <div className="rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-inner transition focus-within:border-slate-200 focus-within:shadow-[0_0_0_1px_rgba(15,23,42,0.05)]">
          <label className="sr-only" htmlFor="assistant-entry">
            Décrivez votre événement
          </label>
          <Textarea
            id="assistant-entry"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={2}
            className="min-h-[90px] w-full resize-none bg-transparent text-sm text-slate-800 placeholder:text-slate-500 focus:outline-none"
            placeholder="Exemple : conférence 200 personnes à Paris, sonorisation + micros + LED..."
          />
        </div>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
          <Button
            type="submit"
            className="h-11 rounded-full bg-gs-orange px-5 text-sm font-semibold text-white shadow-lg shadow-gs-orange/25 transition hover:translate-y-px hover:shadow-gs-orange/35"
          >
            Analyser l’événement
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </form>

      <div className="flex flex-wrap gap-2">
        {promptChips.map((chip) => (
          <button
            key={chip}
            type="button"
            className={cn(
              "rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition",
              "hover:border-slate-300 hover:bg-slate-50 hover:text-gs-dark",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gs-orange/40"
            )}
            onClick={() => {
              setPrompt(chip);
              onSubmit(chip);
              setPrompt("");
            }}
          >
            {chip}
          </button>
        ))}
      </div>
    </div>
  );
}
