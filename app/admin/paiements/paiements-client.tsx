"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
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

import { AdminFilterBar } from "@/components/admin/filter-bar";
import { AdminKpiCard } from "@/components/admin/kpi-card";
import { AdminPageHeaderClient } from "@/components/admin/page-header-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PaymentDetailModal } from "./payment-detail-modal";

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
  transactions: Transaction[];
  stats: {
    revenue30: number;
    reservationPaid30: number;
    reservationPending30: number;
    refunded30: number;
    failed7: number;
    successRate30: number;
    successCount30: number;
    attempts30: number;
  };
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

function getProductBadgeClass(type: string) {
  switch (type) {
    case "reservation":
      return "bg-emerald-100 text-emerald-700";
    case "pass_24h":
      return "bg-blue-100 text-blue-700";
    case "pass_48h":
      return "bg-violet-100 text-violet-700";
    case "abonnement":
      return "bg-amber-100 text-amber-700";
    default:
      return "bg-slate-100 text-slate-700";
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

export function PaiementsClient({ transactions, stats }: Props) {
  const [search, setSearch] = useState("");
  const [productFilter, setProductFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [periodFilter, setPeriodFilter] = useState("30");
  const [viewTransaction, setViewTransaction] = useState<Transaction | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

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
      label: "Payés",
      count: filtered.filter((t) => t.status === "paid" || t.status === "active").length,
      color: "bg-emerald-500",
      gradient: "#10b981",
    },
    {
      label: "En attente",
      count: filtered.filter((t) => t.status === "pending").length,
      color: "bg-amber-500",
      gradient: "#f59e0b",
    },
    {
      label: "Remboursés",
      count: filtered.filter((t) => t.status === "refunded").length,
      color: "bg-slate-500",
      gradient: "#64748b",
    },
    {
      label: "Échoués",
      count: filtered.filter((t) => t.status === "failed").length,
      color: "bg-red-500",
      gradient: "#ef4444",
    },
  ];
  const pieTotal = pieData.reduce((s, p) => s + p.count, 0);
  const productOptions = useMemo(() => {
    const unique = [...new Set(transactions.map((t) => t.product_type).filter(Boolean))];
    return unique.sort((a, b) => a.localeCompare(b));
  }, [transactions]);

  return (
    <div className="min-w-0 overflow-x-hidden">
      <AdminPageHeaderClient
        title="Paiements"
        subtitle="Suivez et analysez les transactions de la plateforme"
        icon={CreditCard}
      />

      {stats.failed7 > 0 && (
        <div className="mb-6 flex flex-col items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2 text-red-800">
            <AlertCircle className="h-5 w-5" />
            <span className="font-medium">Paiements échoués (7j)</span>
            <span className="text-red-700">
              {stats.failed7} transaction{stats.failed7 > 1 ? "s" : ""} ont échoué cette
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

      <AdminFilterBar>
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
              {productOptions.map((productType) => (
                <option key={productType} value={productType}>
                  {formatProduct(productType)}
                </option>
              ))}
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
      </AdminFilterBar>

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <AdminKpiCard
          title="Revenu (30j)"
          value={`€${(stats.revenue30 / 100).toLocaleString("fr-FR")}`}
          subtitle="Réservations payées/actives"
        />
        <AdminKpiCard title="Réservations payées" value={stats.reservationPaid30} subtitle="Sur 30 jours" />
        <AdminKpiCard title="En attente" value={stats.reservationPending30} subtitle="Sur 30 jours" />
        <AdminKpiCard title="Remboursés" value={stats.refunded30} subtitle="Sur 30 jours" />
        <AdminKpiCard title="Échoués" value={stats.failed7} subtitle="Fenêtre 7 jours" />
        <AdminKpiCard
          title="Taux succès (30j)"
          value={`${stats.successRate30.toFixed(1)}%`}
          subtitle={`${stats.successCount30} / ${stats.attempts30} tentatives`}
        />
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
            <CardTitle className="text-base">Répartition des statuts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <div
                className="h-24 w-24 flex-shrink-0 rounded-full"
                style={{
                  background: `conic-gradient(
                    ${pieData[0].gradient} 0deg ${pieTotal > 0 ? (pieData[0].count / pieTotal) * 360 : 0}deg,
                    ${pieData[1].gradient} ${pieTotal > 0 ? (pieData[0].count / pieTotal) * 360 : 0}deg ${pieTotal > 0 ? ((pieData[0].count + pieData[1].count) / pieTotal) * 360 : 0}deg,
                    ${pieData[2].gradient} ${pieTotal > 0 ? ((pieData[0].count + pieData[1].count) / pieTotal) * 360 : 0}deg ${pieTotal > 0 ? ((pieData[0].count + pieData[1].count + pieData[2].count) / pieTotal) * 360 : 0}deg,
                    ${pieData[3].gradient} ${pieTotal > 0 ? ((pieData[0].count + pieData[1].count + pieData[2].count) / pieTotal) * 360 : 0}deg 360deg
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

      <Card className="min-w-0">
        <CardContent className="p-0">
          <div className="border-b border-slate-200 px-4 py-3">
            <h3 className="font-semibold text-black">Transactions récentes</h3>
          </div>
          <div className="space-y-3 p-4 pb-24 md:hidden md:pb-4">
            {filtered.slice(0, 20).map((t) => {
              const statusInfo = formatStatus(t.status);
              const StatusIcon = statusInfo.icon;
              return (
                <article key={t.id} className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex min-w-0 items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-black">{t.user_name || "—"}</p>
                      <p className="truncate text-xs text-slate-500">{t.user_email}</p>
                    </div>
                    <span className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${statusInfo.className}`}>
                      <StatusIcon className="h-3.5 w-3.5" />
                      {statusInfo.label}
                    </span>
                  </div>
                  <div className="mt-2 flex min-w-0 items-center justify-between gap-2">
                    <span
                      className={`shrink-0 inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${getProductBadgeClass(
                        t.product_type
                      )}`}
                    >
                      {formatProduct(t.product_type)}
                    </span>
                    <p className="shrink-0 text-sm font-semibold text-black">{(t.amount / 100).toFixed(2)} €</p>
                  </div>
                  <p className="mt-1 min-w-0 truncate text-xs text-slate-500" title={t.reference ?? undefined}>
                    {formatDate(t.created_at)} • {t.reference || "—"}
                  </p>
                  <div className="mt-3 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setViewTransaction(t);
                        setModalOpen(true);
                      }}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded text-slate-500 hover:bg-slate-100 hover:text-blue-600"
                      title="Voir détails"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <Link
                      href={`/admin/utilisateurs?userId=${t.user_id}`}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                      title="Voir le profil utilisateur"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
          <div className="hidden overflow-x-auto md:block">
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
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${getProductBadgeClass(
                            t.product_type
                          )}`}
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
                            className="flex h-9 w-9 items-center justify-center rounded text-slate-500 hover:bg-slate-100 hover:text-blue-600"
                            title="Voir détails"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <Link
                            href={`/admin/utilisateurs?userId=${t.user_id}`}
                            className="flex h-9 w-9 items-center justify-center rounded text-slate-500 hover:bg-slate-100 hover:text-slate-700"
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
