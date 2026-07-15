import { describe, expect, it } from "vitest";

import {
  MAX_PERMANENT_DELETE_DEPENDENTS,
  buildComponentPermanentDeletePreview,
  buildComponentPermanentDeleteStatements,
  componentPermanentDeleteReceiptResult,
  createComponentPermanentDeletePreviewHash,
  loadComponentPermanentDeleteImpact,
  type ComponentPermanentDeleteImpact,
  type ComponentPermanentDeleteReceiptRow,
} from "@/lib/component-library/component-permanent-delete";
import type { D1DatabaseLike } from "@/lib/cloudflare/d1";

const WORKSPACE_ID = "11111111-1111-4111-8111-111111111111";
const COMPONENT_ID = "22222222-2222-4222-8222-222222222222";
const ESTIMATE_ID = "33333333-3333-4333-8333-333333333333";
const PROJECT_ID = "44444444-4444-4444-8444-444444444444";

function createEstimateRow(index: number) {
  return {
    adjustmentPercentage: 0,
    componentId: COMPONENT_ID,
    contingencyPercentage: 0,
    description: `Row ${index}`,
    estimateId: ESTIMATE_ID,
    material: "Material",
    metadata: {},
    miscCost: 0,
    nodeId: null,
    projectId: PROJECT_ID,
    quantity: 1,
    rowId: `row-${index}`,
    rowRevision: 1,
    snapshot: { id: `row-${index}`, row_revision: 1 },
    sourceSnapshot: {},
    tabId: null,
    unit: "unit",
    unitCost: 10,
    updatedAt: "2026-07-15T00:00:00.000Z",
  };
}

function createImpact(dependentCount = 0): ComponentPermanentDeleteImpact {
  return {
    assets: [],
    attachments: [],
    components: [{
      id: COMPONENT_ID,
      lifecycleState: "available",
      name: "Component",
      snapshot: { id: COMPONENT_ID, name: "Component" },
      updatedAt: "2026-07-15T00:00:00.000Z",
      versionNumber: 3,
    }],
    estimateRows: Array.from({ length: dependentCount }, (_, index) => createEstimateRow(index)),
    priceOptions: [],
    requestedIds: [COMPONENT_ID],
    storageTargets: [],
    templateRows: [],
    workspaceId: WORKSPACE_ID,
  };
}

