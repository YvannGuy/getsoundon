"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, MessageCircle, Send } from "lucide-react";

type ChatMessage = {
  id: string;
  sender_id: string;
  sender_name: string;
  content: string;
  created_at: string;
  is_me: boolean;
};

type Props = {
  bookingId: string;
  /** Label affiché dans le header, ex: "Prestataire" ou "Locataire" */
  otherPartyLabel: string;
};

function fmtTime(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) +
      " à " +
      d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}

export function BookingChat({ bookingId, otherPartyLabel }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/messages?bookingId=${bookingId}&limit=100`, {
        cache: "no-store",
      });
      if (!res.ok) return;
      const json = (await res.json()) as { data?: ChatMessage[] };
      setMessages(json.data ?? []);
    } catch {
      // silencieux en polling
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    if (!open) return;

    void fetchMessages();
    pollRef.current = setInterval(() => void fetchMessages(), 8000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [open, fetchMessages]);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  const handleSend = async () => {
    const trimmed = content.trim();
    if (!trimmed || sending) return;

    setSending(true);
    setError(null);

    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId, content: trimmed }),
      });
      if (!res.ok) {
        const json = (await res.json()) as { error?: string };
        throw new Error(json.error ?? "Envoi impossible.");
      }
      setContent("");
      await fetchMessages();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inattendue.");
    } finally {
      setSending(false);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
      >
        <MessageCircle className="h-4 w-4" />
        Contacter {otherPartyLabel}
      </button>
    );
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-slate-400" />
          <h2 className="text-sm font-bold text-slate-900">Messages</h2>
          <span className="text-[11px] text-slate-400">· {otherPartyLabel}</span>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-[11px] text-slate-400 hover:text-slate-600"
        >
          Réduire
        </button>
      </div>

      {/* Messages list */}
      <div className="max-h-[380px] min-h-[120px] overflow-y-auto px-4 py-3">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-slate-300" />
          </div>
        ) : messages.length === 0 ? (
          <div className="py-8 text-center">
            <MessageCircle className="mx-auto h-8 w-8 text-slate-200" />
            <p className="mt-2 text-sm text-slate-400">Aucun message pour l&apos;instant.</p>
            <p className="text-[11px] text-slate-300">Envoyez le premier message ci-dessous.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.is_me ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 ${
                    msg.is_me
                      ? "bg-gs-orange text-white"
                      : "bg-slate-100 text-slate-800"
                  }`}
                >
                  {!msg.is_me && (
                    <p className="mb-0.5 text-[10px] font-semibold text-slate-500">
                      {msg.sender_name}
                    </p>
                  )}
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</p>
                  <p
                    className={`mt-1 text-right text-[10px] ${
                      msg.is_me ? "text-white/60" : "text-slate-400"
                    }`}
                  >
                    {fmtTime(msg.created_at)}
                  </p>
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="border-t border-slate-100 px-3 py-3">
        {error && <p className="mb-2 text-[12px] text-red-500">{error}</p>}
        <div className="flex gap-2">
          <input
            type="text"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void handleSend();
              }
            }}
            placeholder="Votre message…"
            maxLength={4000}
            className="h-10 flex-1 rounded-xl border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-gs-orange/40"
          />
          <button
            type="button"
            disabled={!content.trim() || sending}
            onClick={() => void handleSend()}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gs-orange text-white transition hover:brightness-105 disabled:opacity-50"
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    </section>
  );
}
