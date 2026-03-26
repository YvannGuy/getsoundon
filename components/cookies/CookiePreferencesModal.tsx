"use client";

import { useState, useEffect } from "react";
import { readConsent, writeConsent, type ConsentState } from "@/lib/consent";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function CookiePreferencesModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [state, setState] = useState<ConsentState>({
    v: 1,
    ts: 0,
    necessary: true,
    analytics: false,
    marketing: false,
  });

  useEffect(() => {
    if (open) {
      const current = readConsent();
      if (current) {
        setState(current);
      }
    }
  }, [open]);

  const handleSave = () => {
    writeConsent({
      analytics: state.analytics,
      marketing: state.marketing,
    });
    onOpenChange(false);
  };

  const handleAcceptAll = () => {
    writeConsent({ analytics: true, marketing: true });
    onOpenChange(false);
  };

  const handleRejectAll = () => {
    writeConsent({ analytics: false, marketing: false });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Gérer mes cookies</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
            <div>
              <p className="font-medium text-black">Nécessaires</p>
              <p className="text-[13px] text-slate-600">
                Authentification, sécurité, consentement. Toujours actifs.
              </p>
            </div>
            <span className="text-[13px] text-slate-500">Toujours ON</span>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
            <div>
              <p className="font-medium text-black">Statistiques</p>
              <p className="text-[13px] text-slate-600">
                Comprendre l&apos;utilisation du site (analytics).
              </p>
            </div>
            <input
              type="checkbox"
              checked={state.analytics}
              onChange={(e) => setState((s) => ({ ...s, analytics: e.target.checked }))}
              className="h-4 w-4 rounded border-slate-300 text-gs-orange"
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
            <div>
              <p className="font-medium text-black">Marketing</p>
              <p className="text-[13px] text-slate-600">
                Publicités, pixels, réseaux sociaux.
              </p>
            </div>
            <input
              type="checkbox"
              checked={state.marketing}
              onChange={(e) => setState((s) => ({ ...s, marketing: e.target.checked }))}
              className="h-4 w-4 rounded border-slate-300 text-gs-orange"
            />
          </div>
        </div>
        <DialogFooter className="flex flex-col gap-2 sm:flex-row">
          <Button variant="outline" onClick={handleRejectAll} className="sm:mr-auto">
            Tout refuser
          </Button>
          <Button variant="outline" onClick={handleAcceptAll}>
            Tout accepter
          </Button>
          <Button onClick={handleSave}>Enregistrer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
