import { redirect } from "next/navigation";

import { MessagerieClient, type Thread } from "@/components/messagerie/messagerie-client";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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
  searchParams: Promise<{ page?: string; demandeId?: string; conversationId?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, stripe_account_id")
    .eq("id", user.id)
    .maybeSingle();

  const { data: mySalles } = await supabase
    .from("salles")
    .select("id")
    .eq("owner_id", user.id);
  const salleIds = (mySalles ?? []).map((s) => s.id);

  const [demandesRes, demandesVisiteRes] = await Promise.all([
    salleIds.length > 0
      ? supabase
          .from("demandes")
          .select("id, seeker_id, salle_id, date_debut, type_evenement, status, nb_personnes, message, heure_debut_souhaitee, heure_fin_souhaitee, created_at")
          .in("salle_id", salleIds)
          .order("created_at", { ascending: false })
      : { data: [] },
    salleIds.length > 0
      ? supabase
          .from("demandes_visite")
          .select("id, seeker_id, salle_id, date_visite, heure_debut, heure_fin, type_evenement, status, message, created_at")
          .in("salle_id", salleIds)
          .order("created_at", { ascending: false })
      : { data: [] },
  ]);
  const demandes = (demandesRes.data ?? []) as { id: string; seeker_id: string; salle_id: string; date_debut?: string; type_evenement?: string; status?: string; nb_personnes?: number; message?: string; heure_debut_souhaitee?: string; heure_fin_souhaitee?: string; created_at?: string }[];
  const demandesVisite = (demandesVisiteRes.data ?? []) as { id: string; seeker_id: string; salle_id: string; date_visite?: string; heure_debut?: string; heure_fin?: string; type_evenement?: string | null; status?: string; message?: string; created_at?: string }[];

  const demandeIds = demandes.map((d) => d.id);
  const demandeVisiteIds = demandesVisite.map((d) => d.id);
  const seekerIds = [...new Set([...demandes.map((d) => d.seeker_id), ...demandesVisite.map((d) => d.seeker_id)])];
  const salleIdsDem = [...new Set([...demandes.map((d) => d.salle_id), ...demandesVisite.map((d) => d.salle_id)])];

  const adminSupabase = createAdminClient();
  const [profilesRes, sallesRes, convsResRaw, convsVisiteResRaw] = await Promise.all([
    seekerIds.length > 0
      ? adminSupabase.from("profiles").select("id, full_name, email").in("id", seekerIds)
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
    salleIdsDem.length > 0
      ? supabase
          .from("conversations")
          .select("id, seeker_id, owner_id, salle_id, demande_visite_id, last_message_at, last_message_preview")
          .eq("owner_id", user.id)
          .in("salle_id", salleIdsDem)
          .not("demande_visite_id", "is", null)
      : { data: [] },
  ]);

  const convsData =
    demandeIds.length > 0 && !("error" in convsResRaw && convsResRaw.error)
      ? (convsResRaw.data ?? []) as { id: string; demande_id: string; last_message_at: string | null; last_message_preview: string | null }[]
      : [];
  const convsVisiteData =
    salleIdsDem.length > 0 && !("error" in convsVisiteResRaw && convsVisiteResRaw.error)
      ? (convsVisiteResRaw.data ?? []) as {
          id: string;
          seeker_id: string;
          owner_id: string;
          salle_id: string;
          demande_visite_id: string | null;
          last_message_at: string | null;
          last_message_preview: string | null;
        }[]
      : [];

  const profileMap = new Map((profilesRes.data ?? []).map((p) => [p.id, p]));
  const salleMap = new Map((sallesRes.data ?? []).map((s) => [s.id, s]));
  const convByDemande = new Map(convsData.map((c) => [c.demande_id, c]));
  const convByDemandeVisiteTriple = new Map(
    convsVisiteData.map((c) => [`${c.seeker_id}:${c.owner_id}:${c.salle_id}`, c])
  );

  const convIds = [...new Set([...convsData.map((c) => c.id), ...convsVisiteData.map((c) => c.id)])];

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
        .is("deleted_at", null)
        .order("sent_at", { ascending: false }),
      adminSupabase
        .from("messages")
        .select("conversation_id, content, created_at")
        .in("conversation_id", convIds)
        .is("deleted_at", null)
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
        .is("deleted_at", null)
        .order("id", { ascending: false });
      if (!fallback.error && fallback.data?.length) lastMsgsData = fallback.data as MsgRow[];
    }
    lastMsgsData.forEach((m) => {
      if (!lastMsgByConv.has(m.conversation_id)) {
        const raw = (m as { content?: string | null }).content;
        const text = (raw && String(raw).trim()) || "";
        if (text) {
          const preview = text.length > 80 ? text.slice(0, 77) + "..." : text;
          lastMsgByConv.set(m.conversation_id, preview);
        }
      }
    });
  }

  const threadsDemande: Thread[] = demandes.map((d) => {
    const conv = convByDemande.get(d.id) as { id: string; last_message_at: string | null; last_message_preview: string | null } | undefined;
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
      seekerName: profile?.full_name ?? "Locataire",
      seekerEmail: profile?.email ?? "",
      salleId: d.salle_id,
      salleName: salle?.name ?? "Salle",
      salleImage,
      salleCity: salleRow?.city ?? "",
      salleCapacity: salleRow?.capacity ?? null,
      salleSlug: salleRow?.slug ?? "",
      hasContract: true,
      typeEvenement: d.type_evenement ?? null,
      dateDebut: dateStr,
      dateDebutHeure: horaires || undefined,
      demandeStatus: (d as { status?: string }).status ?? "sent",
      contactRole: "Locataire",
      nbPersonnes: (d as { nb_personnes?: number }).nb_personnes ?? null,
      message: (d as { message?: string }).message ?? null,
      lastMessageAt: conv?.last_message_at ?? null,
      createdAt: d.created_at ?? null,
      lastMessagePreview:
        (convId ? lastMsgByConv.get(convId) : null) ?? conv?.last_message_preview ?? null,
      lastMessageSenderId: null,
      unreadCount,
      archivedAt: convId ? prefsByConv.get(convId)?.archivedAt ?? null : null,
      deletedAt: convId ? prefsByConv.get(convId)?.deletedAt ?? null : null,
    };
  });

  const threadsVisiteRaw: Thread[] = demandesVisite.map((dv) => {
    const conv = convByDemandeVisiteTriple.get(`${dv.seeker_id}:${user.id}:${dv.salle_id}`);
    const profile = profileMap.get(dv.seeker_id);
    const salle = salleMap.get(dv.salle_id);
    const convId = conv?.id ?? null;
    const unreadCount = convId ? unreadByConv.get(convId) ?? 0 : 0;
    const dateStr = dv.date_visite
      ? new Date(dv.date_visite + "T12:00:00").toLocaleDateString("fr-FR", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      : "";
    const salleRow = salle as { images?: string[]; city?: string; capacity?: number; slug?: string } | undefined;
    const salleImage = salleRow?.images && Array.isArray(salleRow.images) && salleRow.images[0] ? String(salleRow.images[0]) : "/img.png";
    const horaires = dv.heure_debut && dv.heure_fin ? `${formatTime(dv.heure_debut)} - ${formatTime(dv.heure_fin)}` : "";
    return {
      demandeId: `visite-${dv.id}`,
      demandeVisiteId: dv.id,
      conversationId: convId,
      seekerId: dv.seeker_id,
      seekerName: profile?.full_name ?? "Visiteur",
      seekerEmail: profile?.email ?? "",
      salleId: dv.salle_id,
      salleName: salle?.name ?? "Salle",
      salleImage,
      salleCity: salleRow?.city ?? "",
      salleCapacity: salleRow?.capacity ?? null,
      salleSlug: salleRow?.slug ?? "",
      hasContract: true,
      typeEvenement: dv.type_evenement ?? null,
      dateDebut: dateStr,
      dateDebutHeure: horaires || undefined,
      demandeStatus: dv.status ?? "pending",
      contactRole: "Visiteur",
      nbPersonnes: null,
      message: dv.message ?? null,
      lastMessageAt: conv?.last_message_at ?? null,
      createdAt: dv.created_at ?? null,
      lastMessagePreview: (convId ? lastMsgByConv.get(convId) : null) ?? conv?.last_message_preview ?? null,
      lastMessageSenderId: null,
      unreadCount,
      archivedAt: convId ? prefsByConv.get(convId)?.archivedAt ?? null : null,
      deletedAt: convId ? prefsByConv.get(convId)?.deletedAt ?? null : null,
    };
  });

  const threadsVisiteByKey = new Map<string, Thread>();
  for (const t of threadsVisiteRaw) {
    const key = t.conversationId ?? `visite:${t.demandeVisiteId ?? t.demandeId}`;
    if (!threadsVisiteByKey.has(key)) threadsVisiteByKey.set(key, t);
  }
  const threadsVisite = [...threadsVisiteByKey.values()];

  const threads: Thread[] = [...threadsDemande, ...threadsVisite];

  const visibleThreads = threads.filter((t) => !t.deletedAt);

  visibleThreads.sort((a, b) => {
    const aTime = a.lastMessageAt ?? a.demandeId;
    const bTime = b.lastMessageAt ?? b.demandeId;
    return String(bTime).localeCompare(String(aTime));
  });

  const params = await searchParams;
  const demandeIdParam = params.demandeId ?? null;
  const conversationIdParam = params.conversationId ?? null;
  const pageParam = params.page;
  const page = Math.max(1, parseInt(String(pageParam || "1"), 10) || 1);
  const totalPages = Math.ceil(visibleThreads.length / PAGE_SIZE) || 1;
  const currentPage = Math.min(page, totalPages);
  const from = (currentPage - 1) * PAGE_SIZE;
  let paginatedThreads = visibleThreads.slice(from, from + PAGE_SIZE);
  const targetThread = conversationIdParam
    ? visibleThreads.find((t) => t.conversationId === conversationIdParam)
    : demandeIdParam
      ? visibleThreads.find((t) => t.demandeId === demandeIdParam)
      : null;
  if (targetThread && !paginatedThreads.some((t) => t.demandeId === targetThread.demandeId)) {
    paginatedThreads = [targetThread, ...paginatedThreads];
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <MessagerieClient
        threads={paginatedThreads}
        initialDemandeId={demandeIdParam}
        initialConversationId={conversationIdParam}
        currentUserId={user.id}
        currentUserFullName={(profile as { full_name?: string } | null)?.full_name ?? user.user_metadata?.full_name}
        userType="owner"
        hasConnectAccount={!!(profile as { stripe_account_id?: string } | null)?.stripe_account_id}
        pagination={
          totalPages > 1
            ? {
                baseUrl: "/proprietaire/messagerie",
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
