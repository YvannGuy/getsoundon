"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Archive, Banknote, Check, ChevronDown, ChevronLeft, FileText, Lightbulb, MessageCircle, MoreVertical, Paperclip, Pencil, RotateCcw, Send, Search, Trash2, X } from "lucide-react";

import { updateDemandeStatusAction } from "@/app/actions/demande-owner";
import { markExpiredOffersAction } from "@/app/actions/offers";
import {
  archiveConversation,
  deleteConversation,
  deleteMessage,
  editMessage,
  getLastMessagePreviews,
  getOrCreateConversation,
  getOrCreateConversationForVisite,
  markConversationAsRead,
  sendMessage,
  sendMessageWithAttachments,
  unarchiveConversation,
} from "@/app/actions/messagerie";
import { CreateOfferModal } from "@/components/messagerie/create-offer-modal";
import { OfferCard } from "@/components/messagerie/offer-card";
import { AddSalleButton } from "@/components/proprietaire/add-salle-modal";
import { SearchModalButton } from "@/components/search/search-modal";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Pagination } from "@/components/ui/pagination";
import { createClient } from "@/lib/supabase/client";

export type Thread = {
  demandeId: string;
  /** Pour les threads issus d'une demande de visite (synthetic demandeId = "visite-{id}") */
  demandeVisiteId?: string;
  conversationId: string | null;
  seekerId: string;
  seekerName: string;
  seekerEmail: string;
  salleId?: string;
  salleName: string;
  salleImage?: string;
  salleCity?: string;
  salleCapacity?: number | null;
  salleSlug?: string;
  hasContract?: boolean;
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
  /** Préférences utilisateur : archivé / supprimé */
  archivedAt?: string | null;
  deletedAt?: string | null;
};

type MessageAttachment = {
  id: string;
  storage_path: string;
  filename: string;
  mime_type: string | null;
};

type Message = {
  id: string;
  sender_id: string;
  content: string;
  sent_at: string;
  read_at: string | null;
  edited_at?: string | null;
  attachments?: MessageAttachment[];
};

type FilterTab = "all" | "unread" | "pending" | "archived";

type PaginationInfo = {
  baseUrl: string;
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
};

const FILTER_TAB_LABELS: Record<FilterTab, string> = {
  all: "Tous",
  unread: "Non lus",
  pending: "En attente",
  archived: "Archivés",
};

