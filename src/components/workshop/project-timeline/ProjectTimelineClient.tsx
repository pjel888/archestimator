"use client";

import { ArrowLeft, ArrowRight } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { type KeyboardEvent, useEffect, useRef, useState } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { DropdownSelect, type DropdownSelectOption } from "@/components/ui/dropdown-select";
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
  const [timelinePosition, setTimelinePosition] = useState({ atEnd: initialData.events.length <= 1, atStart: true });
  const requestGeneration = useRef(0);
  const timelineRef = useRef<HTMLDivElement>(null);
  const root = `/workshop/projects/${encodeURIComponent(projectId)}`;
  const portalOptions: DropdownSelectOption[] = [
    { label: "All project activity", value: "" },
    ...data.context.portals.map((portal) => ({
      label: `${portal.name}${portal.isPrimary ? " · primary" : ""}`,
      value: portal.id,
    })),
  ];
  const sourceOptions: DropdownSelectOption[] = [
    { label: "All commitments", value: "" },
    ...PROJECT_COMMITMENT_EVENT_SOURCE_TYPES.map((source) => ({ label: SOURCE_LABELS[source], value: source })),
  ];

  useEffect(() => {
    const timeline = timelineRef.current;
    if (!timeline) return;
    const updatePosition = () => {
      const maximumScroll = Math.max(0, timeline.scrollWidth - timeline.clientWidth);
      setTimelinePosition({
        atEnd: timeline.scrollLeft >= maximumScroll - 1,
        atStart: timeline.scrollLeft <= 1,
      });
    };
    const frameId = window.requestAnimationFrame(updatePosition);
    timeline.addEventListener("scroll", updatePosition, { passive: true });
    window.addEventListener("resize", updatePosition);
    return () => {
      window.cancelAnimationFrame(frameId);
      timeline.removeEventListener("scroll", updatePosition);
      window.removeEventListener("resize", updatePosition);
    };
  }, [data.events.length]);

  function scrollTimeline(direction: -1 | 1) {
    const timeline = timelineRef.current;
    if (!timeline) return;
    const cards = Array.from(timeline.querySelectorAll<HTMLElement>("[data-timeline-event]"));
    let target: HTMLElement | undefined;
    if (direction === 1) {
      target = cards.find((card) => card.offsetLeft > timeline.scrollLeft + 1);
    } else {
      for (let index = cards.length - 1; index >= 0; index -= 1) {
        if (cards[index]!.offsetLeft < timeline.scrollLeft - 1) {
          target = cards[index];
          break;
        }
      }
    }
    timeline.scrollTo({ left: target?.offsetLeft ?? (direction === 1 ? timeline.scrollWidth : 0) });
  }

  function jumpToLatest() {
    timelineRef.current?.scrollTo({ left: 0 });
  }

  function handleTimelineKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget) return;
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      scrollTimeline(event.key === "ArrowLeft" ? -1 : 1);
      return;
    }
    if (event.key === "Home") {
      event.preventDefault();
      jumpToLatest();
      return;
    }
    if (event.key === "End") {
      event.preventDefault();
      timelineRef.current?.scrollTo({ left: timelineRef.current.scrollWidth });
    }
  }

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
      if (!input.append) jumpToLatest();
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
    <div className="h-full min-h-0 overflow-y-auto bg-canvas text-ink">
      <header className="border-b border-hairline bg-white px-3 py-3 sm:px-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[9px] text-tertiary">Project commitments · {projectName}</p>
            <h2 className="mt-0.5 text-[12px] font-medium">Timeline</h2>
            <p className="mt-0.5 max-w-2xl text-[10px] leading-4 text-secondary">Current agreement, pending proposals, requests, files, and official decisions in one causal history.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link className={buttonVariants({ variant: "primary", size: "sm" })} href={`${root}/client-portals/compose`}>Compose issue</Link>
            <Link className={buttonVariants({ variant: "secondary", size: "sm" })} href={`${root}/artifacts`}>Files</Link>
            <Link className={buttonVariants({ variant: "secondary", size: "sm" })} href={`${root}/activity`}>Raw Activity</Link>
            <Link className={buttonVariants({ variant: "secondary", size: "sm" })} href={`${root}/client-portals`}>Portals</Link>
          </div>
        </div>
      </header>

      <div className="space-y-3 p-3 sm:p-4">
        <section aria-labelledby="agreement-heading" className="overflow-hidden border border-hairline bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline px-4 py-3">
            <div>
              <p className="text-[9px] text-tertiary">Project scope</p>
              <h3 id="agreement-heading" className="mt-0.5 text-[12px] font-medium">Current agreement</h3>
              <p className="mt-0.5 text-[10px] text-secondary">{data.context.currentPortal ? `${data.context.currentPortal.name}${data.context.currentPortal.isPrimary ? " · primary" : ""}` : "No active commitment scope"}</p>
            </div>
            <div className="grid min-w-56 gap-1 text-[9px] text-tertiary">
              <span id="timeline-scope-label">Scope</span>
              <DropdownSelect aria-labelledby="timeline-scope-label" onValueChange={changePortal} options={portalOptions} value={portalId} variant="boxed" />
            </div>
          </div>
          <div className="grid gap-px bg-hairline sm:grid-cols-2 lg:grid-cols-4">
            <div className="bg-white p-4">
              <p className="text-[9px] text-tertiary">Active baseline</p>
              <p className="mt-2 text-[12px] font-medium">{data.context.activeBaseline ? `Baseline ${data.context.activeBaseline.baselineNumber} · ${data.context.activeBaseline.versionLabel}` : "Not established"}</p>
              <p className="mt-1 text-[10px] tabular-nums text-secondary">{data.context.activeBaseline ? `${formatMoney(data.context.activeBaseline.totalMinorUnits, data.context.activeBaseline.currencyCode)} · ${formatDate(data.context.activeBaseline.establishedAt)}` : "No approved issue yet"}</p>
            </div>
            <div className="bg-white p-4">
              <p className="text-[9px] text-tertiary">Approvers</p>
              <p className="mt-2 text-[12px] font-medium tabular-nums">{data.context.activeBaseline ? `${data.context.activeBaseline.approvals.approved}/${data.context.activeBaseline.approvals.required}` : "—"}</p>
              <p className="mt-1 text-[10px] text-secondary">{data.context.activeBaseline?.approvals.names.join(", ") || "No recorded approvers"}</p>
            </div>
            <div className="bg-white p-4">
              <p className="text-[9px] text-tertiary">Pending issue</p>
              <p className="mt-2 text-[12px] font-medium">{data.context.currentIssue?.versionLabel ?? "None"}</p>
              <p className="mt-1 text-[10px] capitalize text-secondary">{data.context.currentIssue?.status.replaceAll("_", " ") ?? "No proposal awaiting action"}</p>
            </div>
            <div className="bg-white p-4">
              <p className="text-[9px] text-tertiary">Unresolved items</p>
              <p className="mt-2 text-[12px] font-medium tabular-nums">{data.context.currentIssue?.unresolvedItems ?? 0}</p>
              <p className="mt-1 text-[10px] text-secondary">Explicitly carried in the current issue</p>
            </div>
            <div className="bg-white p-4">
              <p className="text-[9px] text-tertiary">Open requests</p>
              <p className="mt-2 text-[12px] font-medium tabular-nums">{data.context.counts.openRequests}</p>
              <p className="mt-1 text-[10px] text-secondary">Awaiting assessment or resolution</p>
            </div>
            <div className="bg-white p-4">
              <p className="text-[9px] text-tertiary">Waiting discussions</p>
              <p className="mt-2 text-[12px] font-medium tabular-nums">{data.context.counts.waitingDiscussions}</p>
              <p className="mt-1 text-[10px] text-secondary">Need an owner response</p>
            </div>
            <div className="bg-white p-4 sm:col-span-2">
              <p className="text-[9px] text-tertiary">Latest official event</p>
              <p className="mt-2 text-[12px] font-medium">{data.context.latestOfficialEvent?.title ?? "No official events"}</p>
              <p className="mt-1 text-[10px] text-secondary">{data.context.latestOfficialEvent ? formatDate(data.context.latestOfficialEvent.occurredAt) : "This scope has no commitment history yet"}</p>
            </div>
          </div>
        </section>

        <section aria-labelledby="commitment-history-heading" className="border border-hairline bg-white shadow-sm">
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-hairline px-4 py-3">
            <div>
              <p className="text-[9px] text-tertiary">Official history</p>
              <h3 id="commitment-history-heading" className="mt-0.5 text-[12px] font-medium">Commitment timeline</h3>
              <p className="mt-0.5 max-w-2xl text-[10px] leading-4 text-secondary">Newest commitments appear first. Move right to trace the decisions, requests, and evidence that came before them.</p>
            </div>
            <div className="flex flex-wrap items-end gap-2">
              <div className="grid min-w-44 gap-1 text-[9px] text-tertiary">
                <span id="timeline-source-label">Event type</span>
                <DropdownSelect
                  aria-labelledby="timeline-source-label"
                  onValueChange={(value) => changeSource(value as ProjectCommitmentEventSourceType | "")}
                  options={sourceOptions}
                  value={sourceType}
                  variant="boxed"
                />
              </div>
              <div aria-label="Timeline navigation" className="flex items-center gap-1" role="group">
                <Button aria-label="Scroll timeline toward newer events" disabled={timelinePosition.atStart} onClick={() => scrollTimeline(-1)} size="icon" title="Newer events" variant="secondary">
                  <ArrowLeft aria-hidden="true" size={14} />
                </Button>
                <Button disabled={timelinePosition.atStart} onClick={jumpToLatest} size="sm" variant="secondary">Latest</Button>
                <Button aria-label="Scroll timeline toward earlier events" disabled={timelinePosition.atEnd} onClick={() => scrollTimeline(1)} size="icon" title="Earlier events" variant="secondary">
                  <ArrowRight aria-hidden="true" size={14} />
                </Button>
              </div>
            </div>
          </div>

          {error ? <p className="border-b border-hairline px-4 py-3 text-[12px] text-danger" role="alert">{error}</p> : null}
          {data.events.length === 0 ? <p className="px-4 py-10 text-center text-[10px] text-secondary">No commitment events match this scope and filter.</p> : (
            <>
              <p className="sr-only" id="timeline-keyboard-help">Use Left and Right Arrow to move through the timeline. Home returns to the latest event and End moves to the earliest loaded event.</p>
              <div className="flex items-center justify-between gap-3 border-b border-hairline bg-surfaceMuted/50 px-4 py-2 text-[10px] font-medium uppercase tracking-wide text-tertiary">
                <span>Latest</span>
                <span aria-live="polite">{loading ? "Refreshing timeline" : `${data.events.length} event${data.events.length === 1 ? "" : "s"} loaded`}</span>
                <span>Earlier</span>
              </div>
              <div
                aria-busy={loading}
                aria-describedby="timeline-keyboard-help"
                aria-label="Commitment history"
                className="snap-x snap-proximity overflow-x-auto overscroll-x-contain scroll-smooth px-4 py-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus motion-reduce:scroll-auto"
                onKeyDown={handleTimelineKeyDown}
                ref={timelineRef}
                role="region"
                tabIndex={0}
              >
                <ol className="flex min-w-max list-none gap-3 p-0">
                  {data.events.map((event, index) => {
                    const status = eventStatus(event.eventType);
                    return (
                      <li
                        aria-current={index === 0 ? "step" : undefined}
                        className="relative w-[min(20rem,calc(100vw-4rem))] shrink-0 snap-start scroll-mx-4 sm:w-80"
                        data-timeline-event
                        id={`event-${event.id}`}
                        key={event.id}
                      >
                        <div aria-hidden="true" className="relative mb-3 flex h-4 items-center">
                          {index < data.events.length - 1 ? <span className="absolute left-2.5 right-[-0.875rem] top-1/2 h-px -translate-y-1/2 bg-hairline" /> : null}
                          <span className={`relative z-10 grid size-5 place-items-center border-4 border-white ${status === "approved" ? "bg-success" : status === "danger" ? "bg-danger" : "bg-warning"}`}>
                            <span className="size-1 bg-white" />
                          </span>
                        </div>
                        <article aria-labelledby={`event-title-${event.id}`} className="flex min-h-64 flex-col border border-hairline bg-white p-4">
                          <div className="flex items-start justify-between gap-3 text-[9px] text-tertiary">
                            <span>{index === 0 ? "Latest official event" : SOURCE_LABELS[event.source.type]}</span>
                            <time className="shrink-0 text-right" dateTime={event.occurredAt}>{formatDate(event.occurredAt)}</time>
                          </div>
                          {index === 0 ? <p className="mt-1 text-[9px] text-tertiary">{SOURCE_LABELS[event.source.type]}</p> : null}
                          <div className="mt-3 flex flex-wrap items-center gap-1.5">
                            <StatusBadge className="min-w-0" status={status}>{event.eventType.replaceAll(".", " ")}</StatusBadge>
                            {event.portal ? <StatusBadge className="min-w-0" status="draft">{event.portal.name}</StatusBadge> : null}
                            {event.exposure.count > 0 ? <StatusBadge className="min-w-0" status="active">Client visible</StatusBadge> : <StatusBadge className="min-w-0" status="inactive">Internal</StatusBadge>}
                          </div>
                          <h4 className="mt-3 text-[12px] font-medium leading-4" id={`event-title-${event.id}`}>
                            <Link className="text-ink hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus" href={event.href}>{event.title}</Link>
                          </h4>
                          {event.summary ? <p className="mt-1 text-[10px] leading-4 text-secondary">{event.summary}</p> : null}
                          <div className="mt-auto flex flex-wrap gap-x-4 gap-y-1 pt-4 text-[9px] leading-4 text-tertiary">
                            <span>{event.actor.name ?? event.actor.type.replaceAll("_", " ")}</span>
                            {event.rootRequest ? <span>Root request {event.rootRequest.code}{event.rootRequest.title ? ` · ${event.rootRequest.title}` : ""}</span> : null}
                          </div>
                          <Link className={buttonVariants({ variant: "ghost", size: "sm", className: "mt-3 self-start" })} href={event.href}>Open event</Link>
                        </article>
                      </li>
                    );
                  })}
                </ol>
              </div>
            </>
          )}

          {data.hasMore && data.nextCursor ? (
            <div className="border-t border-hairline p-4 text-center">
              <Button disabled={loading} onClick={() => void load({ append: true, cursor: data.nextCursor })} variant="secondary" size="sm">{loading ? "Loading…" : "Load older events"}</Button>
            </div>
          ) : null}
        </section>

        <p className="text-[10px] leading-4 text-tertiary">Timeline shows official commitments. <Link className="text-accent hover:underline" href={`${root}/activity`}>Open raw Activity</Link> for every auditable change and access event.</p>
      </div>
    </div>
  );
}
