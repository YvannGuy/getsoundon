"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Eye } from "lucide-react";

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

type SideData = {
  notes: string | null;
  submittedAt: string | null;
  photos: PhotoItem[];
};

type PhaseData = {
  phase: "before" | "after";
  label: string;
  owner: SideData | null;
  seeker: SideData | null;
};

type Props = {
  phases: PhaseData[];
};

export function AdminEdlPhotoViewer({ phases }: Props) {
  const [open, setOpen] = useState(false);
  const [activePhase, setActivePhase] = useState<"before" | "after">("before");
  const [activeSide, setActiveSide] = useState<"owner" | "seeker">("owner");
  const [index, setIndex] = useState(0);

  const currentPhase = useMemo(
    () => phases.find((phase) => phase.phase === activePhase) ?? phases[0],
    [activePhase, phases]
  );
  const currentSide = activeSide === "owner" ? currentPhase?.owner : currentPhase?.seeker;
  const photos = currentSide?.photos ?? [];
  const currentPhoto = photos[index] ?? null;

  const openViewer = (phase: "before" | "after", side: "owner" | "seeker") => {
    setActivePhase(phase);
    setActiveSide(side);
    setIndex(0);
    setOpen(true);
  };

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
    <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-3">
      {phases.map((phase) => {
        const ownerCount = phase.owner?.photos.length ?? 0;
        const seekerCount = phase.seeker?.photos.length ?? 0;
        return (
          <div key={phase.phase} className="rounded-md border border-slate-100 bg-slate-50/40 p-2">
            <p className="text-xs font-semibold text-slate-700">{phase.label}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={ownerCount === 0}
                className={
                  ownerCount === 0
                    ? "h-8 border-slate-200 bg-slate-100 text-slate-400"
                    : "h-8 border-[#213398]/40 text-[#213398] hover:bg-[#213398]/5"
                }
                onClick={() => openViewer(phase.phase, "owner")}
              >
                <Eye className="mr-1.5 h-4 w-4" />
                Propriétaire ({ownerCount})
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={seekerCount === 0}
                className={
                  seekerCount === 0
                    ? "h-8 border-slate-200 bg-slate-100 text-slate-400"
                    : "h-8 border-[#213398]/40 text-[#213398] hover:bg-[#213398]/5"
                }
                onClick={() => openViewer(phase.phase, "seeker")}
              >
                <Eye className="mr-1.5 h-4 w-4" />
                Locataire ({seekerCount})
              </Button>
            </div>
          </div>
        );
      })}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent showClose className="max-h-[90vh] max-w-4xl overflow-y-auto p-0">
          <DialogHeader className="border-b border-slate-200 px-5 py-4">
            <DialogTitle>
              {currentPhase?.label ?? "Photos"} • {activeSide === "owner" ? "Propriétaire" : "Locataire"}
            </DialogTitle>
            <DialogDescription>
              {photos.length > 0 ? `${index + 1}/${photos.length} photo(s)` : "Aucune photo"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 p-5">
            <div className="flex flex-wrap gap-2">
              {(["before", "after"] as const).map((phase) => (
                <button
                  key={phase}
                  type="button"
                  onClick={() => {
                    setActivePhase(phase);
                    setIndex(0);
                  }}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
                    activePhase === phase
                      ? "border-[#213398] bg-[#213398] text-white"
                      : "border-slate-200 bg-white text-slate-700"
                  }`}
                >
                  {phase === "before" ? "Avant" : "Après"}
                </button>
              ))}
              {(["owner", "seeker"] as const).map((side) => (
                <button
                  key={side}
                  type="button"
                  onClick={() => {
                    setActiveSide(side);
                    setIndex(0);
                  }}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
                    activeSide === side
                      ? "border-black bg-black text-white"
                      : "border-slate-200 bg-white text-slate-700"
                  }`}
                >
                  {side === "owner" ? "Propriétaire" : "Locataire"}
                </button>
              ))}
            </div>

            {currentSide?.notes && (
              <p className="rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-700">{currentSide.notes}</p>
            )}
            {currentSide?.submittedAt && (
              <p className="text-xs text-slate-500">
                Déposé le {new Date(currentSide.submittedAt).toLocaleString("fr-FR")}
              </p>
            )}

            {currentPhoto ? (
              <div className="space-y-3">
                <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                  <img
                    src={currentPhoto.url}
                    alt="Photo état des lieux"
                    className="max-h-[60vh] w-full object-contain"
                  />
                </div>
                <p className="text-xs text-slate-500">
                  Horodatage:{" "}
                  {formatDateTime(currentPhoto.uploadedAt ?? currentSide?.submittedAt) ??
                    "indisponible"}
                </p>
                <div className="flex items-center justify-between">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={index === 0}
                    onClick={() => setIndex((i) => Math.max(0, i - 1))}
                  >
                    <ChevronLeft className="mr-1 h-4 w-4" />
                    Précédente
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={index >= photos.length - 1}
                    onClick={() => setIndex((i) => Math.min(photos.length - 1, i + 1))}
                  >
                    Suivante
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500">Aucune photo disponible pour cette sélection.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

