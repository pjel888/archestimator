"use client";

import { useMemo, useState } from "react";
import { ArrowClockwise, ClockCounterClockwise, FunnelSimple, WarningCircle } from "@phosphor-icons/react/dist/ssr";
import { usePathname, useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { DropdownSelect, type DropdownSelectOption } from "@/components/ui/dropdown-select";
import type { ActivityViewModel } from "@/lib/activity";
import type { ProjectActivityDropdownOption, ProjectActivityFeedPage } from "@/lib/repositories/project-activity-feed-repository";
import { cn } from "@/lib/ui/cn";
import {
  deriveActionBucket,
  PROJECT_ACTIVITY_ACTION_BUCKETS,
  type ProjectActivityConcreteActionBucket,
} from "./action-classes";
import {
  serializeActivityPageState,
  type ActivityPageState,
} from "./url-state";

type ProjectActivityClientProps = {
  projectId: string;
  projectName: string;
  currentUserId: string;
  canEdit: boolean;
  initialLoadFailed?: boolean;
  initialState: ActivityPageState;
  initialData: ProjectActivityFeedPage;
  estimates: ProjectActivityDropdownOption[];
  members: ProjectActivityDropdownOption[];
  recipients: ProjectActivityDropdownOption[];
};

type AppendState = {
  key: string;
  appendedItems: ActivityViewModel[];
  nextCursor: string | null;
  counts: ProjectActivityFeedPage["counts"];
  partial: boolean;
  unavailableSources: ProjectActivityFeedPage["unavailableSources"];
};

const actionLabels: Record<ProjectActivityConcreteActionBucket, string> = {
  created: "Created",
  edited: "Edited",
  deleted: "Deleted",
  reordered: "Reordered",
  shared: "Shared",
  commented: "Comments",
  decided: "Decisions",
  invited: "Invites",
  viewed: "Views",
  versioned: "Versions",
  system: "System",
};

const dateFormatter = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

function scopeValue(state: ActivityPageState) {
  return state.scope.kind === "estimate" ? `estimate:${state.scope.estimateId}` : state.scope.kind;
}

function nextStateUrl(pathname: string, state: ActivityPageState) {
  const query = serializeActivityPageState(state).toString();
  return `${pathname}${query ? `?${query}` : ""}`;
}

function sourceLabel(activity: ActivityViewModel) {
  if (activity.source === "estimate") return "Estimate";
  if (activity.source === "comment") return "Comment";
  if (activity.source === "decision") return "Decision";
  if (activity.source === "share") return "Share";
  return "System";
}

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown time";
  return dateFormatter.format(date);
}

