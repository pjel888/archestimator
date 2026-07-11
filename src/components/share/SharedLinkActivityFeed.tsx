"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { EnsureQueryClient } from "@/components/share/ensure-query-client";
import { Button } from "@/components/ui/button";
import { loadSharedLinkActivity, type ActivityItem } from "@/lib/publication/actions"; // server action callable from client

type ActivityFeedLoadResult = {
  activities: ActivityItem[];
  hasMore: boolean;
  nextCursor?: string | null;
  partial?: boolean;
  unavailableSources?: string[];
};

type ActivityFeedLoader = (cursor?: string | null) => Promise<ActivityFeedLoadResult>;

type SharedLinkActivityFeedProps = {
  publicationToken?: string;
  publicationId?: string | null;
  loadActivity?: ActivityFeedLoader;
  feedLabel?: string;
  loadingLabel?: string;
  emptyLabel?: string;
  footerLabel?: string;
  isOwner?: boolean;
  onActivitySeen?: () => void;
};

type ActivityFeedState = {
  activities: ActivityItem[];
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  nextCursor: string | null;
  newActivityNotice: boolean;
  partial: boolean;
  unavailableSources: string[];
};

type ActivityFeedAction =
  | { type: "load:start"; cursor?: string | null }
  | {
      type: "load:success";
      cursor?: string | null;
      activities: ActivityItem[];
      hasMore: boolean;
      nextCursor: string | null;
      showNewActivityNotice: boolean;
      partial: boolean;
      unavailableSources: string[];
    }
  | { type: "load:error"; message: string }
  | { type: "notice:clear" };

const INITIAL_ACTIVITY_FEED_STATE: ActivityFeedState = {
  activities: [],
  loading: true,
  loadingMore: false,
  error: null,
  hasMore: false,
  nextCursor: null,
  newActivityNotice: false,
  partial: false,
  unavailableSources: [],
};

function activityFeedReducer(state: ActivityFeedState, action: ActivityFeedAction): ActivityFeedState {
  switch (action.type) {
    case "load:start":
      return {
        ...state,
        loading: action.cursor ? state.loading : true,
        loadingMore: Boolean(action.cursor),
        error: null,
      };
    case "load:success":
      return {
        ...state,
        activities: action.cursor ? [...state.activities, ...action.activities] : action.activities,
        loading: false,
        loadingMore: false,
        error: null,
        hasMore: action.hasMore,
        nextCursor: action.nextCursor,
        newActivityNotice: state.newActivityNotice || action.showNewActivityNotice,
        partial: action.partial,
        unavailableSources: action.unavailableSources,
      };
    case "load:error":
      return {
        ...state,
        loading: false,
        loadingMore: false,
        error: action.message,
      };
    case "notice:clear":
      return { ...state, newActivityNotice: false };
    default:
      return state;
  }
}

