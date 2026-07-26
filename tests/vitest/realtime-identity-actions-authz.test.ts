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
  readCollaborationTopicAccessInD1: vi.fn(),
}));

const supportConversationMocks = vi.hoisted(() => ({
  canAccessVisibleSupportConversationInD1: vi.fn(),
}));

const realtimeServerMocks = vi.hoisted(() => ({
  issueRealtimeIdentityEnvelope: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => authMocks);
vi.mock("@/lib/legal/terms-acceptance", () => termsAcceptanceMocks);
vi.mock("@/lib/cloudflare/d1", () => d1Mocks);
vi.mock("@/lib/authz/d1-access", () => authzMocks);
vi.mock("@/lib/repositories/support-conversations-repository", () => supportConversationMocks);
vi.mock("@/lib/collaboration/realtime-identity-server", () => realtimeServerMocks);

const userContext = {
  userId: "22222222-2222-4222-8222-222222222222",
  email: "member@example.com",
  role: "member",
  profile: { id: "22222222-2222-4222-8222-222222222222", role: "member" },
  displayName: "Member",
  avatarUrl: null,
};

const adminContext = {
  ...userContext,
  email: "admin@example.com",
  role: "admin",
  profile: { ...userContext.profile, role: "admin" },
  displayName: "Admin",
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
  vi.stubEnv("REALTIME_ROOM_TOKEN_SECRET", "test-room-token-secret");
  authMocks.getCurrentUserContext.mockResolvedValue(userContext);
  termsAcceptanceMocks.getCurrentUserTermsAcceptanceStatus.mockResolvedValue({ requiresAcceptance: false });
  d1Mocks.getCloudflareD1Database.mockResolvedValue(fakeDatabase);
  authzMocks.readCollaborationTopicAccessInD1.mockResolvedValue({ role: "editor" });
  supportConversationMocks.canAccessVisibleSupportConversationInD1.mockResolvedValue(true);
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
    expect(authzMocks.readCollaborationTopicAccessInD1).toHaveBeenCalledWith(
      fakeDatabase,
      { kind: "project", resourceId: "33333333-3333-4333-8333-333333333333" },
      userContext,
    );
    expect(realtimeServerMocks.issueRealtimeIdentityEnvelope).toHaveBeenCalledWith(expect.objectContaining({ role: "editor" }));
    await expect(verifyRealtimeRoomToken({
      expectedTopic: "project:33333333-3333-4333-8333-333333333333",
      secret: "test-room-token-secret",
      token: result?.roomToken ?? "",
    })).resolves.toMatchObject({
      v: 2,
      sub: userContext.userId,
      topic: "project:33333333-3333-4333-8333-333333333333",
      capabilities: expect.arrayContaining(["presence:read", "presence:write", "broadcast:cursor"]),
    });
  });

  it("does not sign a project topic when the caller lacks project access", async () => {
    authzMocks.readCollaborationTopicAccessInD1.mockResolvedValueOnce(null);
    const { issueRealtimeIdentity } = await import("@/lib/collaboration/realtime-identity-actions");

    const result = await issueRealtimeIdentity({
      topic: "project:33333333-3333-4333-8333-333333333333",
    });

    expect(result).toBeNull();
    expect(authzMocks.readCollaborationTopicAccessInD1).toHaveBeenCalledWith(
      fakeDatabase,
      { kind: "project", resourceId: "33333333-3333-4333-8333-333333333333" },
      userContext,
    );
    expect(realtimeServerMocks.issueRealtimeIdentityEnvelope).not.toHaveBeenCalled();
  });

  it("does not sign an estimate topic when the caller lacks estimate access", async () => {
    authzMocks.readCollaborationTopicAccessInD1.mockResolvedValueOnce(null);
    const { issueRealtimeIdentity } = await import("@/lib/collaboration/realtime-identity-actions");

    const result = await issueRealtimeIdentity({
      topic: "estimate:44444444-4444-4444-8444-444444444444",
    });

    expect(result).toBeNull();
    expect(authzMocks.readCollaborationTopicAccessInD1).toHaveBeenCalledWith(
      fakeDatabase,
      { kind: "estimate", resourceId: "44444444-4444-4444-8444-444444444444" },
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
    expect(authzMocks.readCollaborationTopicAccessInD1).not.toHaveBeenCalled();
    expect(realtimeServerMocks.issueRealtimeIdentityEnvelope).not.toHaveBeenCalled();
  });

  it("signs an admin-only global presence room token", async () => {
    authMocks.getCurrentUserContext.mockResolvedValueOnce(adminContext);
    const { issueGlobalPresenceRealtimeToken } = await import("@/lib/collaboration/realtime-identity-actions");
    const { verifyRealtimeRoomToken } = await import("@/lib/collaboration/realtime-room-token");

    const result = await issueGlobalPresenceRealtimeToken();

    expect(result?.roomToken).toEqual(expect.any(String));
    await expect(verifyRealtimeRoomToken({
      expectedTopic: "global-presence",
      secret: "test-room-token-secret",
      token: result?.roomToken ?? "",
    })).resolves.toMatchObject({
      sub: userContext.userId,
      topic: "global-presence",
    });
    expect(supportConversationMocks.canAccessVisibleSupportConversationInD1).not.toHaveBeenCalled();
  });

  it("does not sign a global presence token for non-admin callers", async () => {
    const { issueGlobalPresenceRealtimeToken } = await import("@/lib/collaboration/realtime-identity-actions");

    const result = await issueGlobalPresenceRealtimeToken();

    expect(result).toBeNull();
  });

  it("signs a support inbox token for an accessible conversation", async () => {
    const { issueSupportInboxRealtimeToken } = await import("@/lib/collaboration/realtime-identity-actions");
    const { verifyRealtimeRoomToken } = await import("@/lib/collaboration/realtime-room-token");

    const result = await issueSupportInboxRealtimeToken({ conversationId: "conversation-123" });

    expect(result?.roomToken).toEqual(expect.any(String));
    expect(supportConversationMocks.canAccessVisibleSupportConversationInD1).toHaveBeenCalledWith({
      conversationId: "conversation-123",
      database: fakeDatabase,
      userId: userContext.userId,
    });
    await expect(verifyRealtimeRoomToken({
      expectedTopic: "conversation-123",
      secret: "test-room-token-secret",
      token: result?.roomToken ?? "",
    })).resolves.toMatchObject({
      sub: userContext.userId,
      topic: "conversation-123",
    });
  });

  it("does not sign a support inbox token when conversation access is denied", async () => {
    supportConversationMocks.canAccessVisibleSupportConversationInD1.mockResolvedValueOnce(false);
    const { issueSupportInboxRealtimeToken } = await import("@/lib/collaboration/realtime-identity-actions");

    const result = await issueSupportInboxRealtimeToken({ conversationId: "conversation-123" });

    expect(result).toBeNull();
  });
});