function getInitials(fullName: string): string {
  const parts = String(fullName || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

/** Affiche un temps relatif sans erreur d'hydratation (calcul uniquement côté client après mount). */
function RelativeTime({ dateStr }: { dateStr: string | null }) {
  const [display, setDisplay] = useState<string>("");

  useEffect(() => {
    if (!dateStr) {
      setDisplay("");
      return;
    }
    const d = new Date(dateStr);
    const diffMs = Date.now() - d.getTime();
    if (Number.isNaN(diffMs) || diffMs < 0) {
      setDisplay("");
      return;
    }
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 60) setDisplay(`Il y a ${diffMins}min`);
    else if (diffHours < 24) setDisplay(`Il y a ${diffHours}h`);
    else if (diffDays === 1) setDisplay("Hier");
    else if (diffDays < 7) setDisplay(`${diffDays} jours`);
    else if (diffDays < 14) setDisplay("1 sem");
    else setDisplay(`${Math.floor(diffDays / 7)} sem`);
  }, [dateStr]);

  return <span>{display}</span>;
}

type Props = {
  threads: Thread[];
  currentUserId: string;
  currentUserFullName?: string | null;
  userType: "seeker" | "owner";
  pagination?: PaginationInfo | null;
  /** Quand défini, ouvre automatiquement la conversation correspondante */
  initialDemandeId?: string | null;
  /** Ouvre directement le thread ayant cette conversationId (priorité sur initialDemandeId) */
  initialConversationId?: string | null;
  /** Propriétaire : peut envoyer des offres (Connect activé) */
  hasConnectAccount?: boolean;
  /** offer=paid ou offer=cancel au retour de Stripe */
  offerReturnStatus?: string | null;
  /** Texte à pré-remplir dans la zone de saisie (ex: contact visite) */
  initialComposerText?: string | null;
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

type OfferItem = {
  id: string;
  owner_id: string;
  salle_id?: string;
  amount_cents: number;
  payment_mode?: "full" | "split";
  upfront_amount_cents?: number;
  balance_amount_cents?: number;
  balance_due_at?: string | null;
  payment_plan_status?:
    | "pending_deposit"
    | "deposit_paid"
    | "balance_scheduled"
    | "balance_paid"
    | "balance_failed"
    | "fully_paid"
    | "expired_unpaid";
  deposit_amount_cents?: number;
  service_fee_cents?: number;
  deposit_refunded_cents?: number;
  deposit_status?: "none" | "held" | "partially_refunded" | "refunded";
  deposit_hold_status?: string;
  expires_at: string;
  status: "pending" | "paid" | "refused" | "expired";
  message: string | null;
  event_type?: string | null;
  date_debut?: string | null;
  date_fin?: string | null;
  created_at: string;
  contract_path?: string | null;
};

export function MessagerieClient({
  threads,
  currentUserId,
  currentUserFullName,
  userType,
  pagination,
  initialDemandeId,
  initialConversationId,
  hasConnectAccount = false,
  offerReturnStatus,
  initialComposerText,
}: Props) {
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
  const [detailsClosedDefinitively, setDetailsClosedDefinitively] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(true);
  const [mobileShowChat, setMobileShowChat] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [offers, setOffers] = useState<OfferItem[]>([]);
  const [createOfferModalOpen, setCreateOfferModalOpen] = useState(false);
  const [offerBannerDismissed, setOfferBannerDismissed] = useState(false);
  const [threadPreferences, setThreadPreferences] = useState<Map<string, { archivedAt?: string | null; deletedAt?: string | null }>>(new Map());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const prefillAppliedRef = useRef(false);

  const getThreadArchived = (t: Thread) => threadPreferences.get(t.demandeId)?.archivedAt ?? t.archivedAt;
  const getThreadDeleted = (t: Thread) => threadPreferences.get(t.demandeId)?.deletedAt ?? t.deletedAt;

  const filteredBySearch = threads.filter(
    (t) =>
      !search ||
      t.seekerName.toLowerCase().includes(search.toLowerCase()) ||
      t.salleName.toLowerCase().includes(search.toLowerCase())
  );

  const filteredThreads = filteredBySearch.filter((t) => {
    const isArchived = !!getThreadArchived(t);
    const isDeleted = !!getThreadDeleted(t);
    if (isDeleted) return false;
    if (filterTab === "all") return !isArchived;
    if (filterTab === "unread") return !isArchived && t.unreadCount > 0;
    if (filterTab === "pending") return !isArchived && ["sent", "viewed"].includes(t.demandeStatus ?? "sent");
    if (filterTab === "archived") return isArchived;
    return true;
  });

  const selectedHiddenByFilters =
    !!selected &&
    !filteredThreads.some(
      (t) =>
        t.demandeId === selected.demandeId ||
        (!!selected.conversationId && t.conversationId === selected.conversationId)
    );

  const selectedVisibleThread =
    selectedHiddenByFilters && !getThreadDeleted(selected) ? selected : null;

  const threadsForList = selectedVisibleThread
    ? [selectedVisibleThread, ...filteredThreads]
    : filteredThreads;

  const loadMessages = useCallback(async (convId: string) => {
    const supabase = createClient();
    const { data } = await supabase
      .from("messages")
      .select("id, sender_id, content, sent_at, read_at, edited_at")
      .eq("conversation_id", convId)
      .is("deleted_at", null)
      .order("sent_at", { ascending: true });
    let msgs: Message[];
    if (!data?.length) {
      const { data: alt } = await supabase
        .from("messages")
        .select("id, sender_id, content, created_at, read_at, edited_at")
        .eq("conversation_id", convId)
        .is("deleted_at", null)
        .order("created_at", { ascending: true });
      msgs = (alt ?? []).map((m) => ({
        id: m.id,
        sender_id: m.sender_id,
        content: m.content,
        sent_at: (m as { created_at?: string }).created_at ?? new Date().toISOString(),
        read_at: m.read_at,
        edited_at: (m as { edited_at?: string | null }).edited_at ?? null,
      })) as Message[];
    } else {
      msgs = data.map((m) => ({
        ...m,
        edited_at: (m as { edited_at?: string | null }).edited_at ?? null,
      })) as Message[];
    }

    const msgIds = msgs.map((m) => m.id);
    let attachmentsByMsg = new Map<string, MessageAttachment[]>();
    if (msgIds.length > 0) {
      const { data: att } = await supabase
        .from("message_attachments")
        .select("id, message_id, storage_path, filename, mime_type")
        .in("message_id", msgIds);
      if (att?.length) {
        for (const a of att as { id: string; message_id: string; storage_path: string; filename: string; mime_type: string | null }[]) {
          const list = attachmentsByMsg.get(a.message_id) ?? [];
          list.push({
            id: a.id,
            storage_path: a.storage_path,
            filename: a.filename,
            mime_type: a.mime_type,
          });
          attachmentsByMsg.set(a.message_id, list);
        }
      }
    }

    const withAttachments = msgs.map((m) => ({
      ...m,
      attachments: attachmentsByMsg.get(m.id) ?? [],
    }));
    setMessages(withAttachments);

    await markExpiredOffersAction(convId);

    const { data: offersData } = await supabase
      .from("offers")
      .select("id, owner_id, salle_id, amount_cents, payment_mode, upfront_amount_cents, balance_amount_cents, balance_due_at, payment_plan_status, deposit_amount_cents, service_fee_cents, deposit_refunded_cents, deposit_status, deposit_hold_status, expires_at, status, message, event_type, date_debut, date_fin, created_at, contract_path")
      .eq("conversation_id", convId)
      .order("created_at", { ascending: true });
    setOffers((offersData ?? []) as OfferItem[]);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined" && localStorage.getItem("messagerie_details_closed") === "1") {
      setDetailsClosedDefinitively(true);
    }
  }, []);

  useEffect(() => {
    if (selected && userType === "owner" && !detailsClosedDefinitively) {
      const neverAutoExpand = typeof window !== "undefined" && localStorage.getItem("messagerie_details_auto_expanded") === "1";
      setDetailsOpen(!neverAutoExpand);
    }
  }, [selected?.demandeId, userType, detailsClosedDefinitively]);

  useEffect(() => {
    if (initialConversationId) {
      const t = threads.find((x) => x.conversationId === initialConversationId);
      if (t) setSelected(t);
    } else if (initialDemandeId) {
      const t = threads.find((x) => x.demandeId === initialDemandeId);
      if (t) setSelected(t);
    }
  }, [initialDemandeId, initialConversationId, threads]);

  useEffect(() => {
    const fromThreads = new Map<string, string>();
    for (const t of threads) {
      const preview = t.lastMessagePreview ?? t.message;
      if (preview && String(preview).trim()) {
        const text = String(preview).trim();
        fromThreads.set(t.demandeId, text.length > 80 ? text.slice(0, 77) + "..." : text);
      }
    }
    if (fromThreads.size) {
      setLastPreviews((prev) => new Map([...prev, ...fromThreads]));
    }
  }, [threads]);

  useEffect(() => {
    const toFetch = threads
      .filter((t) => t.conversationId)
      .map((t) => ({ demandeId: t.demandeId, conversationId: t.conversationId! }));
    if (toFetch.length === 0) return;
    (async () => {
      const previews = await getLastMessagePreviews(toFetch);
      if (Object.keys(previews).length) {
        setLastPreviews((prev) => new Map([...prev, ...Object.entries(previews)]));
      }
    })();
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
      setOffers([]);
      setMobileShowChat(false);
      return;
    }
    const open = async () => {
      let convId = selected.conversationId;
      if (!convId) {
        const res = selected.demandeVisiteId
          ? await getOrCreateConversationForVisite(selected.demandeVisiteId)
          : await getOrCreateConversation(selected.demandeId);
        if (res.conversationId) {
          convId = res.conversationId;
          setConversationId(convId);
        }
      } else {
        setConversationId(convId);
      }
      if (convId) {
        loadMessages(convId);
        await markConversationAsRead(convId);
        router.refresh();
      }
      setMobileShowChat(true);
    };
    open();
  }, [selected?.demandeId, selected?.demandeVisiteId, selected?.conversationId, loadMessages]);

  useEffect(() => {
    if (prefillAppliedRef.current) return;
    if (!initialComposerText || !initialComposerText.trim()) return;
    if (!selected) return;
    if (input.trim()) return;
    setInput(initialComposerText.trim());
    prefillAppliedRef.current = true;
  }, [initialComposerText, selected?.demandeId, input]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    const hasFiles = selectedFiles.length > 0;
    if ((!text && !hasFiles) || !selected) return;

    let convId: string | null = conversationId;
    if (!convId) {
      const cres = selected.demandeVisiteId
        ? await getOrCreateConversationForVisite(selected.demandeVisiteId)
        : await getOrCreateConversation(selected.demandeId);
      if (!cres.conversationId) {
        alert(cres.error ?? "Impossible de créer la conversation.");
        return;
      }
      convId = cres.conversationId;
      setConversationId(convId);
    }
    if (!convId) return;

    setSending(true);
    let res: { success: boolean; error?: string };

    if (hasFiles) {
      const formData = new FormData();
      formData.set("conversationId", convId);
      formData.set("content", text);
      selectedFiles.forEach((f) => formData.append("attachments", f));
      res = await sendMessageWithAttachments(formData);
    } else {
      res = await sendMessage(convId, text);
    }

    setSending(false);

    if (res.success) {
      setInput("");
      setSelectedFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = "";

      if (!hasFiles) {
        const newMsg: Message = {
          id: crypto.randomUUID(),
          sender_id: currentUserId,
          content: text,
          sent_at: new Date().toISOString(),
          read_at: null,
        };
        setMessages((prev) => [...prev, newMsg]);
      } else {
        loadMessages(convId);
      }
      if (selected) {
        const preview = text.length > 80 ? text.slice(0, 77) + "..." : text || "[Pièce(s) jointe(s)]";
        setLastPreviews((prev) => new Map(prev).set(selected.demandeId, preview));
      }
      router.refresh();
    } else if (res.error) {
      alert(res.error);
    }
  };

  const handleEditMessage = async () => {
    if (!editingMessage) return;
    setEditSaving(true);
    const res = await editMessage(editingMessage.id, editContent);
    setEditSaving(false);
    if (res.success) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === editingMessage.id
            ? { ...m, content: editContent, edited_at: new Date().toISOString() }
            : m
        )
      );
      setEditModalOpen(false);
      setEditingMessage(null);
      setEditContent("");
      router.refresh();
    } else if (res.error) {
      alert(res.error);
    }
  };

  const handleArchiveConversation = async (t: Thread) => {
    let convId = t.conversationId;
    if (!convId) {
      const cres = t.demandeVisiteId
        ? await getOrCreateConversationForVisite(t.demandeVisiteId)
        : await getOrCreateConversation(t.demandeId);
      if (!cres.conversationId) {
        alert(cres.error ?? "Impossible de créer la conversation.");
        return;
      }
      convId = cres.conversationId;
    }
    const res = await archiveConversation(convId!);
    if (res.success) {
      setThreadPreferences((prev) => new Map(prev).set(t.demandeId, { archivedAt: new Date().toISOString(), deletedAt: null }));
      router.refresh();
    } else if (res.error) alert(res.error);
  };

  const handleUnarchiveConversation = async (t: Thread) => {
    let convId = t.conversationId;
    if (!convId) {
      const cres = t.demandeVisiteId
        ? await getOrCreateConversationForVisite(t.demandeVisiteId)
        : await getOrCreateConversation(t.demandeId);
      if (!cres.conversationId) return;
      convId = cres.conversationId;
    }
    if (!convId) return;
    const res = await unarchiveConversation(convId);
    if (res.success) {
      setThreadPreferences((prev) => new Map(prev).set(t.demandeId, { archivedAt: null, deletedAt: null }));
      router.refresh();
    } else if (res.error) alert(res.error);
  };

  const handleDeleteConversation = async (t: Thread) => {
    let convId = t.conversationId;
    if (!convId) {
      const cres = t.demandeVisiteId
        ? await getOrCreateConversationForVisite(t.demandeVisiteId)
        : await getOrCreateConversation(t.demandeId);
      if (!cres.conversationId) return;
      convId = cres.conversationId;
    }
    if (!convId || !confirm("Supprimer définitivement cette conversation ? Elle réapparaîtra si l'autre personne vous écrit.")) return;
    const res = await deleteConversation(convId);
    if (res.success) {
      setThreadPreferences((prev) => new Map(prev).set(t.demandeId, { archivedAt: null, deletedAt: new Date().toISOString() }));
      if (selected?.demandeId === t.demandeId) {
        setSelected(null);
        setConversationId(null);
        setMessages([]);
        setMobileShowChat(false);
      }
      router.refresh();
    } else if (res.error) alert(res.error);
  };

  const handleDeleteMessage = async (m: Message) => {
    if (!confirm("Supprimer ce message ?")) return;
    const res = await deleteMessage(m.id);
    if (res.success) {
      setMessages((prev) => prev.filter((x) => x.id !== m.id));
      if (selected) {
        const remaining = messages.filter((x) => x.id !== m.id);
        const last = remaining[remaining.length - 1];
        if (last) {
          const preview = last.content.length > 80 ? last.content.slice(0, 77) + "..." : last.content;
          setLastPreviews((prev) => new Map(prev).set(selected.demandeId, preview));
        }
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

  const hasPendingOffer = offers.some((o) => o.status === "pending");
  const canSendOffer =
    userType === "owner" &&
    hasConnectAccount &&
    ["replied", "accepted"].includes(selected?.demandeStatus ?? "") &&
    !hasPendingOffer &&
    !!selected?.salleId &&
    !!selected?.hasContract;

  const handleAcceptAndPay = async (offerId: string) => {
    try {
      const res = await fetch("/api/stripe/checkout-offer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ offerId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur");
      if (data.url) window.location.href = data.url;
    } catch (e) {
      alert((e as Error).message ?? "Erreur lors du paiement.");
    }
  };

  type TimelineItem = { type: "message"; data: Message } | { type: "offer"; data: OfferItem };
  const timelineItems: TimelineItem[] = [
    ...messages.map((m) => ({ type: "message" as const, data: m })),
    ...offers.map((o) => ({ type: "offer" as const, data: o })),
  ].sort((a, b) => {
    const aTime = a.type === "message" ? a.data.sent_at : a.data.created_at;
    const bTime = b.type === "message" ? b.data.sent_at : b.data.created_at;
    return new Date(aTime).getTime() - new Date(bTime).getTime();
  });

  const otherName = selected?.seekerName ?? "";
  const myInitials = getInitials(currentUserFullName ?? "") || "?";
  const otherInitials = getInitials(otherName) || "?";
  const statusTag = STATUS_TAG[selected?.demandeStatus ?? "sent"] ?? STATUS_TAG.sent;

  const listPanel = (
    <div className="flex min-h-0 w-full flex-1 flex-col border-r-0 border-slate-200 bg-white md:w-[380px] md:border-r-2 md:border-slate-300 md:shrink-0">
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
        <div className="mt-3 -mx-4 overflow-x-auto px-4">
          <div className="flex min-w-max gap-2 pb-1">
            {(["all", "unread", "pending", "archived"] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilterTab(key)}
              className={`h-11 rounded-full px-4 text-[13px] font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#213398]/40 ${
                filterTab === key
                  ? "bg-[#213398] text-white"
                  : "bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {FILTER_TAB_LABELS[key]}
            </button>
            ))}
          </div>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {selectedHiddenByFilters && selectedVisibleThread && (
          <div className="border-b border-sky-100 bg-sky-50 px-4 py-2 text-xs text-sky-700">
            Conversation sélectionnée affichée malgré le filtre actif.
          </div>
        )}
        {threadsForList.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#213398]/10">
              <MessageCircle className="h-10 w-10 text-[#213398]" />
            </div>
            <h2 className="mt-6 text-xl font-bold text-black">Aucune conversation</h2>
            <p className="mt-2 max-w-sm text-slate-600">
              Vous n&apos;avez pas encore de messages. Vos conversations avec les locataires et propriétaires apparaîtront ici.
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
          threadsForList.map((t) => {
            const isSelected = selected?.demandeId === t.demandeId;
            const isArchivedTab = filterTab === "archived";
            return (
              <div
                key={t.demandeId}
                className={`group flex w-full items-start gap-4 border-b border-slate-100 p-4 transition hover:bg-slate-50 ${
                  isSelected ? "bg-[#213398]/5" : ""
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    setSelected(t);
                    setMobileShowChat(true);
                  }}
                  className="flex min-w-0 flex-1 items-start gap-4 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#213398]/40"
                >
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-slate-200">
                    <Image src={t.salleImage ?? "/img.png"} alt="" fill className="object-cover" sizes="56px" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="truncate font-semibold text-black">{t.salleName}</p>
                      <div className="flex shrink-0 items-center gap-2">
                        {t.unreadCount > 0 && (
                          <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#213398] px-1.5 text-[11px] font-semibold text-white">
                            {t.unreadCount > 99 ? "99+" : t.unreadCount}
                          </span>
                        )}
                        <span className="text-xs text-slate-500"><RelativeTime dateStr={t.lastMessageAt ?? t.createdAt ?? null} /></span>
                      </div>
                    </div>
                    <p className="mt-0.5 truncate text-sm text-slate-600">
                      {t.seekerName} • {t.contactRole ?? (userType === "seeker" ? "Propriétaire" : "Organisateur")}
                    </p>
                    <div className="mt-1">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_TAG[t.demandeStatus ?? "sent"]?.className ?? STATUS_TAG.sent.className}`}>
                        {STATUS_TAG[t.demandeStatus ?? "sent"]?.label ?? STATUS_TAG.sent.label}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-1 text-sm text-slate-500">
                      {(lastPreviews.get(t.demandeId) ?? t.lastMessagePreview ?? t.message) || "Aucun message"}
                    </p>
                  </div>
                </button>
                <Popover>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        onClick={(e) => e.stopPropagation()}
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-200 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#213398]/40"
                        aria-label="Options de la conversation"
                      >
                        <MoreVertical className="h-5 w-5" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-48 p-1" align="end" onClick={(e) => e.stopPropagation()}>
                      {isArchivedTab ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleUnarchiveConversation(t)}
                            className="flex w-full items-center gap-2 rounded px-2 py-2 text-sm hover:bg-slate-100"
                          >
                            <RotateCcw className="h-4 w-4" />
                            Relancer
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteConversation(t)}
                            className="flex w-full items-center gap-2 rounded px-2 py-2 text-sm text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                            Supprimer définitivement
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleArchiveConversation(t)}
                          className="flex w-full items-center gap-2 rounded px-2 py-2 text-sm hover:bg-slate-100"
                        >
                          <Archive className="h-4 w-4" />
                          Archiver
                        </button>
                      )}
                    </PopoverContent>
                  </Popover>
              </div>
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
            <span className={`hidden rounded-full px-2 py-1 text-xs font-medium sm:inline-flex ${statusTag.className}`}>
              {statusTag.label}
            </span>
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

          {offerReturnStatus === "paid" && !offerBannerDismissed && (
            <div className="flex items-center justify-between gap-3 border-b border-emerald-200 bg-emerald-50 px-4 py-3">
              <p className="text-sm font-medium text-emerald-800">Paiement effectué !</p>
              <button
                type="button"
                onClick={() => {
                  setOfferBannerDismissed(true);
                  const base = userType === "seeker" ? "/dashboard/messagerie" : "/proprietaire/messagerie";
                  router.replace(base + (selected ? `?demandeId=${selected.demandeId}` : ""), { scroll: false });
                }}
                className="text-emerald-600 hover:text-emerald-800"
                aria-label="Fermer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
          {offerReturnStatus === "cancel" && !offerBannerDismissed && (
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-sm text-slate-600">Paiement annulé.</p>
              <button
                type="button"
                onClick={() => {
                  setOfferBannerDismissed(true);
                  const base = userType === "seeker" ? "/dashboard/messagerie" : "/proprietaire/messagerie";
                  router.replace(base + (selected ? `?demandeId=${selected.demandeId}` : ""), { scroll: false });
                }}
                className="text-slate-500 hover:text-slate-700"
                aria-label="Fermer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Bouton pour réafficher les détails (si fermés définitivement) */}
          {userType === "owner" && detailsClosedDefinitively && selected && (
            <div className="shrink-0 border-b border-slate-200 bg-white px-4 py-2 md:px-6">
              <Button
                variant="outline"
                size="sm"
                className="text-[#213398] border-[#213398]/40 hover:bg-[#213398]/5"
                onClick={() => {
                  if (typeof window !== "undefined") {
                    localStorage.removeItem("messagerie_details_closed");
                    localStorage.removeItem("messagerie_details_auto_expanded");
                  }
                  setDetailsClosedDefinitively(false);
                  setDetailsOpen(true);
                }}
              >
                <Paperclip className="mr-2 h-4 w-4" />
                Afficher les détails de la demande
              </Button>
            </div>
          )}
          {/* Détails de la demande (propriétaire) */}
          {userType === "owner" && !detailsClosedDefinitively && (
            <div className="shrink-0 border-b border-slate-200 bg-white px-4 py-3 md:px-6">
              <div className="rounded-xl border-2 border-[#213398]/30 bg-white p-4">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const next = !detailsOpen;
                      setDetailsOpen(next);
                      if (!next) {
                        localStorage.setItem("messagerie_details_auto_expanded", "1");
                      }
                    }}
                    className="flex min-w-0 flex-1 items-center justify-between text-left"
                  >
                    <span className="flex items-center gap-2 font-semibold text-black">
                      <Paperclip className="h-4 w-4 text-[#213398]" />
                      Détails de la demande
                    </span>
                    <ChevronDown className={`h-5 w-5 shrink-0 text-slate-500 transition ${detailsOpen ? "rotate-180" : ""}`} />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      localStorage.setItem("messagerie_details_closed", "1");
                      setDetailsClosedDefinitively(true);
                    }}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-red-600 transition hover:bg-red-50"
                    aria-label="Fermer définitivement"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
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
                        <dt className="text-xs font-medium text-slate-500">Message du locataire</dt>
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
                {detailsOpen && canSendOffer && (
                  <div className="mt-4 border-t border-slate-100 pt-3">
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-[#213398]/50 text-[#213398] hover:bg-[#213398]/5"
                      onClick={() => setCreateOfferModalOpen(true)}
                    >
                      <Banknote className="mr-2 h-4 w-4" />
                      Envoyer une offre
                    </Button>
                  </div>
                )}
                <p className="mt-3 text-xs text-slate-500">
                  Répondez rapidement pour améliorer votre taux de réponse et votre visibilité.
                </p>
              </div>
            </div>
          )}

          {/* Messages & Offres */}
          <div className="min-h-0 flex-1 shrink overflow-y-auto overscroll-contain p-4 md:p-6">
            <p className="mb-4 text-xs font-medium text-slate-400">Aujourd&apos;hui</p>
            <div className="space-y-4">
              {timelineItems.map((item) => {
                if (item.type === "offer") {
                  return (
                    <div key={`offer-${item.data.id}`} className="flex">
                      <OfferCard
                        offer={item.data}
                        userType={userType}
                        currentUserId={currentUserId}
                        onAcceptAndPay={handleAcceptAndPay}
                        onRefused={() => {
                          setOffers((prev) =>
                            prev.map((o) => (o.id === item.data.id ? { ...o, status: "refused" as const } : o))
                          );
                          router.refresh();
                        }}
                        onNewOffer={() => setCreateOfferModalOpen(true)}
                      />
                    </div>
                  );
                }
                const m = item.data;
                const isMe = m.sender_id === currentUserId;
                return (
                  <div key={m.id} className={`flex gap-3 ${isMe ? "flex-row-reverse" : ""}`}>
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-medium text-slate-600">
                      {isMe ? myInitials : otherInitials}
                    </div>
                    <div
                      className={`group relative max-w-[85%] rounded-2xl px-4 py-2 ${
                        isMe ? "bg-[#213398] text-white" : "bg-white text-black shadow-sm"
                      }`}
                    >
                      {isMe && (
                        <Popover>
                          <PopoverTrigger asChild>
                            <button
                              type="button"
                              className="absolute -right-1 -top-1 rounded p-1 opacity-0 transition hover:bg-black/10 group-hover:opacity-100"
                              aria-label="Options"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-40 p-1" align="end">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingMessage(m);
                                setEditContent(m.content && m.content !== "[Pièce(s) jointe(s)]" ? m.content : "");
                                setEditModalOpen(true);
                              }}
                              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-slate-100"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              Modifier
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteMessage(m)}
                              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Supprimer
                            </button>
                          </PopoverContent>
                        </Popover>
                      )}
                      {m.content && m.content !== "[Pièce(s) jointe(s)]" && (
                        <p className="text-sm">{m.content}</p>
                      )}
                      {m.attachments && m.attachments.length > 0 && (
                        <div className="mt-2 space-y-2">
                          {m.attachments.map((a) => {
                            const url = `/api/messagerie/attachment?path=${encodeURIComponent(a.storage_path)}`;
                            const isImage = a.mime_type?.startsWith("image/");
                            return (
                              <div key={a.id}>
                                {isImage ? (
                                  <a href={url} target="_blank" rel="noopener noreferrer" className="block">
                                    <img
                                      src={url}
                                      alt={a.filename}
                                      className="max-h-48 rounded-lg object-cover"
                                    />
                                  </a>
                                ) : (
                                  <a
                                    href={url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`inline-flex items-center gap-1 rounded border px-2 py-1 text-xs ${isMe ? "border-white/50 text-white hover:bg-white/10" : "border-slate-300 text-slate-700 hover:bg-slate-50"}`}
                                  >
                                    <Paperclip className="h-3 w-3" />
                                    {a.filename}
                                  </a>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                      <p className={`mt-1 text-xs ${isMe ? "text-white/80" : "text-slate-500"}`}>
                        {format(new Date(m.sent_at), "HH:mm", { locale: fr })}
                        {m.edited_at && (
                          <span className="ml-1 italic">(modifié)</span>
                        )}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Zone de saisie */}
          <div className="shrink-0 border-t border-slate-200 bg-white p-4 pb-[calc(env(safe-area-inset-bottom)+0.5rem)]">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex flex-col gap-2"
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
                className="hidden"
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? []);
                  setSelectedFiles((prev) => [...prev, ...files].slice(-5));
                }}
              />
              {selectedFiles.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedFiles.map((f, i) => (
                    <span
                      key={i}
                      className="flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-xs text-slate-700"
                    >
                      {f.name}
                      <button
                        type="button"
                        onClick={() => setSelectedFiles((prev) => prev.filter((_, idx) => idx !== i))}
                        className="text-slate-500 hover:text-slate-700"
                        aria-label="Retirer"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#213398]/40"
                  title="Ajouter une pièce jointe"
                  aria-label="Ajouter une pièce jointe"
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
                  disabled={sending || (!input.trim() && selectedFiles.length === 0)}
                  className="h-11 shrink-0 bg-[#213398] hover:bg-[#1a2980]"
                  aria-label="Envoyer le message"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </form>
            {userType === "owner" && !["replied", "accepted", "rejected"].includes(selected.demandeStatus ?? "") && (
              <div className="mt-2 flex flex-wrap gap-2 md:hidden">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-9 text-xs"
                  disabled={!!statusUpdating}
                  onClick={() => handleStatusUpdate("accepted")}
                >
                  ✓ Disponible
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-9 text-xs"
                  disabled={!!statusUpdating}
                  onClick={() => handleStatusUpdate("rejected")}
                >
                  ✗ Indisponible
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-9 text-xs"
                  disabled={!!statusUpdating}
                  onClick={() => handleStatusUpdate("replied")}
                >
                  Demander précision
                </Button>
              </div>
            )}
            {canSendOffer && (
              <div className="mt-2 flex flex-wrap gap-2 md:hidden">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-9 text-xs border-[#213398]/50 text-[#213398] hover:bg-[#213398]/5"
                  onClick={() => setCreateOfferModalOpen(true)}
                >
                  <Banknote className="mr-1.5 h-3.5 w-3.5" />
                  Envoyer une offre
                </Button>
              </div>
            )}
            {userType === "owner" &&
              !hasConnectAccount &&
              ["replied", "accepted"].includes(selected?.demandeStatus ?? "") &&
              !hasPendingOffer &&
              !!selected?.salleId && (
              <div className="mt-2">
                <Link
                  href="/proprietaire/paiement#recevoir-paiements"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 hover:bg-amber-100"
                >
                  <Banknote className="h-3.5 w-3.5" />
                  Activez les paiements pour envoyer une offre
                </Link>
              </div>
            )}
            {userType === "owner" &&
              hasConnectAccount &&
              !selected?.hasContract &&
              ["replied", "accepted"].includes(selected?.demandeStatus ?? "") &&
              !hasPendingOffer &&
              !!selected?.salleId && (
              <div className="mt-2">
                <Link
                  href="/proprietaire/contrat"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 hover:bg-amber-100"
                >
                  <FileText className="h-3.5 w-3.5" />
                  Téléchargez votre contrat pour envoyer une offre
                </Link>
              </div>
            )}
          </div>

          {selected && conversationId && selected.salleId && (
            <CreateOfferModal
              open={createOfferModalOpen}
              onOpenChange={setCreateOfferModalOpen}
              conversationId={conversationId}
              demandeId={selected.demandeId}
              salleId={selected.salleId}
              seekerId={selected.seekerId}
              onSuccess={() => {
                loadMessages(conversationId);
                router.refresh();
              }}
            />
          )}

          <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
            <DialogContent showClose={true}>
              <DialogHeader>
                <DialogTitle>Modifier le message</DialogTitle>
              </DialogHeader>
              <div className="py-2">
                <Input
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  placeholder="Votre message..."
                  className="min-h-[80px]"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleEditMessage();
                    }
                  }}
                />
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditModalOpen(false);
                    setEditingMessage(null);
                    setEditContent("");
                  }}
                >
                  Annuler
                </Button>
                <Button
                  onClick={handleEditMessage}
                  disabled={editSaving || !editContent.trim()}
                  className="bg-[#213398] hover:bg-[#1a2980]"
                >
                  {editSaving ? "Enregistrement…" : "Enregistrer"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );

  const hasNoConversations = threads.length === 0;

  if (hasNoConversations) {
    return (
      <div className="flex h-full min-h-0 flex-col">
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
          <div className="mt-3 -mx-4 overflow-x-auto px-4">
            <div className="flex min-w-max gap-2 pb-1">
              {(["all", "unread", "pending", "archived"] as const).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilterTab(key)}
                className={`h-11 rounded-full px-4 text-[13px] font-medium transition ${
                  filterTab === key ? "bg-[#213398] text-white" : "bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {FILTER_TAB_LABELS[key]}
              </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center overflow-y-auto p-8">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#213398]/10">
            <MessageCircle className="h-10 w-10 text-[#213398]" />
          </div>
          <h2 className="mt-6 text-xl font-bold text-black">Aucune conversation</h2>
          <p className="mt-2 max-w-sm text-center text-slate-600">
            Vous n&apos;avez pas encore de messages. Vos conversations avec les locataires et propriétaires apparaîtront ici.
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
    <div className="flex h-full min-h-0 flex-col md:flex-row">
      <div className={`flex min-h-0 flex-col md:w-[380px] ${mobileShowChat && selected ? "hidden md:flex" : ""}`}>
        {listPanel}
      </div>
      <div className={`flex min-h-0 flex-1 flex-col overflow-hidden ${!selected ? "hidden md:flex" : ""} ${!mobileShowChat && selected ? "hidden md:flex" : ""}`}>
        {chatPanel}
      </div>
    </div>
  );
}
