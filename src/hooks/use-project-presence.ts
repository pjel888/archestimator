"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  type ActiveSurface,
  isActiveSurface,
  readCurrentActiveSurface,
} from "@/lib/collaboration/presence-surface";
import { reportRealtimeEvent } from "@/lib/collaboration/realtime-telemetry";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { ProjectCollaboratorSummary } from "@/lib/collaboration/types";

export const PROJECT_COLLABORATION_CHANNEL_PREFIX = "project:";
export const PRESENCE_STATE_PURPOSE = "online-state";

/**
 * Project-channel presence payload — COARSE BY CONTRACT.
 *
 * Plan: Teamspace Improvement Plan T1.1 / finding F6 + F29 / gap G2 + G14 /
 * decisions R-2, R-14. The `project:{id}` channel is visible to every project
 * member (incl. viewers without restricted-sheet access), so it carries only an
 * allowlisted `activeSurface` — NEVER raw `activeRoute`, `activeEstimateId`,
 * `activeTabId`, or `focusedCell`. Display identity (name/avatar/color) is
 * resolved from the server-trusted roster by `userId` (decision R-3), so it is
 * intentionally absent from the wire too.
 */
export type ProjectPresencePayload = {
  purpose: typeof PRESENCE_STATE_PURPOSE;
  userId: string;
  activeSurface: ActiveSurface;
  onlineAt: string;
};

export type ProjectPresenceEntry = {
  userId: string;
  activeSurface: ActiveSurface;
  onlineAt: string;
};

export type ProjectPresenceStatus = "idle" | "subscribing" | "subscribed" | "error" | "closed";

export type ProjectPresenceState = {
  onlineUserIds: Set<string>;
  entries: Map<string, ProjectPresenceEntry>;
  status: ProjectPresenceStatus;
};

// --- Transport seam (T0.3) -------------------------------------------------
// A minimal channel/client interface so the hook is unit-testable with a fake
// channel (no live socket). The real Supabase browser client satisfies a
// superset and is cast in the default factory.
export type PresenceChannelLike = {
  on: (type: "presence", filter: { event: string }, callback: () => void) => PresenceChannelLike;
  subscribe: (callback?: (status: string, err?: Error) => void) => PresenceChannelLike;
  track: (payload: ProjectPresencePayload) => unknown;
  untrack: () => unknown;
  presenceState: () => Record<string, ProjectPresencePayload[]>;
};

export type PresenceClientLike = {
  channel: (name: string, opts?: { config?: { private?: boolean } }) => PresenceChannelLike;
  removeChannel: (channel: PresenceChannelLike) => unknown;
};

export type PresenceClientFactory = () => PresenceClientLike;

const defaultClientFactory: PresenceClientFactory = () =>
  createSupabaseBrowserClient() as unknown as PresenceClientLike;

type UseProjectPresenceInput = {
  projectId: string | null | undefined;
  currentUser: Pick<ProjectCollaboratorSummary, "id"> | null | undefined;
  /** Coarse, allowlisted surface for the current user. Defaults to the live route. */
  activeSurface?: ActiveSurface;
  enabled?: boolean;
  /** Test-only seam: inject a fake realtime client. */
  clientFactory?: PresenceClientFactory;
};

const MAX_PRESENCE_RESUBSCRIBE_RETRIES = 3;

