"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Check, MapPin, Phone, Users, Video } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Salle } from "@/lib/types/salle";
import { formatSalleTarifs } from "@/lib/types/salle";

type Props = {
  salle: Salle | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function AnnoncePreviewModal({ salle, open, onOpenChange }: Props) {
  const [imgIndex, setImgIndex] = useState(0);

  useEffect(() => {
    setImgIndex(0);
  }, [salle?.id]);

  if (!salle) return null;

  const imgs = salle.images.length > 0 ? salle.images : ["/img.png"];
  const currentImg = imgs[imgIndex % imgs.length];
  const featuresLabels = salle.features.map((f) => f.label).filter(Boolean);
  const conditionsLabels = salle.conditions.map((c) => c.label).filter(Boolean);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[90vh] max-w-2xl overflow-y-auto"
        showClose
      >
        <DialogHeader>
          <DialogTitle>Aperçu de l&apos;annonce</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Galerie photos */}
          <div>
            <p className="mb-2 text-xs font-medium uppercase text-slate-500">Photos</p>
            <div className="relative aspect-[16/10] overflow-hidden rounded-xl bg-slate-100">
              <Image
                src={currentImg}
                alt={salle.name}
                fill
                className="object-cover"
                sizes="640px"
              />
              {imgs.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setImgIndex((i) => (i <= 0 ? imgs.length - 1 : i - 1));
                    }}
                    className="absolute left-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
                    aria-label="Photo précédente"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setImgIndex((i) => (i >= imgs.length - 1 ? 0 : i + 1));
                    }}
                    className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
                    aria-label="Photo suivante"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                  <span className="absolute bottom-2 right-2 rounded bg-black/50 px-2 py-1 text-xs text-white">
                    {imgIndex + 1} / {imgs.length}
                  </span>
                </>
              )}
            </div>
            {imgs.length > 1 && (
              <div className="mt-2 flex gap-1 overflow-x-auto pb-1">
                {imgs.map((img, i) => (
                  <button
                    key={img + i}
                    type="button"
                    onClick={() => setImgIndex(i)}
                    className={`relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border-2 transition ${
                      i === imgIndex ? "border-gs-orange" : "border-transparent opacity-70 hover:opacity-100"
                    }`}
                  >
                    <Image src={img} alt="" fill className="object-cover" sizes="56px" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Vidéo */}
          {salle.videoUrl && (
            <div>
              <p className="mb-2 flex items-center gap-1 text-xs font-medium uppercase text-slate-500">
                <Video className="h-3.5 w-3.5" /> Vidéo
              </p>
              <div className="overflow-hidden rounded-xl bg-slate-900">
                <video
                  src={salle.videoUrl}
                  controls
                  playsInline
                  className="aspect-video w-full object-contain"
                  preload="metadata"
                  poster={imgs[0]}
                >
                  Votre navigateur ne supporte pas la vidéo.
                </video>
              </div>
            </div>
          )}

          {/* Infos principales */}
          <div>
            <h2 className="text-xl font-bold text-black">{salle.name}</h2>
            <p className="mt-1 flex items-center gap-2 text-sm text-slate-600">
              <MapPin className="h-4 w-4 shrink-0" />
              {salle.address}, {salle.city}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-gs-orange/10 px-3 py-1 text-[13px] font-medium text-black">
                <Users className="h-4 w-4" />
                Jusqu&apos;à {salle.capacity} personnes
              </span>
              {salle.displayContactPhone && salle.contactPhone && (
                <span className="flex items-center gap-1.5 text-sm text-slate-600">
                  <Phone className="h-4 w-4" />
                  {salle.contactPhone}
                </span>
              )}
              {salle.cautionRequise && (
                <span className="text-xs text-amber-600">Caution requise</span>
              )}
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

          {salle.pricingInclusions.length > 0 && (
            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase text-slate-500">Ce tarif comprend</h3>
              <p className="text-sm text-slate-600">{salle.pricingInclusions.join(", ")}</p>
            </section>
          )}

          {salle.horairesParJour && Object.keys(salle.horairesParJour).length > 0 && (
            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase text-slate-500">Horaires</h3>
              <ul className="space-y-0.5 text-sm text-slate-600">
                {Object.entries(salle.horairesParJour).map(([jour, h]) => (
                  <li key={jour} className="capitalize">
                    {jour}: {h.debut} – {h.fin}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {salle.joursOuverture && salle.joursOuverture.length > 0 && (
            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase text-slate-500">Jours de location</h3>
              <p className="text-sm capitalize text-slate-600">{salle.joursOuverture.join(", ")}</p>
            </section>
          )}

          {featuresLabels.length > 0 && (
            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase text-slate-500">Caractéristiques</h3>
              <ul className="space-y-0.5">
                {featuresLabels.map((label, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-slate-600">
                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                    {label}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {conditionsLabels.length > 0 && (
            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase text-slate-500">Conditions</h3>
              <p className="text-sm text-slate-600">{conditionsLabels.join(". ")}</p>
            </section>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
