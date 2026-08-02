import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  createEstimateContributionRealtimeEvent,
  decideEstimateContributionRealtimeEvent,
  ESTIMATE_CONTRIBUTION_BROADCAST_EVENT,
  ESTIMATE_CONTRIBUTION_REALTIME_CONTRACT_VERSION,
  matchesCommittedEstimateContributionReceipt,
  type EstimateContributionBroadcastReceipt,
  type EstimateContributionRealtimeEvent,
  type EstimateContributionRealtimeScope,
} from "@/lib/collaboration/estimate-tree-realtime-contract";
import {
  type ContributionClientFactory,
  useEstimateContributionBroadcast,
} from "@/hooks/use-estimate-contribution-broadcast";

type FakeChannel = {
  on: (
    type: "broadcast",
    filter: { event: string },
    callback: (message: { payload: unknown }) => void,
  ) => FakeChannel;
  subscribe: (callback?: (status: string) => void) => FakeChannel;
  send: (message: {
    type: "broadcast";
    event: string;
    payload: EstimateContributionRealtimeEvent;
  }) => "ok";
  sent: Array<{
    type: "broadcast";
    event: string;
    payload: EstimateContributionRealtimeEvent;
  }>;
  emitStatus(status: string): void;
  emitPayload(payload: unknown): void;
};

function createFakeRealtime() {
  let statusCallback: ((status: string) => void) | undefined;
  let payloadCallback: ((message: { payload: unknown }) => void) | undefined;
  const sent: FakeChannel["sent"] = [];
  const channel: FakeChannel = {
    on(_type, filter, callback) {
      expect(filter.event).toBe(ESTIMATE_CONTRIBUTION_BROADCAST_EVENT);
      payloadCallback = callback;
      return channel;
    },
    subscribe(callback) {
      statusCallback = callback;
      return channel;
    },
    send(message) {
      sent.push(message);
      return "ok";
    },
    sent,
    emitStatus(status) {
      statusCallback?.(status);
    },
    emitPayload(payload) {
      payloadCallback?.({ payload });
    },
  };
  const clientFactory: ContributionClientFactory = () => ({
    openRoom(name) {
      expect(name).toBe("estimate:estimate-1");
      return channel;
    },
    closeRoom: vi.fn(),
  });
  return { channel, clientFactory };
}

const scope: EstimateContributionRealtimeScope = {
  estimateId: "estimate-1",
  tabId: "tab-1",
  contributionScopeId: "scope-1",
};

function event(scopeRevision: number, mutationId: string, overrides: Partial<EstimateContributionRealtimeEvent> = {}) {
  return {
    schemaVersion: ESTIMATE_CONTRIBUTION_REALTIME_CONTRACT_VERSION,
    type: "estimate_contribution.changed",
    scope,
    scopeRevision,
    changed: { rowIds: ["row-1"], groupIds: [], edgeIds: [] },
    mutationId,
    sentAt: "2026-07-30T00:00:00.000Z",
    ...overrides,
  } satisfies EstimateContributionRealtimeEvent;
}

function renderContributionHook(onRealtimeDecision = vi.fn()) {
  const realtime = createFakeRealtime();
  const hook = renderHook(() => useEstimateContributionBroadcast({
    ...scope,
    scopeRevision: 4,
    onRealtimeDecision,
    clientFactory: realtime.clientFactory,
  }));
  act(() => realtime.channel.emitStatus("SUBSCRIBED"));
  return { ...realtime, ...hook, onRealtimeDecision };
}

