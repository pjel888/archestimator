import { beforeEach, describe, expect, it, vi } from "vitest";

const PROJECT_ID = "22222222-2222-4222-8222-222222222222";
const ESTIMATE_ID = "33333333-3333-4333-8333-333333333333";

const ROW_ID = "44444444-4444-4444-8444-444444444444";
const NODE_ID = "55555555-5555-4555-8555-555555555555";
const TARGET_NODE_ID = "77777777-7777-4777-8777-777777777777";
const SECOND_ROW_ID = "88888888-8888-4888-8888-888888888888";
const UPLOAD_ASSET_ID = "99999999-aaaa-4aaa-8aaa-999999999999";
const UPLOAD_SESSION_ID = "99999999-bbbb-4bbb-8bbb-999999999999";
const ACTIVE_TAB_ID = "99999999-9999-4999-8999-999999999999";
const MUTATION_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const EVENT_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

const libraryItem = {
  id: "66666666-6666-4666-8666-666666666666",
  material: "Express component",
  description: "Express description",
  supplier: "Supplier",
  source: "library",
  unit: "unit",
  itemCost: 125,
  quantity: 1,
  subTotal: 125,
  miscCost: 0,
  totalItemCosts: 125,
  category: "Express",
  pricingSource: "Test",
  pricingDate: "2026-06-15",
  updatedAt: "2026-07-13T10:00:00.000Z",
} as const;

function canonicalRow(overrides: Record<string, unknown> = {}) {
  return {
    rowId: ROW_ID,
    row: {
      id: ROW_ID,
      nodeId: NODE_ID,
      material: "Express component",
      description: "Express description",
      supplier: "Supplier",
      unit: "unit",
      quantity: 2,
      unitCost: 125,
      contingencyPercentage: 0,
      contingencyValue: 0,
      miscCost: 0,
      sourceSnapshot: { sourceType: "express_component" },
      metadata: { scopeStatus: "included" },
      linkState: "linked-overridden",
      rowRevision: 2,
      ...overrides,
    },
  };
}

function authoritativeEstimateRow(overrides: Record<string, unknown> = {}) {
  return {
    id: ROW_ID,
    estimate_id: ESTIMATE_ID,
    node_id: NODE_ID,
    material: "Express component",
    description: "Express description",
    designation: null,
    discipline: null,
    supplier: "Supplier",
    supplier_id: null,
    quantity: 1,
    quantity_base: null,
    quantity_contingency_amount: null,
    unit: "unit",
    unit_cost: 125,
    misc_cost: 0,
    contingency_percentage: 0,
    adjustment_percentage: 0,
    source_snapshot: null,
    sort_order: 0,
    row_revision: 1,
    category_node_id: null,
    source_library_item_id: null,
    link_state: "unlinked",
    metadata: {},
    pricing_provenance_origin: null,
    ...overrides,
  };
}

function canonicalImageAssetDescriptor(overrides: Record<string, unknown> = {}) {
  return {
    kind: "upload-asset",
    schemaVersion: 1,
    assetId: UPLOAD_ASSET_ID,
    uploadSessionId: UPLOAD_SESSION_ID,
    bucket: "project-images",
    path: `workspace-1/11111111-1111-4111-8111-111111111111/project-images/${PROJECT_ID}/estimate-row-images/${ESTIMATE_ID}/reference.webp`,
    thumbnailPath: `workspace-1/11111111-1111-4111-8111-111111111111/project-images/${PROJECT_ID}/estimate-row-images/${ESTIMATE_ID}/reference-thumb.webp`,
    fileName: "reference.png",
    contentType: "image/webp",
    sizeBytes: 128,
    scanStatus: "not_required",
    width: 640,
    height: 480,
    ...overrides,
  };
}

function uploadedEstimateRowImageUrl(path: string) {
  return `/api/projects/images?path=${encodeURIComponent(path)}`;
}

