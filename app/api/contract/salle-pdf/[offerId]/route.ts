import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const PATH_PREFIX = "salles";

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
      .select("id, salle_id, owner_id, seeker_id, status")
      .eq("id", offerId)
      .single();

    if (!offer) {
      return NextResponse.json({ error: "Offre introuvable" }, { status: 404 });
    }

    const o = offer as { salle_id: string; owner_id: string; seeker_id: string; status: string };
    if (o.owner_id !== user.id && o.seeker_id !== user.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    if (o.status !== "pending" && o.seeker_id === user.id) {
      return NextResponse.json({ error: "Offre déjà traitée" }, { status: 400 });
    }

    const path = `${PATH_PREFIX}/${o.salle_id}/modele.pdf`;
    const { data: fileData, error: downloadError } = await adminSupabase.storage
      .from("contrats")
      .download(path);

    if (downloadError || !fileData) {
      return NextResponse.json({ error: "Contrat non disponible" }, { status: 404 });
    }

    const buffer = Buffer.from(await fileData.arrayBuffer());
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": "inline; filename=contrat.pdf",
      },
    });
  } catch (error) {
    console.error("Contract salle PDF error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
