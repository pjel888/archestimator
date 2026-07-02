import { describe, expect, it } from "vitest";

import { buildReadiness, normalizeHostedCollaborationUiBaseUrl } from "../../scripts/verify-cloudflare-hosted-collaboration-ui-proof";

const cleanupZero = {
  users: 0,
  sessions: 0,
  profiles: 0,
  memberships: 0,
  closedBetaRows: 0,
  legalTermsRows: 0,
  workspaces: 0,
  projects: 0,
  projectMembers: 0,
  estimates: 0,
  estimateTabs: 0,
  estimateNodes: 0,
  estimateRows: 0,
  estimateSheetMembers: 0,
  estimateSheetAccessSettings: 0,
  estimateSheetPreferences: 0,
};

const fixture = {
  workspaceId: "11111111-1111-4111-8111-111111111111",
  projectId: "22222222-2222-4222-8222-222222222222",
  estimateId: "33333333-3333-4333-8333-333333333333",
  tabId: "44444444-4444-4444-8444-444444444444",
  rootNodeId: "55555555-5555-4555-8555-555555555555",
  areaNodeId: "66666666-6666-4666-8666-666666666666",
  rowId: "77777777-7777-4777-8777-777777777777",
  workspaceSlug: "codex-collab-ui-test",
  projectCode: "CF-COLLAB-test",
  users: [
    {
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      email: "codex-collab-ui-a@example.invalid",
      displayName: "Codex Collab Alice",
      sessionId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      sessionToken: "session-a",
      signedCookieValue: "signed-a",
      sessionExpiresAt: "2026-07-02T10:00:00.000Z",
      projectRole: "owner",
    },
    {
      id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      email: "codex-collab-ui-b@example.invalid",
      displayName: "Codex Collab Bruno",
      sessionId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
      sessionToken: "session-b",
      signedCookieValue: "signed-b",
      sessionExpiresAt: "2026-07-02T10:00:00.000Z",
      projectRole: "editor",
    },
  ],
} as const;

const passingBrowserProof = {
  projectRouteStatus: 200,
  projectRouteOk: true,
  projectHeaderAccessLinkReady: true,
  publisherAccessRouteStatus: 200,
  publisherAccessReady: true,
  rosterPanelReady: true,
  userARosterVisible: true,
  userBRosterVisible: true,
  estimateRouteAStatus: 200,
  estimateRouteBStatus: 200,
  estimateRouteAReady: true,
  estimateRouteBReady: true,
  cursorChannelA: "subscribed",
  cursorChannelB: "subscribed",
  cursorSendStatusB: "ok",
  remoteCursorVisibleOnA: true,
  remoteCursorUserIdOnA: fixture.users[1].id,
  remoteCursorLabelOnA: fixture.users[1].displayName,
  consoleErrors: [],
  pageErrors: [],
};

describe("Cloudflare hosted collaboration UI proof verifier", () => {
  it("refuses to send hosted auth cookies to an unapproved origin", () => {
    expect(() => normalizeHostedCollaborationUiBaseUrl("https://example.com", ["https://archestimator.com"]))
      .toThrow("Refusing to send hosted auth cookies");
  });

  it("marks collaboration UI ready only when roster, two-client cursor, and cleanup evidence all pass", () => {
    const readiness = buildReadiness({
      fixture,
      browserProof: passingBrowserProof,
      cleanupAfter: cleanupZero,
      error: null,
    });

    expect(readiness.hostedCollaborationUiReady).toBe(true);
    expect(readiness.productionCutoverReady).toBe(false);
  });

  it("keeps exact D1 cleanup as a hard gate", () => {
    const readiness = buildReadiness({
      fixture,
      browserProof: passingBrowserProof,
      cleanupAfter: { ...cleanupZero, projectMembers: 1 },
      error: null,
    });

    expect(readiness.hostedCollaborationUiReady).toBe(false);
    expect(readiness.exactD1CleanupReady).toBe(false);
  });
});
