import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  getCurrentUserContext: vi.fn(),
}));

const termsAcceptanceMocks = vi.hoisted(() => ({
  getCurrentUserTermsAcceptanceStatus: vi.fn(),
}));

const d1Mocks = vi.hoisted(() => ({
  getCloudflareD1Database: vi.fn(),
}));

const authzMocks = vi.hoisted(() => ({
  canAccessEstimateInD1: vi.fn(),
  canAccessProjectInD1: vi.fn(),
}));

const realtimeServerMocks = vi.hoisted(() => ({
  issueRealtimeIdentityEnvelope: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => authMocks);
vi.mock("@/lib/legal/terms-acceptance", () => termsAcceptanceMocks);
vi.mock("@/lib/cloudflare/d1", () => d1Mocks);
vi.mock("@/lib/authz/d1-access", () => authzMocks);
vi.mock("@/lib/collaboration/realtime-identity-server", () => realtimeServerMocks);

const userContext = {
  userId: "22222222-2222-4222-8222-222222222222",
  email: "member@example.com",
  role: "member",
  profile: { id: "22222222-2222-4222-8222-222222222222", role: "member" },
  displayName: "Member",
  avatarUrl: null,
};

const fakeDatabase = {
  prepare: vi.fn(),
};

const signedEnvelope = {
  sub: userContext.userId,
  topic: "project:33333333-3333-4333-8333-333333333333",
  role: "member",
  iat: 1,
  exp: 2,
  kid: "kid",
  sig: "sig",
};

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.stubEnv("ARCHESTIMATOR_INVITE_TOKEN_PEPPER", "test-room-token-secret");
  authMocks.getCurrentUserContext.mockResolvedValue(userContext);
  termsAcceptanceMocks.getCurrentUserTermsAcceptanceStatus.mockResolvedValue({ requiresAcceptance: false });
  d1Mocks.getCloudflareD1Database.mockResolvedValue(fakeDatabase);
  authzMocks.canAccessProjectInD1.mockResolvedValue(true);
  authzMocks.canAccessEstimateInD1.mockResolvedValue(true);
  realtimeServerMocks.issueRealtimeIdentityEnvelope.mockResolvedValue({
    envelope: signedEnvelope,
    publicKey: "public-key",
  });
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("issueRealtimeIdentity object authorization", () => {
  it("signs a project topic and returns a room token only after project access passes", async () => {
    const { issueRealtimeIdentity } = await import("@/lib/collaboration/realtime-identity-actions");
    const { verifyRealtimeRoomToken } = await import("@/lib/collaboration/realtime-room-token");

    const result = await issueRealtimeIdentity({
      topic: "project:33333333-3333-4333-8333-333333333333",
    });

    expect(result).toMatchObject({
      envelope: signedEnvelope,
      publicKey: "public-key",
      userId: userContext.userId,
      displayName: userContext.displayName,
    });
    expect(result?.roomToken).toEqual(expect.any(String));
    expect(authzMocks.canAccessProjectInD1).toHaveBeenCalledWith(
      fakeDatabase,
      "33333333-3333-4333-8333-333333333333",
      userContext,
    );
    await expect(verifyRealtimeRoomToken({
      expectedTopic: "project:33333333-3333-4333-8333-333333333333",
      secret: "test-room-token-secret",
      token: result?.roomToken ?? "",
    })).resolves.toMatchObject({
      sub: userContext.userId,
      topic: "project:33333333-3333-4333-8333-333333333333",
    });
  });

  it("does not sign a project topic when the caller lacks project access", async () => {
    authzMocks.canAccessProjectInD1.mockResolvedValueOnce(false);
    const { issueRealtimeIdentity } = await import("@/lib/collaboration/realtime-identity-actions");

    const result = await issueRealtimeIdentity({
      topic: "project:33333333-3333-4333-8333-333333333333",
    });

    expect(result).toBeNull();
    expect(authzMocks.canAccessProjectInD1).toHaveBeenCalledWith(
      fakeDatabase,
      "33333333-3333-4333-8333-333333333333",
      userContext,
    );
    expect(realtimeServerMocks.issueRealtimeIdentityEnvelope).not.toHaveBeenCalled();
  });

  it("does not sign an estimate topic when the caller lacks estimate access", async () => {
    authzMocks.canAccessEstimateInD1.mockResolvedValueOnce(false);
    const { issueRealtimeIdentity } = await import("@/lib/collaboration/realtime-identity-actions");

    const result = await issueRealtimeIdentity({
      topic: "estimate:44444444-4444-4444-8444-444444444444",
    });

    expect(result).toBeNull();
    expect(authzMocks.canAccessEstimateInD1).toHaveBeenCalledWith(
      fakeDatabase,
      "44444444-4444-4444-8444-444444444444",
      userContext,
    );
    expect(realtimeServerMocks.issueRealtimeIdentityEnvelope).not.toHaveBeenCalled();
  });

  it("fails closed before signing when the D1 database is unavailable", async () => {
    d1Mocks.getCloudflareD1Database.mockResolvedValueOnce(null);
    const { issueRealtimeIdentity } = await import("@/lib/collaboration/realtime-identity-actions");

    const result = await issueRealtimeIdentity({
      topic: "project:33333333-3333-4333-8333-333333333333",
    });

    expect(result).toBeNull();
    expect(authzMocks.canAccessProjectInD1).not.toHaveBeenCalled();
    expect(realtimeServerMocks.issueRealtimeIdentityEnvelope).not.toHaveBeenCalled();
  });
});