describe("component permanent deletion", () => {
  it("binds the preview hash to exact row revisions and snapshots", () => {
    const initial = createImpact(1);
    const changed = createImpact(1);
    changed.estimateRows[0] = {
      ...changed.estimateRows[0],
      rowRevision: 2,
      snapshot: { id: "row-0", row_revision: 2 },
    };

    expect(createComponentPermanentDeletePreviewHash(initial)).not.toBe(
      createComponentPermanentDeletePreviewHash(changed),
    );
  });

  it("allows 400 dependent rows and blocks 401 before mutation with Archive guidance", () => {
    const allowed = buildComponentPermanentDeletePreview(
      createImpact(MAX_PERMANENT_DELETE_DEPENDENTS),
    );
    const blocked = buildComponentPermanentDeletePreview(
      createImpact(MAX_PERMANENT_DELETE_DEPENDENTS + 1),
    );

    expect(allowed.ok).toBe(true);
    expect(allowed.summary.dependentRowCount).toBe(400);
    expect(blocked.ok).toBe(false);
    expect(blocked.issues).toContainEqual(expect.objectContaining({
      code: "batch_limit_exceeded",
      message: expect.stringContaining("Archive"),
      details: expect.objectContaining({ recommendedAction: "archive" }),
    }));
  });

  it("builds one bounded guarded batch with owner audit, outbox, receipt, and cleanup intent", () => {
    const impact = createImpact(1);
    impact.assets = [{
      cleanup: true,
      id: "asset-1",
      retainedByAnotherOwner: false,
      snapshot: { id: "asset-1", status: "finalized" },
      status: "finalized",
      storageBucket: "component-images",
      storagePath: `${WORKSPACE_ID}/component-images/component.webp`,
      thumbnailPath: `${WORKSPACE_ID}/component-images/component-thumb.webp`,
      updatedAt: "2026-07-15T00:00:00.000Z",
    }];
    impact.storageTargets = [
      { bucket: "component-images", path: `${WORKSPACE_ID}/component-images/component.webp` },
      { bucket: "component-images", path: `${WORKSPACE_ID}/component-images/component-thumb.webp` },
    ];
    const preview = buildComponentPermanentDeletePreview(impact);
    const statements = buildComponentPermanentDeleteStatements({
      actorUserId: "user-1",
      correlationId: "55555555-5555-4555-8555-555555555555",
      eventId: "66666666-6666-4666-8666-666666666666",
      impact,
      preview,
      previewHash: preview.previewHash ?? "",
      timestamp: "2026-07-15T00:00:00.000Z",
    });
    const sql = statements.map((statement) => statement.sql).join("\n");

    expect(statements.length).toBeLessThan(25);
    expect(sql).toContain("component_permanent_delete_component_guard");
    expect(sql).toContain("component_permanent_delete_estimate_row_guard");
    expect(sql).toContain("component_permanent_delete_asset_guard");
    expect(sql).toContain("INSERT INTO estimate_sheet_events");
    expect(sql).toContain("INSERT INTO activity_event_outbox");
    expect(sql).toContain("estimate_template_rows_permanently_deleted");
    expect(sql).toContain("INSERT INTO mass_deletion_events");
    expect(sql).toContain("'$.cleanupRequestedAt'");
    expect(sql).toContain("DELETE FROM estimate_row_items");
    expect(sql).toContain("DELETE FROM estimate_template_row_items");
    expect(sql).toContain("DELETE FROM cost_library_items");
    expect(sql).toContain("other_asset.id NOT IN (SELECT id FROM target_assets)");
    expect(statements.findIndex((statement) => statement.sql.includes("UPDATE upload_assets"))).toBeLessThan(
      statements.findIndex((statement) => statement.sql.includes("DELETE FROM cost_library_items")),
    );
  });

  it("replays only the matching actor, target ids, and preview hash", () => {
    const receipt: ComponentPermanentDeleteReceiptRow = {
      actor_user_id: "user-1",
      blocked_json: "[]",
      correlation_id: "77777777-7777-4777-8777-777777777777",
      id: "88888888-8888-4888-8888-888888888888",
      metadata_json: "{}",
      preview_hash: "preview-a",
      status: "completed",
      storage_targets_json: "[]",
      summary_json: JSON.stringify({ requestedCount: 1, eligibleCount: 1, blockedCount: 0 }),
      target_ids_json: JSON.stringify([COMPONENT_ID]),
    };

    expect(componentPermanentDeleteReceiptResult({
      actorUserId: "user-1",
      expectedPreviewHash: "preview-a",
      itemIds: [COMPONENT_ID],
      receipt,
    })).toMatchObject({ ok: true, deletedIds: [COMPONENT_ID] });
    expect(componentPermanentDeleteReceiptResult({
      actorUserId: "user-2",
      expectedPreviewHash: "preview-a",
      itemIds: [COMPONENT_ID],
      receipt,
    })).toMatchObject({
      ok: false,
      deletedIds: [],
      issues: [expect.objectContaining({ code: "stale_preview" })],
    });
  });

  it("retains a shared storage object and emits no cleanup target", async () => {
    const statements: string[] = [];
    const database = {
      prepare: (sql: string) => ({
        bind: () => ({
          all: async () => {
            statements.push(sql);
            if (sql.includes("FROM cost_library_items item")) {
              return { success: true, results: [{
                id: COMPONENT_ID,
                workspace_id: WORKSPACE_ID,
                name: "Component",
                lifecycle_state: "available",
                current_version_number: 1,
                updated_at: "2026-07-15T00:00:00.000Z",
              }] };
            }
            if (sql.includes("FROM upload_assets asset")) {
              return { success: true, results: [{
                id: "asset-1",
                retained_by_another_owner: 1,
                status: "finalized",
                storage_bucket: "component-images",
                storage_path: `${WORKSPACE_ID}/component-images/shared.webp`,
                thumbnail_path: null,
                updated_at: "2026-07-15T00:00:00.000Z",
              }] };
            }
            return { success: true, results: [] };
          },
        }),
      }),
    } as unknown as D1DatabaseLike;

    const impact = await loadComponentPermanentDeleteImpact(database, WORKSPACE_ID, [COMPONENT_ID]);

    expect(impact.assets).toEqual([
      expect.objectContaining({ cleanup: false, retainedByAnotherOwner: true }),
    ]);
    expect(impact.storageTargets).toEqual([]);
    expect(statements.join("\n")).toContain("other_asset.id NOT IN (SELECT id FROM target_assets)");
  });
});
