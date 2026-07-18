import { beforeEach, describe, expect, it, vi } from "vitest";

const repositoryMocks = vi.hoisted(() => ({
  ensureDefaultWorkspace: vi.fn(),
  getCurrentWorkspaceProject: vi.fn(),
  getCurrentWorkspaceProjectForEstimate: vi.fn(),
  getEstimateTabTree: vi.fn(),
  getProjectEstimateTreeByEstimate: vi.fn(),
  listCurrentWorkspaceProjects: vi.fn(),
  listProjectEstimateSheets: vi.fn(),
}));

const d1Mocks = vi.hoisted(() => ({
  getCloudflareD1Database: vi.fn(),
}));

const authzMocks = vi.hoisted(() => {
  const canEditEstimateInD1 = vi.fn();
  const canEditProjectInD1 = vi.fn();
  return {
    canEditEstimateInD1,
    canEditEstimateStrictInD1: canEditEstimateInD1,
    canEditProjectInD1,
    canEditProjectStrictInD1: canEditProjectInD1,
    isWorkspaceEditorInD1: vi.fn(),
    isWorkspaceMemberInD1: vi.fn(),
  };
});

const authMocks = vi.hoisted(() => ({
  requireCurrentUserContext: vi.fn(),
}));

const nextCacheMocks = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/repositories/workspace-repository", () => repositoryMocks);
vi.mock("@/lib/cloudflare/d1", () => d1Mocks);
vi.mock("@/lib/authz/d1-access", () => authzMocks);
vi.mock("@/lib/auth/session", () => authMocks);
vi.mock("next/cache", () => nextCacheMocks);

const WORKSPACE_ID = "00000000-0000-4000-8000-000000000001";
const USER_ID = "00000000-0000-4000-8000-000000000002";
const PROJECT_ID = "00000000-0000-4000-8000-000000000003";
const ESTIMATE_ID = "00000000-0000-4000-8000-000000000004";
const TARGET_PARENT_NODE_ID = "00000000-0000-4000-8000-000000000005";
const TEMPLATE_ID = "00000000-0000-4000-8000-000000000006";
const TEMPLATE_NODE_ID = "00000000-0000-4000-8000-000000000007";
const SHARED_WORKSPACE_ID = "00000000-0000-4000-8000-000000000008";

function queryResult(data: unknown) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    order: vi.fn(() => query),
    maybeSingle: vi.fn(async () => ({ data, error: null })),
    then: (resolve: (value: { data: unknown; error: null }) => unknown) => resolve({ data, error: null }),
  };
  return query;
}

function createD1Fixture(options: {
  firstResults?: unknown[];
  allResults?: unknown[][];
} = {}) {
  const firstResults = [...(options.firstResults ?? [])];
  const allResults = [...(options.allResults ?? [])];
  const statements: Array<{ sql: string; values: unknown[] }> = [];
  const database = {
    batch: vi.fn(async (preparedStatements: unknown[]) => preparedStatements.map(() => ({ success: true }))),
    prepare: vi.fn((sql: string) => ({
      bind: vi.fn((...values: unknown[]) => {
        statements.push({ sql, values });
        return {
          first: vi.fn(async () => firstResults.shift() ?? null),
          all: vi.fn(async () => ({ success: true, results: allResults.shift() ?? [] })),
          run: vi.fn(async () => ({ success: true, meta: { changes: 1 } })),
        };
      }),
    })),
    statements,
  };
  d1Mocks.getCloudflareD1Database.mockResolvedValue(database);
  return database;
}

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  repositoryMocks.ensureDefaultWorkspace.mockResolvedValue({
    workspace: { id: WORKSPACE_ID },
    profile: { id: USER_ID },
  });
  repositoryMocks.getCurrentWorkspaceProject.mockResolvedValue({ project: { id: PROJECT_ID } });
  repositoryMocks.getCurrentWorkspaceProjectForEstimate.mockResolvedValue({ project: { id: PROJECT_ID } });
  repositoryMocks.getProjectEstimateTreeByEstimate.mockResolvedValue({
    project: { id: PROJECT_ID },
    estimate: { id: ESTIMATE_ID },
    tree: [],
  });
  authMocks.requireCurrentUserContext.mockResolvedValue({ userId: USER_ID, profile: { id: USER_ID } });
  authzMocks.canEditEstimateInD1.mockResolvedValue(true);
  authzMocks.isWorkspaceEditorInD1.mockResolvedValue(true);
  authzMocks.isWorkspaceMemberInD1.mockResolvedValue(true);
});

