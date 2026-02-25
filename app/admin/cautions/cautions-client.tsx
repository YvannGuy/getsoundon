"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Shield } from "lucide-react";

import { resolveDepositClaimAdminAction } from "@/app/actions/admin";
import { AdminPageHeaderClient } from "@/components/admin/page-header-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type CautionRow = {
  id: string;
  salle_name: string;
  owner_name: string;
  seeker_name: string;
  deposit_amount_cents: number;
  hold_status: string;
  claim_amount_cents: number;
  claim_reason: string | null;
  claim_requested_at: string | null;
  resolved_at: string | null;
};

type Props = {
  pendingClaims: CautionRow[];
  resolvedClaims: CautionRow[];
  focusOfferId?: string | null;
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function CautionsClient({ pendingClaims, resolvedClaims, focusOfferId = null }: Props) {
  const router = useRouter();
  const [claimAmountById, setClaimAmountById] = useState<Record<string, string>>(
    Object.fromEntries(pendingClaims.map((c) => [c.id, (c.claim_amount_cents / 100).toFixed(2)]))
  );
  const [claimLoadingId, setClaimLoadingId] = useState<string | null>(null);

  const filteredPending = useMemo(() => {
    if (!focusOfferId) return pendingClaims;
    return pendingClaims.filter((c) => c.id === focusOfferId);
  }, [pendingClaims, focusOfferId]);

  const filteredResolved = useMemo(() => {
    if (!focusOfferId) return resolvedClaims;
    return resolvedClaims.filter((c) => c.id === focusOfferId);
  }, [resolvedClaims, focusOfferId]);

  return (
    <div className="p-4 pb-24 md:p-8 md:pb-8">
      <AdminPageHeaderClient
        title="Cautions"
        subtitle="Suivi des cautions en arbitrage et historique des décisions."
        icon={Shield}
      />

      <Card id="cautions-admin" className="mb-6 border-amber-200 bg-amber-50/40 scroll-mt-24">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-amber-900">Litiges caution à arbitrer</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredPending.length === 0 ? (
            <p className="py-4 text-sm text-slate-600">Aucune caution à traiter pour le moment.</p>
          ) : (
            <>
              <div className="space-y-3 md:hidden">
                {filteredPending.map((c) => (
                  <article key={c.id} className="rounded-xl border border-amber-200 bg-white p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-black">{c.salle_name}</p>
                        <p className="truncate text-xs text-slate-600">{c.owner_name} • {c.seeker_name}</p>
                      </div>
                      <p className="text-xs text-slate-500">{c.claim_requested_at ? formatDate(c.claim_requested_at) : "—"}</p>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-sm">
                      <span className="text-slate-600">Caution</span>
                      <span className="font-medium text-black">{(c.deposit_amount_cents / 100).toFixed(2)} €</span>
                    </div>
                    <div className="mt-2">
                      <p className="mb-1 text-xs text-slate-600">Montant demandé</p>
                      <Input
                        value={claimAmountById[c.id] ?? ""}
                        onChange={(e) => setClaimAmountById((prev) => ({ ...prev, [c.id]: e.target.value }))}
                        className="h-9 text-sm"
                      />
                    </div>
                    <p className="mt-2 text-xs text-slate-600">Motif: {c.claim_reason ?? "—"}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
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
                  </article>
                ))}
              </div>
              <div className="hidden overflow-x-auto md:block">
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
                  {filteredPending.map((c) => (
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
            </>
          )}
        </CardContent>
      </Card>

      <Card className="mb-6 border-slate-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-slate-900">Historique des cautions traitées</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredResolved.length === 0 ? (
            <p className="py-4 text-sm text-slate-600">Aucune caution traitée pour le moment.</p>
          ) : (
            <>
              <div className="space-y-3 md:hidden">
                {filteredResolved.map((c) => (
                  <article key={`resolved-${c.id}`} className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-black">{c.salle_name}</p>
                        <p className="truncate text-xs text-slate-600">{c.owner_name} • {c.seeker_name}</p>
                      </div>
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          c.hold_status === "captured" ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-700"
                        }`}
                      >
                        {c.hold_status === "captured" ? "Retenue validée" : "Retenue refusée"}
                      </span>
                    </div>
                    <div className="mt-2 space-y-1 text-sm text-slate-600">
                      <p>Demande: {c.claim_requested_at ? formatDate(c.claim_requested_at) : "—"}</p>
                      <p>Traitement: {c.resolved_at ? formatDate(c.resolved_at) : "—"}</p>
                      <p>Caution: {(c.deposit_amount_cents / 100).toFixed(2)} €</p>
                      <p>Retenue: {(c.claim_amount_cents / 100).toFixed(2)} €</p>
                      <p className="text-xs">Motif: {c.claim_reason ?? "—"}</p>
                    </div>
                  </article>
                ))}
              </div>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[760px]">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs font-medium uppercase text-slate-600">
                    <th className="px-2 py-2">Date demande</th>
                    <th className="px-2 py-2">Date traitement</th>
                    <th className="px-2 py-2">Salle</th>
                    <th className="px-2 py-2">Propriétaire</th>
                    <th className="px-2 py-2">Locataire</th>
                    <th className="px-2 py-2">Caution</th>
                    <th className="px-2 py-2">Montant retenu</th>
                    <th className="px-2 py-2">Décision</th>
                    <th className="px-2 py-2">Motif</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredResolved.map((c) => (
                    <tr key={`resolved-${c.id}`} className="border-b border-slate-100">
                      <td className="px-2 py-2 text-xs text-slate-700">
                        {c.claim_requested_at ? formatDate(c.claim_requested_at) : "—"}
                      </td>
                      <td className="px-2 py-2 text-xs text-slate-700">
                        {c.resolved_at ? formatDate(c.resolved_at) : "—"}
                      </td>
                      <td className="px-2 py-2 text-sm text-slate-700">{c.salle_name}</td>
                      <td className="px-2 py-2 text-xs text-slate-700">{c.owner_name}</td>
                      <td className="px-2 py-2 text-xs text-slate-700">{c.seeker_name}</td>
                      <td className="px-2 py-2 text-xs text-slate-700">
                        {(c.deposit_amount_cents / 100).toFixed(2)} €
                      </td>
                      <td className="px-2 py-2 text-xs text-slate-700">
                        {(c.claim_amount_cents / 100).toFixed(2)} €
                      </td>
                      <td className="px-2 py-2">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            c.hold_status === "captured"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-emerald-100 text-emerald-700"
                          }`}
                        >
                          {c.hold_status === "captured" ? "Retenue validée" : "Retenue refusée"}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-xs text-slate-700">{c.claim_reason ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
