import { beforeEach, describe, expect, it, vi } from "vitest";

const PROJECT_ID = "11111111-1111-4111-8111-111111111111";
const ESTIMATE_ID = "22222222-2222-4222-8222-222222222222";
const ROW_ID = "33333333-3333-4333-8333-333333333333";
const FOLDER_ID = "44444444-4444-4444-8444-444444444444";
const USER_ID = "55555555-5555-4555-8555-555555555555";
const WORKSPACE_ID = "ws-1";

const authMocks = vi.hoisted(() => ({ requireAuth: vi.fn(), requireCurrentUserContext: vi.fn() }));
const d1Mocks = vi.hoisted(() => ({ getCloudflareD1Database: vi.fn() }));
const repositoryMocks = vi.hoisted(() => ({
  clearEstimateRouteContextProcessCache: vi.fn(),
}));
const cacheMocks = vi.hoisted(() => ({ revalidatePath: vi.fn() }));

vi.mock("@/lib/auth/session", () => authMocks);
vi.mock("@/lib/cloudflare/d1", () => d1Mocks);
vi.mock("@/lib/repositories/workspace-repository", () => repositoryMocks);
vi.mock("next/cache", () => cacheMocks);

type StatementRecord = {
  sql: string;
  values: unknown[];
};

function makePromotionD1Database(options: {
  canEditEstimate?: boolean;
  canManageLibrary?: boolean;
  folderExists?: boolean;
  existingPayload?: Record<string, unknown> | null;
  existingLibraryItem?: { item_id: string; active_price_option_id: string | null } | null;
} = {}) {
  const statements: StatementRecord[] = [];
  const sourceRow = {
    project_id: PROJECT_ID,
    workspace_id: WORKSPACE_ID,
    estimate_id: ESTIMATE_ID,
    row_id: ROW_ID,
    node_id: "99999999-9999-4999-8999-999999999999",
    estimate_tab_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    material: "Custom vanity",
    description: "Custom vanity row",
    supplier: "Builder",
    supplier_id: null,
    unit: "pc",
    unit_cost: 1200,
    misc_cost: 75,
    contingency_percentage: 0,
    adjustment_percentage: 0,
    source_snapshot_json: "{}",
    metadata_json: "{\"expressComponent\":{\"created\":true}}",
    source_library_item_id: null,
    link_state: "detached",
    row_revision: 2,
  };

  const readFirst = async (sql: string, values: unknown[]) => {
    if (sql.includes("SELECT payload") && sql.includes("FROM estimate_sheet_events")) {
      return options.existingPayload ? { payload: JSON.stringify(options.existingPayload) } : null;
    }
    if (sql.includes("FROM projects project") && sql.includes("JOIN estimate_row_items row_item")) {
      return values[0] === PROJECT_ID && values[1] === ESTIMATE_ID && values[2] === ROW_ID ? sourceRow : null;
    }
    if (sql.includes("LEFT JOIN estimate_sheet_access_settings")) {
      return options.canEditEstimate === false ? null : { allowed: 1 };
    }
    if (sql.includes("FROM workspace_members workspace_member")) {
      return options.canManageLibrary === false ? null : { allowed: 1 };
    }
    if (sql.includes("FROM library_folders")) {
      return options.folderExists === false ? null : { id: FOLDER_ID };
    }
    if (sql.includes("FROM cost_library_items") && sql.includes("source_estimate_row_item_id")) {
      return options.existingLibraryItem ?? null;
    }
    throw new Error(`Unexpected D1 first query: ${sql}`);
  };

  const makeBoundStatement = (sql: string, values: unknown[]) => ({
    first: vi.fn(async () => readFirst(sql, values)),
    all: vi.fn(async () => ({ success: true, results: [] })),
    run: vi.fn(async () => {
      statements.push({ sql, values });
      return { success: true };
    }),
  });

  const database = {
    prepare: vi.fn((sql: string) => ({
      bind: vi.fn((...values: unknown[]) => makeBoundStatement(sql, values)),
      ...makeBoundStatement(sql, []),
    })),
    batch: vi.fn(async (batchStatements: Array<{ run: () => Promise<{ success?: boolean }> }>) => {
      const results = [];
      for (const statement of batchStatements) results.push(await statement.run());
      return results;
    }),
    statements,
  };

  return database;
}