describe("library estimate insert-target authorization", () => {
  it("resolves template insert targets only after proving the estimate belongs to the target project", async () => {
    const d1 = createD1Fixture({ firstResults: [null] });
    const { resolveEstimateTemplateInsertTarget } = await import("@/lib/component-library/actions");

    await expect(
      resolveEstimateTemplateInsertTarget({ projectId: PROJECT_ID, estimateId: ESTIMATE_ID }),
    ).rejects.toThrow("Estimate not found in the current workspace.");

    expect(d1.statements).toHaveLength(1);
    expect(d1.statements[0]?.sql).toContain("FROM estimates estimate");
    expect(d1.statements[0]?.sql).not.toContain("project.workspace_id = ?");
    expect(d1.statements[0]?.values).toEqual([ESTIMATE_ID, PROJECT_ID]);
    expect(authzMocks.canEditEstimateInD1).not.toHaveBeenCalled();
  });

  it("resolves template insert targets for shared project estimates outside the default workspace", async () => {
    const d1 = createD1Fixture({
      firstResults: [{
        id: ESTIMATE_ID,
        project_id: PROJECT_ID,
        workspace_id: SHARED_WORKSPACE_ID,
      }],
      allResults: [[{
        id: TARGET_PARENT_NODE_ID,
        parent_id: null,
        kind: "group",
        name: "Shared Root",
      }]],
    });
    const { resolveEstimateTemplateInsertTarget } = await import("@/lib/component-library/actions");

    const result = await resolveEstimateTemplateInsertTarget({ projectId: PROJECT_ID, estimateId: ESTIMATE_ID });

    expect(result).toEqual({
      targetParentNodeId: TARGET_PARENT_NODE_ID,
      targetParentNodeName: "Shared Root",
      targetParentNodeKind: "group",
      targetParentNodePath: ["Shared Root"],
    });
    expect(d1.statements[0]?.values).toEqual([ESTIMATE_ID, PROJECT_ID]);
    expect(d1.statements[0]?.values).not.toContain(WORKSPACE_ID);
    expect(d1.statements[1]?.values).toEqual([ESTIMATE_ID]);
    expect(authzMocks.canEditEstimateInD1).toHaveBeenCalledWith(d1, ESTIMATE_ID, expect.objectContaining({ userId: USER_ID }));
  });

  it("denies a viewer before resolving template insert target nodes", async () => {
    const d1 = createD1Fixture({
      firstResults: [{
        id: ESTIMATE_ID,
        project_id: PROJECT_ID,
        workspace_id: WORKSPACE_ID,
      }],
    });
    authzMocks.canEditEstimateInD1.mockResolvedValue(false);
    const { resolveEstimateTemplateInsertTarget } = await import("@/lib/component-library/actions");

    await expect(
      resolveEstimateTemplateInsertTarget({ projectId: PROJECT_ID, estimateId: ESTIMATE_ID }),
    ).rejects.toThrow("Estimate edit access denied.");

    expect(d1.statements).toHaveLength(1);
    expect(d1.statements[0]?.sql).toContain("FROM estimates estimate");
    expect(d1.statements[0]?.values).toEqual([ESTIMATE_ID, PROJECT_ID]);
    expect(authzMocks.canEditEstimateInD1).toHaveBeenCalledWith(d1, ESTIMATE_ID, expect.objectContaining({ userId: USER_ID }));
  });

  it("denies a viewer before inserting a whole template into an estimate", async () => {
    const d1 = createD1Fixture();
    authzMocks.canEditEstimateInD1.mockResolvedValue(false);
    const { insertEstimateTemplateIntoEstimate } = await import("@/lib/estimates/actions");

    await expect(
      insertEstimateTemplateIntoEstimate({
        projectId: PROJECT_ID,
        estimateId: ESTIMATE_ID,
        targetParentNodeId: TARGET_PARENT_NODE_ID,
        templateId: TEMPLATE_ID,
        intentId: "77777777-7777-4777-8777-777777777777",
      }),
    ).rejects.toThrow("Estimate edit access denied.");

    expect(authzMocks.canEditEstimateInD1).toHaveBeenCalledWith(
      expect.anything(),
      ESTIMATE_ID,
      expect.objectContaining({ userId: USER_ID }),
    );
    expect(d1.statements).toHaveLength(0);
    expect(repositoryMocks.getProjectEstimateTreeByEstimate).not.toHaveBeenCalled();
  });

  it("denies a viewer before inserting a template node subtree into an estimate", async () => {
    const d1 = createD1Fixture();
    authzMocks.canEditEstimateInD1.mockResolvedValue(false);
    const { insertEstimateTemplateNodeIntoEstimate } = await import("@/lib/estimates/actions");

    await expect(
      insertEstimateTemplateNodeIntoEstimate({
        projectId: PROJECT_ID,
        estimateId: ESTIMATE_ID,
        targetParentNodeId: TARGET_PARENT_NODE_ID,
        templateId: TEMPLATE_ID,
        templateNodeId: TEMPLATE_NODE_ID,
        intentId: "88888888-8888-4888-8888-888888888888",
      }),
    ).rejects.toThrow("Estimate edit access denied.");

    expect(authzMocks.canEditEstimateInD1).toHaveBeenCalledWith(
      expect.anything(),
      ESTIMATE_ID,
      expect.objectContaining({ userId: USER_ID }),
    );
    expect(d1.statements).toHaveLength(0);
    expect(repositoryMocks.getProjectEstimateTreeByEstimate).not.toHaveBeenCalled();
  });
});
