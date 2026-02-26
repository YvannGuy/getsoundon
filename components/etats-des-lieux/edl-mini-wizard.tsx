"use client";

import { type ReactNode, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, ChevronLeft, ChevronRight, FileWarning, Lock, PlayCircle } from "lucide-react";

import { openUserDisputeCaseAction, submitEtatDesLieuxAction } from "@/app/actions/etats-des-lieux";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

type Props = {
  offerId: string;
  actorLabel: string;
  beforeDone: boolean;
  afterDone: boolean;
  beforeOpen: boolean;
  afterOpen: boolean;
  beforeLockText: string;
  afterLockText: string;
  leadingAction?: ReactNode;
};

type WizardStep = 1 | 2 | 3 | 4;

export function EdlMiniWizard({
  offerId,
  actorLabel,
  beforeDone,
  afterDone,
  beforeOpen,
  afterOpen,
  beforeLockText,
  afterLockText,
  leadingAction,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<WizardStep>(1);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [beforeNotes, setBeforeNotes] = useState("");
  const [afterNotes, setAfterNotes] = useState("");
  const [disputeReason, setDisputeReason] = useState("");

  const [beforeFiles, setBeforeFiles] = useState<File[]>([]);
  const [afterFiles, setAfterFiles] = useState<File[]>([]);
  const [disputeFiles, setDisputeFiles] = useState<File[]>([]);

  const [beforeDoneLocal, setBeforeDoneLocal] = useState(beforeDone);
  const [afterDoneLocal, setAfterDoneLocal] = useState(afterDone);

  const bothDone = beforeDoneLocal && afterDoneLocal;
  const canStartNow = beforeOpen || afterOpen || bothDone;
  const disabledHint = useMemo(() => {
    if (canStartNow) return "";
    if (!beforeOpen && !afterOpen) {
      return beforeLockText || afterLockText || "Le dépôt est verrouillé pour le moment.";
    }
    return "";
  }, [canStartNow, beforeLockText, afterLockText]);

  const resetFeedback = () => {
    setError(null);
    setSuccess(null);
  };

  const submitPhase = (phase: "before" | "after") => {
    const files = phase === "before" ? beforeFiles : afterFiles;
    const notes = phase === "before" ? beforeNotes : afterNotes;
    if (files.length === 0) {
      setError("Ajoutez au moins une photo pour continuer.");
      return;
    }

    resetFeedback();
    startTransition(async () => {
      const formData = new FormData();
      formData.append("offerId", offerId);
      formData.append("phase", phase);
      formData.append("notes", notes);
      for (const file of files) formData.append("photos", file);

      const res = await submitEtatDesLieuxAction(formData);
      if (!res.success) {
        setError(res.error ?? "Impossible d'enregistrer ce dépôt.");
        return;
      }

      if (phase === "before") {
        setBeforeDoneLocal(true);
        setStep(3);
        setBeforeFiles([]);
      } else {
        setAfterDoneLocal(true);
        setStep(4);
        setAfterFiles([]);
      }
      setSuccess(`État des lieux ${phase === "before" ? "d'entrée" : "de sortie"} enregistré.`);
      router.refresh();
    });
  };

  const submitDispute = () => {
    if (!bothDone) {
      setError("Complétez d'abord les phases entrée et sortie.");
      return;
    }
    if (!disputeReason.trim()) {
      setError("Ajoutez un motif de litige.");
      return;
    }
    if (disputeFiles.length === 0) {
      setError("Ajoutez au moins une photo de preuve.");
      return;
    }

    resetFeedback();
    startTransition(async () => {
      const formData = new FormData();
      formData.append("offerId", offerId);
      formData.append("reason", disputeReason.trim());
      for (const file of disputeFiles) formData.append("photos", file);

      const res = await openUserDisputeCaseAction(formData);
      if (!res.success) {
        setError(res.error ?? "Impossible d'ouvrir le litige.");
        return;
      }

      setSuccess("Litige envoyé avec preuves.");
      setDisputeFiles([]);
      setDisputeReason("");
      router.refresh();
    });
  };

  return (
    <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50/50 p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-black">Parcours guidé</p>
          <p className="text-xs text-slate-600">
            {actorLabel} • 3 étapes rapides pour valider l&apos;état des lieux.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          {leadingAction}
          <Button
            type="button"
            size="sm"
            className="w-full bg-[#213398] text-xs hover:bg-[#1a2b80] sm:w-auto sm:text-sm"
            disabled={!canStartNow}
            onClick={() => {
              resetFeedback();
              setStep(1);
              setOpen(true);
            }}
          >
            <PlayCircle className="mr-2 h-4 w-4" />
            Commencer l&apos;état des lieux
          </Button>
        </div>
      </div>
      {!canStartNow && (
        <p className="flex items-start gap-2 text-xs text-amber-700">
          <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {disabledHint}
        </p>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent showClose className="max-h-[90vh] max-w-2xl overflow-y-auto p-0">
          <DialogHeader className="border-b border-slate-200 px-5 py-4">
            <DialogTitle>État des lieux - étape {step}/4</DialogTitle>
            <DialogDescription>
              Déposez vos preuves photo dans l&apos;ordre pour sécuriser la réservation.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 p-5">
            {error && (
              <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            {success && (
              <div className="flex items-start gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{success}</span>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-3">
                <p className="text-sm text-slate-700">
                  Vous allez compléter <strong>entrée</strong>, puis <strong>sortie</strong>. Le litige ne s&apos;active qu&apos;à la fin.
                </p>
                <ul className="space-y-2 text-sm text-slate-700">
                  <li>- Entrée: {beforeDoneLocal ? "déjà déposée" : beforeOpen ? "ouverte" : "verrouillée"}</li>
                  <li>- Sortie: {afterDoneLocal ? "déjà déposée" : afterOpen ? "ouverte" : "verrouillée"}</li>
                </ul>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-black">Étape 2 - Dépôt entrée (avant)</h3>
                {!beforeOpen ? (
                  <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    {beforeLockText || "Cette étape est verrouillée pour le moment."}
                  </p>
                ) : (
                  <>
                    <Input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => setBeforeFiles(Array.from(e.target.files ?? []))}
                    />
                    <textarea
                      rows={3}
                      value={beforeNotes}
                      onChange={(e) => setBeforeNotes(e.target.value)}
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                      placeholder="Notes entrée (état, anomalies, propreté...)"
                    />
                    <p className="text-xs text-slate-500">{beforeFiles.length} photo(s) sélectionnée(s)</p>
                  </>
                )}
              </div>
            )}

            {step === 3 && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-black">Étape 3 - Dépôt sortie (après)</h3>
                {!afterOpen ? (
                  <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    {afterLockText || "Cette étape est verrouillée pour le moment."}
                  </p>
                ) : (
                  <>
                    <Input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => setAfterFiles(Array.from(e.target.files ?? []))}
                    />
                    <textarea
                      rows={3}
                      value={afterNotes}
                      onChange={(e) => setAfterNotes(e.target.value)}
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                      placeholder="Notes sortie (dégâts éventuels, restitution...)"
                    />
                    <p className="text-xs text-slate-500">{afterFiles.length} photo(s) sélectionnée(s)</p>
                  </>
                )}
              </div>
            )}

            {step === 4 && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-black">Étape 4 - Validation / Litige</h3>
                {!bothDone ? (
                  <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                    Terminez les étapes entrée et sortie pour ouvrir un litige.
                  </p>
                ) : (
                  <>
                    <p className="text-sm text-slate-700">
                      Les deux phases sont déposées. En cas de problème, vous pouvez ouvrir un litige avec preuves.
                    </p>
                    <textarea
                      rows={3}
                      value={disputeReason}
                      onChange={(e) => setDisputeReason(e.target.value)}
                      className="w-full rounded-md border border-amber-300 px-3 py-2 text-sm"
                      placeholder="Motif du litige..."
                    />
                    <Input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => setDisputeFiles(Array.from(e.target.files ?? []))}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="border-amber-300 text-amber-800 hover:bg-amber-50"
                      disabled={pending}
                      onClick={submitDispute}
                    >
                      <FileWarning className="mr-2 h-4 w-4" />
                      Ouvrir un litige
                    </Button>
                  </>
                )}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-3">
              <Button
                type="button"
                variant="outline"
                disabled={pending || step === 1}
                onClick={() => {
                  resetFeedback();
                  setStep((Math.max(1, step - 1) as WizardStep));
                }}
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                Précédent
              </Button>

              <div className="flex items-center gap-2">
                {step === 2 && beforeOpen && (
                  <Button type="button" disabled={pending} onClick={() => submitPhase("before")}>
                    Valider l&apos;entrée
                  </Button>
                )}
                {step === 3 && afterOpen && (
                  <Button type="button" disabled={pending} onClick={() => submitPhase("after")}>
                    Valider la sortie
                  </Button>
                )}
                {step < 4 && (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={pending}
                    onClick={() => {
                      resetFeedback();
                      setStep((Math.min(4, step + 1) as WizardStep));
                    }}
                  >
                    Suivant
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

