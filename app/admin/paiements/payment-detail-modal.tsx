"use client";

import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";

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
  if (!transaction) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" showClose>
        <DialogHeader>
          <DialogTitle>Détail de la transaction</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium text-slate-500">Utilisateur</p>
            <p className="font-medium text-black">{transaction.user_name || "—"}</p>
            <p className="text-sm text-slate-600">{transaction.user_email}</p>
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
          {transaction.reference && (
            <div>
              <p className="text-sm font-medium text-slate-500">Référence</p>
              <p className="font-mono text-xs text-slate-700 truncate">
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
