import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const MAX_SIZE = 2 * 1024 * 1024; // 2 Mo
const PATH_PREFIX = "salles";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const formData = await request.formData();
    const salleId = String(formData.get("salleId") ?? "").trim();
    const file = formData.get("file") as File | null;

    if (!salleId || !file) {
      return NextResponse.json({ error: "Salle et fichier requis" }, { status: 400 });
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json({ error: "Format PDF uniquement" }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "Fichier trop volumineux (max 5 Mo)" }, { status: 400 });
    }

    const adminSupabase = createAdminClient();
    const { data: salle } = await adminSupabase
      .from("salles")
      .select("id, owner_id")
      .eq("id", salleId)
      .single();

    if (!salle || (salle as { owner_id: string }).owner_id !== user.id) {
      return NextResponse.json({ error: "Salle introuvable ou non autorisé" }, { status: 403 });
    }

    const path = `${PATH_PREFIX}/${salleId}/modele.pdf`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await adminSupabase.storage
      .from("contrats")
      .upload(path, buffer, { contentType: "application/pdf", upsert: true });

    if (uploadError) {
      console.error("Contract upload error:", uploadError);
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, path });
  } catch (error) {
    console.error("Contract upload error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
