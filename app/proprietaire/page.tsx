import Image from "next/image";
import Link from "next/link";
import { AddSalleButton } from "@/components/proprietaire/add-salle-modal";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { CheckCircle, Clock, FolderOpen, Inbox, Star } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

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
  viewed: "text-sky-600",
  replied: "text-sky-600",
  accepted: "text-emerald-600",
  rejected: "text-red-600",
};

export default async function ProprietaireDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: sallesData } = await supabase
    .from("salles")
    .select("id, slug, name, city, images, status")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  const salles = sallesData ?? [];
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
    { label: "Demandes reçues", value: String(demandesRecues), icon: FolderOpen, color: "text-[#6366f1]", bgColor: "bg-[#6366f1]/10" },
    { label: "Annonces actives", value: String(annoncesActives), icon: CheckCircle, color: "text-emerald-600", bgColor: "bg-emerald-100" },
    { label: "En validation", value: String(enValidation), icon: Clock, color: "text-amber-600", bgColor: "bg-amber-100" },
    { label: "Taux de réponse", value: `${tauxReponse}%`, icon: Star, color: "text-sky-500", bgColor: "bg-sky-100" },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Tableau de bord</h1>
        <p className="mt-1 text-slate-500">Gérez vos annonces et vos demandes</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((m) => {
          const Icon = m.icon;
          return (
            <Card key={m.label} className="border-0 shadow-sm">
              <CardContent className="flex items-center gap-4 p-5">
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${m.bgColor}`}>
                  <Icon className={`h-6 w-6 ${m.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{m.value}</p>
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
          <Link href="/proprietaire/annonces" className="text-sm font-medium text-[#6366f1] hover:underline">
            Voir tout →
          </Link>
        </CardHeader>
        <CardContent>
          {salles.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 py-12 text-center">
              <Inbox className="mb-3 h-12 w-12 text-slate-300" />
              <p className="text-slate-500">Aucune annonce pour le moment</p>
              <AddSalleButton size="sm" className="mt-3 bg-[#6366f1] hover:bg-[#4f46e5]">
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
                    <p className="font-semibold text-slate-900">{s.name}</p>
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
                        <Button size="sm" className="flex-1 bg-[#6366f1] hover:bg-[#4f46e5]">
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
          <Link href="/proprietaire/demandes" className="text-sm font-medium text-[#6366f1] hover:underline">
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
                            <p className="font-medium text-slate-900">{d.seeker?.full_name ?? "—"}</p>
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
                          className="text-sm font-medium text-[#6366f1] hover:underline"
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
