"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Eye } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type EvidencePhoto = {
  id: string;
  url: string;
};

export function AdminEvidenceViewer({
  label,
  photos,
}: {
  label?: string;
  photos: EvidencePhoto[];
}) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const hasPhotos = photos.length > 0;
  const current = photos[index] ?? null;

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={!hasPhotos}
        className={
          hasPhotos
            ? "h-8 border-[#213398]/40 text-[#213398] hover:bg-[#213398]/5"
            : "h-8 border-slate-200 bg-slate-100 text-slate-400"
        }
        onClick={() => {
          setIndex(0);
          setOpen(true);
        }}
      >
        <Eye className="mr-1.5 h-4 w-4" />
        {label ?? "Voir preuves"} ({photos.length})
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent showClose className="max-h-[90vh] max-w-3xl overflow-y-auto p-0">
          <DialogHeader className="border-b border-slate-200 px-5 py-4">
            <DialogTitle>Preuves litige ({index + 1}/{photos.length || 1})</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 p-5">
            {current ? (
              <>
                <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                  <img src={current.url} alt="Preuve litige" className="max-h-[60vh] w-full object-contain" />
                </div>
                <div className="flex items-center justify-between">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={index === 0}
                    onClick={() => setIndex((v) => Math.max(0, v - 1))}
                  >
                    <ChevronLeft className="mr-1 h-4 w-4" />
                    Précédente
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={index >= photos.length - 1}
                    onClick={() => setIndex((v) => Math.min(photos.length - 1, v + 1))}
                  >
                    Suivante
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              </>
            ) : (
              <p className="text-sm text-slate-500">Aucune preuve photo.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

