import { redirect } from "next/navigation";

import { MessagerieClient, type Thread } from "@/components/messagerie/messagerie-client";
import { createClient } from "@/lib/supabase/server";

const PAGE_SIZE = 20;

function formatTime(t: string | null): string {
  if (!t) return "";
  const m = String(t).match(/(\d{1,2}):(\d{2})/);
  return m ? `${m[1]}h${m[2]}` : "";
}

export default async function MessageriePage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth");

  const { data: mySalles } = await supabase
    .from("salles")
    .select("id")
    .eq("owner_id", user.id);
  const salleIds = (mySalles ?? []).map((s) => s.id);

  const demandesRes =
    salleIds.length > 0
      ? await supabase
          .from("demandes")
          .select("id, seeker_id, salle_id, date_debut, type_evenement, status, nb_personnes, message, heure_debut_souhaitee, heure_fin_souhaitee, created_at")
          .in("salle_id", salleIds)
          .order("created_at", { ascending: false })
      : { data: [] };
  const demandes = demandesRes.data ?? [];

  const demandeIds = (demandes ?? []).map((d) => d.id);
  const seekerIds = [...new Set((demandes ?? []).map((d) => d.seeker_id))];
  const salleIdsDem = [...new Set((demandes ?? []).map((d) => d.salle_id))];

  const [profilesRes, sallesRes, convsResRaw] = await Promise.all([
    seekerIds.length > 0
      ? supabase.from("profiles").select("id, full_name, email").in("id", seekerIds)
      : { data: [] },
    salleIdsDem.length > 0
      ? supabase.from("salles").select("id, name, city, capacity, images, slug").in("id", salleIdsDem)
      : { data: [] },
    demandeIds.length > 0
      ? supabase
          .from("conversations")
          .select("id, demande_id, last_message_at, last_message_preview")
          .in("demande_id", demandeIds)
      : { data: [] },
  ]);

  const convsData =
    demandeIds.length > 0 && !("error" in convsResRaw && convsResRaw.error)
      ? convsResRaw.data ?? []
      : [];

  const profileMap = new Map((profilesRes.data ?? []).map((p) => [p.id, p]));
  const salleMap = new Map((sallesRes.data ?? []).map((s) => [s.id, s]));
  const convByDemande = new Map(convsData.map((c) => [c.demande_id, c]));

  const convIds = convsData.map((c) => c.id);
  let unreadByConv = new Map<string, number>();
  if (convIds.length > 0) {
    const unreadRes = await supabase
      .from("messages")
      .select("conversation_id")
      .in("conversation_id", convIds)
      .neq("sender_id", user.id)
      .is("read_at", null);
    if (!unreadRes.error) {
      (unreadRes.data ?? []).forEach((m) => {
        const cid = m.conversation_id as string;
        unreadByConv.set(cid, (unreadByConv.get(cid) ?? 0) + 1);
      });
    }
  }

  const demandeToConvId = new Map<string, string>();
  convsData.forEach((c) => {
    demandeToConvId.set(c.demande_id, c.id);
  });

  const threads: Thread[] = (demandes ?? []).map((d) => {
    const conv = convByDemande.get(d.id);
    const profile = profileMap.get(d.seeker_id);
    const salle = salleMap.get(d.salle_id);
    const convId = conv?.id ?? null;
    const unreadCount = convId ? unreadByConv.get(convId) ?? 0 : 0;
    const dateStr = d.date_debut
      ? new Date(d.date_debut).toLocaleDateString("fr-FR", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      : "";

    const salleRow = salle as { images?: string[]; city?: string; capacity?: number; slug?: string } | undefined;
    const salleImage = salleRow?.images && Array.isArray(salleRow.images) && salleRow.images[0] ? String(salleRow.images[0]) : "/img.png";
    const hDebut = formatTime((d as { heure_debut_souhaitee?: string }).heure_debut_souhaitee ?? null);
    const hFin = formatTime((d as { heure_fin_souhaitee?: string }).heure_fin_souhaitee ?? null);
    const horaires = hDebut && hFin ? `${hDebut} - ${hFin}` : hDebut || "";
    return {
      demandeId: d.id,
      conversationId: convId,
      seekerId: d.seeker_id,
      seekerName: profile?.full_name ?? "Organisateur",
      seekerEmail: profile?.email ?? "",
      salleName: salle?.name ?? "Salle",
      salleImage,
      salleCity: salleRow?.city ?? "",
      salleCapacity: salleRow?.capacity ?? null,
      salleSlug: salleRow?.slug ?? "",
      typeEvenement: d.type_evenement ?? null,
      dateDebut: dateStr,
      dateDebutHeure: horaires || undefined,
      demandeStatus: (d as { status?: string }).status ?? "sent",
      contactRole: "Organisateur",
      nbPersonnes: (d as { nb_personnes?: number }).nb_personnes ?? null,
      message: (d as { message?: string }).message ?? null,
      lastMessageAt: conv?.last_message_at ?? null,
      lastMessagePreview: conv?.last_message_preview ?? null,
      lastMessageSenderId: null,
      unreadCount,
    };
  });

  threads.sort((a, b) => {
    const aTime = a.lastMessageAt ?? a.demandeId;
    const bTime = b.lastMessageAt ?? b.demandeId;
    return String(bTime).localeCompare(String(aTime));
  });

  const pageParam = (await searchParams).page;
  const page = Math.max(1, parseInt(String(pageParam || "1"), 10) || 1);
  const totalPages = Math.ceil(threads.length / PAGE_SIZE) || 1;
  const currentPage = Math.min(page, totalPages);
  const from = (currentPage - 1) * PAGE_SIZE;
  const paginatedThreads = threads.slice(from, from + PAGE_SIZE);

  return (
    <div className="flex min-h-0 flex-1 flex-col md:h-[calc(100vh-2rem)]">
      <MessagerieClient
        threads={paginatedThreads}
        currentUserId={user.id}
        userType="owner"
        pagination={
          totalPages > 1
            ? {
                baseUrl: "/proprietaire/messagerie",
                currentPage,
                totalPages,
                totalItems: threads.length,
                pageSize: PAGE_SIZE,
              }
            : null
        }
      />
    </div>
  );
}
