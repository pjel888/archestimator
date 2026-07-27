"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

type TimelineData = {
  events: Array<{ actor: { name: string | null; type: string }; eventType: string; id: string; occurredAt: string; snapshot: Record<string, unknown>; sourceType: string; summary: string | null; target: { kind: "artifact"; publicArtifactId: string } | { kind: "decision"; issueNumber: number | null; publicDecisionId: string } | { kind: "issue"; issueNumber: number } | { kind: "request"; publicRequestId: string } | { kind: "thread"; issueNumber: number | null; publicThreadId: string } | null; title: string }>;
  hasMore: boolean;
  nextCursor: string | null;
  summary: {
    activeBaseline: { baselineNumber: number; currencyCode: string; establishedAt: string; issueNumber: number; totalMinorUnits: number; versionLabel: string } | null;
    currentIssue: { currencyCode: string; issueNumber: number; issuedAt: string; status: string; total: number; versionLabel: string } | null;
    openRequestCount: number;
  };
};

function money(currencyCode: string, minorUnits: number) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: currencyCode }).format(minorUnits / 100);
}

function date(value: string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.valueOf()) ? value : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(parsed);
}

function targetLink(token: string, event: TimelineData["events"][number], fallbackIssueNumber?: number) {
  const issueNumber = event.target?.kind === "issue"
    ? event.target.issueNumber
    : typeof event.snapshot.issueNumber === "number"
      ? event.snapshot.issueNumber
      : fallbackIssueNumber;
  const base = `/share/${encodeURIComponent(token)}${issueNumber ? `?issue=${issueNumber}` : ""}`;
  if (event.target?.kind === "request") return { href: `${base}#request/${encodeURIComponent(event.target.publicRequestId)}`, label: "Open request" };
  if (event.target?.kind === "artifact") return { href: `${base}#artifact/${encodeURIComponent(event.target.publicArtifactId)}`, label: "Open issued artifact" };
  if (event.target?.kind === "thread") return { href: `${base}#thread/${encodeURIComponent(event.target.publicThreadId)}`, label: "Open conversation" };
  if (event.target?.kind === "decision") return { href: `${base}#decision/${encodeURIComponent(event.target.publicDecisionId)}`, label: "Open decision" };
  if (event.target?.kind === "issue") return { href: `${base}#overview`, label: "Open issued package" };
  return null;
}

export function ClientPortalTimeline({ issueNumber, token }: { issueNumber?: number; token: string }) {
  const [data, setData] = useState<TimelineData | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "unavailable">("loading");
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    let active = true;
    void fetch(`/api/share/${encodeURIComponent(token)}/timeline`, { cache: "no-store" })
      .then((response) => response.ok ? response.json() as Promise<TimelineData> : null)
      .then((result) => { if (active) { setData(result); setState(result ? "ready" : "unavailable"); } })
      .catch(() => { if (active) setState("unavailable"); });
    return () => { active = false; };
  }, [token]);

  async function loadMore() {
    if (!data?.nextCursor || loadingMore) return;
    setLoadingMore(true);
    const response = await fetch(`/api/share/${encodeURIComponent(token)}/timeline?cursor=${encodeURIComponent(data.nextCursor)}`, { cache: "no-store" }).catch(() => null);
    const next = response?.ok ? await response.json() as TimelineData : null;
    setLoadingMore(false);
    if (next) setData({ ...next, events: [...data.events, ...next.events], summary: data.summary });
  }

  if (state === "loading") return <p aria-live="polite" className="text-[13px] text-secondary">Loading commitment timeline…</p>;
  if (state === "unavailable" || !data) return <p className="text-[13px] text-secondary">The commitment timeline is available to verified portal recipients.</p>;

  return (
    <div className="space-y-6">
      <section aria-labelledby="current-agreement-title" className="grid gap-px overflow-hidden rounded-xs border border-hairline bg-hairline sm:grid-cols-3">
        <div className="bg-white p-4">
          <h3 id="current-agreement-title" className="text-[10px] font-medium uppercase tracking-wide text-tertiary">Approved baseline</h3>
          {data.summary.activeBaseline ? <><p className="mt-2 text-[16px] font-medium text-ink">{data.summary.activeBaseline.versionLabel}</p><p className="mt-1 text-[12px] text-secondary">{money(data.summary.activeBaseline.currencyCode, data.summary.activeBaseline.totalMinorUnits)}</p></> : <p className="mt-2 text-[13px] text-secondary">No approved baseline yet.</p>}
        </div>
        <div className="bg-white p-4">
          <p className="text-[10px] font-medium uppercase tracking-wide text-tertiary">Current proposal</p>
          {data.summary.currentIssue ? <><p className="mt-2 text-[16px] font-medium text-ink">{data.summary.currentIssue.versionLabel}</p><p className="mt-1 text-[12px] capitalize text-secondary">{data.summary.currentIssue.status.replaceAll("_", " ")}</p></> : <p className="mt-2 text-[13px] text-secondary">No pending proposal.</p>}
        </div>
        <div className="bg-white p-4">
          <p className="text-[10px] font-medium uppercase tracking-wide text-tertiary">Open requests</p>
          <p className="mt-2 text-[24px] font-medium tabular-nums text-ink">{data.summary.openRequestCount}</p>
          <p className="mt-1 text-[12px] text-secondary">Awaiting assessment or resolution</p>
        </div>
      </section>

      <section aria-labelledby="official-history-title">
        <div className="border-b border-hairline pb-3"><p className="text-[10px] font-medium uppercase tracking-wide text-tertiary">Official history</p><h3 id="official-history-title" className="mt-1 text-[18px] font-medium tracking-tight text-ink">Commitment timeline</h3></div>
        {data.events.length === 0 ? <p className="py-6 text-[13px] text-secondary">No client-visible commitment events yet.</p> : <ol className="divide-y divide-hairline">
          {data.events.map((event) => {
            const link = targetLink(token, event, issueNumber);
            return <li id={`timeline-event-${event.id}`} key={event.id} className="grid gap-2 py-4 sm:grid-cols-[9rem_minmax(0,1fr)]"><time className="text-[11px] text-tertiary" dateTime={event.occurredAt}>{date(event.occurredAt)}</time><div><div className="flex flex-wrap items-center gap-2"><h4 className="text-[14px] font-medium text-ink">{event.title}</h4><span className="rounded-full bg-canvas px-2 py-0.5 text-[10px] capitalize text-tertiary">{event.sourceType.replaceAll("_", " ")}</span></div>{event.summary ? <p className="mt-1 text-[13px] leading-5 text-secondary">{event.summary}</p> : null}<div className="mt-2 flex flex-wrap items-center gap-3">{event.actor.name ? <p className="text-[11px] text-tertiary">By {event.actor.name}</p> : null}{link ? <a className="text-[11px] font-medium text-brand underline-offset-2 hover:underline" href={link.href}>{link.label}</a> : null}</div></div></li>;
          })}
        </ol>}
        {data.hasMore ? <Button className="mt-4" disabled={loadingMore} onClick={loadMore} size="sm" variant="secondary">{loadingMore ? "Loading…" : "Load earlier events"}</Button> : null}
      </section>
    </div>
  );
}
