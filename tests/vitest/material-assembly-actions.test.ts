import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  database: { prepare: vi.fn() },
  delete: vi.fn(),
  rateLimit: vi.fn(),
  requireDatabase: vi.fn(),
  requireUser: vi.fn(),
  update: vi.fn(),
  bulk: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth/session", () => ({ requireCurrentUserContext: mocks.requireUser }));
vi.mock("@/lib/estimates/action-rate-limit", () => ({ assertEstimateActionRateLimit: mocks.rateLimit }));
vi.mock("@/lib/estimates/d1-intents/database", () => ({ requireEstimateD1Database: mocks.requireDatabase }));
vi.mock("@/lib/estimates/material-assembly-repository", () => ({
  createMaterialAssemblyEdge: mocks.create,
  deleteMaterialAssemblyEdge: mocks.delete,
  updateMaterialAssemblyEdge: mocks.update,
  applyMaterialAssemblyBulk: mocks.bulk,
}));

import {
  applyMaterialAssemblyBulkAction,
  createMaterialAssemblyEdgeAction,
  deleteMaterialAssemblyEdgeAction,
  updateMaterialAssemblyEdgeAction,
} from "@/lib/estimates/material-assembly-actions";

const actor = { role: "member", userId: "user-1" };
const createInput = {
  childRowItemId: "child-row",
  contributionScopeId: "scope-1",
  edgeId: "edge-1",
  estimateId: "estimate-1",
  estimateTabId: "tab-1",
  expectedContributionRevision: 1,
  intentId: "intent-1",
  isIncluded: true,
  mode: "required" as const,
  parentRowItemId: "parent-row",
  projectId: "project-1",
  quantityRule: { factor: 1, kind: "per-parent", schemaVersion: 1 },
};

beforeEach(() => {
  mocks.create.mockReset().mockResolvedValue({ kind: "accessory_edge_created" });
  mocks.delete.mockReset().mockResolvedValue({ kind: "accessory_edge_deleted" });
  mocks.rateLimit.mockReset();
  mocks.requireDatabase.mockReset().mockResolvedValue(mocks.database);
  mocks.requireUser.mockReset().mockResolvedValue(actor);
  mocks.update.mockReset().mockResolvedValue({ kind: "accessory_edge_updated" });
  mocks.bulk.mockReset().mockResolvedValue({ kind: "material_assembly_bulk_applied" });
});

describe("material assembly actions", () => {
  it("provides authenticated actor, D1, and estimate mutation rate limiting on create", async () => {
    await createMaterialAssemblyEdgeAction(createInput);

    expect(mocks.rateLimit).toHaveBeenCalledWith({
      resourceId: createInput.estimateId,
      surface: "estimate-mutation",
      userId: actor.userId,
    });
    expect(mocks.create).toHaveBeenCalledWith({
      ...createInput,
      actor,
      database: mocks.database,
    });
  });

  it("forwards update CAS fields through the same authorization boundary", async () => {
    const input = { ...createInput, expectedEdgeRevision: 2 };
    await updateMaterialAssemblyEdgeAction(input);
    expect(mocks.update).toHaveBeenCalledWith({ ...input, actor, database: mocks.database });
  });

  it("forwards delete CAS fields without client-controlled actor or database", async () => {
    const input = {
      contributionScopeId: createInput.contributionScopeId,
      edgeId: createInput.edgeId,
      estimateId: createInput.estimateId,
      estimateTabId: createInput.estimateTabId,
      expectedContributionRevision: 3,
      expectedEdgeRevision: 2,
      intentId: createInput.intentId,
      projectId: createInput.projectId,
    };
    await deleteMaterialAssemblyEdgeAction(input);
    expect(mocks.delete).toHaveBeenCalledWith({ ...input, actor, database: mocks.database });
  });

  it("forwards one bulk assembly intent through one authenticated action boundary", async () => {
    const input = {
      contributionScopeId: createInput.contributionScopeId,
      estimateId: createInput.estimateId,
      estimateTabId: createInput.estimateTabId,
      expectedContributionRevision: 3,
      intentId: createInput.intentId,
      projectId: createInput.projectId,
      operation: {
        kind: "remove_roles" as const,
        changedRowItemIds: ["parent-row", "child-row"],
        groups: [],
        optionalRows: [],
        edges: [{ edgeId: "edge-1", expectedEdgeRevision: 2 }],
      },
    };
    await applyMaterialAssemblyBulkAction(input);
    expect(mocks.bulk).toHaveBeenCalledOnce();
    expect(mocks.bulk).toHaveBeenCalledWith({ ...input, actor, database: mocks.database });
  });

  it("does not call the repository when session resolution fails", async () => {
    mocks.requireUser.mockRejectedValueOnce(new Error("Unauthorized"));
    await expect(createMaterialAssemblyEdgeAction(createInput)).rejects.toThrow("Unauthorized");
    expect(mocks.create).not.toHaveBeenCalled();
  });
});
