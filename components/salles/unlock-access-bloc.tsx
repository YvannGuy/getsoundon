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

type UnlockAccessBlocProps = {
  isLoggedIn: boolean;
  paiementUrl?: string;
};

export function UnlockAccessBloc({ isLoggedIn, paiementUrl = "/dashboard/paiement" }: UnlockAccessBlocProps) {
  const [modalOpen, setModalOpen] = useState(false);

  if (isLoggedIn) {
    return (
      <Link href={paiementUrl}>
        <Button className="h-12 w-full rounded-lg bg-[#213398] font-semibold hover:bg-[#1a2980]">
          Débloquer l&apos;accès
        </Button>
      </Link>
    );
  }

  const authUrl = (tab: "login" | "signup") =>
    `/auth?tab=${tab}&redirectedFrom=${encodeURIComponent(paiementUrl)}`;

  return (
    <>
      <Button
        type="button"
        onClick={() => setModalOpen(true)}
        className="h-12 w-full rounded-lg bg-[#213398] font-semibold hover:bg-[#1a2980]"
      >
        Débloquer l&apos;accès
      </Button>
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Connectez-vous pour continuer</DialogTitle>
            <DialogDescription>
              Créez un compte ou connectez-vous pour accéder à l&apos;espace paiement et choisir un Pass.
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
