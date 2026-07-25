import { readFileSync } from "node:fs";
import { join } from "node:path";

import { beforeEach, describe, expect, it, vi } from "vitest";

const ACTOR = { userId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", role: "admin" } as const;
const DATABASE = { kind: "typed-estimate-test-database" };

const repositoryMocks = vi.hoisted(() => ({
  getCurrentWorkspaceProject: vi.fn(),
  getCurrentWorkspaceProjectForEstimate: vi.fn(),
  getEstimateTabTree: vi.fn(),
  getProjectEstimateTreeByEstimate: vi.fn(),
}));

const databaseMocks = vi.hoisted(() => ({
  requireEstimateD1Database: vi.fn(),
}));

const nodeIntentMocks = vi.hoisted(() => ({
  createEstimateNodeWithHistory: vi.fn(),
  deleteEstimateNodesWithHistory: vi.fn(),
  getEstimateNodeForProject: vi.fn(),
  renameEstimateNodeWithHistory: vi.fn(),
  reorderEstimateNodesWithHistory: vi.fn(),
  resolveEstimateActivityNodeScope: vi.fn(),
  restoreDeletedEstimateNodesWithHistory: vi.fn(),
}));

const templateIntentMocks = vi.hoisted(() => ({
  insertEstimateTemplateIntoEstimateWithHistory: vi.fn(),
  insertEstimateTemplateNodeIntoEstimateWithHistory: vi.fn(),
  insertEstimateTemplatesIntoEstimateWithHistory: vi.fn(),
}));

const bulkIntentMocks = vi.hoisted(() => ({
  executeBulkDeleteEstimateSheets: vi.fn(),
  previewBulkDeleteEstimateSheets: vi.fn(),
}));

const authMocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  requireCurrentUserContext: vi.fn(),
}));

const nextCacheMocks = vi.hoisted(() => ({ revalidatePath: vi.fn() }));
const nextNavigationMocks = vi.hoisted(() => ({ redirect: vi.fn() }));

vi.mock("@/lib/repositories/workspace-repository", () => repositoryMocks);
vi.mock("@/lib/estimates/d1-intents/database", () => databaseMocks);
vi.mock("@/lib/estimates/d1-intents/nodes", () => nodeIntentMocks);
vi.mock("@/lib/estimates/d1-intents/templates", () => templateIntentMocks);
vi.mock("@/lib/estimates/d1-intents/bulk-sheets", () => bulkIntentMocks);
vi.mock("@/lib/auth/session", () => authMocks);
vi.mock("next/cache", () => nextCacheMocks);
vi.mock("next/navigation", () => nextNavigationMocks);

const DEFAULT_TREE = [
  { id: "project-scope", name: "Project Scope", kind: "group", total: "₱0.00", children: [] },
];

