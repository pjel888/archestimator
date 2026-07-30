"use client";

import { useCallback, useEffect, useRef } from "react";

import {
  createEstimateContributionRealtimeEvent,
  decideEstimateContributionRealtimeEvent,
  ESTIMATE_CONTRIBUTION_BROADCAST_EVENT,
  type EstimateContributionBroadcastReceipt,
  type EstimateContributionRealtimeDecision,
  type EstimateContributionRealtimeEvent,
  type EstimateContributionRealtimeScope,
} from "@/lib/collaboration/estimate-tree-realtime-contract";
import { isRealtimeTransportEnabled } from "@/lib/collaboration/feature-flags";
import { issueRealtimeIdentity } from "@/lib/collaboration/realtime-identity-actions";
import { createCloudflareCollaborationRoomClient } from "@/lib/cloudflare/collaboration-room-client";
import { ESTIMATE_COLLABORATION_CHANNEL_PREFIX } from "./use-estimate-cursor-broadcast";

const MAX_SEEN_CONTRIBUTION_MUTATIONS = 256;

type ContributionChannelLike = {
  authorize?: (token: string) => Promise<string> | string;
  on: (
    type: "broadcast",
    filter: { event: string },
    callback: (message: { payload: unknown }) => void,
  ) => ContributionChannelLike;
  subscribe: (callback?: (status: string) => void) => ContributionChannelLike;
  send: (message: {
    type: "broadcast";
    event: string;
    payload: EstimateContributionRealtimeEvent;
  }) => Promise<string> | string;
};

type ContributionClientLike = {
  openRoom: (name: string) => ContributionChannelLike;
  closeRoom: (room: ContributionChannelLike) => unknown;
};

export type ContributionClientFactory = () => ContributionClientLike;
export type ContributionIdentityIssuer = typeof issueRealtimeIdentity;
export type EstimateContributionRealtimeCallback = (
  decision: Extract<EstimateContributionRealtimeDecision, { action: "apply" | "refetch" }>,
) => void | Promise<void>;

const defaultContributionClientFactory: ContributionClientFactory = () => {
  if (!isRealtimeTransportEnabled()) throw new Error("realtime_transport_disabled");
  return createCloudflareCollaborationRoomClient() as unknown as ContributionClientLike;
};

function rememberMutation(seenMutationIds: Set<string>, mutationId: string) {
  seenMutationIds.add(mutationId);
  if (seenMutationIds.size <= MAX_SEEN_CONTRIBUTION_MUTATIONS) return;
  const oldestMutationId = seenMutationIds.values().next().value;
  if (typeof oldestMutationId === "string") seenMutationIds.delete(oldestMutationId);
}

export function useEstimateContributionBroadcast({
  estimateId,
  tabId,
  contributionScopeId,
  scopeRevision,
  onRealtimeDecision,
  enabled = true,
  clientFactory = defaultContributionClientFactory,
  identityIssuer = issueRealtimeIdentity,
}: {
  estimateId?: string | null;
  tabId?: string | null;
  contributionScopeId?: string | null;
  scopeRevision: number;
  onRealtimeDecision: EstimateContributionRealtimeCallback;
  enabled?: boolean;
  clientFactory?: ContributionClientFactory;
  identityIssuer?: ContributionIdentityIssuer;
}) {
  const channelRef = useRef<ContributionChannelLike | null>(null);
  const subscribedRef = useRef(false);
  const revisionRef = useRef(scopeRevision);
  const seenMutationIdsRef = useRef(new Set<string>());
  const callbackRef = useRef(onRealtimeDecision);
  const clientFactoryRef = useRef(clientFactory);
  const identityIssuerRef = useRef(identityIssuer);

  useEffect(() => {
    revisionRef.current = scopeRevision;
    callbackRef.current = onRealtimeDecision;
    clientFactoryRef.current = clientFactory;
    identityIssuerRef.current = identityIssuer;
  }, [clientFactory, identityIssuer, onRealtimeDecision, scopeRevision]);

  useEffect(() => {
    if (!enabled || !estimateId || !tabId || !contributionScopeId) return;

    let cancelled = false;
    let client: ContributionClientLike;
    try {
      client = clientFactoryRef.current();
    } catch {
      return;
    }

    const scope: EstimateContributionRealtimeScope = { estimateId, tabId, contributionScopeId };
    const topic = `${ESTIMATE_COLLABORATION_CHANNEL_PREFIX}${estimateId}`;
    const channel = client.openRoom(topic);
    channelRef.current = channel;
    subscribedRef.current = false;

    channel
      .on("broadcast", { event: ESTIMATE_CONTRIBUTION_BROADCAST_EVENT }, ({ payload }) => {
        const decision = decideEstimateContributionRealtimeEvent({
          payload,
          expectedScope: scope,
          currentRevision: revisionRef.current,
          seenMutationIds: seenMutationIdsRef.current,
        });
        if (decision.action === "ignore") return;
        if (decision.event) rememberMutation(seenMutationIdsRef.current, decision.event.mutationId);
        if (decision.action === "apply") revisionRef.current = decision.event.scopeRevision;
        void Promise.resolve(callbackRef.current(decision)).catch(() => undefined);
      })
      .subscribe((status) => {
        if (cancelled || channelRef.current !== channel) return;
        if (status === "CONNECTED") {
          if (typeof channel.authorize !== "function") return;
          void identityIssuerRef.current({ topic })
            .then(async (identity) => {
              if (cancelled || !identity?.roomToken || channelRef.current !== channel) return;
              await channel.authorize?.(identity.roomToken);
            })
            .catch(() => undefined);
          return;
        }
        if (status === "SUBSCRIBED") {
          subscribedRef.current = true;
          return;
        }
        subscribedRef.current = false;
      });

    return () => {
      cancelled = true;
      subscribedRef.current = false;
      channelRef.current = null;
      void client.closeRoom(channel);
    };
  }, [contributionScopeId, enabled, estimateId, tabId]);

  const broadcastContributionChange = useCallback((
    receipt: EstimateContributionBroadcastReceipt,
    contributionScopeIdOverride?: string,
  ) => {
    const resolvedContributionScopeId = contributionScopeIdOverride ?? contributionScopeId;
    if (!enabled || !estimateId || !tabId || !resolvedContributionScopeId || !subscribedRef.current || !channelRef.current) return;
    const event = createEstimateContributionRealtimeEvent(
      { estimateId, tabId, contributionScopeId: resolvedContributionScopeId },
      receipt,
    );
    if (!event) return;
    rememberMutation(seenMutationIdsRef.current, event.mutationId);
    revisionRef.current = Math.max(revisionRef.current, event.scopeRevision);
    void Promise.resolve(channelRef.current.send({
      type: "broadcast",
      event: ESTIMATE_CONTRIBUTION_BROADCAST_EVENT,
      payload: event,
    })).catch(() => undefined);
  }, [contributionScopeId, enabled, estimateId, tabId]);

  return { broadcastContributionChange };
}
