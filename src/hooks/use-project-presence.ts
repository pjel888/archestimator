"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  type ActiveSurface,
  isActiveSurface,
  readCurrentActiveSurface,
} from "@/lib/collaboration/presence-surface";
import { isRealtimeTransportEnabled } from "@/lib/collaboration/feature-flags";
import {
  importVerifyKey,
  verifyRealtimeIdentity,
  type RealtimeIdentityEnvelope,
} from "@/lib/collaboration/realtime-identity";
import { issueRealtimeIdentity } from "@/lib/collaboration/realtime-identity-actions";
import { reportRealtimeEvent } from "@/lib/collaboration/realtime-telemetry";
import {
  createCloudflareCollaborationRoomClient,
} from "@/lib/cloudflare/collaboration-room-client";
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
  envelope: RealtimeIdentityEnvelope;
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
// channel (no live socket). The Cloudflare room client satisfies a superset and
// is cast in the default factory.
export type PresenceRoomLike = {
  authorize?: (token: string) => Promise<string> | string;
  on: (type: "presence", filter: { event: string }, callback: () => void) => PresenceRoomLike;
  subscribe: (callback?: (status: string, err?: Error) => void) => PresenceRoomLike;
  track: (payload: ProjectPresencePayload) => unknown;
  untrack: () => unknown;
  presenceState: () => Record<string, ProjectPresencePayload[]>;
};

export type PresenceChannelLike = PresenceRoomLike;

export type PresenceClientLike = {
  openRoom: (name: string) => PresenceRoomLike;
  closeRoom: (room: PresenceRoomLike) => unknown;
};

export type PresenceClientFactory = () => PresenceClientLike;
export type PresenceIdentityIssuer = typeof issueRealtimeIdentity;

const defaultClientFactory: PresenceClientFactory = () => {
  if (!isRealtimeTransportEnabled()) throw new Error("realtime_transport_disabled");
  return createCloudflareCollaborationRoomClient() as unknown as PresenceClientLike;
};

type UseProjectPresenceInput = {
  projectId: string | null | undefined;
  currentUser: Pick<ProjectCollaboratorSummary, "id"> | null | undefined;
  /** Coarse, allowlisted surface for the current user. Defaults to the live route. */
  activeSurface?: ActiveSurface;
  enabled?: boolean;
  /** Test-only seam: inject a fake realtime client. */
  clientFactory?: PresenceClientFactory;
  identityIssuer?: PresenceIdentityIssuer;
};

const MAX_PRESENCE_RESUBSCRIBE_RETRIES = 3;

