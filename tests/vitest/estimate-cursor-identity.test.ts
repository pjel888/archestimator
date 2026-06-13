import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  useEstimateCursorCollaboration,
  type CursorChannelLike,
  type EstimateCursorBroadcastPayload,
} from "@/hooks/use-estimate-cursor-broadcast";
import { issueRealtimeIdentityEnvelope } from "@/lib/collaboration/realtime-identity-server";

// T1.2 / T5.1 / G3 / G19: cursor identity must be sender-bound. A cursor from
// member B claiming member A — or any cursor without a valid signed envelope —
// must render nothing. Verified locally with the same signing key the server uses.

type FakeCursorChannel = CursorChannelLike & {
  __emitStatus: (status: string) => void;
  __emitBroadcast: (payload: unknown) => void;
};

function createFakeCursorClient() {
  let broadcastHandler: ((message: { payload: unknown }) => void) | null = null;
  let subscribeCallback: ((status: string) => void) | null = null;
  const channel: FakeCursorChannel = {
    on(_type, _filter, callback) {
      broadcastHandler = callback;
      return channel;
    },
    subscribe(callback) {
      subscribeCallback = callback ?? null;
      return channel;
    },
    send() {
      return Promise.resolve("ok");
    },
    __emitStatus(status) {
      subscribeCallback?.(status);
    },
    __emitBroadcast(payload) {
      broadcastHandler?.({ payload });
    },
  };
  return { client: { channel: () => channel, removeChannel: () => undefined }, channel };
}

const ESTIMATE_ID = "11111111-1111-1111-1111-111111111111";
const TOPIC = `estimate:${ESTIMATE_ID}`;

function basePayload(overrides: Partial<EstimateCursorBroadcastPayload>): EstimateCursorBroadcastPayload {
  return {
    userId: "other",
    displayName: "Other",
    tabId: null,
    x: 10,
    y: 20,
    rowId: null,
    columnId: null,
    sentAt: new Date().toISOString(),
    envelope: null,
    ...overrides,
  };
}

describe("estimate cursor identity gate", () => {
  it("renders a cursor with a valid signed envelope, drops spoofed/unsigned ones", async () => {
    const receiver = await issueRealtimeIdentityEnvelope({ sub: "me", topic: TOPIC, role: "member" });
    const otherEnvelope = (await issueRealtimeIdentityEnvelope({ sub: "other", topic: TOPIC, role: "member" })).envelope;

    const { client, channel } = createFakeCursorClient();
    const { result } = renderHook(() =>
      useEstimateCursorCollaboration({
        estimateId: ESTIMATE_ID,
        userId: "me",
        enabled: true,
        clientFactory: () => client,
        identityIssuer: async () => ({ envelope: receiver.envelope, publicKey: receiver.publicKey }),
      }),
    );

    // Subscribe → provision verify key (async).
    act(() => channel.__emitStatus("SUBSCRIBED"));

    // 1) Unsigned cursor → dropped.
    act(() => channel.__emitBroadcast(basePayload({ userId: "other", envelope: null })));
    // 2) Spoofed: payload.userId = A but envelope.sub = other (mismatch) → dropped.
    act(() => channel.__emitBroadcast(basePayload({ userId: "victim-A", envelope: otherEnvelope })));

    // Give async verification a tick; neither bad cursor should appear.
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(result.current.remoteCursors).toHaveLength(0);

    // 3) Valid: payload.userId = other, envelope.sub = other → rendered.
    act(() => channel.__emitBroadcast(basePayload({ userId: "other", envelope: otherEnvelope })));
    await waitFor(() => expect(result.current.remoteCursors).toHaveLength(1));
    expect(result.current.remoteCursors[0]?.userId).toBe("other");
  });
});