beforeEach(() => {
  vi.clearAllMocks();
  authMocks.requireAuth.mockResolvedValue(undefined);
  authMocks.requireCurrentUserContext.mockResolvedValue(ACTOR);
  databaseMocks.requireEstimateD1Database.mockResolvedValue(DATABASE);
  repositoryMocks.getCurrentWorkspaceProject.mockResolvedValue({ project: { id: "project-1" } });
  repositoryMocks.getCurrentWorkspaceProjectForEstimate.mockResolvedValue({ project: { id: "project-1" } });
  repositoryMocks.getProjectEstimateTreeByEstimate.mockResolvedValue({
    project: { id: "project-1" },
    estimate: { id: "estimate-1" },
    tree: DEFAULT_TREE,
  });
  repositoryMocks.getEstimateTabTree.mockResolvedValue({
    project: { id: "project-1" },
    estimate: { id: "estimate-1" },
    tree: DEFAULT_TREE,
  });
  nodeIntentMocks.reorderEstimateNodesWithHistory.mockResolvedValue({ updatedNodeCount: 1 });
  nodeIntentMocks.createEstimateNodeWithHistory.mockResolvedValue({
    nodeId: "new-node",
    eventId: "create-event",
    payload: { nodeId: "new-node" },
  });
  nodeIntentMocks.renameEstimateNodeWithHistory.mockResolvedValue({ nodeId: "node-1" });
  nodeIntentMocks.getEstimateNodeForProject.mockImplementation(async (_database, input) => ({
    id: input.nodeId,
    estimate_id: input.estimateId,
    parent_id: null,
  }));
  nodeIntentMocks.deleteEstimateNodesWithHistory.mockResolvedValue({
    eventId: "delete-event",
    deletedNodeIds: ["node-1"],
    deletedNodeCount: 1,
    deletedRowCount: 2,
    fallbackNodeId: "fallback-node",
  });
  nodeIntentMocks.restoreDeletedEstimateNodesWithHistory.mockResolvedValue({
    eventId: "restore-event",
    sourceEventId: "delete-event",
    restoredNodeIds: ["node-1"],
    restoredRootNodeIds: ["node-1"],
    restoredNodeCount: 1,
    restoredRowIds: ["row-1"],
    restoredRowCount: 1,
  });
  templateIntentMocks.insertEstimateTemplateIntoEstimateWithHistory.mockResolvedValue({
    status: "inserted",
    inserted_root_node_ids: ["new-root-node"],
    estimateTabId: null,
  });
  templateIntentMocks.insertEstimateTemplateNodeIntoEstimateWithHistory.mockResolvedValue({
    status: "inserted",
    insertedRootNodeId: "created-template-root",
    estimateTabId: "tab-2",
  });
});

