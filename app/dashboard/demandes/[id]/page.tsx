import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ArrowLeft, MapPin, MessageCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

const STATUT_LABEL: Record<string, string> = {
  sent: "Envoyée",
  viewed: "En attente",
  replied: "Répondue",
  accepted: "Acceptée",
  rejected: "Refusée",
};

const STATUT_BADGE: Record<string, string> = {
  sent: "bg-emerald-100 text-emerald-700",
  viewed: "bg-amber-100 text-amber-700",
  replied: "bg-[#213398]/10 text-black",
  accepted: "bg-[#213398]/10 text-black",
  rejected: "bg-red-100 text-red-700",
};

function formatTime(t: string | null) {
  if (!t) return "";
  const m = String(t).match(/(\d{1,2}):(\d{2})/);
  return m ? `${m[1]}h${m[2]}` : "";
}

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
      "id, salle_id, date_debut, date_fin, nb_personnes, type_evenement, message, status, created_at, reply_message, replied_at, heure_debut_souhaitee, heure_fin_souhaitee"
    )
    .eq("id", id)
    .eq("seeker_id", user.id)
    .maybeSingle();

  if (!demande) return notFound();

  const { data: salle } = await supabase
    .from("salles")
    .select("id, slug, name, city, address, images, capacity")
    .eq("id", demande.salle_id)
    .eq("status", "approved")
    .maybeSingle();

  if (!salle) return notFound();

  const { data: conv } = await supabase
    .from("conversations")
    .select("id")
    .eq("demande_id", demande.id)
    .maybeSingle();

  const hDebut = formatTime(demande.heure_debut_souhaitee ?? null);
  const hFin = formatTime(demande.heure_fin_souhaitee ?? null);
  const dateStr = demande.date_debut
    ? format(new Date(demande.date_debut), "d MMMM yyyy", { locale: fr })
    : "";
  const horairesStr = hDebut && hFin ? `${hDebut} - ${hFin}` : hDebut || "";
  const salleImage = Array.isArray(salle.images) && salle.images[0] ? String(salle.images[0]) : "/img.png";

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <Link
        href="/dashboard/demandes"
        className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-black"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour aux demandes
      </Link>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="relative h-16 w-20 overflow-hidden rounded-lg bg-slate-100">
            <Image src={salleImage} alt="" fill className="object-cover" sizes="80px" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-black">{salle.name}</h1>
            <p className="text-sm text-slate-500">
              {salle.city}
              {salle.capacity ? ` • Capacité ${salle.capacity} pers.` : ""}
            </p>
            <span
              className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                STATUT_BADGE[demande.status] ?? "bg-slate-100 text-slate-600"
              }`}
            >
              {STATUT_LABEL[demande.status] ?? demande.status}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/salles/${salle.slug}`}>
            <Button variant="outline" size="sm">
              Voir la salle
            </Button>
          </Link>
          {conv && (
            <Link href="/dashboard/messagerie">
              <Button size="sm" className="bg-[#213398] hover:bg-[#1a2980]">
                <MessageCircle className="mr-2 h-4 w-4" />
                Messagerie
              </Button>
            </Link>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500">
            Ma demande
          </h2>
          <dl className="space-y-4">
            <div>
              <dt className="text-xs font-medium text-slate-500">Type d&apos;événement</dt>
              <dd className="mt-0.5 text-black">{demande.type_evenement ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500">Date</dt>
              <dd className="mt-0.5 text-black">{dateStr || "—"}</dd>
            </div>
            {horairesStr && (
              <div>
                <dt className="text-xs font-medium text-slate-500">Horaires souhaités</dt>
                <dd className="mt-0.5 text-black">{horairesStr}</dd>
              </div>
            )}
            <div>
              <dt className="text-xs font-medium text-slate-500">Nombre de participants</dt>
              <dd className="mt-0.5 text-black">{demande.nb_personnes ?? "—"}</dd>
            </div>
            {demande.message && (
              <div>
                <dt className="text-xs font-medium text-slate-500">Message</dt>
                <dd className="mt-0.5 whitespace-pre-wrap text-slate-700">{demande.message}</dd>
              </div>
            )}
          </dl>
        </div>

        {(demande.status === "replied" || demande.status === "accepted" || demande.status === "rejected") &&
          demande.reply_message && (
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500">
                Réponse du propriétaire
              </h2>
              <p className="whitespace-pre-wrap text-slate-700">{demande.reply_message}</p>
              {demande.replied_at && (
                <p className="mt-3 text-xs text-slate-500">
                  Répondu le {format(new Date(demande.replied_at), "d MMMM yyyy à HH:mm", { locale: fr })}
                </p>
              )}
            </div>
          )}
      </div>
    </div>
  );
}
