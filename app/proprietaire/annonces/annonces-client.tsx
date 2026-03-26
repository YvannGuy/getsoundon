"use client";

import Image from "next/image";
import { useState } from "react";
import { MoreVertical } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getSalleForOwnerAction } from "@/app/actions/proprietaire-salle";
import { AnnoncePreviewModal } from "./annonce-preview-modal";
import { AnnonceEditModal } from "./annonce-edit-modal";
import type { Salle } from "@/lib/types/salle";

type SalleRow = {
  id: string;
  slug: string;
  name: string;
  city: string;
  images: string[];
  status: string;
};

const STATUT_SALLE_LABEL: Record<string, string> = {
  approved: "Active",
  pending: "En validation",
  rejected: "Refusée",
};

const STATUT_SALLE_BADGE: Record<string, string> = {
  approved: "bg-emerald-100 text-emerald-700",
  pending: "bg-amber-100 text-amber-700",
  rejected: "bg-red-100 text-red-700",
};

type Props = {
  salles: SalleRow[];
};

export function AnnoncesClient({ salles }: Props) {
  const [previewSalle, setPreviewSalle] = useState<Salle | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [editSalle, setEditSalle] = useState<Salle | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const handleVoir = async (s: SalleRow) => {
    const res = await getSalleForOwnerAction(s.id);
    if (res.salle) {
      setPreviewSalle(res.salle);
      setPreviewOpen(true);
    }
  };

  const handleModifier = async (s: SalleRow) => {
    const res = await getSalleForOwnerAction(s.id);
    if (res.salle) {
      setEditSalle(res.salle);
      setEditOpen(true);
    }
  };

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {salles.map((s) => (
          <div
            key={s.id}
            className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md"
          >
            <div className="relative h-40">
              <Image
                src={Array.isArray(s.images) && s.images[0] ? String(s.images[0]) : "/img.png"}
                alt={s.name}
                fill
                className="object-cover"
              />
              <button
                type="button"
                className="absolute right-2 top-2 rounded p-1.5 bg-black/30 text-white/90 backdrop-blur-sm hover:bg-black/50"
                title="Plus d options"
              >
                <MoreVertical className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4">
              <p className="font-semibold text-black">{s.name}</p>
              <p className="text-sm text-slate-500">{s.city}</p>
              <span
                className={`mt-2 inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  STATUT_SALLE_BADGE[s.status] ?? "bg-slate-100 text-slate-600"
                }`}
              >
                {STATUT_SALLE_LABEL[s.status] ?? s.status}
              </span>
              <div className="mt-4 flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 border-slate-300"
                  onClick={() => handleVoir(s)}
                >
                  Voir
                </Button>
                <Button
                  size="sm"
                  className="flex-1 bg-gs-orange hover:brightness-95"
                  onClick={() => handleModifier(s)}
                >
                  Modifier
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <AnnoncePreviewModal
        salle={previewSalle}
        open={previewOpen}
        onOpenChange={(open) => {
          setPreviewOpen(open);
          if (!open) setPreviewSalle(null);
        }}
      />
      <AnnonceEditModal
        salle={editSalle}
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open);
          if (!open) setEditSalle(null);
        }}
      />
    </>
  );
}
