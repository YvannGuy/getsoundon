import Image from "next/image";
import Link from "next/link";
import { AddSalleButton } from "@/components/proprietaire/add-salle-modal";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { AlertTriangle, CheckCircle, Clock, Crown, FolderOpen, Gift, Inbox, Lock, Star } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { getOwnerBrowseAccess } from "@/lib/pass-utils";

const STATUT_SALLE_LABEL: Record<string, string> = {
  approved: "Active",
  pending: "En validation",
  rejected: "Refusée",
};

const STATUT_SALLE_COLOR: Record<string, string> = {
  approved: "text-emerald-600",
  pending: "text-amber-600",
  rejected: "text-red-600",
};

const STATUT_DEMANDE_LABEL: Record<string, string> = {
  sent: "Nouvelle",
  viewed: "Vue",
  replied: "Répondue",
  accepted: "Acceptée",
  rejected: "Refusée",
};

const STATUT_DEMANDE_COLOR: Record<string, string> = {
  sent: "text-emerald-600",
  viewed: "text-black",
  replied: "text-black",
  accepted: "text-emerald-600",
  rejected: "text-red-600",
};

export default async function ProprietaireDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: sallesData }, browse] = await Promise.all([
    supabase
      .from("salles")
      .select("id, slug, name, city, images, status")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false }),
    getOwnerBrowseAccess(user.id),
  ]);

  const salles = sallesData ?? [];

  const now = new Date();
  const passExpiryInfo =
    browse.activePass && browse.activePass.product_type !== "abonnement"
      ? (() => {
          const created = new Date(browse.activePass.created_at);
          const durationHours = browse.activePass.product_type === "pass_48h" ? 48 : 24;
          const expiresAt = new Date(created.getTime() + durationHours * 60 * 60 * 1000);
          const remainingMs = expiresAt.getTime() - now.getTime();
          const remainingHours = remainingMs / (1000 * 60 * 60);
          const threshold = browse.activePass.product_type === "pass_48h" ? 6 : 4;
          const isExpiringSoon = remainingHours > 0 && remainingHours < threshold;
          const formatRemaining = () => {
            if (remainingHours < 1) {
              const mins = Math.floor((remainingMs / (1000 * 60)) % 60);
              return `${mins} min`;
            }
            const h = Math.floor(remainingHours);
            const m = Math.floor((remainingHours - h) * 60);
            return m > 0 ? `${h}h ${m}min` : `${h}h`;
          };
          return { isExpiringSoon, remainingText: formatRemaining() };
        })()
      : null;
  const salleIds = salles.map((s) => s.id);

  const { data: demandesData } =
    salleIds.length > 0
      ? await supabase
          .from("demandes")
          .select("id, seeker_id, salle_id, type_evenement, date_debut, status, created_at")
          .in("salle_id", salleIds)
          .order("created_at", { ascending: false })
          .limit(20)
      : { data: [] };

  const demandes = demandesData ?? [];

  const seekerIds = [...new Set(demandes.map((d) => d.seeker_id).filter(Boolean))];
  const { data: profiles } =
    seekerIds.length > 0
      ? await supabase.from("profiles").select("id, full_name, email").in("id", seekerIds)
      : { data: [] };
  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
  const salleMap = new Map(salles.map((s) => [s.id, s]));

  const demandesAvecProfil = demandes
    .map((d) => ({
      ...d,
      seeker: d.seeker_id ? profileMap.get(d.seeker_id) : undefined,
      salle: salleMap.get(d.salle_id),
    }))
    .slice(0, 10);

  const annoncesActives = salles.filter((s) => s.status === "approved").length;
  const enValidation = salles.filter((s) => s.status === "pending").length;
  const demandesRecues = demandes.length;
  const repondues = demandes.filter(
    (d) => d.status === "replied" || d.status === "accepted" || d.status === "rejected"
  ).length;
  const tauxReponse = demandesRecues > 0 ? Math.round((repondues / demandesRecues) * 100) : 0;

  const metrics = [
    { label: "Demandes reçues", value: String(demandesRecues), icon: FolderOpen, color: "text-black", bgColor: "bg-[#213398]/10" },
    { label: "Annonces actives", value: String(annoncesActives), icon: CheckCircle, color: "text-emerald-600", bgColor: "bg-emerald-100" },
    { label: "En validation", value: String(enValidation), icon: Clock, color: "text-amber-600", bgColor: "bg-amber-100" },
    { label: "Taux de réponse", value: `${tauxReponse}%`, icon: Star, color: "text-sky-500", bgColor: "bg-[#213398]/10" },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-black">Propriétaire · Tableau de bord</h1>
        <p className="mt-1 text-slate-500">Gérez vos annonces et vos demandes</p>
      </div>

      {passExpiryInfo?.isExpiringSoon && browse.activePass && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/80 p-4">
          <AlertTriangle className="h-6 w-6 shrink-0 text-amber-600" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-amber-800">Votre Pass expire bientôt</p>
            <p className="mt-1 text-sm text-amber-700">
              Il vous reste environ <span className="font-medium">{passExpiryInfo.remainingText}</span> avant l&apos;expiration.
              Prolongez pour continuer à consulter les annonces des autres propriétaires.
            </p>
            <Link href="/proprietaire/paiement" className="mt-3 inline-block">
              <Button size="sm" className="bg-amber-600 hover:bg-amber-700">
                Prolonger maintenant
              </Button>
            </Link>
          </div>
        </div>
      )}

      {browse.allowed ? (
        <div className="mb-6">
          {browse.hasPaidPass && browse.activePass ? (
            <Card className="overflow-hidden border-0 bg-gradient-to-br from-[#213398] to-[#1a2980] shadow-md">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/20">
                    <Crown className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-white">
                      {browse.activePass.product_type === "pass_48h" ? "Pass 48h" : browse.activePass.product_type === "abonnement" ? "Abonnement" : "Pass 24h"} actif
                    </p>
                    <p className="text-sm text-white/80">
                      {passExpiryInfo
                        ? `Expire dans ${passExpiryInfo.remainingText}`
                        : browse.activePass.product_type === "abonnement"
                          ? "Accès illimité"
                          : "Consultez les annonces des autres propriétaires"}
                    </p>
                  </div>
                </div>
                <Link href="/proprietaire/paiement">
                  <Button className="mt-4 flex items-center gap-2 bg-white text-black hover:bg-white/90">
                    <Lock className="h-4 w-4" />
                    Prolonger mon accès
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <Card className="overflow-hidden border-0 border-emerald-200 bg-emerald-50/80 shadow-sm">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-200">
                    <Gift className="h-6 w-6 text-emerald-700" />
                  </div>
                  <div>
                    <p className="font-semibold text-emerald-800">Essai actif</p>
                    <p className="text-sm text-emerald-700">
                      {browse.freeTotal - browse.freeUsed} consultation{browse.freeTotal - browse.freeUsed > 1 ? "s" : ""} restante
                      {browse.freeTotal - browse.freeUsed > 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
                <Link href="/proprietaire/paiement">
                  <Button variant="outline" size="sm" className="mt-4 border-emerald-300 text-emerald-800 hover:bg-emerald-100">
                    Voir Mon accès
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        <Card className="mb-6 overflow-hidden border-0 border-slate-200 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100">
                <Crown className="h-6 w-6 text-slate-500" />
              </div>
              <div>
                <p className="font-semibold text-black">Aucun accès aux autres annonces</p>
                <p className="text-sm text-slate-500">
                  Activez votre essai ou un Pass pour consulter les annonces des autres propriétaires
                </p>
              </div>
              <Link href="/proprietaire/paiement" className="ml-auto">
                <Button className="bg-[#213398] hover:bg-[#1a2980]">
                  Voir les offres
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((m) => {
          const Icon = m.icon;
          return (
            <Card key={m.label} className="border-0 shadow-sm">
              <CardContent className="flex items-center gap-4 p-5">
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${m.bgColor}`}>
                  <Icon className={`h-6 w-6 ${m.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-black">{m.value}</p>
                  <p className="text-sm text-slate-500">{m.label}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="mt-6 border-0 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg">Mes annonces</CardTitle>
          <Link href="/proprietaire/annonces" className="text-sm font-medium text-black hover:underline">
            Voir tout →
          </Link>
        </CardHeader>
        <CardContent>
          {salles.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 py-12 text-center">
              <Inbox className="mb-3 h-12 w-12 text-slate-300" />
              <p className="text-slate-500">Aucune annonce pour le moment</p>
              <AddSalleButton size="sm" className="mt-3 bg-[#213398] hover:bg-[#1a2980]">
                Créer une annonce
              </AddSalleButton>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-3">
              {salles.slice(0, 6).map((s) => (
                <div
                  key={s.id}
                  className="overflow-hidden rounded-xl border border-slate-200 bg-white"
                >
                  <div className="relative h-40">
                    <Image
                      src={Array.isArray(s.images) && s.images[0] ? String(s.images[0]) : "/img.png"}
                      alt=""
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="p-4">
                    <p className="font-semibold text-black">{s.name}</p>
                    <p className="text-sm text-slate-500">{s.city}</p>
                    <span className={`mt-2 inline-block text-sm font-medium ${STATUT_SALLE_COLOR[s.status] ?? "text-slate-600"}`}>
                      • {STATUT_SALLE_LABEL[s.status] ?? s.status}
                    </span>
                    <div className="mt-3 flex gap-2">
                      <Link href={`/salles/${s.slug}`}>
                        <Button variant="outline" size="sm" className="flex-1 border-slate-300">
                          Voir
                        </Button>
                      </Link>
                      <Link href={`/proprietaire/annonces?edit=${s.id}`}>
                        <Button size="sm" className="flex-1 bg-[#213398] hover:bg-[#1a2980]">
                          Modifier
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6 border-0 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg">Demandes récentes</CardTitle>
          <Link href="/proprietaire/demandes" className="text-sm font-medium text-black hover:underline">
            Voir tout →
          </Link>
        </CardHeader>
        <CardContent>
          {demandesAvecProfil.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 py-12 text-center">
              <Inbox className="mb-3 h-12 w-12 text-slate-300" />
              <p className="text-slate-500">Aucune demande pour le moment</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    <th className="pb-3 pr-4">Organisateur</th>
                    <th className="pb-3 pr-4">Type d&apos;événement</th>
                    <th className="pb-3 pr-4">Date</th>
                    <th className="pb-3 pr-4">Statut</th>
                    <th className="pb-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {demandesAvecProfil.map((d) => (
                    <tr key={d.id} className="group">
                      <td className="py-4 pr-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-200 text-sm font-medium text-slate-600">
                            {(d.seeker?.full_name ?? d.seeker?.email ?? "?").charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-black">{d.seeker?.full_name ?? "—"}</p>
                            <p className="text-sm text-slate-500">{d.seeker?.email ?? "—"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 pr-4 text-sm text-slate-600">{d.type_evenement ?? "—"}</td>
                      <td className="py-4 pr-4 text-sm text-slate-600">
                        {d.date_debut ? format(new Date(d.date_debut), "d MMMM yyyy", { locale: fr }) : "—"}
                      </td>
                      <td className="py-4 pr-4">
                        <span className={`text-sm font-medium ${STATUT_DEMANDE_COLOR[d.status] ?? "text-slate-600"}`}>
                          • {STATUT_DEMANDE_LABEL[d.status] ?? d.status}
                        </span>
                      </td>
                      <td className="py-4">
                        <Link
                          href={`/proprietaire/demandes?id=${d.id}`}
                          className="text-sm font-medium text-black hover:underline"
                        >
                          Voir la demande
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
