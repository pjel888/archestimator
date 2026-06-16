import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

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
  const sentPayloads: EstimateCursorBroadcastPayload[] = [];
  const channel: FakeCursorChannel = {
    on(_type, _filter, callback) {
      broadcastHandler = callback;
      return channel;
    },
    subscribe(callback) {
      subscribeCallback = callback ?? null;
      return channel;
    },
    send(message) {
      sentPayloads.push(message.payload);
      return Promise.resolve("ok");
    },
    __emitStatus(status) {
      subscribeCallback?.(status);
    },
    __emitBroadcast(payload) {
      broadcastHandler?.({ payload });
    },
  };
  return { client: { channel: () => channel, removeChannel: () => undefined }, channel, sentPayloads };
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
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("renders a cursor with a valid signed envelope, drops spoofed/unsigned ones", async () => {
    const receiver = await issueRealtimeIdentityEnvelope({ sub: "me", topic: TOPIC, role: "member" });
    const otherEnvelope = (await issueRealtimeIdentityEnvelope({ sub: "other", topic: TOPIC, role: "member" })).envelope;

    const { client, channel } = createFakeCursorClient();
    const { result, unmount } = renderHook(() =>
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
    unmount();
  });
  it("refreshes instead of broadcasting with an expired sender envelope", async () => {
    const signingKey = await issueRealtimeIdentityEnvelope({ sub: "me", topic: TOPIC, role: "member" });
    let nowMs = new Date("2026-06-14T00:00:00.000Z").getTime();
    const dateNowSpy = vi.spyOn(Date, "now").mockImplementation(() => nowMs);

    const { client, channel, sentPayloads } = createFakeCursorClient();
    let issueCount = 0;

    const { result, unmount } = renderHook(() =>
      useEstimateCursorCollaboration({
        estimateId: ESTIMATE_ID,
        userId: "me",
        enabled: true,
        throttleMs: 1,
        clientFactory: () => client,
        identityIssuer: async ({ topic }) => {
          issueCount += 1;
          const iat = Math.floor(Date.now() / 1000);
          return {
            envelope: {
              sub: "me",
              topic,
              role: "member",
              iat,
              exp: iat + 300,
              kid: signingKey.envelope.kid,
              sig: `test-signature-${issueCount}`,
            },
            publicKey: signingKey.publicKey,
          };
        },
      }),
    );

    act(() => channel.__emitStatus("SUBSCRIBED"));
    await waitFor(() => expect(issueCount).toBe(1));

    act(() =>
      result.current.broadcastCursor({
        tabId: null,
        x: 10,
        y: 10,
        rowId: "row-1",
        columnId: "col-1",
      }),
    );
    await waitFor(() => expect(sentPayloads).toHaveLength(1));
    const firstEnvelope = sentPayloads[0]?.envelope;

    nowMs += 301_000;
    act(() =>
      result.current.broadcastCursor({
        tabId: null,
        x: 30,
        y: 30,
        rowId: "row-1",
        columnId: "col-1",
      }),
    );

    await waitFor(() => expect(issueCount).toBe(2));
    expect(sentPayloads).toHaveLength(1);

    act(() =>
      result.current.broadcastCursor({
        tabId: null,
        x: 50,
        y: 50,
        rowId: "row-1",
        columnId: "col-1",
      }),
    );
    await new Promise((resolve) => setTimeout(resolve, 5));

    expect(sentPayloads).toHaveLength(2);
    expect(sentPayloads[1]?.envelope?.sig).not.toBe(firstEnvelope?.sig);
    expect((sentPayloads[1]?.envelope?.exp ?? 0) * 1000).toBeGreaterThan(Date.now());

    dateNowSpy.mockRestore();
    unmount();
  });

  it("retries identity issuance on later cursor moves after an expired envelope refresh returns null", async () => {
    const signingKey = await issueRealtimeIdentityEnvelope({ sub: "me", topic: TOPIC, role: "member" });
    let nowMs = new Date("2026-06-14T00:00:00.000Z").getTime();
    const dateNowSpy = vi.spyOn(Date, "now").mockImplementation(() => nowMs);

    const { client, channel, sentPayloads } = createFakeCursorClient();
    let issueCount = 0;

    const { result, unmount } = renderHook(() =>
      useEstimateCursorCollaboration({
        estimateId: ESTIMATE_ID,
        userId: "me",
        enabled: true,
        throttleMs: 1,
        clientFactory: () => client,
        identityIssuer: async ({ topic }) => {
          issueCount += 1;
          if (issueCount === 2) return null;
          const iat = Math.floor(Date.now() / 1000);
          return {
            envelope: {
              sub: "me",
              topic,
              role: "member",
              iat,
              exp: iat + 300,
              kid: signingKey.envelope.kid,
              sig: `test-signature-${issueCount}`,
            },
            publicKey: signingKey.publicKey,
          };
        },
      }),
    );

    act(() => channel.__emitStatus("SUBSCRIBED"));
    await waitFor(() => expect(issueCount).toBe(1));

    act(() =>
      result.current.broadcastCursor({
        tabId: null,
        x: 10,
        y: 10,
        rowId: "row-1",
        columnId: "col-1",
      }),
    );
    await waitFor(() => expect(sentPayloads).toHaveLength(1));

    nowMs += 301_000;
    act(() =>
      result.current.broadcastCursor({
        tabId: null,
        x: 30,
        y: 30,
        rowId: "row-1",
        columnId: "col-1",
      }),
    );
    await waitFor(() => expect(issueCount).toBe(2));
    expect(sentPayloads).toHaveLength(1);

    act(() =>
      result.current.broadcastCursor({
        tabId: null,
        x: 50,
        y: 50,
        rowId: "row-1",
        columnId: "col-1",
      }),
    );
    await waitFor(() => expect(issueCount).toBe(3));
    expect(sentPayloads).toHaveLength(1);

    act(() =>
      result.current.broadcastCursor({
        tabId: null,
        x: 70,
        y: 70,
        rowId: "row-1",
        columnId: "col-1",
      }),
    );

    await waitFor(() => expect(sentPayloads).toHaveLength(2));
    expect(sentPayloads[1]?.envelope?.sig).toBe("test-signature-3");

    dateNowSpy.mockRestore();
    unmount();
  });

});
