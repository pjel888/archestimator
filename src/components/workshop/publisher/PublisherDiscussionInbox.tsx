"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  addClientPortalInternalNoteAction,
  listPublisherDiscussionMessagesAction,
  listPublisherDiscussionThreadsAction,
  replyToClientPortalThreadAsOwnerAction,
  setClientPortalThreadStatusAsOwnerAction,
} from "@/lib/client-portal/publisher-discussion-actions";
import type { PublisherDiscussionMessage, PublisherDiscussionThread } from "@/lib/client-portal/publisher-discussion-service";

type Props = { portalId: string; projectId: string };

function idempotencyKey() {
  return typeof crypto?.randomUUID === "function" ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}

export function PublisherDiscussionInbox({ portalId, projectId }: Props) {
  const [threads, setThreads] = useState<PublisherDiscussionThread[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<PublisherDiscussionMessage[]>([]);
  const [reply, setReply] = useState("");
  const [note, setNote] = useState("");
  const [state, setState] = useState<"error" | "idle" | "loading" | "saving">("loading");
  const [feedback, setFeedback] = useState<string | null>(null);

  async function loadThreads() {
    setState("loading");
    try {
      const nextThreads = await listPublisherDiscussionThreadsAction({ portalId, projectId });
      setThreads(nextThreads);
      setSelectedThreadId((current) => current && nextThreads.some((thread) => thread.id === current) ? current : nextThreads[0]?.id ?? null);
      setState("idle");
    } catch {
      setFeedback("Client Portal discussions could not be loaded.");
      setState("error");
    }
  }

  useEffect(() => {
    let active = true;
    void listPublisherDiscussionThreadsAction({ portalId, projectId })
      .then((nextThreads) => {
        if (!active) return;
        setThreads(nextThreads);
        setSelectedThreadId((current) => current && nextThreads.some((thread) => thread.id === current) ? current : nextThreads[0]?.id ?? null);
        setState("idle");
      })
      .catch(() => {
        if (!active) return;
        setFeedback("Client Portal discussions could not be loaded.");
        setState("error");
      });
    return () => { active = false; };
  }, [portalId, projectId]);

  useEffect(() => {
    if (!selectedThreadId) return;
    let active = true;
    void listPublisherDiscussionMessagesAction({ portalId, projectId, threadId: selectedThreadId })
      .then((nextMessages) => { if (active) setMessages(nextMessages); })
      .catch(() => { if (active) setFeedback("Discussion history could not be loaded."); });
    return () => { active = false; };
  }, [portalId, projectId, selectedThreadId]);

  const selectedThread = threads.find((thread) => thread.id === selectedThreadId) ?? null;

  async function submit(kind: "note" | "reply") {
    if (!selectedThreadId) return;
    const body = kind === "reply" ? reply : note;
    if (!body.trim()) return;
    setState("saving");
    setFeedback(null);
    try {
      if (kind === "reply") {
        await replyToClientPortalThreadAsOwnerAction({ body, idempotencyKey: idempotencyKey(), portalId, projectId, threadId: selectedThreadId });
        setReply("");
      } else {
        await addClientPortalInternalNoteAction({ body, idempotencyKey: idempotencyKey(), portalId, projectId, threadId: selectedThreadId });
        setNote("");
      }
      const [nextMessages] = await Promise.all([
        listPublisherDiscussionMessagesAction({ portalId, projectId, threadId: selectedThreadId }),
        loadThreads(),
      ]);
      setMessages(nextMessages);
      setState("idle");
    } catch {
      setFeedback(kind === "reply" ? "Public reply could not be sent." : "Internal note could not be saved.");
      setState("error");
    }
  }

  async function setStatus(status: "open" | "resolved") {
    if (!selectedThreadId) return;
    setState("saving");
    try {
      await setClientPortalThreadStatusAsOwnerAction({ portalId, projectId, threadId: selectedThreadId, status });
      await loadThreads();
      setState("idle");
    } catch {
      setFeedback("Discussion status could not be updated.");
      setState("error");
    }
  }

  return (
    <main className="grid min-h-0 gap-0 border border-hairline bg-white lg:grid-cols-[18rem_minmax(0,1fr)]">
      <aside className="border-b border-hairline lg:border-b-0 lg:border-r">
        <div className="border-b border-hairline px-4 py-3">
          <p className="text-[10px] font-medium uppercase tracking-wide text-tertiary">Client Portal</p>
          <h1 className="mt-1 text-[18px] font-medium tracking-tight text-ink">Discussion inbox</h1>
        </div>
        <div className="max-h-[30rem] overflow-auto p-2">
          {state === "loading" ? <p className="p-3 text-[12px] text-secondary">Loading discussions…</p> : null}
          {threads.length === 0 && state !== "loading" ? <p className="p-3 text-[12px] text-secondary">No client discussions yet.</p> : null}
          {threads.map((thread) => (
            <Button
              key={thread.id}
              type="button"
              variant="plain"
              size="xs"
              aria-pressed={thread.id === selectedThreadId}
              onClick={() => setSelectedThreadId(thread.id)}
              className={`min-h-0 w-full min-w-0 justify-start border px-3 py-2 text-left ${thread.id === selectedThreadId ? "border-ink bg-surfaceMuted" : "border-transparent hover:border-hairline hover:bg-surfaceMuted/50"}`}
            >
              <span className="block truncate text-[12px] font-medium text-ink">{thread.subject}</span>
              <span className="mt-1 block truncate text-[10px] text-secondary">{thread.target.label} · {thread.waitingState.replace(/_/g, " ")}</span>
            </Button>
          ))}
        </div>
      </aside>

      <section className="min-w-0 p-4 sm:p-6">
        {feedback ? <p role="alert" className="mb-3 border border-danger/30 bg-dangerSoft px-3 py-2 text-[12px] text-danger">{feedback}</p> : null}
        {!selectedThread ? <p className="text-[13px] text-secondary">Select a discussion to review its client-visible target and history.</p> : null}
        {selectedThread ? <>
          <header className="flex flex-wrap items-start justify-between gap-3 border-b border-hairline pb-4">
            <div><p className="text-[10px] font-medium uppercase tracking-wide text-tertiary">{selectedThread.target.kind.replace(/_/g, " ")}</p><h2 className="mt-1 text-[20px] font-medium tracking-tight text-ink">{selectedThread.target.label}</h2><p className="mt-1 text-[12px] text-secondary">{selectedThread.subject}</p></div>
            <Button size="sm" variant="secondary" disabled={state === "saving"} onClick={() => void setStatus(selectedThread.status === "resolved" ? "open" : "resolved")}>{selectedThread.status === "resolved" ? "Reopen" : "Resolve"}</Button>
          </header>
          <div className="mt-4 space-y-3">
            {messages.map((message) => <article key={message.id} className={`border px-3 py-2.5 ${message.visibility === "internal" ? "border-warning/30 bg-warningSoft" : "border-hairline bg-surfaceMuted/35"}`}><p className="text-[10px] font-medium uppercase tracking-wide text-tertiary">{message.visibility === "internal" ? "Internal note" : message.side === "owner" ? "Owner reply" : "Client message"}</p><p className="mt-1 whitespace-pre-wrap text-[13px] leading-5 text-ink">{message.body}</p></article>)}
          </div>
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <label className="grid gap-2 text-[12px] font-medium text-ink">Public reply<textarea value={reply} onChange={(event) => setReply(event.target.value)} className="min-h-28 border border-hairline p-2 text-[13px] font-normal" placeholder="Visible to the client" /><Button size="sm" disabled={state === "saving" || !reply.trim()} onClick={() => void submit("reply")}>Send public reply</Button></label>
            <label className="grid gap-2 text-[12px] font-medium text-ink">Internal note<textarea value={note} onChange={(event) => setNote(event.target.value)} className="min-h-28 border border-hairline p-2 text-[13px] font-normal" placeholder="Never visible to the client" /><Button size="sm" variant="secondary" disabled={state === "saving" || !note.trim()} onClick={() => void submit("note")}>Save internal note</Button></label>
          </div>
        </> : null}
      </section>
    </main>
  );
}
