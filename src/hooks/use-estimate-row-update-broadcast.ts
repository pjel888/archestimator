"use client";

import { useCallback, useEffect, useRef } from "react";

import { createCloudflareCollaborationRoomClient } from "@/lib/cloudflare/collaboration-room-client";
import { isRealtimeTransportEnabled } from "@/lib/collaboration/feature-flags";
import { issueRealtimeIdentity } from "@/lib/collaboration/realtime-identity-actions";
import { ESTIMATE_COLLABORATION_CHANNEL_PREFIX } from "./use-estimate-cursor-broadcast";

export const ESTIMATE_ROW_UPDATE_BROADCAST_EVENT = "row-update";
export const ESTIMATE_ROW_UPDATE_BROADCAST_MAX_AGE_MS = 30_000;

export type EstimateRowUpdateBroadcastPayload = {
  estimateId: string;
  tabId?: string | null;
  rowId: string;
  rowRevision: number;
  quantity: number;
  quantityBase: number | null;
  quantityContingencyAmount: number | null;
  contingencyPercentage: number;
  sentAt: string;
};

export type EstimateRowUpdateBroadcastFields = Omit<EstimateRowUpdateBroadcastPayload, "estimateId" | "tabId" | "sentAt">;

type RowUpdateChannelLike = {
  authorize?: (token: string) => Promise<string> | string;
  subscribe: (callback?: (status: string) => void) => RowUpdateChannelLike;
  send: (message: { type: "broadcast"; event: string; payload: EstimateRowUpdateBroadcastPayload }) => Promise<string> | string;
};

type RowUpdateClientLike = {
  openRoom: (name: string) => RowUpdateChannelLike;
  closeRoom: (room: RowUpdateChannelLike) => unknown;
};

export type RowUpdateClientFactory = () => RowUpdateClientLike;
export type RowUpdateIdentityIssuer = typeof issueRealtimeIdentity;

function isFiniteNonNegative(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function readOptionalNonNegative(value: unknown) {
  return value === null || isFiniteNonNegative(value);
}

export function isEstimateRowUpdateBroadcastPayload(
  value: unknown,
  options: { estimateId?: string; tabId?: string | null; nowMs?: number; maxAgeMs?: number } = {},
): value is EstimateRowUpdateBroadcastPayload {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const candidate = value as Partial<EstimateRowUpdateBroadcastPayload>;
  if (typeof candidate.estimateId !== "string" || !candidate.estimateId) return false;
  if (options.estimateId && candidate.estimateId !== options.estimateId) return false;
  if (candidate.tabId !== undefined && candidate.tabId !== null && typeof candidate.tabId !== "string") return false;
  if (options.tabId !== undefined && (candidate.tabId ?? null) !== options.tabId) return false;
  if (typeof candidate.rowId !== "string" || !candidate.rowId) return false;
  const rowRevision = candidate.rowRevision;
  if (typeof rowRevision !== "number" || !Number.isInteger(rowRevision) || rowRevision < 0) return false;
  if (!isFiniteNonNegative(candidate.quantity)) return false;
  if (!readOptionalNonNegative(candidate.quantityBase)) return false;
  if (!readOptionalNonNegative(candidate.quantityContingencyAmount)) return false;
  if (!Number.isFinite(candidate.contingencyPercentage)) return false;
  if (candidate.quantityBase === null && candidate.quantityContingencyAmount !== null) return false;
  if (candidate.quantityBase !== null && candidate.quantityBase !== undefined && candidate.quantityContingencyAmount === null) return false;
  if (typeof candidate.sentAt !== "string") return false;

  const sentAtMs = Date.parse(candidate.sentAt);
  if (!Number.isFinite(sentAtMs)) return false;
  const nowMs = options.nowMs ?? Date.now();
  const maxAgeMs = options.maxAgeMs ?? ESTIMATE_ROW_UPDATE_BROADCAST_MAX_AGE_MS;
  return sentAtMs <= nowMs + 1_000 && nowMs - sentAtMs <= maxAgeMs;
}

export function shouldApplyEstimateRowUpdateBroadcast(
  payload: EstimateRowUpdateBroadcastPayload,
  current: { estimateId: string; rowId: string; rowRevision?: number | null },
) {
  if (payload.estimateId !== current.estimateId) return false;
  if (payload.rowId !== current.rowId) return false;
  return payload.rowRevision > (current.rowRevision ?? 0);
}

const defaultRowUpdateClientFactory: RowUpdateClientFactory = () => {
  if (!isRealtimeTransportEnabled()) throw new Error("realtime_transport_disabled");
  return createCloudflareCollaborationRoomClient() as unknown as RowUpdateClientLike;
};

export function useEstimateRowUpdateBroadcast({
  estimateId,
  tabId = null,
  enabled = true,
  clientFactory = defaultRowUpdateClientFactory,
  identityIssuer = issueRealtimeIdentity,
}: {
  estimateId?: string | null;
  tabId?: string | null;
  enabled?: boolean;
  clientFactory?: RowUpdateClientFactory;
  identityIssuer?: RowUpdateIdentityIssuer;
}) {
  const channelRef = useRef<RowUpdateChannelLike | null>(null);
  const subscribedRef = useRef(false);
  const clientFactoryRef = useRef(clientFactory);
  const identityIssuerRef = useRef(identityIssuer);

  useEffect(() => {
    clientFactoryRef.current = clientFactory;
    identityIssuerRef.current = identityIssuer;
  }, [clientFactory, identityIssuer]);

  useEffect(() => {
    if (!enabled || !estimateId) return;
    let cancelled = false;
    let client: RowUpdateClientLike;
    try {
      client = clientFactoryRef.current();
    } catch {
      return;
    }

    const topic = `${ESTIMATE_COLLABORATION_CHANNEL_PREFIX}${estimateId}`;
    const channel = client.openRoom(topic);
    channelRef.current = channel;
    subscribedRef.current = false;
    channel.subscribe((status) => {
      if (status !== "SUBSCRIBED") {
        subscribedRef.current = false;
        return;
      }
      if (typeof channel.authorize !== "function") {
        subscribedRef.current = true;
        return;
      }
      void identityIssuerRef.current({ topic })
        .then(async (identity) => {
          if (cancelled || !identity?.roomToken || channelRef.current !== channel) return;
          const result = await channel.authorize?.(identity.roomToken);
          if (cancelled || channelRef.current !== channel) return;
          subscribedRef.current = result === "ok";
        })
        .catch(() => {
          subscribedRef.current = false;
        });
    });

    return () => {
      cancelled = true;
      subscribedRef.current = false;
      channelRef.current = null;
      void client.closeRoom(channel);
    };
  }, [enabled, estimateId]);

  return useCallback(
    (fields: EstimateRowUpdateBroadcastFields) => {
      if (!enabled || !estimateId || !channelRef.current || !subscribedRef.current) return;
      const payload: EstimateRowUpdateBroadcastPayload = {
        ...fields,
        estimateId,
        tabId,
        sentAt: new Date().toISOString(),
      };
      if (!isEstimateRowUpdateBroadcastPayload(payload, { estimateId })) return;
      void Promise.resolve(channelRef.current.send({
        type: "broadcast",
        event: ESTIMATE_ROW_UPDATE_BROADCAST_EVENT,
        payload,
      })).catch(() => undefined);
    },
    [enabled, estimateId, tabId],
  );
}
