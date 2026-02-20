"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { MoreHorizontal, Paperclip, Send, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { getOrCreateConversation, sendMessage } from "@/app/actions/messagerie";
import { createClient } from "@/lib/supabase/client";

export type Thread = {
  demandeId: string;
  conversationId: string | null;
  seekerId: string;
  seekerName: string;
  seekerEmail: string;
  salleName: string;
  typeEvenement: string | null;
  dateDebut: string;
  lastMessageAt: string | null;
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
  pagination?: PaginationInfo | null;
};

export function MessagerieClient({ threads, currentUserId, pagination }: Props) {
  const [selected, setSelected] = useState<Thread | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const filteredThreads = threads.filter(
    (t) =>
      !search ||
      t.seekerName.toLowerCase().includes(search.toLowerCase()) ||
      t.salleName.toLowerCase().includes(search.toLowerCase())
  );

  const loadMessages = useCallback(async (convId: string) => {
    const supabase = createClient();
    const { data } = await supabase
      .from("messages")
      .select("id, sender_id, content, sent_at, read_at")
      .eq("conversation_id", convId)
      .order("sent_at", { ascending: true });
    setMessages((data as Message[]) ?? []);
  }, []);

  useEffect(() => {
    if (!selected) {
      setConversationId(null);
      setMessages([]);
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
    };
    open();
  }, [selected?.demandeId, selected?.conversationId, loadMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || !conversationId) return;
    setSending(true);
    const res = await sendMessage(conversationId, text);
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
    }
  };

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor(
      (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (diffDays === 0) return formatDistanceToNow(d, { addSuffix: false, locale: fr });
    if (diffDays === 1) return "Hier";
    if (diffDays < 7) return `Il y a ${diffDays} jours`;
    return `Il y a ${Math.floor(diffDays / 7)} sem`;
  };

  return (
    <div className="flex h-[calc(100vh-2rem)]">
      {/* Liste des conversations */}
      <div className="flex w-[380px] flex-col border-r border-slate-200 bg-white">
        <div className="border-b border-slate-200 p-4">
          <h1 className="text-xl font-bold text-slate-900">Messagerie</h1>
          <div className="mt-3 relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Rechercher une conversation"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filteredThreads.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center text-slate-500">
              <p>Aucune conversation</p>
              <p className="mt-1 text-sm">
                Les échanges liés à vos demandes apparaîtront ici.
              </p>
            </div>
          ) : (
            filteredThreads.map((t) => {
              const isSelected = selected?.demandeId === t.demandeId;
              return (
                <button
                  key={t.demandeId}
                  type="button"
                  onClick={() => setSelected(t)}
                  className={`flex w-full items-start gap-3 border-b border-slate-100 p-4 text-left transition hover:bg-slate-50 ${
                    isSelected ? "bg-[#6366f1]/10" : ""
                  }`}
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-200 text-base font-semibold text-slate-600">
                    {t.seekerName.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate font-semibold text-slate-900">
                        {t.seekerName}
                      </p>
                      <span className="shrink-0 text-xs text-slate-500">
                        {formatTime(t.lastMessageAt ?? t.dateDebut)}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-sm text-slate-600">
                      {t.salleName} • {t.typeEvenement ?? "Événement"}
                    </p>
                    <p className="mt-1 truncate text-sm text-slate-500">
                      {t.lastMessagePreview ?? "Aucun message"}
                    </p>
                    <div className="mt-1 flex gap-1">
                      {t.unreadCount > 0 && (
                        <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                          Nouveau message
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
        {pagination && (
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

      {/* Zone de chat */}
      <div className="flex flex-1 flex-col bg-slate-50">
        {!selected ? (
          <div className="flex flex-1 flex-col items-center justify-center text-slate-500">
            <p className="text-lg font-medium">Sélectionnez une conversation</p>
            <p className="mt-1 text-sm">
              Ou démarrez un échange depuis une demande reçue
            </p>
          </div>
        ) : (
          <>
            {/* En-tête du chat */}
            <div className="flex items-center gap-4 border-b border-slate-200 bg-white px-6 py-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-200 text-base font-semibold text-slate-600">
                {selected.seekerName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-slate-900">{selected.seekerName}</p>
                <p className="text-sm text-slate-600">
                  {selected.typeEvenement ?? "Événement"} • {selected.dateDebut}
                </p>
              </div>
              <div className="flex items-center gap-2 text-sm text-emerald-600">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                En ligne
              </div>
              <button
                type="button"
                className="rounded p-2 text-slate-500 hover:bg-slate-100"
              >
                <MoreHorizontal className="h-5 w-5" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-4">
                {messages.map((m) => {
                  const isMe = m.sender_id === currentUserId;
                  return (
                    <div
                      key={m.id}
                      className={`flex gap-3 ${isMe ? "flex-row-reverse" : ""}`}
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-medium text-slate-600">
                        {isMe ? "M" : selected.seekerName.charAt(0)}
                      </div>
                      <div
                        className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                          isMe
                            ? "bg-[#6366f1] text-white"
                            : "bg-white text-slate-800 shadow-sm"
                        }`}
                      >
                        <p className="text-sm">{m.content}</p>
                        <p
                          className={`mt-1 text-xs ${
                            isMe ? "text-white/80" : "text-slate-500"
                          }`}
                        >
                          {format(new Date(m.sent_at), "d MMM à HH:mm", {
                            locale: fr,
                          })}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Zone de saisie */}
            <div className="border-t border-slate-200 bg-white p-4">
              <div className="flex gap-3">
                <button
                  type="button"
                  className="shrink-0 rounded p-2 text-slate-500 hover:bg-slate-100"
                >
                  <Paperclip className="h-5 w-5" />
                </button>
                <Input
                  placeholder="Écrire un message..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  className="flex-1"
                />
                <Button
                  onClick={handleSend}
                  disabled={sending || !input.trim()}
                  className="bg-[#6366f1] hover:bg-[#4f46e5]"
                >
                  <Send className="mr-2 h-4 w-4" />
                  Envoyer
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
