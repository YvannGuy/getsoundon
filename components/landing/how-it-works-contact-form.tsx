"use client";

import { useState } from "react";

export function HowItWorksContactForm() {
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFeedback(null);
    const fd = new FormData(e.currentTarget);
    const payload = {
      firstName: String(fd.get("firstName") ?? ""),
      lastName: String(fd.get("lastName") ?? ""),
      phone: String(fd.get("phone") ?? ""),
      email: String(fd.get("email") ?? ""),
      message: String(fd.get("message") ?? ""),
    };
    setPending(true);
    try {
      const res = await fetch("/api/contact/comment-ca-marche", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) {
        setFeedback({ ok: false, text: json.error ?? "Une erreur est survenue." });
        return;
      }
      setFeedback({ ok: true, text: "Merci ! Votre message a bien été envoyé." });
      e.currentTarget.reset();
    } catch {
      setFeedback({ ok: false, text: "Impossible d’envoyer le message. Réessayez plus tard." });
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl border border-gs-line bg-white p-6 shadow-[0_8px_32px_rgba(0,0,0,0.06)] sm:p-8 md:p-10"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-[#888]">Prénom</span>
          <input
            name="firstName"
            required
            autoComplete="given-name"
            className="h-12 w-full rounded-lg border border-gs-line bg-white px-4 text-sm text-gs-dark outline-none transition focus:border-gs-orange focus:ring-2 focus:ring-gs-orange/20"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-[#888]">Nom</span>
          <input
            name="lastName"
            required
            autoComplete="family-name"
            className="h-12 w-full rounded-lg border border-gs-line bg-white px-4 text-sm text-gs-dark outline-none transition focus:border-gs-orange focus:ring-2 focus:ring-gs-orange/20"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-[#888]">Téléphone</span>
          <input
            name="phone"
            type="tel"
            required
            autoComplete="tel"
            placeholder="+33 …"
            className="h-12 w-full rounded-lg border border-gs-line bg-white px-4 text-sm text-gs-dark outline-none transition focus:border-gs-orange focus:ring-2 focus:ring-gs-orange/20"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-[#888]">Mail</span>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            className="h-12 w-full rounded-lg border border-gs-line bg-white px-4 text-sm text-gs-dark outline-none transition focus:border-gs-orange focus:ring-2 focus:ring-gs-orange/20"
          />
        </label>
      </div>
      <label className="mt-5 block">
        <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-[#888]">Message</span>
        <textarea
          name="message"
          required
          rows={5}
          className="w-full resize-y rounded-lg border border-gs-line bg-white px-4 py-3 text-sm text-gs-dark outline-none transition focus:border-gs-orange focus:ring-2 focus:ring-gs-orange/20"
        />
      </label>
      {feedback ? (
        <p
          className={`mt-4 text-sm ${feedback.ok ? "text-emerald-700" : "text-red-600"}`}
          role="status"
        >
          {feedback.text}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="font-landing-btn mt-6 flex h-12 w-full items-center justify-center rounded-lg bg-gs-orange text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Envoi…" : "Envoyer"}
      </button>
    </form>
  );
}
