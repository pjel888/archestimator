"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export const ESTIMATE_COLLABORATION_CHANNEL_PREFIX = "estimate:";
export const CURSOR_BROADCAST_EVENT = "cursor";

export type EstimateCursorBroadcastPayload = {
  userId: string;
  displayName: string | null;
  x: number;
  y: number;
  rowId: string | null;
  columnId: string | null;
  sentAt: string;
};

export type RemoteEstimateCursor = EstimateCursorBroadcastPayload & {
  receivedAt: number;
};

type EstimateCursorChannelStatus = "idle" | "subscribing" | "subscribed" | "error" | "closed";
type EstimateCursorSendStatus = "idle" | "ok" | "error" | "timed out";

type UseEstimateCursorBroadcastInput = {
  estimateId: string | null | undefined;
  userId: string | null | undefined;
  displayName?: string | null;
  enabled?: boolean;
  throttleMs?: number;
};

export function useEstimateCursorCollaboration({
  estimateId,
  userId,
  displayName = null,
  enabled = true,
  throttleMs = 80,
}: UseEstimateCursorBroadcastInput) {
  const channelRef = useRef<ReturnType<ReturnType<typeof createSupabaseBrowserClient>["channel"]> | null>(null);
  const pendingPayloadRef = useRef<EstimateCursorBroadcastPayload | null>(null);
  const throttleTimerRef = useRef<number | null>(null);
  const [remoteCursorMap, setRemoteCursorMap] = useState<Map<string, RemoteEstimateCursor>>(() => new Map());
  const [channelStatus, setChannelStatus] = useState<EstimateCursorChannelStatus>("idle");
  const [lastSendStatus, setLastSendStatus] = useState<EstimateCursorSendStatus>("idle");

  useEffect(() => {
    if (!enabled || !estimateId) return;

    let supabase: ReturnType<typeof createSupabaseBrowserClient>;

    try {
      supabase = createSupabaseBrowserClient();
    } catch {
      return;
    }

    const channel = supabase.channel(`${ESTIMATE_COLLABORATION_CHANNEL_PREFIX}${estimateId}`, {
      config: { private: true },
    });
    channelRef.current = channel;
    channel
      .on("broadcast", { event: CURSOR_BROADCAST_EVENT }, ({ payload }) => {
        const cursor = payload as Partial<EstimateCursorBroadcastPayload> | null;
        if (!cursor?.userId || cursor.userId === userId || typeof cursor.x !== "number" || typeof cursor.y !== "number") return;
        const remoteUserId = cursor.userId;
        const remoteX = cursor.x;
        const remoteY = cursor.y;

        setRemoteCursorMap((current) => {
          const next = new Map(current);
          next.set(remoteUserId, {
            userId: remoteUserId,
            displayName: typeof cursor.displayName === "string" ? cursor.displayName : null,
            x: remoteX,
            y: remoteY,
            rowId: typeof cursor.rowId === "string" ? cursor.rowId : null,
            columnId: typeof cursor.columnId === "string" ? cursor.columnId : null,
            sentAt: typeof cursor.sentAt === "string" ? cursor.sentAt : new Date().toISOString(),
            receivedAt: Date.now(),
          });
          return next;
        });
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") setChannelStatus("subscribed");
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") setChannelStatus("error");
        if (status === "CLOSED") setChannelStatus("closed");
      });

    return () => {
      if (throttleTimerRef.current) window.clearTimeout(throttleTimerRef.current);
      throttleTimerRef.current = null;
      pendingPayloadRef.current = null;
      channelRef.current = null;
      setChannelStatus("idle");
      setLastSendStatus("idle");
      setRemoteCursorMap(new Map());
      void supabase.removeChannel(channel);
    };
  }, [enabled, estimateId, userId]);

  useEffect(() => {
    if (!enabled || remoteCursorMap.size === 0) return;
    const intervalId = window.setInterval(() => {
      const staleBefore = Date.now() - 5000;
      setRemoteCursorMap((current) => {
        const next = new Map(Array.from(current).filter(([, cursor]) => cursor.receivedAt >= staleBefore));
        return next.size === current.size ? current : next;
      });
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [enabled, remoteCursorMap.size]);

  const broadcastCursor = useCallback(
    (cursor: Omit<EstimateCursorBroadcastPayload, "displayName" | "sentAt" | "userId">) => {
      if (!enabled || !userId || !channelRef.current) return;

      pendingPayloadRef.current = {
        ...cursor,
        userId,
        displayName,
        sentAt: new Date().toISOString(),
      };

      if (throttleTimerRef.current) return;

      throttleTimerRef.current = window.setTimeout(() => {
        const payload = pendingPayloadRef.current;
        pendingPayloadRef.current = null;
        throttleTimerRef.current = null;
        if (!payload || !channelRef.current) return;

        void channelRef.current
          .send({
            type: "broadcast",
            event: CURSOR_BROADCAST_EVENT,
            payload,
          })
          .then((status) => setLastSendStatus(status === "ok" ? "ok" : status === "timed out" ? "timed out" : "error"))
          .catch(() => setLastSendStatus("error"));
      }, throttleMs);
    },
    [displayName, enabled, throttleMs, userId],
  );

  const remoteCursors = useMemo(() => Array.from(remoteCursorMap.values()), [remoteCursorMap]);

  return { broadcastCursor, channelStatus, lastSendStatus, remoteCursors };
}

export function useEstimateCursorBroadcast(input: UseEstimateCursorBroadcastInput) {
  const { broadcastCursor } = useEstimateCursorCollaboration(input);
  return useCallback(
    (cursor: Omit<EstimateCursorBroadcastPayload, "displayName" | "sentAt" | "userId">) => {
      broadcastCursor(cursor);
    },
    [broadcastCursor],
  );
}
