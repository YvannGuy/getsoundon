import { NextResponse } from "next/server";

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
    const { data: offer, error: offerError } = await adminSupabase
      .from("offers")
      .select("id, contract_path, owner_id, seeker_id")
      .eq("id", offerId)
      .single();

    if (offerError || !offer) {
      return NextResponse.json({ error: "Offre introuvable" }, { status: 404 });
    }

    const offerRow = offer as { owner_id: string; seeker_id: string; contract_path?: string | null };
    const isOwner = offerRow.owner_id === user.id;
    const isSeeker = offerRow.seeker_id === user.id;

    if (!isOwner && !isSeeker) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    if (!offerRow.contract_path) {
      return NextResponse.json({ error: "Contrat non disponible" }, { status: 404 });
    }

    const { data: fileData, error: downloadError } = await adminSupabase.storage
      .from("contrats")
      .download(offerRow.contract_path);

    if (downloadError || !fileData) {
      return NextResponse.json({ error: "Contrat introuvable" }, { status: 404 });
    }

    const buffer = Buffer.from(await fileData.arrayBuffer());
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="contrat-${offerId}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Contract download error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
