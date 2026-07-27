"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { createPublicationCsrfHeaders } from "@/lib/publication/client-csrf";

type Thread = { id: string; subject: string; status: string; waitingState: string; unreadCount: number; updatedAt: string; target: { label: string; secondaryLabel?: string | null } };
type Message = { id: string; body: string; createdAt: string; editedAt: string | null; tombstonedAt: string | null; author: { displayName: string | null; side: "client" | "owner" } };
type DiscussionTarget = { kind: "portal" | "issue" | "section" | "estimate" | "estimate_tab" | "area_group" | "row" | "component" | "chart" | "chart_bucket" | "comparison_row" | "assumption_exclusion" | "activity_event"; publicId?: string | null; label: string; secondaryLabel?: string | null; sectionId?: string | null };
type DiscussionPage<Item, Key extends "threads" | "messages"> = { hasMore?: boolean; nextCursor?: string | null } & { [Property in Key]?: Item[] };

function endpoint(token: string, suffix = "") { return `/api/share/${encodeURIComponent(token)}/threads${suffix}`; }
function pageEndpoint(url: string, cursor: string | null) { return cursor ? `${url}?cursor=${encodeURIComponent(cursor)}` : url; }
function idempotencyKey() { return typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`; }
function appendUnique<Item extends { id: string }>(current: Item[], next: Item[]) {
  const existingIds = new Set(current.map((item) => item.id));
  return [...current, ...next.filter((item) => !existingIds.has(item.id))];
}

export function ClientPortalDiscussionSection({ capabilities, composeTarget, initialThreadId, issueId, sectionId, token }: { capabilities: string[]; composeTarget?: DiscussionTarget | null; initialThreadId?: string | null; issueId: string; projectName: string; sectionId: string; token: string }) {
  const canView = capabilities.includes("thread:view");
  const canCreate = capabilities.includes("thread:create");
  const canReply = capabilities.includes("thread:reply");
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [threadNextCursor, setThreadNextCursor] = useState<string | null>(null);
  const [threadsHaveMore, setThreadsHaveMore] = useState(false);
  const [messageNextCursor, setMessageNextCursor] = useState<string | null>(null);
  const [messagesHaveMore, setMessagesHaveMore] = useState(false);
  const [loadingMoreThreads, setLoadingMoreThreads] = useState(false);
  const [loadingMoreMessages, setLoadingMoreMessages] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "saving" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const targetThreadRef = useRef<HTMLButtonElement | null>(null);

  const loadThreads = useCallback(async (cursor: string | null = null, append = false) => {
    if (!canView) return;
    if (append) setLoadingMoreThreads(true);
    const response = await fetch(pageEndpoint(endpoint(token), cursor), { cache: "no-store" }).catch(() => null);
    if (!response?.ok) {
      if (append) setLoadingMoreThreads(false);
      setState("error"); setError(response?.status === 401 ? "Use your personalized recipient link to join the discussion." : "Discussion could not be loaded."); return;
    }
    const payload = await response.json() as DiscussionPage<Thread, "threads">;
    const next = payload.threads ?? [];
    setThreads((current) => append ? appendUnique(current, next) : next);
    if (!append) setSelectedId((current) => current && next.some((thread) => thread.id === current) ? current : next[0]?.id ?? null);
    setThreadsHaveMore(payload.hasMore === true);
    setThreadNextCursor(payload.nextCursor ?? null);
    if (append) setLoadingMoreThreads(false);
    setState("idle");
  }, [canView, token]);

  useEffect(() => {
    if (!canView) return;
    let active = true;
    void (async () => {
      try {
        let nextCursor: string | null = null;
        let payload: DiscussionPage<Thread, "threads"> | null = null;
        let loaded: Thread[] = [];
        do {
          const response = await fetch(pageEndpoint(endpoint(token), nextCursor), { cache: "no-store" });
          if (!response.ok) throw new Error("Discussion could not be loaded.");
          payload = await response.json() as DiscussionPage<Thread, "threads">;
          loaded = appendUnique(loaded, payload.threads ?? []);
          nextCursor = payload.hasMore === true ? payload.nextCursor ?? null : null;
        } while (initialThreadId && !loaded.some((thread) => thread.id === initialThreadId) && nextCursor);
        if (!active) return;
        setThreads(loaded);
        setThreadsHaveMore(payload?.hasMore === true);
        setThreadNextCursor(payload?.nextCursor ?? null);
        setSelectedId(composeTarget ? null : initialThreadId ? loaded.find((thread) => thread.id === initialThreadId)?.id ?? null : loaded[0]?.id ?? null);
      } catch {
        if (active) { setState("error"); setError("Discussion could not be loaded."); }
      }
    })();
    return () => { active = false; };
  }, [canView, composeTarget, initialThreadId, token]);

  useEffect(() => {
    if (initialThreadId && selectedId === initialThreadId) targetThreadRef.current?.focus();
  }, [initialThreadId, selectedId, threads]);

  useEffect(() => {
    if (!selectedId) return;
    let active = true;
    void fetch(endpoint(token, `/${encodeURIComponent(selectedId)}/messages`), { cache: "no-store" }).then(async (response) => response.ok ? response.json() as Promise<DiscussionPage<Message, "messages">> : null).then((payload) => {
      if (!active) return;
      setMessages(payload?.messages ?? []);
      setMessagesHaveMore(payload?.hasMore === true);
      setMessageNextCursor(payload?.nextCursor ?? null);
      void fetch(endpoint(token, `/${encodeURIComponent(selectedId)}/read`), { method: "POST", headers: createPublicationCsrfHeaders() })
        .then((response) => { if (response.ok) setThreads((current) => current.map((thread) => thread.id === selectedId ? { ...thread, unreadCount: 0 } : thread)); })
        .catch(() => undefined);
    });
    return () => { active = false; };
  }, [selectedId, token]);

  async function loadMoreMessages() {
    if (!selectedId || !messageNextCursor || loadingMoreMessages) return;
    setLoadingMoreMessages(true);
    const response = await fetch(pageEndpoint(endpoint(token, `/${encodeURIComponent(selectedId)}/messages`), messageNextCursor), { cache: "no-store" }).catch(() => null);
    if (!response?.ok) {
      setLoadingMoreMessages(false);
      setState("error"); setError("More messages could not be loaded."); return;
    }
    const payload = await response.json() as DiscussionPage<Message, "messages">;
    setMessages((current) => appendUnique(current, payload.messages ?? []));
    setMessagesHaveMore(payload.hasMore === true);
    setMessageNextCursor(payload.nextCursor ?? null);
    setLoadingMoreMessages(false);
  }

  async function submit() {
    const message = body.trim();
    if (!message) return;
    setState("saving"); setError(null);
    const response = await fetch(selectedId ? endpoint(token, `/${encodeURIComponent(selectedId)}/messages`) : endpoint(token), {
      method: "POST",
      headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey(), ...createPublicationCsrfHeaders() },
      body: JSON.stringify(selectedId ? { body: message } : { issueId, sectionId: composeTarget?.sectionId ?? sectionId, subject: subject.trim() || `Question about ${composeTarget?.label ?? "this issue"}`, body: message, target: composeTarget ? { kind: composeTarget.kind, publicId: composeTarget.publicId } : { kind: "issue", publicId: issueId } }),
    }).catch(() => null);
    if (!response?.ok) { setState("error"); setError("Your message could not be sent. Please try again."); return; }
    setBody(""); setSubject(""); await loadThreads();
    if (selectedId) {
      const messagesResponse = await fetch(endpoint(token, `/${encodeURIComponent(selectedId)}/messages`), { cache: "no-store" });
      if (messagesResponse.ok) {
        const payload = (await messagesResponse.json()) as DiscussionPage<Message, "messages">;
        setMessages(payload.messages ?? []);
        setMessagesHaveMore(payload.hasMore === true);
        setMessageNextCursor(payload.nextCursor ?? null);
      }
    }
    setState("idle");
  }

  if (!canView) return <div className="border border-hairline bg-surfaceMuted/40 p-5"><h3 className="text-[16px] font-medium text-ink">Discussion requires a recipient link</h3><p className="mt-2 text-[13px] leading-5 text-secondary">This public view is read-only. Open the personalized link from your invitation to ask questions and see replies.</p></div>;

  const selected = threads.find((thread) => thread.id === selectedId) ?? null;
  return (
    <div className="grid min-h-[520px] overflow-hidden border border-hairline bg-white lg:grid-cols-[20rem_minmax(0,1fr)]">
      <aside className="border-b border-hairline bg-surfaceMuted/30 lg:border-b-0 lg:border-r">
        <div className="border-b border-hairline p-3"><div className="flex items-center justify-between gap-3"><div><h3 className="text-[14px] font-medium text-ink">Conversations</h3><p className="text-[11px] text-secondary">{threads.length}{threadsHaveMore ? "+" : ""} thread{threads.length === 1 && !threadsHaveMore ? "" : "s"}</p></div>{canCreate ? <Button size="sm" variant="secondary" onClick={() => { setSelectedId(null); setMessages([]); setMessagesHaveMore(false); setMessageNextCursor(null); }}>New</Button> : null}</div></div>
        <div className="max-h-64 overflow-y-auto lg:max-h-[456px]">{threads.map((thread) => <button ref={thread.id === initialThreadId ? targetThreadRef : undefined} key={thread.id} type="button" aria-current={thread.id === selectedId ? "true" : undefined} className={`block w-full cursor-pointer border-b border-hairline p-3 text-left ${thread.id === selectedId ? "bg-white" : "hover:bg-white/70"}`} onClick={() => { setSelectedId(thread.id); setMessages([]); setMessagesHaveMore(false); setMessageNextCursor(null); }}><span className="flex justify-between gap-2 text-[12px] font-medium text-ink"><span className="truncate">{thread.subject}</span>{thread.unreadCount > 0 ? <span className="rounded-full bg-accent px-1.5 text-[10px] text-white">{thread.unreadCount}</span> : null}</span><span className="mt-1 block truncate text-[11px] text-secondary">{thread.target.label} · {thread.status.replace(/_/g, " ")}</span></button>)}{threadsHaveMore && threadNextCursor ? <div className="p-3"><Button className="w-full" size="sm" variant="secondary" disabled={loadingMoreThreads} onClick={() => void loadThreads(threadNextCursor, true)}>{loadingMoreThreads ? "Loading…" : "More conversations"}</Button></div> : null}</div>
      </aside>
      <section className="flex min-w-0 flex-col">
        <header className="border-b border-hairline p-4"><p className="text-[10px] font-medium uppercase tracking-wide text-tertiary">{selected ? selected.target.label : composeTarget?.label ?? "New conversation"}</p><h3 className="mt-1 text-[16px] font-medium text-ink">{selected?.subject ?? (composeTarget ? `Discuss ${composeTarget.label}` : "Ask the project team")}</h3>{!selected && composeTarget?.secondaryLabel ? <p className="mt-1 text-[11px] text-secondary">{composeTarget.secondaryLabel}</p> : null}</header>
        <div className="flex-1 space-y-3 overflow-y-auto bg-surfaceMuted/20 p-4" aria-live="polite">{selected ? <>{messages.map((message) => <article key={message.id} className={`max-w-[88%] border border-hairline p-3 ${message.author.side === "client" ? "ml-auto bg-accentSoft" : "bg-white"}`}><div className="flex items-center justify-between gap-3 text-[10px] text-tertiary"><span className="font-medium uppercase tracking-wide">{message.author.displayName ?? (message.author.side === "owner" ? "Project team" : "Client")}</span><time>{new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(message.createdAt))}</time></div><p className="mt-2 whitespace-pre-wrap text-[13px] leading-5 text-ink">{message.body}</p></article>)}{messagesHaveMore && messageNextCursor ? <div className="flex justify-center pt-2"><Button size="sm" variant="secondary" disabled={loadingMoreMessages} onClick={() => void loadMoreMessages()}>{loadingMoreMessages ? "Loading…" : "More messages"}</Button></div> : null}</> : <div className="mx-auto max-w-lg py-8 text-center"><p className="text-[14px] font-medium text-ink">Start with a clear question</p><p className="mt-2 text-[12px] leading-5 text-secondary">Your message stays attached to this immutable issue so the costing context remains clear.</p></div>}</div>
        {(selected ? canReply : canCreate) ? <div className="border-t border-hairline p-3">{!selected ? <input value={subject} onChange={(event) => setSubject(event.target.value)} maxLength={180} placeholder="Question subject" className="mb-2 min-h-10 w-full border border-hairline bg-white px-3 text-[13px] outline-none focus:ring-2 focus:ring-focus" /> : null}<textarea value={body} onChange={(event) => setBody(event.target.value)} maxLength={4000} placeholder={selected ? "Write a reply" : "Describe your question"} className="min-h-24 w-full resize-y border border-hairline bg-white p-3 text-[13px] outline-none focus:ring-2 focus:ring-focus" /><div className="mt-2 flex items-center justify-between gap-3">{error ? <p role="alert" className="text-[12px] text-danger">{error}</p> : <span /> }<Button size="sm" disabled={!body.trim() || state === "saving"} onClick={() => void submit()}>{state === "saving" ? "Sending…" : selected ? "Reply" : "Start conversation"}</Button></div></div> : null}
      </section>
    </div>
  );
}
