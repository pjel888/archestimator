import { beforeEach, describe, expect, it, vi } from "vitest";

const PROJECT_ID = "11111111-1111-4111-8111-111111111111";
const ESTIMATE_ID = "22222222-2222-4222-8222-222222222222";
const ROW_ID = "33333333-3333-4333-8333-333333333333";
const FOLDER_ID = "44444444-4444-4444-8444-444444444444";

const authMocks = vi.hoisted(() => ({ requireCurrentUserContext: vi.fn() }));
const repositoryMocks = vi.hoisted(() => ({ getCurrentWorkspaceProject: vi.fn() }));
const supabaseMocks = vi.hoisted(() => ({ createSupabaseServerClient: vi.fn() }));
const cacheMocks = vi.hoisted(() => ({ revalidatePath: vi.fn() }));

vi.mock("@/lib/auth/session", () => authMocks);
vi.mock("@/lib/repositories/workspace-repository", () => repositoryMocks);
vi.mock("@/lib/supabase/server", () => supabaseMocks);
vi.mock("next/cache", () => cacheMocks);

describe("promoteEstimateRowToLibraryComponent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.EXPRESS_COMPONENT_PROMOTION_ENABLED = "true";
    authMocks.requireCurrentUserContext.mockResolvedValue({ userId: "55555555-5555-4555-8555-555555555555" });
    repositoryMocks.getCurrentWorkspaceProject.mockResolvedValue({ project: { id: PROJECT_ID, workspace_id: "ws-1" } });
  });

  it("calls the atomic promotion RPC and revalidates estimate/library surfaces", async () => {
    const rpc = vi.fn(async () => ({
      data: { rowId: ROW_ID, itemId: "66666666-6666-4666-8666-666666666666", activePriceOptionId: "77777777-7777-4777-8777-777777777777" },
      error: null,
    }));
    supabaseMocks.createSupabaseServerClient.mockResolvedValue({ rpc });

    const { promoteEstimateRowToLibraryComponent } = await import("@/lib/estimates/express-promotion-actions");
    const result = await promoteEstimateRowToLibraryComponent({
      projectId: PROJECT_ID,
      estimateId: ESTIMATE_ID,
      rowId: ROW_ID,
      libraryFolderId: FOLDER_ID,
      mutationId: "88888888-8888-4888-8888-888888888888",
    });

    expect(rpc).toHaveBeenCalledWith("promote_estimate_row_to_library_component", {
      target_project_id: PROJECT_ID,
      target_estimate_id: ESTIMATE_ID,
      target_row_id: ROW_ID,
      target_library_folder_id: FOLDER_ID,
      acting_user_id: "55555555-5555-4555-8555-555555555555",
      correlation_id: "88888888-8888-4888-8888-888888888888",
    });
    expect(result).toMatchObject({ rowId: ROW_ID, itemId: "66666666-6666-4666-8666-666666666666" });
    expect(cacheMocks.revalidatePath).toHaveBeenCalledWith("/workshop/library/components");
    expect(cacheMocks.revalidatePath).not.toHaveBeenCalledWith(`/workshop/projects/${PROJECT_ID}/components`);
    expect(cacheMocks.revalidatePath).toHaveBeenCalledWith(`/workshop/projects/${PROJECT_ID}/estimates/${ESTIMATE_ID}`);
  });

  it("is feature-flag gated before provider mutation", async () => {
    process.env.EXPRESS_COMPONENT_PROMOTION_ENABLED = "false";
    const rpc = vi.fn();
    supabaseMocks.createSupabaseServerClient.mockResolvedValue({ rpc });

    const { promoteEstimateRowToLibraryComponent } = await import("@/lib/estimates/express-promotion-actions");
    await expect(promoteEstimateRowToLibraryComponent({ projectId: PROJECT_ID, estimateId: ESTIMATE_ID, rowId: ROW_ID })).rejects.toThrow(/disabled/i);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("keeps the express-named export as a compatibility alias", async () => {
    const rpc = vi.fn(async () => ({
      data: { rowId: ROW_ID, itemId: "66666666-6666-4666-8666-666666666666" },
      error: null,
    }));
    supabaseMocks.createSupabaseServerClient.mockResolvedValue({ rpc });

    const { promoteExpressRowToLibraryComponent } = await import("@/lib/estimates/express-promotion-actions");
    await promoteExpressRowToLibraryComponent({ projectId: PROJECT_ID, estimateId: ESTIMATE_ID, rowId: ROW_ID });

    expect(rpc).toHaveBeenCalledWith("promote_estimate_row_to_library_component", expect.any(Object));
  });
});
