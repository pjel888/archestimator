import { beforeEach, describe, expect, it, vi } from "vitest";

const PROJECT_ID = "22222222-2222-4222-8222-222222222222";
const ESTIMATE_ID = "33333333-3333-4333-8333-333333333333";

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
  duplicateEstimateSheet,
  regenerateEstimateSheetCode,
  updateEstimateDetails,
} from "@/lib/estimates/actions";

function chain(single: unknown) {
  const c: Record<string, unknown> = {};
  for (const method of ["select", "eq", "in", "order", "is", "insert", "update"]) {
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
});