export function useProjectPresence({
  projectId,
  currentUser,
  activeSurface,
  enabled = true,
  clientFactory = defaultClientFactory,
  identityIssuer = issueRealtimeIdentity,
}: UseProjectPresenceInput): ProjectPresenceState {
  const [entries, setEntries] = useState<Map<string, ProjectPresenceEntry>>(() => new Map());
  const [status, setStatus] = useState<ProjectPresenceStatus>("idle");

  const roomRef = useRef<PresenceRoomLike | null>(null);
  const isSubscribedRef = useRef(false);
  const surfaceRef = useRef<ActiveSurface>(activeSurface ?? readCurrentActiveSurface());
  const currentUserId = currentUser?.id ?? null;
  const ownUserIdRef = useRef<string | null>(currentUserId);
  const envelopeRef = useRef<RealtimeIdentityEnvelope | null>(null);
  const verifyKeyRef = useRef<CryptoKey | null>(null);
  const verifiedCacheRef = useRef<Map<string, { sig: string; exp: number }>>(null!);
  if (verifiedCacheRef.current === null) verifiedCacheRef.current = new Map();

  // Hold the client factory in a ref so an unstable (inline) factory identity
  // never churns the subscribe effect — only projectId/identity/enabled do.
  // (Synced in an effect, not during render, per react-hooks rules.)
  const clientFactoryRef = useRef(clientFactory);
  const identityIssuerRef = useRef(identityIssuer);
  useEffect(() => {
    clientFactoryRef.current = clientFactory;
    identityIssuerRef.current = identityIssuer;
  });
  useEffect(() => {
    ownUserIdRef.current = currentUserId ?? ownUserIdRef.current;
  }, [currentUserId]);

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

    function buildPayload(): ProjectPresencePayload | null {
      const userId = ownUserIdRef.current;
      const envelope = envelopeRef.current;
      if (!userId || !envelope) return null;
      return {
        purpose: PRESENCE_STATE_PURPOSE,
        userId,
        activeSurface: surfaceRef.current,
        onlineAt: new Date().toISOString(),
        envelope,
      };
    }

    async function provisionIdentity(room?: PresenceRoomLike) {
      try {
        const identity = await identityIssuerRef.current({ topic });
        if (cancelled || !identity) return false;
        ownUserIdRef.current = identity.userId ?? identity.envelope.sub;
        envelopeRef.current = identity.envelope;
        verifyKeyRef.current = await importVerifyKey(identity.publicKey);
        if (typeof room?.authorize === "function") {
          if (!identity.roomToken) return false;
          const result = await room.authorize(identity.roomToken);
          if (result !== "ok") return false;
        }
        return true;
      } catch (error) {
        reportRealtimeEvent({
          type: "auth_refresh_failed",
          topic,
          detail: error instanceof Error ? error.message : "presence identity issuance failed",
        });
        return false;
      }
    }

    async function verifyPresence(presence: ProjectPresencePayload) {
      const verifyKey = verifyKeyRef.current;
      if (!verifyKey || !presence.envelope) return false;
      const cached = verifiedCacheRef.current.get(presence.userId);
      const nowMs = Date.now();
      if (cached && cached.sig === presence.envelope.sig && cached.exp * 1000 > nowMs) return true;
      const trusted = await verifyRealtimeIdentity({
        envelope: presence.envelope,
        publicKey: verifyKey,
        expectedTopic: topic,
        claimedUserId: presence.userId,
        nowMs,
      });
      if (trusted) {
        verifiedCacheRef.current.set(presence.userId, {
          sig: presence.envelope.sig,
          exp: presence.envelope.exp,
        });
      }
      return trusted;
    }

    async function syncPresence(room: PresenceRoomLike) {
      const state = room.presenceState();
      const next = new Map<string, ProjectPresenceEntry>();
      for (const presences of Object.values(state)) {
        for (const presence of presences) {
          if (presence?.purpose !== PRESENCE_STATE_PURPOSE || !presence.userId) continue;
          if (!(await verifyPresence(presence))) continue;
          next.set(presence.userId, {
            userId: presence.userId,
            activeSurface: isActiveSurface(presence.activeSurface) ? presence.activeSurface : "other",
            onlineAt: typeof presence.onlineAt === "string" ? presence.onlineAt : new Date().toISOString(),
          });
        }
      }
      if (!cancelled) setEntries(next);
    }

    function openRoom() {
      // StrictMode / re-entrancy guard: never hold two live sockets at once.
      if (roomRef.current) {
        client.closeRoom(roomRef.current);
        roomRef.current = null;
      }

      setStatus("subscribing");
      const room = client.openRoom(topic);
      roomRef.current = room;

      room
        .on("presence", { event: "sync" }, () => {
          void syncPresence(room);
        })
        .subscribe((subscribeStatus) => {
          if (cancelled) return;
          if (subscribeStatus === "SUBSCRIBED") {
            setStatus("subscribed");
            isSubscribedRef.current = true;
            retries = 0;
            reportRealtimeEvent({ type: "subscribed", topic });
            void provisionIdentity(room).then((ready) => {
              const payload = ready ? buildPayload() : null;
              if (!cancelled && payload) void room.track(payload);
            });
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
        openRoom();
      }, delay);
    }

    openRoom();

    // Re-track with a fresh timestamp when the tab becomes visible again
    // (backgrounded tabs can be GC'd by peers — memory: "workshop suspends when
    // tab hidden"). Pause re-tracks while hidden.
    function handleVisibility() {
      if (cancelled || !roomRef.current) return;
      if (document.visibilityState === "visible") {
        const payload = buildPayload();
        if (payload) void roomRef.current.track(payload);
      }
    }
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      cancelled = true;
      isSubscribedRef.current = false;
      envelopeRef.current = null;
      verifyKeyRef.current = null;
      verifiedCacheRef.current = new Map();
      document.removeEventListener("visibilitychange", handleVisibility);
      if (retryTimer) window.clearTimeout(retryTimer);
      if (roomRef.current) {
        client.closeRoom(roomRef.current);
        roomRef.current = null;
      }
      setStatus("idle");
    };
  }, [currentUserId, enabled, projectId]);

  // --- Re-track on surface change (no re-subscribe) -----------------------
  useEffect(() => {
    if (!activeSurface) return;
    surfaceRef.current = activeSurface;
    const room = roomRef.current;
    const payload = buildSurfacePayload(activeSurface, ownUserIdRef.current, envelopeRef.current);
    if (!room || !isSubscribedRef.current || !payload) return;
    void room.track(payload);
  }, [activeSurface, currentUserId]);

  const onlineUserIds = useMemo(() => new Set(entries.keys()), [entries]);

  return useMemo(
    () => ({ onlineUserIds, entries, status }),
    [onlineUserIds, entries, status],
  );
}

function buildSurfacePayload(
  activeSurface: ActiveSurface,
  userId: string | null,
  envelope: RealtimeIdentityEnvelope | null,
): ProjectPresencePayload | null {
  if (!userId || !envelope) return null;
  return {
    purpose: PRESENCE_STATE_PURPOSE,
    userId,
    activeSurface,
    onlineAt: new Date().toISOString(),
    envelope,
  };
}
