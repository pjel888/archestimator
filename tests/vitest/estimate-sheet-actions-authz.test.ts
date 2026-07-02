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

const requireAuth = vi.hoisted(() => vi.fn());
const requireCurrentUserContext = vi.hoisted(() => vi.fn());
const fromSpy = vi.hoisted(() => vi.fn());
const rpcSpy = vi.hoisted(() => vi.fn());
const createEstimateActionsD1Client = vi.hoisted(() => vi.fn());
const clearEstimateRouteContextProcessCache = vi.hoisted(() => vi.fn());
const getCurrentWorkspaceProject = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/session", () => ({
  requireAuth,
  requireCurrentUserContext,
  getCurrentUserContext: requireCurrentUserContext,
}));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(async () => ({
    from: fromSpy,
    rest: { rpc: rpcSpy },
    rpc(this: { rest: { rpc: typeof rpcSpy } }, ...args: Parameters<typeof rpcSpy>) {
      return this.rest.rpc(...args);
    },
  })),
}));
vi.mock("@/lib/estimates/d1-action-client", () => ({
  createEstimateActionsD1Client,
}));
vi.mock("@/lib/repositories/workspace-repository", () => ({
  clearEstimateRouteContextProcessCache,
  getCurrentWorkspaceProject,
  getEstimateTabs: vi.fn(async () => []),
  getEstimateTabTree: vi.fn(async () => []),
  getProjectEstimateTreeByEstimate: vi.fn(async () => ({ tree: [] })),
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
  insertEstimateRowItemFromLibrary,
  moveEstimateRowComponentWithHistory,
  moveEstimateRowItemWithHistory,
  regenerateEstimateSheetCode,
  renameEstimateTab,
  replaceEstimateRowItemWithLibrary,
  renameEstimateNode,
  reorderEstimateTabs,
  reorderEstimateTreeNodes,
  updateEstimateDetails,
  updateEstimateRowItem,
} from "@/lib/estimates/actions";

function chain(single: unknown) {
  const c: Record<string, unknown> = {};
  for (const method of ["select", "eq", "in", "order", "is", "insert", "update", "limit"]) {
    c[method] = () => c;
  }
  c.maybeSingle = async () => ({ data: single, error: null });
  c.single = async () => ({ data: single, error: null });
  c.then = (resolve: (value: { data: unknown[]; error: null }) => unknown) => resolve({ data: [], error: null });
  return c;
}

const writeTables = new Set(["estimate_nodes", "estimate_tabs", "estimate_row_items"]);

describe("estimate sheet actions edit authorization (F15 / P3-3)", () => {
  beforeEach(() => {
    fromSpy.mockReset();
    rpcSpy.mockReset();
    createEstimateActionsD1Client.mockReset();
    clearEstimateRouteContextProcessCache.mockReset();
    getCurrentWorkspaceProject.mockReset();
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
    createEstimateActionsD1Client.mockResolvedValue({
      from: fromSpy,
      call: rpcSpy,
    });
    fromSpy.mockImplementation((table: string) => {
      if (table === "workspaces") return chain({ id: "ws-1", name: "WS", created_by: "u1" });
      if (table === "projects") return chain({ id: PROJECT_ID, workspace_id: "ws-1", name: "Proj", currency_code: "PHP", metadata: {} });
      if (table === "estimates") return chain({ id: ESTIMATE_ID, project_id: PROJECT_ID });
      return chain(null);
    });
    // Read-only collaborator: both edit checks deny.
    rpcSpy.mockImplementation((fn: string) => {
      if (fn === "can_edit_project" || fn === "can_edit_estimate") return Promise.resolve({ data: false, error: null });
      return Promise.resolve({ data: null, error: null });
    });
  });

  function assertNoWrite() {
    const touchedWriteTable = fromSpy.mock.calls.some(([table]) => writeTables.has(table as string));
    expect(touchedWriteTable).toBe(false);
  }

  it("createEstimateSheetDraft denies a viewer with a clean error before any write", async () => {
    await expect(createEstimateSheetDraft(PROJECT_ID)).rejects.toThrow(/edit access denied/i);
    expect(rpcSpy).toHaveBeenCalledWith("can_edit_project", { target_project_id: PROJECT_ID });
    assertNoWrite();
  });

  it("duplicateEstimateSheet denies a viewer before copying the source", async () => {
    await expect(duplicateEstimateSheet({ projectId: PROJECT_ID, estimateId: ESTIMATE_ID })).rejects.toThrow(/edit access denied/i);
    expect(rpcSpy).toHaveBeenCalledWith("can_edit_estimate", { target_estimate_id: ESTIMATE_ID });
    assertNoWrite();
  });

  it("updateEstimateDetails denies a viewer before the history RPC", async () => {
    await expect(
      updateEstimateDetails({ projectId: PROJECT_ID, estimateId: ESTIMATE_ID, name: "New" }),
    ).rejects.toThrow(/edit access denied/i);
    expect(rpcSpy).toHaveBeenCalledWith("can_edit_estimate", { target_estimate_id: ESTIMATE_ID });
    expect(rpcSpy).not.toHaveBeenCalledWith("update_estimate_details_with_history", expect.anything());
  });

  it("regenerateEstimateSheetCode denies a viewer before the history RPC", async () => {
    await expect(
      regenerateEstimateSheetCode({ projectId: PROJECT_ID, estimateId: ESTIMATE_ID }),
    ).rejects.toThrow(/edit access denied/i);
    expect(rpcSpy).toHaveBeenCalledWith("can_edit_estimate", { target_estimate_id: ESTIMATE_ID });
  });

  it("insert/update/replace/delete row actions deny a viewer before row writes", async () => {
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
    })).rejects.toThrow(/edit access denied/i);

    expect(rpcSpy).toHaveBeenCalledWith("can_edit_estimate", { target_estimate_id: ESTIMATE_ID });
    expect(rpcSpy).not.toHaveBeenCalledWith("insert_estimate_row_item_with_history", expect.anything());
    expect(rpcSpy).not.toHaveBeenCalledWith("update_estimate_row_item_with_history", expect.anything());
    expect(rpcSpy).not.toHaveBeenCalledWith("replace_estimate_row_item_with_history", expect.anything());
    expect(rpcSpy).not.toHaveBeenCalledWith("delete_estimate_row_item_with_history", expect.anything());
    expect(rpcSpy).not.toHaveBeenCalledWith("move_estimate_row_component_with_history", expect.anything());
    expect(rpcSpy).not.toHaveBeenCalledWith("move_estimate_row_item_with_history", expect.anything());
    expect(rpcSpy).not.toHaveBeenCalledWith("delete_estimate_row_items_bulk_with_history", expect.anything());
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

    expect(rpcSpy).toHaveBeenCalledWith("can_edit_estimate", { target_estimate_id: ESTIMATE_ID });
    expect(rpcSpy).not.toHaveBeenCalledWith("create_estimate_node_with_history", expect.anything());
    expect(rpcSpy).not.toHaveBeenCalledWith("rename_estimate_node_with_history", expect.anything());
    expect(rpcSpy).not.toHaveBeenCalledWith("delete_estimate_node_with_history", expect.anything());
    expect(rpcSpy).not.toHaveBeenCalledWith("delete_estimate_nodes_bulk_with_history", expect.anything());
    expect(rpcSpy).not.toHaveBeenCalledWith("reorder_estimate_nodes_with_history", expect.anything());
    assertNoWrite();
  });

  it("tab mutation actions deny a viewer before tab history RPCs", async () => {
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

    expect(rpcSpy).toHaveBeenCalledWith("can_edit_estimate", { target_estimate_id: ESTIMATE_ID });
    expect(rpcSpy).not.toHaveBeenCalledWith("create_estimate_tab_with_history", expect.anything());
    expect(rpcSpy).not.toHaveBeenCalledWith("rename_estimate_tab_with_history", expect.anything());
    expect(rpcSpy).not.toHaveBeenCalledWith("reorder_estimate_tabs_with_history", expect.anything());
    expect(rpcSpy).not.toHaveBeenCalledWith("duplicate_estimate_tab_with_history", expect.anything());
    expect(rpcSpy).not.toHaveBeenCalledWith("archive_estimate_tab_with_history", expect.anything());
    expect(rpcSpy).not.toHaveBeenCalledWith("delete_estimate_tab_with_history", expect.anything());
  });

  it("updateEstimateRowItem omits sourceSnapshot and metadata for routine edits", async () => {
    fromSpy.mockImplementation((table: string) => {
      if (table === "workspaces") return chain({ id: "ws-1", name: "WS", created_by: "u1" });
      if (table === "projects") return chain({ id: PROJECT_ID, workspace_id: "ws-1", name: "Proj", currency_code: "PHP", metadata: {} });
      if (table === "estimate_row_items") {
        return chain({
          id: ROW_ID,
          node_id: NODE_ID,
          estimate_id: ESTIMATE_ID,
          source_library_item_id: "66666666-6666-4666-8666-666666666666",
          link_state: "linked-clean",
          row_revision: 1,
        });
      }
      return chain(null);
    });
    rpcSpy.mockImplementation((fn: string) => {
      if (fn === "can_edit_estimate") return Promise.resolve({ data: true, error: null });
      if (fn === "update_estimate_row_item_with_history") return Promise.resolve({ data: canonicalRow(), error: null });
      return Promise.resolve({ data: null, error: null });
    });

    const result = await updateEstimateRowItem({ projectId: PROJECT_ID, estimateId: ESTIMATE_ID, rowId: ROW_ID, quantity: 2 });
    const updateCall = rpcSpy.mock.calls.find(([fn]) => fn === "update_estimate_row_item_with_history") as [string, { row_patch: Record<string, unknown> }] | undefined;

    expect(result).toMatchObject({ rowId: ROW_ID, material: "Express component", itemCost: 125, rowRevision: 2 });
    expect(updateCall?.[1]).toMatchObject({
      target_project_id: PROJECT_ID,
      target_estimate_id: ESTIMATE_ID,
      target_row_id: ROW_ID,
      row_patch: { quantity: 2, linkState: "linked-overridden" },
    });
    expect(updateCall?.[1].row_patch).not.toHaveProperty("sourceSnapshot");
    expect(updateCall?.[1].row_patch).not.toHaveProperty("metadata");
  });


  it("updateEstimateRowItem merges source snapshot patches before writing JSON", async () => {
    fromSpy.mockImplementation((table: string) => {
      if (table === "workspaces") return chain({ id: "ws-1", name: "WS", created_by: "u1" });
      if (table === "projects") return chain({ id: PROJECT_ID, workspace_id: "ws-1", name: "Proj", currency_code: "PHP", metadata: {} });
      if (table === "estimate_row_items") {
        return chain({
          id: ROW_ID,
          node_id: NODE_ID,
          estimate_id: ESTIMATE_ID,
          source_library_item_id: null,
          source_snapshot: { category: "Cabinetry", sourceUrl: "https://example.com/original" },
          metadata: { expressComponent: { kind: "express", schemaVersion: 1, id: "express-row-1" } },
          link_state: "unlinked",
          row_revision: 4,
        });
      }
      return chain(null);
    });
    rpcSpy.mockImplementation((fn: string) => {
      if (fn === "can_edit_estimate") return Promise.resolve({ data: true, error: null });
      if (fn === "update_estimate_row_item_with_history") return Promise.resolve({ data: canonicalRow({ sourceSnapshot: { category: "Cabinetry", sourceUrl: "https://example.com/original", imageUrl: "/component-thumbnails/reference.webp" } }), error: null });
      return Promise.resolve({ data: null, error: null });
    });

    await updateEstimateRowItem({
      projectId: PROJECT_ID,
      estimateId: ESTIMATE_ID,
      rowId: ROW_ID,
      sourceSnapshot: { imageUrl: "/component-thumbnails/reference.webp" },
    });
    const updateCall = rpcSpy.mock.calls.find(([fn]) => fn === "update_estimate_row_item_with_history") as [string, { row_patch: Record<string, unknown> }] | undefined;

    expect(updateCall?.[1].row_patch.sourceSnapshot).toEqual({
      category: "Cabinetry",
      sourceUrl: "https://example.com/original",
      imageUrl: "/component-thumbnails/reference.webp",
    });
  });

  it("updateEstimateRowItem strips unsafe source snapshot patch fields before writing JSON", async () => {
    fromSpy.mockImplementation((table: string) => {
      if (table === "workspaces") return chain({ id: "ws-1", name: "WS", created_by: "u1" });
      if (table === "projects") return chain({ id: PROJECT_ID, workspace_id: "ws-1", name: "Proj", currency_code: "PHP", metadata: {} });
      if (table === "estimate_row_items") {
        return chain({
          id: ROW_ID,
          node_id: NODE_ID,
          estimate_id: ESTIMATE_ID,
          source_library_item_id: null,
          source_snapshot: {
            category: "Cabinetry",
            sourceUrl: "https://example.com/original",
            signedUrl: "https://storage.example/signed-token",
            storagePath: "workspace/private/path.webp",
            tags: ["built-in", "\u0000bad"],
            componentVersionNumber: 3,
          },
          metadata: { expressComponent: { kind: "express", schemaVersion: 1, id: "express-row-1" } },
          link_state: "unlinked",
          row_revision: 4,
        });
      }
      return chain(null);
    });
    rpcSpy.mockImplementation((fn: string) => {
      if (fn === "can_edit_estimate") return Promise.resolve({ data: true, error: null });
      if (fn === "update_estimate_row_item_with_history") return Promise.resolve({ data: canonicalRow(), error: null });
      return Promise.resolve({ data: null, error: null });
    });

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
    const updateCall = rpcSpy.mock.calls.find(([fn]) => fn === "update_estimate_row_item_with_history") as [string, { row_patch: Record<string, unknown> }] | undefined;

    expect(updateCall?.[1].row_patch.sourceSnapshot).toEqual({
      category: "Cabinetry",
      sourceUrl: null,
      tags: ["built-in"],
      componentVersionNumber: 3,
      imageUrl: null,
    });
  });

  it("updateEstimateRowItem drops tainted existing image asset descriptors before re-saving source snapshots", async () => {
    const taintedDescriptor = canonicalImageAssetDescriptor({ path: "workspace-evil/user-evil/tampered.webp" });
    fromSpy.mockImplementation((table: string) => {
      if (table === "workspaces") return chain({ id: "ws-1", name: "WS", created_by: "u1" });
      if (table === "projects") return chain({ id: PROJECT_ID, workspace_id: "ws-1", name: "Proj", currency_code: "PHP", metadata: {} });
      if (table === "estimate_row_items") {
        return chain({
          id: ROW_ID,
          node_id: NODE_ID,
          estimate_id: ESTIMATE_ID,
          source_library_item_id: null,
          source_snapshot: {
            category: "Cabinetry",
            imageAsset: taintedDescriptor,
          },
          metadata: { expressComponent: { kind: "express", schemaVersion: 1, id: "express-row-1" } },
          link_state: "unlinked",
          row_revision: 4,
        });
      }
      return chain(null);
    });
    rpcSpy.mockImplementation((fn: string) => {
      if (fn === "can_edit_estimate") return Promise.resolve({ data: true, error: null });
      if (fn === "validate_estimate_row_image_asset") return Promise.resolve({ data: null, error: null });
      if (fn === "update_estimate_row_item_with_history") return Promise.resolve({ data: canonicalRow(), error: null });
      return Promise.resolve({ data: null, error: null });
    });

    await updateEstimateRowItem({
      projectId: PROJECT_ID,
      estimateId: ESTIMATE_ID,
      rowId: ROW_ID,
      sourceSnapshot: { sourceUrl: "https://example.com/reference" },
    });

    expect(rpcSpy).toHaveBeenCalledWith("validate_estimate_row_image_asset", {
      target_asset_id: UPLOAD_ASSET_ID,
      target_upload_session_id: UPLOAD_SESSION_ID,
      target_project_id: PROJECT_ID,
      target_estimate_id: ESTIMATE_ID,
      target_row_id: ROW_ID,
    });
    const updateCall = rpcSpy.mock.calls.find(([fn]) => fn === "update_estimate_row_item_with_history") as [string, { row_patch: Record<string, unknown> }] | undefined;
    expect(updateCall?.[1].row_patch.sourceSnapshot).toEqual({
      category: "Cabinetry",
      sourceUrl: "https://example.com/reference",
    });
  });

  it("updateEstimateRowItem canonicalizes uploaded reference image asset descriptors before writing source snapshots", async () => {
    const canonicalDescriptor = canonicalImageAssetDescriptor();
    fromSpy.mockImplementation((table: string) => {
      if (table === "workspaces") return chain({ id: "ws-1", name: "WS", created_by: "u1" });
      if (table === "projects") return chain({ id: PROJECT_ID, workspace_id: "ws-1", name: "Proj", currency_code: "PHP", metadata: {} });
      if (table === "estimate_row_items") {
        return chain({
          id: ROW_ID,
          node_id: NODE_ID,
          estimate_id: ESTIMATE_ID,
          source_library_item_id: null,
          source_snapshot: { category: "Cabinetry" },
          metadata: { expressComponent: { kind: "express", schemaVersion: 1, id: "express-row-1" } },
          link_state: "unlinked",
          row_revision: 4,
        });
      }
      return chain(null);
    });
    rpcSpy.mockImplementation((fn: string) => {
      if (fn === "can_edit_estimate") return Promise.resolve({ data: true, error: null });
      if (fn === "validate_estimate_row_image_asset") return Promise.resolve({ data: canonicalDescriptor, error: null });
      if (fn === "update_estimate_row_item_with_history") {
        return Promise.resolve({
          data: canonicalRow({
            sourceSnapshot: {
              category: "Cabinetry",
              imageUrl: "/component-thumbnails/reference.webp",
              imageAsset: canonicalDescriptor,
            },
          }),
          error: null,
        });
      }
      return Promise.resolve({ data: null, error: null });
    });

    await updateEstimateRowItem({
      projectId: PROJECT_ID,
      estimateId: ESTIMATE_ID,
      rowId: ROW_ID,
      sourceSnapshot: {
        imageUrl: "/component-thumbnails/reference.webp",
        imageAsset: {
          ...canonicalDescriptor,
          path: "workspace-evil/user-evil/tampered.webp",
        },
      },
    });

    expect(rpcSpy).toHaveBeenCalledWith("validate_estimate_row_image_asset", {
      target_asset_id: UPLOAD_ASSET_ID,
      target_upload_session_id: UPLOAD_SESSION_ID,
      target_project_id: PROJECT_ID,
      target_estimate_id: ESTIMATE_ID,
      target_row_id: ROW_ID,
    });
    const updateCall = rpcSpy.mock.calls.find(([fn]) => fn === "update_estimate_row_item_with_history") as [string, { row_patch: Record<string, unknown> }] | undefined;
    expect(updateCall?.[1].row_patch.sourceSnapshot).toEqual({
      category: "Cabinetry",
      imageUrl: "/component-thumbnails/reference.webp",
      imageAsset: canonicalDescriptor,
    });
  });

  it("updateEstimateRowItem rejects uploaded reference image asset descriptors that fail row validation", async () => {
    fromSpy.mockImplementation((table: string) => {
      if (table === "workspaces") return chain({ id: "ws-1", name: "WS", created_by: "u1" });
      if (table === "projects") return chain({ id: PROJECT_ID, workspace_id: "ws-1", name: "Proj", currency_code: "PHP", metadata: {} });
      if (table === "estimate_row_items") {
        return chain({
          id: ROW_ID,
          node_id: NODE_ID,
          estimate_id: ESTIMATE_ID,
          source_library_item_id: null,
          source_snapshot: null,
          metadata: { expressComponent: { kind: "express", schemaVersion: 1, id: "express-row-1" } },
          link_state: "unlinked",
          row_revision: 4,
        });
      }
      return chain(null);
    });
    rpcSpy.mockImplementation((fn: string) => {
      if (fn === "can_edit_estimate") return Promise.resolve({ data: true, error: null });
      if (fn === "validate_estimate_row_image_asset") return Promise.resolve({ data: null, error: null });
      if (fn === "update_estimate_row_item_with_history") return Promise.resolve({ data: canonicalRow(), error: null });
      return Promise.resolve({ data: null, error: null });
    });

    await expect(updateEstimateRowItem({
      projectId: PROJECT_ID,
      estimateId: ESTIMATE_ID,
      rowId: ROW_ID,
      sourceSnapshot: {
        imageUrl: "https://assets.example.test/reference.webp",
        imageAsset: canonicalImageAssetDescriptor({ assetId: "99999999-cccc-4ccc-8ccc-999999999999" }),
      },
    })).rejects.toThrow("Reference image asset is not valid for this estimate row.");

    expect(rpcSpy).toHaveBeenCalledWith("validate_estimate_row_image_asset", expect.objectContaining({
      target_project_id: PROJECT_ID,
      target_estimate_id: ESTIMATE_ID,
      target_row_id: ROW_ID,
    }));
    expect(rpcSpy).not.toHaveBeenCalledWith("update_estimate_row_item_with_history", expect.anything());
  });

  it("insertEstimateRowItemFromLibrary returns the canonical row when the RPC returns it", async () => {
    fromSpy.mockImplementation((table: string) => {
      if (table === "workspaces") return chain({ id: "ws-1", name: "WS", created_by: "u1" });
		if (table === "projects") return chain({ id: PROJECT_ID, workspace_id: "ws-1", name: "Proj", currency_code: "PHP", metadata: {} });
		if (table === "estimate_nodes") return chain({ id: NODE_ID, estimate_id: ESTIMATE_ID, kind: "area", estimates: { project_id: PROJECT_ID } });
		if (table === "estimate_row_items") return chain({ sort_order: 4 });
		if (table === "cost_library_items") return chain({ id: libraryItem.id, updated_at: null, lifecycle_state: "available" });
		return chain(null);
	});
    rpcSpy.mockImplementation((fn: string) => {
      if (fn === "can_edit_estimate") return Promise.resolve({ data: true, error: null });
      if (fn === "insert_estimate_row_item_with_history") return Promise.resolve({ data: canonicalRow({ rowRevision: 1 }), error: null });
      return Promise.resolve({ data: null, error: null });
    });

    await expect(insertEstimateRowItemFromLibrary({ projectId: PROJECT_ID, estimateId: ESTIMATE_ID, targetNodeId: NODE_ID, rowId: ROW_ID, libraryItem })).resolves.toMatchObject({
      rowId: ROW_ID,
      nodeId: NODE_ID,
      material: "Express component",
      sourceSnapshot: { sourceType: "express_component" },
    });
  });

  it("replaceEstimateRowItemWithLibrary replaces express rows through the history RPC", async () => {
    fromSpy.mockImplementation((table: string) => {
      if (table === "workspaces") return chain({ id: "ws-1", name: "WS", created_by: "u1" });
		if (table === "projects") return chain({ id: PROJECT_ID, workspace_id: "ws-1", name: "Proj", currency_code: "PHP", metadata: {} });
		if (table === "cost_library_items") return chain({ id: libraryItem.id, updated_at: null, lifecycle_state: "available" });
		if (table === "estimate_row_items") {
			return chain({
          id: ROW_ID,
          node_id: NODE_ID,
          estimate_id: ESTIMATE_ID,
          source_library_item_id: null,
          source_snapshot: null,
          metadata: { expressComponent: { kind: "express", schemaVersion: 1, id: "express-row-1" } },
          link_state: "unlinked",
          row_revision: 1,
        });
      }
      return chain(null);
    });
    rpcSpy.mockImplementation((fn: string) => {
      if (fn === "can_edit_estimate") return Promise.resolve({ data: true, error: null });
      if (fn === "replace_estimate_row_item_with_history") return Promise.resolve({ data: canonicalRow({
        material: libraryItem.material,
        sourceSnapshot: { sourceType: "library_component", sourceComponentId: libraryItem.id },
        linkState: "linked-clean",
        rowRevision: 2,
      }), error: null });
      return Promise.resolve({ data: null, error: null });
    });

    await expect(replaceEstimateRowItemWithLibrary({ projectId: PROJECT_ID, estimateId: ESTIMATE_ID, rowId: ROW_ID, libraryItem })).resolves.toMatchObject({
      rowId: ROW_ID,
      material: libraryItem.material,
      linkState: "linked-clean",
      rowRevision: 2,
    });

    const replaceCall = rpcSpy.mock.calls.find(([fn]) => fn === "replace_estimate_row_item_with_history") as [string, { replacement_payload: Record<string, unknown> }] | undefined;
    expect(replaceCall?.[1]).toMatchObject({
      target_project_id: PROJECT_ID,
      target_estimate_id: ESTIMATE_ID,
      target_row_id: ROW_ID,
      expected_row_revision: 1,
      replacement_payload: expect.objectContaining({
        sourceLibraryItemId: libraryItem.id,
        material: libraryItem.material,
        linkState: "linked-clean",
      }),
    });
    expect(replaceCall?.[1].replacement_payload.metadata).not.toHaveProperty("expressComponent");
  });

  it("moveEstimateRowItemWithHistory calls the dedicated RPC without a caller-supplied actor", async () => {
    fromSpy.mockImplementation((table: string) => {
      if (table === "workspaces") return chain({ id: "ws-1", name: "WS", created_by: "u1" });
      if (table === "projects") return chain({ id: PROJECT_ID, workspace_id: "ws-1", name: "Proj", currency_code: "PHP", metadata: {} });
      return chain(null);
    });
    rpcSpy.mockImplementation((fn: string) => {
      if (fn === "can_edit_estimate") return Promise.resolve({ data: true, error: null });
      if (fn === "move_estimate_row_item_with_history") {
        return Promise.resolve({
          data: {
            eventId: EVENT_ID,
            updatedRowCount: 2,
            rows: [
              { rowId: ROW_ID, nodeId: TARGET_NODE_ID, sortOrder: 0, rowRevision: 3 },
              { rowId: SECOND_ROW_ID, nodeId: TARGET_NODE_ID, sortOrder: 1, rowRevision: 4 },
            ],
          },
          error: null,
        });
      }
      return Promise.resolve({ data: null, error: null });
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

    const moveCall = rpcSpy.mock.calls.find(([fn]) => fn === "move_estimate_row_item_with_history") as [string, Record<string, unknown>] | undefined;

    expect(result).toEqual({
      eventId: EVENT_ID,
      updatedRowCount: 2,
      rows: [
        { rowId: ROW_ID, nodeId: TARGET_NODE_ID, sortOrder: 0, rowRevision: 3 },
        { rowId: SECOND_ROW_ID, nodeId: TARGET_NODE_ID, sortOrder: 1, rowRevision: 4 },
      ],
    });
    expect(moveCall?.[1]).toEqual({
      target_project_id: PROJECT_ID,
      target_estimate_id: ESTIMATE_ID,
      target_active_tab_id: ACTIVE_TAB_ID,
      moved_row_id: ROW_ID,
      source_node_id: NODE_ID,
      target_node_id: TARGET_NODE_ID,
      move_updates: [
        { rowId: ROW_ID, nodeId: TARGET_NODE_ID, sortOrder: 0, expectedRowRevision: 2 },
        { rowId: SECOND_ROW_ID, nodeId: TARGET_NODE_ID, sortOrder: 1, expectedRowRevision: 3 },
      ],
      correlation_id: MUTATION_ID,
    });
    expect(moveCall?.[1]).not.toHaveProperty("acting_user_id");
  });

  it("moveEstimateRowItemWithHistory rejects malformed local move payloads before the RPC", async () => {
    await expect(moveEstimateRowItemWithHistory({
      projectId: PROJECT_ID,
      estimateId: ESTIMATE_ID,
      movedRowId: "optimistic-row-1",
      sourceNodeId: NODE_ID,
      targetNodeId: TARGET_NODE_ID,
      updates: [],
    })).rejects.toThrow(/at least one row order update/i);

    expect(rpcSpy).not.toHaveBeenCalledWith("move_estimate_row_item_with_history", expect.anything());
  });
});
