"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Check, ChevronDown, ChevronLeft, Lightbulb, MessageCircle, Paperclip, Send, Search } from "lucide-react";

import { updateDemandeStatusAction } from "@/app/actions/demande-owner";
import { getOrCreateConversation, sendMessage } from "@/app/actions/messagerie";
import { AddSalleButton } from "@/components/proprietaire/add-salle-modal";
import { SearchModalButton } from "@/components/search/search-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { createClient } from "@/lib/supabase/client";

export type Thread = {
  demandeId: string;
  conversationId: string | null;
  seekerId: string;
  seekerName: string;
  seekerEmail: string;
  salleName: string;
  salleImage?: string;
  salleCity?: string;
  salleCapacity?: number | null;
  salleSlug?: string;
  typeEvenement: string | null;
  dateDebut: string;
  dateDebutHeure?: string;
  demandeStatus?: string;
  contactRole?: string;
  nbPersonnes?: number | null;
  message?: string | null;
  lastMessageAt: string | null;
  /** Date de création de la demande (ISO) - utilisé si pas encore de message */
  createdAt?: string | null;
  lastMessagePreview: string | null;
  lastMessageSenderId: string | null;
  unreadCount: number;
};

type Message = {
  id: string;
  sender_id: string;
  content: string;
  sent_at: string;
  read_at: string | null;
};

type FilterTab = "all" | "unread" | "pending" | "archived";

type PaginationInfo = {
  baseUrl: string;
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
};

type Props = {
  threads: Thread[];
  currentUserId: string;
  userType: "seeker" | "owner";
  pagination?: PaginationInfo | null;
  /** Quand défini, ouvre automatiquement la conversation correspondante */
  initialDemandeId?: string | null;
};

const STATUS_TAG: Record<string, { label: string; className: string }> = {
  sent: { label: "Nouvelle demande", className: "bg-emerald-100 text-emerald-800" },
  viewed: { label: "En attente", className: "bg-sky-100 text-sky-800" },
  replied: { label: "Répondu", className: "bg-slate-200 text-slate-600" },
  accepted: { label: "Répondu", className: "bg-slate-200 text-slate-600" },
  rejected: { label: "Répondu", className: "bg-slate-200 text-slate-600" },
};

const TYPE_EVENEMENT_LABEL: Record<string, string> = {
  "culte-regulier": "Culte régulier",
  conference: "Conférence",
  celebration: "Célébration",
  bapteme: "Baptême",
  retraite: "Retraite",
};

