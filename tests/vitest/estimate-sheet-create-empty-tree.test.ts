import { beforeEach, describe, expect, it, vi } from "vitest";

const PROJECT_ID = "22222222-2222-4222-8222-222222222222";
const ESTIMATE_ID = "33333333-3333-4333-8333-333333333333";
const TAB_ID = "44444444-4444-4444-8444-444444444444";
const USER_ID = "55555555-5555-4555-8555-555555555555";
const CREATED_PROJECT_ID = "66666666-6666-4666-8666-666666666666";

const getCurrentWorkspaceProject = vi.hoisted(() => vi.fn());
const getCurrentWorkspaceProjectForEstimate = vi.hoisted(() => vi.fn());
const requireCurrentUserContext = vi.hoisted(() => vi.fn());
const requireEstimateD1Database = vi.hoisted(() => vi.fn());
const canEditProject = vi.hoisted(() => vi.fn());
const createEstimateRecordWithDefaultTab = vi.hoisted(() => vi.fn());
const getNextEstimateSheetCode = vi.hoisted(() => vi.fn());
const revalidatePath = vi.hoisted(() => vi.fn());
const redirect = vi.hoisted(() => vi.fn());
const database = { prepare: vi.fn() };

vi.mock("@/lib/repositories/workspace-repository", () => ({
  clearEstimateRouteContextProcessCache: vi.fn(),
  getCurrentWorkspaceProject,
  getCurrentWorkspaceProjectForEstimate,
  getEstimateTabTree: vi.fn(),
  getEstimateTabs: vi.fn(),
  getProjectEstimateTreeByEstimate: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  requireCurrentUserContext,
}));

vi.mock("@/lib/estimates/d1-intents/database", () => ({
  requireEstimateD1Database,
}));

vi.mock("@/lib/estimates/d1-intents/access", () => ({
  canEditEstimate: vi.fn(),
  canEditProject,
  getEstimateActivityRetentionMetrics: vi.fn(),
  validateEstimateRowImageAsset: vi.fn(),
}));

vi.mock("@/lib/estimates/d1-intents/estimate-records", () => ({
  createEstimateRecordWithDefaultTab,
  duplicateEstimateRecordGraph: vi.fn(),
  getEstimateRecordForProject: vi.fn(),
  getNextEstimateSheetCode,
  updateEstimateDetailsWithHistory: vi.fn(),
  updateEstimateSheetAdjustmentWithHistory: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath,
}));

vi.mock("next/navigation", () => ({
  redirect,
}));

import { createEstimate, createEstimateSheetDraft } from "@/lib/estimates/actions";

const project = {
  id: PROJECT_ID,
  workspace_id: "workspace-1",
  created_by: USER_ID,
  name: "Lewis Residence",
  client_name: null,
  location: null,
  project_code: null,
  currency_code: "PHP",
  metadata: {},
  created_at: "2026-06-23T00:00:00.000Z",
  updated_at: "2026-06-23T00:00:00.000Z",
};

const estimate = {
  id: ESTIMATE_ID,
  project_id: PROJECT_ID,
  created_by: USER_ID,
  name: "ES-001 Estimate",
  notes: null,
  project_budget: null,
  sheet_code: "ES-001",
  currency_code: "PHP",
  metadata: {},
  created_at: "2026-06-23T00:00:00.000Z",
  updated_at: "2026-06-23T00:00:00.000Z",
};

