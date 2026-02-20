import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { MessagerieClient, type Thread } from "./messagerie-client";

export default async function MessageriePage() {
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

  if (salleIds.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900">Messagerie</h1>
          <p className="mt-2 text-slate-500">
            Vos conversations apparaîtront ici une fois que vous aurez des annonces et des demandes.
          </p>
        </div>
      </div>
    );
  }

  const { data: demandes } = await supabase
    .from("demandes")
    .select("id, seeker_id, salle_id, date_debut, type_evenement, created_at")
    .in("salle_id", salleIds)
    .order("created_at", { ascending: false });

  const demandeIds = (demandes ?? []).map((d) => d.id);
  const seekerIds = [...new Set((demandes ?? []).map((d) => d.seeker_id))];
  const salleIdsDem = [...new Set((demandes ?? []).map((d) => d.salle_id))];

  const [profilesRes, sallesRes, convsResRaw] = await Promise.all([
    seekerIds.length > 0
      ? supabase.from("profiles").select("id, full_name, email").in("id", seekerIds)
      : { data: [] },
    salleIdsDem.length > 0
      ? supabase.from("salles").select("id, name").in("id", salleIdsDem)
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

    return {
      demandeId: d.id,
      conversationId: convId,
      seekerId: d.seeker_id,
      seekerName: profile?.full_name ?? "Organisateur",
      seekerEmail: profile?.email ?? "",
      salleName: salle?.name ?? "Salle",
      typeEvenement: d.type_evenement ?? null,
      dateDebut: dateStr,
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

  return (
    <div className="h-[calc(100vh-2rem)]">
      <MessagerieClient threads={threads} currentUserId={user.id} />
    </div>
  );
}