const requireAuth = vi.hoisted(() => vi.fn());
const requireCurrentUserContext = vi.hoisted(() => vi.fn());
const requireEstimateD1Database = vi.hoisted(() => vi.fn());
const firstD1Row = vi.hoisted(() => vi.fn());
const getEstimateRowForProject = vi.hoisted(() => vi.fn());
const insertEstimateRowItemWithHistoryIntent = vi.hoisted(() => vi.fn());
const duplicateEstimateRowItemWithHistoryIntent = vi.hoisted(() => vi.fn());
const updateEstimateRowItemWithHistoryIntent = vi.hoisted(() => vi.fn());
const replaceEstimateRowItemWithHistoryIntent = vi.hoisted(() => vi.fn());
const deleteEstimateRowItemWithHistoryIntent = vi.hoisted(() => vi.fn());
const deleteEstimateRowItemsBulkWithHistoryIntent = vi.hoisted(() => vi.fn());
const moveEstimateRowItemWithHistoryIntent = vi.hoisted(() => vi.fn());
const moveEstimateRowComponentWithHistoryIntent = vi.hoisted(() => vi.fn());
const restoreDeletedEstimateRowsWithHistoryIntent = vi.hoisted(() => vi.fn());
const previewEstimateComponentEditImpact = vi.hoisted(() => vi.fn());
const canEditEstimate = vi.hoisted(() => vi.fn());
const canEditProject = vi.hoisted(() => vi.fn());
const validateEstimateRowImageAsset = vi.hoisted(() => vi.fn());
const clearEstimateRouteContextProcessCache = vi.hoisted(() => vi.fn());
const getCurrentWorkspaceProject = vi.hoisted(() => vi.fn());
const getCurrentWorkspaceProjectForEstimate = vi.hoisted(() => vi.fn());
const getProjectEstimateTreeByEstimate = vi.hoisted(() => vi.fn());
const canEditEstimateInD1 = vi.hoisted(() => vi.fn());
const canEditProjectInD1 = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/session", () => ({
  requireAuth,
  requireCurrentUserContext,
  getCurrentUserContext: requireCurrentUserContext,
}));
vi.mock("@/lib/estimates/d1-intents/database", () => ({
  requireEstimateD1Database,
  firstD1Row,
}));
vi.mock("@/lib/estimates/d1-intents/rows", () => ({
  deleteEstimateRowItemWithHistory: deleteEstimateRowItemWithHistoryIntent,
  deleteEstimateRowItemsBulkWithHistory: deleteEstimateRowItemsBulkWithHistoryIntent,
  duplicateEstimateRowItemWithHistory: duplicateEstimateRowItemWithHistoryIntent,
  getEstimateRowForProject,
  insertEstimateRowItemWithHistory: insertEstimateRowItemWithHistoryIntent,
  moveEstimateRowComponentWithHistory: moveEstimateRowComponentWithHistoryIntent,
  moveEstimateRowItemWithHistory: moveEstimateRowItemWithHistoryIntent,
  replaceEstimateRowItemWithHistory: replaceEstimateRowItemWithHistoryIntent,
  restoreDeletedEstimateRowsWithHistory: restoreDeletedEstimateRowsWithHistoryIntent,
  updateEstimateRowItemWithHistory: updateEstimateRowItemWithHistoryIntent,
}));
vi.mock("@/lib/estimates/d1-intents/access", () => ({
  canEditEstimate,
  canEditProject,
  getEstimateActivityRetentionMetrics: vi.fn(),
  validateEstimateRowImageAsset,
}));
vi.mock("@/lib/estimates/d1-intents/component-impact", () => ({
  previewEstimateComponentEditImpact,
}));
vi.mock("@/lib/authz/d1-access", () => ({
  canEditEstimateInD1,
  canEditEstimateStrictInD1: canEditEstimateInD1,
  canEditProjectInD1,
  canEditProjectStrictInD1: canEditProjectInD1,
}));
vi.mock("@/lib/repositories/workspace-repository", () => ({
  clearEstimateRouteContextProcessCache,
  getCurrentWorkspaceProject,
  getEstimateTabs: vi.fn(async () => []),
  getEstimateTabTree: vi.fn(async () => []),
  getCurrentWorkspaceProjectForEstimate,
  getProjectEstimateTreeByEstimate,
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import {
  archiveEstimateTab,
  createEstimateTab,
  createEstimateSheetDraft,
  createEstimateNode,
  deleteEstimateNode,
  deleteEstimateNodesBulk,
  deleteEstimateRowItem,
  deleteEstimateRowItemsBulk,
  deleteEstimateTab,
  duplicateEstimateSheet,
  duplicateEstimateTab,
  fetchEstimateEditCapability,
  getEstimateComponentEditImpact,
  insertEstimateRowItemFromLibrary,
  moveEstimateRowComponentWithHistory,
  moveEstimateRowItemWithHistory,
  regenerateEstimateSheetCode,
  renameEstimateTab,
  replaceEstimateRowItemWithLibrary,
  renameEstimateNode,
  reorderEstimateTabs,
  reorderEstimateTreeNodes,
  restoreDeletedEstimateRows,
  updateEstimateDetails,
  updateEstimateRowItem,
} from "@/lib/estimates/actions";

const database = { prepare: vi.fn(), batch: vi.fn() };

describe("estimate sheet actions edit authorization (F15 / P3-3)", () => {
  beforeEach(() => {
    database.prepare.mockReset();
    database.batch.mockReset();
    requireEstimateD1Database.mockReset();
    firstD1Row.mockReset();
    getEstimateRowForProject.mockReset();
    insertEstimateRowItemWithHistoryIntent.mockReset();
    duplicateEstimateRowItemWithHistoryIntent.mockReset();
    updateEstimateRowItemWithHistoryIntent.mockReset();
    replaceEstimateRowItemWithHistoryIntent.mockReset();
    deleteEstimateRowItemWithHistoryIntent.mockReset();
    deleteEstimateRowItemsBulkWithHistoryIntent.mockReset();
    moveEstimateRowItemWithHistoryIntent.mockReset();
    moveEstimateRowComponentWithHistoryIntent.mockReset();
    restoreDeletedEstimateRowsWithHistoryIntent.mockReset();
    previewEstimateComponentEditImpact.mockReset();
    canEditEstimate.mockReset();
    canEditProject.mockReset();
    validateEstimateRowImageAsset.mockReset();
    clearEstimateRouteContextProcessCache.mockReset();
    getCurrentWorkspaceProject.mockReset();
    getCurrentWorkspaceProjectForEstimate.mockReset();
    getProjectEstimateTreeByEstimate.mockReset();
    canEditEstimateInD1.mockReset();
    canEditProjectInD1.mockReset();
    requireAuth.mockResolvedValue(undefined);
    requireCurrentUserContext.mockResolvedValue({
      userId: "11111111-1111-4111-8111-111111111111",
      email: "viewer@example.com",
      profile: { id: "11111111-1111-4111-8111-111111111111", default_workspace_id: "ws-1", role: "viewer" },
    });
    getCurrentWorkspaceProject.mockResolvedValue({
      workspace: { id: "ws-1", name: "WS", createdBy: "u1" },
      project: { id: PROJECT_ID, workspaceId: "ws-1", name: "Proj", currencyCode: "PHP", metadata: {} },
    });
    getCurrentWorkspaceProjectForEstimate.mockResolvedValue({
      workspace: { id: "ws-1", name: "WS", createdBy: "u1" },
      project: { id: PROJECT_ID, workspaceId: "ws-1", name: "Proj", currencyCode: "PHP", metadata: {} },
    });
    getProjectEstimateTreeByEstimate.mockResolvedValue({
      project: { id: PROJECT_ID },
      estimate: { id: ESTIMATE_ID },
      tree: [{ id: NODE_ID, children: [] }],
    });
    firstD1Row.mockImplementation(async (_database: unknown, sql: string) => {
      if (sql.includes("FROM estimates WHERE id = ? AND project_id = ?")) {
        return {
          id: ESTIMATE_ID,
          project_id: PROJECT_ID,
          name: "Estimate",
          currency_code: "PHP",
          created_by: "11111111-1111-4111-8111-111111111111",
          created_at: "2026-07-16T00:00:00.000Z",
          updated_at: "2026-07-16T00:00:00.000Z",
          metadata: {},
          sheet_code: "ES-001",
          notes: null,
          project_budget: null,
        };
      }
      if (sql.includes("FROM estimate_nodes node")) {
        return {
          id: NODE_ID,
          estimate_id: ESTIMATE_ID,
          estimate_tab_id: ACTIVE_TAB_ID,
          parent_id: null,
          kind: "area",
          name: "Area",
          sort_order: 0,
          metadata_json: {},
          created_at: "2026-07-16T00:00:00.000Z",
          updated_at: "2026-07-16T00:00:00.000Z",
        };
      }
      return null;
    });
    requireEstimateD1Database.mockResolvedValue(database);
    getEstimateRowForProject.mockResolvedValue(null);
    insertEstimateRowItemWithHistoryIntent.mockRejectedValue(new Error("Estimate edit access denied."));
    duplicateEstimateRowItemWithHistoryIntent.mockRejectedValue(new Error("Estimate edit access denied."));
    updateEstimateRowItemWithHistoryIntent.mockRejectedValue(new Error("Estimate edit access denied."));
    replaceEstimateRowItemWithHistoryIntent.mockRejectedValue(new Error("Estimate edit access denied."));
    deleteEstimateRowItemWithHistoryIntent.mockRejectedValue(new Error("Estimate edit access denied."));
    deleteEstimateRowItemsBulkWithHistoryIntent.mockRejectedValue(new Error("Estimate edit access denied."));
    moveEstimateRowItemWithHistoryIntent.mockRejectedValue(new Error("Estimate edit access denied."));
    moveEstimateRowComponentWithHistoryIntent.mockRejectedValue(new Error("Estimate edit access denied."));
    restoreDeletedEstimateRowsWithHistoryIntent.mockRejectedValue(new Error("Estimate edit access denied."));
    canEditEstimate.mockResolvedValue(false);
    canEditProject.mockResolvedValue(false);
    canEditEstimateInD1.mockResolvedValue(false);
    canEditProjectInD1.mockResolvedValue(false);
    validateEstimateRowImageAsset.mockResolvedValue(null);
  });

  function assertNoWrite() {
    expect(database.batch).not.toHaveBeenCalled();
  }

  it("createEstimateSheetDraft denies a viewer with a clean error before any write", async () => {
    await expect(createEstimateSheetDraft(PROJECT_ID)).rejects.toThrow(/edit access denied/i);
    expect(canEditProject).toHaveBeenCalledWith(database, expect.objectContaining({ userId: expect.any(String) }), PROJECT_ID);
    assertNoWrite();
  });

  it("duplicateEstimateSheet denies a viewer before copying the source", async () => {
    await expect(duplicateEstimateSheet({ projectId: PROJECT_ID, estimateId: ESTIMATE_ID })).rejects.toThrow(/edit access denied/i);
    expect(canEditEstimate).toHaveBeenCalledWith(database, expect.objectContaining({ userId: expect.any(String) }), ESTIMATE_ID);
    assertNoWrite();
  });

  it("fetchEstimateEditCapability adapts a typed access failure to false", async () => {
    const authError = new Error("estimate auth probe failed");
    canEditEstimate.mockRejectedValueOnce(authError);

    await expect(fetchEstimateEditCapability({
      projectId: PROJECT_ID,
      estimateId: ESTIMATE_ID,
    })).resolves.toBe(false);

    expect(canEditEstimate).toHaveBeenCalledWith(
      database,
      expect.objectContaining({ userId: expect.any(String) }),
      ESTIMATE_ID,
    );
    assertNoWrite();
  });

  it("updateEstimateDetails denies a viewer before the typed history intent writes", async () => {
    await expect(
      updateEstimateDetails({ projectId: PROJECT_ID, estimateId: ESTIMATE_ID, name: "New" }),
    ).rejects.toThrow(/edit access denied/i);
    expect(canEditEstimate).toHaveBeenCalledWith(database, expect.objectContaining({ userId: expect.any(String) }), ESTIMATE_ID);
    assertNoWrite();
  });

  it("regenerateEstimateSheetCode denies a viewer before the typed history intent writes", async () => {
    await expect(
      regenerateEstimateSheetCode({ projectId: PROJECT_ID, estimateId: ESTIMATE_ID }),
    ).rejects.toThrow(/edit access denied/i);
    expect(canEditEstimate).toHaveBeenCalledWith(database, expect.objectContaining({ userId: expect.any(String) }), ESTIMATE_ID);
    assertNoWrite();
  });

  it("row actions deny a viewer before every typed row and component-impact intent", async () => {
    getEstimateRowForProject.mockResolvedValue(authoritativeEstimateRow());
    await expect(insertEstimateRowItemFromLibrary({ projectId: PROJECT_ID, estimateId: ESTIMATE_ID, targetNodeId: NODE_ID, rowId: ROW_ID, libraryItem })).rejects.toThrow(/edit access denied/i);
    await expect(updateEstimateRowItem({ projectId: PROJECT_ID, estimateId: ESTIMATE_ID, rowId: ROW_ID, quantity: 2 })).rejects.toThrow(/edit access denied/i);
    await expect(replaceEstimateRowItemWithLibrary({ projectId: PROJECT_ID, estimateId: ESTIMATE_ID, rowId: ROW_ID, libraryItem })).rejects.toThrow(/edit access denied/i);
    await expect(deleteEstimateRowItem({ projectId: PROJECT_ID, estimateId: ESTIMATE_ID, rowId: ROW_ID })).rejects.toThrow(/edit access denied/i);
    await expect(moveEstimateRowComponentWithHistory({
      projectId: PROJECT_ID,
      estimateId: ESTIMATE_ID,
      sourceRowId: ROW_ID,
      targetRowId: "77777777-7777-4777-8777-777777777777",
      sourceLibraryItem: libraryItem,
      targetLibraryItem: libraryItem,
    })).rejects.toThrow(/edit access denied/i);
    await expect(moveEstimateRowItemWithHistory({
      projectId: PROJECT_ID,
      estimateId: ESTIMATE_ID,
      activeTabId: ACTIVE_TAB_ID,
      movedRowId: ROW_ID,
      sourceNodeId: NODE_ID,
      targetNodeId: TARGET_NODE_ID,
      updates: [{ rowId: ROW_ID, nodeId: TARGET_NODE_ID, sortOrder: 0, expectedRowRevision: 2 }],
    })).rejects.toThrow(/edit access denied/i);
    await expect(deleteEstimateRowItemsBulk({
      projectId: PROJECT_ID,
      estimateId: ESTIMATE_ID,
      rowIds: [ROW_ID],
      expectedRowRevisions: { [ROW_ID]: 1 },
    })).rejects.toThrow(/edit access denied/i);
    await expect(restoreDeletedEstimateRows({
      projectId: PROJECT_ID,
      estimateId: ESTIMATE_ID,
      sourceEventId: EVENT_ID,
      rowIds: [ROW_ID],
    })).rejects.toThrow(/edit access denied/i);
    await expect(getEstimateComponentEditImpact({
      projectId: PROJECT_ID,
      estimateId: ESTIMATE_ID,
      rowId: ROW_ID,
    })).rejects.toThrow(/edit access denied/i);

    expect(canEditEstimate).toHaveBeenCalledWith(database, expect.objectContaining({ userId: expect.any(String) }), ESTIMATE_ID);
    expect(insertEstimateRowItemWithHistoryIntent).not.toHaveBeenCalled();
    expect(updateEstimateRowItemWithHistoryIntent).not.toHaveBeenCalled();
    expect(replaceEstimateRowItemWithHistoryIntent).not.toHaveBeenCalled();
    expect(deleteEstimateRowItemWithHistoryIntent).not.toHaveBeenCalled();
    expect(moveEstimateRowComponentWithHistoryIntent).not.toHaveBeenCalled();
    expect(moveEstimateRowItemWithHistoryIntent).not.toHaveBeenCalled();
    expect(deleteEstimateRowItemsBulkWithHistoryIntent).not.toHaveBeenCalled();
    expect(restoreDeletedEstimateRowsWithHistoryIntent).not.toHaveBeenCalled();
    expect(previewEstimateComponentEditImpact).not.toHaveBeenCalled();
  });

  it("tree mutation actions deny a viewer before tree writes", async () => {
    const createFormData = new FormData();
    createFormData.set("name", "New Area");
    createFormData.set("kind", "area");

    await expect(createEstimateNode(PROJECT_ID, ESTIMATE_ID, createFormData)).rejects.toThrow(/edit access denied/i);
    await expect(renameEstimateNode(PROJECT_ID, ESTIMATE_ID, NODE_ID, "Renamed Area")).rejects.toThrow(/edit access denied/i);
    await expect(deleteEstimateNode(PROJECT_ID, ESTIMATE_ID, NODE_ID)).rejects.toThrow(/edit access denied/i);
    await expect(deleteEstimateNodesBulk(PROJECT_ID, ESTIMATE_ID, [NODE_ID])).rejects.toThrow(/edit access denied/i);
    await expect(
      reorderEstimateTreeNodes(PROJECT_ID, ESTIMATE_ID, {
        updates: [{ id: NODE_ID, parentId: null, sortOrder: 10 }],
      }),
    ).rejects.toThrow(/edit access denied/i);

    expect(canEditEstimateInD1).toHaveBeenCalledWith(database, ESTIMATE_ID, expect.objectContaining({ userId: expect.any(String) }));
    assertNoWrite();
  });

  it("tab mutation actions deny a viewer before typed history writes", async () => {
    await expect(createEstimateTab({ projectId: PROJECT_ID, estimateId: ESTIMATE_ID, name: "Page 002" })).rejects.toThrow(/edit access denied/i);
    await expect(renameEstimateTab({ projectId: PROJECT_ID, estimateId: ESTIMATE_ID, tabId: ACTIVE_TAB_ID, name: "Renamed Page" })).rejects.toThrow(/edit access denied/i);
    await expect(reorderEstimateTabs({
      projectId: PROJECT_ID,
      estimateId: ESTIMATE_ID,
      updates: [{ id: ACTIVE_TAB_ID, sortOrder: 2 }],
    })).rejects.toThrow(/edit access denied/i);
    await expect(duplicateEstimateTab({ projectId: PROJECT_ID, estimateId: ESTIMATE_ID, tabId: ACTIVE_TAB_ID })).rejects.toThrow(/edit access denied/i);
    await expect(archiveEstimateTab({ projectId: PROJECT_ID, estimateId: ESTIMATE_ID, tabId: ACTIVE_TAB_ID })).rejects.toThrow(/edit access denied/i);
    await expect(deleteEstimateTab({ projectId: PROJECT_ID, estimateId: ESTIMATE_ID, tabId: ACTIVE_TAB_ID })).rejects.toThrow(/edit access denied/i);

    expect(canEditEstimateInD1).toHaveBeenCalledWith(database, ESTIMATE_ID, expect.objectContaining({ userId: expect.any(String) }));
    assertNoWrite();
  });

  it("updateEstimateRowItem omits sourceSnapshot and metadata for routine edits", async () => {
    canEditEstimate.mockResolvedValue(true);
    getEstimateRowForProject.mockResolvedValue(authoritativeEstimateRow({
      source_library_item_id: "66666666-6666-4666-8666-666666666666",
      link_state: "linked-clean",
    }));
    updateEstimateRowItemWithHistoryIntent.mockResolvedValue(canonicalRow());

    const result = await updateEstimateRowItem({ projectId: PROJECT_ID, estimateId: ESTIMATE_ID, rowId: ROW_ID, quantity: 2 });
    const updateCall = updateEstimateRowItemWithHistoryIntent.mock.calls[0]?.[2] as {
      projectId: string;
      estimateId: string;
      rowId: string;
      rowPatch: Record<string, unknown>;
    } | undefined;

    expect(result).toMatchObject({ rowId: ROW_ID, material: "Express component", itemCost: 125, rowRevision: 2 });
    expect(updateCall).toMatchObject({
      projectId: PROJECT_ID,
      estimateId: ESTIMATE_ID,
      rowId: ROW_ID,
      rowPatch: { quantity: 2, linkState: "linked-overridden" },
    });
    expect(updateCall?.rowPatch).not.toHaveProperty("sourceSnapshot");
    expect(updateCall?.rowPatch).not.toHaveProperty("metadata");
  });


  it("updateEstimateRowItem merges source snapshot patches before writing JSON", async () => {
    canEditEstimate.mockResolvedValue(true);
    getEstimateRowForProject.mockResolvedValue(authoritativeEstimateRow({
      source_snapshot: { category: "Cabinetry", sourceUrl: "https://example.com/original" },
      metadata: { expressComponent: { kind: "express", schemaVersion: 1, id: "express-row-1" } },
      row_revision: 4,
    }));
    updateEstimateRowItemWithHistoryIntent.mockResolvedValue(canonicalRow({ sourceSnapshot: { category: "Cabinetry", sourceUrl: "https://example.com/original", imageUrl: "/component-thumbnails/reference.webp" } }));

    await updateEstimateRowItem({
      projectId: PROJECT_ID,
      estimateId: ESTIMATE_ID,
      rowId: ROW_ID,
      sourceSnapshot: { imageUrl: "/component-thumbnails/reference.webp" },
    });
    const updateCall = updateEstimateRowItemWithHistoryIntent.mock.calls[0]?.[2] as { rowPatch: Record<string, unknown> } | undefined;

    expect(updateCall?.rowPatch.sourceSnapshot).toEqual({
      category: "Cabinetry",
      sourceUrl: "https://example.com/original",
      imageUrl: "/component-thumbnails/reference.webp",
    });
  });

  it("updateEstimateRowItem strips unsafe source snapshot patch fields before writing JSON", async () => {
    canEditEstimate.mockResolvedValue(true);
    getEstimateRowForProject.mockResolvedValue(authoritativeEstimateRow({
      source_snapshot: {
        category: "Cabinetry",
        sourceUrl: "https://example.com/original",
        signedUrl: "https://storage.example/signed-token",
        storagePath: "workspace/private/path.webp",
        tags: ["built-in", "\u0000bad"],
        componentVersionNumber: 3,
      },
      metadata: { expressComponent: { kind: "express", schemaVersion: 1, id: "express-row-1" } },
      row_revision: 4,
    }));
    updateEstimateRowItemWithHistoryIntent.mockResolvedValue(canonicalRow());

    await updateEstimateRowItem({
      projectId: PROJECT_ID,
      estimateId: ESTIMATE_ID,
      rowId: ROW_ID,
      sourceSnapshot: {
        imageUrl: "https://tracker.example/pixel.svg?viewer=1",
        sourceUrl: "javascript:alert(1)",
        signedUrl: "https://evil.example/signed-token",
        storagePath: "workspace/private/other.webp",
        path: "provider/private/path.webp",
        pricingSource: "x".repeat(2050),
        unexpectedPrivateKey: "secret",
      },
    });
    const updateCall = updateEstimateRowItemWithHistoryIntent.mock.calls[0]?.[2] as { rowPatch: Record<string, unknown> } | undefined;

    expect(updateCall?.rowPatch.sourceSnapshot).toEqual({
      category: "Cabinetry",
      sourceUrl: null,
      tags: ["built-in"],
      componentVersionNumber: 3,
      imageUrl: null,
    });
  });

  it("updateEstimateRowItem drops tainted existing image asset descriptors before re-saving source snapshots", async () => {
    canEditEstimate.mockResolvedValue(true);
    const taintedDescriptor = canonicalImageAssetDescriptor({ path: "workspace-evil/user-evil/tampered.webp" });
    getEstimateRowForProject.mockResolvedValue(authoritativeEstimateRow({
      source_snapshot: {
        category: "Cabinetry",
        imageAsset: taintedDescriptor,
      },
      metadata: { expressComponent: { kind: "express", schemaVersion: 1, id: "express-row-1" } },
      row_revision: 4,
    }));
    updateEstimateRowItemWithHistoryIntent.mockResolvedValue(canonicalRow());

    await updateEstimateRowItem({
      projectId: PROJECT_ID,
      estimateId: ESTIMATE_ID,
      rowId: ROW_ID,
      sourceSnapshot: { sourceUrl: "https://example.com/reference" },
    });

    expect(validateEstimateRowImageAsset).toHaveBeenCalledWith(database, {
      assetId: UPLOAD_ASSET_ID,
      uploadSessionId: UPLOAD_SESSION_ID,
      projectId: PROJECT_ID,
      estimateId: ESTIMATE_ID,
      rowId: ROW_ID,
    });
    const updateCall = updateEstimateRowItemWithHistoryIntent.mock.calls[0]?.[2] as { rowPatch: Record<string, unknown> } | undefined;
    expect(updateCall?.rowPatch.sourceSnapshot).toEqual({
      category: "Cabinetry",
      sourceUrl: "https://example.com/reference",
    });
  });

  it("updateEstimateRowItem canonicalizes uploaded reference image asset descriptors before writing source snapshots", async () => {
    canEditEstimate.mockResolvedValue(true);
    const canonicalDescriptor = canonicalImageAssetDescriptor({
      path: `11111111-1111-4111-8111-111111111111/11111111-1111-4111-8111-111111111111/project-images/${PROJECT_ID}/estimate-row-images/${ESTIMATE_ID}/reference.webp`,
      thumbnailPath: `11111111-1111-4111-8111-111111111111/11111111-1111-4111-8111-111111111111/project-images/${PROJECT_ID}/estimate-row-images/${ESTIMATE_ID}/reference-thumb.webp`,
    });
    const imageUrl = uploadedEstimateRowImageUrl(String(canonicalDescriptor.thumbnailPath));
    validateEstimateRowImageAsset.mockResolvedValue(canonicalDescriptor);
    getEstimateRowForProject.mockResolvedValue(authoritativeEstimateRow({
      source_snapshot: { category: "Cabinetry" },
      metadata: { expressComponent: { kind: "express", schemaVersion: 1, id: "express-row-1" } },
      row_revision: 4,
    }));
    updateEstimateRowItemWithHistoryIntent.mockResolvedValue(canonicalRow({
      sourceSnapshot: {
        category: "Cabinetry",
        imageUrl,
        imageAsset: canonicalDescriptor,
      },
    }));

    await updateEstimateRowItem({
      projectId: PROJECT_ID,
      estimateId: ESTIMATE_ID,
      rowId: ROW_ID,
      sourceSnapshot: {
        imageUrl,
        imageAsset: {
          ...canonicalDescriptor,
          path: "workspace-evil/user-evil/tampered.webp",
        },
      },
    });

    expect(validateEstimateRowImageAsset).toHaveBeenCalledWith(database, {
      assetId: UPLOAD_ASSET_ID,
      uploadSessionId: UPLOAD_SESSION_ID,
      projectId: PROJECT_ID,
      estimateId: ESTIMATE_ID,
      rowId: ROW_ID,
    });
    const updateCall = updateEstimateRowItemWithHistoryIntent.mock.calls[0]?.[2] as { rowPatch: Record<string, unknown> } | undefined;
    expect(updateCall?.rowPatch.sourceSnapshot).toEqual({
      category: "Cabinetry",
      imageUrl,
      imageAsset: canonicalDescriptor,
    });
  });

  it("updateEstimateRowItem rejects uploaded reference image asset descriptors that fail row validation", async () => {
    canEditEstimate.mockResolvedValue(true);
    getEstimateRowForProject.mockResolvedValue(authoritativeEstimateRow({
      metadata: { expressComponent: { kind: "express", schemaVersion: 1, id: "express-row-1" } },
      row_revision: 4,
    }));

    await expect(updateEstimateRowItem({
      projectId: PROJECT_ID,
      estimateId: ESTIMATE_ID,
      rowId: ROW_ID,
      sourceSnapshot: {
        imageUrl: "https://assets.example.test/reference.webp",
        imageAsset: canonicalImageAssetDescriptor({ assetId: "99999999-cccc-4ccc-8ccc-999999999999" }),
      },
    })).rejects.toThrow("Reference image asset is not valid for this estimate row.");

    expect(validateEstimateRowImageAsset).toHaveBeenCalledWith(database, expect.objectContaining({
      projectId: PROJECT_ID,
      estimateId: ESTIMATE_ID,
      rowId: ROW_ID,
    }));
    expect(updateEstimateRowItemWithHistoryIntent).not.toHaveBeenCalled();
  });

  it("insertEstimateRowItemFromLibrary returns the canonical row from the typed intent", async () => {
    canEditEstimate.mockResolvedValue(true);
    insertEstimateRowItemWithHistoryIntent.mockResolvedValue(canonicalRow({ rowRevision: 1 }));

    await expect(insertEstimateRowItemFromLibrary({ projectId: PROJECT_ID, estimateId: ESTIMATE_ID, targetNodeId: NODE_ID, rowId: ROW_ID, libraryItem })).resolves.toMatchObject({
      rowId: ROW_ID,
      nodeId: NODE_ID,
      material: "Express component",
      sourceSnapshot: { sourceType: "express_component" },
    });

    const insertCall = insertEstimateRowItemWithHistoryIntent.mock.calls[0]?.[2] as {
      rowPayload: { sourceSnapshot: Record<string, unknown> };
    } | undefined;
    expect(insertCall?.rowPayload.sourceSnapshot.sourceUpdatedAt).toBe(libraryItem.updatedAt);
  });

  it("replaceEstimateRowItemWithLibrary replaces express rows through the typed intent", async () => {
    canEditEstimate.mockResolvedValue(true);
    getEstimateRowForProject.mockResolvedValue(authoritativeEstimateRow({
      metadata: { expressComponent: { kind: "express", schemaVersion: 1, id: "express-row-1" } },
    }));
    replaceEstimateRowItemWithHistoryIntent.mockResolvedValue(canonicalRow({
      material: libraryItem.material,
      sourceSnapshot: { sourceType: "library_component", sourceComponentId: libraryItem.id },
      linkState: "linked-clean",
      rowRevision: 2,
    }));

    await expect(replaceEstimateRowItemWithLibrary({ projectId: PROJECT_ID, estimateId: ESTIMATE_ID, rowId: ROW_ID, libraryItem })).resolves.toMatchObject({
      rowId: ROW_ID,
      material: libraryItem.material,
      linkState: "linked-clean",
      rowRevision: 2,
    });

    const replaceCall = replaceEstimateRowItemWithHistoryIntent.mock.calls[0]?.[2] as {
      projectId: string;
      estimateId: string;
      rowId: string;
      expectedRowRevision: number;
      replacementPayload: Record<string, unknown>;
    } | undefined;
    expect(replaceCall).toMatchObject({
      projectId: PROJECT_ID,
      estimateId: ESTIMATE_ID,
      rowId: ROW_ID,
      expectedRowRevision: 1,
      replacementPayload: expect.objectContaining({
        sourceLibraryItemId: libraryItem.id,
        material: libraryItem.material,
        linkState: "linked-clean",
      }),
    });
    expect(replaceCall?.replacementPayload.metadata).not.toHaveProperty("expressComponent");
  });

  it("moveEstimateRowItemWithHistory calls the typed intent without a caller-supplied actor", async () => {
    canEditEstimate.mockResolvedValue(true);
    moveEstimateRowItemWithHistoryIntent.mockResolvedValue({
      eventId: EVENT_ID,
      updatedRowCount: 2,
      rows: [
        { rowId: ROW_ID, nodeId: TARGET_NODE_ID, sortOrder: 0, rowRevision: 3 },
        { rowId: SECOND_ROW_ID, nodeId: TARGET_NODE_ID, sortOrder: 1, rowRevision: 4 },
      ],
    });

    const result = await moveEstimateRowItemWithHistory({
      projectId: PROJECT_ID,
      estimateId: ESTIMATE_ID,
      activeTabId: ACTIVE_TAB_ID,
      mutationId: MUTATION_ID,
      movedRowId: ROW_ID,
      sourceNodeId: NODE_ID,
      targetNodeId: TARGET_NODE_ID,
      updates: [
        { rowId: ROW_ID, nodeId: TARGET_NODE_ID, sortOrder: 0, expectedRowRevision: 2 },
        { rowId: SECOND_ROW_ID, nodeId: TARGET_NODE_ID, sortOrder: 1, expectedRowRevision: 3 },
      ],
    });

    const moveCall = moveEstimateRowItemWithHistoryIntent.mock.calls[0]?.[2] as Record<string, unknown> | undefined;

    expect(result).toEqual({
      eventId: EVENT_ID,
      updatedRowCount: 2,
      rows: [
        { rowId: ROW_ID, nodeId: TARGET_NODE_ID, sortOrder: 0, rowRevision: 3 },
        { rowId: SECOND_ROW_ID, nodeId: TARGET_NODE_ID, sortOrder: 1, rowRevision: 4 },
      ],
    });
    expect(moveCall).toEqual({
      projectId: PROJECT_ID,
      estimateId: ESTIMATE_ID,
      activeTabId: ACTIVE_TAB_ID,
      movedRowId: ROW_ID,
      sourceNodeId: NODE_ID,
      targetNodeId: TARGET_NODE_ID,
      updates: [
        { rowId: ROW_ID, nodeId: TARGET_NODE_ID, sortOrder: 0, expectedRowRevision: 2 },
        { rowId: SECOND_ROW_ID, nodeId: TARGET_NODE_ID, sortOrder: 1, expectedRowRevision: 3 },
      ],
      correlationId: MUTATION_ID,
    });
    expect(moveCall).not.toHaveProperty("actingUserId");
    expect(moveEstimateRowItemWithHistoryIntent.mock.calls[0]?.[1]).toEqual(expect.objectContaining({
      userId: "11111111-1111-4111-8111-111111111111",
    }));
  });

  it("moveEstimateRowItemWithHistory rejects malformed local move payloads before the typed intent", async () => {
    await expect(moveEstimateRowItemWithHistory({
      projectId: PROJECT_ID,
      estimateId: ESTIMATE_ID,
      movedRowId: "optimistic-row-1",
      sourceNodeId: NODE_ID,
      targetNodeId: TARGET_NODE_ID,
      updates: [],
    })).rejects.toThrow(/at least one row order update/i);

    expect(moveEstimateRowItemWithHistoryIntent).not.toHaveBeenCalled();
  });
});
