import { existsSync, readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  parseCollaborationRoomName,
  routeCollaborationRoomRequest,
} from "@/lib/cloudflare/collaboration-room-router";

type WranglerConfig = {
  name?: string;
  d1_databases?: Array<{
    binding?: string;
    database_name?: string;
    database_id?: string;
    preview_database_id?: string;
    remote?: boolean;
  }>;
  r2_buckets?: Array<{
    binding?: string;
    bucket_name?: string;
    preview_bucket_name?: string;
    remote?: boolean;
  }>;
  images?: { binding?: string };
  send_email?: Array<{ name?: string; remote?: boolean }>;
  queues?: {
    producers?: Array<{ binding?: string; queue?: string; remote?: boolean }>;
    consumers?: Array<unknown>;
  };
  observability?: unknown;
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

function readNextDevWranglerConfig(path = "wrangler.next-dev.jsonc") {
  return JSON.parse(readFileSync(path, "utf8")) as WranglerConfig;
}

function assertNextDevBindingSubset(config: WranglerConfig, expectedName: string) {
  expect(config.name).toBe(expectedName);
  expect(config.d1_databases?.map((binding) => binding.binding)).toContain("ARCH_DB");
  expect(config.r2_buckets?.map((binding) => binding.binding)).toContain("ARCH_UPLOADS_R2");
  expect(config.images?.binding).toBe("IMAGES");
  expect(config.send_email?.map((binding) => binding.name)).toContain("EMAIL");
  expect(config.queues?.producers?.map((binding) => binding.binding)).toContain("UPLOAD_JOBS_QUEUE");
  expect(config.queues?.consumers).toBeUndefined();
  expect(config.durable_objects).toBeUndefined();
  expect(config.migrations).toBeUndefined();
  expect(config.observability).toBeUndefined();
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

  it("keeps next dev Cloudflare bindings free of Worker-only Durable Object runtime state", () => {
    const nextConfigSource = readFileSync("next.config.ts", "utf8");
    const hasNextDevConfig = existsSync("wrangler.next-dev.jsonc");
    const hasNextDevRemoteConfig = existsSync("wrangler.next-dev.remote.jsonc");

    expect(nextConfigSource).toContain("initOpenNextCloudflareForDev");
    expect(nextConfigSource).toContain('ARCH_DEV_USE_REMOTE_BINDINGS === "1"');
    expect(nextConfigSource).toContain('"wrangler.next-dev.jsonc"');
    expect(nextConfigSource).toContain('"wrangler.next-dev.remote.jsonc"');
    expect(hasNextDevConfig).toBe(true);
    expect(hasNextDevRemoteConfig).toBe(true);
    if (!hasNextDevConfig || !hasNextDevRemoteConfig) return;

    const nextDevConfig = readNextDevWranglerConfig();
    assertNextDevBindingSubset(nextDevConfig, "archestimator-next-dev-bindings");
    expect(nextDevConfig.d1_databases?.some((binding) => binding.remote === true)).toBe(false);
    expect(nextDevConfig.r2_buckets?.some((binding) => binding.remote === true)).toBe(false);

    const nextDevRemoteConfig = readNextDevWranglerConfig("wrangler.next-dev.remote.jsonc");
    assertNextDevBindingSubset(nextDevRemoteConfig, "archestimator-next-dev-bindings-remote");
    expect(nextDevRemoteConfig.d1_databases?.find((binding) => binding.binding === "ARCH_DB")?.remote).toBe(true);
    expect(nextDevRemoteConfig.r2_buckets?.find((binding) => binding.binding === "ARCH_UPLOADS_R2")?.remote).toBe(true);
    expect(nextDevRemoteConfig.r2_buckets?.find((binding) => binding.binding === "ARCH_UPLOADS_R2")?.bucket_name).toBe(
      "archestimator-proof-uploads",
    );
    expect(nextDevRemoteConfig.send_email?.some((binding) => binding.remote === true)).toBe(false);
    expect(nextDevRemoteConfig.queues?.producers?.some((binding) => binding.remote === true)).toBe(false);
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