describe("estimate sheet empty-tree creation", () => {
  beforeEach(() => {
    getCurrentWorkspaceProject.mockReset();
    requireCurrentUserContext.mockReset();
    requireEstimateD1Database.mockReset();
    canEditProject.mockReset();
    createEstimateRecordWithDefaultTab.mockReset();
    getNextEstimateSheetCode.mockReset();
    revalidatePath.mockReset();
    redirect.mockReset();

    getCurrentWorkspaceProject.mockResolvedValue({ workspace: { id: "workspace-1" }, project });
    requireCurrentUserContext.mockResolvedValue({ userId: USER_ID, role: "member" });
    requireEstimateD1Database.mockResolvedValue(database);
    canEditProject.mockResolvedValue(true);
    getNextEstimateSheetCode.mockResolvedValue("ES-001");
    createEstimateRecordWithDefaultTab.mockResolvedValue({ estimate, firstNodeId: null, nodeCount: 0 });
  });

  it("creates a default tab without seeding estimate nodes", async () => {
    const result = await createEstimateSheetDraft(PROJECT_ID);

    expect(canEditProject).toHaveBeenCalledWith(database, expect.objectContaining({ userId: USER_ID }), PROJECT_ID);
    expect(createEstimateRecordWithDefaultTab).toHaveBeenCalledWith(
      database,
      expect.objectContaining({ userId: USER_ID }),
      expect.objectContaining({ project, name: "ES-001 Estimate", sheetCode: "ES-001" }),
    );
    expect(result.row.firstNodeId).toBeNull();
    expect(result.firstNodeId).toBeNull();
    expect(result.row.nodeCount).toBe(0);
    expect(result.row.rowItemCount).toBe(0);
    expect(result.estimateId).toBe(ESTIMATE_ID);
    expect(result.sheetCode).toBe("ES-001");
    expect(revalidatePath).toHaveBeenCalledWith(`/workshop/projects/${PROJECT_ID}/estimates`);
  });

  it("creates a draft estimate on a newly returned D1 project without default-workspace fallback", async () => {
    const createdProject = {
      ...project,
      id: CREATED_PROJECT_ID,
      workspace_id: "created-project-workspace",
      created_by: USER_ID,
    };
    getCurrentWorkspaceProject.mockResolvedValue({
      workspace: { id: createdProject.workspace_id },
      project: createdProject,
    });
    createEstimateRecordWithDefaultTab.mockResolvedValue({
      estimate: { ...estimate, project_id: CREATED_PROJECT_ID },
      firstNodeId: null,
      nodeCount: 0,
    });

    await createEstimateSheetDraft(CREATED_PROJECT_ID);

    expect(getCurrentWorkspaceProject).toHaveBeenCalledWith(CREATED_PROJECT_ID);
    expect(canEditProject).toHaveBeenCalledWith(database, expect.objectContaining({ userId: USER_ID }), CREATED_PROJECT_ID);
    expect(createEstimateRecordWithDefaultTab).toHaveBeenCalledWith(
      database,
      expect.objectContaining({ userId: USER_ID }),
      expect.objectContaining({ project: createdProject, sheetCode: "ES-001" }),
    );
    expect(revalidatePath).toHaveBeenCalledWith(`/workshop/projects/${CREATED_PROJECT_ID}/estimates`);
  });

  it("redirects legacy form creates to the estimate route when no first node exists", async () => {
    const formData = new FormData();
    formData.set("name", "Initial Estimate");

    await createEstimate(PROJECT_ID, formData);

    expect(createEstimateRecordWithDefaultTab).toHaveBeenCalledWith(
      database,
      expect.objectContaining({ userId: USER_ID }),
      expect.objectContaining({ project, name: "Initial Estimate", sheetCode: "ES-001" }),
    );
    expect(redirect).toHaveBeenCalledWith(`/workshop/projects/${PROJECT_ID}/estimates/${ESTIMATE_ID}`);
  });

  it("denies legacy form creates for project viewers before any estimate writes", async () => {
    canEditProject.mockResolvedValue(false);
    const formData = new FormData();
    formData.set("name", "Viewer Attempt");

    await expect(createEstimate(PROJECT_ID, formData)).rejects.toThrow(/edit access denied/i);

    expect(canEditProject).toHaveBeenCalledWith(database, expect.objectContaining({ userId: USER_ID }), PROJECT_ID);
    expect(createEstimateRecordWithDefaultTab).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });
});
