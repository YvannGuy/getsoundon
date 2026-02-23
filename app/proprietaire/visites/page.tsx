import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getUserOrNull } from "@/lib/supabase/server";
import { VisitesClient } from "./visites-client";

export const dynamic = "force-dynamic";

export default async function VisitesPage() {
  const { user, supabase } = await getUserOrNull();
  if (!user) return null;

  const { data: mySalles } = await supabase
    .from("salles")
    .select("id, name, slug")
    .eq("owner_id", user.id);
  const salleIds = (mySalles ?? []).map((s) => s.id);
  const salleMap = new Map((mySalles ?? []).map((s) => [s.id, s]));

  if (salleIds.length === 0) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-black">Visites</h1>
        <p className="mt-4 text-slate-600">Aucune annonce. Les demandes de visite apparaîtront ici.</p>
        <Link href="/onboarding/salle" className="mt-4 inline-block text-[#213398] hover:underline">
          Ajouter une salle →
        </Link>
      </div>
    );
  }

  let demandes: unknown[] = [];
  try {
    const res = await supabase
      .from("demandes_visite")
      .select("*")
      .in("salle_id", salleIds)
      .order("created_at", { ascending: false });
    demandes = res.data ?? [];
  } catch {
    // Table peut ne pas exister si migration non exécutée
  }

  const seekerIds = [...new Set((demandes ?? []).map((d) => (d as { seeker_id: string }).seeker_id))];
  const { data: profiles } = seekerIds.length > 0
    ? await supabase.from("profiles").select("id, full_name").in("id", seekerIds)
    : { data: [] };
  const profileMap = new Map((profiles ?? []).map((p) => [(p as { id: string }).id, p]));

  const list = (demandes ?? []).map((d) => {
    const row = d as {
      id: string;
      salle_id: string;
      seeker_id: string;
      date_visite: string;
      heure_debut: string;
      heure_fin: string;
      message: string | null;
      status: string;
      created_at: string;
    };
    const salle = salleMap.get(row.salle_id);
    const profile = profileMap.get(row.seeker_id) as { full_name?: string } | undefined;
    const seekerName = profile?.full_name ?? "Organisateur";
    const dateLabel = new Date(row.date_visite + "T12:00:00").toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
    const heureDebut = row.heure_debut?.slice(0, 5) ?? "";
    const heureFin = row.heure_fin?.slice(0, 5) ?? "";
    return {
      id: row.id,
      salleName: salle?.name ?? "—",
      salleSlug: salle?.slug,
      seekerName,
      dateLabel,
      heureDebut,
      heureFin,
      message: row.message,
      status: row.status,
      createdAt: row.created_at,
    };
  });

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-black">Demandes de visite</h1>
      <p className="mt-1 text-slate-600">
        Acceptez ou refusez les demandes de visite sur vos salles
      </p>
      <VisitesClient list={list} />
    </div>
  );
}
