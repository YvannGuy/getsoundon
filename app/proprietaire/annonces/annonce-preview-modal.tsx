"use client";

import Image from "next/image";
import Link from "next/link";
import { MapPin, Users } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { Salle } from "@/lib/types/salle";
import { formatSalleTarifs } from "@/lib/types/salle";

type Props = {
  salle: Salle | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function AnnoncePreviewModal({ salle, open, onOpenChange }: Props) {
  if (!salle) return null;

  const imgs = salle.images.length > 0 ? salle.images : ["/img.png"];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto" showClose>
        <DialogHeader>
          <DialogTitle>Aperçu de l&apos;annonce</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="relative aspect-[16/10] overflow-hidden rounded-xl bg-slate-100">
            <Image
              src={imgs[0]}
              alt={salle.name}
              fill
              className="object-cover"
              sizes="640px"
            />
          </div>
          <div>
            <h2 className="text-xl font-bold text-black">{salle.name}</h2>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <span className="flex items-center gap-1.5 text-sm text-slate-500">
                <MapPin className="h-4 w-4" />
                {salle.city}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-gs-orange/10 px-3 py-1 text-[13px] font-medium text-black">
                <Users className="h-4 w-4" />
                Jusqu&apos;à {salle.capacity} personnes
              </span>
            </div>
          </div>
          {salle.description && (
            <section>
              <h3 className="mb-2 text-sm font-semibold text-black">Description</h3>
              <p className="text-sm leading-relaxed text-slate-600">{salle.description}</p>
            </section>
          )}
          <section>
            <h3 className="mb-2 text-sm font-semibold text-black">Tarification</h3>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-lg font-bold text-black">{formatSalleTarifs(salle)}</p>
            </div>
          </section>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fermer
            </Button>
            <Link href="/catalogue">
              <Button className="bg-gs-orange hover:brightness-95">
                Voir le catalogue matériel
              </Button>
            </Link>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
