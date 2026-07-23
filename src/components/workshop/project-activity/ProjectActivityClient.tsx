"use client";

import { useMemo, useState, type ReactNode } from "react";
import { ArrowClockwise, ClockCounterClockwise, FunnelSimple, WarningCircle } from "@phosphor-icons/react/dist/ssr";
import { usePathname, useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { DropdownSelect, type DropdownSelectOption } from "@/components/ui/dropdown-select";
import type { ActivityFact, ActivityViewModel } from "@/lib/activity";
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

type ActivityGroup = {
  key: string;
  label: string;
  items: ActivityViewModel[];
};

type ActivityDetailSlot = {
  label: string;
  value: string;
};

const EMPTY_SLOT = "—";
const MAX_ACCUMULATED_ACTIVITY_ITEMS = 200;

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
  year: "numeric",
  timeZone: "UTC",
});

const timeFormatter = new Intl.DateTimeFormat("en", {
  hour: "numeric",
  minute: "2-digit",
  timeZone: "UTC",
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
  if (Number.isNaN(date.getTime())) return "Unknown";
  return timeFormatter.format(date);
}

function formatDay(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Undated";
  return dateFormatter.format(date);
}

function dayKey(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "undated";
  return date.toISOString().slice(0, 10);
}

function groupActivities(items: ActivityViewModel[]): ActivityGroup[] {
  const groups: ActivityGroup[] = [];
  const indexByKey = new Map<string, number>();
  for (const item of items) {
    const key = dayKey(item.occurredAt);
    const existingIndex = indexByKey.get(key);
    if (existingIndex !== undefined) {
      groups[existingIndex]?.items.push(item);
      continue;
    }
    indexByKey.set(key, groups.length);
    groups.push({ key, label: formatDay(item.occurredAt), items: [item] });
  }
  return groups;
}

function selectedOptionLabel(options: readonly DropdownSelectOption[], value: string, fallback: string) {
  return options.find((option) => option.value === value)?.label ?? fallback;
}

function activeFilterSummary(
  state: ActivityPageState,
  scopeOptions: readonly DropdownSelectOption[],
  actorOptions: readonly DropdownSelectOption[],
  recipientOptions: readonly DropdownSelectOption[],
) {
  const parts = [
    selectedOptionLabel(scopeOptions, scopeValue(state), "Whole project"),
    state.actor ? selectedOptionLabel(actorOptions, state.actor, "Selected actor") : "All actors",
    state.client ? selectedOptionLabel(recipientOptions, state.client, "Selected client") : "All clients",
  ];
  if (state.actions.length) {
    parts.push(`${state.actions.length} action ${state.actions.length === 1 ? "type" : "types"}`);
  } else {
    parts.push("All activity");
  }
  return parts.join(" · ");
}

function displayTitle(activity: ActivityViewModel) {
  if (!/^Activity recorded\.?$/i.test(activity.title.trim())) return activity.title;
  return `${sourceLabel(activity)} activity recorded.`;
}

function displaySummary(activity: ActivityViewModel) {
  if (activity.summary) return activity.summary;
  if (/^Activity recorded\.?$/i.test(activity.title.trim())) return "Details are not mapped yet, but the event is preserved in the project ledger.";
  return "";
}

function factValue(fact: ActivityFact) {
  return fact.current ?? fact.value ?? fact.previous ?? "";
}

function slotText(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : EMPTY_SLOT;
}

function compactFacts(activity: ActivityViewModel) {
  const facts = activity.facts?.filter((fact) => factValue(fact)).slice(0, 2) ?? [];
  if (facts.length) return facts;
  if (activity.delta) return [{ label: "Total change", value: activity.delta.formatted }];
  if (/^Activity recorded\.?$/i.test(activity.title.trim())) return [{ label: "Detail", value: "Unmapped event" }];
  return [];
}

function detailSlots(activity: ActivityViewModel): ActivityDetailSlot[] {
  const slots = compactFacts(activity).map((fact) => ({
    label: fact.label,
    value: slotText(factValue(fact)),
  }));
  const summary = displaySummary(activity);
  if (!slots.length && summary) {
    slots.push({ label: "Detail", value: summary });
  }
  while (slots.length < 2) {
    slots.push({ label: slots.length === 0 ? "Detail" : "Change", value: EMPTY_SLOT });
  }
  return slots.slice(0, 2);
}

function visibilityLabel(visibility: ActivityViewModel["visibility"]) {
  if (visibility === "owner") return "Owner";
  if (visibility === "public") return "Public";
  return "Internal";
}

function activityTarget(activity: ActivityViewModel) {
  return activity.target.secondaryLabel ? `${activity.target.label} · ${activity.target.secondaryLabel}` : activity.target.label;
}

function ActivitySurfaceMessage({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <section className="flex h-full min-h-0 flex-col bg-[color:var(--glass-bg)] p-3" aria-label="Project activity">
      <div className="max-w-xl rounded-xs border border-hairline bg-white/75 p-3 shadow-[0_1px_0_rgba(15,23,42,0.03)]">
        <h2 className="text-[12px] font-medium leading-4 text-ink">{title}</h2>
        <p className="mt-1 text-[10px] leading-4 text-secondary">{body}</p>
        {action}
      </div>
    </section>
  );
}

function ActivityLedgerColumnHeader() {
  return (
    <div
      role="row"
      className="hidden h-8 grid-cols-[5.25rem_minmax(9rem,13rem)_minmax(0,1.45fr)_minmax(10rem,1fr)_5.75rem] items-center border-b border-hairline bg-white/85 px-2 text-[10px] font-medium uppercase leading-3 text-tertiary md:grid md:gap-3"
    >
      <span role="columnheader">Time & Source</span>
      <span role="columnheader">Actor</span>
      <span role="columnheader">Event</span>
      <span role="columnheader">Details</span>
      <span role="columnheader" className="text-right">Status</span>
    </div>
  );
}

function ActivityRow({
  activity,
  index,
  total,
}: {
  activity: ActivityViewModel;
  index: number;
  total: number;
}) {
  const bucket = deriveActionBucket(activity);
  const details = detailSlots(activity);
  const source = sourceLabel(activity);
  const badge = activity.badges?.[0] ?? EMPTY_SLOT;

  return (
    <li className="border-t border-hairline first:border-t-0">
      <article
        role="row"
        data-testid="activity-row"
        aria-posinset={index + 1}
        aria-setsize={total}
        className="grid min-h-[92px] grid-cols-[5.25rem_minmax(0,1fr)] gap-x-2 gap-y-1 px-2 py-2 md:grid-cols-[5.25rem_minmax(9rem,13rem)_minmax(0,1.45fr)_minmax(10rem,1fr)_5.75rem] md:items-center md:gap-3"
      >
        <div
          role="cell"
          className="row-span-4 grid min-h-12 grid-rows-[1rem_1.25rem] content-start gap-1 md:row-span-1"
          data-testid="activity-time-source"
        >
          <time className="block text-[10px] font-medium leading-4 text-ink" dateTime={activity.occurredAt}>
            {formatTime(activity.occurredAt)}
          </time>
          <span
            aria-label={`Source: ${source}`}
            className="inline-flex h-5 w-[4.75rem] items-center justify-center rounded-xs border border-hairline bg-surfaceMuted px-1.5 text-[10px] font-medium leading-none text-secondary"
            data-testid={`activity-source-${activity.id}`}
          >
            <span className="truncate">{source}</span>
          </span>
        </div>

        <div role="cell" className="min-w-0" data-testid="activity-actor-action">
          <p className="truncate text-[10px] font-medium leading-4 text-ink">{actionLabels[bucket]}</p>
          <p className="truncate text-[10px] leading-4 text-tertiary">{slotText(activity.actor.displayName)}</p>
        </div>

        <div role="cell" className="min-w-0" data-testid="activity-event-slot">
          <p className="truncate text-[12px] font-medium leading-4 text-ink">{displayTitle(activity)}</p>
          <p className="truncate text-[10px] leading-4 text-secondary">{activityTarget(activity)}</p>
        </div>

        <div role="cell" className="min-w-0" data-testid="activity-detail-column">
          <dl className="grid grid-rows-[1rem_1rem] gap-1">
            {details.map((detail, detailIndex) => (
              <div
                key={`${activity.id}-${detail.label}-${detailIndex}`}
                className="grid min-w-0 grid-cols-[5rem_minmax(0,1fr)] gap-1 text-[10px] leading-4"
                data-testid="activity-detail-slot"
              >
                <dt className="truncate text-tertiary">{detail.label}</dt>
                <dd className="truncate text-secondary">{detail.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div role="cell" className="grid min-w-0 grid-cols-[minmax(0,1fr)_5.75rem] gap-1 text-[10px] leading-3 md:block md:justify-self-end md:text-right" data-testid="activity-status-column">
          <p className="truncate font-medium text-tertiary" data-testid="activity-status-slot">{visibilityLabel(activity.visibility)}</p>
          <p className="truncate text-secondary md:mt-1" data-testid="activity-status-slot">{badge}</p>
        </div>
      </article>
    </li>
  );
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
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [errorState, setErrorState] = useState<{ key: string; message: string } | null>(null);
  const activeAppendState = appendState?.key === initialKey ? appendState : null;
  const items = activeAppendState ? [...initialData.items, ...activeAppendState.appendedItems] : initialData.items;
  const groups = useMemo(() => groupActivities(items), [items]);
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
    if (!nextCursor || loadingMore || items.length >= MAX_ACCUMULATED_ACTIVITY_ITEMS) return;
    setLoadingMore(true);
    setErrorState(null);
    try {
      const params = serializeActivityPageState(initialState);
      params.set("cursor", nextCursor);
      params.set("limit", "20");
      params.set("includeCounts", "true");
      const response = await fetch(`/api/projects/${projectId}/activity?${params.toString()}`, {
        method: "GET",
        headers: { Accept: "application/json" },
      });
      if (!response.ok) throw new Error("Activity could not be loaded.");
      const page = await response.json() as ProjectActivityFeedPage;
      setAppendState((current) => {
        const currentItems = current?.key === initialKey ? current.appendedItems : [];
        const remainingCapacity = Math.max(0, MAX_ACCUMULATED_ACTIVITY_ITEMS - initialData.items.length - currentItems.length);
        const appendedItems = [...currentItems, ...page.items.slice(0, remainingCapacity)];
        return {
          key: initialKey,
          appendedItems,
          nextCursor: initialData.items.length + appendedItems.length >= MAX_ACCUMULATED_ACTIVITY_ITEMS ? null : page.nextCursor,
        counts: page.counts,
        partial: page.partial,
        unavailableSources: page.unavailableSources,
        };
      });
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
      <ActivitySurfaceMessage
        title="Activity is editor-only"
        body="You can view this project, but activity history is only available to editors."
      />
    );
  }

  if (initialLoadFailed) {
    return (
      <ActivitySurfaceMessage
        title="Activity could not be loaded"
        body="Try refreshing the activity timeline. Project data and permissions were not changed."
        action={(
          <Button className="mt-3" variant="outline" size="xs" onClick={refreshActivity}>
            <ArrowClockwise size={16} aria-hidden="true" />
            Retry
          </Button>
        )}
      />
    );
  }

  const hasFilters = initialState.scope.kind !== "whole-project" || initialState.actions.length > 0 || Boolean(initialState.actor || initialState.client);
  const noActivity = counts.scopeTotalCount === 0;
  const noMatches = counts.scopeTotalCount > 0 && counts.filteredTotalCount === 0;
  const summary = activeFilterSummary(initialState, scopeOptions, actorOptions, recipientOptions);
  const statusText = partial
    ? `Some activity sources are unavailable: ${unavailableSources.join(", ")}.`
    : hasFilters
      ? `${counts.filteredTotalCount} matching ${counts.filteredTotalCount === 1 ? "event" : "events"} in this view.`
      : "Feed complete for the selected scope.";

  return (
    <section className="flex h-full min-h-0 flex-col bg-[color:var(--glass-bg)]" aria-label="Project activity">
      <div className="relative z-10 shrink-0 border-b border-[color:var(--glass-border)] bg-white/85 px-3 py-2 shadow-[0_1px_0_rgba(15,23,42,0.03)] backdrop-blur">
        <div className="flex min-h-9 flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="flex items-center gap-1 text-[12px] font-medium leading-4 text-ink">
              <ClockCounterClockwise size={14} aria-hidden="true" />
              Activity
            </h2>
            <p className="truncate text-[10px] leading-4 text-tertiary">{projectName}</p>
          </div>
          <div className="flex min-w-0 items-center gap-2">
            <p className="shrink-0 text-[10px] leading-4 text-secondary" aria-live="polite">
              Showing {items.length} of {counts.filteredTotalCount}
            </p>
            <Button variant="outline" size="icon-xs" aria-label="Refresh activity" onClick={refreshActivity}>
              <ArrowClockwise size={16} aria-hidden="true" />
            </Button>
          </div>
        </div>

        <div className="mt-2 grid min-h-8 grid-cols-[minmax(0,1fr)_auto] gap-2 md:grid-cols-[minmax(12rem,17rem)_minmax(0,1fr)_auto]">
          <DropdownSelect
            options={scopeOptions}
            value={scopeValue(initialState)}
            onValueChange={setScope}
            variant="boxed"
            aria-label="Activity scope"
            className="h-8"
          />
          <div className="hidden min-w-0 items-center rounded-xs border border-hairline bg-surface/80 px-2 text-[10px] leading-4 text-secondary md:flex">
            <span className="truncate">{summary}</span>
          </div>
          <div className="flex items-center justify-end gap-1">
            <Button
              variant={filtersOpen || hasFilters ? "secondary" : "outline"}
              size="xs"
              className="min-w-[84px]"
              aria-expanded={filtersOpen}
              aria-controls="project-activity-filters"
              onClick={() => setFiltersOpen((open) => !open)}
            >
              <FunnelSimple size={16} aria-hidden="true" />
              Filters
            </Button>
            <Button variant="plain" size="xs" className="min-w-[56px]" onClick={clearFilters} disabled={!hasFilters}>
              Clear
            </Button>
          </div>
        </div>

        <div className="mt-2 flex h-7 items-center rounded-xs border border-transparent bg-transparent text-[10px] leading-4" role="status" aria-live="polite">
          <span className={cn("inline-flex min-w-0 items-center gap-1 truncate", partial ? "text-ink" : "text-tertiary")}>
            {partial ? <WarningCircle size={16} aria-hidden="true" className="shrink-0 text-warning" /> : null}
            <span className="truncate">{statusText}</span>
          </span>
        </div>

        {filtersOpen ? (
          <div
            id="project-activity-filters"
            aria-label="Activity filters"
            role="region"
            className="absolute left-3 right-3 top-[calc(100%-0.25rem)] z-20 rounded-xs border border-hairline bg-white p-2 shadow-[0_12px_32px_rgba(15,23,42,0.14)]"
          >
            <div className="grid gap-2 md:grid-cols-[minmax(10rem,13rem)_minmax(10rem,13rem)_auto] md:items-end">
              <DropdownSelect options={actorOptions} value={initialState.actor ?? ""} onValueChange={setActor} variant="boxed" aria-label="Actor filter" className="h-8" />
              <DropdownSelect options={recipientOptions} value={initialState.client ?? ""} onValueChange={setClient} variant="boxed" aria-label="Client filter" className="h-8" />
              <Button
                variant={initialState.actor === "me" ? "primary" : "outline"}
                size="xs"
                className="min-w-[110px]"
                aria-pressed={initialState.actor === "me"}
                onClick={() => setActor(initialState.actor === "me" ? "" : "me")}
              >
                Edited by me
              </Button>
            </div>
            <div className="mt-2">
              <p className="mb-1 text-[10px] font-medium leading-3 text-tertiary">Activity types</p>
              <div className="flex flex-wrap gap-1.5" aria-label="Action filters">
                {PROJECT_ACTIVITY_ACTION_BUCKETS.filter((bucket): bucket is ProjectActivityConcreteActionBucket => bucket !== "all").map((action) => (
                  <Chip key={action} className="min-h-6 px-2" active={initialState.actions.includes(action)} onClick={() => toggleAction(action)}>
                    {actionLabels[action]}
                  </Chip>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-3">
        <div className="min-h-full overflow-hidden rounded-xs border border-hairline bg-white/70">
          {noActivity || noMatches ? (
            <div className="p-4">
              <h3 className="text-[12px] font-medium leading-4 text-ink">{noActivity ? "No activity yet" : "No activity matches these filters"}</h3>
              <p className="mt-1 text-[10px] leading-4 text-secondary">
                {noActivity ? "Changes, shares, comments, decisions, and collaborator events will appear here." : "Clear one or more filters to broaden the timeline."}
              </p>
            </div>
          ) : (
            <div role="feed" aria-label="Project activity ledger" aria-busy={loadingMore || undefined}>
              <ActivityLedgerColumnHeader />
              {groups.map((group) => (
                <section key={group.key} aria-label={group.label}>
                  <div className="sticky top-0 z-[1] flex h-8 items-center justify-between border-b border-hairline bg-white/95 px-2">
                    <h3 className="text-[10px] font-medium leading-4 text-ink">{group.label}</h3>
                    <p className="text-[10px] leading-3 text-tertiary">{group.items.length} {group.items.length === 1 ? "event" : "events"}</p>
                  </div>
                  <ol>
                    {group.items.map((activity, groupIndex) => (
                      <ActivityRow key={activity.id} activity={activity} index={groupIndex} total={group.items.length} />
                    ))}
                  </ol>
                </section>
              ))}
            </div>
          )}

          <div className="min-h-12 border-t border-hairline px-3 py-2">
            {error ? <p className="text-[10px] leading-4 text-danger" role="alert">{error}</p> : null}
            {nextCursor && !noActivity && !noMatches ? (
              <div className="flex justify-center">
                <Button variant="outline" size="sm" onClick={loadMore} disabled={loadingMore}>
                  {loadingMore ? "Loading" : "Load more"}
                </Button>
              </div>
            ) : !error ? (
              <p className="text-center text-[10px] leading-4 text-tertiary">End of current activity</p>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
