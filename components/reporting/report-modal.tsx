"use client";

import { useEffect, useState, useTransition } from "react";
import { Flag } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { GS_REPORT_REASONS } from "@/lib/gs-reports";
import { createClient } from "@/lib/supabase/client";

type Target = {
  type: "listing" | "provider";
  listingId?: string;
  providerId?: string;
  /** Libellé affiché dans le titre (titre annonce ou nom boutique) */
  label: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: Target;
  /** Libellé du bouton déclencheur (hors modale) */
  triggerLabel?: string;
};

export function ReportModal({ open, onOpenChange, target, triggerLabel }: Props) {
  const [reasonCode, setReasonCode] = useState<string>("other");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [needEmail, setNeedEmail] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    setError(null);
    setDone(false);
    setMessage("");
    (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setNeedEmail(!user?.email);
      if (user?.email) setEmail(user.email);
      else setEmail("");
    })();
  }, [open]);

  const title =
    target.type === "listing"
      ? "Signaler cette annonce"
      : "Signaler ce prestataire";

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const payload =
        target.type === "listing"
          ? {
              target_type: "listing" as const,
              target_listing_id: target.listingId,
              target_provider_id: null,
            }
          : {
              target_type: "provider" as const,
              target_listing_id: null,
              target_provider_id: target.providerId,
            };

      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          reason_code: reasonCode,
          message: message.trim(),
          reporter_email: needEmail ? email.trim() || null : null,
        }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(json.error ?? "Envoi impossible.");
        return;
      }
      setDone(true);
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="z-[10060] max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flag className="h-5 w-5 text-amber-600" aria-hidden />
            {title}
          </DialogTitle>
          <DialogDescription>
            {triggerLabel ? <span className="block font-medium text-slate-700">{triggerLabel}</span> : null}
            Votre signalement est examiné manuellement par l’équipe. Il ne déclenche aucune action automatique sur le
            compte ou l’annonce.
          </DialogDescription>
        </DialogHeader>

        {done ? (
          <p className="text-sm text-emerald-800">
            Merci : votre signalement a bien été transmis. Nous le traitons dans les meilleurs délais.
          </p>
        ) : (
          <div className="grid gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600" htmlFor="report-reason">
                Motif
              </label>
              <select
                id="report-reason"
                value={reasonCode}
                onChange={(e) => setReasonCode(e.target.value)}
                className="h-10 w-full rounded-md border border-slate-200 px-3 text-sm"
              >
                {GS_REPORT_REASONS.map((r) => (
                  <option key={r.code} value={r.code}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600" htmlFor="report-msg">
                Description (min. 10 caractères)
              </label>
              <textarea
                id="report-msg"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                className="w-full rounded-md border border-slate-200 p-2 text-sm"
                placeholder="Décrivez la situation de façon factuelle."
              />
            </div>
            {needEmail ? (
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600" htmlFor="report-email">
                  Votre email
                </label>
                <Input
                  id="report-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="vous@exemple.com"
                  className="h-10"
                />
              </div>
            ) : null}
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          {done ? (
            <Button type="button" onClick={() => onOpenChange(false)}>
              Fermer
            </Button>
          ) : (
            <>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
                Annuler
              </Button>
              <Button
                type="button"
                className="bg-slate-900 text-white hover:bg-slate-800"
                disabled={pending || message.trim().length < 10}
                onClick={submit}
              >
                {pending ? "Envoi…" : "Envoyer"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type TriggerProps = {
  target: Target;
  className?: string;
  variant?: "text" | "button";
  label?: string;
};

/** Bouton + modale signalement (annonce ou prestataire). */
export function ReportTrigger({ target, className, variant = "text", label }: TriggerProps) {
  const [open, setOpen] = useState(false);
  const text = label ?? (target.type === "listing" ? "Signaler cette annonce" : "Signaler ce prestataire");

  return (
    <>
      {variant === "button" ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={className}
          onClick={() => setOpen(true)}
        >
          <Flag className="mr-1.5 h-3.5 w-3.5" aria-hidden />
          {text}
        </Button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={
            className ??
            "text-left text-[13px] font-medium text-slate-500 underline-offset-2 hover:text-slate-800 hover:underline"
          }
        >
          {text}
        </button>
      )}
      <ReportModal
        open={open}
        onOpenChange={setOpen}
        target={target}
        triggerLabel={target.label}
      />
    </>
  );
}
