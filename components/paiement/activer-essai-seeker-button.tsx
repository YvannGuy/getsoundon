"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Gift } from "lucide-react";

import { activateTrialAction } from "@/app/actions/trial";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Props = {
  freeTotal: number;
  freeUsed?: number;
  className?: string;
};

export function ActiverEssaiSeekerButton({ freeTotal, freeUsed = 0, className }: Props) {
  const remaining = Math.max(0, freeTotal - freeUsed);
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const router = useRouter();

  const handleActivate = async () => {
    setLoading(true);
    const res = await activateTrialAction();
    setLoading(false);
    if (res.success) {
      setShowSuccess(true);
    }
  };

  const handleCloseSuccess = () => {
    setShowSuccess(false);
    router.refresh();
  };

  return (
    <>
      <Button
        onClick={handleActivate}
        disabled={loading}
        className={className}
      >
        {loading ? "Activation..." : "Activez mon essai gratuit"}
      </Button>
      <Dialog open={showSuccess} onOpenChange={(open) => !open && handleCloseSuccess()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gift className="h-6 w-6 text-emerald-600" />
              Votre essai est activé !
            </DialogTitle>
            <DialogDescription asChild>
              <div className="mt-2 space-y-1">
                <p className="font-semibold text-emerald-800">Essai actif</p>
                <p className="text-sm text-emerald-700">
                  {remaining} demande{remaining > 1 ? "s" : ""} gratuite
                  {remaining > 1 ? "s" : ""} restante{remaining > 1 ? "s" : ""}
                </p>
                <p className="mt-2 text-slate-600">
                  Envoyez vos demandes aux prestataires pour vérifier les disponibilités.
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <Button onClick={handleCloseSuccess} className="mt-4 w-full bg-gs-orange hover:brightness-95">
            Parfait
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
