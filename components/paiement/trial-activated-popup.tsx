"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Gift } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Props = {
  show: boolean;
  freeTotal: number;
  userType: "seeker" | "owner";
  basePath: string;
};

export function TrialActivatedPopup({ show, freeTotal, userType, basePath }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (show) setOpen(true);
  }, [show]);

  const handleClose = () => {
    setOpen(false);
    router.replace(basePath);
    router.refresh();
  };

  const message =
    userType === "seeker"
      ? `Bravo, votre essai est activé ! Vous avez droit à ${freeTotal} demande${freeTotal > 1 ? "s" : ""} pour contacter les prestataires.`
      : `Bravo, votre essai est activé ! Vous avez droit à ${freeTotal} demande${freeTotal > 1 ? "s" : ""} pour découvrir les annonces des autres prestataires.`;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="h-6 w-6 text-emerald-600" />
            Bravo, votre essai est activé !
          </DialogTitle>
          <DialogDescription asChild>
            <p className="mt-2 text-slate-600">{message}</p>
          </DialogDescription>
        </DialogHeader>
        <Button onClick={handleClose} className="mt-4 w-full bg-gs-orange hover:brightness-95">
          Parfait
        </Button>
      </DialogContent>
    </Dialog>
  );
}
