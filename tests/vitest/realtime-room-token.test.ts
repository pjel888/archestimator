import { describe, expect, it } from "vitest";

import {
  hasRealtimeRoomCapability,
  issueRealtimeRoomToken,
  readCollaborationRoomTokenSecret,
  verifyRealtimeRoomToken,
} from "@/lib/collaboration/realtime-room-token";

describe("realtime room token v2", () => {
  it("round-trips explicit collaboration capabilities", async () => {
    const token = await issueRealtimeRoomToken({
      nowMs: 1_000,
      secret: "test-secret",
      sub: "user-1",
      topic: "estimate:estimate-1",
      capabilities: ["presence:write", "broadcast:cursor", "presence:write"],
    });

    const claims = await verifyRealtimeRoomToken({
      nowMs: 2_000,
      secret: "test-secret",
      expectedTopic: "estimate:estimate-1",
      token,
    });

    expect(claims).toMatchObject({
      v: 2,
      sub: "user-1",
      capabilities: ["broadcast:cursor", "presence:write"],
    });
    expect(claims && hasRealtimeRoomCapability(claims, "broadcast:cursor")).toBe(true);
    expect(claims && hasRealtimeRoomCapability(claims, "broadcast:row-update")).toBe(false);
  });
});

describe("collaboration-room secret boundary", () => {
  it("does not fall back to invite or identity signing secrets", () => {
    expect(readCollaborationRoomTokenSecret({
      ARCHESTIMATOR_INVITE_TOKEN_PEPPER: "invite-pepper",
      REALTIME_IDENTITY_SIGNING_KEY: "identity-key",
    })).toBeNull();
    expect(readCollaborationRoomTokenSecret({ REALTIME_ROOM_TOKEN_SECRET: " room-secret " })).toBe("room-secret");
  });
});
