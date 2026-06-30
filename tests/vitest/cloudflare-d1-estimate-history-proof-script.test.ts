import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  buildCloudflareD1EstimateHistoryProof,
  writeMarkdown,
} from "../../scripts/generate-cloudflare-d1-estimate-history-proof";

describe("Cloudflare D1 estimate-history proof", () => {
  it("proves the local estimate-history D1 slice without claiming production readiness", () => {
    const report = buildCloudflareD1EstimateHistoryProof({
      generatedAt: "2026-06-30T00:00:00.000Z",
    });

    expect(report.mode).toBe("cloudflare-d1-estimate-history-proof");
    expect(report.affectedRpcNames).toEqual([
      "archive_estimate_tab_with_history",
      "create_ai_package_library_components_with_history",
      "create_estimate_tab_with_history",
      "create_project_estimate_package_with_history",
      "delete_estimate_tab_with_history",
      "duplicate_estimate_tab_with_history",
      "insert_estimate_subtree_into_estimate_with_history",
      "move_estimate_row_item_with_history",
      "promote_estimate_row_to_library_component",
      "rename_estimate_tab_with_history",
      "reorder_estimate_tabs_with_history",
      "update_estimate_sheet_adjustment_with_history",
    ]);
    expect(report.readiness.schemaReady).toBe(true);
    expect(report.readiness.appLayerEditorGuardReady).toBe(true);
    expect(report.readiness.estimateTabMutationReady).toBe(true);
    expect(report.readiness.subtreeInsertReady).toBe(true);
    expect(report.readiness.rowMoveReady).toBe(true);
    expect(report.readiness.sheetAdjustmentReady).toBe(true);
    expect(report.readiness.packageApplyReady).toBe(true);
    expect(report.readiness.promoteToLibraryReady).toBe(true);
    expect(report.readiness.rollbackReady).toBe(true);
    expect(report.readiness.idempotencyReady).toBe(true);
    expect(report.readiness.queryBudgetReady).toBe(true);
    expect(report.readiness.restoreFixtureReady).toBe(true);
    expect(report.readiness.localEstimateHistoryD1SliceReady).toBe(true);
    expect(report.readiness.productionEstimateHistoryD1Ready).toBe(false);
    expect(report.localOnly).toBe(true);
    expect(report.providerBacked).toBe(false);
    expect(report.fixture.viewerMutationCommandFailed).toBe(true);
    expect(report.fixture.viewerMutationResidueRows).toBe(0);
    expect(report.fixture.createTabRows).toBe(1);
    expect(report.fixture.duplicateCreateTabRows).toBe(1);
    expect(report.fixture.renamedTabName).toBe("Renamed tab");
    expect(report.fixture.archivedTabStatus).toBe("archived");
    expect(report.fixture.deletedTabRows).toBe(0);
    expect(report.fixture.duplicateTabRows).toBe(1);
    expect(report.fixture.reorderedTabRows).toBe(3);
    expect(report.fixture.duplicateReorderCommandFailed).toBe(true);
    expect(report.fixture.duplicateReorderResidueRows).toBe(0);
    expect(report.fixture.subtreeNodeRows).toBe(2);
    expect(report.fixture.subtreeRowRows).toBe(1);
    expect(report.fixture.duplicateSubtreeOperationRows).toBe(1);
    expect(report.fixture.movedRowNodeId).toBe("node-move-target");
    expect(report.fixture.movedRowHistoryRows).toBe(1);
    expect(report.fixture.sheetAdjustmentValue).toBe(7.5);
    expect(report.fixture.sheetAdjustmentHistoryRows).toBe(1);
    expect(report.fixture.projectPackageCommandRows).toBe(1);
    expect(report.fixture.libraryPackageCommandRows).toBe(1);
    expect(report.fixture.promotedLibraryComponentRows).toBe(1);
    expect(report.fixture.promotedRowLinkedRows).toBe(1);
    expect(report.fixture.rollbackCommandFailed).toBe(true);
    expect(report.fixture.rollbackResidueRows).toBe(0);
    expect(report.fixture.restoredTabRows).toBeGreaterThanOrEqual(7);
    expect(report.fixture.restoredNodeRows).toBeGreaterThanOrEqual(7);
    expect(report.fixture.restoredRowRows).toBeGreaterThanOrEqual(7);
    expect(report.fixture.restoredHistoryRows).toBeGreaterThanOrEqual(10);
    expect(report.fixture.tabListPlanUsesIndex).toBe(true);
    expect(report.fixture.eventTimelinePlanUsesIndex).toBe(true);
    expect(report.fixture.subtreePlanUsesIndex).toBe(true);
    expect(report.fixture.packageCommandPlanUsesIndex).toBe(true);
    expect(report.fixture.tempArtifactsRemoved).toBe(true);
    expect(report.queryProof.rows).toHaveLength(4);
    expect(report.queryProof.rows.every((row) => row.plannedQueries <= row.queryBudget)).toBe(true);
    expect(report.queryProof.rows.every((row) => row.localP95Ms <= row.localBudgetMs)).toBe(true);
    expect(report.blockers).toEqual(
      expect.arrayContaining([
        "Hosted Worker+D1 estimate-history proof is still missing.",
        "Better Auth production identity handoff is still missing; keep current Supabase-backed estimate actions live.",
      ]),
    );
  });

  it("writes markdown without leaking temp paths or secret-looking values", () => {
    const report = buildCloudflareD1EstimateHistoryProof({
      generatedAt: "2026-06-30T00:00:00.000Z",
    });
    const dir = mkdtempSync(join(tmpdir(), "cloudflare-d1-estimate-history-"));
    try {
      const file = join(dir, "estimate-history.md");
      writeMarkdown(report, file);
      const markdown = readFileSync(file, "utf8");
      expect(markdown).toContain("Cloudflare D1 Estimate-History Proof");
      expect(markdown).toContain("Local Estimate History D1 Slice Ready | yes");
      expect(markdown).toContain("Production Estimate History D1 Ready | no");
      expect(markdown).toContain("estimate_history_event_timeline");
      expect(markdown).toContain("idx_estimate_sheet_events_estimate_created");
      expect(markdown).not.toContain(tmpdir());
      expect(markdown).not.toContain("do-not-leak-this-token");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
