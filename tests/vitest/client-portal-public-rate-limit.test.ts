import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  decisionRateLimit: vi.fn(async () => ({ allowed: false as const, message: "Too many attempts.", retryAfter: 30 })),
  decisionReadRateLimit: vi.fn(async () => ({ allowed: false as const, message: "Too many attempts.", retryAfter: 30 })),
  getManifest: vi.fn(),
  passwordRateLimit: vi.fn(async () => ({ allowed: false as const, message: "Too many attempts.", retryAfter: 30 })),
  publicReadRateLimit: vi.fn(async () => ({ allowed: false as const, message: "Too many attempts.", retryAfter: 30 })),
  requiresPassword: vi.fn(async () => false),
  sessionRateLimit: vi.fn(async () => ({ allowed: false as const, message: "Too many attempts.", retryAfter: 30 })),
  threadRateLimit: vi.fn(async () => ({ allowed: false as const, message: "Too many attempts.", retryAfter: 30 })),
  threadReadRateLimit: vi.fn(async () => ({ allowed: false as const, message: "Too many attempts.", retryAfter: 30 })),
}));

const recipientActor = {
  kind: "recipient" as const,
  recipientId: "recipient_1",
  portalId: "portal_1",
  role: "approver" as const,
  status: "active" as const,
  verificationState: "verified" as const,
  organization: null,
  isRequiredApprover: false,
  overrides: [],
};

vi.mock("server-only", () => ({}));
vi.mock("@opennextjs/cloudflare", () => ({ getCloudflareContext: vi.fn() }));
vi.mock("@/lib/cloudflare/d1", () => ({ getCloudflareD1Database: vi.fn(async () => ({})) }));
vi.mock("@/lib/client-portal/activity-service", () => ({ recordClientPortalAnalyticsEvent: vi.fn() }));
vi.mock("@/lib/client-portal/decision-service", () => ({ submitClientPortalDecision: vi.fn(), summarizeClientPortalDecisions: vi.fn() }));
vi.mock("@/lib/client-portal/thread-repository", () => ({
  createClientPortalRecipientThread: vi.fn(),
  editClientPortalRecipientMessage: vi.fn(),
  listClientPortalRecipientThreadMessages: vi.fn(),
  listClientPortalRecipientThreads: vi.fn(),
  markClientPortalRecipientThreadRead: vi.fn(),
  replyToClientPortalThread: vi.fn(),
  setClientPortalRecipientThreadStatus: vi.fn(),
  tombstoneClientPortalRecipientMessage: vi.fn(),
}));
vi.mock("@/lib/http/read-bounded-body", () => ({ readBoundedJsonBody: vi.fn() }));
vi.mock("@/lib/publication/security", () => ({
  assertSameOriginPublicPost: vi.fn(() => ({ ok: true })),
  createPublicationAccessCookie: vi.fn(),
  createSharedLinkSessionCookie: vi.fn(),
}));
vi.mock("@/lib/publication/public-repository", () => ({
  checkClientPortalDecisionRateLimit: mocks.decisionRateLimit,
  checkClientPortalDecisionReadRateLimit: mocks.decisionReadRateLimit,
  checkClientPortalPasswordRateLimit: mocks.passwordRateLimit,
  checkClientPortalPublicReadRateLimit: mocks.publicReadRateLimit,
  checkClientPortalSessionStartRateLimit: mocks.sessionRateLimit,
  checkClientPortalThreadRateLimit: mocks.threadRateLimit,
  checkClientPortalThreadReadRateLimit: mocks.threadReadRateLimit,
  clearClientPortalPasswordFailures: vi.fn(),
  recordClientPortalPasswordFailure: vi.fn(),
}));
vi.mock("@/lib/client-portal/public-repository", () => ({
  CLIENT_PORTAL_NO_STORE_HEADERS: {
    "Cache-Control": "private, no-store",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-Robots-Tag": "noindex, nofollow",
  },
  getClientPortalBrandAsset: vi.fn(),
  getClientPortalManifest: mocks.getManifest,
  getClientPortalSection: vi.fn(),
  hasClientPortalPasswordSession: vi.fn(),
  readClientPortalRecipientSession: vi.fn(async () => recipientActor),
  requiresClientPortalPassword: mocks.requiresPassword,
  resolveClientPortalRecipientActor: vi.fn(),
  verifyClientPortalPassword: vi.fn(),
}));

