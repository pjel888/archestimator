import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  parseCollaborationRoomName,
  routeCollaborationRoomRequest,
} from "@/lib/cloudflare/collaboration-room-router";

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

describe("Cloudflare collaboration room Durable Object scaffold", () => {
  it("declares a SQLite-backed Durable Object binding and generated env type", () => {
    const config = readWranglerConfig();
    const generatedTypes = readFileSync("cloudflare-env.d.ts", "utf8");

    expect(config.durable_objects?.bindings).toContainEqual({
      name: "COLLAB_ROOMS",
      class_name: "CollaborationRoom",
    });
    expect(config.migrations).toContainEqual({
      tag: "v1",
      new_sqlite_classes: ["CollaborationRoom"],
    });
    expect(generatedTypes).toContain("COLLAB_ROOMS: DurableObjectNamespace");
  });

  it("exports the Durable Object class from the Worker wrapper", () => {
    const workerSource = readFileSync("worker.ts", "utf8");
    const roomSource = readFileSync("src/lib/cloudflare/collaboration-room.ts", "utf8");

    expect(workerSource).toContain("routeCollaborationRoomRequest");
    expect(workerSource).toContain('export { CollaborationRoom } from "./src/lib/cloudflare/collaboration-room";');
    expect(roomSource).toContain("export class CollaborationRoom");
    expect(roomSource).toContain("constructor(ctx: DurableObjectStateLike, env: Record<string, unknown> = {})");
    expect(roomSource).toContain("verifyRealtimeRoomToken");
    expect(roomSource).toContain("auth_required");
    expect(roomSource).toContain("new WebSocketPair()");
    expect(roomSource).toContain("this.ctx.acceptWebSocket(server)");
    expect(roomSource).toContain("webSocketMessage");
  });

  it("ignores non-collaboration-room paths", () => {
    const request = new Request("https://archestimator.test/workshop");

    expect(parseCollaborationRoomName(request)).toBeNull();
  });

  it("fails closed when the room name is invalid", async () => {
    const request = new Request("https://archestimator.test/__cloudflare/collaboration-room/%20");

    const response = await routeCollaborationRoomRequest(request, {});

    expect(response?.status).toBe(400);
    expect(await response?.json()).toEqual({ ok: false, error: "invalid_room" });
  });

  it("fails closed when the Durable Object binding is absent", async () => {
    const request = new Request("https://archestimator.test/__cloudflare/collaboration-room/workspace:proof");

    const response = await routeCollaborationRoomRequest(request, {});

    expect(response?.status).toBe(503);
    expect(await response?.json()).toEqual({ ok: false, error: "collaboration_room_binding_missing" });
  });

  it("routes a valid collaboration room request through the named Durable Object stub", async () => {
    const request = new Request("https://archestimator.test/__cloudflare/collaboration-room/workspace:proof");
    const calls: string[] = [];
    const response = await routeCollaborationRoomRequest(request, {
      COLLAB_ROOMS: {
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
      "id:workspace:proof",
      'get:{"name":"workspace:proof"}',
      "fetch:https://archestimator.test/__cloudflare/collaboration-room/workspace:proof",
    ]);
  });
});
