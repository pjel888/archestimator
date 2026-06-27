"use client";

import { useCallback, useEffect, useRef } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
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
  subscribe: (callback?: (status: string) => void) => RowUpdateChannelLike;
  send: (message: { type: "broadcast"; event: string; payload: EstimateRowUpdateBroadcastPayload }) => Promise<string> | string;
};

type RowUpdateClientLike = {
  channel: (name: string, opts?: { config?: { private?: boolean } }) => RowUpdateChannelLike;
  removeChannel: (channel: RowUpdateChannelLike) => unknown;
};

export type RowUpdateClientFactory = () => RowUpdateClientLike;

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

const defaultRowUpdateClientFactory: RowUpdateClientFactory = () =>
  createSupabaseBrowserClient() as unknown as RowUpdateClientLike;

export function useEstimateRowUpdateBroadcast({
  estimateId,
  tabId = null,
  enabled = true,
  clientFactory = defaultRowUpdateClientFactory,
}: {
  estimateId?: string | null;
  tabId?: string | null;
  enabled?: boolean;
  clientFactory?: RowUpdateClientFactory;
}) {
  const channelRef = useRef<RowUpdateChannelLike | null>(null);
  const subscribedRef = useRef(false);
  const clientFactoryRef = useRef(clientFactory);

  useEffect(() => {
    clientFactoryRef.current = clientFactory;
  }, [clientFactory]);

  useEffect(() => {
    if (!enabled || !estimateId) return;
    let client: RowUpdateClientLike;
    try {
      client = clientFactoryRef.current();
    } catch {
      return;
    }

    const channel = client.channel(`${ESTIMATE_COLLABORATION_CHANNEL_PREFIX}${estimateId}`, { config: { private: true } });
    channelRef.current = channel;
    subscribedRef.current = false;
    channel.subscribe((status) => {
      subscribedRef.current = status === "SUBSCRIBED";
    });

    return () => {
      subscribedRef.current = false;
      channelRef.current = null;
      void client.removeChannel(channel);
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
