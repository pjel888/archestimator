import { describe, expect, it, vi } from "vitest";

import { issueRealtimeRoomToken } from "@/lib/collaboration/realtime-room-token";
import { CollaborationRoom } from "@/lib/cloudflare/collaboration-room";

type FakeSocket = WebSocket & {
  __sent: Array<Record<string, unknown>>;
  __closed: Array<{ code?: number; reason?: string }>;
  __attachment?: unknown;
  serializeAttachment(value: unknown): void;
  deserializeAttachment<T>(): T | undefined;
};

function createSocket(): FakeSocket {
  return {
    __sent: [],
    __closed: [],
    send(value: string) {
      this.__sent.push(JSON.parse(value) as Record<string, unknown>);
    },
    close(code?: number, reason?: string) {
      this.__closed.push({ code, reason });
    },
    serializeAttachment(value: unknown) {
      this.__attachment = value;
    },
    deserializeAttachment<T>() {
      return this.__attachment as T | undefined;
    },
  } as FakeSocket;
}

function createRoom(sockets: FakeSocket[], env: Record<string, unknown> = {}) {
  const ctx = {
    acceptWebSocket: vi.fn(),
    getWebSockets: vi.fn(() => sockets),
  };
  return { room: new CollaborationRoom(ctx, env), ctx };
}

describe("CollaborationRoom authorization", () => {
  const roomName = "project:33333333-3333-4333-8333-333333333333";
  const secret = "room-secret";

  it("rejects broadcast messages before the socket is authorized", async () => {
    const sender = createSocket();
    const peer = createSocket();
    const { room } = createRoom([sender, peer]);

    await room.webSocketMessage(sender, JSON.stringify({
      type: "broadcast",
      event: "cursor",
      payload: { x: 1 },
    }));

    expect(sender.__sent).toContainEqual({ type: "error", code: "auth_required" });
    expect(peer.__sent).toEqual([]);
  });

  it("rejects presence updates before the socket is authorized", async () => {
    const sender = createSocket();
    const peer = createSocket();
    const { room } = createRoom([sender, peer]);

    await room.webSocketMessage(sender, JSON.stringify({
      type: "presence-track",
      payload: { userId: "attacker" },
    }));

    expect(sender.__sent).toContainEqual({ type: "error", code: "auth_required" });
    expect(peer.__sent).toEqual([]);
    expect(sender.__attachment).toBeUndefined();
  });

  it("authorizes a socket with a valid room token before broadcasting", async () => {
    const sender = createSocket();
    const peer = createSocket();
    sender.__attachment = { roomName };
    peer.__attachment = { roomName, authorized: { v: 1, sub: "peer", topic: roomName, iat: 1, exp: 9999999999 } };
    const { room } = createRoom([sender, peer], { REALTIME_ROOM_TOKEN_SECRET: secret });
    const token = await issueRealtimeRoomToken({
      secret,
      sub: "user-a",
      topic: roomName,
    });

    await room.webSocketMessage(sender, JSON.stringify({ type: "authorize", token }));
    await room.webSocketMessage(sender, JSON.stringify({
      type: "broadcast",
      event: "cursor",
      payload: { x: 1 },
    }));

    expect(sender.__sent).toContainEqual({ type: "authorized" });
    expect(peer.__sent).toContainEqual({
      type: "broadcast",
      event: "cursor",
      payload: { x: 1 },
    });
  });

  it("rejects a room token bound to a different topic", async () => {
    const sender = createSocket();
    const peer = createSocket();
    sender.__attachment = { roomName };
    const { room } = createRoom([sender, peer], { REALTIME_ROOM_TOKEN_SECRET: secret });
    const token = await issueRealtimeRoomToken({
      secret,
      sub: "user-a",
      topic: "project:55555555-5555-4555-8555-555555555555",
    });

    await room.webSocketMessage(sender, JSON.stringify({ type: "authorize", token }));
    await room.webSocketMessage(sender, JSON.stringify({
      type: "broadcast",
      event: "cursor",
      payload: { x: 1 },
    }));

    expect(sender.__sent).toContainEqual({ type: "error", code: "auth_failed" });
    expect(sender.__sent).toContainEqual({ type: "error", code: "auth_required" });
    expect(peer.__sent).toEqual([]);
  });

  it("does not send presence snapshots to unauthorized connected sockets", async () => {
    const sender = createSocket();
    const unauthorizedPeer = createSocket();
    sender.__attachment = {
      roomName,
      authorized: { v: 1, sub: "user-a", topic: roomName, iat: 1, exp: 9999999999 },
    };
    unauthorizedPeer.__attachment = { roomName };
    const { room } = createRoom([sender, unauthorizedPeer], { REALTIME_ROOM_TOKEN_SECRET: secret });

    await room.webSocketMessage(sender, JSON.stringify({
      type: "presence-track",
      payload: { userId: "user-a" },
    }));

    expect(sender.__sent).toContainEqual({
      type: "presence-state",
      state: {
        "connection:0": [{ userId: "user-a" }],
      },
    });
    expect(unauthorizedPeer.__sent).toEqual([]);
  });
});
