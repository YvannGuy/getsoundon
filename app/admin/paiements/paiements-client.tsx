"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Check,
  Clock,
  CreditCard,
  Eye,
  ExternalLink,
  RotateCcw,
  Search,
  XCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { resolveDepositClaimAdminAction } from "@/app/actions/admin";
import { PaymentDetailModal } from "./payment-detail-modal";

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
  transactions: Transaction[];
  stats: {
    revenue30: number;
    pass24h: number;
    pass48h: number;
    abonnements: number;
    failed: number;
    conversionRate: number;
  };
  depositClaims: {
    id: string;
    salle_name: string;
    owner_name: string;
    seeker_name: string;
    deposit_amount_cents: number;
    claim_amount_cents: number;
    claim_reason: string | null;
    claim_requested_at: string | null;
  }[];
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
      return { label: "Payé", icon: Check, className: "text-emerald-600 bg-emerald-100" };
    case "active":
      return { label: "Actif", icon: Check, className: "text-emerald-600 bg-emerald-100" };
    case "canceled":
      return { label: "Annulé", icon: RotateCcw, className: "text-slate-600 bg-slate-100" };
    case "pending":
      return { label: "En attente", icon: Clock, className: "text-amber-600 bg-amber-100" };
    case "failed":
      return { label: "Échoué", icon: XCircle, className: "text-red-600 bg-red-100" };
    case "refunded":
      return { label: "Remboursé", icon: RotateCcw, className: "text-slate-600 bg-slate-100" };
    default:
      return { label: status, icon: Clock, className: "text-slate-600 bg-slate-100" };
  }
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function PaiementsClient({ transactions, stats, depositClaims }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [productFilter, setProductFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [periodFilter, setPeriodFilter] = useState("30");
  const [viewTransaction, setViewTransaction] = useState<Transaction | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [claimAmountById, setClaimAmountById] = useState<Record<string, string>>(
    Object.fromEntries(depositClaims.map((c) => [c.id, (c.claim_amount_cents / 100).toFixed(2)]))
  );
  const [claimLoadingId, setClaimLoadingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const periodMs = parseInt(periodFilter, 10) * 24 * 60 * 60 * 1000;
    const cutoff = new Date(Date.now() - periodMs);
    return transactions.filter((t) => {
      const matchSearch =
        !search ||
        t.user_name?.toLowerCase().includes(search.toLowerCase()) ||
        t.user_email.toLowerCase().includes(search.toLowerCase());
      const matchProduct = productFilter === "all" || t.product_type === productFilter;
      const matchStatus = statusFilter === "all" || t.status === statusFilter;
      const matchPeriod = new Date(t.created_at) >= cutoff;
      return matchSearch && matchProduct && matchStatus && matchPeriod;
    });
  }, [transactions, search, productFilter, statusFilter, periodFilter]);

  const revenueData = useMemo(() => {
    const days = 30;
    const result: number[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayStart = d.toISOString().slice(0, 10);
      const total = filtered
        .filter(
          (t) =>
            t.created_at.startsWith(dayStart) && (t.status === "paid" || t.status === "active")
        )
        .reduce((s, t) => s + t.amount, 0);
      result.push(total / 100);
    }
    return result;
  }, [filtered]);

  const maxRevenue = Math.max(...revenueData, 1);
  const pieData = [
    {
      label: "Pass 24h",
      count: filtered.filter((t) => t.product_type === "pass_24h" && (t.status === "paid" || t.status === "active")).length,
      color: "bg-blue-500",
    },
    {
      label: "Pass 48h",
      count: filtered.filter((t) => t.product_type === "pass_48h" && (t.status === "paid" || t.status === "active")).length,
      color: "bg-violet-500",
    },
    {
      label: "Abonnement",
      count: filtered.filter((t) => t.product_type === "abonnement" && (t.status === "paid" || t.status === "active")).length,
      color: "bg-amber-500",
    },
  ];
  const pieTotal = pieData.reduce((s, p) => s + p.count, 0);

  return (
    <div>
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-black">
          <CreditCard className="h-7 w-7 text-slate-600" />
          Paiements
        </h1>
        <p className="mt-1 text-slate-600">
          Suivez et analysez les transactions de la plateforme
        </p>
      </div>

      {stats.failed > 0 && (
        <div className="mb-6 flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <div className="flex items-center gap-2 text-red-800">
            <AlertCircle className="h-5 w-5" />
            <span className="font-medium">Paiements échoués (7j)</span>
            <span className="text-red-700">
              {stats.failed} transaction{stats.failed > 1 ? "s" : ""} ont échoué cette
              semaine
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="border-red-200 text-red-700 hover:bg-red-100"
            onClick={() => {
              setStatusFilter("failed");
              setPeriodFilter("7");
            }}
          >
            Voir détails →
          </Button>
        </div>
      )}

      {depositClaims.length > 0 && (
        <Card className="mb-6 border-amber-200 bg-amber-50/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-amber-900">Litiges caution à arbitrer</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px]">
                <thead>
                  <tr className="border-b border-amber-200 text-left text-xs font-medium uppercase text-amber-800">
                    <th className="px-2 py-2">Date</th>
                    <th className="px-2 py-2">Salle</th>
                    <th className="px-2 py-2">Propriétaire</th>
                    <th className="px-2 py-2">Locataire</th>
                    <th className="px-2 py-2">Caution</th>
                    <th className="px-2 py-2">Montant demandé</th>
                    <th className="px-2 py-2">Motif</th>
                    <th className="px-2 py-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {depositClaims.map((c) => (
                    <tr key={c.id} className="border-b border-amber-100">
                      <td className="px-2 py-2 text-xs text-slate-700">
                        {c.claim_requested_at ? formatDate(c.claim_requested_at) : "—"}
                      </td>
                      <td className="px-2 py-2 text-sm text-slate-700">{c.salle_name}</td>
                      <td className="px-2 py-2 text-xs text-slate-700">{c.owner_name}</td>
                      <td className="px-2 py-2 text-xs text-slate-700">{c.seeker_name}</td>
                      <td className="px-2 py-2 text-xs text-slate-700">
                        {(c.deposit_amount_cents / 100).toFixed(2)} €
                      </td>
                      <td className="px-2 py-2">
                        <Input
                          value={claimAmountById[c.id] ?? ""}
                          onChange={(e) =>
                            setClaimAmountById((prev) => ({ ...prev, [c.id]: e.target.value }))
                          }
                          className="h-8 w-24 text-xs"
                        />
                      </td>
                      <td className="px-2 py-2 text-xs text-slate-700">
                        {c.claim_reason ?? "—"}
                      </td>
                      <td className="px-2 py-2">
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={claimLoadingId === c.id}
                            onClick={async () => {
                              const amount = Number((claimAmountById[c.id] ?? "0").replace(",", "."));
                              if (!Number.isFinite(amount) || amount <= 0) {
                                alert("Montant invalide");
                                return;
                              }
                              setClaimLoadingId(c.id);
                              const res = await resolveDepositClaimAdminAction({
                                offerId: c.id,
                                decision: "capture",
                                captureAmountEur: amount,
                              });
                              setClaimLoadingId(null);
                              if (!res.success) {
                                alert(res.error ?? "Erreur capture caution");
                                return;
                              }
                              router.refresh();
                            }}
                          >
                            Valider retenue
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-red-200 text-red-700 hover:bg-red-50"
                            disabled={claimLoadingId === c.id}
                            onClick={async () => {
                              setClaimLoadingId(c.id);
                              const res = await resolveDepositClaimAdminAction({
                                offerId: c.id,
                                decision: "release",
                              });
                              setClaimLoadingId(null);
                              if (!res.success) {
                                alert(res.error ?? "Erreur libération caution");
                                return;
                              }
                              router.refresh();
                            }}
                          >
                            Refuser retenue
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Utilisateur..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <select
              value={productFilter}
              onChange={(e) => setProductFilter(e.target.value)}
              className="h-10 rounded-md border border-slate-200 bg-white px-4 text-sm text-slate-700"
            >
              <option value="all">Tous les produits</option>
              <option value="pass_24h">Pass 24h</option>
              <option value="pass_48h">Pass 48h</option>
              <option value="abonnement">Abonnement</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 rounded-md border border-slate-200 bg-white px-4 text-sm text-slate-700"
            >
              <option value="all">Tous les statuts</option>
              <option value="paid">Payé</option>
              <option value="pending">En attente</option>
              <option value="failed">Échoué</option>
              <option value="refunded">Remboursé</option>
            </select>
            <select
              value={periodFilter}
              onChange={(e) => setPeriodFilter(e.target.value)}
              className="h-10 rounded-md border border-slate-200 bg-white px-4 text-sm text-slate-700"
            >
              <option value="7">7 derniers jours</option>
              <option value="30">Derniers 30 jours</option>
              <option value="90">90 jours</option>
            </select>
            <Button className="bg-blue-600 hover:bg-blue-700">Filtrer</Button>
          </div>
        </CardContent>
      </Card>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium text-slate-500">Revenu (30j)</p>
            <p className="text-xl font-bold text-black">
              €{(stats.revenue30 / 100).toLocaleString("fr-FR")}
            </p>
            <p className="text-xs text-emerald-600">+12%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium text-slate-500">Pass 24h</p>
            <p className="text-xl font-bold text-black">{stats.pass24h}</p>
            <p className="text-xs text-blue-600">+8%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium text-slate-500">Pass 48h</p>
            <p className="text-xl font-bold text-black">{stats.pass48h}</p>
            <p className="text-xs text-violet-600">+15%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium text-slate-500">Abonnements</p>
            <p className="text-xl font-bold text-black">{stats.abonnements}</p>
            <p className="text-xs text-amber-600">+5%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium text-slate-500">Échoués</p>
            <p className="text-xl font-bold text-black">{stats.failed}</p>
            <p className="text-xs text-red-600">-3%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium text-slate-500">Taux conversion</p>
            <p className="text-xl font-bold text-black">{stats.conversionRate.toFixed(1)}%</p>
            <p className="text-xs text-emerald-600">+2%</p>
          </CardContent>
        </Card>
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Revenu (30 jours)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex h-32 items-end gap-0.5">
              {revenueData.map((v, i) => (
                <div
                  key={i}
                  className="flex-1 min-w-0 rounded-t bg-blue-500/80 hover:bg-blue-500"
                  style={{ height: `${(v / maxRevenue) * 100}%`, minHeight: v > 0 ? 4 : 0 }}
                  title={`${v.toFixed(0)} €`}
                />
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Répartition des ventes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <div
                className="h-24 w-24 flex-shrink-0 rounded-full"
                style={{
                  background: `conic-gradient(
                    #3b82f6 0deg ${pieTotal > 0 ? (pieData[0].count / pieTotal) * 360 : 0}deg,
                    #8b5cf6 ${pieTotal > 0 ? (pieData[0].count / pieTotal) * 360 : 0}deg ${pieTotal > 0 ? ((pieData[0].count + pieData[1].count) / pieTotal) * 360 : 0}deg,
                    #f59e0b ${pieTotal > 0 ? ((pieData[0].count + pieData[1].count) / pieTotal) * 360 : 0}deg 360deg
                  )`,
                }}
              />
              <div className="space-y-2">
                {pieData.map((p, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className={`h-3 w-3 rounded-full ${p.color}`} />
                    <span className="text-sm text-slate-700">{p.label}</span>
                    <span className="text-sm font-medium">{p.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="border-b border-slate-200 px-4 py-3">
            <h3 className="font-semibold text-black">Transactions récentes</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase text-slate-500">
                  <th className="px-4 py-3">Utilisateur</th>
                  <th className="px-4 py-3">Produit</th>
                  <th className="px-4 py-3">Montant</th>
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Référence</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 20).map((t) => {
                  const statusInfo = formatStatus(t.status);
                  const StatusIcon = statusInfo.icon;
                  return (
                    <tr
                      key={t.id}
                      className="border-b border-slate-100 hover:bg-slate-50"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-200 text-sm font-medium text-slate-600">
                            {(t.user_name || t.user_email || "?")[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-black">
                              {t.user_name || "—"}
                            </p>
                            <p className="text-xs text-slate-500">{t.user_email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            t.product_type === "pass_24h"
                              ? "bg-blue-100 text-blue-700"
                              : t.product_type === "pass_48h"
                                ? "bg-violet-100 text-violet-700"
                                : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {formatProduct(t.product_type)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-black">
                          {(t.amount / 100).toFixed(2)} €
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${statusInfo.className}`}
                        >
                          <StatusIcon className="h-3.5 w-3.5" />
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-slate-700">{formatDate(t.created_at)}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="truncate max-w-[120px] font-mono text-xs text-slate-500">
                          {t.reference || "—"}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setViewTransaction(t);
                              setModalOpen(true);
                            }}
                            className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-blue-600"
                            title="Voir détails"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <Link
                            href={`/admin/utilisateurs?userId=${t.user_id}`}
                            className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                            title="Voir le profil utilisateur"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && (
            <div className="py-12 text-center text-slate-500">
              Aucune transaction ne correspond aux critères.
            </div>
          )}
        </CardContent>
      </Card>

      <PaymentDetailModal
        transaction={viewTransaction}
        open={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open);
          if (!open) setViewTransaction(null);
        }}
      />
    </div>
  );
}