describe("promoteEstimateRowToLibraryComponent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.EXPRESS_COMPONENT_PROMOTION_ENABLED = "true";
    authMocks.requireAuth.mockResolvedValue(undefined);
    authMocks.requireCurrentUserContext.mockResolvedValue({
      userId: USER_ID,
      role: "member",
      profile: { default_workspace_id: WORKSPACE_ID },
    });
  });

  it("promotes an estimate row through D1 and revalidates estimate/library surfaces", async () => {
    const database = makePromotionD1Database();
    d1Mocks.getCloudflareD1Database.mockResolvedValue(database);

    const { promoteEstimateRowToLibraryComponent } = await import("@/lib/estimates/express-promotion-actions");
    const result = await promoteEstimateRowToLibraryComponent({
      projectId: PROJECT_ID,
      estimateId: ESTIMATE_ID,
      rowId: ROW_ID,
      libraryFolderId: FOLDER_ID,
      mutationId: "88888888-8888-4888-8888-888888888888",
    });

    expect(result).toMatchObject({ rowId: ROW_ID, idempotent: false });
    expect(result.itemId).toMatch(/[0-9a-f-]{36}/);
    expect(result.activePriceOptionId).toMatch(/[0-9a-f-]{36}/);
    expect(database.batch).toHaveBeenCalledTimes(1);
    expect(database.statements.find((statement) => statement.sql.includes("INSERT INTO cost_library_items"))?.values).toEqual(
      expect.arrayContaining([WORKSPACE_ID, "Custom vanity", ROW_ID, USER_ID]),
    );
    expect(database.statements.find((statement) => statement.sql.includes("INSERT INTO cost_library_item_price_options"))?.values).toEqual(
      expect.arrayContaining([WORKSPACE_ID, "pc", 1200, 75, "PHP"]),
    );
    expect(database.statements.find((statement) => statement.sql.includes("UPDATE estimate_row_items"))?.values).toEqual(
      expect.arrayContaining([ROW_ID, ESTIMATE_ID]),
    );
    expect(database.statements.find((statement) => statement.sql.includes("INSERT INTO estimate_sheet_events"))?.values).toEqual(
      expect.arrayContaining(["row_promoted_to_library", "88888888-8888-4888-8888-888888888888", USER_ID]),
    );
    expect(cacheMocks.revalidatePath).toHaveBeenCalledWith("/workshop/library/components");
    expect(cacheMocks.revalidatePath).not.toHaveBeenCalledWith(`/workshop/projects/${PROJECT_ID}/components`);
    expect(cacheMocks.revalidatePath).toHaveBeenCalledWith(`/workshop/projects/${PROJECT_ID}/estimates/${ESTIMATE_ID}`);
    expect(repositoryMocks.clearEstimateRouteContextProcessCache).toHaveBeenCalledWith(PROJECT_ID);
  });

  it("returns the existing D1 promotion payload for a repeated mutation id", async () => {
    const database = makePromotionD1Database({
      existingPayload: {
        rowId: ROW_ID,
        itemId: "66666666-6666-4666-8666-666666666666",
        activePriceOptionId: "77777777-7777-4777-8777-777777777777",
      },
    });
    d1Mocks.getCloudflareD1Database.mockResolvedValue(database);

    const { promoteEstimateRowToLibraryComponent } = await import("@/lib/estimates/express-promotion-actions");
    const result = await promoteEstimateRowToLibraryComponent({
      projectId: PROJECT_ID,
      estimateId: ESTIMATE_ID,
      rowId: ROW_ID,
      mutationId: "88888888-8888-4888-8888-888888888888",
    });

    expect(result).toMatchObject({
      rowId: ROW_ID,
      itemId: "66666666-6666-4666-8666-666666666666",
      activePriceOptionId: "77777777-7777-4777-8777-777777777777",
      idempotent: true,
    });
    expect(database.batch).not.toHaveBeenCalled();
  });

  it("is feature-flag gated before D1 access", async () => {
    process.env.EXPRESS_COMPONENT_PROMOTION_ENABLED = "false";
    d1Mocks.getCloudflareD1Database.mockResolvedValue(makePromotionD1Database());

    const { promoteEstimateRowToLibraryComponent } = await import("@/lib/estimates/express-promotion-actions");
    await expect(promoteEstimateRowToLibraryComponent({ projectId: PROJECT_ID, estimateId: ESTIMATE_ID, rowId: ROW_ID })).rejects.toThrow(/disabled/i);
    expect(d1Mocks.getCloudflareD1Database).not.toHaveBeenCalled();
  });

  it("keeps the express-named export as a compatibility alias", async () => {
    const database = makePromotionD1Database();
    d1Mocks.getCloudflareD1Database.mockResolvedValue(database);

    const { promoteExpressRowToLibraryComponent } = await import("@/lib/estimates/express-promotion-actions");
    await promoteExpressRowToLibraryComponent({ projectId: PROJECT_ID, estimateId: ESTIMATE_ID, rowId: ROW_ID });

    expect(authMocks.requireAuth).toHaveBeenCalled();
    expect(database.batch).toHaveBeenCalledTimes(1);
  });
});
