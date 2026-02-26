import Image from "next/image";
import Link from "next/link";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { CheckCircle2, FileText, Heart, Inbox, MessageCircle } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SearchModalButton } from "@/components/search/search-modal";
import { WelcomeOnboardingBanner } from "@/components/dashboard/welcome-onboarding-banner";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const STATUT_LABEL: Record<string, string> = {
  sent: "Envoyée",
  viewed: "En attente",
  replied: "Répondue",
  accepted: "Acceptée",
  rejected: "Refusée",
  pending: "En attente",
  refused: "Refusée",
  reschedule_proposed: "Reprogrammation proposée",
};

const STATUT_COLOR: Record<string, string> = {
  sent: "text-emerald-600",
  viewed: "text-amber-600",
  replied: "text-black",
  accepted: "text-emerald-600",
  rejected: "text-red-600",
  pending: "text-amber-600",
  refused: "text-red-600",
  reschedule_proposed: "text-sky-600",
};

function formatTime(t: string | null): string {
  if (!t) return "";
  const m = String(t).match(/(\d{1,2}):(\d{2})/);
  return m ? `${m[1]}h${m[2]}` : "";
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const admin = createAdminClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const seekerId = user.id;
  const since30Iso = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: seekerProfile } = await supabase
    .from("profiles")
    .select("first_name, full_name")
    .eq("id", seekerId)
    .maybeSingle();
  const seekerFirstName =
    (seekerProfile as { first_name?: string | null } | null)?.first_name ??
    ((seekerProfile as { full_name?: string | null } | null)?.full_name
      ?.trim()
      .split(/\s+/)
      .filter(Boolean)[0] ?? null);

  let demandesVisiteList: { id: string; salle_id: string; date_visite: string; heure_debut: string; heure_fin: string; status: string; created_at: string }[] = [];
  let visitesEnvoyees30 = 0;
  let visitesRepondues30 = 0;
  let visitesAcceptees30 = 0;
  try {
    const [res, res30] = await Promise.all([
      supabase
        .from("demandes_visite")
        .select("id, salle_id, date_visite, heure_debut, heure_fin, status, created_at")
        .eq("seeker_id", seekerId)
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("demandes_visite")
        .select("id, status")
        .eq("seeker_id", seekerId)
        .gte("created_at", since30Iso),
    ]);
    demandesVisiteList = res.data ?? [];
    const visits30 = (res30.data ?? []) as { id: string; status: string }[];
    visitesEnvoyees30 = visits30.length;
    visitesRepondues30 = visits30.filter((v) =>
      ["accepted", "refused", "reschedule_proposed"].includes(v.status)
    ).length;
    visitesAcceptees30 = visits30.filter((v) => v.status === "accepted").length;
  } catch {
    // Table peut ne pas exister
  }
  const tauxReponseVisites30 =
    visitesEnvoyees30 > 0 ? Math.round((visitesRepondues30 / visitesEnvoyees30) * 100) : 0;
  const { count: reservationsConfirmees30Count } = await admin
    .from("offers")
    .select("id", { count: "exact", head: true })
    .eq("seeker_id", seekerId)
    .eq("status", "paid")
    .gte("created_at", since30Iso);
  const reservationsConfirmees30 = reservationsConfirmees30Count ?? 0;

  const [{ data: demandesList }, { data: favorisList }] = await Promise.all([
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
  ]);

  const salleIdsDemandes = [...new Set((demandesList ?? []).map((d) => d.salle_id).filter(Boolean))];
  const salleIdsVisites = [...new Set(demandesVisiteList.map((d) => d.salle_id).filter(Boolean))];
  const salleIdsFavoris = (favorisList ?? []).map((r) => r.salle_id);

  const [sallesDemandes, sallesVisites, sallesFavoris, convsData] = await Promise.all([
    salleIdsDemandes.length > 0
      ? supabase.from("salles").select("id, name, city, images").in("id", salleIdsDemandes)
      : { data: [] },
    salleIdsVisites.length > 0
      ? supabase.from("salles").select("id, name, city, images").in("id", salleIdsVisites)
      : { data: [] },
    salleIdsFavoris.length > 0
      ? supabase.from("salles").select("id, slug, name, city, images").in("id", salleIdsFavoris)
      : { data: [] },
    salleIdsDemandes.length > 0
      ? supabase
          .from("conversations")
          .select("id, demande_id, last_message_at, last_message_preview")
          .in("demande_id", (demandesList ?? []).map((d) => d.id))
      : { data: [] },
  ]);

  const salleMapDemandes = new Map((sallesDemandes.data ?? []).map((s) => [s.id, s]));
  const salleMapVisites = new Map((sallesVisites.data ?? []).map((s) => [s.id, s]));
  const salleMapFavoris = new Map((sallesFavoris.data ?? []).map((s) => [s.id, s]));
  const convByDemande = new Map((convsData.data ?? []).map((c) => [c.demande_id, c]));

  const now = new Date();
  const overviewCards = [
    { label: "Demandes de visite envoyées (30j)", value: String(visitesEnvoyees30), icon: FileText, color: "text-black", bgColor: "bg-[#213398]/10" },
    { label: "Demandes avec réponse (30j)", value: `${tauxReponseVisites30}%`, icon: MessageCircle, color: "text-emerald-600", bgColor: "bg-emerald-100" },
    { label: "Visites acceptées (30j)", value: String(visitesAcceptees30), icon: CheckCircle2, color: "text-sky-600", bgColor: "bg-sky-100" },
    { label: "Réservations confirmées (30j)", value: String(reservationsConfirmees30), icon: Heart, color: "text-amber-500", bgColor: "bg-amber-100" },
  ];

  const recentVisitRequests = demandesVisiteList.map((d) => {
    const salle = d.salle_id ? salleMapVisites.get(d.salle_id) : undefined;
    const img = salle && Array.isArray(salle.images) && salle.images[0] ? salle.images[0] : "/img.png";
    const dateStr = d.date_visite
      ? format(new Date(d.date_visite + "T12:00:00"), "d MMMM yyyy", { locale: fr })
      : "";
    const horaires =
      d.heure_debut && d.heure_fin
        ? `${formatTime(d.heure_debut)}–${formatTime(d.heure_fin)}`
        : "";
    return {
      id: d.id,
      salle: salle?.name ?? "Salle",
      location: salle?.city ?? "",
      date: horaires ? `${dateStr}, ${horaires}` : dateStr,
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
        <h1 className="text-2xl font-bold text-black">Loueur · Tableau de bord</h1>
        <p className="mt-1 text-slate-500">Suivez vos recherches et demandes</p>
      </div>

      <WelcomeOnboardingBanner
        userId={user.id}
        dashboard="seeker"
        firstName={seekerFirstName}
        videoUrl={
          process.env.NEXT_PUBLIC_ONBOARDING_VIDEO_URL?.trim() ||
          "https://www.youtube.com/watch?v=ysz5S6PUM-U"
        }
        tourUrl={process.env.NEXT_PUBLIC_ONBOARDING_TOUR_SEEKER_URL ?? "/centre-aide/organisateur"}
      />

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

      <Card className="mt-6 border-0 shadow-sm">
        <CardHeader className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-0 pb-2">
          <CardTitle className="text-lg">Mes demandes de visites récentes</CardTitle>
          <Link href="/dashboard/demandes" className="text-sm font-medium text-black hover:underline">
            Voir tout →
          </Link>
        </CardHeader>
        <CardContent>
          {recentVisitRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 py-12 text-center">
              <Inbox className="mb-3 h-12 w-12 text-slate-300" />
              <p className="text-slate-500">Aucune demande de visite</p>
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
                    <th className="pb-3 pr-3 sm:pr-4">Date</th>
                    <th className="pb-3 pr-3 sm:pr-4">Statut</th>
                    <th className="pb-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentVisitRequests.map((req) => (
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
                      <td className="py-3 pr-3 text-sm text-slate-600 sm:py-4 sm:pr-4">{req.date}</td>
                      <td className="py-3 pr-3 sm:py-4 sm:pr-4">
                        <span className={`text-sm font-medium ${req.statusColor}`}>• {req.status}</span>
                      </td>
                      <td className="py-3 sm:py-4">
                        <Link
                          href={`/dashboard/demandes/visite/${req.id}`}
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
