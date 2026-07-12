import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createEstimateNode: vi.fn(),
  createEstimateSheetDraft: vi.fn(),
  createProjectRecord: vi.fn(),
  insertEstimateRowItemFromLibrary: vi.fn(),
  requireCurrentUserContext: vi.fn(),
  ensureDefaultWorkspace: vi.fn(),
  role: "member" as "owner" | "admin" | "member" | "viewer",
  existingProjectId: null as string | null,
  existingEstimateId: null as string | null,
  existingAreaId: null as string | null,
  existingRowId: null as string | null,
  preparedSql: [] as string[],
}));

vi.mock("@/lib/auth/session", () => ({
  requireCurrentUserContext: mocks.requireCurrentUserContext,
}));

vi.mock("@/lib/repositories/workspace-repository", () => ({
  ensureDefaultWorkspace: mocks.ensureDefaultWorkspace,
}));

vi.mock("@/lib/projects/actions", () => ({
  createProjectRecord: mocks.createProjectRecord,
}));

vi.mock("@/lib/estimates/actions", () => ({
  createEstimateNode: mocks.createEstimateNode,
  createEstimateSheetDraft: mocks.createEstimateSheetDraft,
  insertEstimateRowItemFromLibrary: mocks.insertEstimateRowItemFromLibrary,
}));

vi.mock("@/lib/cloudflare/d1", () => ({
  getCloudflareD1Database: vi.fn(async () => ({
    prepare: (sql: string) => {
      mocks.preparedSql.push(sql);
      return {
        bind: (..._values: unknown[]) => ({
          first: async () => {
            if (sql.includes("FROM workspace_members")) return { role: mocks.role };
            if (sql.includes("FROM projects")) return mocks.existingProjectId ? { id: mocks.existingProjectId } : null;
            if (sql.includes("FROM estimates")) return mocks.existingEstimateId ? { id: mocks.existingEstimateId } : null;
            if (sql.includes("FROM estimate_nodes")) return mocks.existingAreaId ? { id: mocks.existingAreaId } : null;
            if (sql.includes("FROM estimate_row_items")) return mocks.existingRowId ? { id: mocks.existingRowId } : null;
            return null;
          },
          run: async () => ({ success: true, meta: { changes: 1 } }),
        }),
      };
    },
  })),
}));

import { startGuidedSample } from "@/lib/onboarding/activation-actions";
import {
  GUIDED_SAMPLE_AREA_NAME,
  GUIDED_SAMPLE_ESTIMATE_NAME,
  GUIDED_SAMPLE_PROJECT_NAME,
  GUIDED_SAMPLE_ROW_MATERIAL,
} from "@/lib/onboarding/guided-sample";

describe("startGuidedSample", () => {
  beforeEach(() => {
    mocks.role = "member";
    mocks.existingProjectId = null;
    mocks.existingEstimateId = null;
    mocks.existingAreaId = null;
    mocks.existingRowId = null;
    mocks.preparedSql.length = 0;
    mocks.createProjectRecord.mockClear();
    mocks.createEstimateSheetDraft.mockClear();
    mocks.createEstimateNode.mockClear();
    mocks.insertEstimateRowItemFromLibrary.mockClear();
    mocks.requireCurrentUserContext.mockResolvedValue({ userId: "user-1" });
    mocks.ensureDefaultWorkspace.mockResolvedValue({ workspace: { id: "workspace-1" } });
    mocks.createProjectRecord.mockResolvedValue({ id: "project-1" });
    mocks.createEstimateSheetDraft.mockResolvedValue({ estimateId: "estimate-1" });
    mocks.createEstimateNode.mockResolvedValue({ nodeId: "area-1" });
    mocks.insertEstimateRowItemFromLibrary.mockResolvedValue(undefined);
  });

  it("creates the safe versioned sample through existing project and estimate seams", async () => {
    await expect(startGuidedSample()).resolves.toEqual({
      projectId: "project-1",
      estimateId: "estimate-1",
      areaId: "area-1",
    });

    const projectForm = mocks.createProjectRecord.mock.calls[0]?.[0] as FormData;
    expect(projectForm.get("name")).toBe(GUIDED_SAMPLE_PROJECT_NAME);
    expect(mocks.createEstimateSheetDraft).toHaveBeenCalledWith("project-1", { name: GUIDED_SAMPLE_ESTIMATE_NAME });
    const areaForm = mocks.createEstimateNode.mock.calls[0]?.[2] as FormData;
    expect(areaForm.get("name")).toBe(GUIDED_SAMPLE_AREA_NAME);
    expect(areaForm.get("kind")).toBe("area");
    expect(mocks.insertEstimateRowItemFromLibrary).toHaveBeenCalledWith(expect.objectContaining({
      projectId: "project-1",
      estimateId: "estimate-1",
      targetNodeId: "area-1",
      libraryItem: expect.objectContaining({ material: GUIDED_SAMPLE_ROW_MATERIAL }),
    }));
    expect(mocks.preparedSql.some((sql) => sql.includes("activation_sample_version"))).toBe(true);
  });

  it("denies a viewer before any project or estimate lookup/write", async () => {
    mocks.role = "viewer";

    await expect(startGuidedSample()).rejects.toThrow(/do not have permission/i);

    expect(mocks.createProjectRecord).not.toHaveBeenCalled();
    expect(mocks.createEstimateSheetDraft).not.toHaveBeenCalled();
    expect(mocks.preparedSql).toHaveLength(1);
    expect(mocks.preparedSql[0]).toContain("FROM workspace_members");
  });

  it("resumes an existing complete sample without duplicate writes", async () => {
    mocks.existingProjectId = "project-existing";
    mocks.existingEstimateId = "estimate-existing";
    mocks.existingAreaId = "area-existing";
    mocks.existingRowId = "row-existing";

    await expect(startGuidedSample()).resolves.toEqual({
      projectId: "project-existing",
      estimateId: "estimate-existing",
      areaId: "area-existing",
    });

    expect(mocks.createProjectRecord).not.toHaveBeenCalled();
    expect(mocks.createEstimateSheetDraft).not.toHaveBeenCalled();
    expect(mocks.createEstimateNode).not.toHaveBeenCalled();
    expect(mocks.insertEstimateRowItemFromLibrary).not.toHaveBeenCalled();
  });
});
