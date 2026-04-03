"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ComingSoonWaitlistForm({ className }: { className?: string }) {
  const [status, setStatus] = React.useState<"idle" | "loading" | "ok" | "error">("idle");
  const [message, setMessage] = React.useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    setMessage(null);
    const form = e.currentTarget;
    const fd = new FormData(form);
    const body = {
      firstName: String(fd.get("firstName") ?? "").trim(),
      email: String(fd.get("email") ?? "").trim(),
      profile: String(fd.get("profile") ?? "autre"),
      city: String(fd.get("city") ?? "").trim() || undefined,
    };

    try {
      const res = await fetch("/api/prelaunch/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) {
        setStatus("error");
        setMessage(data.error ?? "Une erreur est survenue.");
        return;
      }
      setStatus("ok");
      setMessage("Merci ! Vous serez informé·e en priorité.");
      form.reset();
    } catch {
      setStatus("error");
      setMessage("Réseau indisponible. Réessayez plus tard.");
    }
  }

  return (
    <form
      id="waitlist"
      onSubmit={onSubmit}
      className={cn(
        "rounded-2xl border border-white/10 bg-white/[0.03] p-6 shadow-[0_24px_80px_-24px_rgba(0,0,0,0.65)] backdrop-blur-sm sm:p-8",
        className,
      )}
    >
      <h2 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">
        Soyez parmi les premiers informés
      </h2>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/65">
        Laissez-nous vos coordonnées : nous vous prévenons dès l’ouverture et les étapes pour accéder à la
        plateforme.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <label className="block sm:col-span-1">
          <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-white/50">
            Prénom
          </span>
          <input
            name="firstName"
            required
            autoComplete="given-name"
            className="h-11 w-full rounded-xl border border-white/10 bg-black/40 px-3 text-sm text-white placeholder:text-white/35 focus:border-gs-orange/50 focus:outline-none focus:ring-2 focus:ring-gs-orange/25"
            placeholder="Alex"
          />
        </label>
        <label className="block sm:col-span-1">
          <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-white/50">Email</span>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            className="h-11 w-full rounded-xl border border-white/10 bg-black/40 px-3 text-sm text-white placeholder:text-white/35 focus:border-gs-orange/50 focus:outline-none focus:ring-2 focus:ring-gs-orange/25"
            placeholder="vous@exemple.com"
          />
        </label>
        <label className="block sm:col-span-1">
          <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-white/50">Profil</span>
          <select
            name="profile"
            required
            className="h-11 w-full rounded-xl border border-white/10 bg-black/40 px-3 text-sm text-white focus:border-gs-orange/50 focus:outline-none focus:ring-2 focus:ring-gs-orange/25"
            defaultValue="organisateur"
          >
            <option value="organisateur">J’organise des événements / je cherche du matériel</option>
            <option value="prestataire">Je suis prestataire ou loueur</option>
            <option value="autre">Autre</option>
          </select>
        </label>
        <label className="block sm:col-span-1">
          <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-white/50">
            Ville <span className="font-normal normal-case text-white/35">(optionnel)</span>
          </span>
          <input
            name="city"
            autoComplete="address-level2"
            className="h-11 w-full rounded-xl border border-white/10 bg-black/40 px-3 text-sm text-white placeholder:text-white/35 focus:border-gs-orange/50 focus:outline-none focus:ring-2 focus:ring-gs-orange/25"
            placeholder="Paris, Lyon…"
          />
        </label>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button
          type="submit"
          disabled={status === "loading"}
          className="h-11 rounded-xl bg-gs-orange px-6 font-semibold text-white hover:brightness-105 disabled:opacity-60"
        >
          {status === "loading" ? "Envoi…" : "Rejoindre la waitlist"}
        </Button>
        <p className="text-xs text-white/45 sm:max-w-xs">
          Aucun spam. Seulement les informations utiles sur le lancement.
        </p>
      </div>

      {message ? (
        <p
          className={cn(
            "mt-4 text-sm",
            status === "ok" ? "text-emerald-400/90" : "text-amber-300/90",
          )}
          role="status"
        >
          {message}
        </p>
      ) : null}
    </form>
  );
}
