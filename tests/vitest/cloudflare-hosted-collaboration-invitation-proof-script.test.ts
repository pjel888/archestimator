import { describe, expect, it } from "vitest";

import { buildReport } from "../../scripts/verify-cloudflare-hosted-collaboration-invitation-proof";

function passingBody() {
  return {
    mode: "cloudflare-hosted-collaboration-invitation-proof",
    proofSurface: "/api/internal/collaboration-invitation-proof",
    readiness: {
      d1BindingPresent: true,
      resolveStateReady: true,
      revokedTerminalNulled: true,
      acceptByTokenReady: true,
      acceptByIdReady: true,
      wrongAccountDenied: true,
      replayDenied: true,
      cleanupReady: true,
      hostedCollaborationInvitationD1Ready: true,
    },
    proof: {
      activeResolve: {
        passed: true,
        state: "active",
        projectVisible: true,
      },
      revokedResolve: {
        passed: true,
        state: "revoked",
        projectVisible: false,
      },
      acceptByToken: {
        passed: true,
        state: "accepted",
        membershipRows: 1,
        acceptedAuditRows: 1,
      },
      replay: {
        passed: true,
        sameActorState: "already_member",
        otherActorState: "already_used",
        replayBlockedAuditRows: 1,
      },
      wrongAccount: {
        passed: true,
        state: "wrong_account",
        membershipRows: 0,
        wrongAccountAuditRows: 1,
      },
      acceptById: {
        passed: true,
        state: "accepted",
        replayState: "already_member",
        membershipRows: 1,
      },
    },
    cleanupAfter: {
      workspaces: 0,
      profiles: 0,
      workspaceMembers: 0,
      projects: 0,
      estimates: 0,
      projectMembers: 0,
      estimateMembers: 0,
      invitations: 0,
      tokens: 0,
      auditEvents: 0,
    },
    passed: true,
  };
}

describe("Cloudflare hosted collaboration-invitation proof verifier script", () => {
  it("marks the hosted D1 collaboration-invitation gate ready from sanitized endpoint evidence", async () => {
    const requested: { url: string; authorization: string | null }[] = [];
    const fetchImpl = async (input: string | URL | Request, init?: RequestInit) => {
      const url = typeof input === "string" || input instanceof URL ? String(input) : input.url;
      requested.push({
        url,
        authorization: new Headers(init?.headers).get("authorization"),
      });
      return Response.json(passingBody(), { status: 200 });
    };

    const report = await buildReport({
      baseUrl: "https://archestimator.example",
      secret: "cron-secret",
      secretInput: { name: "CRON_SECRET", present: true, source: "test" },
      fetchImpl,
    });

    expect(requested).toEqual([
      {
        url: "https://archestimator.example/api/internal/collaboration-invitation-proof",
        authorization: "Bearer cron-secret",
      },
    ]);
    expect(report.readiness.hostedCollaborationInvitationD1Ready).toBe(true);
    expect(report.readiness.cleanupReady).toBe(true);
    expect(report.blockers).toEqual([]);
  });

  it("keeps cleanup as a hard readiness gate", async () => {
    const body = passingBody();
    body.cleanupAfter.auditEvents = 1;
    const fetchImpl = async () => Response.json(body, { status: 200 });

    const report = await buildReport({
      baseUrl: "https://archestimator.example",
      secret: "cron-secret",
      secretInput: { name: "CRON_SECRET", present: true, source: "test" },
      fetchImpl,
    });

    expect(report.readiness.hostedCollaborationInvitationD1Ready).toBe(false);
    expect(report.blockers).toContain("Synthetic collaboration invitation proof fixture cleanup did not return to zero.");
  });

  it("reports missing secret without calling the hosted endpoint", async () => {
    let called = false;
    const fetchImpl = async () => {
      called = true;
      return Response.json(passingBody(), { status: 200 });
    };

    const report = await buildReport({
      baseUrl: "https://archestimator.example",
      secret: null,
      secretInput: { name: "CRON_SECRET", present: false, source: null },
      fetchImpl,
    });

    expect(called).toBe(false);
    expect(report.readiness.hostedCollaborationInvitationD1Ready).toBe(false);
    expect(report.blockers).toContain("CRON_SECRET is missing from process.env or configured local env files.");
  });
});
