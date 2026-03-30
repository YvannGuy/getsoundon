import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ArrowLeft, Calendar, Clock, MapPin } from "lucide-react";

import { ContactVisiteSeekerButton } from "@/components/demandes/contact-visite-seeker-button";
import { ReprogrammationVisiteActions } from "@/components/demandes/reprogrammation-visite-actions";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

const STATUT_LABEL: Record<string, string> = {
  pending: "En attente",
  accepted: "Acceptée",
  refused: "Refusée",
  reschedule_proposed: "Reprogrammation proposée",
};

const TYPE_EVENEMENT_LABEL: Record<string, string> = {
  "culte-regulier": "Culte régulier",
  conference: "Conférence",
  celebration: "Célébration",
  bapteme: "Baptême",
  retraite: "Retraite",
};

const STATUT_BADGE: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  accepted: "bg-green-100 text-green-700",
  refused: "bg-red-100 text-red-700",
  reschedule_proposed: "bg-sky-100 text-sky-700",
};

function formatTime(t: string | null): string {
  if (!t) return "";
  const m = String(t).match(/(\d{1,2}):(\d{2})/);
  return m ? `${m[1]}h${m[2]}` : "";
}

export default async function DemandeVisiteDetailPage({
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
    .from("demandes_visite")
    .select(
      "id, salle_id, date_visite, heure_debut, heure_fin, type_evenement, message, status, created_at, date_proposee, heure_debut_proposee, heure_fin_proposee"
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

  const dateStr = demande.date_visite
    ? format(new Date(demande.date_visite + "T12:00:00"), "EEEE d MMMM yyyy", { locale: fr })
    : "";
  const horairesStr =
    demande.heure_debut && demande.heure_fin
      ? `${formatTime(demande.heure_debut)} – ${formatTime(demande.heure_fin)}`
      : "";
  const dateProposeeStr = demande.date_proposee
    ? format(new Date(demande.date_proposee + "T12:00:00"), "EEEE d MMMM yyyy", { locale: fr })
    : "";
  const horairesProposeesStr =
    demande.heure_debut_proposee && demande.heure_fin_proposee
      ? `${formatTime(demande.heure_debut_proposee)} – ${formatTime(demande.heure_fin_proposee)}`
      : "";
  const salleImage = Array.isArray(salle.images) && salle.images[0]
    ? String(salle.images[0])
    : "/img.png";

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <Link
        href="/dashboard/demandes"
        className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-black"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour aux visites
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
        <Link href={`/salles/${salle.slug}`}>
          <Button variant="outline" size="sm">
            Voir la salle
          </Button>
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500">
            Ma demande de visite
          </h2>
          <dl className="space-y-4">
            <div>
              <dt className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                <Calendar className="h-4 w-4" />
                Date de visite
              </dt>
              <dd className="mt-0.5 text-black">{dateStr || "—"}</dd>
            </div>
            <div>
              <dt className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                <Clock className="h-4 w-4" />
                Créneau
              </dt>
              <dd className="mt-0.5 text-black">{horairesStr || "—"}</dd>
            </div>
            {demande.type_evenement && (
              <div>
                <dt className="text-xs font-medium text-slate-500">Type d&apos;événement</dt>
                <dd className="mt-0.5 text-black">
                  {TYPE_EVENEMENT_LABEL[demande.type_evenement] ?? demande.type_evenement}
                </dd>
              </div>
            )}
            {demande.status === "reschedule_proposed" &&
              (dateProposeeStr || horairesProposeesStr) && (
                <div>
                  <dt className="text-xs font-medium text-slate-500">
                    Reprogrammation proposée par le propriétaire
                  </dt>
                  <dd className="mt-0.5 text-black">
                    {[dateProposeeStr, horairesProposeesStr].filter(Boolean).join(" • ")}
                  </dd>
                </div>
              )}
            {demande.message && (
              <div>
                <dt className="text-xs font-medium text-slate-500">Message</dt>
                <dd className="mt-0.5 whitespace-pre-wrap text-slate-700">{demande.message}</dd>
              </div>
            )}
          </dl>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500">
            Infos pratiques
          </h2>
          <dl className="space-y-4">
            {demande.status === "reschedule_proposed" &&
              (dateProposeeStr || horairesProposeesStr) && (
                <div className="rounded-lg border border-sky-200 bg-sky-50/80 p-4">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-sky-700">
                    Nouveau créneau proposé
                  </dt>
                  <dd className="mt-1 text-sm font-medium text-sky-900">
                    {[dateProposeeStr, horairesProposeesStr].filter(Boolean).join(" • ")}
                  </dd>
                  <ReprogrammationVisiteActions demandeVisiteId={demande.id} />
                </div>
              )}
            {demande.status === "accepted" && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <dt className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                  <MapPin className="h-4 w-4" />
                  Lieu de la visite
                </dt>
                <dd className="mt-1 text-sm text-slate-700">
                  L&apos;adresse précise du prestataire n&apos;est pas affichée sur GetSoundOn. Convenez du lieu avec le
                  propriétaire via la messagerie.
                </dd>
              </div>
            )}
            <div>
              <dt className="text-xs font-medium text-slate-500">Contacter le propriétaire</dt>
              <dd className="mt-2">
                <ContactVisiteSeekerButton
                  demandeVisiteId={demande.id}
                  status={demande.status}
                />
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}
