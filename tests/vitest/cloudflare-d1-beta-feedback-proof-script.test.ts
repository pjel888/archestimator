import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  buildCloudflareD1BetaFeedbackProof,
  writeMarkdown,
} from "../../scripts/generate-cloudflare-d1-beta-feedback-proof";

describe("Cloudflare D1 beta feedback proof", () => {
  it("proves the local beta-feedback D1 slice without claiming production readiness", () => {
    const report = buildCloudflareD1BetaFeedbackProof({
      generatedAt: "2026-06-30T00:00:00.000Z",
    });

    expect(report.mode).toBe("cloudflare-d1-beta-feedback-proof");
    expect(report.readiness.schemaReady).toBe(true);
    expect(report.readiness.enumParityReady).toBe(true);
    expect(report.readiness.appLayerAuthzReady).toBe(true);
    expect(report.readiness.submissionMutationReady).toBe(true);
    expect(report.readiness.forgedContextDenied).toBe(true);
    expect(report.readiness.adminReviewReady).toBe(true);
    expect(report.readiness.adminStatusUpdateReady).toBe(true);
    expect(report.readiness.nonAdminReviewDenied).toBe(true);
    expect(report.readiness.rollbackReady).toBe(true);
    expect(report.readiness.idempotencyReady).toBe(true);
    expect(report.readiness.queryBudgetReady).toBe(true);
    expect(report.readiness.restoreFixtureReady).toBe(true);
    expect(report.readiness.localBetaFeedbackD1SliceReady).toBe(true);
    expect(report.readiness.productionBetaFeedbackD1Ready).toBe(false);
    expect(report.localOnly).toBe(true);
    expect(report.providerBacked).toBe(false);
    expect(report.fixture.authorizedSubmissionRows).toBe(1);
    expect(report.fixture.forgedWorkspaceRows).toBe(0);
    expect(report.fixture.mismatchedProjectRows).toBe(0);
    expect(report.fixture.adminQueueRows).toBe(1);
    expect(report.fixture.nonAdminQueueRows).toBe(0);
    expect(report.fixture.nonAdminStatusAfterDeniedUpdate).toBe("new");
    expect(report.fixture.adminStatusAfterUpdate).toBe("reviewing");
    expect(report.fixture.statusAuditRows).toBe(1);
    expect(report.fixture.duplicateStatusAuditRows).toBe(0);
    expect(report.fixture.rollbackCommandFailed).toBe(true);
    expect(report.fixture.rollbackResidueRows).toBe(0);
    expect(report.fixture.restoredFeedbackRows).toBe(report.fixture.feedbackRows);
    expect(report.fixture.restoredStatusAuditRows).toBe(report.fixture.statusAuditRows);
    expect(report.fixture.reviewQueuePlanUsesIndex).toBe(true);
    expect(report.fixture.tempArtifactsRemoved).toBe(true);
    expect(report.queryProof.rows).toHaveLength(3);
    expect(report.queryProof.rows.every((row) => row.plannedQueries <= row.queryBudget)).toBe(true);
    expect(report.queryProof.rows.every((row) => row.localP95Ms <= row.localBudgetMs)).toBe(true);
    expect(report.blockers).toEqual(
      expect.arrayContaining([
        "Hosted Worker+D1 beta-feedback proof is still missing.",
        "Better Auth production identity handoff is still missing; keep current Supabase-backed Server Actions live.",
      ]),
    );
  });

  it("writes markdown without leaking temp paths or secret-looking values", () => {
    const report = buildCloudflareD1BetaFeedbackProof({
      generatedAt: "2026-06-30T00:00:00.000Z",
    });
    const dir = mkdtempSync(join(tmpdir(), "cloudflare-d1-beta-feedback-"));
    try {
      const file = join(dir, "beta-feedback.md");
      writeMarkdown(report, file);
      const markdown = readFileSync(file, "utf8");
      expect(markdown).toContain("Cloudflare D1 Beta Feedback Proof");
      expect(markdown).toContain("Local beta-feedback D1 slice ready | yes");
      expect(markdown).toContain("Production beta-feedback D1 ready | no");
      expect(markdown).toContain("submit_beta_feedback_authz");
      expect(markdown).toContain("idx_beta_feedback_status_created_at");
      expect(markdown).not.toContain(tmpdir());
      expect(markdown).not.toContain("do-not-leak-this-token");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
