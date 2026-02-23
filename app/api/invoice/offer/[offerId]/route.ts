import { NextResponse } from "next/server";

import { generateInvoicePdf } from "@/lib/invoice-pdf";
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
      .select("id, owner_id, seeker_id, salle_id")
      .eq("id", offerId)
      .single();

    if (!offer) {
      return NextResponse.json({ error: "Offre introuvable" }, { status: 404 });
    }

    const o = offer as { owner_id: string; seeker_id: string; salle_id: string };
    if (o.owner_id !== user.id && o.seeker_id !== user.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    const { data: payment } = await adminSupabase
      .from("payments")
      .select("id, amount, created_at")
      .eq("offer_id", offerId)
      .eq("product_type", "reservation")
      .maybeSingle();

    if (!payment) {
      return NextResponse.json({ error: "Facture non disponible" }, { status: 404 });
    }

    const pay = payment as { id: string; amount: number; created_at: string };
    const defaultPath = `factures/${pay.id}.pdf`;

    // Essayer de télécharger ; sinon générer à la demande (paiements antérieurs)
    let fileData: Blob | null = null;
    let downloadError: Error | null = null;
    try {
      const res = await adminSupabase.storage.from("contrats").download(defaultPath);
      fileData = res.data;
      downloadError = res.error;
    } catch {
      fileData = null;
    }

    if (!fileData || downloadError) {
      // Génération à la demande
      const [{ data: salle }, { data: profiles }] = await Promise.all([
        adminSupabase.from("salles").select("name, city").eq("id", o.salle_id).single(),
        adminSupabase.from("profiles").select("id, full_name, email").in("id", [o.owner_id, o.seeker_id]),
      ]);
      const ownerProfile = (profiles ?? []).find((p) => (p as { id: string }).id === o.owner_id) as { full_name?: string | null; email?: string | null } | undefined;
      const seekerProfile = (profiles ?? []).find((p) => (p as { id: string }).id === o.seeker_id) as { full_name?: string | null; email?: string | null } | undefined;
      if (!salle || !ownerProfile || !seekerProfile) {
        return NextResponse.json({ error: "Données manquantes" }, { status: 500 });
      }
      const amountEur = (pay.amount / 100).toFixed(2);
      const invoicePdf = await generateInvoicePdf({
        paymentId: pay.id,
        amountEur,
        paidAt: new Date(pay.created_at).toLocaleDateString("fr-FR"),
        productType: "reservation",
        seekerName: seekerProfile.full_name ?? "Organisateur",
        seekerEmail: seekerProfile.email ?? "",
        ownerName: ownerProfile.full_name ?? "Propriétaire",
        salleName: (salle as { name?: string }).name ?? "Salle",
        salleCity: (salle as { city?: string }).city ?? "",
      });
      const { error: uploadErr } = await adminSupabase.storage
        .from("contrats")
        .upload(defaultPath, invoicePdf, { contentType: "application/pdf", upsert: true });
      if (!uploadErr) {
        const { error: updateErr } = await adminSupabase.from("payments").update({ invoice_path: defaultPath }).eq("id", pay.id);
        if (updateErr) {
          // Colonne invoice_path absente si migration non exécutée — on ignore
        }
      }
      fileData = new Blob([invoicePdf as BlobPart]);
    }

    if (!fileData) {
      return NextResponse.json({ error: "Facture introuvable" }, { status: 404 });
    }

    const buffer = Buffer.from(await (fileData as Blob).arrayBuffer());
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="facture-${offerId}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Invoice download error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
