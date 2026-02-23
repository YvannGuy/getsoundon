import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const EVENT_TYPE_LABEL: Record<string, string> = {
  ponctuel: "Ponctuel",
  mensuel: "Mensuel",
};

export type ContractPreviewData = {
  offerId: string;
  amountEur: string;
  dateDebut: string | null;
  dateFin: string | null;
  eventType: string | null;
  salleName: string;
  salleCity: string;
  ownerName: string;
  ownerEmail: string;
  seekerName: string;
  seekerEmail: string;
  template?: {
    raisonSociale?: string | null;
    adresse?: string | null;
    codePostal?: string | null;
    ville?: string | null;
    siret?: string | null;
    conditionsParticulieres?: string | null;
  };
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ offerId: string }> }
) {
  try {
    const { offerId } = await params;
    if (!offerId) {
      return NextResponse.json({ error: "Offre invalide" }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const adminSupabase = createAdminClient();
    const { data: offer, error: offerError } = await adminSupabase
      .from("offers")
      .select("id, salle_id, owner_id, seeker_id, amount_cents, event_type, date_debut, date_fin, status")
      .eq("id", offerId)
      .single();

    if (offerError || !offer) {
      return NextResponse.json({ error: "Offre introuvable" }, { status: 404 });
    }

    const o = offer as {
      seeker_id: string;
      owner_id: string;
      salle_id: string;
      amount_cents: number;
      event_type?: string | null;
      date_debut?: string | null;
      date_fin?: string | null;
      status: string;
    };

    if (o.seeker_id !== user.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    if (o.status !== "pending") {
      return NextResponse.json({ error: "Offre déjà traitée" }, { status: 400 });
    }

    const [{ data: salle }, { data: templates }, { data: profiles }] = await Promise.all([
      adminSupabase.from("salles").select("name, city").eq("id", o.salle_id).single(),
      adminSupabase.from("contract_templates").select("raison_sociale, adresse, code_postal, ville, siret, conditions_particulieres").eq("salle_id", o.salle_id).maybeSingle(),
      adminSupabase.from("profiles").select("id, full_name, email").in("id", [o.owner_id, o.seeker_id]),
    ]);

    const ownerProfile = (profiles ?? []).find((p) => (p as { id: string }).id === o.owner_id) as { full_name?: string | null; email?: string | null } | undefined;
    const seekerProfile = (profiles ?? []).find((p) => (p as { id: string }).id === o.seeker_id) as { full_name?: string | null; email?: string | null } | undefined;
    const template = templates as {
      raison_sociale?: string | null;
      adresse?: string | null;
      code_postal?: string | null;
      ville?: string | null;
      siret?: string | null;
      conditions_particulieres?: string | null;
    } | null;

    const data: ContractPreviewData = {
      offerId,
      amountEur: (o.amount_cents / 100).toFixed(2),
      dateDebut: o.date_debut ? new Date(o.date_debut).toLocaleDateString("fr-FR") : null,
      dateFin: o.date_fin ? new Date(o.date_fin).toLocaleDateString("fr-FR") : null,
      eventType: o.event_type ?? null,
      salleName: (salle as { name?: string })?.name ?? "Salle",
      salleCity: (salle as { city?: string })?.city ?? "",
      ownerName: ownerProfile?.full_name ?? "Propriétaire",
      ownerEmail: ownerProfile?.email ?? "",
      seekerName: seekerProfile?.full_name ?? "Organisateur",
      seekerEmail: seekerProfile?.email ?? "",
      template: template
        ? {
            raisonSociale: template.raison_sociale,
            adresse: template.adresse,
            codePostal: template.code_postal,
            ville: template.ville,
            siret: template.siret,
            conditionsParticulieres: template.conditions_particulieres,
          }
        : undefined,
    };

    return NextResponse.json(data);
  } catch (error) {
    console.error("Contract preview error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
