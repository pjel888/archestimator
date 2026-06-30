import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  buildCloudflareD1ClosedBetaProof,
  writeMarkdown,
} from "../../scripts/generate-cloudflare-d1-closed-beta-proof";

describe("Cloudflare D1 closed-beta proof", () => {
  it("proves the local closed-beta D1 slice without claiming production readiness", () => {
    const report = buildCloudflareD1ClosedBetaProof({
      generatedAt: "2026-06-30T00:00:00.000Z",
    });

    expect(report.mode).toBe("cloudflare-d1-closed-beta-proof");
    expect(report.affectedRpcNames).toEqual([
      "check_closed_beta_access",
      "read_closed_beta_allowlist_queue",
      "create_closed_beta_allowlist_entry",
      "update_closed_beta_allowlist_entry",
    ]);
    expect(report.readiness.schemaReady).toBe(true);
    expect(report.readiness.statusContractReady).toBe(true);
    expect(report.readiness.appLayerAdminGuardReady).toBe(true);
    expect(report.readiness.accessCheckReady).toBe(true);
    expect(report.readiness.queueReadReady).toBe(true);
    expect(report.readiness.createMutationReady).toBe(true);
    expect(report.readiness.updateMutationReady).toBe(true);
    expect(report.readiness.nonAdminDenied).toBe(true);
    expect(report.readiness.invalidStatusDenied).toBe(true);
    expect(report.readiness.rollbackReady).toBe(true);
    expect(report.readiness.idempotencyReady).toBe(true);
    expect(report.readiness.queryBudgetReady).toBe(true);
    expect(report.readiness.restoreFixtureReady).toBe(true);
    expect(report.readiness.localClosedBetaD1SliceReady).toBe(true);
    expect(report.readiness.productionClosedBetaD1Ready).toBe(false);
    expect(report.localOnly).toBe(true);
    expect(report.providerBacked).toBe(false);
    expect(report.fixture.invitedAccessAllowed).toBe(true);
    expect(report.fixture.activeAccessAllowed).toBe(true);
    expect(report.fixture.revokedAccessAllowed).toBe(false);
    expect(report.fixture.wrongEmailAccessAllowed).toBe(false);
    expect(report.fixture.missingEmailAccessAllowed).toBe(false);
    expect(report.fixture.adminQueueRows).toBeGreaterThanOrEqual(3);
    expect(report.fixture.nonAdminQueueRows).toBe(0);
    expect(report.fixture.createRows).toBe(1);
    expect(report.fixture.normalizedCreatedEmail).toBe("newpilot@example.test");
    expect(report.fixture.duplicateCreateRows).toBe(0);
    expect(report.fixture.nonAdminCreateRows).toBe(0);
    expect(report.fixture.invalidCreateCommandFailed).toBe(true);
    expect(report.fixture.invalidCreateRows).toBe(0);
    expect(report.fixture.adminStatusAfterUpdate).toBe("active");
    expect(report.fixture.nonAdminStatusAfterDeniedUpdate).toBe("active");
    expect(report.fixture.invalidUpdateCommandFailed).toBe(true);
    expect(report.fixture.invalidUpdateStatusAfterDenied).toBe("active");
    expect(report.fixture.rollbackCommandFailed).toBe(true);
    expect(report.fixture.rollbackResidueRows).toBe(0);
    expect(report.fixture.restoredAllowlistRows).toBeGreaterThanOrEqual(4);
    expect(report.fixture.restoredAuditRows).toBeGreaterThanOrEqual(2);
    expect(report.fixture.accessLookupPlanUsesIndex).toBe(true);
    expect(report.fixture.queuePlanUsesIndex).toBe(true);
    expect(report.fixture.updatePlanUsesPrimaryKey).toBe(true);
    expect(report.fixture.tempArtifactsRemoved).toBe(true);
    expect(report.queryProof.rows).toHaveLength(4);
    expect(report.queryProof.rows.every((row) => row.plannedQueries <= row.queryBudget)).toBe(true);
    expect(report.queryProof.rows.every((row) => row.localP95Ms <= row.localBudgetMs)).toBe(true);
    expect(report.blockers).toEqual(
      expect.arrayContaining([
        "Hosted Worker+D1 closed-beta allowlist proof is still missing.",
        "Better Auth production identity handoff is still missing; keep current Supabase-backed closed-beta gates live.",
      ]),
    );
  });

  it("writes markdown without leaking temp paths or secret-looking values", () => {
    const report = buildCloudflareD1ClosedBetaProof({
      generatedAt: "2026-06-30T00:00:00.000Z",
    });
    const dir = mkdtempSync(join(tmpdir(), "cloudflare-d1-closed-beta-"));
    try {
      const file = join(dir, "closed-beta.md");
      writeMarkdown(report, file);
      const markdown = readFileSync(file, "utf8");
      expect(markdown).toContain("Cloudflare D1 Closed-Beta Allowlist Proof");
      expect(markdown).toContain("Local Closed Beta D1 Slice Ready | yes");
      expect(markdown).toContain("Production Closed Beta D1 Ready | no");
      expect(markdown).toContain("check_closed_beta_access_email_lookup");
      expect(markdown).toContain("idx_closed_beta_allowed_emails_status_created_at");
      expect(markdown).not.toContain(tmpdir());
      expect(markdown).not.toContain("do-not-leak-this-token");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
