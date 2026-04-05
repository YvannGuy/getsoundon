"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { moderateGsListingAdminAction } from "@/app/actions/admin-listings-moderation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { GS_LISTING_MODERATION } from "@/lib/gs-listing-moderation";

type Props = {
  listingId: string;
  moderationStatus: string | null | undefined;
  isActive: boolean | null | undefined;
};

export function AdminAnnoncesModerationButtons({ listingId, moderationStatus, isActive }: Props) {
  const router = useRouter();
  const mod = moderationStatus ?? GS_LISTING_MODERATION.APPROVED;
  const active = isActive === true;
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run(
    decision: "publish" | "hide" | "reject",
    rejectionReason?: string | null
  ) {
    setMsg(null);
    startTransition(async () => {
      const r = await moderateGsListingAdminAction(listingId, decision, rejectionReason ?? null);
      if (r.success) {
        setOpen(false);
        setReason("");
        setMsg("Enregistré.");
        router.refresh();
      } else {
        setMsg(r.error);
      }
    });
  }

  const showPublish = !(mod === GS_LISTING_MODERATION.APPROVED && active);
  const showHide = mod === GS_LISTING_MODERATION.APPROVED && active;
  const showReject = true;

  return (
    <div className="flex flex-col gap-2">
      {msg ? (
        <p className={`text-xs ${msg === "Enregistré." ? "text-emerald-700" : "text-red-600"}`}>{msg}</p>
      ) : null}
      <div className="flex flex-wrap gap-1.5">
        {showPublish ? (
          <Button
            type="button"
            size="sm"
            className="h-8 bg-emerald-700 text-white hover:bg-emerald-800"
            disabled={pending}
            onClick={() => run("publish")}
          >
            Publier
          </Button>
        ) : null}
        {showHide ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 border-slate-300"
            disabled={pending}
            onClick={() => run("hide")}
          >
            Masquer
          </Button>
        ) : null}
        {showReject ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 border-red-200 text-red-700 hover:bg-red-50"
            disabled={pending}
            onClick={() => {
              setMsg(null);
              setOpen(true);
            }}
          >
            Refuser
          </Button>
        ) : null}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="z-[10060]">
          <DialogHeader>
            <DialogTitle>Refuser l’annonce</DialogTitle>
            <DialogDescription>
              L’annonce sera marquée comme refusée et retirée du catalogue. Vous pouvez indiquer un motif pour le
              prestataire (recommandé).
            </DialogDescription>
          </DialogHeader>
          <textarea
            className="min-h-[100px] w-full rounded-md border border-slate-200 p-2 text-sm text-slate-900"
            placeholder="Motif (optionnel mais recommandé)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Annuler
            </Button>
            <Button
              type="button"
              className="bg-red-700 text-white hover:bg-red-800"
              disabled={pending}
              onClick={() => run("reject", reason.trim() || null)}
            >
              Confirmer le refus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
