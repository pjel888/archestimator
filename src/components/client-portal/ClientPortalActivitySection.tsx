"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

type Activity = { eventType: string; id: string; issueId: string | null; occurredAt: string; title: string };
type ActivityPage = { activities: Activity[]; hasMore: boolean; nextCursor: string | null };

function activityMode(payload: unknown) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return "none";
  const mode = (payload as { mode?: unknown }).mode;
  return mode === "collaboration" || mode === "full_safe" ? mode : "none";
}

export function ClientPortalActivitySection({ payload, sectionId, token }: { payload: unknown; sectionId: string; token: string }) {
  const mode = activityMode(payload);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [state, setState] = useState<"idle" | "loading" | "ready" | "error">("idle");

  async function loadMore() {
    setState("loading");
    const query = new URLSearchParams({ limit: "25" });
    if (cursor) query.set("cursor", cursor);
    const response = await fetch(`/api/share/${encodeURIComponent(token)}/sections/${encodeURIComponent(sectionId)}/activity?${query}`, { cache: "no-store" }).catch(() => null);
    const page = response?.ok ? await response.json().catch(() => null) as ActivityPage | null : null;
    if (!page || !Array.isArray(page.activities)) { setState("error"); return; }
    setActivities((current) => [...current, ...page.activities]);
    setCursor(page.nextCursor);
    setHasMore(page.hasMore);
    setState("ready");
  }

  useEffect(() => {
    if (mode === "none") return;
    let active = true;
    const query = new URLSearchParams({ limit: "25" });
    void fetch(`/api/share/${encodeURIComponent(token)}/sections/${encodeURIComponent(sectionId)}/activity?${query}`, { cache: "no-store" })
      .then(async (response) => response.ok ? response.json() as Promise<ActivityPage> : null)
      .then((page) => {
        if (!active) return;
        if (!page || !Array.isArray(page.activities)) { setState("error"); return; }
        setActivities(page.activities);
        setCursor(page.nextCursor);
        setHasMore(page.hasMore);
        setState("ready");
      })
      .catch(() => { if (active) setState("error"); });
    return () => { active = false; };
  }, [mode, sectionId, token]);

  if (mode === "none") return <p className="text-[13px] text-secondary">Activity is not included in this issued review.</p>;
  if (state === "error") return <p role="alert" className="text-[13px] text-secondary">Issued activity is temporarily unavailable.</p>;
  if ((state === "idle" || state === "loading") && activities.length === 0) return <p aria-live="polite" className="text-[13px] text-secondary">Loading issued activity…</p>;

  return (
    <div className="grid gap-3">
      {activities.length > 0 ? <ol className="divide-y divide-hairline border border-hairline bg-white">{activities.map((activity) => (
        <li key={activity.id} className="grid gap-1 px-4 py-3">
          <p className="text-[13px] font-medium text-ink">{activity.title}</p>
          <time className="text-[11px] text-tertiary" dateTime={activity.occurredAt}>{new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(activity.occurredAt))}</time>
        </li>
      ))}</ol> : <p className="text-[13px] text-secondary">No client-visible activity has been recorded for this issue.</p>}
      {hasMore ? <div><Button size="sm" variant="secondary" disabled={state === "loading"} onClick={() => void loadMore()}>{state === "loading" ? "Loading…" : "Load more activity"}</Button></div> : null}
    </div>
  );
}
