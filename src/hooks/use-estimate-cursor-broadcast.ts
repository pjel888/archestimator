"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  isCursorBroadcastEnabled,
  isRealtimeTransportEnabled,
} from "@/lib/collaboration/feature-flags";
import {
  importVerifyKey,
  verifyRealtimeIdentity,
  type RealtimeIdentityEnvelope,
} from "@/lib/collaboration/realtime-identity";
import { issueRealtimeIdentity } from "@/lib/collaboration/realtime-identity-actions";
import { getRealtimeIdentityRefreshDelay } from "@/lib/collaboration/realtime-refresh";
import { reportRealtimeEvent } from "@/lib/collaboration/realtime-telemetry";
import { createCloudflareCollaborationRoomClient } from "@/lib/cloudflare/collaboration-room-client";

export const ESTIMATE_COLLABORATION_CHANNEL_PREFIX = "estimate:";
export const CURSOR_BROADCAST_EVENT = "cursor";
export const CURSOR_BROADCAST_MIN_DISTANCE_PX = 6;
export const MAX_CURSOR_COORDINATE_PX = 1_000_000;
const MAX_CURSOR_RECONNECT_RETRIES = 3;

export type EstimateCursorBroadcastPayload = {
  userId: string;
  displayName: string | null;
  tabId?: string | null;
  x: number;
  y: number;
  /** Fraction (0–1) within the resolved row/cell, for drift-free anchoring (T5.1 / R-6). */
  fracX?: number | null;
  fracY?: number | null;
  rowId: string | null;
  columnId: string | null;
  sentAt: string;
  /** Sender-bound identity proof (T1.2 / R-18); receivers drop cursors that fail it. */
  envelope?: RealtimeIdentityEnvelope | null;
};

export type RemoteEstimateCursor = EstimateCursorBroadcastPayload & {
  receivedAt: number;
};

type EstimateCursorChannelStatus =
  "idle" | "subscribing" | "subscribed" | "error" | "closed";
type EstimateCursorSendStatus = "idle" | "ok" | "error" | "timed out";

// --- Transport seam (T0.3) -------------------------------------------------
export type CursorChannelLike = {
  authorize?: (token: string) => Promise<string> | string;
  on: (
    type: "broadcast",
    filter: { event: string },
    callback: (message: { payload: unknown }) => void,
  ) => CursorChannelLike;
  subscribe: (callback?: (status: string) => void) => CursorChannelLike;
  send: (message: {
    type: "broadcast";
    event: string;
    payload: EstimateCursorBroadcastPayload;
  }) => Promise<string> | string;
};

export type CursorClientLike = {
  openRoom: (name: string) => CursorChannelLike;
  closeRoom: (room: CursorChannelLike) => unknown;
};

export type CursorClientFactory = () => CursorClientLike;
export type RealtimeIdentityIssuer = (input: { topic: string }) => Promise<{
  envelope: RealtimeIdentityEnvelope;
  publicKey: string;
  userId?: string | null;
  displayName?: string | null;
  roomToken?: string | null;
} | null>;

const defaultCursorClientFactory: CursorClientFactory = () => {
  if (!isRealtimeTransportEnabled())
    throw new Error("realtime_transport_disabled");
  return createCloudflareCollaborationRoomClient() as unknown as CursorClientLike;
};

type UseEstimateCursorBroadcastInput = {
  estimateId: string | null | undefined;
  tabId?: string | null;
  userId?: string | null;
  displayName?: string | null;
  enabled?: boolean;
  throttleMs?: number;
  minDistancePx?: number;
  /**
   * Override the channel topic. Defaults to `estimate:{estimateId}`. The project
   * cursor layer (T5.3) passes `project:{projectId}` to reuse this exact engine
   * on the project channel. Must match `^(project|estimate):<uuid>$`.
   */
  channelTopic?: string;
  /** Test-only seams. */
  clientFactory?: CursorClientFactory;
  identityIssuer?: RealtimeIdentityIssuer;
};

type CursorBroadcastPosition = Pick<
  EstimateCursorBroadcastPayload,
  "tabId" | "x" | "y" | "rowId" | "columnId"
>;

export function shouldQueueCursorBroadcast(
  previous: CursorBroadcastPosition | null,
  next: CursorBroadcastPosition,
  minDistancePx = CURSOR_BROADCAST_MIN_DISTANCE_PX,
) {
  if (!previous) return true;
  if ((previous.tabId ?? null) !== (next.tabId ?? null)) return true;
  if (previous.rowId !== next.rowId || previous.columnId !== next.columnId)
    return true;
  const deltaX = next.x - previous.x;
  const deltaY = next.y - previous.y;
  return Math.hypot(deltaX, deltaY) >= minDistancePx;
}