export function useProjectPresence({
  projectId,
  currentUser,
  activeSurface,
  enabled = true,
  clientFactory = defaultClientFactory,
}: UseProjectPresenceInput): ProjectPresenceState {
  const [entries, setEntries] = useState<Map<string, ProjectPresenceEntry>>(() => new Map());
  const [status, setStatus] = useState<ProjectPresenceStatus>("idle");

  const channelRef = useRef<PresenceChannelLike | null>(null);
  const isSubscribedRef = useRef(false);
  const surfaceRef = useRef<ActiveSurface>(activeSurface ?? readCurrentActiveSurface());
  const currentUserId = currentUser?.id ?? null;

  // Hold the client factory in a ref so an unstable (inline) factory identity
  // never churns the subscribe effect — only projectId/identity/enabled do.
  // (Synced in an effect, not during render, per react-hooks rules.)
  const clientFactoryRef = useRef(clientFactory);
  useEffect(() => {
    clientFactoryRef.current = clientFactory;
  });

  // --- Subscribe / lifecycle effect ---------------------------------------
  useEffect(() => {
    if (!enabled || !projectId || !currentUserId) return;

    let cancelled = false;
    let retries = 0;
    let retryTimer: number | null = null;
    let client: PresenceClientLike;

    try {
      client = clientFactoryRef.current();
    } catch {
      return;
    }

    const topic = `${PROJECT_COLLABORATION_CHANNEL_PREFIX}${projectId}`;

    function buildPayload(): ProjectPresencePayload {
      return {
        purpose: PRESENCE_STATE_PURPOSE,
        userId: currentUserId as string,
        activeSurface: surfaceRef.current,
        onlineAt: new Date().toISOString(),
      };
    }

    function syncPresence(channel: PresenceChannelLike) {
      const state = channel.presenceState();
      const next = new Map<string, ProjectPresenceEntry>();
      for (const presences of Object.values(state)) {
        for (const presence of presences) {
          if (presence?.purpose !== PRESENCE_STATE_PURPOSE || !presence.userId) continue;
          next.set(presence.userId, {
            userId: presence.userId,
            activeSurface: isActiveSurface(presence.activeSurface) ? presence.activeSurface : "other",
            onlineAt: typeof presence.onlineAt === "string" ? presence.onlineAt : new Date().toISOString(),
          });
        }
      }
      if (!cancelled) setEntries(next);
    }

    function openChannel() {
      // StrictMode / re-entrancy guard: never hold two live channels at once.
      if (channelRef.current) {
        client.removeChannel(channelRef.current);
        channelRef.current = null;
      }

      setStatus("subscribing");
      const channel = client.channel(topic, { config: { private: true } });
      channelRef.current = channel;

      channel
        .on("presence", { event: "sync" }, () => syncPresence(channel))
        .subscribe((subscribeStatus) => {
          if (cancelled) return;
          if (subscribeStatus === "SUBSCRIBED") {
            setStatus("subscribed");
            isSubscribedRef.current = true;
            retries = 0;
            reportRealtimeEvent({ type: "subscribed", topic });
            void channel.track(buildPayload());
            return;
          }
          if (subscribeStatus === "CHANNEL_ERROR" || subscribeStatus === "TIMED_OUT") {
            setStatus("error");
            isSubscribedRef.current = false;
            reportRealtimeEvent({ type: "channel_error", topic, detail: subscribeStatus });
            scheduleResubscribe();
            return;
          }
          if (subscribeStatus === "CLOSED") {
            setStatus("closed");
            isSubscribedRef.current = false;
            reportRealtimeEvent({ type: "closed", topic });
            scheduleResubscribe();
          }
        });
    }

    function scheduleResubscribe() {
      if (cancelled || retries >= MAX_PRESENCE_RESUBSCRIBE_RETRIES) return;
      retries += 1;
      const delay = Math.min(1000 * retries, 5000);
      retryTimer = window.setTimeout(() => {
        if (cancelled) return;
        openChannel();
      }, delay);
    }

    openChannel();

    // Re-track with a fresh timestamp when the tab becomes visible again
    // (backgrounded tabs can be GC'd by peers — memory: "workshop suspends when
    // tab hidden"). Pause re-tracks while hidden.
    function handleVisibility() {
      if (cancelled || !channelRef.current) return;
      if (document.visibilityState === "visible") {
        void channelRef.current.track(buildPayload());
      }
    }
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      cancelled = true;
      isSubscribedRef.current = false;
      document.removeEventListener("visibilitychange", handleVisibility);
      if (retryTimer) window.clearTimeout(retryTimer);
      if (channelRef.current) {
        client.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      setStatus("idle");
    };
  }, [currentUserId, enabled, projectId]);

  // --- Re-track on surface change (no re-subscribe) -----------------------
  useEffect(() => {
    if (!activeSurface) return;
    surfaceRef.current = activeSurface;
    const channel = channelRef.current;
    if (!channel || !isSubscribedRef.current) return;
    void channel.track({
      purpose: PRESENCE_STATE_PURPOSE,
      userId: currentUserId as string,
      activeSurface,
      onlineAt: new Date().toISOString(),
    });
  }, [activeSurface, currentUserId]);

  const onlineUserIds = useMemo(() => new Set(entries.keys()), [entries]);

  return useMemo(
    () => ({ onlineUserIds, entries, status }),
    [onlineUserIds, entries, status],
  );
}
