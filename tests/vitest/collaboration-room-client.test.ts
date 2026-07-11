import { afterEach, describe, expect, it, vi } from "vitest";

import { createCloudflareCollaborationRoomClient } from "@/lib/cloudflare/collaboration-room-client";

class FakeWebSocket extends EventTarget {
  static OPEN = 1;
  static instances: FakeWebSocket[] = [];

  readyState = 0;
  readonly sent: string[] = [];

  constructor(_url: string) {
    super();
    FakeWebSocket.instances.push(this);
  }

  send(value: string) {
    this.sent.push(value);
  }

  close() {
    this.readyState = 3;
    this.dispatchEvent(new Event("close"));
  }

  open() {
    this.readyState = FakeWebSocket.OPEN;
    this.dispatchEvent(new Event("open"));
  }

  receive(value: Record<string, unknown>) {
    this.dispatchEvent(
      new MessageEvent("message", { data: JSON.stringify(value) }),
    );
  }
}

afterEach(() => {
  FakeWebSocket.instances = [];
  vi.unstubAllGlobals();
});

describe("CollaborationRoomBrowserSocket authorization handshake", () => {
  it("does not report subscribed until the Durable Object acknowledges authorization", async () => {
    vi.stubGlobal("WebSocket", FakeWebSocket);
    const room =
      createCloudflareCollaborationRoomClient().openRoom("project:project-1");
    const statuses: string[] = [];

    room.subscribe((status) => statuses.push(status));
    const socket = FakeWebSocket.instances[0];
    expect(socket).toBeDefined();
    socket?.open();

    expect(statuses).toEqual(["CONNECTED"]);
    const authorization = room.authorize("room-token");
    expect(socket?.sent).toEqual([
      JSON.stringify({ type: "authorize", token: "room-token" }),
    ]);
    expect(statuses).toEqual(["CONNECTED"]);
    expect(room.send({ type: "broadcast", event: "cursor", payload: {} })).toBe(
      "timed out",
    );

    socket?.receive({
      type: "authorized",
      sub: "user-1",
      capabilities: ["presence:read"],
    });

    await expect(authorization).resolves.toBe("ok");
    expect(statuses).toEqual(["CONNECTED", "SUBSCRIBED"]);
    expect(room.send({ type: "broadcast", event: "cursor", payload: {} })).toBe(
      "ok",
    );
  });

  it("immediately closes the client on a typed revocation without duplicate status events", async () => {
    vi.stubGlobal("WebSocket", FakeWebSocket);
    const room =
      createCloudflareCollaborationRoomClient().openRoom("project:project-1");
    const statuses: string[] = [];

    room.subscribe((status) => statuses.push(status));
    const socket = FakeWebSocket.instances[0];
    socket?.open();

    const authorization = room.authorize("room-token");
    socket?.receive({
      type: "authorized",
      sub: "user-1",
      capabilities: ["presence:read"],
    });
    await expect(authorization).resolves.toBe("ok");

    socket?.receive({ type: "revoked", code: "access_revoked" });

    expect(socket?.readyState).toBe(3);
    expect(statuses).toEqual(["CONNECTED", "SUBSCRIBED", "CLOSED"]);
    expect(room.send({ type: "broadcast", event: "cursor", payload: {} })).toBe(
      "timed out",
    );
  });
});
