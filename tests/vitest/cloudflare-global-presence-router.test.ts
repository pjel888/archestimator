import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  parseGlobalPresenceRequest,
  routeGlobalPresenceRequest,
} from "@/lib/cloudflare/global-presence-router";
import { GlobalPresence } from "@/lib/cloudflare/global-presence";

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

describe("Cloudflare global presence Durable Object router", () => {
  it("declares the GlobalPresence binding, migration, and generated env type", () => {
    const config = readWranglerConfig();
    const generatedTypes = readFileSync("cloudflare-env.d.ts", "utf8");

    expect(config.durable_objects?.bindings).toContainEqual({
      name: "GLOBAL_PRESENCE",
      class_name: "GlobalPresence",
    });
    expect(config.migrations).toContainEqual({
      tag: "v2-admin-dashboard",
      new_sqlite_classes: ["GlobalPresence", "SupportInbox"],
    });
    expect(generatedTypes).toContain("GLOBAL_PRESENCE: DurableObjectNamespace");
  });

  it("exports and routes GlobalPresence before the OpenNext fallback", () => {
    const workerSource = readFileSync("worker.ts", "utf8");
    const presenceSource = readFileSync("src/lib/cloudflare/global-presence.ts", "utf8");

    expect(workerSource).toContain("routeGlobalPresenceRequest");
    expect(workerSource).toContain('export { GlobalPresence } from "./src/lib/cloudflare/global-presence";');
    expect(workerSource.indexOf("routeGlobalPresenceRequest")).toBeLessThan(
      workerSource.indexOf("openNextWorker.fetch(request, env, ctx)"),
    );
    expect(presenceSource).toContain("export class GlobalPresence");
    expect(presenceSource).toContain('"/__cloudflare/global-presence"');
    expect(presenceSource).toContain("verifyRealtimeRoomToken");
    expect(presenceSource).toContain('{ type: "presence", count }');
    expect(presenceSource).not.toContain("displayName");
    expect(presenceSource).not.toContain("email");
  });

  it("ignores non-global-presence paths", () => {
    const request = new Request("https://archestimator.test/workshop");

    expect(parseGlobalPresenceRequest(request)).toBeNull();
  });

  it("fails closed when the Durable Object binding is absent", async () => {
    const request = new Request("https://archestimator.test/__cloudflare/global-presence");

    const response = await routeGlobalPresenceRequest(request, {});

    expect(response?.status).toBe(503);
    expect(await response?.json()).toEqual({ ok: false, error: "global_presence_binding_missing" });
  });

  it("rejects a WebSocket upgrade before acceptWebSocket when the room token is missing", async () => {
    const state = createDurableObjectState();
    const presence = new GlobalPresence(state.ctx, {
      REALTIME_ROOM_TOKEN_SECRET: "test-room-secret",
    });
    const request = new Request("https://archestimator.test/__cloudflare/global-presence", {
      headers: { upgrade: "websocket" },
    });

    const response = await presence.fetch(request);

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ ok: false, error: "auth_failed" });
    expect(state.acceptedSockets).toHaveLength(0);
  });

  it("rejects a WebSocket upgrade before acceptWebSocket when the room token is invalid", async () => {
    const state = createDurableObjectState();
    const presence = new GlobalPresence(state.ctx, {
      REALTIME_ROOM_TOKEN_SECRET: "test-room-secret",
    });
    const request = new Request("https://archestimator.test/__cloudflare/global-presence", {
      headers: {
        authorization: "Bearer invalid-token",
        upgrade: "websocket",
      },
    });

    const response = await presence.fetch(request);

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ ok: false, error: "auth_failed" });
    expect(state.acceptedSockets).toHaveLength(0);
  });

  it("routes through the singleton global Durable Object stub", async () => {
    const request = new Request("https://archestimator.test/__cloudflare/global-presence");
    const calls: string[] = [];
    const response = await routeGlobalPresenceRequest(request, {
      GLOBAL_PRESENCE: {
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
      "id:global",
      'get:{"name":"global"}',
      "fetch:https://archestimator.test/__cloudflare/global-presence",
    ]);
  });
});
