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

function createRoom(
  sockets: FakeSocket[],
  env: Record<string, unknown> = {},
  storageValues = new Map<string, unknown>(),
) {
  const ctx = {
    acceptWebSocket: vi.fn(),
    getWebSockets: vi.fn(() => sockets),
    storage: {
      async get<T>(key: string) {
        return storageValues.get(key) as T | undefined;
      },
      async put(key: string, value: unknown) {
        storageValues.set(key, value);
      },
      setAlarm: vi.fn().mockResolvedValue(undefined),
    },
  };
  return { room: new CollaborationRoom(ctx, env), ctx, storageValues };
}

describe("CollaborationRoom authorization", () => {
  const roomName = "project:33333333-3333-4333-8333-333333333333";
  const secret = "room-secret";

  it("rejects malformed JSON without throwing", async () => {
    const socket = createSocket();
    const { room } = createRoom([socket]);

    await room.webSocketMessage(socket, "{");

    expect(socket.__sent).toContainEqual({ type: "error", code: "invalid_json" });
  });

  it("rejects broadcast messages before the socket is authorized", async () => {
    const sender = createSocket();
    const peer = createSocket();
    const { room } = createRoom([sender, peer]);

    await room.webSocketMessage(
      sender,
      JSON.stringify({
        type: "broadcast",
        event: "cursor",
        payload: {
          userId: "user-a",
          x: 1,
          y: 2,
          envelope: { sub: "user-a", topic: roomName, sig: "signature" },
        },
      }),
    );

    expect(sender.__sent).toContainEqual({
      type: "error",
      code: "auth_required",
    });
    expect(peer.__sent).toEqual([]);
  });

  it("rejects presence updates before the socket is authorized", async () => {
    const sender = createSocket();
    const peer = createSocket();
    const { room } = createRoom([sender, peer]);

    await room.webSocketMessage(
      sender,
      JSON.stringify({
        type: "presence-track",
        payload: { userId: "attacker" },
      }),
    );

    expect(sender.__sent).toContainEqual({
      type: "error",
      code: "auth_required",
    });
    expect(peer.__sent).toEqual([]);
    expect(sender.__attachment).not.toMatchObject({
      presence: expect.anything(),
    });
  });

  it("authorizes a socket with a valid room token before broadcasting", async () => {
    const sender = createSocket();
    const peer = createSocket();
    sender.__attachment = { roomName };
    peer.__attachment = {
      roomName,
      authorized: {
        v: 2,
        sub: "peer",
        topic: roomName,
        capabilities: ["presence:read"],
        iat: 1,
        exp: 9999999999,
      },
    };
    const { room } = createRoom([sender, peer], {
      REALTIME_ROOM_TOKEN_SECRET: secret,
    });
    const token = await issueRealtimeRoomToken({
      secret,
      sub: "user-a",
      topic: roomName,
      capabilities: ["broadcast:cursor", "presence:read", "presence:write"],
    });

    await room.webSocketMessage(
      sender,
      JSON.stringify({ type: "authorize", token }),
    );
    await room.webSocketMessage(
      sender,
      JSON.stringify({
        type: "broadcast",
        event: "cursor",
        payload: {
          userId: "user-a",
          x: 1,
          y: 2,
          envelope: { sub: "user-a", topic: roomName, sig: "signature" },
        },
      }),
    );

    expect(sender.__sent).toContainEqual(
      expect.objectContaining({ type: "authorized", sub: "user-a" }),
    );
    expect(peer.__sent).toContainEqual(
      expect.objectContaining({
        type: "broadcast",
        event: "cursor",
        payload: expect.objectContaining({ userId: "user-a", x: 1, y: 2 }),
      }),
    );
  });

  it("rejects a room token bound to a different topic", async () => {
    const sender = createSocket();
    const peer = createSocket();
    sender.__attachment = { roomName };
    const { room } = createRoom([sender, peer], {
      REALTIME_ROOM_TOKEN_SECRET: secret,
    });
    const token = await issueRealtimeRoomToken({
      secret,
      sub: "user-a",
      topic: "project:55555555-5555-4555-8555-555555555555",
    });

    await room.webSocketMessage(
      sender,
      JSON.stringify({ type: "authorize", token }),
    );
    await room.webSocketMessage(
      sender,
      JSON.stringify({
        type: "broadcast",
        event: "cursor",
        payload: { x: 1 },
      }),
    );

    expect(sender.__sent).toContainEqual({
      type: "error",
      code: "auth_failed",
    });
    expect(sender.__sent).toContainEqual({
      type: "error",
      code: "auth_required",
    });
    expect(peer.__sent).toEqual([]);
  });

  it("rejects a legacy v1 room token even when its topic is valid", async () => {
    const sender = createSocket();
    sender.__attachment = { roomName };
    const { room } = createRoom([sender], {
      REALTIME_ROOM_TOKEN_SECRET: secret,
    });
    const token = await issueRealtimeRoomToken({
      secret,
      sub: "legacy-user",
      topic: roomName,
    });

    await room.webSocketMessage(
      sender,
      JSON.stringify({ type: "authorize", token }),
    );

    expect(sender.__sent).toContainEqual({
      type: "error",
      code: "unsupported_token_version",
    });
  });

  it("does not send presence snapshots to unauthorized connected sockets", async () => {
    const sender = createSocket();
    const unauthorizedPeer = createSocket();
    sender.__attachment = {
      roomName,
      authorized: {
        v: 2,
        sub: "user-a",
        topic: roomName,
        capabilities: ["presence:read", "presence:write"],
        iat: 1,
        exp: 9999999999,
      },
    };
    unauthorizedPeer.__attachment = { roomName };
    const { room } = createRoom([sender, unauthorizedPeer], {
      REALTIME_ROOM_TOKEN_SECRET: secret,
    });

    await room.webSocketMessage(
      sender,
      JSON.stringify({
        type: "presence-track",
        payload: { userId: "user-a" },
      }),
    );

    expect(sender.__sent).toContainEqual({
      type: "presence-state",
      state: {
        "connection:0": [{ userId: "user-a" }],
      },
    });
    expect(unauthorizedPeer.__sent).toEqual([]);
  });

  it("denies a viewer cursor broadcast even with a valid scoped token", async () => {
    const sender = createSocket();
    const peer = createSocket();
    sender.__attachment = { roomName };
    const { room } = createRoom([sender, peer], {
      REALTIME_ROOM_TOKEN_SECRET: secret,
    });
    const token = await issueRealtimeRoomToken({
      secret,
      sub: "viewer",
      topic: roomName,
      capabilities: ["presence:read", "presence:write"],
    });

    await room.webSocketMessage(
      sender,
      JSON.stringify({ type: "authorize", token }),
    );
    await room.webSocketMessage(
      sender,
      JSON.stringify({
        type: "broadcast",
        event: "cursor",
        payload: {
          userId: "viewer",
          x: 1,
          y: 2,
          envelope: { sub: "viewer", topic: roomName, sig: "signature" },
        },
      }),
    );

    expect(sender.__sent).toContainEqual({
      type: "error",
      code: "capability_denied",
    });
    expect(peer.__sent).toEqual([]);
  });

  it("rejects cursor coordinates and anchor fractions outside the bounded wire contract", async () => {
    const sender = createSocket();
    const peer = createSocket();
    sender.__attachment = { roomName };
    peer.__attachment = {
      roomName,
      authorized: {
        v: 2,
        sub: "peer",
        topic: roomName,
        capabilities: ["presence:read"],
        iat: 1,
        exp: 9999999999,
      },
    };
    const { room } = createRoom([sender, peer], {
      REALTIME_ROOM_TOKEN_SECRET: secret,
    });
    const token = await issueRealtimeRoomToken({
      secret,
      sub: "editor",
      topic: roomName,
      capabilities: ["broadcast:cursor"],
    });

    await room.webSocketMessage(
      sender,
      JSON.stringify({ type: "authorize", token }),
    );
    await room.webSocketMessage(
      sender,
      JSON.stringify({
        type: "broadcast",
        event: "cursor",
        payload: {
          x: 1_000_001,
          y: 2,
          envelope: { sub: "editor", topic: roomName, sig: "signature" },
        },
      }),
    );
    await room.webSocketMessage(
      sender,
      JSON.stringify({
        type: "broadcast",
        event: "cursor",
        payload: {
          x: 1,
          y: 2,
          fracX: -0.1,
          envelope: { sub: "editor", topic: roomName, sig: "signature" },
        },
      }),
    );

    expect(sender.__sent).toContainEqual({
      type: "error",
      code: "invalid_event_payload",
    });
    expect(peer.__sent).toEqual([]);
  });

  it("rejects unregistered broadcast events after authorization", async () => {
    const sender = createSocket();
    sender.__attachment = { roomName };
    const { room } = createRoom([sender], {
      REALTIME_ROOM_TOKEN_SECRET: secret,
    });
    const token = await issueRealtimeRoomToken({
      secret,
      sub: "editor",
      topic: roomName,
      capabilities: ["broadcast:cursor"],
    });

    await room.webSocketMessage(
      sender,
      JSON.stringify({ type: "authorize", token }),
    );
    await room.webSocketMessage(
      sender,
      JSON.stringify({ type: "broadcast", event: "arbitrary", payload: {} }),
    );

    expect(sender.__sent).toContainEqual({
      type: "error",
      code: "unsupported_event",
    });
  });

  it("closes a socket that misses its authorization deadline", async () => {
    const socket = createSocket();
    socket.__attachment = { roomName, authorizationDeadlineAt: Date.now() - 1 };
    const { room } = createRoom([socket]);

    await room.alarm();

    expect(socket.__sent).toContainEqual({
      type: "error",
      code: "auth_timeout",
    });
    expect(socket.__closed).toContainEqual({
      code: 4401,
      reason: "authorization_timeout",
    });
  });

  it("closes every matching session through the protected revoke-subject control", async () => {
    const matching = createSocket();
    const other = createSocket();
    matching.__attachment = {
      roomName,
      authorized: {
        v: 2,
        sub: "member-1",
        topic: roomName,
        capabilities: ["presence:read"],
        iat: 1,
        exp: 9999999999,
      },
    };
    other.__attachment = {
      roomName,
      authorized: {
        v: 2,
        sub: "member-2",
        topic: roomName,
        capabilities: ["presence:read"],
        iat: 1,
        exp: 9999999999,
      },
    };
    const { room } = createRoom([matching, other], {
      COLLABORATION_ROOM_CONTROL_SECRET: "control-secret",
    });

    const response = await room.fetch(
      new Request(
        `https://example.test/__cloudflare/collaboration-room/${roomName}`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-collaboration-room-control-secret": "control-secret",
          },
          body: JSON.stringify({ type: "revoke-subject", sub: "member-1" }),
        },
      ),
    );

    await expect(response.json()).resolves.toEqual({ ok: true, closed: 1 });
    expect(matching.__sent).toContainEqual({ type: "revoked" });
    expect(matching.__closed).toContainEqual({
      code: 4403,
      reason: "subject_revoked",
    });
    expect(other.__closed).toEqual([]);
  });

  it("persists a subject revocation across restart while admitting a post-watermark token", async () => {
    const now = 1_800_000_000_500;
    const dateNow = vi.spyOn(Date, "now").mockReturnValue(now);
    const subject = "22222222-2222-4222-8222-222222222222";
    const storageValues = new Map<string, unknown>();
    const current = createSocket();
    current.__attachment = { roomName };
    const env = {
      COLLABORATION_ROOM_CONTROL_SECRET: "control-secret",
      REALTIME_ROOM_TOKEN_SECRET: secret,
    };

    try {
      const oldToken = await issueRealtimeRoomToken({
        capabilities: ["presence:read"],
        nowMs: now - 1_000,
        secret,
        sub: subject,
        topic: roomName,
      });
      const activeRoom = createRoom([current], env, storageValues).room;
      await activeRoom.webSocketMessage(current, JSON.stringify({ type: "authorize", token: oldToken }));

      const response = await activeRoom.fetch(new Request(
        `https://example.test/__cloudflare/collaboration-room/${roomName}`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-collaboration-room-control-secret": "control-secret",
          },
          body: JSON.stringify({ type: "revoke-subject", sub: subject }),
        },
      ));
      await expect(response.json()).resolves.toEqual({ ok: true, closed: 1 });
      expect(current.__closed).toContainEqual({ code: 4403, reason: "subject_revoked" });

      const oldReconnect = createSocket();
      const newReconnect = createSocket();
      oldReconnect.__attachment = { roomName };
      newReconnect.__attachment = { roomName };
      const restartedRoom = createRoom([oldReconnect, newReconnect], env, storageValues).room;

      await restartedRoom.webSocketMessage(oldReconnect, JSON.stringify({ type: "authorize", token: oldToken }));
      expect(oldReconnect.__sent).toContainEqual({ type: "revoked", code: "access_revoked" });
      expect(oldReconnect.__closed).toContainEqual({ code: 4403, reason: "subject_revoked" });

      const postWatermarkToken = await issueRealtimeRoomToken({
        capabilities: ["presence:read"],
        nowMs: now + 1_000,
        secret,
        sub: subject,
        topic: roomName,
      });
      await restartedRoom.webSocketMessage(newReconnect, JSON.stringify({ type: "authorize", token: postWatermarkToken }));
      expect(newReconnect.__sent).toContainEqual(expect.objectContaining({ type: "authorized", sub: subject }));
    } finally {
      dateNow.mockRestore();
    }
  });

  it("rejects a room connection when its bounded capacity is full", async () => {
    const sockets = Array.from({ length: 100 }, createSocket);
    const { room } = createRoom(sockets);

    const response = await room.fetch(
      new Request(
        `https://example.test/__cloudflare/collaboration-room/${roomName}`,
        {
          headers: { upgrade: "websocket" },
        },
      ),
    );

    expect(response.status).toBe(429);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: "room_capacity_exceeded",
    });
  });

  it("closes an abusive socket after its per-second frame allowance is exhausted", async () => {
    const sender = createSocket();
    sender.__attachment = {
      roomName,
      authorized: {
        v: 2,
        sub: "user-a",
        topic: roomName,
        capabilities: ["presence:read", "presence:write"],
        iat: 1,
        exp: 9999999999,
      },
    };
    const { room } = createRoom([sender]);

    for (let index = 0; index <= 30; index += 1) {
      await room.webSocketMessage(
        sender,
        JSON.stringify({ type: "presence-track", payload: { index } }),
      );
    }

    expect(sender.__sent).toContainEqual({
      type: "error",
      code: "rate_limited",
    });
    expect(sender.__closed).toContainEqual({
      code: 4408,
      reason: "rate_limited",
    });
  });
});
