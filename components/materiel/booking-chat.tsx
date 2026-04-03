"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, MessageCircle, Send } from "lucide-react";

type ChatMessage = {
  id: string;
  sender_id: string;
  sender_name: string;
  content: string;
  created_at: string;
  read_at: string | null;
  is_me: boolean;
};

type Props = {
  bookingId: string;
  /** Label affiché dans le header, ex: "Prestataire" ou "Locataire" */
  otherPartyLabel: string;
  /** Non lus côté serveur au chargement (messages reçus non lus). */
  initialUnreadCount?: number;
};

function fmtTime(iso: string) {
  try {
    const d = new Date(iso);
    return (
      d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) +
      " · " +
      d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
    );
  } catch {
    return iso;
  }
}

function messagesFingerprint(list: ChatMessage[]) {
  return list.map((m) => `${m.id}:${m.read_at ?? ""}:${m.content.length}`).join("|");
}

async function postMarkRead(bookingId: string) {
  try {
    await fetch("/api/messages/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId }),
    });
  } catch {
    // silencieux
  }
}

export function BookingChat({ bookingId, otherPartyLabel, initialUnreadCount = 0 }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [hintUnread, setHintUnread] = useState(initialUnreadCount);
  const bottomRef = useRef<HTMLLIElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastFingerprintRef = useRef<string>("");
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  /** Marquer lu dès la vue détail + à l’ouverture du panneau. */
  useEffect(() => {
    void (async () => {
      await postMarkRead(bookingId);
      if (mountedRef.current) setHintUnread(0);
    })();
  }, [bookingId]);

  const fetchMessages = useCallback(
    async (opts?: { forPoll?: boolean }) => {
      try {
        const res = await fetch(`/api/messages?bookingId=${bookingId}&limit=100`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const json = (await res.json()) as { data?: ChatMessage[] };
        const next = json.data ?? [];
        const fp = messagesFingerprint(next);
        if (opts?.forPoll && fp === lastFingerprintRef.current) {
          if (mountedRef.current) setLoading(false);
          return;
        }
        lastFingerprintRef.current = fp;
        if (mountedRef.current) {
          setMessages(next);
        }
      } catch {
        // silencieux en polling
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    },
    [bookingId]
  );

  useEffect(() => {
    if (!open) return;

    void postMarkRead(bookingId);
    setHintUnread(0);

    void fetchMessages();
    const tick = () => {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
      void fetchMessages({ forPoll: true });
    };
    pollRef.current = setInterval(tick, 12000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [open, bookingId, fetchMessages]);

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
      lastFingerprintRef.current = "";
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
        className="relative flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
      >
        <MessageCircle className="h-4 w-4" />
        Contacter {otherPartyLabel}
        {hintUnread > 0 && (
          <span
            className="absolute right-3 top-1/2 flex h-5 min-w-[20px] -translate-y-1/2 items-center justify-center rounded-full bg-sky-500 px-1.5 text-[11px] font-bold text-white"
            aria-label={`${hintUnread} message${hintUnread > 1 ? "s" : ""} non lu${hintUnread > 1 ? "s" : ""}`}
          >
            {hintUnread > 99 ? "99+" : hintUnread}
          </span>
        )}
      </button>
    );
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm" aria-label="Messagerie location matériel">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <MessageCircle className="h-4 w-4 shrink-0 text-slate-400" />
          <h2 className="truncate text-sm font-bold text-slate-900">Messages</h2>
          <span className="hidden shrink-0 text-[11px] text-slate-400 sm:inline">· {otherPartyLabel}</span>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="shrink-0 text-[11px] text-slate-400 hover:text-slate-600"
        >
          Réduire
        </button>
      </div>

      <div className="max-h-[380px] min-h-[120px] overflow-y-auto px-4 py-3">
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-2 py-10" role="status" aria-live="polite">
            <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
            <span className="text-[12px] text-slate-400">Chargement des messages…</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="py-10 text-center">
            <MessageCircle className="mx-auto h-9 w-9 text-slate-200" aria-hidden />
            <p className="mt-3 text-sm font-medium text-slate-600">Aucun message pour l&apos;instant</p>
            <p className="mt-1 text-[12px] text-slate-400">
              Écrivez au prestataire pour préciser un horaire, un lieu de retrait ou une question.
            </p>
          </div>
        ) : (
          <ul className="space-y-3" aria-label="Fil de discussion">
            {messages.map((msg) => (
              <li
                key={msg.id}
                className={`flex ${msg.is_me ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 shadow-sm ${
                    msg.is_me
                      ? "bg-gs-orange text-white"
                      : "border border-slate-100 bg-slate-50 text-slate-800"
                  }`}
                >
                  {!msg.is_me && (
                    <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                      {msg.sender_name}
                    </p>
                  )}
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</p>
                  <p
                    className={`mt-1.5 text-[10px] tabular-nums ${
                      msg.is_me ? "text-white/70" : "text-slate-400"
                    }`}
                  >
                    {fmtTime(msg.created_at)}
                  </p>
                </div>
              </li>
            ))}
            <li ref={bottomRef} className="list-none" aria-hidden>
              <div className="h-1 w-full" />
            </li>
          </ul>
        )}
      </div>

      <div className="border-t border-slate-100 px-3 py-3">
        {error && (
          <p className="mb-2 rounded-lg bg-red-50 px-2 py-1.5 text-[12px] text-red-600" role="alert">
            {error}
          </p>
        )}
        <div className="flex gap-2">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void handleSend();
              }
            }}
            placeholder="Écrire un message…"
            rows={2}
            maxLength={4000}
            className="min-h-[44px] flex-1 resize-y rounded-xl border border-slate-200 px-3 py-2 text-sm leading-snug text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-gs-orange/40"
          />
          <button
            type="button"
            disabled={!content.trim() || sending}
            onClick={() => void handleSend()}
            className="flex h-11 w-11 shrink-0 items-center justify-center self-end rounded-xl bg-gs-orange text-white transition hover:brightness-105 disabled:opacity-50"
            aria-label="Envoyer le message"
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </div>
        <p className="mt-1.5 text-[10px] text-slate-400">Entrée pour envoyer · Maj+Entrée pour une ligne</p>
      </div>
    </section>
  );
}
