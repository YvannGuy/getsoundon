import { redirect } from "next/navigation";

import { MessagerieClient, type Thread } from "@/components/messagerie/messagerie-client";
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
  searchParams: Promise<{ page?: string; demandeId?: string; conversationId?: string; offer?: string; compose?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  const { data: demandes } = await supabase
    .from("demandes")
    .select("id, salle_id, date_debut, type_evenement, status, nb_personnes, message, heure_debut_souhaitee, heure_fin_souhaitee, created_at")
    .eq("seeker_id", user.id)
    .order("created_at", { ascending: false });

  const { data: demandesVisite } = await supabase
    .from("demandes_visite")
    .select("id, salle_id, date_visite, heure_debut, heure_fin, status, message, created_at")
    .eq("seeker_id", user.id)
    .order("created_at", { ascending: false });

  const demandeIds = (demandes ?? []).map((d) => d.id);
  const demandeVisiteIds = (demandesVisite ?? []).map((d) => d.id);
  const salleIds = [
    ...new Set([
      ...(demandes ?? []).map((d) => d.salle_id),
      ...(demandesVisite ?? []).map((d) => d.salle_id),
    ]),
  ];

  const [sallesRes, convsResRaw, convsVisiteResRaw] = await Promise.all([
    salleIds.length > 0
      ? supabase.from("salles").select("id, name, city, capacity, images, slug, owner_id, address, conditions").in("id", salleIds)
      : { data: [] },
    demandeIds.length > 0
      ? supabase
          .from("conversations")
          .select("id, demande_id, last_message_at, last_message_preview")
          .in("demande_id", demandeIds)
      : { data: [] },
    salleIds.length > 0
      ? supabase
          .from("conversations")
        .select("id, seeker_id, owner_id, salle_id, demande_visite_id, last_message_at, last_message_preview")
        .eq("seeker_id", user.id)
        .in("salle_id", salleIds)
        .not("demande_visite_id", "is", null)
      : { data: [] },
  ]);

  const convsData =
    "error" in convsResRaw && convsResRaw.error ? [] : (convsResRaw.data ?? []).filter((c: { demande_id?: string }) => c.demande_id);
  const convsVisiteData =
    "error" in convsVisiteResRaw && convsVisiteResRaw.error
      ? []
      : (convsVisiteResRaw.data ?? []) as {
          id: string;
          seeker_id: string;
          owner_id: string;
          salle_id: string;
          demande_visite_id: string | null;
          last_message_at: string | null;
          last_message_preview: string | null;
        }[];

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
  const convIds = [...new Set([...convsData.map((c) => c.id), ...convsVisiteData.map((c) => c.id)])];
  const convVisiteByTriple = new Map(
    convsVisiteData.map((c) => [`${c.seeker_id}:${c.owner_id}:${c.salle_id}`, c])
  );

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
  for (const conv of [...convsData, ...convsVisiteData]) {
    const preview = (conv.last_message_preview ?? "").trim();
    if (preview && !lastMsgByConv.has(conv.id)) {
      lastMsgByConv.set(conv.id, preview);
    }
  }
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

  const demandeThreads: Thread[] = (demandes ?? []).map((d) => {
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

    const salleRow = salle as {
      images?: string[];
      city?: string;
      capacity?: number;
      slug?: string;
      conditions?: { label?: string }[] | null;
    } | undefined;
    const salleImage = salleRow?.images && Array.isArray(salleRow.images) && salleRow.images[0] ? String(salleRow.images[0]) : "/img.png";
    const salleRulesSummary = Array.isArray(salleRow?.conditions)
      ? salleRow!.conditions
          .map((c) => c?.label?.trim())
          .filter((v): v is string => !!v)
          .slice(0, 4)
          .join(", ")
      : null;
    return {
      demandeId: d.id,
      conversationId: convId,
      seekerId: ownerId ?? "",
      seekerName: profile?.full_name ?? "Propriétaire",
      seekerEmail: profile?.email ?? "",
      salleId: d.salle_id,
      salleName: salle?.name ?? "Salle",
      salleImage,
      salleCity: salleRow?.city ?? "",
      salleRulesSummary,
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

  const visiteThreadsRaw: Thread[] = (demandesVisite ?? []).map((dv) => {
    const salle = salleMap.get(dv.salle_id);
    const ownerId = salleToOwner.get(dv.salle_id);
    const conv = ownerId ? convVisiteByTriple.get(`${user.id}:${ownerId}:${dv.salle_id}`) : undefined;
    const profile = ownerId ? profileMap.get(ownerId) : null;
    const convId = conv?.id ?? null;
    const unreadCount = convId ? unreadByConv.get(convId) ?? 0 : 0;
    const lastPreview =
      (convId ? lastMsgByConv.get(convId) : null) ?? conv?.last_message_preview ?? null;

    const dateStr = dv.date_visite
      ? new Date(dv.date_visite + "T12:00:00").toLocaleDateString("fr-FR", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      : "";
    const horaires =
      dv.heure_debut && dv.heure_fin ? `${formatTime(dv.heure_debut)} - ${formatTime(dv.heure_fin)}` : "";

    const salleRow = salle as {
      images?: string[];
      city?: string;
      capacity?: number;
      slug?: string;
      conditions?: { label?: string }[] | null;
    } | undefined;
    const salleImage = salleRow?.images && Array.isArray(salleRow.images) && salleRow.images[0] ? String(salleRow.images[0]) : "/img.png";
    const salleRulesSummary = Array.isArray(salleRow?.conditions)
      ? salleRow!.conditions
          .map((c) => c?.label?.trim())
          .filter((v): v is string => !!v)
          .slice(0, 4)
          .join(", ")
      : null;
    return {
      demandeId: `visite-${dv.id}`,
      demandeVisiteId: dv.id,
      conversationId: convId,
      seekerId: ownerId ?? "",
      seekerName: profile?.full_name ?? "Propriétaire",
      seekerEmail: profile?.email ?? "",
      salleId: dv.salle_id,
      salleName: salle?.name ?? "Salle",
      salleImage,
      salleCity: salleRow?.city ?? "",
      salleRulesSummary,
      salleCapacity: salleRow?.capacity ?? null,
      salleSlug: salleRow?.slug ?? "",
      typeEvenement: null,
      dateDebut: dateStr,
      dateDebutHeure: horaires || undefined,
      demandeStatus: (dv as { status?: string }).status ?? "pending",
      contactRole: "Propriétaire",
      nbPersonnes: null,
      message: (dv as { message?: string }).message ?? null,
      lastMessageAt: conv?.last_message_at ?? null,
      createdAt: dv.created_at ?? null,
      lastMessagePreview: lastPreview,
      lastMessageSenderId: null,
      unreadCount,
      archivedAt: convId ? prefsByConv.get(convId)?.archivedAt ?? null : null,
      deletedAt: convId ? prefsByConv.get(convId)?.deletedAt ?? null : null,
    };
  });

  const visiteThreadsByKey = new Map<string, Thread>();
  for (const t of visiteThreadsRaw) {
    const key = t.conversationId ?? `visite:${t.demandeVisiteId ?? t.demandeId}`;
    if (!visiteThreadsByKey.has(key)) visiteThreadsByKey.set(key, t);
  }
  const visiteThreads = [...visiteThreadsByKey.values()];

  const threads: Thread[] = [...demandeThreads, ...visiteThreads];

  const visibleThreads = threads.filter((t) => !t.deletedAt);

  visibleThreads.sort((a, b) => {
    const aTime = a.lastMessageAt ?? a.demandeId;
    const bTime = b.lastMessageAt ?? b.demandeId;
    return String(bTime).localeCompare(String(aTime));
  });

  const params = await searchParams;
  const pageParam = params.page;
  const demandeIdParam = params.demandeId ?? undefined;
  const conversationIdParam = params.conversationId ?? undefined;
  const offerReturnStatus = typeof params.offer === "string" ? params.offer : null;
  const initialComposerText = typeof params.compose === "string" ? params.compose : null;
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
        currentUserEmail={user.email ?? null}
        userType="seeker"
        offerReturnStatus={offerReturnStatus}
        initialComposerText={initialComposerText}
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