export function ProjectActivityClient({
  projectId,
  projectName,
  currentUserId,
  canEdit,
  initialLoadFailed = false,
  initialState,
  initialData,
  estimates,
  members,
  recipients,
}: ProjectActivityClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const initialKey = useMemo(() => [
    scopeValue(initialState),
    initialState.actions.join(","),
    initialState.actor ?? "",
    initialState.client ?? "",
    initialData.items.map((item) => item.id).join(","),
    initialData.nextCursor ?? "",
    initialData.counts.filteredTotalCount,
    initialData.counts.scopeTotalCount,
  ].join("|"), [initialData, initialState]);
  const [appendState, setAppendState] = useState<AppendState | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [errorState, setErrorState] = useState<{ key: string; message: string } | null>(null);
  const activeAppendState = appendState?.key === initialKey ? appendState : null;
  const items = activeAppendState ? [...initialData.items, ...activeAppendState.appendedItems] : initialData.items;
  const nextCursor = activeAppendState?.nextCursor ?? initialData.nextCursor;
  const counts = activeAppendState?.counts ?? initialData.counts;
  const partial = activeAppendState?.partial ?? initialData.partial;
  const unavailableSources = activeAppendState?.unavailableSources ?? initialData.unavailableSources;
  const error = errorState?.key === initialKey ? errorState.message : null;

  const scopeOptions = useMemo<DropdownSelectOption[]>(() => [
    { value: "whole-project", label: "Whole project" },
    { value: "project-only", label: "Project only" },
    ...estimates.map((estimate) => ({
      value: `estimate:${estimate.id}`,
      label: estimate.secondaryLabel ? `${estimate.label} · ${estimate.secondaryLabel}` : estimate.label,
    })),
  ], [estimates]);

  const actorOptions = useMemo<DropdownSelectOption[]>(() => [
    { value: "", label: "All actors" },
    { value: "me", label: "Edited by me" },
    ...members.map((member) => ({ value: member.id, label: member.id === currentUserId ? `${member.label} · me` : member.label })),
  ], [currentUserId, members]);

  const recipientOptions = useMemo<DropdownSelectOption[]>(() => [
    { value: "", label: "All clients" },
    ...recipients.map((recipient) => ({ value: recipient.id, label: recipient.label })),
  ], [recipients]);

  function commitState(nextState: ActivityPageState) {
    router.replace(nextStateUrl(pathname, nextState), { scroll: false });
  }

  function setScope(value: string) {
    if (value === "project-only") commitState({ ...initialState, scope: { kind: "project-only" } });
    else if (value.startsWith("estimate:")) commitState({ ...initialState, scope: { kind: "estimate", estimateId: value.slice("estimate:".length) } });
    else commitState({ ...initialState, scope: { kind: "whole-project" } });
  }

  function setActor(value: string) {
    commitState({ ...initialState, actor: value ? value : null });
  }

  function setClient(value: string) {
    commitState({ ...initialState, client: value ? value : null });
  }

  function toggleAction(action: ProjectActivityConcreteActionBucket) {
    const exists = initialState.actions.includes(action);
    commitState({
      ...initialState,
      actions: exists ? initialState.actions.filter((item) => item !== action) : [...initialState.actions, action],
    });
  }

  function clearFilters() {
    commitState({ scope: { kind: "whole-project" }, actions: [], actor: null, client: null });
  }

  function refreshActivity() {
    setAppendState(null);
    setErrorState(null);
    router.refresh();
  }

  async function loadMore() {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    setErrorState(null);
    try {
      const params = serializeActivityPageState(initialState);
      params.set("cursor", nextCursor);
      params.set("limit", "20");
      const response = await fetch(`/api/projects/${projectId}/activity?${params.toString()}`, {
        method: "GET",
        headers: { Accept: "application/json" },
      });
      if (!response.ok) throw new Error("Activity could not be loaded.");
      const page = await response.json() as ProjectActivityFeedPage;
      setAppendState((current) => ({
        key: initialKey,
        appendedItems: [...(current?.key === initialKey ? current.appendedItems : []), ...page.items],
        nextCursor: page.nextCursor,
        counts: page.counts,
        partial: page.partial,
        unavailableSources: page.unavailableSources,
      }));
    } catch (loadError) {
      setErrorState({
        key: initialKey,
        message: loadError instanceof Error ? loadError.message : "Activity could not be loaded.",
      });
    } finally {
      setLoadingMore(false);
    }
  }

  if (!canEdit) {
    return (
      <section className="flex h-full min-h-0 flex-col bg-[color:var(--glass-bg)] p-3" aria-label="Project activity">
        <div className="max-w-xl rounded-xs border border-hairline bg-white/70 p-3">
          <h2 className="text-[12px] font-medium leading-4 text-ink">Activity is editor-only</h2>
          <p className="mt-1 text-[10px] leading-4 text-secondary">You can view this project, but activity history is only available to editors.</p>
        </div>
      </section>
    );
  }

  if (initialLoadFailed) {
    return (
      <section className="flex h-full min-h-0 flex-col bg-[color:var(--glass-bg)] p-3" aria-label="Project activity">
        <div className="max-w-xl rounded-xs border border-hairline bg-white/70 p-3">
          <h2 className="text-[12px] font-medium leading-4 text-ink">Activity could not be loaded</h2>
          <p className="mt-1 text-[10px] leading-4 text-secondary">Try refreshing the activity timeline. Project data and permissions were not changed.</p>
          <Button className="mt-3" variant="outline" size="xs" onClick={refreshActivity}>
            <ArrowClockwise size={12} aria-hidden="true" />
            Retry
          </Button>
        </div>
      </section>
    );
  }

  const hasFilters = initialState.scope.kind !== "whole-project" || initialState.actions.length > 0 || Boolean(initialState.actor || initialState.client);
  const noActivity = counts.scopeTotalCount === 0;
  const noMatches = counts.scopeTotalCount > 0 && counts.filteredTotalCount === 0;

  return (
    <section className="flex h-full min-h-0 flex-col bg-[color:var(--glass-bg)]" aria-label="Project activity">
      <div className="shrink-0 border-b border-[color:var(--glass-border)] bg-white/75 px-3 py-2 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <h2 className="flex items-center gap-1 text-[12px] font-medium leading-4 text-ink">
              <ClockCounterClockwise size={14} aria-hidden="true" />
              Activity
            </h2>
            <p className="truncate text-[10px] leading-4 text-tertiary">{projectName}</p>
          </div>
          <p className="text-[10px] leading-4 text-secondary" aria-live="polite">
            Showing {items.length} of {counts.filteredTotalCount}
          </p>
        </div>

        <form className="mt-2 flex flex-wrap items-center gap-2" role="search" aria-label="Filter project activity">
          <DropdownSelect options={scopeOptions} value={scopeValue(initialState)} onValueChange={setScope} variant="boxed" aria-label="Activity scope" className="w-[172px]" />
          <DropdownSelect options={actorOptions} value={initialState.actor ?? ""} onValueChange={setActor} variant="boxed" aria-label="Actor filter" className="w-[150px]" />
          <DropdownSelect options={recipientOptions} value={initialState.client ?? ""} onValueChange={setClient} variant="boxed" aria-label="Client filter" className="w-[150px]" />
          <Button variant={initialState.actor === "me" ? "primary" : "outline"} size="xs" onClick={() => setActor(initialState.actor === "me" ? "" : "me")}>
            <FunnelSimple size={12} aria-hidden="true" />
            Edited by me
          </Button>
          <Button variant="outline" size="xs" onClick={refreshActivity}>
            <ArrowClockwise size={12} aria-hidden="true" />
            Refresh
          </Button>
          <Button variant="plain" size="xs" onClick={clearFilters} disabled={!hasFilters}>Clear</Button>
        </form>

        <div className="mt-2 flex flex-wrap gap-1" aria-label="Action filters">
          {PROJECT_ACTIVITY_ACTION_BUCKETS.filter((bucket): bucket is ProjectActivityConcreteActionBucket => bucket !== "all").map((action) => (
            <Chip key={action} active={initialState.actions.includes(action)} onClick={() => toggleAction(action)}>
              {actionLabels[action]}
            </Chip>
          ))}
        </div>
      </div>

      {partial ? (
        <div className="shrink-0 border-b border-warning/20 bg-warning/10 px-3 py-2 text-[10px] leading-4 text-ink">
          <span className="inline-flex items-center gap-1">
            <WarningCircle size={12} aria-hidden="true" />
            Some activity sources are unavailable: {unavailableSources.join(", ")}.
          </span>
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-auto p-3">
        {noActivity || noMatches ? (
          <div className="rounded-xs border border-hairline bg-white/65 p-4">
            <h3 className="text-[12px] font-medium leading-4 text-ink">{noActivity ? "No activity yet" : "No activity matches these filters"}</h3>
            <p className="mt-1 text-[10px] leading-4 text-secondary">
              {noActivity ? "Changes, shares, comments, decisions, and collaborator events will appear here." : "Clear one or more filters to broaden the timeline."}
            </p>
          </div>
        ) : (
          <ol className="space-y-2" aria-label="Activity timeline">
            {items.map((activity) => (
              <li key={activity.id} className="rounded-xs border border-hairline bg-white/70 p-2">
                <div className="flex flex-wrap items-center gap-1 text-[9px] font-medium leading-3 text-tertiary">
                  <span className="rounded-xs border border-hairline bg-surfaceMuted px-1 py-px text-ink">{sourceLabel(activity)}</span>
                  <span>{actionLabels[deriveActionBucket(activity)]}</span>
                  <span aria-hidden="true">·</span>
                  <time dateTime={activity.occurredAt}>{formatTime(activity.occurredAt)}</time>
                </div>
                <p className="mt-1 text-[12px] font-medium leading-4 text-ink">{activity.title}</p>
                {activity.summary ? <p className="mt-1 text-[10px] leading-4 text-secondary">{activity.summary}</p> : null}
                <p className="mt-1 text-[10px] leading-4 text-tertiary">{activity.actor.displayName} · {activity.target.label}</p>
                {activity.facts?.length ? (
                  <dl className="mt-2 grid gap-1 sm:grid-cols-2">
                    {activity.facts.slice(0, 4).map((fact) => (
                      <div key={`${activity.id}-${fact.label}`} className="flex gap-1 text-[10px] leading-4">
                        <dt className="text-tertiary">{fact.label}</dt>
                        <dd className={cn("min-w-0 truncate text-secondary", (fact.current || fact.value) && "text-ink")}>{fact.current ?? fact.value ?? fact.previous}</dd>
                      </div>
                    ))}
                  </dl>
                ) : null}
              </li>
            ))}
          </ol>
        )}
        {error ? <p className="mt-2 text-[10px] leading-4 text-danger" role="alert">{error}</p> : null}
        {nextCursor && !noActivity && !noMatches ? (
          <div className="mt-3 flex justify-center">
            <Button variant="outline" size="sm" onClick={loadMore} disabled={loadingMore}>
              {loadingMore ? "Loading" : "Load more"}
            </Button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
