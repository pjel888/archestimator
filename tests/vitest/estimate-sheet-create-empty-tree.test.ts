import { beforeEach, describe, expect, it, vi } from "vitest";

const PROJECT_ID = "22222222-2222-4222-8222-222222222222";
const ESTIMATE_ID = "33333333-3333-4333-8333-333333333333";
const TAB_ID = "44444444-4444-4444-8444-444444444444";
const USER_ID = "55555555-5555-4555-8555-555555555555";
const CREATED_PROJECT_ID = "66666666-6666-4666-8666-666666666666";

const getCurrentWorkspaceProject = vi.hoisted(() => vi.fn());
const getCurrentWorkspaceProjectForEstimate = vi.hoisted(() => vi.fn());
const requireCurrentUserContext = vi.hoisted(() => vi.fn());
const createEstimateActionsD1Client = vi.hoisted(() => vi.fn());
const revalidatePath = vi.hoisted(() => vi.fn());
const redirect = vi.hoisted(() => vi.fn());

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

vi.mock("@/lib/estimates/d1-action-client", () => ({
  createEstimateActionsD1Client,
}));

vi.mock("@/lib/estimates/d1-action-client", () => ({
  createEstimateActionsD1Client: vi.fn(async () => {
    const client = await createSupabaseServerClient();
    return { ...client, call: client.rpc };
  }),
}));

vi.mock("next/cache", () => ({
  revalidatePath,
}));

vi.mock("next/navigation", () => ({
  redirect,
}));

import { createEstimate, createEstimateSheetDraft } from "@/lib/estimates/actions";

type InsertCall = {
  table: string;
  payload: unknown;
};

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

function createQuery(table: string, inserts: InsertCall[]) {
  let insertedPayload: unknown;
  let selectedColumns = "";

  const query = {
    select(columns: string) {
      selectedColumns = columns;
      return query;
    },
    eq() {
      return query;
    },
    insert(payload: unknown) {
      insertedPayload = payload;
      inserts.push({ table, payload });
      return query;
    },
    async single() {
      if (table === "estimates" && insertedPayload) {
        return { data: { ...estimate, ...(insertedPayload as Record<string, unknown>) }, error: null };
      }
      if (table === "estimate_tabs" && insertedPayload) return { data: { id: TAB_ID }, error: null };
      return { data: null, error: new Error(`Unexpected single() call for ${table}`) };
    },
    then(resolve: (value: { data: unknown[]; error: null }) => unknown) {
      if (table === "estimates" && selectedColumns === "id, sheet_code") {
        return Promise.resolve(resolve({ data: [], error: null }));
      }
      return Promise.resolve(resolve({ data: [], error: null }));
    },
  };

  return query;
}

function createEstimateActionsDataStoreMock({ canEditProject = true }: { canEditProject?: boolean } = {}) {
  const inserts: InsertCall[] = [];
  const from = vi.fn((table: string) => createQuery(table, inserts));
  const rpc = vi.fn(async (fn: string) => {
    if (fn === "can_edit_project") return { data: canEditProject, error: null };
    return { data: null, error: null };
  });

  return {
    client: { from, rpc },
    from,
    inserts,
    rpc,
  };
}

function mockEstimateActionsDataStore<T extends { rpc: (name: string, args?: Record<string, unknown>) => unknown }>(store: T) {
  createEstimateActionsD1Client.mockResolvedValue({
    ...store,
    call: (name: string, args: Record<string, unknown>) => store.rpc(name, args),
  });
}

describe("estimate sheet empty-tree creation", () => {
  beforeEach(() => {
    getCurrentWorkspaceProject.mockReset();
    requireCurrentUserContext.mockReset();
    createEstimateActionsD1Client.mockReset();
    revalidatePath.mockReset();
    redirect.mockReset();

    getCurrentWorkspaceProject.mockResolvedValue({ workspace: { id: "workspace-1" }, project });
    requireCurrentUserContext.mockResolvedValue({ userId: USER_ID });
  });

  it("creates a default tab without seeding estimate nodes", async () => {
    const dataStore = createEstimateActionsDataStoreMock();
    mockEstimateActionsDataStore(dataStore.client);

    const result = await createEstimateSheetDraft(PROJECT_ID);

    expect(dataStore.rpc).toHaveBeenCalledWith("can_edit_project", { target_project_id: PROJECT_ID });
    expect(dataStore.inserts.map((call) => call.table)).toEqual(["estimates", "estimate_tabs"]);
    expect(dataStore.inserts.some((call) => call.table === "estimate_nodes")).toBe(false);
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
    const dataStore = createEstimateActionsDataStoreMock();
    mockEstimateActionsDataStore(dataStore.client);

    await createEstimateSheetDraft(CREATED_PROJECT_ID);

    expect(getCurrentWorkspaceProject).toHaveBeenCalledWith(CREATED_PROJECT_ID);
    expect(dataStore.rpc).toHaveBeenCalledWith("can_edit_project", { target_project_id: CREATED_PROJECT_ID });
    expect(dataStore.inserts).toHaveLength(2);
    expect(dataStore.inserts[0]).toMatchObject({
      table: "estimates",
      payload: {
        created_by: USER_ID,
        project_id: CREATED_PROJECT_ID,
      },
    });
    expect(dataStore.inserts[1]).toMatchObject({
      table: "estimate_tabs",
      payload: {
        created_by: USER_ID,
        estimate_id: ESTIMATE_ID,
        is_default: true,
      },
    });
    expect(revalidatePath).toHaveBeenCalledWith(`/workshop/projects/${CREATED_PROJECT_ID}/estimates`);
  });

  it("redirects legacy form creates to the estimate route when no first node exists", async () => {
    const dataStore = createEstimateActionsDataStoreMock();
    mockEstimateActionsDataStore(dataStore.client);
    const formData = new FormData();
    formData.set("name", "Initial Estimate");

    await createEstimate(PROJECT_ID, formData);

    expect(dataStore.inserts.map((call) => call.table)).toEqual(["estimates", "estimate_tabs"]);
    expect(dataStore.inserts.some((call) => call.table === "estimate_nodes")).toBe(false);
    expect(dataStore.rpc).toHaveBeenCalledWith("can_edit_project", { target_project_id: PROJECT_ID });
    expect(redirect).toHaveBeenCalledWith(`/workshop/projects/${PROJECT_ID}/estimates/${ESTIMATE_ID}`);
  });

  it("denies legacy form creates for project viewers before any estimate writes", async () => {
    const dataStore = createEstimateActionsDataStoreMock({ canEditProject: false });
    mockEstimateActionsDataStore(dataStore.client);
    const formData = new FormData();
    formData.set("name", "Viewer Attempt");

    await expect(createEstimate(PROJECT_ID, formData)).rejects.toThrow(/edit access denied/i);

    expect(dataStore.rpc).toHaveBeenCalledWith("can_edit_project", { target_project_id: PROJECT_ID });
    expect(dataStore.inserts).toEqual([]);
    expect(redirect).not.toHaveBeenCalled();
  });
});
