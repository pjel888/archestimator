import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  parseSupportInboxConversationId,
  routeSupportInboxRequest,
} from "@/lib/cloudflare/support-inbox-router";
import { SupportInbox } from "@/lib/cloudflare/support-inbox";

type WranglerConfig = {
  durable_objects?: {
    bindings?: Array<{
      name?: string;
      class_name?: string;
    }>;
  };
  migrations?: Array<{
    tag?: string;
    new_sqlite_classes?: string[];
  }>;
};

function readWranglerConfig() {
  return JSON.parse(readFileSync("wrangler.jsonc", "utf8")) as WranglerConfig;
}

function createDurableObjectState() {
  const acceptedSockets: WebSocket[] = [];
  return {
    acceptedSockets,
    ctx: {
      acceptWebSocket(ws: WebSocket) {
        acceptedSockets.push(ws);
      },
      getWebSockets() {
        return acceptedSockets;
      },
    },
  };
}

describe("Cloudflare support inbox Durable Object router", () => {
  it("declares the SupportInbox binding, migration, and generated env type", () => {
    const config = readWranglerConfig();
    const generatedTypes = readFileSync("cloudflare-env.d.ts", "utf8");

    expect(config.durable_objects?.bindings).toContainEqual({
      name: "SUPPORT_INBOX",
      class_name: "SupportInbox",
    });
    expect(config.migrations).toContainEqual({
      tag: "v2-admin-dashboard",
      new_sqlite_classes: ["GlobalPresence", "SupportInbox"],
    });
    expect(generatedTypes).toContain("SUPPORT_INBOX: DurableObjectNamespace");
  });

  it("exports and routes SupportInbox before the OpenNext fallback", () => {
    const workerSource = readFileSync("worker.ts", "utf8");
    const inboxSource = readFileSync("src/lib/cloudflare/support-inbox.ts", "utf8");

    expect(workerSource).toContain("routeSupportInboxRequest");
    expect(workerSource).toContain('export { SupportInbox } from "./src/lib/cloudflare/support-inbox";');
    expect(workerSource.indexOf("routeSupportInboxRequest")).toBeLessThan(
      workerSource.indexOf("openNextWorker.fetch(request, env, ctx)"),
    );
    expect(inboxSource).toContain("export class SupportInbox");
    expect(inboxSource).toContain('"/__cloudflare/support-inbox/"');
    expect(inboxSource).toContain("verifyRealtimeRoomToken");
    expect(inboxSource).toContain('{ type: "message", message }');
    expect(inboxSource).toContain("fanout");
  });

  it("ignores non-support-inbox paths", () => {
    const request = new Request("https://archestimator.test/workshop");

    expect(parseSupportInboxConversationId(request)).toBeNull();
  });

  it("fails closed when the conversation id is invalid", async () => {
    const request = new Request("https://archestimator.test/__cloudflare/support-inbox/%20");

    const response = await routeSupportInboxRequest(request, {});

    expect(response?.status).toBe(400);
    expect(await response?.json()).toEqual({ ok: false, error: "invalid_conversation" });
  });

  it("fails closed when the Durable Object binding is absent", async () => {
    const request = new Request("https://archestimator.test/__cloudflare/support-inbox/conversation-123");

    const response = await routeSupportInboxRequest(request, {});

    expect(response?.status).toBe(503);
    expect(await response?.json()).toEqual({ ok: false, error: "support_inbox_binding_missing" });
  });

  it("rejects a WebSocket upgrade before acceptWebSocket when the room token is missing", async () => {
    const state = createDurableObjectState();
    const inbox = new SupportInbox(state.ctx, {
      REALTIME_ROOM_TOKEN_SECRET: "test-room-secret",
    });
    const request = new Request("https://archestimator.test/__cloudflare/support-inbox/conversation-123", {
      headers: { upgrade: "websocket" },
    });

    const response = await inbox.fetch(request);

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ ok: false, error: "auth_failed" });
    expect(state.acceptedSockets).toHaveLength(0);
  });

  it("rejects a WebSocket upgrade before acceptWebSocket when the query room token is invalid", async () => {
    const state = createDurableObjectState();
    const inbox = new SupportInbox(state.ctx, {
      REALTIME_ROOM_TOKEN_SECRET: "test-room-secret",
    });
    const request = new Request(
      "https://archestimator.test/__cloudflare/support-inbox/conversation-123?token=invalid-token",
      { headers: { upgrade: "websocket" } },
    );

    const response = await inbox.fetch(request);

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ ok: false, error: "auth_failed" });
    expect(state.acceptedSockets).toHaveLength(0);
  });

  it("routes a valid support conversation request through the named Durable Object stub", async () => {
    const request = new Request("https://archestimator.test/__cloudflare/support-inbox/conversation-123");
    const calls: string[] = [];
    const response = await routeSupportInboxRequest(request, {
      SUPPORT_INBOX: {
        idFromName(name: string) {
          calls.push(`id:${name}`);
          return { name };
        },
        get(id: unknown) {
          calls.push(`get:${JSON.stringify(id)}`);
          return {
            fetch(stubRequest: Request) {
              calls.push(`fetch:${stubRequest.url}`);
              return Response.json({ ok: true });
            },
          };
        },
      },
    });

    expect(response?.status).toBe(200);
    expect(await response?.json()).toEqual({ ok: true });
    expect(calls).toEqual([
      "id:conversation-123",
      'get:{"name":"conversation-123"}',
      "fetch:https://archestimator.test/__cloudflare/support-inbox/conversation-123",
    ]);
  });
});
