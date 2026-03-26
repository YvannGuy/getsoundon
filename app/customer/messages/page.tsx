"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Message = {
  id: string;
  booking_id: string;
  sender_id: string;
  content: string;
  created_at: string;
};

export default function CustomerMessagesPage() {
  const [bookingIdInput, setBookingIdInput] = useState("");
  const [activeBookingId, setActiveBookingId] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const value = new URLSearchParams(window.location.search).get("bookingId") ?? "";
    setBookingIdInput(value);
    setActiveBookingId(value);
  }, []);

  const endpoint = useMemo(() => {
    if (!activeBookingId.trim()) return null;
    const params = new URLSearchParams({ bookingId: activeBookingId.trim(), limit: "100" });
    return `/api/messages?${params.toString()}`;
  }, [activeBookingId]);

  const loadMessages = useCallback(async () => {
    if (!endpoint) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(endpoint, { cache: "no-store" });
      const json = (await res.json()) as { data?: Message[]; error?: string };
      if (!res.ok) {
        throw new Error(json.error ?? "Impossible de charger les messages.");
      }
      setMessages(json.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inattendue.");
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => {
    if (!endpoint) return;
    void loadMessages();
    if (pollTimer.current) {
      clearInterval(pollTimer.current);
      pollTimer.current = null;
    }
    pollTimer.current = setInterval(() => {
      void loadMessages();
    }, 7000);

    return () => {
      if (pollTimer.current) {
        clearInterval(pollTimer.current);
        pollTimer.current = null;
      }
    };
  }, [endpoint, loadMessages]);

  const onSubmitMessage = async () => {
    if (!activeBookingId.trim() || !content.trim()) return;
    setSending(true);
    setError(null);
    setInfo(null);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: activeBookingId.trim(),
          content: content.trim(),
        }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(json.error ?? "Envoi impossible.");
      }
      setContent("");
      setInfo("Message envoye.");
      await loadMessages();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inattendue.");
    } finally {
      setSending(false);
    }
  };

  return (
    <main className="container max-w-3xl py-10">
      <h1 className="text-2xl font-bold text-black">Messagerie client (polling)</h1>
      <p className="mt-2 text-sm text-slate-600">
        Saisis un bookingId puis lance la conversation. Rafraichissement auto toutes les 7 secondes.
      </p>

      <section className="mt-6 rounded-lg border border-slate-200 bg-white p-4">
        <label className="block">
          <span className="mb-1 block text-xs text-slate-600">Booking ID</span>
          <div className="flex gap-2">
            <input
              value={bookingIdInput}
              onChange={(e) => setBookingIdInput(e.target.value)}
              placeholder="UUID du booking"
              className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
            />
            <button
              type="button"
              onClick={() => setActiveBookingId(bookingIdInput.trim())}
              className="h-10 rounded-md bg-gs-orange px-4 text-sm font-medium text-white hover:brightness-95"
            >
              Ouvrir
            </button>
          </div>
        </label>

        {activeBookingId ? (
          <p className="mt-3 text-xs text-slate-500">
            Conversation active: <span className="font-mono">{activeBookingId}</span>
          </p>
        ) : null}
      </section>

      <section className="mt-6 rounded-lg border border-slate-200 bg-white p-4">
        {loading ? <p className="text-sm text-slate-500">Chargement...</p> : null}
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {info ? <p className="text-sm text-emerald-600">{info}</p> : null}

        <div className="mt-2 max-h-[420px] space-y-2 overflow-y-auto">
          {messages.length === 0 ? (
            <p className="text-sm text-slate-500">Aucun message.</p>
          ) : (
            messages.map((msg) => (
              <article key={msg.id} className="rounded-md border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Sender: {msg.sender_id}</p>
                <p className="mt-1 text-sm text-black">{msg.content}</p>
                <p className="mt-1 text-xs text-slate-500">{new Date(msg.created_at).toLocaleString("fr-FR")}</p>
              </article>
            ))
          )}
        </div>

        <div className="mt-4 flex gap-2">
          <input
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Ecrire un message"
            className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
          />
          <button
            type="button"
            onClick={onSubmitMessage}
            disabled={!activeBookingId.trim() || !content.trim() || sending}
            className="h-10 rounded-md bg-gs-orange px-4 text-sm font-medium text-white hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {sending ? "Envoi..." : "Envoyer"}
          </button>
        </div>
      </section>
    </main>
  );
}
