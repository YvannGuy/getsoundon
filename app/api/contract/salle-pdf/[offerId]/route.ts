import { NextResponse } from "next/server";

import { generateContractPdf } from "@/lib/contract-pdf";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

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
    const { data: offer } = await adminSupabase
      .from("offers")
      .select("id, salle_id, owner_id, seeker_id, status, amount_cents, event_type, date_debut, date_fin")
      .eq("id", offerId)
      .single();

    if (!offer) {
      return NextResponse.json({ error: "Offre introuvable" }, { status: 404 });
    }

    const o = offer as {
      id: string;
      salle_id: string;
      owner_id: string;
      seeker_id: string;
      status: string;
      amount_cents: number;
      event_type?: string | null;
      date_debut?: string | null;
      date_fin?: string | null;
    };
    if (o.owner_id !== user.id && o.seeker_id !== user.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    if (o.status !== "pending" && o.seeker_id === user.id) {
      return NextResponse.json({ error: "Offre déjà traitée" }, { status: 400 });
    }

    const [{ data: salle }, { data: template }, { data: profiles }] = await Promise.all([
      adminSupabase.from("salles").select("name, city").eq("id", o.salle_id).single(),
      adminSupabase
        .from("contract_templates")
        .select("raison_sociale, adresse, code_postal, ville, siret, conditions_particulieres")
        .eq("salle_id", o.salle_id)
        .maybeSingle(),
      adminSupabase.from("profiles").select("id, full_name, email").in("id", [o.owner_id, o.seeker_id]),
    ]);

    const ownerProfile = (profiles ?? []).find((p) => (p as { id: string }).id === o.owner_id) as {
      full_name?: string | null;
      email?: string | null;
    } | undefined;
    const seekerProfile = (profiles ?? []).find((p) => (p as { id: string }).id === o.seeker_id) as {
      full_name?: string | null;
      email?: string | null;
    } | undefined;

    const contractPdf = await generateContractPdf({
      offerId: o.id,
      amountEur: (o.amount_cents / 100).toFixed(2),
      dateDebut: o.date_debut ? new Date(o.date_debut).toLocaleDateString("fr-FR") : null,
      dateFin: o.date_fin ? new Date(o.date_fin).toLocaleDateString("fr-FR") : null,
      eventType: o.event_type ?? null,
      salleName: (salle as { name?: string } | null)?.name ?? "Salle",
      salleCity: (salle as { city?: string } | null)?.city ?? "",
      ownerName: ownerProfile?.full_name ?? "Propriétaire",
      ownerEmail: ownerProfile?.email ?? "",
      seekerName: seekerProfile?.full_name ?? "Locataire",
      seekerEmail: seekerProfile?.email ?? "",
      paidAt: new Date().toLocaleDateString("fr-FR"),
      template: template
        ? {
            raisonSociale: (template as { raison_sociale?: string | null }).raison_sociale,
            adresse: (template as { adresse?: string | null }).adresse,
            codePostal: (template as { code_postal?: string | null }).code_postal,
            ville: (template as { ville?: string | null }).ville,
            siret: (template as { siret?: string | null }).siret,
            conditionsParticulieres: (template as { conditions_particulieres?: string | null })
              .conditions_particulieres,
          }
        : undefined,
    });
    const buffer = Buffer.from(contractPdf);
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename=contrat-offre-${offerId}.pdf`,
      },
    });
  } catch (error) {
    console.error("Contract salle PDF error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
