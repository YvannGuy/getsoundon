"use client";

import { useMemo, useState } from "react";
import { Eye } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type PhotoItem = {
  id: string;
  url: string;
  uploadedAt?: string | null;
};

type PhaseViewData = {
  phase: "before" | "after";
  label: string;
  lockText: string;
  isOpen: boolean;
  self: { notes: string | null; photos: PhotoItem[] } | null;
  other: { notes: string | null; photos: PhotoItem[] } | null;
};

type Props = {
  actorLabel: string;
  phases: PhaseViewData[];
};

export function EdlPhotoViewer({ actorLabel, phases }: Props) {
  const [open, setOpen] = useState(false);
  const [activePhase, setActivePhase] = useState<"before" | "after">("before");

  const currentPhase = useMemo(
    () => phases.find((phase) => phase.phase === activePhase) ?? phases[0],
    [activePhase, phases]
  );

  const totalPhotos = useMemo(
    () =>
      phases.reduce((acc, phase) => {
        const selfCount = phase.self?.photos.length ?? 0;
        const otherCount = phase.other?.photos.length ?? 0;
        return acc + selfCount + otherCount;
      }, 0),
    [phases]
  );
  const hasPhotos = totalPhotos > 0;

  const formatDateTime = (value?: string | null) => {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return `${date.toLocaleString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Paris",
    })} (Europe/Paris)`;
  };

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className={`h-8 w-full justify-center sm:w-auto ${
          hasPhotos
            ? "border-gs-orange/40 text-gs-orange hover:bg-gs-orange/5"
            : "border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed"
        }`}
        disabled={!hasPhotos}
        onClick={() => setOpen(true)}
      >
        <Eye className="mr-2 h-4 w-4" />
        Voir les photos ({totalPhotos})
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent showClose className="max-h-[90vh] max-w-3xl overflow-y-auto p-0">
          <DialogHeader className="border-b border-slate-200 px-5 py-4">
            <DialogTitle>Photos - État des lieux</DialogTitle>
            <DialogDescription>
              {actorLabel} - consultez les preuves entrée et sortie.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 p-5">
            <div className="flex flex-wrap gap-2">
              {phases.map((phase) => (
                <button
                  key={phase.phase}
                  type="button"
                  onClick={() => setActivePhase(phase.phase)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                    activePhase === phase.phase
                      ? "border-gs-orange bg-gs-orange text-white"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {phase.label}
                </button>
              ))}
            </div>

            {currentPhase && (
              <div className="space-y-3">
                {!currentPhase.isOpen && currentPhase.lockText && (
                  <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                    {currentPhase.lockText}
                  </p>
                )}
                <div className="grid gap-3 md:grid-cols-2">
                  {[
                    { title: "Vos photos", data: currentPhase.self },
                    { title: "Photos autre partie", data: currentPhase.other },
                  ].map((block) => (
                    <div key={block.title} className="rounded-lg border border-slate-200 bg-white p-3">
                      <p className="text-xs font-semibold uppercase text-slate-600">{block.title}</p>
                      <p className="mt-2 text-sm text-slate-700 line-clamp-2">{block.data?.notes || "—"}</p>
                      {(block.data?.photos.length ?? 0) === 0 ? (
                        <p className="mt-2 text-sm text-slate-500">Aucune photo.</p>
                      ) : (
                        <div className="mt-3 grid grid-cols-3 gap-2">
                          {block.data?.photos.map((photo) => (
                            <div key={photo.id}>
                              <a href={photo.url} target="_blank" rel="noreferrer">
                                <img
                                  src={photo.url}
                                  alt="Photo état des lieux"
                                  className="h-16 w-full rounded object-cover md:h-20"
                                />
                              </a>
                              <p className="mt-1 text-[10px] text-slate-500">
                                {formatDateTime(photo.uploadedAt) ?? "Horodatage indisponible"}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

