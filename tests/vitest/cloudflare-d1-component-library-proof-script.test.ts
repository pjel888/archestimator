import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  buildCloudflareD1ComponentLibraryProof,
  writeMarkdown,
} from "../../scripts/generate-cloudflare-d1-component-library-proof";

describe("Cloudflare D1 component-library proof", () => {
  it("proves the local component-library D1 slice without claiming production readiness", () => {
    const report = buildCloudflareD1ComponentLibraryProof({
      generatedAt: "2026-06-30T00:00:00.000Z",
    });

    expect(report.mode).toBe("cloudflare-d1-component-library-proof");
    expect(report.affectedRpcNames).toEqual([
      "delete_library_folder",
      "execute_bulk_archive_library_components",
      "reorder_library_folders",
      "set_cost_library_component_lifecycle_state",
      "update_cost_library_component",
      "upsert_cost_library_component_price_option",
    ]);
    expect(report.readiness.schemaReady).toBe(true);
    expect(report.readiness.appLayerEditorGuardReady).toBe(true);
    expect(report.readiness.folderDeleteReady).toBe(true);
    expect(report.readiness.folderReorderReady).toBe(true);
    expect(report.readiness.bulkArchiveReady).toBe(true);
    expect(report.readiness.componentUpdateReady).toBe(true);
    expect(report.readiness.lifecycleMutationReady).toBe(true);
    expect(report.readiness.priceOptionUpsertReady).toBe(true);
    expect(report.readiness.rollbackReady).toBe(true);
    expect(report.readiness.idempotencyReady).toBe(true);
    expect(report.readiness.queryBudgetReady).toBe(true);
    expect(report.readiness.restoreFixtureReady).toBe(true);
    expect(report.readiness.localComponentLibraryD1SliceReady).toBe(true);
    expect(report.readiness.productionComponentLibraryD1Ready).toBe(false);
    expect(report.localOnly).toBe(true);
    expect(report.providerBacked).toBe(false);
    expect(report.fixture.viewerDeleteCommandFailed).toBe(true);
    expect(report.fixture.viewerDeleteResidueRows).toBe(0);
    expect(report.fixture.folderDeleteTargetRows).toBe(0);
    expect(report.fixture.childParentAfterDelete).toBeNull();
    expect(report.fixture.itemFolderAfterDelete).toBeNull();
    expect(report.fixture.reorderUpdatedRows).toBe(2);
    expect(report.fixture.duplicateReorderCommandFailed).toBe(true);
    expect(report.fixture.duplicateReorderResidueRows).toBe(0);
    expect(report.fixture.cycleReorderCommandFailed).toBe(true);
    expect(report.fixture.cycleReorderResidueRows).toBe(0);
    expect(report.fixture.componentUpdateVersionRows).toBe(1);
    expect(report.fixture.componentUpdatedName).toBe("Alpha concrete revised");
    expect(report.fixture.invalidComponentUpdateCommandFailed).toBe(true);
    expect(report.fixture.invalidComponentUpdateResidueRows).toBe(0);
    expect(report.fixture.lifecycleStateAfterChange).toBe("in_production");
    expect(report.fixture.lifecycleHistoryRows).toBe(1);
    expect(report.fixture.repeatedLifecycleHistoryRows).toBe(1);
    expect(report.fixture.priceOptionRows).toBe(1);
    expect(report.fixture.defaultPriceOptionRows).toBe(1);
    expect(report.fixture.priceHistoryRowsForOperation).toBe(1);
    expect(report.fixture.duplicatePriceHistoryRows).toBe(0);
    expect(report.fixture.bulkArchiveEventRows).toBe(1);
    expect(report.fixture.archivedComponentRows).toBe(2);
    expect(report.fixture.duplicateBulkArchiveEventRows).toBe(0);
    expect(report.fixture.stalePreviewCommandFailed).toBe(true);
    expect(report.fixture.stalePreviewResidueRows).toBe(0);
    expect(report.fixture.rollbackResidueRows).toBe(0);
    expect(report.fixture.restoredFolderRows).toBeGreaterThanOrEqual(4);
    expect(report.fixture.restoredComponentRows).toBeGreaterThanOrEqual(5);
    expect(report.fixture.restoredVersionRows).toBeGreaterThanOrEqual(6);
    expect(report.fixture.restoredPriceHistoryRows).toBeGreaterThanOrEqual(1);
    expect(report.fixture.folderTreePlanUsesIndex).toBe(true);
    expect(report.fixture.activeComponentsPlanUsesIndex).toBe(true);
    expect(report.fixture.priceOptionsPlanUsesIndex).toBe(true);
    expect(report.fixture.bulkArchivePlanUsesIndex).toBe(true);
    expect(report.fixture.tempArtifactsRemoved).toBe(true);
    expect(report.queryProof.rows).toHaveLength(4);
    expect(report.queryProof.rows.every((row) => row.plannedQueries <= row.queryBudget)).toBe(true);
    expect(report.queryProof.rows.every((row) => row.localP95Ms <= row.localBudgetMs)).toBe(true);
    expect(report.blockers).toEqual(
      expect.arrayContaining([
        "Hosted Worker+D1 component-library proof is still missing.",
        "Better Auth production identity handoff is still missing; keep current Supabase-backed component-library actions live.",
      ]),
    );
  });

  it("writes markdown without leaking temp paths or secret-looking values", () => {
    const report = buildCloudflareD1ComponentLibraryProof({
      generatedAt: "2026-06-30T00:00:00.000Z",
    });
    const dir = mkdtempSync(join(tmpdir(), "cloudflare-d1-component-library-"));
    try {
      const file = join(dir, "component-library.md");
      writeMarkdown(report, file);
      const markdown = readFileSync(file, "utf8");
      expect(markdown).toContain("Cloudflare D1 Component-Library Proof");
      expect(markdown).toContain("Local Component Library D1 Slice Ready | yes");
      expect(markdown).toContain("Production Component Library D1 Ready | no");
      expect(markdown).toContain("component_library_folder_tree");
      expect(markdown).toContain("idx_cost_library_items_workspace_lifecycle");
      expect(markdown).not.toContain(tmpdir());
      expect(markdown).not.toContain("do-not-leak-this-token");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