describe("reorderEstimateTreeNodes server action", () => {
  it("rejects empty, duplicate, invalid-sort, and optimistic updates before resolving D1", async () => {
    const { reorderEstimateTreeNodes } = await import("@/lib/estimates/actions");

    await expect(reorderEstimateTreeNodes("project-1", "estimate-1", { updates: [] }))
      .rejects.toThrow("At least one estimate tree node update is required.");
    await expect(reorderEstimateTreeNodes("project-1", "estimate-1", {
      updates: [
        { id: "node-1", parentId: null, sortOrder: 10 },
        { id: "node-1", parentId: null, sortOrder: 20 },
      ],
    })).rejects.toThrow("Duplicate estimate tree node update: node-1.");
    await expect(reorderEstimateTreeNodes("project-1", "estimate-1", {
      updates: [{ id: "node-1", parentId: null, sortOrder: -1 }],
    })).rejects.toThrow("Estimate tree node sort order must be a non-negative number.");
    await expect(reorderEstimateTreeNodes("project-1", "estimate-1", {
      updates: [{ id: "optimistic-node-1", parentId: null, sortOrder: 1 }],
    })).rejects.toThrow("Estimate tree update node id is invalid.");

    expect(databaseMocks.requireEstimateD1Database).not.toHaveBeenCalled();
    expect(nodeIntentMocks.reorderEstimateNodesWithHistory).not.toHaveBeenCalled();
  });

  it("passes normalized typed updates and trusted actor to one node intent, then refreshes the tree", async () => {
    const { reorderEstimateTreeNodes } = await import("@/lib/estimates/actions");
    const updates = [
      { id: "living", parentId: "ground-floor", sortOrder: 10 },
      { id: "kitchen", parentId: "site-works", sortOrder: 20 },
    ];

    const result = await reorderEstimateTreeNodes("project-1", "estimate-1", { updates });

    expect(nodeIntentMocks.reorderEstimateNodesWithHistory).toHaveBeenCalledOnce();
    expect(nodeIntentMocks.reorderEstimateNodesWithHistory).toHaveBeenCalledWith(
      DATABASE,
      ACTOR,
      {
        projectId: "project-1",
        estimateId: "estimate-1",
        updates,
        correlationId: expect.any(String),
      },
    );
    expect(repositoryMocks.getProjectEstimateTreeByEstimate).toHaveBeenCalledWith("project-1", "estimate-1");
    expect(result.tree).toEqual(DEFAULT_TREE);
    expect(nextNavigationMocks.redirect).not.toHaveBeenCalled();
  });

  it("refreshes the explicitly active tab after a reorder", async () => {
    const tabTree = [{ id: "tab-root", name: "Tab Root", kind: "group", total: "₱0.00", children: [] }];
    repositoryMocks.getEstimateTabTree.mockResolvedValue({
      project: { id: "project-1" },
      estimate: { id: "estimate-1" },
      tree: tabTree,
    });
    const { reorderEstimateTreeNodes } = await import("@/lib/estimates/actions");

    const result = await reorderEstimateTreeNodes("project-1", "estimate-1", {
      updates: [{ id: "kitchen", parentId: "site-works", sortOrder: 15.5 }],
      targetTabId: "tab-a",
    });

    expect(nodeIntentMocks.reorderEstimateNodesWithHistory.mock.calls[0]?.[2]).toMatchObject({
      updates: [{ id: "kitchen", parentId: "site-works", sortOrder: 15.5 }],
    });
    expect(repositoryMocks.getEstimateTabTree).toHaveBeenCalledWith("project-1", "estimate-1", "tab-a");
    expect(repositoryMocks.getProjectEstimateTreeByEstimate).not.toHaveBeenCalled();
    expect(result.tree).toEqual(tabTree);
  });

  it("delegates area-under-area, root-area, and legacy-parent validation to the typed owner", async () => {
    const { reorderEstimateTreeNodes } = await import("@/lib/estimates/actions");
    await reorderEstimateTreeNodes("project-1", "estimate-1", {
      updates: [{ id: "living", parentId: "kitchen", sortOrder: 10 }],
    });
    await reorderEstimateTreeNodes("project-1", "estimate-1", {
      updates: [{ id: "kitchen", parentId: null, sortOrder: 10 }],
    });
    await reorderEstimateTreeNodes("project-1", "estimate-1", {
      updates: [{ id: "master-bedroom", parentId: "legacy-level", sortOrder: 20 }],
    });

    expect(nodeIntentMocks.reorderEstimateNodesWithHistory.mock.calls.map((call) => call[2].updates)).toEqual([
      [{ id: "living", parentId: "kitchen", sortOrder: 10 }],
      [{ id: "kitchen", parentId: null, sortOrder: 10 }],
      [{ id: "master-bedroom", parentId: "legacy-level", sortOrder: 20 }],
    ]);
  });

  it("sanitizes typed-owner topology and persistence errors without refreshing", async () => {
    nodeIntentMocks.reorderEstimateNodesWithHistory.mockRejectedValueOnce(new Error("cycle detected"));
    const { reorderEstimateTreeNodes } = await import("@/lib/estimates/actions");

    await expect(reorderEstimateTreeNodes("project-1", "estimate-1", {
      updates: [{ id: "node-1", parentId: null, sortOrder: 10 }],
    })).rejects.toHaveProperty("message", "Could not reorder estimate tree.");
    expect(repositoryMocks.getProjectEstimateTreeByEstimate).not.toHaveBeenCalled();
  });
});

describe("estimate sheet mass deletion action contract", () => {
  it("uses typed preview/execute owners and retains no retired dispatcher action names", () => {
    const actions = readFileSync(join(process.cwd(), "src/lib/estimates/actions.ts"), "utf8");

    expect(actions).toContain("previewBulkDeleteEstimateSheetsIntent(database, currentUser");
    expect(actions).toContain("executeBulkDeleteEstimateSheetsIntent(database, currentUser");
    expect(actions).not.toMatch(/preview_bulk_delete_estimate_sheets|execute_bulk_delete_estimate_sheets/);
    expect(actions).not.toContain("export async function deleteEstimateSheetsBulk");
  });
});

