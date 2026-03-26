"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Calendar, Check, X } from "lucide-react";

import { ContactVisiteOwnerButton } from "@/components/demandes/contact-visite-owner-button";
import { ProposerAutreCreneauVisiteButton } from "@/components/proprietaire/proposer-autre-creneau-visite-button";
import { Button } from "@/components/ui/button";
import { accepterDemandeVisite, refuserDemandeVisite } from "@/app/actions/demande-visite-owner";

type Item = {
  id: string;
  salleName: string;
  salleSlug?: string;
  salleCity: string;
  salleImage: string;
  seekerName: string;
  dateDisplay: string;
  typeEvenement?: string;
  message: string | null;
  status: string;
};

const STATUT_LABEL: Record<string, string> = {
  pending: "En attente",
  accepted: "Acceptée",
  refused: "Refusée",
  reschedule_proposed: "Reprogrammation proposée",
};

const STATUT_BADGE: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  accepted: "bg-emerald-100 text-emerald-700",
  refused: "bg-red-100 text-red-700",
  reschedule_proposed: "bg-sky-100 text-sky-700",
};

export function VisitesTable({ list }: { list: Item[] }) {
  const [pending, setPending] = useState<string | null>(null);

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full min-w-[700px]">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
            <th className="px-4 py-3">Salle</th>
            <th className="px-4 py-3">Type d&apos;événement</th>
            <th className="px-4 py-3">Date</th>
            <th className="px-4 py-3">Ville</th>
            <th className="px-4 py-3">Statut</th>
            <th className="px-4 py-3">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {list.map((item) => (
            <tr key={item.id} className="hover:bg-slate-50">
              <td className="px-4 py-4">
                <div className="flex items-center gap-3">
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                    <Image
                      src={item.salleImage}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="48px"
                    />
                  </div>
                  <div>
                    <p className="font-medium text-black">{item.salleName}</p>
                    {item.salleSlug && (
                      <Link
                        href={`/salles/${item.salleSlug}`}
                        className="text-xs text-gs-orange hover:underline"
                      >
                        Voir
                      </Link>
                    )}
                  </div>
                </div>
              </td>
              <td className="px-4 py-4 text-sm text-slate-600">
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-4 w-4 text-slate-400" />
                  {item.typeEvenement ?? "Visite"}
                </span>
              </td>
              <td className="px-4 py-4 text-sm text-slate-600">{item.dateDisplay}</td>
              <td className="px-4 py-4 text-sm text-slate-600">{item.salleCity}</td>
              <td className="px-4 py-4">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    STATUT_BADGE[item.status] ?? "bg-slate-100 text-slate-600"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      item.status === "pending" ? "bg-amber-500" : item.status === "accepted" ? "bg-emerald-500" : item.status === "refused" ? "bg-red-500" : "bg-sky-500"
                    }`}
                  />
                  {STATUT_LABEL[item.status] ?? item.status}
                </span>
              </td>
              <td className="px-4 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  {item.status === "pending" && (
                    <>
                      <ProposerAutreCreneauVisiteButton demandeVisiteId={item.id} />
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
                    </>
                  )}
                  <ContactVisiteOwnerButton demandeVisiteId={item.id} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
