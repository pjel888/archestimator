import { describe, expect, it } from "vitest";

import {
  PENDING_INVITE_COOKIE,
  createPendingInviteBridge,
  readPendingInviteBridge,
} from "@/lib/collaboration/pending-invite";

const env = {
  PROJECT_INVITE_ENTRY_ENABLED: "true",
  ARCHESTIMATOR_INVITE_TOKEN_PEPPER: "bridge-pepper",
};

describe("pending invite bridge cookie", () => {
  it("stores a signed token reference without exposing the raw route token", () => {
    const bridge = createPendingInviteBridge("public-route-token", env);

    expect(PENDING_INVITE_COOKIE).toBe("archestimator_pending_invite");
    expect(bridge.cookieValue).not.toContain("public-route-token");
    expect(bridge.tokenHash).toMatch(/^v1:[a-f0-9]{64}$/);
    expect(readPendingInviteBridge(bridge.cookieValue, env)).toEqual({
      createdAt: expect.any(Number),
      tokenHash: bridge.tokenHash,
      version: 1,
    });
  });

  it("rejects tampered bridge values", () => {
    const bridge = createPendingInviteBridge("public-route-token", env);
    const tampered = bridge.cookieValue.replace(/.$/, "x");

    expect(readPendingInviteBridge(tampered, env)).toBeNull();
    expect(readPendingInviteBridge("", env)).toBeNull();
  });

  it("does not create a bridge when invite entry is disabled", () => {
    expect(() =>
      createPendingInviteBridge("public-route-token", {
        PROJECT_INVITE_ENTRY_ENABLED: "false",
        ARCHESTIMATOR_INVITE_TOKEN_PEPPER: "bridge-pepper",
      }),
    ).toThrow("Project invite entry is disabled.");
  });
});
