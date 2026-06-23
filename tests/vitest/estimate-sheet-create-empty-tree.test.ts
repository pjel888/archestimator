import { beforeEach, describe, expect, it, vi } from "vitest";

const PROJECT_ID = "22222222-2222-4222-8222-222222222222";
const ESTIMATE_ID = "33333333-3333-4333-8333-333333333333";
const TAB_ID = "44444444-4444-4444-8444-444444444444";
const USER_ID = "55555555-5555-4555-8555-555555555555";

const getCurrentWorkspaceProject = vi.hoisted(() => vi.fn());
const requireCurrentUserContext = vi.hoisted(() => vi.fn());
const createSupabaseServerClient = vi.hoisted(() => vi.fn());
const revalidatePath = vi.hoisted(() => vi.fn());
const redirect = vi.hoisted(() => vi.fn());

vi.mock("@/lib/repositories/workspace-repository", () => ({
  getCurrentWorkspaceProject,
  getEstimateTabTree: vi.fn(),
  getEstimateTabs: vi.fn(),
  getProjectEstimateTreeByEstimate: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  requireCurrentUserContext,
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient,
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
      if (table === "estimates" && insertedPayload) return { data: estimate, error: null };
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

function createSupabaseMock() {
  const inserts: InsertCall[] = [];
  const from = vi.fn((table: string) => createQuery(table, inserts));
  const rpc = vi.fn(async (fn: string) => {
    if (fn === "can_edit_project") return { data: true, error: null };
    return { data: null, error: null };
  });

  return {
    client: { from, rpc },
    from,
    inserts,
    rpc,
  };
}

describe("estimate sheet empty-tree creation", () => {
  beforeEach(() => {
    getCurrentWorkspaceProject.mockReset();
    requireCurrentUserContext.mockReset();
    createSupabaseServerClient.mockReset();
    revalidatePath.mockReset();
    redirect.mockReset();

    getCurrentWorkspaceProject.mockResolvedValue({ workspace: { id: "workspace-1" }, project });
    requireCurrentUserContext.mockResolvedValue({ userId: USER_ID });
  });

  it("creates a default tab without seeding estimate nodes", async () => {
    const supabase = createSupabaseMock();
    createSupabaseServerClient.mockResolvedValue(supabase.client);

    const result = await createEstimateSheetDraft(PROJECT_ID);

    expect(supabase.rpc).toHaveBeenCalledWith("can_edit_project", { target_project_id: PROJECT_ID });
    expect(supabase.inserts.map((call) => call.table)).toEqual(["estimates", "estimate_tabs"]);
    expect(supabase.inserts.some((call) => call.table === "estimate_nodes")).toBe(false);
    expect(result.row.firstNodeId).toBeNull();
    expect(result.firstNodeId).toBeNull();
    expect(result.row.nodeCount).toBe(0);
    expect(result.row.rowItemCount).toBe(0);
    expect(result.estimateId).toBe(ESTIMATE_ID);
    expect(result.sheetCode).toBe("ES-001");
    expect(revalidatePath).toHaveBeenCalledWith(`/workshop/projects/${PROJECT_ID}/estimates`);
  });

  it("redirects legacy form creates to the estimate route when no first node exists", async () => {
    const supabase = createSupabaseMock();
    createSupabaseServerClient.mockResolvedValue(supabase.client);
    const formData = new FormData();
    formData.set("name", "Initial Estimate");

    await createEstimate(PROJECT_ID, formData);

    expect(supabase.inserts.map((call) => call.table)).toEqual(["estimates", "estimate_tabs"]);
    expect(supabase.inserts.some((call) => call.table === "estimate_nodes")).toBe(false);
    expect(redirect).toHaveBeenCalledWith(`/workshop/projects/${PROJECT_ID}/estimates/${ESTIMATE_ID}`);
  });
});
