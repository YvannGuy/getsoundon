import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const PATH_PREFIX = "salles";

async function verifyOwner(salleId: string, userId: string) {
  const adminSupabase = createAdminClient();
  const { data: salle } = await adminSupabase
    .from("salles")
    .select("id, owner_id")
    .eq("id", salleId)
    .single();
  return salle && (salle as { owner_id: string }).owner_id === userId;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ salleId: string }> }
) {
  try {
    const { salleId } = await params;
    if (!salleId) return NextResponse.json({ error: "Salle invalide" }, { status: 400 });

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const isOwner = await verifyOwner(salleId, user.id);
    if (!isOwner) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

    const path = `${PATH_PREFIX}/${salleId}/modele.pdf`;
    const { data: fileData, error } = await createAdminClient().storage
      .from("contrats")
      .download(path);

    if (error || !fileData) {
      return NextResponse.json({ error: "Contrat non trouvé" }, { status: 404 });
    }

    const buffer = Buffer.from(await fileData.arrayBuffer());
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": "inline; filename=contrat.pdf",
      },
    });
  } catch (e) {
    console.error("Contract salle GET:", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ salleId: string }> }
) {
  try {
    const { salleId } = await params;
    if (!salleId) return NextResponse.json({ error: "Salle invalide" }, { status: 400 });

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const isOwner = await verifyOwner(salleId, user.id);
    if (!isOwner) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

    const admin = createAdminClient();
    const folder = `${PATH_PREFIX}/${salleId}`;
    const { data: files, error: listError } = await admin.storage
      .from("contrats")
      .list(folder, { limit: 100 });

    if (listError) {
      console.error("Contract list error:", listError);
      return NextResponse.json({ error: listError.message }, { status: 500 });
    }

    const pathsToDelete = (files ?? []).map((file) => `${folder}/${file.name}`);
    if (pathsToDelete.length > 0) {
      const { error: removeError } = await admin.storage.from("contrats").remove(pathsToDelete);
      if (removeError) {
        console.error("Contract delete error:", removeError);
        return NextResponse.json({ error: removeError.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("Contract salle DELETE:", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
