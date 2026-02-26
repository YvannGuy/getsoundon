"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { openAdminRefundCaseAction } from "@/app/actions/etats-des-lieux";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Transaction = {
  id: string;
  user_id: string;
  user_name: string | null;
  user_email: string;
  offer_id: string | null;
  product_type: string;
  amount: number;
  status: string;
  reference: string | null;
  created_at: string;
};

type Props = {
  transaction: Transaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function formatProduct(type: string) {
  switch (type) {
    case "reservation":
      return "Réservation";
    case "pass_24h":
      return "Pass 24h";
    case "pass_48h":
      return "Pass 48h";
    case "abonnement":
      return "Abonnement";
    default:
      return type;
  }
}

function formatStatus(status: string) {
  switch (status) {
    case "paid":
      return "Payé";
    case "active":
      return "Actif";
    case "canceled":
      return "Annulé";
    case "pending":
      return "En attente";
    case "failed":
      return "Échoué";
    case "refunded":
      return "Remboursé";
    default:
      return status;
  }
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function PaymentDetailModal({ transaction, open, onOpenChange }: Props) {
  const [isPending, startTransition] = useTransition();
  const [caseType, setCaseType] = useState<"refund_full" | "refund_partial" | "dispute">("refund_full");
  const [side, setSide] = useState<"owner" | "seeker" | "none">("none");
  const [reason, setReason] = useState("");
  const [amountEur, setAmountEur] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);

  if (!transaction) return null;

  const canOpenCase = transaction.product_type === "reservation" && !!transaction.offer_id;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-[calc(100vw-1rem)] max-w-[760px] max-h-[90vh] overflow-y-auto p-4 sm:p-6"
        showClose
      >
        <DialogHeader>
          <DialogTitle>Détail de la transaction</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <p className="text-sm font-medium text-slate-500">Utilisateur</p>
              <p className="font-medium text-black">{transaction.user_name || "—"}</p>
              <p className="text-sm text-slate-600 break-all">{transaction.user_email}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Produit</p>
              <p className="text-black">{formatProduct(transaction.product_type)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Montant</p>
              <p className="text-lg font-semibold text-black">
                {(transaction.amount / 100).toFixed(2)} €
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Statut</p>
              <p className="text-black">{formatStatus(transaction.status)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Date</p>
              <p className="text-black">{formatDate(transaction.created_at)}</p>
            </div>
          </div>
          {transaction.reference && (
            <div>
              <p className="text-sm font-medium text-slate-500">Référence</p>
              <p className="font-mono text-xs text-slate-700 break-all">
                {transaction.reference}
              </p>
            </div>
          )}
          <div className="pt-4 border-t space-y-2">
            <Link
              href={`/admin/utilisateurs?userId=${transaction.user_id}`}
              className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline"
            >
              <ArrowLeft className="h-4 w-4" />
              Voir le profil utilisateur
            </Link>
          </div>

          <div className="pt-4 border-t space-y-3">
            <p className="text-sm font-semibold text-black">Actions admin remboursement / litige</p>
            {!canOpenCase ? (
              <p className="text-xs text-slate-500">
                Disponible uniquement pour une réservation liée à une offre.
              </p>
            ) : (
              <form
                className="space-y-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  const form = e.currentTarget;
                  const fd = new FormData(form);
                  fd.set("paymentId", transaction.id);
                  fd.set("offerId", transaction.offer_id ?? "");
                  fd.set("caseType", caseType);
                  fd.set("side", side);
                  fd.set("reason", reason);
                  if (caseType === "refund_partial") fd.set("amountEur", amountEur);
                  setFeedback(null);
                  startTransition(async () => {
                    const res = await openAdminRefundCaseAction(fd);
                    if (!res.success) {
                      setFeedback(res.error ?? "Erreur lors de la création du dossier.");
                      return;
                    }
                    setFeedback("Dossier traité avec succès.");
                    setReason("");
                    setAmountEur("");
                    form.reset();
                  });
                }}
              >
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Type</label>
                  <select
                    value={caseType}
                    onChange={(e) =>
                      setCaseType(e.target.value as "refund_full" | "refund_partial" | "dispute")
                    }
                    className="h-9 w-full rounded border border-slate-300 px-2 text-sm"
                  >
                    <option value="refund_full">Remboursement total</option>
                    <option value="refund_partial">Remboursement partiel</option>
                    <option value="dispute">Litige</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Partie concernée</label>
                  <select
                    value={side}
                    onChange={(e) => setSide(e.target.value as "owner" | "seeker" | "none")}
                    className="h-9 w-full rounded border border-slate-300 px-2 text-sm"
                  >
                    <option value="none">Aucune (général)</option>
                    <option value="seeker">Locataire</option>
                    <option value="owner">Propriétaire</option>
                  </select>
                </div>
                {caseType === "refund_partial" && (
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">
                      Montant à rembourser (EUR)
                    </label>
                    <input
                      value={amountEur}
                      onChange={(e) => setAmountEur(e.target.value)}
                      placeholder="Ex: 45.50"
                      className="h-9 w-full rounded border border-slate-300 px-2 text-sm"
                    />
                  </div>
                )}
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Motif</label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={3}
                    required
                    placeholder="Expliquez la décision, le contexte et les preuves."
                    className="w-full rounded border border-slate-300 px-2 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">
                    Photos / preuves (obligatoire pour litige)
                  </label>
                  <input
                    type="file"
                    name="photos"
                    accept="image/*"
                    multiple
                    required={caseType === "dispute"}
                    className="block w-full text-xs"
                  />
                  <p className="mt-1 text-[11px] text-slate-500">
                    Maximum 10 photos, nettes, bien éclairées, zones clés visibles.
                  </p>
                </div>
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {isPending ? "Traitement..." : "Valider l'action admin"}
                </button>
                {feedback && (
                  <p className={`text-xs ${feedback.includes("succès") ? "text-emerald-700" : "text-red-600"}`}>
                    {feedback}
                  </p>
                )}
              </form>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
