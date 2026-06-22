import { beforeEach, describe, expect, it, vi } from "vitest";

const PROJECT_ID = "22222222-2222-4222-8222-222222222222";
const ESTIMATE_ID = "33333333-3333-4333-8333-333333333333";

const ROW_ID = "44444444-4444-4444-8444-444444444444";
const NODE_ID = "55555555-5555-4555-8555-555555555555";

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

const requireCurrentUserContext = vi.hoisted(() => vi.fn());
const fromSpy = vi.hoisted(() => vi.fn());
const rpcSpy = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/session", () => ({
  requireCurrentUserContext,
  getCurrentUserContext: requireCurrentUserContext,
}));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(async () => ({ from: fromSpy, rpc: rpcSpy })),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import {
  createEstimateSheetDraft,
  deleteEstimateRowItem,
  duplicateEstimateSheet,
  insertEstimateRowItemFromLibrary,
  regenerateEstimateSheetCode,
  replaceEstimateRowItemWithLibrary,
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
    requireCurrentUserContext.mockResolvedValue({
      userId: "11111111-1111-4111-8111-111111111111",
      email: "viewer@example.com",
      profile: { id: "11111111-1111-4111-8111-111111111111", default_workspace_id: "ws-1", role: "viewer" },
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

    expect(rpcSpy).toHaveBeenCalledWith("can_edit_estimate", { target_estimate_id: ESTIMATE_ID });
    expect(rpcSpy).not.toHaveBeenCalledWith("insert_estimate_row_item_with_history", expect.anything());
    expect(rpcSpy).not.toHaveBeenCalledWith("update_estimate_row_item_with_history", expect.anything());
    expect(rpcSpy).not.toHaveBeenCalledWith("replace_estimate_row_item_with_history", expect.anything());
    expect(rpcSpy).not.toHaveBeenCalledWith("delete_estimate_row_item_with_history", expect.anything());
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
      if (fn === "update_estimate_row_item_with_history") return Promise.resolve({ data: canonicalRow({ sourceSnapshot: { category: "Cabinetry", sourceUrl: "https://example.com/original", imageUrl: "https://example.com/new.jpg" } }), error: null });
      return Promise.resolve({ data: null, error: null });
    });

    await updateEstimateRowItem({
      projectId: PROJECT_ID,
      estimateId: ESTIMATE_ID,
      rowId: ROW_ID,
      sourceSnapshot: { imageUrl: "https://example.com/new.jpg" },
    });
    const updateCall = rpcSpy.mock.calls.find(([fn]) => fn === "update_estimate_row_item_with_history") as [string, { row_patch: Record<string, unknown> }] | undefined;

    expect(updateCall?.[1].row_patch.sourceSnapshot).toEqual({
      category: "Cabinetry",
      sourceUrl: "https://example.com/original",
      imageUrl: "https://example.com/new.jpg",
    });
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
});
