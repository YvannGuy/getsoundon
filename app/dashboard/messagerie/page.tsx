import { redirect } from "next/navigation";

import { MessagerieClient, type Thread } from "@/components/messagerie/messagerie-client";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

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
    .select("id, salle_id, date_debut, type_evenement, status, nb_personnes, message, heure_debut_souhaitee, heure_fin_souhaitee, created_at")
    .eq("seeker_id", user.id)
    .order("created_at", { ascending: false });

  const demandeIds = (demandes ?? []).map((d) => d.id);
  const salleIds = [...new Set((demandes ?? []).map((d) => d.salle_id))];

  const adminSupabase = createAdminClient();

  const [sallesRes, convsResRaw] = await Promise.all([
    salleIds.length > 0
      ? supabase.from("salles").select("id, name, city, capacity, images, slug, owner_id").in("id", salleIds)
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

  const { data: prefsData } =
    convIds.length > 0
      ? await supabase
          .from("user_conversation_preferences")
          .select("conversation_id, archived_at, deleted_at")
          .eq("user_id", user.id)
          .in("conversation_id", convIds)
      : { data: [] };

  const prefsByConv = new Map(
    (prefsData ?? []).map((p) => [
      p.conversation_id,
      { archivedAt: (p as { archived_at?: string | null }).archived_at ?? null, deletedAt: (p as { deleted_at?: string | null }).deleted_at ?? null },
    ])
  );

  let unreadByConv = new Map<string, number>();
  const lastMsgByConv = new Map<string, string>();
  if (convIds.length > 0) {
    const [unreadRes, lastMsgsResSent, lastMsgsResCreated] = await Promise.all([
      supabase
        .from("messages")
        .select("conversation_id")
        .in("conversation_id", convIds)
        .neq("sender_id", user.id)
        .is("read_at", null),
      adminSupabase
        .from("messages")
        .select("conversation_id, content, sent_at")
        .in("conversation_id", convIds)
        .order("sent_at", { ascending: false }),
      adminSupabase
        .from("messages")
        .select("conversation_id, content, created_at")
        .in("conversation_id", convIds)
        .order("created_at", { ascending: false }),
    ]);
    if (!unreadRes.error) {
      (unreadRes.data ?? []).forEach((m) => {
        const cid = m.conversation_id as string;
        unreadByConv.set(cid, (unreadByConv.get(cid) ?? 0) + 1);
      });
    }
    type MsgRow = { conversation_id: string; content: string };
    let lastMsgsData: MsgRow[] = !lastMsgsResSent.error && lastMsgsResSent.data?.length
      ? (lastMsgsResSent.data as MsgRow[])
      : !lastMsgsResCreated.error && lastMsgsResCreated.data?.length
        ? (lastMsgsResCreated.data as MsgRow[])
        : [];
    if (!lastMsgsData.length) {
      const fallback = await adminSupabase
        .from("messages")
        .select("conversation_id, content, id")
        .in("conversation_id", convIds)
        .order("id", { ascending: false });
      if (!fallback.error && fallback.data?.length) lastMsgsData = fallback.data as MsgRow[];
    }
    lastMsgsData.forEach((m) => {
      if (!lastMsgByConv.has(m.conversation_id)) {
        const preview = m.content.length > 80 ? m.content.slice(0, 77) + "..." : m.content;
        lastMsgByConv.set(m.conversation_id, preview);
      }
    });
  }

  const threads: Thread[] = (demandes ?? []).map((d) => {
    const conv = convsData.find((c) => c.demande_id === d.id);
    const salle = salleMap.get(d.salle_id);
    const ownerId = salleToOwner.get(d.salle_id);
    const profile = ownerId ? profileMap.get(ownerId) : null;
    const convId = conv?.id ?? null;
    const unreadCount = convId ? unreadByConv.get(convId) ?? 0 : 0;
    const lastPreview =
      (convId ? lastMsgByConv.get(convId) : null) ?? conv?.last_message_preview ?? null;

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

    const salleRow = salle as { images?: string[]; city?: string; capacity?: number; slug?: string } | undefined;
    const salleImage = salleRow?.images && Array.isArray(salleRow.images) && salleRow.images[0] ? String(salleRow.images[0]) : "/img.png";
    return {
      demandeId: d.id,
      conversationId: convId,
      seekerId: ownerId ?? "",
      seekerName: profile?.full_name ?? "Propriétaire",
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
      contactRole: "Propriétaire",
      nbPersonnes: (d as { nb_personnes?: number }).nb_personnes ?? null,
      message: (d as { message?: string }).message ?? null,
      lastMessageAt: conv?.last_message_at ?? null,
      createdAt: d.created_at ?? null,
      lastMessagePreview: lastPreview,
      lastMessageSenderId: null,
      unreadCount,
      archivedAt: convId ? prefsByConv.get(convId)?.archivedAt ?? null : null,
      deletedAt: convId ? prefsByConv.get(convId)?.deletedAt ?? null : null,
    };
  });

  const visibleThreads = threads.filter((t) => !t.deletedAt);

  visibleThreads.sort((a, b) => {
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
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <MessagerieClient
        threads={paginatedThreads}
        currentUserId={user.id}
        userType="seeker"
        pagination={
          totalPages > 1
            ? {
                baseUrl: "/dashboard/messagerie",
                currentPage,
                totalPages,
                totalItems: visibleThreads.length,
                pageSize: PAGE_SIZE,
              }
            : null
        }
      />
    </div>
  );
}
