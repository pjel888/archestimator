"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { loadSharedLinkActivity, type ActivityItem } from "@/lib/publication/actions"; // server action callable from client

type SharedLinkActivityFeedProps = {
  publicationToken: string;
  publicationId?: string | null;
  isOwner?: boolean;
  onActivitySeen?: () => void;
};

export default function SharedLinkActivityFeed({ publicationToken, publicationId: _publicationId = null, isOwner = false, onActivitySeen }: SharedLinkActivityFeedProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [newActivityNotice, setNewActivityNotice] = useState(false);
  const loadingRef = useRef(false);
  const newestIdRef = useRef<string | null>(null);

  const load = useCallback(async (cursor?: string | null) => {
    if (cursor) setLoadingMore(true);
    else setLoading(true);
    loadingRef.current = true;
    setError(null);
    try {
      if (isOwner) {
        // Owner path: server action (full, including internal via RBAC inside action)
        const res = await loadSharedLinkActivity(publicationToken, { limit: 50, cursor: cursor ?? undefined });
        setActivities((current) => cursor ? [...current, ...(res.activities as ActivityItem[])] : (res.activities as ActivityItem[]));
        setHasMore(res.hasMore);
        setNextCursor(res.nextCursor ?? null);
        if (!cursor) {
          const newNewest = (res.activities as ActivityItem[])[0]?.id ?? null;
          if (newestIdRef.current !== null && newNewest !== null && newNewest !== newestIdRef.current) {
            setNewActivityNotice(true);
          }
          newestIdRef.current = newNewest;
        }
      } else {
        // Public/recipient path: filtered route (never leaks is_internal)
        const url = new URL(`/api/share/${encodeURIComponent(publicationToken)}/activity`, window.location.origin);
        if (cursor) url.searchParams.set("cursor", cursor);
        const res = await fetch(url.pathname + url.search, {
          cache: "no-store",
          headers: { "Cache-Control": "no-store" },
        });
        const json = (await res.json()) as { activities?: ActivityItem[]; hasMore?: boolean; nextCursor?: string };
        setActivities((current) => cursor ? [...current, ...(json.activities || [])] : (json.activities || []));
        setHasMore(Boolean(json.hasMore));
        setNextCursor(json.nextCursor ?? null);
        if (!cursor) {
          const newNewest = (json.activities ?? [])[0]?.id ?? null;
          if (newestIdRef.current !== null && newNewest !== null && newNewest !== newestIdRef.current) {
            setNewActivityNotice(true);
          }
          newestIdRef.current = newNewest;
        }
      }
      onActivitySeen?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load activity");
    } finally {
      setLoading(false);
      setLoadingMore(false);
      loadingRef.current = false;
    }
  }, [publicationToken, isOwner, onActivitySeen]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [load]);

  // Refresh on window focus / tab visible — no always-on interval, no background load
  useEffect(() => {
    const handleFocus = () => {
      if (!loadingRef.current) void load();
    };
    const handleVisibility = () => {
      if (document.visibilityState === "visible" && !loadingRef.current) void load();
    };
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [load]);

  if (loading) {
    return (
      <div data-testid="activity-loading" className="space-y-2 rounded-xs p-2 text-[10px] text-tertiary" aria-busy="true" aria-label="Loading shared link activity">
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
        {error} <Button variant="ghost" size="sm" onClick={() => load()} className="h-5 px-1 py-0 text-[9px] underline">Retry</Button>
      </div>
    );
  }

  return (
    <section data-testid="activity-feed" className="rounded-xs text-[10px] text-ink" aria-label="Shared link activity">
      <div className="mb-2 flex items-center justify-between text-[9px] text-tertiary">
        <span>Activity</span>
        <Button type="button" variant="ghost" size="sm" onClick={() => { setNewActivityNotice(false); load(); }} className="h-5 px-1.5 py-0 text-[9px]">Refresh</Button>
      </div>
      <div aria-live="polite" className="sr-only">
        {newActivityNotice ? "New shared link activity loaded." : ""}
        {loadingMore ? "Loading older shared link activity." : ""}
      </div>
      {newActivityNotice ? (
        <div className="mb-2 rounded-xs border border-accent/30 bg-orange-50 px-2 py-1 text-[9px] font-medium text-orange-800">
          New activity loaded.
        </div>
      ) : null}
      {activities.length === 0 ? (
        <p role="status" className="rounded-xs border border-dashed border-hairline bg-white p-2 text-tertiary">No activity yet.</p>
      ) : (
        <div role="feed" aria-label="Shared link activity feed" className="space-y-2">
          {activities.map((a, index) => (
            <article
              key={a.id}
              data-testid="activity-item"
              aria-label={`${a.title} ${new Date(a.occurredAt).toLocaleString()}`}
              aria-posinset={index + 1}
              aria-setsize={activities.length}
              tabIndex={0}
              className="rounded-xs border border-hairline bg-surface p-2 text-[10px] focus:outline-none focus-visible:ring-1 focus-visible:ring-accent"
            >
              <div className="font-medium text-secondary">{a.title}</div>
              <div className="text-[9px] text-tertiary">{new Date(a.occurredAt).toLocaleString()}</div>
              {a.summary && <div className="mt-0.5 text-tertiary">{a.summary}</div>}
              {a.body && <div className="mt-0.5 whitespace-pre-wrap text-ink">{a.body}</div>}
              {a.badges?.map((badge) => (
                <span key={badge} className="mt-1 inline-flex rounded-xs border border-hairline px-1 text-[8px] text-warning">{badge}</span>
              ))}
              {a.visibility === "internal" && isOwner && !a.badges?.includes("Internal") && <span className="text-[8px] text-warning">Internal</span>}
              {a.facts?.length ? (
                <details className="mt-2 rounded-xs border border-hairline bg-white px-2 py-1 text-[9px] text-tertiary">
                  <summary className="cursor-pointer font-medium text-secondary">Activity details</summary>
                  <dl className="mt-2 grid gap-1">
                    {a.facts.map((fact) => (
                      <div key={fact.label} className="grid grid-cols-[110px_minmax(0,1fr)] gap-2">
                        <dt className="font-medium text-tertiary">{fact.label}</dt>
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
        <Button type="button" variant="ghost" size="sm" onClick={() => load(nextCursor)} disabled={loadingMore} className="mt-2 h-6 px-1.5 py-0 text-[9px]">
          {loadingMore ? "Loading…" : "Load older activity"}
        </Button>
      ) : null}
      <p className="mt-2 text-[8px] text-tertiary">Activity refreshes when you reopen this tab. Use Refresh for the latest.</p>
    </section>
  );
}
