"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

export function SalleGallery({
  images,
  name,
}: {
  images: string[];
  name: string;
}) {
  const preventSave = useCallback((e: React.MouseEvent) => e.preventDefault(), []);
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);

  const imgs = images.length > 0 ? images : ["/img.png"];
  const current = imgs[index] ?? imgs[0];

  const goPrev = useCallback(() => {
    setIndex((i) => (i <= 0 ? imgs.length - 1 : i - 1));
  }, [imgs.length]);

  const goNext = useCallback(() => {
    setIndex((i) => (i >= imgs.length - 1 ? 0 : i + 1));
  }, [imgs.length]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, goPrev, goNext]);

  return (
    <>
      <div
        className="mb-8 grid gap-3 md:grid-cols-[1fr_120px] select-none"
        onContextMenu={preventSave}
      >
        <button
          type="button"
          onClick={() => {
            setIndex(0);
            setOpen(true);
          }}
          className="relative aspect-[16/10] cursor-pointer overflow-hidden rounded-xl bg-slate-100 transition-opacity hover:opacity-95"
        >
          <Image
            src={imgs[0]}
            alt={name}
            fill
            className="object-cover pointer-events-none"
            priority
            sizes="(max-width: 768px) 100vw, 65vw"
            draggable={false}
          />
        </button>
        <div className="hidden flex-col gap-3 md:flex">
          {imgs.slice(1, 4).map((img, i) => (
            <button
              key={`${img}-${i}`}
              type="button"
              onClick={() => {
                setIndex(i + 1);
                setOpen(true);
              }}
              className="relative aspect-square cursor-pointer overflow-hidden rounded-lg bg-slate-100 transition-opacity hover:opacity-95"
            >
              <Image src={img} alt="" fill className="object-cover pointer-events-none" sizes="120px" draggable={false} />
            </button>
          ))}
        </div>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 select-none"
          onClick={() => setOpen(false)}
          onContextMenu={preventSave}
        >
          <div
            className="relative max-h-[360px] max-w-[min(480px,calc(100vw-2rem))]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={current}
              alt={name}
              className="max-h-[360px] w-auto max-w-full rounded-lg object-contain"
              draggable={false}
              onContextMenu={preventSave}
            />

            {/* Croix fermer – en overlay sur la photo, coin supérieur droit */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
              }}
              className="absolute right-2 top-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-black/50 text-white transition hover:bg-black/70 sm:right-3 sm:top-3 sm:h-11 sm:w-11"
              aria-label="Fermer"
            >
              <X className="h-5 w-5 sm:h-6 sm:w-6" />
            </button>

            {/* Flèches – en overlay sur la photo, à gauche et droite */}
            {imgs.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    goPrev();
                  }}
                  className="absolute left-2 top-1/2 flex h-10 w-10 -translate-y-1/2 shrink-0 items-center justify-center rounded-full bg-black/50 text-white transition hover:bg-black/70 sm:left-3 sm:h-11 sm:w-11"
                  aria-label="Précédent"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    goNext();
                  }}
                  className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 shrink-0 items-center justify-center rounded-full bg-black/50 text-white transition hover:bg-black/70 sm:right-3 sm:h-11 sm:w-11"
                  aria-label="Suivant"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            )}

            {imgs.length > 1 && (
              <p className="mt-2 text-center text-sm text-white/80">
                {index + 1} / {imgs.length}
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
