import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import {
  ArrowLeft,
  Mail,
  MapPin,
  MessageSquare,
  MoreHorizontal,
  Phone,
  Reply,
  X,
  Zap,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

export default async function DemandeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return notFound();

  const { data: demande } = await supabase
    .from("demandes")
    .select(
      "id, seeker_id, salle_id, date_debut, date_fin, nb_personnes, type_evenement, message, status, created_at, reply_message, replied_at, heure_debut_souhaitee, heure_fin_souhaitee"
    )
    .eq("id", id)
    .maybeSingle();

  if (!demande) return notFound();

  const [{ data: salle }, { data: profile }] = await Promise.all([
    supabase
      .from("salles")
      .select("id, slug, name, city, address, images")
      .eq("id", demande.salle_id)
      .eq("owner_id", user.id)
      .maybeSingle(),
    supabase
      .from("profiles")
      .select("full_name, email, phone, created_at")
      .eq("id", demande.seeker_id)
      .maybeSingle(),
  ]);

  if (!salle) return notFound();

  const salleIds = (
    await supabase.from("salles").select("id").eq("owner_id", user.id)
  ).data?.map((s) => s.id) ?? [];

  const { data: allDemandes } =
    salleIds.length > 0
      ? await supabase
          .from("demandes")
          .select("id, status, created_at, replied_at")
          .in("salle_id", salleIds)
      : { data: [] };

  const all = allDemandes ?? [];
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const repliedLast30 = all.filter(
    (d) =>
      d.replied_at &&
      new Date(d.replied_at) >= thirtyDaysAgo &&
      ["replied", "accepted", "rejected"].includes(d.status)
  );
  const avgResponseMs =
    repliedLast30.length > 0
      ? repliedLast30.reduce((acc, d) => {
          const created = new Date(d.created_at).getTime();
          const replied = d.replied_at ? new Date(d.replied_at).getTime() : created;
          return acc + (replied - created);
        }, 0) / repliedLast30.length
      : 0;
  const avgResponseHours = Math.round(avgResponseMs / (1000 * 60 * 60));
  const acceptedCount = all.filter((d) => d.status === "accepted").length;
  const tauxAcceptation =
    all.filter((d) => ["accepted", "rejected"].includes(d.status)).length > 0
      ? Math.round(
          (acceptedCount /
            all.filter((d) => ["accepted", "rejected"].includes(d.status)).length) *
            100
        )
      : 0;

  const STATUT_LABEL: Record<string, string> = {
    sent: "Nouvelle",
    viewed: "En attente",
    replied: "Répondue",
    accepted: "Acceptée",
    rejected: "Refusée",
  };

  const formatTime = (t: string | null) => {
    if (!t) return "";
    const m = String(t).match(/(\d{1,2}):(\d{2})/);
    return m ? `${m[1]}h${m[2]}` : "";
  };

  const hDebut = formatTime(demande.heure_debut_souhaitee ?? null);
  const hFin = formatTime(demande.heure_fin_souhaitee ?? null);
  const dateStr = demande.date_debut
    ? format(new Date(demande.date_debut), "d MMMM yyyy", { locale: fr })
    : "";
  const horairesStr = hDebut && hFin ? `${hDebut} - ${hFin}` : hDebut || "";
  const dateHoraires = [dateStr, horairesStr].filter(Boolean).join(" • ");
  const receivedAgo = formatDistanceToNow(new Date(demande.created_at), {
    addSuffix: false,
    locale: fr,
  });
  const membreDepuis = profile?.created_at
    ? format(new Date(profile.created_at), "yyyy")
    : null;

  const salleImage = Array.isArray(salle.images) && salle.images[0]
    ? String(salle.images[0])
    : "/img.png";

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <Link
        href="/proprietaire/demandes"
        className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-black"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour aux demandes
      </Link>

      {/* Carte résumé (demandeur, type, date, statut) */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-slate-200 text-lg font-semibold text-slate-600">
            {(profile?.full_name ?? profile?.email ?? "?").charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-lg font-bold text-black">
              {profile?.full_name ?? "Organisateur"}
            </h1>
            <p className="text-sm text-slate-600">
              • {demande.type_evenement ?? "Événement"} • {dateStr}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
              demande.status === "sent"
                ? "bg-emerald-100 text-emerald-700"
                : demande.status === "viewed"
                  ? "bg-amber-100 text-amber-700"
                  : demande.status === "rejected"
                    ? "bg-red-100 text-red-700"
                    : "bg-[#213398]/10 text-black"
            }`}
          >
            {STATUT_LABEL[demande.status] ?? demande.status}
          </span>
          <span className="text-sm text-slate-500">Reçue il y a {receivedAgo}</span>
        </div>
      </div>

      {/* Bannière réactivité */}
      {!["replied", "accepted", "rejected"].includes(demande.status) && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-[#213398]/30 bg-[#213398]/5 px-4 py-3">
          <Zap className="h-5 w-5 text-black" />
          <p className="text-sm font-medium text-[#1a2980]">
            Répondre rapidement augmente vos chances de réservation
          </p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        {/* Colonne gauche : détails + organisateur */}
        <div className="space-y-6">
          {/* Détails de l'événement */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-base font-bold text-black">
              Détails de l&apos;événement
            </h2>
            <dl className="space-y-4">
              <div>
                <dt className="text-xs font-medium uppercase text-slate-500">
                  Date et horaires
                </dt>
                <dd className="mt-1 text-black">{dateHoraires || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase text-slate-500">
                  Nombre de participants
                </dt>
                <dd className="mt-1 text-black">
                  {demande.nb_personnes ?? "—"} personnes
                </dd>
              </div>
              {demande.message && (
                <div>
                  <dt className="flex items-center gap-1.5 text-xs font-medium uppercase text-slate-500">
                    <MessageSquare className="h-4 w-4" />
                    Message de l&apos;organisateur
                  </dt>
                  <dd className="mt-2 rounded-lg bg-slate-50 p-4 text-sm text-slate-700">
                    {demande.message}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {/* Organisateur */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-base font-bold text-black">Organisateur</h2>
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-200 text-base font-semibold text-slate-600">
                {(profile?.full_name ?? profile?.email ?? "?").charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-black">
                  {profile?.full_name ?? "—"}
                </p>
                {membreDepuis && (
                  <p className="text-sm text-slate-500">
                    Membre depuis {membreDepuis}
                  </p>
                )}
                <div className="mt-3 space-y-2">
                  {profile?.email && (
                    <p className="flex items-center gap-2 text-sm text-slate-600">
                      <Mail className="h-4 w-4 text-slate-400" />
                      {profile.email}
                    </p>
                  )}
                  {(profile as { phone?: string })?.phone && (
                    <p className="flex items-center gap-2 text-sm text-slate-600">
                      <Phone className="h-4 w-4 text-slate-400" />
                      {(profile as { phone?: string }).phone}
                    </p>
                  )}
                  <p className="flex items-center gap-2 text-sm text-slate-600">
                    <MapPin className="h-4 w-4 text-slate-400" />
                    —
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Colonne droite : salle + actions + performances */}
        <div className="space-y-6">
          {/* Salle */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="relative aspect-[16/10]">
              <Image
                src={salleImage}
                alt={salle.name}
                fill
                className="object-cover"
                sizes="380px"
              />
            </div>
            <div className="p-4">
              <h3 className="font-semibold text-black">{salle.name}</h3>
              <p className="text-sm text-slate-500">{salle.city}</p>
              <Link href={`/salles/${salle.slug}`} className="mt-3 block">
                <Button variant="outline" size="sm" className="w-full">
                  Voir mon annonce
                </Button>
              </Link>
            </div>
          </div>

          {/* Actions */}
          {!["replied", "accepted", "rejected"].includes(demande.status) && (
            <div className="space-y-2">
              <Button
                className="w-full bg-[#213398] hover:bg-[#1a2980]"
                size="lg"
              >
                <Reply className="mr-2 h-4 w-4" />
                Répondre à la demande
              </Button>
              <Button
                variant="outline"
                className="w-full border-red-200 text-red-700 hover:bg-red-50"
              >
                <X className="mr-2 h-4 w-4" />
                Refuser
              </Button>
              <Button variant="outline" className="w-full">
                <MoreHorizontal className="mr-2 h-4 w-4" />
                Plus d&apos;actions
              </Button>
            </div>
          )}

          {demande.reply_message && (
            <div className="rounded-xl border border-sky-100 bg-sky-50 p-4">
              <p className="text-xs font-medium uppercase text-black">
                Votre réponse
              </p>
              <p className="mt-2 text-sm text-slate-700">{demande.reply_message}</p>
              {demande.replied_at && (
                <p className="mt-1 text-xs text-slate-500">
                  {format(new Date(demande.replied_at), "d MMM yyyy à HH:mm", {
                    locale: fr,
                  })}
                </p>
              )}
            </div>
          )}

          {/* Vos performances */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-bold text-black">Vos performances</h3>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-slate-500">Temps de réponse</p>
                <p className="text-lg font-semibold text-black">
                  {avgResponseHours >= 24
                    ? `${Math.round(avgResponseHours / 24)}j`
                    : `${avgResponseHours}h`}{" "}
                  en moyenne
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Taux d&apos;acceptation</p>
                <p className="text-lg font-semibold text-black">{tauxAcceptation}%</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
