"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import type { SupportConversationRow, SupportMessageRow } from "@/lib/repositories/support-conversations-d1";

export function SupportChatWidgetClient() {
  const queryClient = useQueryClient();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [reply, setReply] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [realtimeState, setRealtimeState] = useState<"connecting" | "connected" | "reconnecting" | "degraded" | "offline">("offline");
  const conversations = useQuery({
    queryKey: ["support", "conversations"],
    queryFn: async () => {
      const response = await fetch("/api/support/conversations", { cache: "no-store" });
      const payload = await response.json() as { conversations?: SupportConversationRow[]; error?: string };
      if (!response.ok) throw new Error(payload.error || "Support conversations could not be loaded.");
      return payload.conversations ?? [];
    },
  });
  const messages = useQuery({
    queryKey: ["support", "messages", selectedId],
    enabled: Boolean(selectedId),
    queryFn: async () => {
      const response = await fetch(`/api/support/conversations/${selectedId}/messages`, { cache: "no-store" });
      const payload = await response.json() as { messages?: SupportMessageRow[]; error?: string };
      if (!response.ok) throw new Error(payload.error || "Support messages could not be loaded.");
      return payload.messages ?? [];
    },
  });

  useEffect(() => {
    if (!selectedId) return;
    let socket: WebSocket | null = null;
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let attempts = 0;
    const backfill = () => {
      void queryClient.invalidateQueries({ queryKey: ["support", "messages", selectedId] });
      void queryClient.invalidateQueries({ queryKey: ["support", "conversations"] });
    };
    const reconnect = () => {
      if (cancelled) return;
      setRealtimeState("reconnecting");
      const delay = Math.min(30_000, 500 * 2 ** Math.min(attempts, 6)) + Math.floor(Math.random() * 250);
      attempts += 1;
      retryTimer = setTimeout(() => void connect(), delay);
    };
    const connect = async () => {
      setRealtimeState(attempts > 0 ? "reconnecting" : "connecting");
      try {
        const response = await fetch(`/api/support/conversations/${selectedId}/realtime-token`, { cache: "no-store" });
        const payload = await response.json() as { roomToken?: string };
        if (!response.ok || !payload.roomToken || cancelled) { reconnect(); return; }
        const url = new URL(`/__cloudflare/support-inbox/${selectedId}`, window.location.origin);
        url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
        url.searchParams.set("token", payload.roomToken);
        socket = new WebSocket(url);
        socket.onopen = () => {
          attempts = 0;
          setRealtimeState("connected");
          backfill();
        };
        socket.onmessage = (event) => {
          try {
            const invalidation = JSON.parse(String(event.data)) as { type?: unknown; conversationId?: unknown; messageId?: unknown };
            if (invalidation.type !== "support_message_created" || invalidation.conversationId !== selectedId || typeof invalidation.messageId !== "string") return;
            backfill();
          } catch {
            // Socket payloads are hints only; the D1 query remains authoritative.
          }
        };
        socket.onclose = reconnect;
      } catch {
        reconnect();
      }
    };
    const onOnline = () => { backfill(); if (!socket || socket.readyState > WebSocket.OPEN) reconnect(); };
    const onVisibility = () => { if (document.visibilityState === "visible") onOnline(); };
    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVisibility);
    void connect();
    return () => {
      cancelled = true;
      setRealtimeState("offline");
      if (retryTimer) clearTimeout(retryTimer);
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisibility);
      socket?.close();
    };
  }, [queryClient, selectedId]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = body.trim();
    if (message.length < 2) return;
    setError(null);
    setSending(true);
    try {
      const response = await fetch("/api/support/conversations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ subject: subject.trim() || "Support request", body: message, clientMessageId: crypto.randomUUID() }),
      });
      const payload = await response.json() as { conversation?: SupportConversationRow; error?: string; realtimeDegraded?: boolean };
      if (!response.ok) {
        setError(payload.error || "Support message could not be sent.");
        return;
      }
      setSubject("");
      setBody("");
      setSelectedId(payload.conversation?.id ?? null);
      if (payload.realtimeDegraded) setRealtimeState("degraded");
      await queryClient.invalidateQueries({ queryKey: ["support", "conversations"] });
    } catch {
      setError("Support message could not be sent. Check your connection and try again.");
    } finally {
      setSending(false);
    }
  }

  async function sendReply(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedId || reply.trim().length < 2) return;
    setSending(true);
    try {
      const response = await fetch(`/api/support/conversations/${selectedId}/messages`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ body: reply.trim(), clientMessageId: crypto.randomUUID() }),
      });
      const payload = await response.json() as { error?: string; realtimeDegraded?: boolean };
      if (!response.ok) { setError(payload.error || "Reply could not be sent."); return; }
      setReply("");
      if (payload.realtimeDegraded) setRealtimeState("degraded");
      await queryClient.invalidateQueries({ queryKey: ["support", "messages", selectedId] });
      await queryClient.invalidateQueries({ queryKey: ["support", "conversations"] });
    } catch {
      setError("Reply could not be sent. Check your connection and try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="rounded-xs border border-hairline bg-white p-2" aria-label="In-app support">
      <p className="text-[11px] font-medium leading-4 text-ink">Message support</p>
      <p className="mb-2 text-[9px] leading-4 text-tertiary">Your messages stay in your private support inbox.</p>
      {selectedId ? <p className="mb-2 text-[9px] leading-3 text-tertiary">Realtime: {realtimeState}</p> : null}
      {conversations.isLoading ? <p className="mb-2 text-[9px] text-tertiary">Loading conversations…</p> : null}
      {conversations.isError ? <p role="status" className="mb-2 text-[9px] text-danger">Support conversations are unavailable. Try again shortly.</p> : null}
      {conversations.data?.length ? (
        <div className="mb-2 space-y-1">
          {conversations.data.map((conversation) => (
            <button key={conversation.id} type="button" onClick={() => setSelectedId(conversation.id)} className="block w-full truncate rounded-xs border border-hairline px-2 py-1 text-left text-[9px] text-secondary hover:bg-surfaceMuted">
              {conversation.subject || "Support request"}
            </button>
          ))}
        </div>
      ) : null}
      {selectedId ? (
        <div className="mb-2 space-y-1 rounded-xs border border-hairline p-2">
          <div className="max-h-32 space-y-1 overflow-auto text-[9px] text-secondary">
            {messages.isLoading ? <p>Loading messages…</p> : null}
            {messages.isError ? <p role="status">Messages are unavailable. Reconnecting will refresh them.</p> : null}
            {!messages.isLoading && !messages.isError && messages.data?.length === 0 ? <p>No messages yet.</p> : null}
            {messages.data?.map((message) => <p key={message.id}><strong>{message.sender_role === "admin" ? "Support" : "You"}:</strong> {message.body_text}</p>)}
          </div>
          <form onSubmit={sendReply} className="flex gap-1">
            <input value={reply} onChange={(event) => setReply(event.currentTarget.value)} className="min-w-0 flex-1 rounded-xs border border-hairline px-2 py-1 text-[9px]" placeholder="Reply…" minLength={2} required />
            <Button type="submit" size="xs" variant="outline" disabled={sending}>{sending ? "Sending…" : "Reply"}</Button>
          </form>
        </div>
      ) : null}
      <form onSubmit={submit} className="space-y-1.5">
        <input value={subject} onChange={(event) => setSubject(event.currentTarget.value)} className="w-full rounded-xs border border-hairline px-2 py-1 text-[10px]" placeholder="Subject" />
        <textarea value={body} onChange={(event) => setBody(event.currentTarget.value)} className="min-h-16 w-full resize-none rounded-xs border border-hairline p-2 text-[10px]" placeholder="Describe the issue or question…" required minLength={2} />
        {error ? <p role="status" className="text-[9px] text-danger">{error}</p> : null}
        <div className="flex justify-end"><Button type="submit" size="xs" variant="outline" disabled={sending}>{sending ? "Sending…" : "Send to support"}</Button></div>
      </form>
    </section>
  );
}