describe("estimate node create, rename, delete, and restore adapters", () => {
  it("creates through the typed owner without accepting a caller-computed sort order", async () => {
    const formData = new FormData();
    formData.set("name", "New Bedroom");
    formData.set("kind", "area");
    formData.set("parentId", "legacy-level");
    const { createEstimateNode } = await import("@/lib/estimates/actions");

    const result = await createEstimateNode("project-1", "estimate-1", formData);

    expect(nodeIntentMocks.createEstimateNodeWithHistory).toHaveBeenCalledWith(DATABASE, ACTOR, {
      projectId: "project-1",
      estimateId: "estimate-1",
      parentNodeId: "legacy-level",
      estimateTabId: null,
      kind: "area",
      name: "New Bedroom",
      correlationId: expect.any(String),
    });
    expect(nodeIntentMocks.createEstimateNodeWithHistory.mock.calls[0]?.[2]).not.toHaveProperty("sortOrder");
    expect(result).toEqual({ nodeId: "new-node", name: "New Bedroom", kind: "area", parentId: "legacy-level" });
    expect(nextCacheMocks.revalidatePath).not.toHaveBeenCalled();
    expect(nextNavigationMocks.redirect).not.toHaveBeenCalled();
  });

  it("passes an explicit root tab and sanitizes a create failure without rollback writes", async () => {
    const formData = new FormData();
    formData.set("name", "Site Works");
    formData.set("kind", "group");
    formData.set("estimateTabId", "tab-2");
    const { createEstimateNode } = await import("@/lib/estimates/actions");

    await createEstimateNode("project-1", "estimate-1", formData);
    expect(nodeIntentMocks.createEstimateNodeWithHistory.mock.calls[0]?.[2]).toMatchObject({
      parentNodeId: null,
      estimateTabId: "tab-2",
    });

    nodeIntentMocks.createEstimateNodeWithHistory.mockRejectedValueOnce(new Error("node insert failed"));
    await expect(createEstimateNode("project-1", "estimate-1", formData))
      .rejects.toHaveProperty("message", "Could not create estimate tree node.");
    expect(nodeIntentMocks.deleteEstimateNodesWithHistory).not.toHaveBeenCalled();
  });

  it("trims rename input and returns the minimal reconciliation patch", async () => {
    const { renameEstimateNode } = await import("@/lib/estimates/actions");
    const result = await renameEstimateNode("project-1", "estimate-1", "node-1", "  Kitchen  ");

    expect(nodeIntentMocks.renameEstimateNodeWithHistory).toHaveBeenCalledWith(DATABASE, ACTOR, {
      projectId: "project-1",
      estimateId: "estimate-1",
      nodeId: "node-1",
      name: "Kitchen",
      correlationId: expect.any(String),
    });
    expect(result).toEqual({ nodeId: "node-1", name: "Kitchen" });
    expect(nextCacheMocks.revalidatePath).not.toHaveBeenCalled();

    await expect(renameEstimateNode("project-1", "estimate-1", "node-1", "   "))
      .rejects.toThrow("Estimate tree node name is required.");
  });

  it("deletes one scoped node through the typed owner and returns refreshed counts", async () => {
    const { deleteEstimateNode } = await import("@/lib/estimates/actions");
    const result = await deleteEstimateNode("project-1", "estimate-1", "node-1");

    expect(nodeIntentMocks.deleteEstimateNodesWithHistory).toHaveBeenCalledWith(DATABASE, ACTOR, {
      projectId: "project-1",
      estimateId: "estimate-1",
      nodeIds: ["node-1"],
      correlationId: expect.any(String),
    });
    expect(result).toMatchObject({
      eventId: "delete-event",
      deletedNodeIds: ["node-1"],
      deletedNodeCount: 1,
      deletedRowCount: 2,
      fallbackNodeId: "fallback-node",
      tree: DEFAULT_TREE,
    });
  });

  it("deduplicates selected roots, validates every scoped node, and deletes one subtree", async () => {
    const currentTree = [{
      id: "parent",
      children: [{ id: "child", children: [] }],
    }];
    repositoryMocks.getProjectEstimateTreeByEstimate
      .mockResolvedValueOnce({ project: { id: "project-1" }, estimate: { id: "estimate-1" }, tree: currentTree })
      .mockResolvedValueOnce({ project: { id: "project-1" }, estimate: { id: "estimate-1" }, tree: DEFAULT_TREE });
    nodeIntentMocks.deleteEstimateNodesWithHistory.mockResolvedValueOnce({
      eventId: "bulk-delete-event",
      deletedNodeIds: ["parent", "child"],
      deletedNodeCount: 2,
      deletedRowCount: 0,
      fallbackNodeId: null,
    });
    const { deleteEstimateNodesBulk } = await import("@/lib/estimates/actions");

    const result = await deleteEstimateNodesBulk("project-1", "estimate-1", ["parent", "child", "parent"]);

    expect(nodeIntentMocks.getEstimateNodeForProject).toHaveBeenCalledTimes(2);
    expect(nodeIntentMocks.deleteEstimateNodesWithHistory.mock.calls[0]?.[2]).toMatchObject({ nodeIds: ["parent"] });
    expect(result.deletedNodeIds).toEqual(["parent", "child"]);
  });

  it("rejects bulk delete before mutation when a selected node is outside the estimate", async () => {
    nodeIntentMocks.getEstimateNodeForProject
      .mockResolvedValueOnce({ id: "node-1" })
      .mockResolvedValueOnce(null);
    const { deleteEstimateNodesBulk } = await import("@/lib/estimates/actions");

    await expect(deleteEstimateNodesBulk("project-1", "estimate-1", ["node-1", "missing-node"]))
      .rejects.toThrow("Estimate tree node not found in the current project: missing-node.");
    expect(nodeIntentMocks.deleteEstimateNodesWithHistory).not.toHaveBeenCalled();
  });

  it("restores through the typed owner and refreshes the requested tab", async () => {
    const { restoreDeletedEstimateNodes } = await import("@/lib/estimates/actions");
    const result = await restoreDeletedEstimateNodes({
      projectId: "project-1",
      estimateId: "estimate-1",
      sourceEventId: "delete-event",
      nodeIds: ["node-1", "node-1"],
      targetTabId: "tab-2",
      mutationId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    });

    expect(nodeIntentMocks.restoreDeletedEstimateNodesWithHistory).toHaveBeenCalledWith(DATABASE, ACTOR, {
      projectId: "project-1",
      estimateId: "estimate-1",
      sourceEventId: "delete-event",
      nodeIds: ["node-1"],
      correlationId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    });
    expect(repositoryMocks.getEstimateTabTree).toHaveBeenCalledWith("project-1", "estimate-1", "tab-2");
    expect(result).toMatchObject({ eventId: "restore-event", tree: DEFAULT_TREE });
  });

  it("contains no redirect or scalar-route revalidation in rename/delete adapters", () => {
    const source = readFileSync(join(process.cwd(), "src/lib/estimates/actions.ts"), "utf8");
    const renameStart = source.indexOf("export async function renameEstimateNode");
    const deleteStart = source.indexOf("export async function deleteEstimateNode");
    const afterDeleteStart = source.indexOf("export async function insertEstimateRowItemFromLibrary");

    expect(source.slice(renameStart, deleteStart)).not.toContain("redirect(");
    expect(source.slice(renameStart, deleteStart)).not.toContain("revalidatePath(");
    expect(source.slice(deleteStart, afterDeleteStart)).not.toContain("redirect(");
  });
});

