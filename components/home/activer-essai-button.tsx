"use client";

import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const PAIEMENT_TRIAL_URL = "/dashboard/paiement?trial=1";

function authUrl(tab: "login" | "signup") {
  return `/auth?tab=${tab}&redirectedFrom=${encodeURIComponent(PAIEMENT_TRIAL_URL)}`;
}

type ActiverEssaiButtonProps = {
  isLoggedIn: boolean;
  trialActivated: boolean;
};

export function ActiverEssaiButton({ isLoggedIn, trialActivated }: ActiverEssaiButtonProps) {
  const [modalOpen, setModalOpen] = useState(false);

  if (trialActivated) {
    return (
      <Button
        disabled
        className="h-10 cursor-not-allowed rounded-md bg-slate-200 px-7 text-[14px] text-slate-500 hover:bg-slate-200"
      >
        Activer mon essai
      </Button>
    );
  }

  if (isLoggedIn) {
    return (
      <Link href={PAIEMENT_TRIAL_URL}>
        <Button className="h-10 rounded-md bg-[#213398] px-7 text-[14px] hover:bg-[#1a2980]">
          Activer mon essai
        </Button>
      </Link>
    );
  }

  return (
    <>
      <Button
        type="button"
        onClick={() => setModalOpen(true)}
        className="h-10 rounded-md bg-[#213398] px-7 text-[14px] hover:bg-[#1a2980]"
      >
        Activer mon essai
      </Button>
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Connectez-vous pour activer votre essai</DialogTitle>
            <DialogDescription>
              Créez un compte ou connectez-vous pour bénéficier de 3 demandes offertes, puis accédez à l&apos;espace paiement.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-6 flex flex-col gap-3">
            <Link href={authUrl("login")} onClick={() => setModalOpen(false)}>
              <Button className="h-11 w-full bg-[#213398] hover:bg-[#1a2980]">
                Se connecter
              </Button>
            </Link>
            <Link href={authUrl("signup")} onClick={() => setModalOpen(false)}>
              <Button variant="outline" className="h-11 w-full">
                Créer un compte
              </Button>
            </Link>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