export function MessagerieClient({ threads, currentUserId, userType, pagination, initialDemandeId }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<Thread | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState<"accepted" | "rejected" | "replied" | null>(null);
  const [search, setSearch] = useState("");
  const [lastPreviews, setLastPreviews] = useState<Map<string, string>>(new Map());
  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const [detailsOpen, setDetailsOpen] = useState(true);
  const [mobileShowChat, setMobileShowChat] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const filteredBySearch = threads.filter(
    (t) =>
      !search ||
      t.seekerName.toLowerCase().includes(search.toLowerCase()) ||
      t.salleName.toLowerCase().includes(search.toLowerCase())
  );

  const filteredThreads = filteredBySearch.filter((t) => {
    if (filterTab === "all") return true;
    if (filterTab === "unread") return t.unreadCount > 0;
    if (filterTab === "pending") return ["sent", "viewed"].includes(t.demandeStatus ?? "sent");
    if (filterTab === "archived") return t.demandeStatus === "rejected";
    return true;
  });

  const loadMessages = useCallback(async (convId: string) => {
    const supabase = createClient();
    const { data } = await supabase
      .from("messages")
      .select("id, sender_id, content, sent_at, read_at")
      .eq("conversation_id", convId)
      .order("sent_at", { ascending: true });
    if (!data?.length) {
      const { data: alt } = await supabase
        .from("messages")
        .select("id, sender_id, content, created_at, read_at")
        .eq("conversation_id", convId)
        .order("created_at", { ascending: true });
      const msgs = (alt ?? []).map((m) => ({
        id: m.id,
        sender_id: m.sender_id,
        content: m.content,
        sent_at: (m as { created_at?: string }).created_at ?? new Date().toISOString(),
        read_at: m.read_at,
      })) as Message[];
      setMessages(msgs);
      return;
    }
    setMessages((data as Message[]) ?? []);
  }, []);

  useEffect(() => {
    if (initialDemandeId) {
      const t = threads.find((x) => x.demandeId === initialDemandeId);
      if (t) setSelected(t);
    }
  }, [initialDemandeId, threads]);

  useEffect(() => {
    const toFetch = threads
      .filter((t) => t.conversationId)
      .map((t) => ({ demandeId: t.demandeId, convId: t.conversationId! }));
    if (toFetch.length === 0) return;
    const fetchPreviews = async () => {
      const supabase = createClient();
      const next = new Map<string, string>();
      for (const { demandeId, convId } of toFetch) {
        const tryFetch = async (orderBy: string) => {
          const res = await supabase
            .from("messages")
            .select("content")
            .eq("conversation_id", convId)
            .order(orderBy, { ascending: false })
            .limit(1);
          return res.data?.[0] as { content: string } | undefined;
        };
        const row = (await tryFetch("id")) ?? (await tryFetch("sent_at")) ?? (await tryFetch("created_at"));
        if (row?.content) {
          const preview = row.content.length > 80 ? row.content.slice(0, 77) + "..." : row.content;
          next.set(demandeId, preview);
        }
      }
      if (next.size) setLastPreviews((prev) => new Map([...prev, ...next]));
    };
    fetchPreviews();
  }, [threads]);

  useEffect(() => {
    if (selected && messages.length > 0) {
      const last = messages[messages.length - 1];
      const preview = last.content.length > 80 ? last.content.slice(0, 77) + "..." : last.content;
      setLastPreviews((prev) => new Map(prev).set(selected.demandeId, preview));
    }
  }, [selected?.demandeId, messages]);

  useEffect(() => {
    if (!selected) {
      setConversationId(null);
      setMessages([]);
      setMobileShowChat(false);
      return;
    }
    const open = async () => {
      let convId = selected.conversationId;
      if (!convId) {
        const res = await getOrCreateConversation(selected.demandeId);
        if (res.conversationId) {
          convId = res.conversationId;
          setConversationId(convId);
        }
      } else {
        setConversationId(convId);
      }
      if (convId) loadMessages(convId);
      setMobileShowChat(true);
    };
    open();
  }, [selected?.demandeId, selected?.conversationId, loadMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || !selected) return;

    let convId: string | null = conversationId;
    if (!convId) {
      const cres = await getOrCreateConversation(selected.demandeId);
      if (!cres.conversationId) {
        alert(cres.error ?? "Impossible de créer la conversation.");
        return;
      }
      convId = cres.conversationId;
      setConversationId(convId);
    }
    if (!convId) return;

    setSending(true);
    const res = await sendMessage(convId, text);
    setSending(false);
    if (res.success) {
      setInput("");
      const newMsg: Message = {
        id: crypto.randomUUID(),
        sender_id: currentUserId,
        content: text,
        sent_at: new Date().toISOString(),
        read_at: null,
      };
      setMessages((prev) => [...prev, newMsg]);
      if (selected) {
        const preview = text.length > 80 ? text.slice(0, 77) + "..." : text;
        setLastPreviews((prev) => new Map(prev).set(selected.demandeId, preview));
      }
      router.refresh();
    } else if (res.error) {
      alert(res.error);
    }
  };

  const handleStatusUpdate = async (status: "accepted" | "rejected" | "replied") => {
    if (!selected) return;
    setStatusUpdating(status);
    const res = await updateDemandeStatusAction(selected.demandeId, status);
    setStatusUpdating(null);
    if (res.success) {
      setSelected((prev) => (prev ? { ...prev, demandeStatus: status } : null));
      if (status === "replied") {
        const msg =
          "J'aurais besoin de quelques précisions avant de confirmer.";
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            sender_id: currentUserId,
            content: msg,
            sent_at: new Date().toISOString(),
            read_at: null,
          },
        ]);
      }
      router.refresh();
    }
  };

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    const diffMs = Date.now() - d.getTime();
    if (Number.isNaN(diffMs) || diffMs < 0) return "";
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 60) return `Il y a ${diffMins}min`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    if (diffDays === 1) return "Hier";
    if (diffDays < 7) return `${diffDays} jours`;
    if (diffDays < 14) return "1 sem";
    const weeks = Math.floor(diffDays / 7);
    return Number.isNaN(weeks) ? "" : `${weeks} sem`;
  };

  const otherName = selected?.seekerName ?? "";
  const statusTag = STATUS_TAG[selected?.demandeStatus ?? "sent"] ?? STATUS_TAG.sent;
  const demandeLink = userType === "seeker" ? "/dashboard/demandes" : "/proprietaire/demandes";

  const listPanel = (
    <div className="flex w-full flex-col border-r-0 border-slate-200 bg-white md:w-[380px] md:border-r">
      <div className="shrink-0 border-b border-slate-200 p-4 md:p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-black">Messagerie</h1>
        </div>
        <div className="relative mt-4">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Rechercher une conversation..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-11 rounded-xl border-slate-200 bg-slate-50 pl-10 focus-visible:bg-white"
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {(["all", "unread", "pending", "archived"] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilterTab(key)}
              className={`rounded-full px-4 py-2 text-[13px] font-medium transition ${
                filterTab === key
                  ? "bg-[#213398] text-white"
                  : "bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {key === "all" ? "Tous" : key === "unread" ? "Non lus" : key === "pending" ? "En attente" : "Archivés"}
            </button>
          ))}
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {filteredThreads.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#213398]/10">
              <MessageCircle className="h-10 w-10 text-[#213398]" />
            </div>
            <h2 className="mt-6 text-xl font-bold text-black">Aucune conversation</h2>
            <p className="mt-2 max-w-sm text-slate-600">
              Vous n&apos;avez pas encore de messages. Vos conversations avec les organisateurs et propriétaires apparaîtront ici.
            </p>
            <div className="mt-6 flex flex-col items-center gap-3">
              {userType === "owner" && (
                <AddSalleButton
                  className="inline-flex items-center gap-2 rounded-lg bg-[#213398] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1a2980]"
                >
                  + Ajouter une annonce
                </AddSalleButton>
              )}
              {userType === "seeker" && (
                <p className="text-sm text-slate-500">
                  <SearchModalButton className="font-medium text-[#213398] hover:underline cursor-pointer">
                    Parcourez les salles disponibles
                  </SearchModalButton>
                </p>
              )}
            </div>
            <div className="mt-12 w-full max-w-md rounded-xl border border-slate-200 bg-slate-50/50 p-6 text-left">
              <p className="flex items-center gap-2 font-semibold text-black">
                <Lightbulb className="h-5 w-5 text-amber-500" />
                Le saviez-vous ?
              </p>
              <ul className="mt-3 space-y-2 text-sm text-slate-600">
                {userType === "seeker" ? (
                  <>
                    <li className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                      Contactez plusieurs salles pour multiplier vos chances de trouver la vôtre
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                      Un message clair et détaillé facilite les réponses des propriétaires
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                      Suivez vos demandes dans l&apos;onglet « Demandes » pour ne rien manquer
                    </li>
                  </>
                ) : (
                  <>
                    <li className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                      Répondez rapidement pour améliorer votre taux de réponse
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                      Les propriétaires réactifs ont 3x plus de réservations
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                      Utilisez les réponses rapides pour gagner du temps
                    </li>
                  </>
                )}
              </ul>
            </div>
          </div>
        ) : (
          filteredThreads.map((t) => {
            const isSelected = selected?.demandeId === t.demandeId;
            return (
              <button
                key={t.demandeId}
                type="button"
                onClick={() => setSelected(t)}
                className={`flex w-full items-start gap-4 border-b border-slate-100 p-4 text-left transition hover:bg-slate-50 ${
                  isSelected ? "bg-[#213398]/5" : ""
                }`}
              >
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-slate-200">
                  <Image src={t.salleImage ?? "/img.png"} alt="" fill className="object-cover" sizes="56px" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate font-semibold text-black">{t.salleName}</p>
                    <div className="flex shrink-0 items-center gap-1.5">
                      {t.unreadCount > 0 && (
                        <span className="h-2.5 w-2.5 rounded-full bg-[#213398]" aria-hidden />
                      )}
                      <span className="text-xs text-slate-500">{formatTime(t.lastMessageAt ?? t.createdAt ?? null)}</span>
                    </div>
                  </div>
                  <p className="mt-0.5 truncate text-sm text-slate-600">
                    {t.seekerName} • {t.contactRole ?? (userType === "seeker" ? "Propriétaire" : "Organisateur")}
                  </p>
                  <p className="mt-1 line-clamp-1 text-sm text-slate-500">
                    {lastPreviews.get(t.demandeId) ?? t.lastMessagePreview ?? t.message ?? "Aucun message"}
                  </p>
                </div>
              </button>
            );
          })
        )}
      </div>
      {pagination && pagination.totalPages > 1 && (
        <div className="border-t border-slate-200 p-3">
          <Pagination
            baseUrl={pagination.baseUrl}
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            totalItems={pagination.totalItems}
            pageSize={pagination.pageSize}
          />
        </div>
      )}
    </div>
  );

  const chatPanel = (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-slate-50">
      {!selected ? (
        <div className="hidden flex-1 flex-col items-center justify-center text-slate-500 md:flex">
          <p className="text-lg font-medium">Sélectionnez une conversation</p>
          <p className="mt-1 text-sm">Ou démarrez un échange depuis une demande</p>
        </div>
      ) : (
        <>
          {/* En-tête du chat */}
          <div className="flex shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 md:px-6 md:py-4">
            <button
              type="button"
              onClick={() => setMobileShowChat(false)}
              className="md:hidden -ml-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"
              aria-label="Retour"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-black">{selected.salleName}</p>
              <p className="text-sm text-slate-600">
                {[selected.salleCity, selected.salleCapacity ? `${selected.salleCapacity} pers.` : null, selected.typeEvenement ? (TYPE_EVENEMENT_LABEL[selected.typeEvenement] ?? selected.typeEvenement) : null]
                  .filter(Boolean)
                  .join(" • ")}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {selected.salleSlug && (
                <Link href={`/salles/${selected.salleSlug}`}>
                  <Button size="sm" variant="outline" className="text-[13px]">
                    Voir l&apos;annonce
                  </Button>
                </Link>
              )}
            </div>
          </div>

          {/* Détails de la demande (propriétaire) */}
          {userType === "owner" && (
            <div className="shrink-0 border-b border-slate-200 bg-white px-4 py-3 md:px-6">
              <div className="rounded-xl border-2 border-[#213398]/30 bg-white p-4">
                <button
                  type="button"
                  onClick={() => setDetailsOpen((o) => !o)}
                  className="flex w-full items-center justify-between text-left"
                >
                  <span className="flex items-center gap-2 font-semibold text-black">
                    <Paperclip className="h-4 w-4 text-[#213398]" />
                    Détails de la demande
                  </span>
                  <ChevronDown className={`h-5 w-5 shrink-0 text-slate-500 transition ${detailsOpen ? "rotate-180" : ""}`} />
                </button>
                {detailsOpen && (
                  <dl className="mt-4 space-y-3 border-t border-slate-100 pt-3 text-sm">
                    <div>
                      <dt className="text-xs font-medium text-slate-500">Type d&apos;événement</dt>
                      <dd className="mt-0.5 text-black">{selected.typeEvenement ? (TYPE_EVENEMENT_LABEL[selected.typeEvenement] ?? selected.typeEvenement) : "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium text-slate-500">Date souhaitée</dt>
                      <dd className="mt-0.5 text-black">{selected.dateDebut || "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium text-slate-500">Nombre de personnes</dt>
                      <dd className="mt-0.5 text-black">{selected.nbPersonnes ? `${selected.nbPersonnes} personnes` : "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium text-slate-500">Durée</dt>
                      <dd className="mt-0.5 text-black">{selected.dateDebutHeure ?? "—"}</dd>
                    </div>
                    {selected.message && (
                      <div>
                        <dt className="text-xs font-medium text-slate-500">Message de l&apos;organisateur</dt>
                        <dd className="mt-1 rounded-lg bg-slate-50 p-3 text-slate-700">{selected.message}</dd>
                      </div>
                    )}
                  </dl>
                )}
                {detailsOpen && !["replied", "accepted", "rejected"].includes(selected.demandeStatus ?? "") && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700"
                      disabled={!!statusUpdating}
                      onClick={() => handleStatusUpdate("accepted")}
                    >
                      ✓ Disponible
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-red-300 text-red-700 hover:bg-red-50"
                      disabled={!!statusUpdating}
                      onClick={() => handleStatusUpdate("rejected")}
                    >
                      ✗ Indisponible
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-[#213398]/50 text-[#213398] hover:bg-[#213398]/5"
                      disabled={!!statusUpdating}
                      onClick={() => handleStatusUpdate("replied")}
                    >
                      Demander précision
                    </Button>
                  </div>
                )}
                <p className="mt-3 text-xs text-slate-500">
                  Répondez rapidement pour améliorer votre taux de réponse et votre visibilité.
                </p>
              </div>
            </div>
          )}

          {/* Messages */}
          <div className="min-h-0 flex-1 shrink overflow-y-auto overscroll-contain p-4 md:p-6">
            <p className="mb-4 text-xs font-medium text-slate-400">Aujourd&apos;hui</p>
            <div className="space-y-4">
              {messages.map((m) => {
                const isMe = m.sender_id === currentUserId;
                return (
                  <div key={m.id} className={`flex gap-3 ${isMe ? "flex-row-reverse" : ""}`}>
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-medium text-slate-600">
                      {isMe ? "M" : otherName.charAt(0)}
                    </div>
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-2 ${
                        isMe ? "bg-[#213398] text-white" : "bg-white text-black shadow-sm"
                      }`}
                    >
                      <p className="text-sm">{m.content}</p>
                      <p className={`mt-1 text-xs ${isMe ? "text-white/80" : "text-slate-500"}`}>
                        {format(new Date(m.sent_at), "HH:mm", { locale: fr })}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Zone de saisie */}
          <div className="shrink-0 border-t border-slate-200 bg-white p-4">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex gap-2"
            >
              <button
                type="button"
                className="shrink-0 rounded p-2 text-slate-500 hover:bg-slate-100"
                title="Pièce jointe (bientôt)"
              >
                <Paperclip className="h-5 w-5" />
              </button>
              <Input
                placeholder="Écrivez votre message..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="flex-1"
              />
              <Button
                type="submit"
                disabled={sending || !input.trim()}
                className="shrink-0 bg-[#213398] hover:bg-[#1a2980]"
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
            {userType === "owner" && !["replied", "accepted", "rejected"].includes(selected.demandeStatus ?? "") && (
              <div className="mt-2 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  disabled={!!statusUpdating}
                  onClick={() => handleStatusUpdate("accepted")}
                >
                  ✓ Disponible
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  disabled={!!statusUpdating}
                  onClick={() => handleStatusUpdate("rejected")}
                >
                  ✗ Indisponible
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  disabled={!!statusUpdating}
                  onClick={() => handleStatusUpdate("replied")}
                >
                  Demander précision
                </Button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );

  const hasNoConversations = threads.length === 0;

  if (hasNoConversations) {
    return (
      <div className="flex h-full min-h-0 flex-col md:h-[calc(100vh-2rem)]">
        <div className="shrink-0 border-b border-slate-200 bg-white p-4 md:p-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-black">Messagerie</h1>
          </div>
          <div className="relative mt-4">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Rechercher une conversation..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-11 rounded-xl border-slate-200 bg-slate-50 pl-10 focus-visible:bg-white"
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {(["all", "unread", "pending", "archived"] as const).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilterTab(key)}
                className={`rounded-full px-4 py-2 text-[13px] font-medium transition ${
                  filterTab === key ? "bg-[#213398] text-white" : "bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {key === "all" ? "Tous" : key === "unread" ? "Non lus" : key === "pending" ? "En attente" : "Archivés"}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center overflow-y-auto p-8">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#213398]/10">
            <MessageCircle className="h-10 w-10 text-[#213398]" />
          </div>
          <h2 className="mt-6 text-xl font-bold text-black">Aucune conversation</h2>
          <p className="mt-2 max-w-sm text-center text-slate-600">
            Vous n&apos;avez pas encore de messages. Vos conversations avec les organisateurs et propriétaires apparaîtront ici.
          </p>
          <div className="mt-6 flex flex-col items-center gap-3">
            {userType === "owner" && (
              <AddSalleButton
                className="inline-flex items-center gap-2 rounded-lg bg-[#213398] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1a2980]"
              >
                + Ajouter une annonce
              </AddSalleButton>
            )}
            {userType === "seeker" && (
              <p className="text-sm text-slate-500">
                <SearchModalButton className="font-medium text-[#213398] hover:underline cursor-pointer">
                  Parcourez les salles disponibles
                </SearchModalButton>
              </p>
            )}
          </div>
          <div className="mt-12 w-full max-w-md rounded-xl border border-slate-200 bg-slate-50/50 p-6 text-left">
            <p className="flex items-center gap-2 font-semibold text-black">
              <Lightbulb className="h-5 w-5 text-amber-500" />
              Le saviez-vous ?
            </p>
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              {userType === "seeker" ? (
                <>
                  <li className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                    Contactez plusieurs salles pour multiplier vos chances de trouver la vôtre
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                    Un message clair et détaillé facilite les réponses des propriétaires
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                    Suivez vos demandes dans l&apos;onglet « Demandes » pour ne rien manquer
                  </li>
                </>
              ) : (
                <>
                  <li className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                    Répondez rapidement pour améliorer votre taux de réponse
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                    Les propriétaires réactifs ont 3x plus de réservations
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                    Utilisez les réponses rapides pour gagner du temps
                  </li>
                </>
              )}
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col md:h-[calc(100vh-2rem)] md:flex-row">
      <div className={`flex min-h-0 flex-col md:w-[380px] ${mobileShowChat && selected ? "hidden md:flex" : ""}`}>
        {listPanel}
      </div>
      <div className={`flex min-h-0 flex-1 flex-col overflow-hidden ${!selected ? "hidden md:flex" : ""} ${!mobileShowChat && selected ? "hidden md:flex" : ""}`}>
        {chatPanel}
      </div>
    </div>
  );
}
