"use client";

import { useState } from "react";
import Link from "next/link";
import { Facebook, Instagram } from "lucide-react";
import { siteConfig } from "@/config/site";
import { subscribeComingSoonAction } from "@/app/actions/coming-soon-signup";

export function ComingSoonSignup() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("loading");
    const result = await subscribeComingSoonAction(email.trim());
    if (result.success) {
      setStatus("success");
      setEmail("");
      setMessage(result.message ?? "Merci ! Vous serez informé de l'ouverture.");
    } else {
      setStatus("error");
      setMessage(result.error ?? "Une erreur est survenue.");
    }
  };

  return (
    <div className="mt-10 flex w-full max-w-md flex-col items-center gap-6">
      <form onSubmit={handleSubmit} className="flex w-full flex-col gap-3 sm:flex-row">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Votre email"
          required
          disabled={status === "loading" || status === "success"}
          className="h-12 flex-1 rounded-lg border border-white/30 bg-white/10 px-4 text-[15px] text-white placeholder:text-white/60 focus:border-white/60 focus:outline-none focus:ring-2 focus:ring-white/30 disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={status === "loading" || status === "success"}
          className="h-12 shrink-0 rounded-lg bg-white px-6 text-[15px] font-semibold text-[#213398] transition hover:bg-white/95 disabled:opacity-60"
        >
          {status === "loading" ? "Envoi..." : status === "success" ? "Inscrit ✓" : "Recevoir les infos"}
        </button>
      </form>
      {message && (
        <p className={`text-center text-[14px] ${status === "error" ? "text-amber-200" : "text-white/90"}`}>
          {message}
        </p>
      )}
      <div className="flex items-center gap-4">
        <span className="text-[13px] text-white/80">Suivez-nous :</span>
        <div className="flex gap-3">
          <a
            href={siteConfig.instagram}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Instagram"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/40 bg-white/10 text-white transition hover:bg-white/20"
          >
            <Instagram className="h-5 w-5" />
          </a>
          <a
            href={siteConfig.facebook}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Facebook"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/40 bg-white/10 text-white transition hover:bg-white/20"
          >
            <Facebook className="h-5 w-5" />
          </a>
        </div>
      </div>
    </div>
  );
}
