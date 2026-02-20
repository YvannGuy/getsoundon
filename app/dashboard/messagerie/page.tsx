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

  const { data: demandes } = await supabase
    .from("demandes")
    .select("id, salle_id, date_debut, type_evenement, heure_debut_souhaitee, heure_fin_souhaitee, created_at")
    .eq("seeker_id", user.id)
    .order("created_at", { ascending: false });

  if (!demandes?.length) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900">Messagerie</h1>
          <p className="mt-2 text-slate-500">
            Vos conversations apparaîtront ici une fois que vous aurez envoyé des demandes aux propriétaires.
          </p>
        </div>
      </div>
    );
  }

  const demandeIds = demandes.map((d) => d.id);
  const salleIds = [...new Set(demandes.map((d) => d.salle_id))];

  const [sallesRes, convsResRaw] = await Promise.all([
    salleIds.length > 0
      ? supabase.from("salles").select("id, name, owner_id").in("id", salleIds)
      : { data: [] },
    supabase
      .from("conversations")
      .select("id, demande_id, last_message_at, last_message_preview")
      .in("demande_id", demandeIds),
  ]);

  const convsData =
    !convsResRaw.error && convsResRaw.data
      ? convsResRaw.data.filter((c) => c.demande_id)
      : [];

  const ownerIds = [...new Set((sallesRes.data ?? []).map((s) => (s as { owner_id: string }).owner_id))];
  const { data: profiles } =
    ownerIds.length > 0
      ? await supabase.from("profiles").select("id, full_name, email").in("id", ownerIds)
      : { data: [] };
  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
  const salleMap = new Map((sallesRes.data ?? []).map((s) => [s.id, s]));
  const salleToOwner = new Map(
    (sallesRes.data ?? []).map((s) => [s.id, (s as { owner_id: string }).owner_id])
  );
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

  const threads: Thread[] = demandes.map((d) => {
    const conv = convsData.find((c) => c.demande_id === d.id);
    const salle = salleMap.get(d.salle_id);
    const ownerId = salleToOwner.get(d.salle_id);
    const profile = ownerId ? profileMap.get(ownerId) : null;
    const convId = conv?.id ?? null;
    const unreadCount = convId ? unreadByConv.get(convId) ?? 0 : 0;

    const dateStr = d.date_debut
      ? new Date(d.date_debut).toLocaleDateString("fr-FR", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      : "";
    const hDebut = formatTime(d.heure_debut_souhaitee ?? null);
    const hFin = formatTime(d.heure_fin_souhaitee ?? null);
    const horaires = hDebut && hFin ? `${hDebut} - ${hFin}` : hDebut || "";

    return {
      demandeId: d.id,
      conversationId: convId,
      seekerId: ownerId ?? "",
      seekerName: profile?.full_name ?? "Propriétaire",
      seekerEmail: profile?.email ?? "",
      salleName: salle?.name ?? "Salle",
      typeEvenement: d.type_evenement ?? null,
      dateDebut: dateStr,
      dateDebutHeure: horaires || undefined,
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
    <div className="flex h-[calc(100vh-2rem)] flex-col">
      <MessagerieClient
        threads={paginatedThreads}
        currentUserId={user.id}
        pagination={
          totalPages > 1
            ? {
                baseUrl: "/dashboard/messagerie",
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
