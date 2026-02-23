"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Eye, Trash2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Props = {
  salleId: string;
  salleName: string;
  hasContract: boolean;
};

export function ContractUpload({ salleId, salleName, hasContract }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setUploading(true);

    try {
      const formData = new FormData();
      formData.set("salleId", salleId);
      formData.set("file", file);

      const res = await fetch("/api/contract/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleDelete = async () => {
    if (!confirm("Supprimer le contrat de cette salle ?")) return;
    setError(null);
    setDeleting(true);
    try {
      const res = await fetch(`/api/contract/salle/${salleId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur");
      setPreviewOpen(false);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      {hasContract && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg bg-emerald-50 py-3 px-4">
          <p className="flex-1 text-sm text-emerald-700">
            ✓ Contrat enregistré — visible par l&apos;organisateur avant paiement
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPreviewOpen(true)}
              className="gap-1.5 border-emerald-200 bg-white hover:bg-emerald-50"
            >
              <Eye className="h-4 w-4" />
              Prévisualiser
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDelete}
              disabled={deleting}
              className="gap-1.5 border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
            >
              <Trash2 className="h-4 w-4" />
              {deleting ? "Suppression..." : "Supprimer"}
            </Button>
          </div>
        </div>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,application/pdf"
          onChange={handleFileChange}
          className="hidden"
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="gap-2"
        >
          <Upload className="h-4 w-4" />
          {uploading
            ? "Téléversement..."
            : hasContract
              ? "Remplacer le contrat"
              : "Télécharger votre contrat (PDF)"}
        </Button>
        <span className="text-sm text-slate-500">
          Max 2 Mo — L&apos;organisateur le consultera avant de payer
        </span>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent showClose={true} className="flex max-h-[90vh] max-w-3xl flex-col">
          <DialogHeader>
            <DialogTitle>Prévisualisation — {salleName}</DialogTitle>
          </DialogHeader>
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
            <iframe
              src={`/api/contract/salle/${salleId}`}
              title={`Contrat ${salleName}`}
              className="h-[65vh] w-full border-0"
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