import { clientPortalDecisionSummaryResponse, submitClientPortalDecisionResponse } from "@/lib/client-portal/public-decision-handlers";
import { clientPortalPasswordResponse } from "@/lib/client-portal/public-password-handler";
import { clientPortalManifestResponse, clientPortalSectionResponse } from "@/lib/client-portal/public-route-handlers";
import { clientPortalRecipientVerificationResponse } from "@/lib/client-portal/public-session-handler";
import { createClientPortalThreadResponse, listClientPortalThreadsResponse } from "@/lib/client-portal/public-thread-handlers";
import { GET as getClientPortalAsset } from "@/app/api/share/[token]/assets/[assetId]/route";

const request = new Request("https://archestimator.test/api/share/" + "a".repeat(43), { method: "POST" });

async function expectRateLimited(response: Response) {
  expect(response.status).toBe(429);
  expect(response.headers.get("Cache-Control")).toContain("no-store");
  expect(response.headers.get("Retry-After")).toBe("30");
}

describe("Client Portal public rate limits", () => {
  it("rejects manifest, section, and asset reads before resolving public content", async () => {
    await expectRateLimited(await clientPortalManifestResponse(new Request(request.url), "a".repeat(43)));
    await expectRateLimited(await clientPortalSectionResponse(new Request(request.url), "a".repeat(43), "section_1"));
    await expectRateLimited(await getClientPortalAsset(new Request(request.url), {
      params: Promise.resolve({ assetId: "asset_1", token: "a".repeat(43) }),
    }));
    expect(mocks.publicReadRateLimit).toHaveBeenCalledWith(expect.objectContaining({ route: "manifest" }));
    expect(mocks.publicReadRateLimit).toHaveBeenCalledWith(expect.objectContaining({ route: "section" }));
    expect(mocks.publicReadRateLimit).toHaveBeenCalledWith(expect.objectContaining({ route: "asset" }));
  });

  it("requires the portal password even when a recipient session cookie exists", async () => {
    mocks.publicReadRateLimit.mockResolvedValueOnce({ allowed: true as const });
    mocks.requiresPassword.mockResolvedValueOnce(true);

    const response = await clientPortalManifestResponse(new Request(request.url), "a".repeat(43));

    expect(response.status).toBe(423);
    expect(await response.json()).toMatchObject({ passwordRequired: true });
    expect(mocks.getManifest).not.toHaveBeenCalled();
  });

  it("rejects password and recipient-session attempts before credential work", async () => {
    await expectRateLimited(await clientPortalPasswordResponse(request, "a".repeat(43)));
    await expectRateLimited(await clientPortalRecipientVerificationResponse(request, "a".repeat(43)));
    expect(mocks.passwordRateLimit).toHaveBeenCalledTimes(1);
    expect(mocks.sessionRateLimit).toHaveBeenCalledTimes(1);
  });

  it("rejects decision writes and reads per recipient before service calls", async () => {
    await expectRateLimited(await submitClientPortalDecisionResponse(request, "a".repeat(43)));
    await expectRateLimited(await clientPortalDecisionSummaryResponse(new Request(`${request.url}?issueId=issue_1`), "a".repeat(43)));
    expect(mocks.decisionRateLimit).toHaveBeenCalledWith({ portalId: "portal_1", recipientId: "recipient_1" });
    expect(mocks.decisionReadRateLimit).toHaveBeenCalledWith({ portalId: "portal_1", recipientId: "recipient_1" });
  });

  it("rejects discussion writes and reads per recipient before repository calls", async () => {
    await expectRateLimited(await createClientPortalThreadResponse(request, "a".repeat(43)));
    await expectRateLimited(await listClientPortalThreadsResponse(new Request(request.url), "a".repeat(43)));
    expect(mocks.threadRateLimit).toHaveBeenCalledWith({ portalId: "portal_1", recipientId: "recipient_1" });
    expect(mocks.threadReadRateLimit).toHaveBeenCalledWith({ portalId: "portal_1", recipientId: "recipient_1" });
  });
});
