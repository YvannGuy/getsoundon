import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { ArrowLeft, Mail, MessageSquare, MessageSquareText, Phone } from "lucide-react";

import { createAdminClient } from "@/lib/supabase/admin";

const TYPE_EVENEMENT_LABEL: Record<string, string> = {
  "culte-regulier": "Culte régulier",
  conference: "Conférence",
  celebration: "Célébration",
  bapteme: "Baptême",
  retraite: "Retraite",
};

const STATUT_LABEL: Record<string, string> = {
  sent: "Nouvelle",
  viewed: "En attente",
  replied: "Répondue",
  accepted: "Acceptée",
  rejected: "Refusée",
};

function formatTime(t: string | null): string {
  if (!t) return "";
  const m = String(t).match(/(\d{1,2}):(\d{2})/);
  return m ? `${m[1]}h${m[2]}` : "";
}

export default async function AdminDemandeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const admin = createAdminClient();

  const { data: demande } = await admin
    .from("demandes")
    .select(
      "id, seeker_id, salle_id, date_debut, date_fin, nb_personnes, type_evenement, message, status, created_at, reply_message, replied_at, heure_debut_souhaitee, heure_fin_souhaitee"
    )
    .eq("id", id)
    .maybeSingle();

  if (!demande) return notFound();

  const [{ data: salle }, { data: seekerProfile }] = await Promise.all([
    admin
      .from("salles")
      .select("id, slug, name, city, address, images, owner_id")
      .eq("id", demande.salle_id)
      .maybeSingle(),
    admin
      .from("profiles")
      .select("full_name, email, phone, created_at")
      .eq("id", demande.seeker_id)
      .maybeSingle(),
  ]);

  if (!salle) return notFound();

  const { data: ownerProfile } = await admin
    .from("profiles")
    .select("full_name, email")
    .eq("id", salle.owner_id)
    .maybeSingle();

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
  const membreDepuis = seekerProfile?.created_at
    ? format(new Date(seekerProfile.created_at), "yyyy")
    : null;

  const salleImage = Array.isArray(salle.images) && salle.images[0]
    ? String(salle.images[0])
    : "/img.png";

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <Link
        href="/admin/demandes"
        className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-black"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour aux demandes
      </Link>

      {/* Carte résumé */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-slate-200 text-lg font-semibold text-slate-600">
            {(seekerProfile?.full_name ?? seekerProfile?.email ?? "?").charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-lg font-bold text-black">
              {seekerProfile?.full_name ?? "Organisateur"}
            </h1>
            <p className="text-sm text-slate-600">
              • {TYPE_EVENEMENT_LABEL[demande.type_evenement ?? ""] ?? demande.type_evenement ?? "Événement"} • {dateStr}
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
                  : demande.status === "accepted"
                    ? "bg-green-100 text-green-700"
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

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        {/* Colonne gauche : détails + organisateur */}
        <div className="space-y-6">
          {/* Détails de l'événement */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-base font-bold text-black">Détails de l&apos;événement</h2>
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

          {/* Organisateur (seeker) */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-base font-bold text-black">Organisateur</h2>
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-200 text-base font-semibold text-slate-600">
                {(seekerProfile?.full_name ?? seekerProfile?.email ?? "?").charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-black">
                  {seekerProfile?.full_name ?? "—"}
                </p>
                {membreDepuis && (
                  <p className="text-sm text-slate-500">
                    Membre depuis {membreDepuis}
                  </p>
                )}
                <div className="mt-3 space-y-2">
                  {seekerProfile?.email && (
                    <p className="flex items-center gap-2 text-sm text-slate-600">
                      <Mail className="h-4 w-4 text-slate-400" />
                      {seekerProfile.email}
                    </p>
                  )}
                  {(seekerProfile as { phone?: string })?.phone && (
                    <p className="flex items-center gap-2 text-sm text-slate-600">
                      <Phone className="h-4 w-4 text-slate-400" />
                      {(seekerProfile as { phone?: string }).phone}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Colonne droite : salle + propriétaire + réponse */}
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
            </div>
          </div>

          {/* Propriétaire */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-bold text-black">Propriétaire</h3>
            <div className="mt-2">
              <p className="font-medium text-black">
                {ownerProfile?.full_name ?? "—"}
              </p>
              {ownerProfile?.email && (
                <p className="flex items-center gap-2 text-sm text-slate-600">
                  <Mail className="h-4 w-4 text-slate-400" />
                  {ownerProfile.email}
                </p>
              )}
            </div>
          </div>

          {/* Réponse du propriétaire */}
          {demande.reply_message && (
            <div className="rounded-xl border border-sky-100 bg-sky-50 p-4">
              <p className="flex items-center gap-1.5 text-xs font-medium uppercase text-black">
                <MessageSquareText className="h-4 w-4" />
                Réponse du propriétaire
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
        </div>
      </div>
    </div>
  );
}
