import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  listActivity: vi.fn(),
  recordAnalytics: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/client-portal/public-repository", async () => {
  const { attachClientPortalInternalIdentifiers, createClientPortalPublicIdentifier } = await import("@/lib/client-portal/public-identifiers");
  const token = "a".repeat(43);
  return {
    CLIENT_PORTAL_NO_STORE_HEADERS: { "Cache-Control": "private, no-store" },
    getClientPortalIssuedEstimateRowsPage: vi.fn(),
    getClientPortalManifest: vi.fn(),
    getClientPortalSection: vi.fn(async () => attachClientPortalInternalIdentifiers({
      schemaVersion: 1,
      portalId: createClientPortalPublicIdentifier(token, "portal", "portal_internal_1"),
      issueId: createClientPortalPublicIdentifier(token, "issue", "issue_internal_1"),
      section: {
        id: createClientPortalPublicIdentifier(token, "section", "section_internal_1"),
        kind: "activity",
        title: "Activity",
        layoutMode: "wide",
        payloadHash: "f".repeat(64),
        payload: {},
      },
    }, { portalId: "portal_internal_1", issueId: "issue_internal_1", sectionId: "section_internal_1" })),
    hasClientPortalPasswordSession: vi.fn(async () => true),
    readClientPortalRecipientSession: vi.fn(async () => ({
      kind: "recipient",
      recipientId: "recipient_internal_1",
      portalId: "portal_internal_1",
      role: "viewer",
      status: "active",
      verificationState: "verified",
      organization: "Client Co",
      isRequiredApprover: false,
      overrides: [],
    })),
    requiresClientPortalPassword: vi.fn(async () => false),
  };
});
vi.mock("@/lib/client-portal/activity-service", () => ({
  listClientPortalClientSafeActivity: mocks.listActivity,
  recordClientPortalAnalyticsEvent: mocks.recordAnalytics,
}));
vi.mock("@/lib/client-portal/public-rate-limits", () => ({
  checkClientPortalPublicReadRateLimit: vi.fn(async () => ({ allowed: true })),
}));
vi.mock("@/lib/client-portal/timeline-repository", () => ({
  getClientPortalSummary: vi.fn(),
  getClientPortalTimeline: vi.fn(),
}));
vi.mock("@/lib/cloudflare/d1", () => ({
  getCloudflareD1Database: vi.fn(async () => ({
    prepare: () => ({
      bind: () => ({
        all: async () => ({ results: [{ id: "activity_internal_1" }] }),
      }),
    }),
  })),
}));

import { createClientPortalPublicCursor, createClientPortalPublicIdentifier } from "@/lib/client-portal/public-identifiers";
import { clientPortalActivityResponse, clientPortalSectionResponse } from "@/lib/client-portal/public-route-handlers";

const token = "a".repeat(43);
const sectionId = createClientPortalPublicIdentifier(token, "section", "section_internal_1");

beforeEach(() => {
  vi.clearAllMocks();
  mocks.recordAnalytics.mockResolvedValue({ recorded: true });
  mocks.listActivity.mockResolvedValue({
    activities: [{ eventType: "section_viewed", id: "activity_internal_1", issueId: "issue_internal_1", occurredAt: "2026-07-27T00:00:00.000Z", title: "Section viewed" }],
    hasMore: true,
    nextCursor: "2026-07-27T00:00:00.000Z|activity_internal_1",
  });
});

describe("client portal public route identifier projection", () => {
  it("uses server-only internal metadata for analytics while returning only public section identities", async () => {
    const response = await clientPortalSectionResponse(new Request("https://example.com/api/share/token/sections/id"), token, sectionId);
    const payload = await response.json();

    expect(mocks.recordAnalytics).toHaveBeenCalledWith(expect.objectContaining({
      issueId: "issue_internal_1",
      metadata: { sectionId: "section_internal_1" },
      portalId: "portal_internal_1",
    }));
    expect(JSON.stringify(payload)).not.toContain("portal_internal_1");
    expect(JSON.stringify(payload)).not.toContain("issue_internal_1");
    expect(JSON.stringify(payload)).not.toContain("section_internal_1");
  });

  it("projects activity issue/event IDs and cursors, rejecting cross-token cursors", async () => {
    const response = await clientPortalActivityResponse(new Request("https://example.com/api/share/token/sections/id/activity"), token, sectionId);
    const payload = await response.json();

    expect(mocks.listActivity).toHaveBeenCalledWith(expect.objectContaining({ issueId: "issue_internal_1", portalId: "portal_internal_1" }));
    expect(JSON.stringify(payload)).not.toContain("activity_internal_1");
    expect(JSON.stringify(payload)).not.toContain("issue_internal_1");

    vi.clearAllMocks();
    const crossTokenCursor = createClientPortalPublicCursor("b".repeat(43), "activity", "2026-07-27T00:00:00.000Z|activity_internal_1");
    const rejected = await clientPortalActivityResponse(new Request(`https://example.com/api/share/token/sections/id/activity?cursor=${encodeURIComponent(crossTokenCursor!)}`), token, sectionId);

    expect(rejected.status).toBe(404);
    expect(mocks.listActivity).not.toHaveBeenCalled();
  });
});