describe("useEstimateContributionBroadcast", () => {
  it("applies only the exact next revision and ignores duplicate mutation delivery", () => {
    const test = renderContributionHook();
    const nextEvent = event(5, "mutation-1");

    act(() => {
      test.channel.emitPayload(nextEvent);
      test.channel.emitPayload(nextEvent);
    });

    expect(test.onRealtimeDecision).toHaveBeenCalledTimes(1);
    expect(test.onRealtimeDecision).toHaveBeenCalledWith({ action: "apply", event: nextEvent });
  });

  it("requests authoritative refetch for revision gaps and schema mismatches", () => {
    const test = renderContributionHook();
    const futureEvent = event(7, "mutation-gap");

    act(() => {
      test.channel.emitPayload(futureEvent);
      test.channel.emitPayload({ ...event(5, "mutation-schema"), schemaVersion: 99 });
    });

    expect(test.onRealtimeDecision).toHaveBeenNthCalledWith(1, {
      action: "refetch",
      reason: "revision_gap",
      event: futureEvent,
    });
    expect(test.onRealtimeDecision).toHaveBeenNthCalledWith(2, {
      action: "refetch",
      reason: "schema_mismatch",
    });
  });

  it("ignores events from another estimate, tab, or contribution scope", () => {
    const test = renderContributionHook();

    act(() => {
      test.channel.emitPayload(event(5, "other-estimate", { scope: { ...scope, estimateId: "estimate-2" } }));
      test.channel.emitPayload(event(5, "other-tab", { scope: { ...scope, tabId: "tab-2" } }));
      test.channel.emitPayload(event(5, "other-scope", { scope: { ...scope, contributionScopeId: "scope-2" } }));
    });

    expect(test.onRealtimeDecision).not.toHaveBeenCalled();
  });

  it("emits only successful changed mutation or outbox receipts with identifier-only payloads", () => {
    const test = renderContributionHook();
    const unchanged: EstimateContributionBroadcastReceipt = {
      delivery: "server_mutation",
      changed: false,
      scopeRevision: 5,
      mutationId: "mutation-unchanged",
      changedRowIds: ["row-1"],
    };

    act(() => {
      test.result.current.broadcastContributionChange(unchanged);
      test.result.current.broadcastContributionChange({
        delivery: "outbox_delivery",
        changed: true,
        scopeRevision: 5,
        mutationId: "mutation-sent",
        changedRowIds: ["row-1"],
        changedGroupIds: ["group-1"],
        changedEdgeIds: ["edge-1"],
      });
    });

    expect(test.channel.sent).toHaveLength(1);
    const sentEvent = test.channel.sent[0]?.payload as EstimateContributionRealtimeEvent;
    expect(Object.keys(sentEvent).sort()).toEqual([
      "changed",
      "mutationId",
      "schemaVersion",
      "scope",
      "scopeRevision",
      "sentAt",
      "type",
    ]);
    expect(sentEvent.changed).toEqual({ rowIds: ["row-1"], groupIds: ["group-1"], edgeIds: ["edge-1"] });
  });
});

describe("estimate contribution realtime contract", () => {
  it("ignores unrelated payloads before validating contribution scope", () => {
    expect(decideEstimateContributionRealtimeEvent({
      payload: null,
      expectedScope: scope,
      currentRevision: 4,
    })).toEqual({ action: "ignore", reason: "unrelated" });
    expect(decideEstimateContributionRealtimeEvent({
      payload: { type: "another.event" },
      expectedScope: scope,
      currentRevision: 4,
    })).toEqual({ action: "ignore", reason: "unrelated" });
  });

  it.each(["accessory_edge_created", "accessory_edge_updated"])(
    "matches committed row and edge identifiers for %s receipts",
    (kind) => {
      const committedEvent = event(5, `mutation-${kind}`, {
        changed: { rowIds: ["row-parent", "row-child"], groupIds: [], edgeIds: ["edge-1"] },
      });

      expect(matchesCommittedEstimateContributionReceipt(committedEvent, {
        changed: true,
        contributionScopeId: scope.contributionScopeId,
        contributionRevision: 5,
        kind,
        parentRowItemId: "row-parent",
        childRowItemId: "row-child",
        edgeId: "edge-1",
      }, 5)).toBe(true);
    },
  );

  it("rejects duplicate identifiers, empty changes, and extra value-bearing fields", () => {
    const receipt: EstimateContributionBroadcastReceipt = {
      delivery: "server_mutation",
      changed: true,
      scopeRevision: 5,
      mutationId: "mutation-1",
      changedRowIds: ["row-1", "row-1"],
    };
    expect(createEstimateContributionRealtimeEvent(scope, receipt)).toBeNull();
    expect(createEstimateContributionRealtimeEvent(scope, { ...receipt, changedRowIds: [] })).toBeNull();
    expect(createEstimateContributionRealtimeEvent(scope, {
      ...receipt,
      changedRowIds: ["row-1"],
    })).not.toHaveProperty("quantity");
  });
});
