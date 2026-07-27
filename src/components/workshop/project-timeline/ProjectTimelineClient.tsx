"use client";

import Link from "next/link";
import { useRef, useState } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  PROJECT_COMMITMENT_EVENT_SOURCE_TYPES,
  type ProjectCommitmentEventSourceType,
} from "@/lib/project-ledger/contracts";
import type { ProjectTimelinePage } from "@/lib/project-ledger/timeline-repository";

type Props = {
  initialData: ProjectTimelinePage;
  projectId: string;
  projectName: string;
};

const SOURCE_LABELS: Record<ProjectCommitmentEventSourceType, string> = {
  artifact: "Files",
  baseline: "Baselines",
  change_request: "Requests",
  decision: "Decisions",
  issue: "Issues",
  legacy_publication: "Legacy",
};

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.valueOf())
    ? value
    : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function formatMoney(minorUnits: number, currencyCode: string) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: currencyCode }).format(minorUnits / 100);
}

function eventStatus(eventType: string) {
  if (/accepted|approved|established|resolved/.test(eventType)) return "approved" as const;
  if (/declined|rejected|withdrawn|redacted|voided/.test(eventType)) return "danger" as const;
  return "review" as const;
}

export function ProjectTimelineClient({ initialData, projectId, projectName }: Props) {
  const [data, setData] = useState(initialData);
  const [portalId, setPortalId] = useState(initialData.context.selectedPortalId ?? "");
  const [sourceType, setSourceType] = useState<ProjectCommitmentEventSourceType | "">("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestGeneration = useRef(0);
  const root = `/workshop/projects/${encodeURIComponent(projectId)}`;

  async function load(input: { append?: boolean; cursor?: string | null; nextPortalId?: string; nextSourceType?: ProjectCommitmentEventSourceType | "" }) {
    const generation = ++requestGeneration.current;
    const selectedPortalId = input.nextPortalId ?? portalId;
    const selectedSourceType = input.nextSourceType ?? sourceType;
    const search = new URLSearchParams();
    if (selectedPortalId) search.set("portal", selectedPortalId);
    if (selectedSourceType) search.set("source", selectedSourceType);
    if (input.cursor) search.set("cursor", input.cursor);
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/projects/${encodeURIComponent(projectId)}/timeline?${search}`, { cache: "no-store" });
      if (generation !== requestGeneration.current) return;
      if (!response.ok) {
        setLoading(false);
        setError("Timeline could not be refreshed.");
        return;
      }
      const next = await response.json() as ProjectTimelinePage;
      if (generation !== requestGeneration.current) return;
      setData((current) => input.append ? { ...next, events: [...current.events, ...next.events] } : next);
      setLoading(false);
    } catch {
      if (generation !== requestGeneration.current) return;
      setLoading(false);
      setError("Timeline could not be refreshed.");
    }
  }

  function changePortal(nextPortalId: string) {
    setPortalId(nextPortalId);
    void load({ nextPortalId });
  }

  function changeSource(nextSourceType: ProjectCommitmentEventSourceType | "") {
    setSourceType(nextSourceType);
    void load({ nextSourceType });
  }

  return (
    <div className="min-h-full bg-canvas text-ink">
      <header className="border-b border-hairline bg-white px-4 py-5 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wide text-tertiary">Project commitments</p>
            <h1 className="mt-1 text-[24px] font-medium tracking-tight">{projectName} timeline</h1>
            <p className="mt-1 max-w-2xl text-[13px] leading-5 text-secondary">Current agreement, pending proposals, requests, files, and official decisions in one causal history.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link className={buttonVariants({ variant: "primary", size: "sm" })} href={`${root}/client-portals/compose`}>Compose issue</Link>
            <Link className={buttonVariants({ variant: "secondary", size: "sm" })} href={`${root}/artifacts`}>Files</Link>
            <Link className={buttonVariants({ variant: "secondary", size: "sm" })} href={`${root}/activity`}>Raw Activity</Link>
            <Link className={buttonVariants({ variant: "secondary", size: "sm" })} href={`${root}/client-portals`}>Portals</Link>
          </div>
        </div>
      </header>

      <main className="space-y-5 p-4 sm:p-6 lg:p-8">
        <section aria-labelledby="agreement-heading" className="overflow-hidden border border-hairline bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline px-4 py-3">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wide text-tertiary">Project scope</p>
              <h2 id="agreement-heading" className="mt-1 text-[18px] font-medium tracking-tight">Current agreement</h2>
              <p className="mt-1 text-[12px] text-secondary">{data.context.currentPortal ? `${data.context.currentPortal.name}${data.context.currentPortal.isPrimary ? " · primary" : ""}` : "No active commitment scope"}</p>
            </div>
            <label className="grid gap-1 text-[10px] font-medium uppercase tracking-wide text-tertiary">
              Scope
              <select
                className="min-h-9 min-w-56 border border-hairline bg-white px-3 text-[13px] font-normal normal-case tracking-normal text-ink outline-none focus:border-accent"
                onChange={(event) => changePortal(event.target.value)}
                value={portalId}
              >
                <option value="">All project activity</option>
                {data.context.portals.map((portal) => <option key={portal.id} value={portal.id}>{portal.name}{portal.isPrimary ? " · primary" : ""}</option>)}
              </select>
            </label>
          </div>
          <div className="grid gap-px bg-hairline sm:grid-cols-2 lg:grid-cols-4">
            <div className="bg-white p-4">
              <p className="text-[10px] font-medium uppercase tracking-wide text-tertiary">Active baseline</p>
              <p className="mt-2 text-[18px] font-medium">{data.context.activeBaseline ? `Baseline ${data.context.activeBaseline.baselineNumber} · ${data.context.activeBaseline.versionLabel}` : "Not established"}</p>
              <p className="mt-1 text-[12px] text-secondary">{data.context.activeBaseline ? `${formatMoney(data.context.activeBaseline.totalMinorUnits, data.context.activeBaseline.currencyCode)} · ${formatDate(data.context.activeBaseline.establishedAt)}` : "No approved issue yet"}</p>
            </div>
            <div className="bg-white p-4">
              <p className="text-[10px] font-medium uppercase tracking-wide text-tertiary">Approvers</p>
              <p className="mt-2 text-[18px] font-medium">{data.context.activeBaseline ? `${data.context.activeBaseline.approvals.approved}/${data.context.activeBaseline.approvals.required}` : "—"}</p>
              <p className="mt-1 text-[12px] text-secondary">{data.context.activeBaseline?.approvals.names.join(", ") || "No recorded approvers"}</p>
            </div>
            <div className="bg-white p-4">
              <p className="text-[10px] font-medium uppercase tracking-wide text-tertiary">Pending issue</p>
              <p className="mt-2 text-[18px] font-medium">{data.context.currentIssue?.versionLabel ?? "None"}</p>
              <p className="mt-1 text-[12px] capitalize text-secondary">{data.context.currentIssue?.status.replaceAll("_", " ") ?? "No proposal awaiting action"}</p>
            </div>
            <div className="bg-white p-4">
              <p className="text-[10px] font-medium uppercase tracking-wide text-tertiary">Unresolved items</p>
              <p className="mt-2 text-[24px] font-medium tabular-nums">{data.context.currentIssue?.unresolvedItems ?? 0}</p>
              <p className="mt-1 text-[12px] text-secondary">Explicitly carried in the current issue</p>
            </div>
            <div className="bg-white p-4">
              <p className="text-[10px] font-medium uppercase tracking-wide text-tertiary">Open requests</p>
              <p className="mt-2 text-[24px] font-medium tabular-nums">{data.context.counts.openRequests}</p>
              <p className="mt-1 text-[12px] text-secondary">Awaiting assessment or resolution</p>
            </div>
            <div className="bg-white p-4">
              <p className="text-[10px] font-medium uppercase tracking-wide text-tertiary">Waiting discussions</p>
              <p className="mt-2 text-[24px] font-medium tabular-nums">{data.context.counts.waitingDiscussions}</p>
              <p className="mt-1 text-[12px] text-secondary">Need an owner response</p>
            </div>
            <div className="bg-white p-4 sm:col-span-2">
              <p className="text-[10px] font-medium uppercase tracking-wide text-tertiary">Latest official event</p>
              <p className="mt-2 text-[15px] font-medium">{data.context.latestOfficialEvent?.title ?? "No official events"}</p>
              <p className="mt-1 text-[12px] text-secondary">{data.context.latestOfficialEvent ? formatDate(data.context.latestOfficialEvent.occurredAt) : "This scope has no commitment history yet"}</p>
            </div>
          </div>
        </section>

        <section aria-labelledby="commitment-history-heading" className="border border-hairline bg-white shadow-sm">
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-hairline px-4 py-3">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wide text-tertiary">Official history</p>
              <h2 id="commitment-history-heading" className="mt-1 text-[18px] font-medium tracking-tight">Commitment events</h2>
            </div>
            <label className="grid gap-1 text-[10px] font-medium uppercase tracking-wide text-tertiary">
              Event type
              <select
                className="min-h-9 min-w-44 border border-hairline bg-white px-3 text-[13px] font-normal normal-case tracking-normal text-ink outline-none focus:border-accent"
                onChange={(event) => changeSource(event.target.value as ProjectCommitmentEventSourceType | "")}
                value={sourceType}
              >
                <option value="">All commitments</option>
                {PROJECT_COMMITMENT_EVENT_SOURCE_TYPES.map((source) => <option key={source} value={source}>{SOURCE_LABELS[source]}</option>)}
              </select>
            </label>
          </div>

          {error ? <p className="border-b border-hairline px-4 py-3 text-[12px] text-danger" role="alert">{error}</p> : null}
          {data.events.length === 0 ? <p className="px-4 py-10 text-center text-[13px] text-secondary">No commitment events match this scope and filter.</p> : (
            <ol className="divide-y divide-hairline">
              {data.events.map((event) => (
                <li key={event.id} id={`event-${event.id}`} className="grid gap-3 px-4 py-4 sm:grid-cols-[8rem_minmax(0,1fr)_auto]">
                  <div className="text-[11px] leading-4 text-tertiary">
                    <time dateTime={event.occurredAt}>{formatDate(event.occurredAt)}</time>
                    <p className="mt-1 capitalize">{SOURCE_LABELS[event.source.type]}</p>
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={eventStatus(event.eventType)}>{event.eventType.replaceAll(".", " ")}</StatusBadge>
                      {event.portal ? <StatusBadge status="draft">{event.portal.name}</StatusBadge> : null}
                      {event.exposure.count > 0 ? <StatusBadge status="active">Client visible</StatusBadge> : <StatusBadge status="inactive">Internal</StatusBadge>}
                    </div>
                    <Link className="mt-2 block text-[15px] font-medium text-ink hover:text-accent" href={event.href}>{event.title}</Link>
                    {event.summary ? <p className="mt-1 text-[13px] leading-5 text-secondary">{event.summary}</p> : null}
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-tertiary">
                      <span>{event.actor.name ?? event.actor.type.replaceAll("_", " ")}</span>
                      {event.rootRequest ? <span>Root request {event.rootRequest.code}{event.rootRequest.title ? ` · ${event.rootRequest.title}` : ""}</span> : null}
                    </div>
                  </div>
                  <Link className={buttonVariants({ variant: "ghost", size: "sm", className: "self-start" })} href={event.href}>Open</Link>
                </li>
              ))}
            </ol>
          )}

          {data.hasMore && data.nextCursor ? (
            <div className="border-t border-hairline p-4 text-center">
              <Button disabled={loading} onClick={() => void load({ append: true, cursor: data.nextCursor })} variant="secondary" size="sm">{loading ? "Loading…" : "Load older events"}</Button>
            </div>
          ) : null}
        </section>

        <p className="text-[11px] leading-4 text-tertiary">Timeline shows official commitments. <Link className="text-accent hover:underline" href={`${root}/activity`}>Open raw Activity</Link> for every auditable change and access event.</p>
      </main>
    </div>
  );
}
