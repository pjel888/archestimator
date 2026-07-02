import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  buildCloudflareD1CollaborationInvitationProof,
  writeMarkdown,
} from "../../scripts/generate-cloudflare-d1-collaboration-invitation-proof";

describe("Cloudflare D1 collaboration invitation proof", () => {
  it("proves the local collaboration-invitation D1 slice without claiming production readiness", () => {
    const report = buildCloudflareD1CollaborationInvitationProof({
      generatedAt: "2026-06-30T00:00:00.000Z",
    });

    expect(report.mode).toBe("cloudflare-d1-collaboration-invitation-proof");
    expect(report.affectedRpcNames).toEqual([
      "issue_collaboration_invitation_token",
      "record_collaboration_invitation_delivery",
      "resolve_collaboration_invitation",
      "accept_collaboration_invitation",
      "accept_collaboration_invitation_by_id",
      "accept_collaboration_invitation_for_actor",
      "accept_collaboration_invitation_by_id_for_actor",
    ]);
    expect(report.readiness.schemaReady).toBe(true);
    expect(report.readiness.tokenIssueReady).toBe(true);
    expect(report.readiness.deliveryAuditReady).toBe(true);
    expect(report.readiness.resolveStateReady).toBe(true);
    expect(report.readiness.resolveAuditReady).toBe(true);
    expect(report.readiness.acceptByTokenReady).toBe(true);
    expect(report.readiness.acceptByIdReady).toBe(true);
    expect(report.readiness.wrongAccountDenied).toBe(true);
    expect(report.readiness.replayDenied).toBe(true);
    expect(report.readiness.revokedTerminalNulled).toBe(true);
    expect(report.readiness.rollbackReady).toBe(true);
    expect(report.readiness.idempotencyReady).toBe(true);
    expect(report.readiness.queryBudgetReady).toBe(true);
    expect(report.readiness.restoreFixtureReady).toBe(true);
    expect(report.readiness.localCollaborationInvitationD1SliceReady).toBe(true);
    expect(report.readiness.productionCollaborationInvitationD1Ready).toBe(false);
    expect(report.localOnly).toBe(true);
    expect(report.providerBacked).toBe(false);
    expect(report.fixture.tokenIssueRows).toBe(1);
    expect(report.fixture.activeTokensAfterIssue).toBe(1);
    expect(report.fixture.revokedExistingTokenRows).toBe(1);
    expect(report.fixture.duplicateTokenRetryRows).toBe(0);
    expect(report.fixture.deliveryAuditRows).toBe(1);
    expect(report.fixture.duplicateDeliveryAuditRows).toBe(0);
    expect(report.fixture.resolveActiveState).toBe("active");
    expect(report.fixture.resolveInvalidState).toBe("invalid");
    expect(report.fixture.resolveRevokedState).toBe("revoked");
    expect(report.fixture.resolveRevokedProjectId).toBeNull();
    expect(report.fixture.resolveExpiredState).toBe("expired");
    expect(report.fixture.resolveAlreadyUsedState).toBe("already_member");
    expect(report.fixture.resolveOpenAuditRows).toBe(1);
    expect(report.fixture.activeTokenOpenedRows).toBe(1);
    expect(report.fixture.activeInvitationOpenedRows).toBe(1);
    expect(report.fixture.acceptByTokenState).toBe("accepted");
    expect(report.fixture.acceptByTokenReplayState).toBe("already_member");
    expect(report.fixture.acceptByTokenMembershipRows).toBe(1);
    expect(report.fixture.wrongAccountState).toBe("wrong_account");
    expect(report.fixture.wrongAccountMembershipRows).toBe(0);
    expect(report.fixture.wrongAccountAuditRows).toBe(1);
    expect(report.fixture.alreadyUsedDifferentUserState).toBe("already_used");
    expect(report.fixture.replayBlockedAuditRows).toBe(1);
    expect(report.fixture.acceptByIdState).toBe("accepted");
    expect(report.fixture.acceptByIdReplayState).toBe("already_member");
    expect(report.fixture.acceptByIdMembershipRows).toBe(1);
    expect(report.fixture.duplicateAcceptAuditRows).toBe(0);
    expect(report.fixture.rollbackCommandFailed).toBe(true);
    expect(report.fixture.rollbackResidueRows).toBe(0);
    expect(report.fixture.restoredInvitationRows).toBeGreaterThan(0);
    expect(report.fixture.restoredTokenRows).toBeGreaterThan(0);
    expect(report.fixture.restoredAuditRows).toBeGreaterThan(0);
    expect(report.fixture.tokenLookupPlanUsesIndex).toBe(true);
    expect(report.fixture.activeTokenPlanUsesIndex).toBe(true);
    expect(report.fixture.pendingInvitePlanUsesIndex).toBe(true);
    expect(report.fixture.membershipPlanUsesIndex).toBe(true);
    expect(report.fixture.tempArtifactsRemoved).toBe(true);
    expect(report.queryProof.rows).toHaveLength(4);
    expect(report.queryProof.rows.every((row) => row.plannedQueries <= row.queryBudget)).toBe(true);
    expect(report.queryProof.rows.every((row) => row.localP95Ms <= row.localBudgetMs)).toBe(true);
    expect(report.blockers).toEqual([]);
  });

  it("writes markdown without leaking temp paths or secret-looking values", () => {
    const report = buildCloudflareD1CollaborationInvitationProof({
      generatedAt: "2026-06-30T00:00:00.000Z",
    });
    const dir = mkdtempSync(join(tmpdir(), "cloudflare-d1-collaboration-invite-"));
    try {
      const file = join(dir, "collaboration-invite.md");
      writeMarkdown(report, file);
      const markdown = readFileSync(file, "utf8");
      expect(markdown).toContain("Cloudflare D1 Collaboration Invitation Proof");
      expect(markdown).toContain("Local collaboration-invitation D1 slice ready | yes");
      expect(markdown).toContain("Production collaboration-invitation D1 ready | no");
      expect(markdown).toContain("resolve_collaboration_invitation_token_lookup");
      expect(markdown).toContain("idx_collaboration_invitation_tokens_active_by_invitation");
      expect(markdown).not.toContain(tmpdir());
      expect(markdown).not.toContain("do-not-leak-this-token");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
