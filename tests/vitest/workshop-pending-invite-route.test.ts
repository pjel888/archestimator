import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  acceptPendingInviteBridge: vi.fn(),
  checkInviteAcceptTokenHashRateLimit: vi.fn(),
  isAllowedInviteOrigin: vi.fn(),
  readPendingInviteBridge: vi.fn(),
  requireCurrentUserContext: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  requireCurrentUserContext: mocks.requireCurrentUserContext,
}));
vi.mock("@/lib/collaboration/invite-entry", () => ({
  checkInviteAcceptTokenHashRateLimit: mocks.checkInviteAcceptTokenHashRateLimit,
}));
vi.mock("@/lib/collaboration/invite-origin", () => ({
  isAllowedInviteOrigin: mocks.isAllowedInviteOrigin,
}));
vi.mock("@/lib/collaboration/pending-invite", () => ({
  PENDING_INVITE_COOKIE: "archestimator_pending_invite",
  readPendingInviteBridge: mocks.readPendingInviteBridge,
}));
vi.mock("@/lib/collaboration/workshop-pending-invite", () => ({
  acceptPendingInviteBridge: mocks.acceptPendingInviteBridge,
}));

function request(method: "GET" | "POST", headers: HeadersInit = {}) {
  return new NextRequest("https://app.example.test/workshop/pending-invite", {
    method,
    headers: {
      cookie: "archestimator_pending_invite=signed-cookie",
      host: "app.example.test",
      ...headers,
    },
  });
}

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  mocks.readPendingInviteBridge.mockReturnValue({ version: 1, tokenHash: "v1:token-hash", createdAt: 1 });
  mocks.isAllowedInviteOrigin.mockReturnValue(true);
  mocks.requireCurrentUserContext.mockResolvedValue({ userId: "user-1" });
  mocks.checkInviteAcceptTokenHashRateLimit.mockResolvedValue({ allowed: true });
  mocks.acceptPendingInviteBridge.mockResolvedValue({
    kind: "accepted",
    scope: "project",
    targetHref: "/workshop/projects/project-1",
    targetLabel: "Open project",
  });
});

describe("workshop pending-invite route", () => {
  it("renders a confirmation form on GET without accepting the invitation", async () => {
    const { GET } = await import("@/app/workshop/pending-invite/route");
    const response = await GET(request("GET"));

    expect(response.status).toBe(200);
    await expect(response.text()).resolves.toContain('method="post"');
    expect(mocks.acceptPendingInviteBridge).not.toHaveBeenCalled();
  });

  it("accepts only after a same-origin POST and redirects to the workshop banner", async () => {
    const { POST } = await import("@/app/workshop/pending-invite/route");
    const response = await POST(request("POST", { origin: "https://app.example.test" }));

    expect(mocks.checkInviteAcceptTokenHashRateLimit).toHaveBeenCalledWith({
      invitationTokenHash: "v1:token-hash",
      request: expect.any(NextRequest),
      userId: "user-1",
    });
    expect(mocks.acceptPendingInviteBridge).toHaveBeenCalledWith(
      { version: 1, tokenHash: "v1:token-hash", createdAt: 1 },
      { userId: "user-1" },
    );
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/workshop?invite=accepted");
    expect(response.headers.get("set-cookie")).toContain("archestimator_pending_invite=");
  });

  it("rejects a cross-origin POST before checking the cookie or accepting", async () => {
    mocks.isAllowedInviteOrigin.mockReturnValue(false);
    const { POST } = await import("@/app/workshop/pending-invite/route");
    const response = await POST(request("POST", { origin: "https://untrusted.example.test" }));

    expect(response.status).toBe(403);
    expect(mocks.readPendingInviteBridge).not.toHaveBeenCalled();
    expect(mocks.acceptPendingInviteBridge).not.toHaveBeenCalled();
  });
});
