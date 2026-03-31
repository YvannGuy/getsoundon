"use client";

import Image from "next/image";
import { ArrowRight, Truck, UserRound, Wrench } from "lucide-react";

import { cn } from "@/lib/utils";
import { ProviderBadge } from "./ProviderBadge";
import type { rankProviders } from "@/lib/event-assistant/matching";

type ProvidersProps = {
  providers: ReturnType<typeof rankProviders>;
};

export function ProvidersInline({ providers }: ProvidersProps) {
  if (!providers.length) return null;
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_16px_40px_-28px_rgba(15,23,42,0.25)]">
      <div className="flex items-center justify-between gap-2 text-sm font-semibold text-gs-dark">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          <span>Prestataires compatibles</span>
        </div>
        <span className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">Sélection</span>
      </div>
      <p className="mt-1 text-xs text-slate-500">Livraison / installation possibles selon le prestataire.</p>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {providers.map(({ provider }) => (
          <a
            key={provider.id}
            href={`/boutique/${provider.id}`}
            className="group overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_12px_32px_-20px_rgba(15,23,42,0.25)] transition hover:-translate-y-0.5 hover:border-slate-200 hover:shadow-[0_18px_44px_-20px_rgba(15,23,42,0.28)]"
          >
            <div className="relative h-36 w-full overflow-hidden bg-slate-100">
              {provider.image ? (
                <Image
                  src={provider.image}
                  alt={provider.title}
                  fill
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]"
                  sizes="(min-width: 768px) 320px, 100vw"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs text-slate-500">Image indisponible</div>
              )}
            </div>
            <div className="space-y-1.5 px-3 pb-3 pt-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-gs-dark">{provider.title}</p>
                  <p className="text-xs text-slate-500">{provider.location}</p>
                </div>
              </div>
              <p className="text-xs text-slate-600">
                {provider.description ?? "Compatible avec votre besoin : son, lumière, logistique."}
              </p>
              <div className="flex flex-wrap gap-2 text-[11px] text-slate-600">
                <ProviderBadge label="Livraison" active={provider.capabilities.services.delivery} icon={<Truck className="h-3 w-3" />} />
                <ProviderBadge label="Installation" active={provider.capabilities.services.installation} icon={<Wrench className="h-3 w-3" />} />
                <ProviderBadge label="Technicien" active={provider.capabilities.services.technician} icon={<UserRound className="h-3 w-3" />} />
              </div>
              <div className="pt-1">
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-gs-orange">
                  Voir le prestataire <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