function SharedLinkActivityFeedInner({
  publicationToken,
  loadActivity,
  feedLabel = "Shared link activity",
  loadingLabel = "Loading shared link activity",
  emptyLabel = "No activity yet.",
  footerLabel = "Activity refreshes when you reopen this tab. Use Refresh for the latest.",
  isOwner = false,
  onActivitySeen,
}: SharedLinkActivityFeedProps) {
  const [feedState, dispatchFeed] = useReducer(activityFeedReducer, INITIAL_ACTIVITY_FEED_STATE);
  const { activities, loading, loadingMore, error, hasMore, nextCursor, newActivityNotice, partial, unavailableSources } = feedState;
  const loadingRef = useRef(false);
  const newestIdRef = useRef<string | null>(null);

  const load = useCallback(async (cursor?: string | null) => {
    dispatchFeed({ type: "load:start", cursor });
    loadingRef.current = true;
    try {
      let nextActivities: ActivityItem[];
      let nextHasMore: boolean;
      let nextCursorValue: string | null;
      let nextPartial = false;
      let nextUnavailableSources: string[] = [];
      if (loadActivity) {
        const res = await loadActivity(cursor ?? null);
        nextActivities = res.activities as ActivityItem[];
        nextHasMore = res.hasMore;
        nextCursorValue = res.nextCursor ?? null;
        nextPartial = Boolean(res.partial);
        nextUnavailableSources = res.unavailableSources ?? [];
      } else if (isOwner) {
        if (!publicationToken) throw new Error("Publication token is required.");
        // Owner path: server action (full, including internal via RBAC inside action)
        const res = await loadSharedLinkActivity(publicationToken, { limit: 50, cursor: cursor ?? undefined });
        nextActivities = res.activities as ActivityItem[];
        nextHasMore = res.hasMore;
        nextCursorValue = res.nextCursor ?? null;
      } else {
        if (!publicationToken) throw new Error("Publication token is required.");
        // Public/recipient path: filtered route (never leaks is_internal)
        const url = new URL(`/api/share/${encodeURIComponent(publicationToken)}/activity`, window.location.origin);
        if (cursor) url.searchParams.set("cursor", cursor);
        const res = await fetch(url.pathname + url.search, {
          cache: "no-store",
          headers: { "Cache-Control": "no-store" },
        });
        const json = (await res.json()) as { activities?: ActivityItem[]; hasMore?: boolean; nextCursor?: string };
        nextActivities = json.activities || [];
        nextHasMore = Boolean(json.hasMore);
        nextCursorValue = json.nextCursor ?? null;
      }
      let showNewActivityNotice = false;
      if (!cursor) {
        const newNewest = nextActivities[0]?.id ?? null;
        showNewActivityNotice = newestIdRef.current !== null && newNewest !== null && newNewest !== newestIdRef.current;
        newestIdRef.current = newNewest;
      }
      dispatchFeed({
        type: "load:success",
        cursor,
        activities: nextActivities,
        hasMore: nextHasMore,
        nextCursor: nextCursorValue,
        showNewActivityNotice,
        partial: nextPartial,
        unavailableSources: nextUnavailableSources,
      });
      onActivitySeen?.();
    } catch (e) {
      dispatchFeed({ type: "load:error", message: e instanceof Error ? e.message : "Failed to load activity" });
    } finally {
      loadingRef.current = false;
    }
  }, [publicationToken, loadActivity, isOwner, onActivitySeen]);

  // Initial page via TanStack Query (cache + focus refetch). Pagination still uses `load(cursor)`.
  const activityQuery = useQuery({
    queryKey: ["share-activity", publicationToken ?? "none", isOwner, Boolean(loadActivity)] as const,
    enabled: Boolean(loadActivity) || Boolean(publicationToken),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      if (loadActivity) return loadActivity(null);
      if (!publicationToken) throw new Error("Publication token is required.");
      if (isOwner) {
        const res = await loadSharedLinkActivity(publicationToken, { limit: 50 });
        return {
          activities: res.activities as ActivityItem[],
          hasMore: res.hasMore,
          nextCursor: res.nextCursor ?? null,
        } satisfies ActivityFeedLoadResult;
      }
      const url = new URL(`/api/share/${encodeURIComponent(publicationToken)}/activity`, window.location.origin);
      const res = await fetch(url.pathname + url.search, {
        cache: "no-store",
        headers: { "Cache-Control": "no-store" },
      });
      const json = (await res.json()) as { activities?: ActivityItem[]; hasMore?: boolean; nextCursor?: string };
      return {
        activities: json.activities || [],
        hasMore: Boolean(json.hasMore),
        nextCursor: json.nextCursor ?? null,
      } satisfies ActivityFeedLoadResult;
    },
  });

  useEffect(() => {
    if (activityQuery.isFetching && activities.length === 0) {
      dispatchFeed({ type: "load:start" });
      return;
    }
    if (activityQuery.isError) {
      dispatchFeed({
        type: "load:error",
        message: activityQuery.error instanceof Error ? activityQuery.error.message : "Failed to load activity",
      });
      return;
    }
    if (!activityQuery.data) return;
    const nextActivities = activityQuery.data.activities;
    const newNewest = nextActivities[0]?.id ?? null;
    const showNewActivityNotice =
      newestIdRef.current !== null && newNewest !== null && newNewest !== newestIdRef.current;
    newestIdRef.current = newNewest;
    dispatchFeed({
      type: "load:success",
      activities: nextActivities,
      hasMore: activityQuery.data.hasMore,
      nextCursor: activityQuery.data.nextCursor ?? null,
      showNewActivityNotice,
      partial: Boolean(activityQuery.data.partial),
      unavailableSources: activityQuery.data.unavailableSources ?? [],
    });
    onActivitySeen?.();
  }, [
    activities.length,
    activityQuery.data,
    activityQuery.error,
    activityQuery.isError,
    activityQuery.isFetching,
    onActivitySeen,
  ]);

  // AC-MOD-08: explicit focus/visibility refetch (jsdom + product behavior).
  useEffect(() => {
    const handleFocus = () => {
      if (!loadingRef.current) void activityQuery.refetch();
    };
    const handleVisibility = () => {
      if (document.visibilityState === "visible" && !loadingRef.current) void activityQuery.refetch();
    };
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [activityQuery]);


  if (loading) {
    return (
      <div data-testid="activity-loading" className="space-y-2 rounded-xs p-2 text-[10px] text-secondary" aria-busy="true" aria-label={loadingLabel}>
        <p>Loading activity…</p>
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="h-10 rounded-xs border border-hairline bg-surfaceMuted/60" aria-hidden="true" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div data-testid="activity-error" role="alert" className="rounded-xs p-2 text-[10px] text-warning">
        {error} <Button variant="ghost" size="sm" onClick={() => load()} className="h-5 px-1 py-0 text-[10px] underline">Retry</Button>
      </div>
    );
  }

  return (
    <section data-testid="activity-feed" className="rounded-xs text-[10px] text-ink" aria-label={feedLabel}>
      <div className="mb-2 flex items-center justify-between text-[10px] text-secondary">
        <span>Activity</span>
        <Button type="button" variant="ghost" size="sm" onClick={() => { dispatchFeed({ type: "notice:clear" }); void activityQuery.refetch(); }} className="h-6 px-1.5 py-0 text-[10px]">Refresh</Button>
      </div>
      <div aria-live="polite" className="sr-only">
        {newActivityNotice ? "New shared link activity loaded." : ""}
        {loadingMore ? "Loading older shared link activity." : ""}
      </div>
      {newActivityNotice ? (
        <div className="mb-2 rounded-xs border border-accent/25 bg-accent-soft px-2 py-1 text-[10px] font-medium text-accent-dark">
          New activity loaded.
        </div>
      ) : null}
      {partial ? (
        <div role="status" className="mb-2 rounded-xs border border-warningSoft bg-warningSoft px-2 py-1 text-[10px] font-medium text-warning">
          Partial activity{unavailableSources.length ? `: ${unavailableSources.join(", ")} unavailable.` : "."}
        </div>
      ) : null}
      {activities.length === 0 ? (
        <p role="status" className="rounded-xs border border-dashed border-hairline bg-white p-2 text-secondary">{emptyLabel}</p>
      ) : (
        <div role="feed" aria-label={`${feedLabel} feed`} className="space-y-2">
          {activities.map((a, index) => (
            <article
              key={a.id}
              data-testid="activity-item"
              aria-label={`${a.title} ${new Date(a.occurredAt).toLocaleString()}`}
              aria-posinset={index + 1}
              aria-setsize={activities.length}
              tabIndex={0}
              className="rounded-xs border border-hairline bg-surface p-2 text-[10px]"
            >
              <div className="font-medium text-secondary">{a.title}</div>
              <div className="text-[10px] text-secondary">{new Date(a.occurredAt).toLocaleString()}</div>
              {a.summary && <div className="mt-0.5 text-secondary">{a.summary}</div>}
              {a.body && <div className="mt-0.5 whitespace-pre-wrap text-ink">{a.body}</div>}
              {a.badges?.map((badge) => (
                <span key={badge} className="mt-1 inline-flex rounded-xs border border-hairline px-1 text-[10px] text-warning">{badge}</span>
              ))}
              {a.visibility === "internal" && isOwner && !a.badges?.includes("Internal") && <span className="text-[10px] text-warning">Internal</span>}
              {a.facts?.length ? (
                <details className="mt-2 rounded-xs border border-hairline bg-white px-2 py-1 text-[10px] text-secondary">
                  <summary className="cursor-pointer font-medium text-secondary">Activity details</summary>
                  <dl className="mt-2 grid gap-1">
                    {a.facts.map((fact) => (
                      <div key={fact.label} className="grid grid-cols-[110px_minmax(0,1fr)] gap-2">
                        <dt className="font-medium text-secondary">{fact.label}</dt>
                        <dd className="min-w-0 break-words text-ink">{fact.value ?? fact.current ?? fact.previous ?? "Available"}</dd>
                      </div>
                    ))}
                  </dl>
                </details>
              ) : null}
            </article>
          ))}
        </div>
      )}
      {hasMore && nextCursor ? (
        <Button type="button" variant="ghost" size="sm" onClick={() => load(nextCursor)} disabled={loadingMore} className="mt-2 h-6 px-1.5 py-0 text-[10px]">
          {loadingMore ? "Loading…" : "Load older activity"}
        </Button>
      ) : null}
      <p className="mt-2 text-[10px] text-secondary">{footerLabel}</p>
    </section>
  );
}


export default function SharedLinkActivityFeed(props: SharedLinkActivityFeedProps) {
  return (
    <EnsureQueryClient>
      <SharedLinkActivityFeedInner {...props} />
    </EnsureQueryClient>
  );
}
