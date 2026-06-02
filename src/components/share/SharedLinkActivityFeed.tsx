"use client";

import React, { useEffect, useState, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { loadSharedLinkActivity, type ActivityItem } from "@/lib/publication/actions"; // server action callable from client

type SharedLinkActivityFeedProps = {
  publicationToken: string;
  publicationId?: string | null;
  isOwner?: boolean;
  onActivitySeen?: () => void;
};

// Lightweight browser Supabase client for Realtime only (public anon key safe for sub; RLS + owner context in channel)
function getBrowserSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return null;
  return createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
}

export default function SharedLinkActivityFeed({ publicationToken, publicationId = null, isOwner = false, onActivitySeen }: SharedLinkActivityFeedProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  const load = useCallback(async (cursor?: string | null) => {
    if (cursor) setLoadingMore(true);
    else setLoading(true);
    setError(null);
    try {
      if (isOwner) {
        // Owner path: server action (full, including internal via RBAC inside action)
        const res = await loadSharedLinkActivity(publicationToken, { limit: 50, cursor: cursor ?? undefined });
        setActivities((current) => cursor ? [...current, ...(res.activities as ActivityItem[])] : (res.activities as ActivityItem[]));
        setHasMore(res.hasMore);
        setNextCursor(res.nextCursor ?? null);
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
      }
      onActivitySeen?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load activity");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [publicationToken, isOwner, onActivitySeen]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [load]);

  // Supabase Realtime subscription (owner only, for live updates on comment/decision/event)
  useEffect(() => {
    if (!isOwner || !publicationId) return;
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    const changeEvent = "postgres_changes" as const;

    const channel = supabase
      .channel(`shared-link-activity-${publicationId}`)
      .on(
        changeEvent,
        { event: "INSERT", schema: "public", table: "shared_link_comments", filter: `publication_id=eq.${publicationId}` },
        () => load()
      )
      .on(
        changeEvent,
        { event: "INSERT", schema: "public", table: "shared_link_responses", filter: `publication_id=eq.${publicationId}` },
        () => load()
      )
      .on(
        changeEvent,
        { event: "INSERT", schema: "public", table: "shared_link_events", filter: `publication_id=eq.${publicationId}` },
        () => load()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isOwner, publicationId, load]);

  if (loading) {
    return <div data-testid="activity-loading" className="rounded-xs p-2 text-[10px] text-tertiary">Loading activity…</div>;
  }

  if (error) {
    return (
      <div data-testid="activity-error" className="rounded-xs p-2 text-[10px] text-warning">
        {error} <Button variant="ghost" size="sm" onClick={() => load()} className="h-5 px-1 py-0 text-[9px] underline">Retry</Button>
      </div>
    );
  }

  return (
    <div data-testid="activity-feed" className="rounded-xs text-[10px] text-ink">
      <div className="mb-2 flex items-center justify-between text-[9px] text-tertiary">
        <span>Activity</span>
        <Button type="button" variant="ghost" size="sm" onClick={() => load()} className="h-5 px-1.5 py-0 text-[9px]">Refresh</Button>
      </div>
      {activities.length === 0 ? (
        <p className="text-tertiary">No activity yet.</p>
      ) : (
        <ul className="space-y-2">
          {activities.map((a) => (
            <li key={a.id} data-testid="activity-item" className="rounded-xs border border-hairline bg-surface p-2 text-[10px]">
              <div className="font-medium text-secondary">{a.title}</div>
              <div className="text-[9px] text-tertiary">{new Date(a.occurredAt).toLocaleString()}</div>
              {a.summary && <div className="mt-0.5 text-tertiary">{a.summary}</div>}
              {a.body && <div className="mt-0.5 whitespace-pre-wrap text-ink">{a.body}</div>}
              {a.badges?.map((badge) => (
                <span key={badge} className="mt-1 inline-flex rounded-xs border border-hairline px-1 text-[8px] text-warning">{badge}</span>
              ))}
              {a.visibility === "internal" && isOwner && !a.badges?.includes("Internal") && <span className="text-[8px] text-warning">Internal</span>}
            </li>
          ))}
        </ul>
      )}
      {hasMore && nextCursor ? (
        <Button type="button" variant="ghost" size="sm" onClick={() => load(nextCursor)} disabled={loadingMore} className="mt-2 h-6 px-1.5 py-0 text-[9px]">
          {loadingMore ? "Loading…" : "Load older activity"}
        </Button>
      ) : null}
      <p className="mt-2 text-[8px] text-tertiary">Live updates via Realtime (owner).</p>
    </div>
  );
}