function isValidCursorCoordinate(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    Math.abs(value) <= MAX_CURSOR_COORDINATE_PX
  );
}

function normalizeCursorFraction(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.min(1, Math.max(0, value));
}

export function useEstimateCursorCollaboration({
  estimateId,
  tabId = null,
  userId,
  displayName = null,
  enabled = true,
  throttleMs = 80,
  minDistancePx = CURSOR_BROADCAST_MIN_DISTANCE_PX,
  channelTopic,
  clientFactory = defaultCursorClientFactory,
  identityIssuer = issueRealtimeIdentity,
}: UseEstimateCursorBroadcastInput) {
  const channelRef = useRef<CursorChannelLike | null>(null);
  const pendingPayloadRef = useRef<EstimateCursorBroadcastPayload | null>(null);
  const lastQueuedCursorRef = useRef<CursorBroadcastPosition | null>(null);
  const throttleTimerRef = useRef<number | null>(null);
  // Identity: our own signed envelope (for sending) + the public key (for
  // verifying everyone else's). Both come from our OWN authenticated server call.
  const envelopeRef = useRef<RealtimeIdentityEnvelope | null>(null);
  const verifyKeyRef = useRef<CryptoKey | null>(null);
  const ownUserIdRef = useRef<string | null>(userId ?? null);
  const ownDisplayNameRef = useRef<string | null>(displayName ?? null);
  const verifiedCacheRef = useRef<Map<string, { sig: string; exp: number }>>(
    null!,
  );
  if (verifiedCacheRef.current === null) verifiedCacheRef.current = new Map();
  // Test/override seams held in refs so an inline identity changes the deps used
  // for nothing — synced in an effect (not during render) per react-hooks rules.
  const clientFactoryRef = useRef(clientFactory);
  const identityIssuerRef = useRef(identityIssuer);
  useEffect(() => {
    clientFactoryRef.current = clientFactory;
    identityIssuerRef.current = identityIssuer;
  });
  useEffect(() => {
    ownUserIdRef.current = userId ?? ownUserIdRef.current;
    ownDisplayNameRef.current = displayName ?? ownDisplayNameRef.current;
  }, [displayName, userId]);

  const [remoteCursorMap, setRemoteCursorMap] = useState<
    Map<string, RemoteEstimateCursor>
  >(() => new Map());
  const [channelStatus, setChannelStatus] =
    useState<EstimateCursorChannelStatus>("idle");
  const [lastSendStatus, setLastSendStatus] =
    useState<EstimateCursorSendStatus>("idle");

  useEffect(() => {
    if (!enabled || !estimateId) return;

    let cancelled = false;
    let identityRefreshTimer: number | null = null;
    let client: CursorClientLike;

    try {
      client = clientFactoryRef.current();
    } catch {
      return;
    }

    const topic =
      channelTopic ?? `${ESTIMATE_COLLABORATION_CHANNEL_PREFIX}${estimateId}`;
    envelopeRef.current = null;
    verifyKeyRef.current = null;
    verifiedCacheRef.current = new Map();

    let reconnectAttempts = 0;
    let reconnectTimer: number | null = null;

    function scheduleIdentityRefresh(expiresAtSeconds: number) {
      if (identityRefreshTimer !== null)
        window.clearTimeout(identityRefreshTimer);
      identityRefreshTimer = window.setTimeout(() => {
        const channel = channelRef.current;
        if (!cancelled && channel) void provisionIdentity(channel);
      }, getRealtimeIdentityRefreshDelay(expiresAtSeconds));
    }

    function clearEphemeralConnectionState() {
      if (identityRefreshTimer !== null)
        window.clearTimeout(identityRefreshTimer);
      identityRefreshTimer = null;
      envelopeRef.current = null;
      verifyKeyRef.current = null;
      verifiedCacheRef.current = new Map();
      pendingPayloadRef.current = null;
      lastQueuedCursorRef.current = null;
      setLastSendStatus("idle");
      setRemoteCursorMap(new Map());
    }

    function scheduleReconnect() {
      if (
        cancelled ||
        reconnectAttempts >= MAX_CURSOR_RECONNECT_RETRIES ||
        reconnectTimer !== null
      )
        return;
      reconnectAttempts += 1;
      const delay = Math.min(1000 * reconnectAttempts, 5000);
      reconnectTimer = window.setTimeout(() => {
        reconnectTimer = null;
        if (!cancelled) openChannel();
      }, delay);
    }

    function handleConnectionFailure(
      channel: CursorChannelLike,
      status: "CHANNEL_ERROR" | "TIMED_OUT" | "CLOSED",
    ) {
      if (channelRef.current !== channel) return;
      channelRef.current = null;
      clearEphemeralConnectionState();
      setChannelStatus(status === "CLOSED" ? "closed" : "error");
      reportRealtimeEvent({
        type: status === "CLOSED" ? "closed" : "channel_error",
        topic,
        detail: status,
      });
      void client.closeRoom(channel);
      scheduleReconnect();
    }

    async function provisionIdentity(channel: CursorChannelLike) {
      try {
        const identity = await identityIssuerRef.current({ topic });
        if (cancelled || channelRef.current !== channel || !identity) return;
        ownUserIdRef.current = identity.userId ?? identity.envelope.sub;
        ownDisplayNameRef.current = identity.displayName ?? displayName ?? null;
        envelopeRef.current = identity.envelope;
        verifyKeyRef.current = await importVerifyKey(identity.publicKey);
        if (cancelled || channelRef.current !== channel) return;
        if (typeof channel.authorize === "function") {
          if (!identity.roomToken) {
            handleConnectionFailure(channel, "CHANNEL_ERROR");
            return;
          }
          const result = await channel.authorize(identity.roomToken);
          if (result !== "ok") {
            handleConnectionFailure(channel, "CHANNEL_ERROR");
            return;
          }
        }
        scheduleIdentityRefresh(identity.envelope.exp);
        setRemoteCursorMap((current) => {
          const ownUserId = ownUserIdRef.current;
          if (!ownUserId || !current.has(ownUserId)) return current;
          const next = new Map(current);
          next.delete(ownUserId);
          return next;
        });
      } catch {
        reportRealtimeEvent({
          type: "auth_refresh_failed",
          topic,
          detail: "IDENTITY_ISSUANCE_FAILED",
        });
        handleConnectionFailure(channel, "CHANNEL_ERROR");
      }
    }

    async function acceptCursor(raw: unknown) {
      const cursor = raw as Partial<EstimateCursorBroadcastPayload> | null;
      if (
        typeof cursor?.userId !== "string" ||
        cursor.userId === ownUserIdRef.current
      )
        return;
      if (
        !isValidCursorCoordinate(cursor.x) ||
        !isValidCursorCoordinate(cursor.y)
      )
        return;
      const envelope = cursor.envelope ?? null;
      if (!envelope || !verifyKeyRef.current) {
        // No identity proof, or we cannot verify yet → drop (secure default).
        reportRealtimeEvent({
          type: "identity_rejected",
          topic,
          detail: "MISSING_ENVELOPE",
        });
        return;
      }

      const remoteUserId = cursor.userId;
      const cached = verifiedCacheRef.current.get(remoteUserId);
      const nowMs = Date.now();
      let trusted = Boolean(
        cached && cached.sig === envelope.sig && cached.exp * 1000 > nowMs,
      );
      if (!trusted) {
        trusted = await verifyRealtimeIdentity({
          envelope,
          publicKey: verifyKeyRef.current,
          expectedTopic: topic,
          claimedUserId: remoteUserId,
          nowMs,
        });
        if (trusted) {
          verifiedCacheRef.current.set(remoteUserId, {
            sig: envelope.sig,
            exp: envelope.exp,
          });
        } else {
          reportRealtimeEvent({
            type: "identity_rejected",
            topic,
            detail: "ENVELOPE_VERIFICATION_FAILED",
          });
          return;
        }
      }
      if (cancelled) return;

      const remoteX = cursor.x;
      const remoteY = cursor.y;
      setRemoteCursorMap((current) => {
        const next = new Map(current);
        next.set(remoteUserId, {
          userId: remoteUserId,
          // Identity is verified by envelope; the name is the verified sender's
          // self-reported label, rendered as escaped React text (no injection).
          displayName:
            typeof cursor.displayName === "string" ? cursor.displayName : null,
          tabId: typeof cursor.tabId === "string" ? cursor.tabId : null,
          x: remoteX,
          y: remoteY,
          fracX: normalizeCursorFraction(cursor.fracX),
          fracY: normalizeCursorFraction(cursor.fracY),
          rowId: typeof cursor.rowId === "string" ? cursor.rowId : null,
          columnId:
            typeof cursor.columnId === "string" ? cursor.columnId : null,
          sentAt:
            typeof cursor.sentAt === "string"
              ? cursor.sentAt
              : new Date().toISOString(),
          receivedAt: Date.now(),
        });
        return next;
      });
    }

    function openChannel() {
      if (channelRef.current) {
        const previous = channelRef.current;
        channelRef.current = null;
        void client.closeRoom(previous);
      }
      setChannelStatus("subscribing");
      const channel = client.openRoom(topic);
      channelRef.current = channel;
      channel
        .on("broadcast", { event: CURSOR_BROADCAST_EVENT }, ({ payload }) => {
          void acceptCursor(payload);
        })
        .subscribe((status) => {
          if (cancelled || channelRef.current !== channel) return;
          if (status === "CONNECTED") {
            void provisionIdentity(channel);
            return;
          }
          if (status === "SUBSCRIBED") {
            reconnectAttempts = 0;
            setChannelStatus("subscribed");
            reportRealtimeEvent({ type: "subscribed", topic });
            if (!envelopeRef.current) void provisionIdentity(channel);
            return;
          }
          if (
            status === "CHANNEL_ERROR" ||
            status === "TIMED_OUT" ||
            status === "CLOSED"
          ) {
            handleConnectionFailure(channel, status);
          }
        });
    }

    openChannel();

    return () => {
      cancelled = true;
      if (throttleTimerRef.current)
        window.clearTimeout(throttleTimerRef.current);
      if (identityRefreshTimer !== null)
        window.clearTimeout(identityRefreshTimer);
      if (reconnectTimer !== null) window.clearTimeout(reconnectTimer);
      throttleTimerRef.current = null;
      pendingPayloadRef.current = null;
      lastQueuedCursorRef.current = null;
      const channel = channelRef.current;
      channelRef.current = null;
      envelopeRef.current = null;
      verifyKeyRef.current = null;
      ownUserIdRef.current = userId ?? null;
      ownDisplayNameRef.current = displayName ?? null;
      verifiedCacheRef.current = new Map();
      setChannelStatus("idle");
      setLastSendStatus("idle");
      setRemoteCursorMap(new Map());
      if (channel) void client.closeRoom(channel);
    };
  }, [channelTopic, displayName, enabled, estimateId, userId]);

  useEffect(() => {
    if (!enabled || remoteCursorMap.size === 0) return;
    const intervalId = window.setInterval(() => {
      const staleBefore = Date.now() - 5000;
      setRemoteCursorMap((current) => {
        const next = new Map(
          Array.from(current).filter(
            ([, cursor]) => cursor.receivedAt >= staleBefore,
          ),
        );
        return next.size === current.size ? current : next;
      });
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [enabled, remoteCursorMap.size]);

  const broadcastCursor = useCallback(
    (
      cursor: Omit<
        EstimateCursorBroadcastPayload,
        "displayName" | "sentAt" | "userId" | "envelope"
      >,
    ) => {
      const ownUserId = ownUserIdRef.current ?? userId ?? null;
      if (!enabled || !ownUserId || !channelRef.current) return;
      if (!isCursorBroadcastEnabled()) return; // kill-switch (T0.6)
      // Until our signed identity envelope is issued, receivers would drop the
      // cursor anyway — so don't broadcast unauthenticated frames.
      if (!envelopeRef.current) return;

      if (
        !shouldQueueCursorBroadcast(
          lastQueuedCursorRef.current,
          cursor,
          minDistancePx,
        )
      )
        return;

      lastQueuedCursorRef.current = cursor;
      pendingPayloadRef.current = {
        ...cursor,
        userId: ownUserId,
        tabId,
        displayName: ownDisplayNameRef.current ?? displayName,
        sentAt: new Date().toISOString(),
        envelope: envelopeRef.current,
      };

      if (throttleTimerRef.current) return;

      throttleTimerRef.current = window.setTimeout(() => {
        const payload = pendingPayloadRef.current;
        pendingPayloadRef.current = null;
        throttleTimerRef.current = null;
        if (!payload || !channelRef.current) return;

        void Promise.resolve(
          channelRef.current.send({
            type: "broadcast",
            event: CURSOR_BROADCAST_EVENT,
            payload,
          }),
        )
          .then((status) =>
            setLastSendStatus(
              status === "ok"
                ? "ok"
                : status === "timed out"
                  ? "timed out"
                  : "error",
            ),
          )
          .catch(() => setLastSendStatus("error"));
      }, throttleMs);
    },
    [displayName, enabled, minDistancePx, tabId, throttleMs, userId],
  );

  const remoteCursors = useMemo(
    () =>
      Array.from(remoteCursorMap.values()).filter(
        (cursor) => !tabId || cursor.tabId === tabId,
      ),
    [remoteCursorMap, tabId],
  );

  return { broadcastCursor, channelStatus, lastSendStatus, remoteCursors };
}

export function useEstimateCursorBroadcast(
  input: UseEstimateCursorBroadcastInput,
) {
  const { broadcastCursor } = useEstimateCursorCollaboration(input);
  return useCallback(
    (
      cursor: Omit<
        EstimateCursorBroadcastPayload,
        "displayName" | "sentAt" | "userId" | "envelope"
      >,
    ) => {
      broadcastCursor(cursor);
    },
    [broadcastCursor],
  );
}
