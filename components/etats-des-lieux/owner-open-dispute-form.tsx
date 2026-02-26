"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, FileWarning } from "lucide-react";

import { openUserDisputeCaseAction } from "@/app/actions/etats-des-lieux";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function OwnerOpenDisputeForm({ offerId }: { offerId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [reason, setReason] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  return (
    <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50/40 p-3">
      <p className="text-sm font-semibold text-amber-900">Ouvrir un litige</p>
      <textarea
        rows={4}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        className="w-full rounded-md border border-amber-300 px-3 py-2 text-sm"
        placeholder="Exemple: casse constatée après l'événement, zones concernées, impact."
      />
      <Input
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
      />
      <p className="text-xs text-slate-600">{files.length} photo(s) sélectionnée(s)</p>

      {error && (
        <p className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      )}
      {success && (
        <p className="flex items-start gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {success}
        </p>
      )}

      <div className="flex justify-end">
        <Button
          type="button"
          disabled={pending}
          onClick={() => {
            setError(null);
            setSuccess(null);
            startTransition(async () => {
              const formData = new FormData();
              formData.append("offerId", offerId);
              formData.append("reason", reason.trim());
              for (const file of files) formData.append("photos", file);
              const res = await openUserDisputeCaseAction(formData);
              if (!res.success) {
                setError(res.error ?? "Impossible d'ouvrir le litige.");
                return;
              }
              setSuccess("Litige ouvert et transmis à l'administration.");
              setReason("");
              setFiles([]);
              router.refresh();
            });
          }}
        >
          <FileWarning className="mr-2 h-4 w-4" />
          {pending ? "Envoi..." : "Envoyer le litige"}
        </Button>
      </div>
    </div>
  );
}
