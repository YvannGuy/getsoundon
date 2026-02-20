import Image from "next/image";
import Link from "next/link";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { CheckCircle2, Crown, FileText, Heart, Inbox, Lock, MessageCircle } from "lucide-react";


import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SearchModalButton } from "@/components/search/search-modal";
import { createClient } from "@/lib/supabase/server";

const STATUT_LABEL: Record<string, string> = {
  sent: "Envoyée",
  viewed: "En attente",
  replied: "Répondue",
  accepted: "Acceptée",
  rejected: "Refusée",
};

const STATUT_COLOR: Record<string, string> = {
  sent: "text-emerald-600",
  viewed: "text-amber-600",
  replied: "text-black",
  accepted: "text-emerald-600",
  rejected: "text-red-600",
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const seekerId = user.id;

  const [
    { count: demandesCount },
    { count: favorisCount },
    { data: demandesList },
    { data: favorisList },
    { data: payments },
  ] = await Promise.all([
    supabase.from("demandes").select("id", { count: "exact", head: true }).eq("seeker_id", seekerId),
    supabase.from("favoris").select("id", { count: "exact", head: true }).eq("user_id", seekerId),
    supabase
      .from("demandes")
      .select("id, salle_id, date_debut, type_evenement, status, created_at")
      .eq("seeker_id", seekerId)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("favoris")
      .select("salle_id")
      .eq("user_id", seekerId),
    supabase
      .from("payments")
      .select("product_type, status, amount, created_at")
      .eq("user_id", seekerId)
      .eq("status", "paid")
      .in("product_type", ["pass_24h", "pass_48h", "abonnement"])
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const totalDemandes = demandesCount ?? 0;
  const totalFavoris = favorisCount ?? 0;

  const salleIdsDemandes = [...new Set((demandesList ?? []).map((d) => d.salle_id).filter(Boolean))];
  const salleIdsFavoris = (favorisList ?? []).map((r) => r.salle_id);

  const [sallesDemandes, sallesFavoris, convsData] = await Promise.all([
    salleIdsDemandes.length > 0
      ? supabase.from("salles").select("id, name, city, images").in("id", salleIdsDemandes)
      : { data: [] },
    salleIdsFavoris.length > 0
      ? supabase.from("salles").select("id, slug, name, city, images").in("id", salleIdsFavoris)
      : { data: [] },
    salleIdsDemandes.length > 0
      ? supabase
          .from("conversations")
          .select("demande_id, last_message_at, last_message_preview")
          .in("demande_id", (demandesList ?? []).map((d) => d.id))
      : { data: [] },
  ]);

  const salleMapDemandes = new Map((sallesDemandes.data ?? []).map((s) => [s.id, s]));
  const salleMapFavoris = new Map((sallesFavoris.data ?? []).map((s) => [s.id, s]));
  const convByDemande = new Map((convsData.data ?? []).map((c) => [c.demande_id, c]));

  const demandesReplied = totalDemandes > 0
    ? await supabase
        .from("demandes")
        .select("id", { count: "exact", head: true })
        .eq("seeker_id", seekerId)
        .in("status", ["replied", "accepted"])
    : { count: 0 };
  const totalReplied = demandesReplied.count ?? 0;

  const convIds = (convsData.data ?? []).map((c) => c.demande_id);
  const convsCount = convIds.length;

  const now = new Date();
  const activePass = (payments ?? []).find((p) => {
    const created = new Date(p.created_at);
    const hoursAgo = (now.getTime() - created.getTime()) / (1000 * 60 * 60);
    if (p.product_type === "abonnement") return true;
    if (p.product_type === "pass_24h") return hoursAgo < 24;
    if (p.product_type === "pass_48h") return hoursAgo < 48;
    return false;
  });

  const overviewCards = [
    { label: "Demandes envoyées", value: String(totalDemandes), icon: FileText, color: "text-black", bgColor: "bg-[#213398]/10" },
    { label: "Conversations actives", value: String(convsCount), icon: MessageCircle, color: "text-emerald-600", bgColor: "bg-emerald-100" },
    { label: "Salles favorites", value: String(totalFavoris), icon: Heart, color: "text-amber-500", bgColor: "bg-amber-100" },
    { label: "Réponses reçues", value: String(totalReplied), icon: CheckCircle2, color: "text-black", bgColor: "bg-[#213398]/10" },
  ];

  const recentRequests = (demandesList ?? []).map((d) => {
    const salle = d.salle_id ? salleMapDemandes.get(d.salle_id) : undefined;
    const img = salle && Array.isArray(salle.images) && salle.images[0] ? salle.images[0] : "/img.png";
    return {
      id: d.id,
      salle: salle?.name ?? "Salle",
      location: salle?.city ?? "",
      type: d.type_evenement ?? "Événement",
      date: d.date_debut ? format(new Date(d.date_debut), "d MMMM yyyy", { locale: fr }) : "",
      status: STATUT_LABEL[d.status] ?? d.status,
      statusColor: STATUT_COLOR[d.status] ?? "text-slate-600",
      image: img,
    };
  });

  const recentConversations = (demandesList ?? [])
    .filter((d) => convByDemande.has(d.id))
    .slice(0, 4)
    .map((d) => {
      const salle = d.salle_id ? salleMapDemandes.get(d.salle_id) : undefined;
      const conv = convByDemande.get(d.id);
      const lastAt = conv?.last_message_at;
      const timeAgo = lastAt
        ? (() => {
            const diff = now.getTime() - new Date(lastAt).getTime();
            const h = Math.floor(diff / (1000 * 60 * 60));
            if (h < 1) return "À l'instant";
            if (h < 24) return `Il y a ${h}h`;
            const d = Math.floor(h / 24);
            if (d === 1) return "Hier";
            if (d < 7) return `Il y a ${d}j`;
            return `Il y a ${Math.floor(d / 7)} sem`;
          })()
        : "";
      return {
        id: d.id,
        name: "Propriétaire",
        venue: salle?.name ?? "Salle",
        time: timeAgo,
        preview: conv?.last_message_preview ?? "Aucun message",
        isNew: false,
      };
    });

  const recentFavorites = (favorisList ?? [])
    .slice(0, 4)
    .map((f) => {
      const salle = salleMapFavoris.get(f.salle_id) as { id?: string; name?: string; city?: string; images?: unknown[]; slug?: string } | undefined;
      const rawImg = salle?.images && Array.isArray(salle.images) && salle.images[0];
      const img = typeof rawImg === "string" ? rawImg : "/img.png";
      return {
        name: salle?.name ?? "Salle",
        location: salle?.city ?? "",
        image: img,
        slug: salle?.slug ?? salle?.id ?? "",
      };
    });

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-black">Tableau de bord</h1>
        <p className="mt-1 text-slate-500">Suivez vos recherches et demandes</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {overviewCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label} className="border-0 shadow-sm">
              <CardContent className="flex items-center gap-4 p-5">
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${card.bgColor}`}>
                  <Icon className={`h-6 w-6 ${card.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-black">{card.value}</p>
                  <p className="text-sm text-slate-500">{card.label}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {activePass ? (
            <Card className="overflow-hidden border-0 bg-gradient-to-br from-[#213398] to-[#1a2980] shadow-md">
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/20">
                      <Crown className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-white">
                        {activePass.product_type === "pass_48h" ? "Pass 48h" : "Pass 24h"} actif
                      </p>
                      <p className="text-sm text-white/80">
                        {activePass.product_type === "pass_48h"
                          ? "Valide 48h"
                          : "Expire dans moins de 24h"}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-white/90 sm:max-w-[200px] sm:text-right">
                    Les Pass permettent d&apos;envoyer des demandes illimitées
                  </p>
                </div>
                <Link href="/dashboard/paiement">
                  <Button className="mt-4 flex items-center gap-2 bg-white text-black hover:bg-white/90">
                    <Lock className="h-4 w-4" />
                    Prolonger mon accès
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <Card className="overflow-hidden border-0 border-slate-200 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100">
                    <Crown className="h-6 w-6 text-slate-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-black">Aucun Pass actif</p>
                    <p className="text-sm text-slate-500">
                      Acquérez un Pass pour envoyer des demandes illimitées aux propriétaires
                    </p>
                  </div>
                  <Link href="/dashboard/paiement" className="ml-auto">
                    <Button className="bg-[#213398] hover:bg-[#1a2980]">
                      Voir les offres
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="border-0 shadow-sm">
            <CardHeader className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-0 pb-2">
              <CardTitle className="text-lg">Paiement & accès</CardTitle>
              <Link href="/dashboard/paiement" className="text-sm font-medium text-black hover:underline">
                Voir tout
              </Link>
            </CardHeader>
            <CardContent>
              {(payments ?? []).length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 py-8 text-center">
                  <Inbox className="mb-2 h-10 w-10 text-slate-300" />
                  <p className="text-sm text-slate-500">Aucun paiement pour le moment</p>
                  <Link href="/dashboard/paiement">
                    <Button variant="outline" size="sm" className="mt-3">
                      Découvrir les offres
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {(payments ?? []).slice(0, 3).map((p) => (
                    <div
                      key={p.created_at + p.product_type}
                      className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-4"
                    >
                      <div>
                        <p className="font-medium text-black">
                          {p.product_type === "pass_24h" ? "Pass 24h" : p.product_type === "pass_48h" ? "Pass 48h" : "Abonnement"}
                        </p>
                        <p className="text-sm text-slate-500">
                          {format(new Date(p.created_at), "d MMM yyyy", { locale: fr })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-black">{(p.amount / 100).toFixed(2)}€</p>
                        <p className="text-sm text-emerald-600">Payé</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {activePass && (
          <Card className="h-fit border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Mon Pass</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-xl bg-gradient-to-br from-[#213398]/10 to-[#1a2980]/10 p-4">
                <div className="flex items-center gap-3">
                  <Crown className="h-8 w-8 text-black" />
                  <div>
                    <p className="font-semibold text-black">
                      {activePass.product_type === "pass_48h" ? "Pass 48h" : "Pass 24h"} actif
                    </p>
                    <p className="text-sm text-slate-500">En cours</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Card className="mt-6 border-0 shadow-sm">
        <CardHeader className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-0 pb-2">
          <CardTitle className="text-lg">Demandes récentes</CardTitle>
          <Link href="/dashboard/demandes" className="text-sm font-medium text-black hover:underline">
            Voir tout →
          </Link>
        </CardHeader>
        <CardContent>
          {recentRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 py-12 text-center">
              <Inbox className="mb-3 h-12 w-12 text-slate-300" />
              <p className="text-slate-500">Aucune demande envoyée</p>
              <SearchModalButton className="mt-3 inline-flex">
                <Button className="bg-[#213398] hover:bg-[#1a2980]">
                  Rechercher une salle
                </Button>
              </SearchModalButton>
            </div>
          ) : (
            <div className="-mx-4 overflow-x-auto sm:mx-0">
              <table className="w-full min-w-[560px]">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    <th className="pb-3 pr-3 sm:pr-4">Salle</th>
                    <th className="pb-3 pr-3 sm:pr-4">Type</th>
                    <th className="pb-3 pr-3 sm:pr-4">Date</th>
                    <th className="pb-3 pr-3 sm:pr-4">Statut</th>
                    <th className="pb-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentRequests.map((req) => (
                    <tr key={req.id} className="group">
                      <td className="py-3 pr-3 sm:py-4 sm:pr-4">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                            <Image src={req.image} alt="" fill className="object-cover" />
                          </div>
                          <div>
                            <p className="font-medium text-black">{req.salle}</p>
                            <p className="text-sm text-slate-500">{req.location}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 pr-3 text-sm text-slate-600 sm:py-4 sm:pr-4">{req.type}</td>
                      <td className="py-3 pr-3 text-sm text-slate-600 sm:py-4 sm:pr-4">{req.date}</td>
                      <td className="py-3 pr-3 sm:py-4 sm:pr-4">
                        <span className={`text-sm font-medium ${req.statusColor}`}>• {req.status}</span>
                      </td>
                      <td className="py-3 sm:py-4">
                        <Link
                          href={`/dashboard/demandes`}
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

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-0 pb-2">
            <CardTitle className="text-lg">Conversations</CardTitle>
            <Link href="/dashboard/messagerie" className="text-sm font-medium text-black hover:underline">
              Ouvrir la messagerie →
            </Link>
          </CardHeader>
          <CardContent>
            {recentConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 py-8 text-center">
                <MessageCircle className="mb-2 h-10 w-10 text-slate-300" />
                <p className="text-sm text-slate-500">Aucune conversation</p>
                <p className="mt-1 text-xs text-slate-400">
                  Les échanges apparaissent ici une fois les demandes envoyées
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentConversations.map((conv) => (
                  <Link
                    key={conv.id}
                    href="/dashboard/messagerie"
                    className="flex items-start gap-3 rounded-lg p-3 hover:bg-slate-50"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-600">
                      {conv.name.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium text-black">{conv.name}</p>
                        <span className="text-xs text-slate-400">{conv.time}</span>
                      </div>
                      <p className="text-xs text-slate-500">{conv.venue}</p>
                      <p className="mt-1 truncate text-sm text-slate-600">{conv.preview}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-0 pb-2">
            <CardTitle className="text-lg">Favoris</CardTitle>
            <Link href="/dashboard/favoris" className="text-sm font-medium text-black hover:underline">
              Voir mes favoris →
            </Link>
          </CardHeader>
          <CardContent>
            {recentFavorites.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 py-8 text-center">
                <Heart className="mb-2 h-10 w-10 text-slate-300" />
                <p className="text-sm text-slate-500">Aucune salle sauvegardée</p>
                <SearchModalButton>
                  <Button variant="outline" size="sm" className="mt-3">
                    Rechercher une salle
                  </Button>
                </SearchModalButton>
              </div>
            ) : (
              <div className="flex gap-4 overflow-x-auto pb-2">
                {recentFavorites.map((fav, i) => (
                  <Link
                    key={fav.name + i}
                    href={`/salles/${fav.slug}`}
                    className="relative h-32 w-44 shrink-0 overflow-hidden rounded-xl border border-slate-200"
                  >
                    <Image src={fav.image} alt="" fill className="object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <p className="font-medium text-white">{fav.name}</p>
                      <p className="text-xs text-white/80">{fav.location}</p>
                    </div>
                    <div className="absolute right-2 top-2">
                      <Heart className="h-5 w-5 fill-rose-500 text-rose-500" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
