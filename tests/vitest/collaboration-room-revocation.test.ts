import { describe, expect, it, vi } from "vitest";

import { revokeCollaborationRoomSubjectInEnv } from "@/lib/cloudflare/collaboration-room-revocation";

const topic = "project:33333333-3333-4333-8333-333333333333";
const subject = "22222222-2222-4222-8222-222222222222";

describe("collaboration-room subject revocation", () => {
  it("addresses the named Durable Object with a secret-authenticated control request", async () => {
    const fetch = vi.fn().mockResolvedValue(Response.json({ ok: true, closed: 1 }));
    const idFromName = vi.fn((name: string) => ({ name }));
    const get = vi.fn(() => ({ fetch }));

    await expect(revokeCollaborationRoomSubjectInEnv({
      env: {
        COLLABORATION_ROOM_CONTROL_SECRET: "control-secret",
        COLLAB_ROOMS: { idFromName, get },
      },
      subject,
      topic,
    })).resolves.toBe("revoked");

    expect(idFromName).toHaveBeenCalledWith(topic);
    const request = fetch.mock.calls[0]?.[0] as Request;
    expect(request.method).toBe("POST");
    expect(request.headers.get("x-collaboration-room-control-secret")).toBe("control-secret");
    await expect(request.json()).resolves.toEqual({ type: "revoke-subject", sub: subject });
  });

  it("fails closed without a valid topic, subject, binding, or control secret", async () => {
    const get = vi.fn();
    await expect(revokeCollaborationRoomSubjectInEnv({
      env: { COLLAB_ROOMS: { idFromName: vi.fn(), get } },
      subject,
      topic,
    })).resolves.toBe("unavailable");
    await expect(revokeCollaborationRoomSubjectInEnv({
      env: {
        COLLABORATION_ROOM_CONTROL_SECRET: "control-secret",
        COLLAB_ROOMS: { idFromName: vi.fn(), get },
      },
      subject: "not-a-user-id",
      topic,
    })).resolves.toBe("unavailable");
    expect(get).not.toHaveBeenCalled();
  });
});