describe("estimate template insertion adapters", () => {
  it("inserts a persisted template through one typed owner and ignores caller-forged template data", async () => {
    const { insertEstimateTemplateIntoEstimate } = await import("@/lib/estimates/actions");
    const result = await insertEstimateTemplateIntoEstimate({
      projectId: "project-1",
      estimateId: "estimate-1",
      targetParentNodeId: "parent-group",
      templateId: "template-1",
      intentId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      template: { id: "forged-template" },
    } as never);

    expect(templateIntentMocks.insertEstimateTemplateIntoEstimateWithHistory).toHaveBeenCalledOnce();
    expect(templateIntentMocks.insertEstimateTemplateIntoEstimateWithHistory).toHaveBeenCalledWith(DATABASE, ACTOR, {
      projectId: "project-1",
      estimateId: "estimate-1",
      targetParentNodeId: "parent-group",
      templateId: "template-1",
      unavailableSourcePolicy: "cancel",
      mode: "linked",
      correlationId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    });
    expect(templateIntentMocks.insertEstimateTemplateIntoEstimateWithHistory.mock.calls[0]?.[2])
      .not.toHaveProperty("template");
    expect(result).toEqual({
      status: "inserted",
      mode: "linked",
      tree: DEFAULT_TREE,
      insertedRootNodeIds: ["new-root-node"],
    });
  });

  it("sanitizes typed template failures without best-effort cleanup or refresh", async () => {
    templateIntentMocks.insertEstimateTemplateIntoEstimateWithHistory
      .mockRejectedValueOnce(new Error("Template row items must belong to area nodes."));
    const { insertEstimateTemplateIntoEstimate } = await import("@/lib/estimates/actions");

    await expect(insertEstimateTemplateIntoEstimate({
      projectId: "project-1",
      estimateId: "estimate-1",
      targetParentNodeId: "parent-group",
      templateId: "template-1",
      intentId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    })).rejects.toHaveProperty("message", "Could not insert estimate template.");
    expect(nodeIntentMocks.deleteEstimateNodesWithHistory).not.toHaveBeenCalled();
    expect(repositoryMocks.getProjectEstimateTreeByEstimate).not.toHaveBeenCalled();
  });

  it("sanitizes edit denial from the typed template owner before any refresh", async () => {
    templateIntentMocks.insertEstimateTemplateIntoEstimateWithHistory
      .mockRejectedValueOnce(new Error("Estimate edit access denied."));
    const { insertEstimateTemplateIntoEstimate } = await import("@/lib/estimates/actions");

    await expect(insertEstimateTemplateIntoEstimate({
      projectId: "project-1",
      estimateId: "estimate-1",
      targetParentNodeId: "parent-group",
      templateId: "template-1",
      intentId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    })).rejects.toHaveProperty("message", "Could not insert estimate template.");
    expect(repositoryMocks.getProjectEstimateTreeByEstimate).not.toHaveBeenCalled();
  });

  it("copies a template-node subtree in one typed call and refreshes only its target tab", async () => {
    const { insertEstimateTemplateNodeIntoEstimate } = await import("@/lib/estimates/actions");
    const result = await insertEstimateTemplateNodeIntoEstimate({
      projectId: "project-1",
      estimateId: "estimate-1",
      targetParentNodeId: "parent-group",
      templateId: "template-1",
      templateNodeId: "template-node-1",
      intentId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      targetTabId: "tab-2",
    });

    expect(templateIntentMocks.insertEstimateTemplateNodeIntoEstimateWithHistory).toHaveBeenCalledOnce();
    expect(templateIntentMocks.insertEstimateTemplateNodeIntoEstimateWithHistory).toHaveBeenCalledWith(DATABASE, ACTOR, {
      projectId: "project-1",
      estimateId: "estimate-1",
      targetParentNodeId: "parent-group",
      templateId: "template-1",
      templateNodeId: "template-node-1",
      unavailableSourcePolicy: "cancel",
      targetTabId: "tab-2",
      correlationId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    });
    expect(nodeIntentMocks.createEstimateNodeWithHistory).not.toHaveBeenCalled();
    expect(repositoryMocks.getEstimateTabTree).toHaveBeenCalledWith("project-1", "estimate-1", "tab-2");
    expect(result).toEqual({
      status: "inserted",
      tree: DEFAULT_TREE,
      insertedRootNodeId: "created-template-root",
    });
  });
});
