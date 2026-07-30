import { describe, expect, it, vi } from "vitest";

import {
  createEstimateContributionRealtimeEvent,
  ESTIMATE_CONTRIBUTION_BROADCAST_EVENT,
} from "@/lib/collaboration/estimate-tree-realtime-contract";
import { issueRealtimeRoomToken } from "@/lib/collaboration/realtime-room-token";
import { CollaborationRoom } from "@/lib/cloudflare/collaboration-room";

type FakeSocket = WebSocket & {
  sent: Array<Record<string, unknown>>;
  attachment?: unknown;
  serializeAttachment(value: unknown): void;
  deserializeAttachment<T>(): T | undefined;
};

function socket(attachment?: unknown): FakeSocket {
  const sent: Array<Record<string, unknown>> = [];
  let currentAttachment = attachment;
  return {
    sent,
    send(value: string) {
      sent.push(JSON.parse(value) as Record<string, unknown>);
    },
    close: vi.fn(),
    serializeAttachment(value: unknown) {
      currentAttachment = value;
    },
    deserializeAttachment<T>() {
      return currentAttachment as T | undefined;
    },
  } as unknown as FakeSocket;
}

type ReceiptRow = {
  result_json: string;
  current_revision: number;
};

function room(sockets: FakeSocket[], secret: string, receiptRows: ReceiptRow[] = []) {
  const bind = vi.fn((...values: unknown[]) => ({
    all: vi.fn().mockResolvedValue({
      success: true,
      results: values[0] === "mutation-1"
        && values[1] === "sender"
        && values[2] === "scope-1"
        && values[3] === "estimate-1"
        && values[4] === "tab-1"
        && values[5] === 5
        && values[6] === 5
        ? receiptRows
        : [],
    }),
  }));
  return new CollaborationRoom({
    acceptWebSocket: vi.fn(),
    getWebSockets: vi.fn(() => sockets),
    storage: { setAlarm: vi.fn().mockResolvedValue(undefined) },
  }, {
    REALTIME_ROOM_TOKEN_SECRET: secret,
    ARCH_DB: { prepare: vi.fn(() => ({ bind })) },
  });
}

const roomName = "estimate:estimate-1";
const secret = "room-secret";
const validEvent = createEstimateContributionRealtimeEvent({
  estimateId: "estimate-1",
  tabId: "tab-1",
  contributionScopeId: "scope-1",
}, {
  delivery: "server_mutation",
  changed: true,
  scopeRevision: 5,
  mutationId: "mutation-1",
  changedRowIds: ["row-1"],
});

const committedReceiptRows: ReceiptRow[] = [{
  current_revision: 5,
  result_json: JSON.stringify({
    kind: "contribution_configuration_bulk_applied",
    contributionScopeId: "scope-1",
    contributionRevision: 5,
    changed: true,
    changedRowItemIds: ["row-1"],
    changedGroupIds: [],
  }),
}];

async function authorizeAndBroadcast(
  capabilities: Array<"broadcast:row-update">,
  payload: unknown,
  receiptRows: ReceiptRow[] = committedReceiptRows,
) {
  const sender = socket({ roomName });
  const peer = socket({
    roomName,
    authorized: { v: 2, sub: "peer", topic: roomName, capabilities: ["presence:read"], iat: 1, exp: 9999999999 },
  });
  const collaborationRoom = room([sender, peer], secret, receiptRows);
  const token = await issueRealtimeRoomToken({ secret, sub: "sender", topic: roomName, capabilities });
  await collaborationRoom.webSocketMessage(sender, JSON.stringify({ type: "authorize", token }));
  await collaborationRoom.webSocketMessage(sender, JSON.stringify({
    type: "broadcast",
    event: ESTIMATE_CONTRIBUTION_BROADCAST_EVENT,
    payload,
  }));
  return { sender, peer };
}

describe("CollaborationRoom contribution broadcast authorization", () => {
  it("denies viewers without the estimate mutation broadcast capability", async () => {
    const { sender, peer } = await authorizeAndBroadcast([], validEvent);
    expect(sender.sent).toContainEqual({ type: "error", code: "capability_denied" });
    expect(peer.sent).toEqual([]);
  });

  it("relays a bounded identifier-only contribution event to authorized peers", async () => {
    const { peer } = await authorizeAndBroadcast(["broadcast:row-update"], validEvent);
    expect(peer.sent).toContainEqual({
      type: "broadcast",
      event: ESTIMATE_CONTRIBUTION_BROADCAST_EVENT,
      payload: validEvent,
    });
  });

  it("denies syntactically valid events without an exact committed D1 receipt", async () => {
    const missingReceipt = await authorizeAndBroadcast(["broadcast:row-update"], validEvent, []);
    const forgedRevision = await authorizeAndBroadcast(
      ["broadcast:row-update"],
      { ...validEvent, scopeRevision: 6 },
    );
    const forgedMutation = await authorizeAndBroadcast(
      ["broadcast:row-update"],
      { ...validEvent, mutationId: "mutation-forged" },
    );
    const forgedTab = await authorizeAndBroadcast(
      ["broadcast:row-update"],
      { ...validEvent, scope: { ...validEvent?.scope, tabId: "tab-forged" } },
    );
    const forgedScope = await authorizeAndBroadcast(
      ["broadcast:row-update"],
      { ...validEvent, scope: { ...validEvent?.scope, contributionScopeId: "scope-forged" } },
    );
    const forgedChangedIds = await authorizeAndBroadcast(
      ["broadcast:row-update"],
      { ...validEvent, changed: { rowIds: ["row-forged"], groupIds: [], edgeIds: [] } },
    );

    for (const result of [
      missingReceipt,
      forgedRevision,
      forgedMutation,
      forgedTab,
      forgedScope,
      forgedChangedIds,
    ]) {
      expect(result.sender.sent).toContainEqual({ type: "error", code: "uncommitted_event" });
      expect(result.peer.sent).toEqual([]);
    }
  });

  it("rejects cross-estimate and value-bearing payload injection", async () => {
    const crossEstimate = { ...validEvent, scope: { ...validEvent?.scope, estimateId: "estimate-2" } };
    const valueBearing = { ...validEvent, quantity: 99 };
    const crossResult = await authorizeAndBroadcast(["broadcast:row-update"], crossEstimate);
    const valueResult = await authorizeAndBroadcast(["broadcast:row-update"], valueBearing);

    expect(crossResult.sender.sent).toContainEqual({ type: "error", code: "invalid_event_payload" });
    expect(valueResult.sender.sent).toContainEqual({ type: "error", code: "invalid_event_payload" });
    expect(crossResult.peer.sent).toEqual([]);
    expect(valueResult.peer.sent).toEqual([]);
  });
});
