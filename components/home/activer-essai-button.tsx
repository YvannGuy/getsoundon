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

type ActiverEssaiButtonProps = {
  isLoggedIn: boolean;
  trialActivated: boolean;
  paiementTrialUrl?: string;
  variant?: "default" | "gradient";
  className?: string;
};

const gradientClasses = "h-10 rounded-md bg-gradient-to-r from-[#213398] to-[#2d4ab8] px-7 text-[14px] text-white hover:from-[#1a2980] hover:to-[#213398]";

export function ActiverEssaiButton(props: ActiverEssaiButtonProps) {
  const {
    isLoggedIn,
    trialActivated,
    paiementTrialUrl = "/dashboard/paiement?trial=1",
    variant = "default",
    className,
  } = props;
  const [modalOpen, setModalOpen] = useState(false);
  const authUrl = (tab: "login" | "signup") =>
    `/auth?tab=${tab}&redirectedFrom=${encodeURIComponent(paiementTrialUrl)}`;

  if (trialActivated) {
    return (
      <Button
        disabled
        className={["h-10 cursor-not-allowed rounded-md bg-slate-200 px-7 text-[14px] text-slate-500 hover:bg-slate-200", className].filter(Boolean).join(" ")}
      >
        Activer mon essai
      </Button>
    );
  }

  const baseClass = variant === "gradient" ? gradientClasses : "h-10 rounded-md bg-[#213398] px-7 text-[14px] hover:bg-[#1a2980]";
  const activeClass = [baseClass, className].filter(Boolean).join(" ");

  if (isLoggedIn) {
    return (
      <Link href={paiementTrialUrl} className={className ? "block w-full" : undefined}>
        <Button className={activeClass}>
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
        className={activeClass}
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
