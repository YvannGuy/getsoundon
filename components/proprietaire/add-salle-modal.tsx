"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { GetSoundOnOnboardingWizard } from "./getsoundon-onboarding-wizard";

type AddSalleModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function AddSalleModal({ open, onOpenChange }: AddSalleModalProps) {
  const router = useRouter();

  const handleSuccess = () => {
    onOpenChange(false);
    router.refresh();
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showClose={true}
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto p-0 sm:max-w-2xl"
      >
        <DialogHeader className="border-b border-slate-200 px-6 py-4">
          <DialogTitle>Ajouter une annonce</DialogTitle>
        </DialogHeader>
        <div className="px-6 py-4">
          <GetSoundOnOnboardingWizard
            embedded
            onSuccess={handleSuccess}
            onClose={handleClose}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function AddSalleButton({
  variant = "default",
  size,
  className,
  children = "Ajouter une salle",
  title,
  ...rest
}: {
  variant?: "default" | "outline" | "secondary" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  children?: React.ReactNode;
  title?: string;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children">) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={() => setOpen(true)}
        title={title}
        {...rest}
      >
        {children}
      </Button>
      <AddSalleModal open={open} onOpenChange={setOpen} />
    </>
  );
}

export function AddSalleAutoOpen({ initialOpen }: { initialOpen: boolean }) {
  const [open, setOpen] = useState(initialOpen);

  if (!initialOpen) return null;

  return <AddSalleModal open={open} onOpenChange={setOpen} />;
}
