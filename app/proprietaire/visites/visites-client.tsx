"use client";

import { useState } from "react";
import Link from "next/link";
import { Calendar, Check, Clock, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { accepterDemandeVisite, refuserDemandeVisite } from "@/app/actions/demande-visite-owner";
import { cn } from "@/lib/utils";

type Item = {
  id: string;
  salleName: string;
  salleSlug?: string;
  seekerName: string;
  dateLabel: string;
  heureDebut: string;
  heureFin: string;
  message: string | null;
  status: string;
  createdAt: string;
};

export function VisitesClient({ list }: { list: Item[] }) {
  const [pending, setPending] = useState<string | null>(null);

  if (list.length === 0) {
    return (
      <div className="mt-8 rounded-xl border border-slate-200 bg-white p-12 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
          <Calendar className="h-7 w-7 text-slate-500" />
        </div>
        <p className="mt-4 font-medium text-slate-700">Aucune demande de visite</p>
        <p className="mt-1 text-sm text-slate-500">Les demandes apparaîtront ici</p>
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-4">
      {list.map((item) => (
        <div
          key={item.id}
          className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-black">{item.seekerName}</span>
                <span
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-xs font-medium",
                    item.status === "pending"
                      ? "bg-amber-100 text-amber-800"
                      : item.status === "accepted"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-slate-100 text-slate-600"
                  )}
                >
                  {item.status === "pending"
                    ? "En attente"
                    : item.status === "accepted"
                      ? "Acceptée"
                      : item.status === "refused"
                        ? "Refusée"
                        : item.status}
                </span>
              </div>
              <p className="mt-1 flex items-center gap-2 text-sm text-slate-600">
                <Calendar className="h-4 w-4" />
                {item.salleName}
                {item.salleSlug && (
                  <Link
                    href={`/salles/${item.salleSlug}`}
                    className="text-[#213398] hover:underline"
                  >
                    Voir
                  </Link>
                )}
              </p>
              <p className="mt-1 flex items-center gap-2 text-sm text-slate-600">
                <Clock className="h-4 w-4" />
                {item.dateLabel}, {item.heureDebut} – {item.heureFin}
              </p>
              {item.message && (
                <p className="mt-2 text-sm text-slate-500 italic">&ldquo;{item.message}&rdquo;</p>
              )}
            </div>
            {item.status === "pending" && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-slate-300"
                  disabled={pending === item.id}
                  onClick={async () => {
                    setPending(item.id);
                    await refuserDemandeVisite(item.id);
                    setPending(null);
                  }}
                >
                  <X className="mr-1 h-4 w-4" />
                  Refuser
                </Button>
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700"
                  disabled={pending === item.id}
                  onClick={async () => {
                    setPending(item.id);
                    await accepterDemandeVisite(item.id);
                    setPending(null);
                  }}
                >
                  <Check className="mr-1 h-4 w-4" />
                  Accepter
                </Button>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
