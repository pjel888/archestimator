"use client";

import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { createPublicationCsrfHeaders } from "@/lib/publication/client-csrf";

type Thread = { id: string; subject: string; status: string; waitingState: string; unreadCount: number; updatedAt: string; target: { label: string; secondaryLabel?: string | null } };
type Message = { id: string; body: string; createdAt: string; editedAt: string | null; tombstonedAt: string | null; author: { displayName: string | null; side: "client" | "owner" } };
type DiscussionTarget = { kind: "portal" | "issue" | "section" | "estimate" | "estimate_tab" | "area_group" | "row" | "chart" | "chart_bucket" | "comparison_row" | "assumption_exclusion" | "activity_event"; publicId?: string | null; label: string; secondaryLabel?: string | null; sectionId?: string | null };

function endpoint(token: string, suffix = "") { return `/api/share/${encodeURIComponent(token)}/threads${suffix}`; }
function idempotencyKey() { return typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`; }

export function ClientPortalDiscussionSection({ capabilities, composeTarget, issueId, projectName, sectionId, token }: { capabilities: string[]; composeTarget?: DiscussionTarget | null; issueId: string; projectName: string; sectionId: string; token: string }) {
  const canView = capabilities.includes("thread:view");
  const canCreate = capabilities.includes("thread:create");
  const canReply = capabilities.includes("thread:reply");
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "saving" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const loadThreads = useCallback(async () => {
    if (!canView) return;
    const response = await fetch(endpoint(token), { cache: "no-store" }).catch(() => null);
    if (!response?.ok) { setState("error"); setError(response?.status === 401 ? "Use your personalized recipient link to join the discussion." : "Discussion could not be loaded."); return; }
    const payload = await response.json() as { threads?: Thread[] };
    const next = payload.threads ?? [];
    setThreads(next);
    setSelectedId((current) => current && next.some((thread) => thread.id === current) ? current : next[0]?.id ?? null);
    setState("idle");
  }, [canView, token]);

  useEffect(() => {
    if (!canView) return;
    let active = true;
    void fetch(endpoint(token), { cache: "no-store" })
      .then(async (response) => response.ok ? response.json() as Promise<{ threads?: Thread[] }> : null)
      .then((payload) => {
        if (!active) return;
        const next = payload?.threads ?? [];
        setThreads(next);
        setSelectedId(composeTarget ? null : next[0]?.id ?? null);
      })
      .catch(() => {
        if (active) { setState("error"); setError("Discussion could not be loaded."); }
      });
    return () => { active = false; };
  }, [canView, composeTarget, token]);

  useEffect(() => {
    if (!selectedId) return;
    let active = true;
    void fetch(endpoint(token, `/${encodeURIComponent(selectedId)}/messages`), { cache: "no-store" }).then(async (response) => response.ok ? response.json() as Promise<{ messages?: Message[] }> : null).then((payload) => { if (active) setMessages(payload?.messages ?? []); });
    return () => { active = false; };
  }, [selectedId, token]);

  async function submit() {
    const message = body.trim();
    if (!message) return;
    setState("saving"); setError(null);
    const response = await fetch(selectedId ? endpoint(token, `/${encodeURIComponent(selectedId)}/messages`) : endpoint(token), {
      method: "POST",
      headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey(), ...createPublicationCsrfHeaders() },
      body: JSON.stringify(selectedId ? { body: message } : { issueId, sectionId: composeTarget?.sectionId ?? sectionId, subject: subject.trim() || `Question about ${composeTarget?.label ?? "this issue"}`, body: message, target: composeTarget ?? { kind: "portal", label: projectName } }),
    }).catch(() => null);
    if (!response?.ok) { setState("error"); setError("Your message could not be sent. Please try again."); return; }
    setBody(""); setSubject(""); await loadThreads();
    if (selectedId) {
      const messagesResponse = await fetch(endpoint(token, `/${encodeURIComponent(selectedId)}/messages`), { cache: "no-store" });
      if (messagesResponse.ok) setMessages(((await messagesResponse.json()) as { messages?: Message[] }).messages ?? []);
    }
    setState("idle");
  }

  if (!canView) return <div className="border border-hairline bg-surfaceMuted/40 p-5"><h3 className="text-[16px] font-medium text-ink">Discussion requires a recipient link</h3><p className="mt-2 text-[13px] leading-5 text-secondary">This public view is read-only. Open the personalized link from your invitation to ask questions and see replies.</p></div>;

  const selected = threads.find((thread) => thread.id === selectedId) ?? null;
  return (
    <div className="grid min-h-[520px] overflow-hidden border border-hairline bg-white lg:grid-cols-[20rem_minmax(0,1fr)]">
      <aside className="border-b border-hairline bg-surfaceMuted/30 lg:border-b-0 lg:border-r">
        <div className="border-b border-hairline p-3"><div className="flex items-center justify-between gap-3"><div><h3 className="text-[14px] font-medium text-ink">Conversations</h3><p className="text-[11px] text-secondary">{threads.length} thread{threads.length === 1 ? "" : "s"}</p></div>{canCreate ? <Button size="sm" variant="secondary" onClick={() => { setSelectedId(null); setMessages([]); }}>New</Button> : null}</div></div>
        <div className="max-h-64 overflow-y-auto lg:max-h-[456px]">{threads.map((thread) => <button key={thread.id} type="button" className={`block w-full border-b border-hairline p-3 text-left ${thread.id === selectedId ? "bg-white" : "hover:bg-white/70"}`} onClick={() => setSelectedId(thread.id)}><span className="flex justify-between gap-2 text-[12px] font-medium text-ink"><span className="truncate">{thread.subject}</span>{thread.unreadCount > 0 ? <span className="rounded-full bg-accent px-1.5 text-[10px] text-white">{thread.unreadCount}</span> : null}</span><span className="mt-1 block truncate text-[11px] text-secondary">{thread.target.label} · {thread.status.replace(/_/g, " ")}</span></button>)}</div>
      </aside>
      <section className="flex min-w-0 flex-col">
        <header className="border-b border-hairline p-4"><p className="text-[10px] font-medium uppercase tracking-wide text-tertiary">{selected ? selected.target.label : composeTarget?.label ?? "New conversation"}</p><h3 className="mt-1 text-[16px] font-medium text-ink">{selected?.subject ?? (composeTarget ? `Discuss ${composeTarget.label}` : "Ask the project team")}</h3>{!selected && composeTarget?.secondaryLabel ? <p className="mt-1 text-[11px] text-secondary">{composeTarget.secondaryLabel}</p> : null}</header>
        <div className="flex-1 space-y-3 overflow-y-auto bg-surfaceMuted/20 p-4" aria-live="polite">{selected ? messages.map((message) => <article key={message.id} className={`max-w-[88%] border border-hairline p-3 ${message.author.side === "client" ? "ml-auto bg-accentSoft" : "bg-white"}`}><div className="flex items-center justify-between gap-3 text-[10px] text-tertiary"><span className="font-medium uppercase tracking-wide">{message.author.displayName ?? (message.author.side === "owner" ? "Project team" : "Client")}</span><time>{new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(message.createdAt))}</time></div><p className="mt-2 whitespace-pre-wrap text-[13px] leading-5 text-ink">{message.body}</p></article>) : <div className="mx-auto max-w-lg py-8 text-center"><p className="text-[14px] font-medium text-ink">Start with a clear question</p><p className="mt-2 text-[12px] leading-5 text-secondary">Your message stays attached to this immutable issue so the costing context remains clear.</p></div>}</div>
        {(selected ? canReply : canCreate) ? <div className="border-t border-hairline p-3">{!selected ? <input value={subject} onChange={(event) => setSubject(event.target.value)} maxLength={180} placeholder="Question subject" className="mb-2 min-h-10 w-full border border-hairline bg-white px-3 text-[13px] outline-none focus:ring-2 focus:ring-focus" /> : null}<textarea value={body} onChange={(event) => setBody(event.target.value)} maxLength={4000} placeholder={selected ? "Write a reply" : "Describe your question"} className="min-h-24 w-full resize-y border border-hairline bg-white p-3 text-[13px] outline-none focus:ring-2 focus:ring-focus" /><div className="mt-2 flex items-center justify-between gap-3">{error ? <p role="alert" className="text-[12px] text-danger">{error}</p> : <span /> }<Button size="sm" disabled={!body.trim() || state === "saving"} onClick={() => void submit()}>{state === "saving" ? "Sending…" : selected ? "Reply" : "Start conversation"}</Button></div></div> : null}
      </section>
    </div>
  );
}
