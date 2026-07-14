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
const storageMocks = vi.hoisted(() => ({
  uploadObject: vi.fn(),
  removeObjects: vi.fn(),
  downloadObject: vi.fn(),
  createSignedReadUrl: vi.fn(),
  getPublicUrl: vi.fn(),
}));
const runtimeStorageMocks = vi.hoisted(() => ({ createRuntimeUploadStorageProvider: vi.fn() }));

vi.mock("@/lib/auth/session", () => authMocks);
vi.mock("@/lib/cloudflare/d1", () => d1Mocks);
vi.mock("@/lib/repositories/workspace-repository", () => repositoryMocks);
vi.mock("next/cache", () => cacheMocks);
vi.mock("@/lib/uploads/runtime-storage-provider", () => runtimeStorageMocks);

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
  sourceWorkspaceId?: string;
  sourceSnapshot?: Record<string, unknown>;
  sourceMetadata?: Record<string, unknown>;
  uploadAssets?: Record<string, Record<string, unknown>>;
  attachmentBindings?: Record<string, Record<string, unknown>>;
} = {}) {
  const statements: StatementRecord[] = [];
  const firstStatements: StatementRecord[] = [];
  const sourceWorkspaceId = options.sourceWorkspaceId ?? WORKSPACE_ID;
  const sourceRow = {
    project_id: PROJECT_ID,
    workspace_id: sourceWorkspaceId,
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
    source_snapshot_json: JSON.stringify(options.sourceSnapshot ?? {}),
    metadata_json: JSON.stringify(options.sourceMetadata ?? { expressComponent: { created: true } }),
    source_library_item_id: null,
    link_state: "detached",
    row_revision: 2,
  };

  const readFirst = async (sql: string, values: unknown[]) => {
    firstStatements.push({ sql, values });
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
      if (values[0] !== sourceWorkspaceId) return null;
      return options.canManageLibrary === false ? null : { allowed: 1 };
    }
    if (sql.includes("FROM library_folders")) {
      if (values[1] !== sourceWorkspaceId) return null;
      return options.folderExists === false ? null : { id: FOLDER_ID };
    }
    if (sql.includes("FROM cost_library_items") && sql.includes("source_estimate_row_item_id")) {
      return options.existingLibraryItem ?? null;
    }
    if (sql.includes("FROM upload_assets")) {
      return options.uploadAssets?.[String(values[0])] ?? null;
    }
    if (sql.includes("FROM component_variant_attachments")) {
      return options.attachmentBindings?.[String(values[0])] ?? null;
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
    firstStatements,
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
    runtimeStorageMocks.createRuntimeUploadStorageProvider.mockResolvedValue(storageMocks);
    storageMocks.downloadObject.mockResolvedValue({
      body: new Uint8Array([1, 2, 3, 4]).buffer,
      contentType: "application/octet-stream",
      sizeBytes: 4,
    });
    storageMocks.uploadObject.mockResolvedValue(undefined);
    storageMocks.removeObjects.mockResolvedValue(undefined);
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

  it("promotes shared-project rows into the source project workspace library instead of the user's default workspace", async () => {
    const sourceWorkspaceId = "shared-project-workspace";
    authMocks.requireCurrentUserContext.mockResolvedValue({
      userId: USER_ID,
      role: "member",
      profile: { default_workspace_id: "default-workspace" },
    });
    const database = makePromotionD1Database({ sourceWorkspaceId });
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
    const workspaceEditorCheck = database.firstStatements.find(
      (statement) => statement.sql.includes("FROM workspace_members workspace_member") && statement.values[0] === sourceWorkspaceId,
    );
    expect(workspaceEditorCheck?.values[0]).toBe(sourceWorkspaceId);
    expect(database.firstStatements.find((statement) => statement.sql.includes("FROM library_folders"))?.values).toEqual([
      FOLDER_ID,
      sourceWorkspaceId,
    ]);
    expect(database.statements.find((statement) => statement.sql.includes("INSERT INTO cost_library_items"))?.values).toEqual(
      expect.arrayContaining([sourceWorkspaceId, "Custom vanity", ROW_ID, USER_ID]),
    );
    expect(database.statements.find((statement) => statement.sql.includes("INSERT INTO cost_library_item_price_options"))?.values).toEqual(
      expect.arrayContaining([sourceWorkspaceId, "pc", 1200, 75, "PHP"]),
    );
  });

  it("promotes the complete ordered variant graph without collapsing selection into the default", async () => {
    const defaultSourceOptionId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const selectedSourceOptionId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
    const database = makePromotionD1Database({
      sourceSnapshot: {
        sourceComponentId: "project-component-1",
        priceOptionId: selectedSourceOptionId,
        priceOptionLabel: "Option 2",
        priceOptions: [
          {
            id: defaultSourceOptionId,
            label: "Default",
            variantDescription: "Standard vanity",
            unit: "pc",
            unitCost: 1200,
            miscCost: 75,
            currency: "PHP",
            pricingSource: "Builder",
            pricingDate: "2026-07-01",
            isActive: true,
            isDefault: true,
            costEntries: [{
              id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
              unitCost: 1200,
              miscCost: 75,
              currency: "PHP",
              pricingDate: "2026-07-01",
              isCurrent: true,
            }],
          },
          {
            id: selectedSourceOptionId,
            label: "Option 2",
            sku: "VANITY-OAK",
            variantDescription: "Oak vanity",
            unit: "set",
            unitCost: 1800,
            miscCost: 120,
            currency: "PHP",
            pricingSource: "Specialist",
            pricingDate: "2026-07-02",
            imageBucket: "project-images",
            imagePath: "workspace/user/project-images/project/oak.webp",
            thumbnailPath: "/api/projects/images?path=workspace%2Fuser%2Fproject-images%2Fproject%2Foak-thumb.webp",
            imageMetadata: { assetId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd" },
            attachments: [{
              id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
              assetId: "ffffffff-ffff-4fff-8fff-ffffffffffff",
              bucket: "component-attachments",
              path: "workspace/user/spec.pdf",
              fileName: "spec.pdf",
              contentType: "application/pdf",
              sizeBytes: 512,
              kind: "pdf",
              scanStatus: "clean",
              reviewStatus: "uploaded",
              isCurrentApproved: false,
            }],
            isActive: true,
            isDefault: false,
          },
        ],
      },
      sourceMetadata: {
        priceOptionId: selectedSourceOptionId,
        expressComponent: { created: true },
      },
      uploadAssets: {
        "dddddddd-dddd-4ddd-8ddd-dddddddddddd": {
          id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
          workspace_id: WORKSPACE_ID,
          actor_user_id: USER_ID,
          project_id: PROJECT_ID,
          surface: "project-image",
          target_entity_type: "project",
          target_entity_id: PROJECT_ID,
          status: "finalized",
          file_name: "oak.webp",
          content_type: "image/webp",
          size_bytes: 4,
          scan_status: "not_required",
          scan_override_expires_at: null,
          storage_bucket: "project-images",
          storage_path: "workspace/user/project-images/project/oak.webp",
          thumbnail_path: "workspace/user/project-images/project/oak-thumb.webp",
          metadata_json: "{}",
        },
        "ffffffff-ffff-4fff-8fff-ffffffffffff": {
          id: "ffffffff-ffff-4fff-8fff-ffffffffffff",
          workspace_id: WORKSPACE_ID,
          actor_user_id: USER_ID,
          project_id: PROJECT_ID,
          surface: "component-attachment",
          target_entity_type: "project-component",
          target_entity_id: "project-component-1",
          status: "finalized",
          file_name: "spec.pdf",
          content_type: "application/pdf",
          size_bytes: 512,
          scan_status: "clean",
          scan_override_expires_at: null,
          storage_bucket: "component-attachments",
          storage_path: "workspace/user/spec.pdf",
          thumbnail_path: null,
          metadata_json: "{}",
        },
      },
      attachmentBindings: {
        "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee": {
          id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
        },
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

    const optionWrites = database.statements.filter((statement) => statement.sql.includes("INSERT INTO cost_library_item_price_options"));
    expect(optionWrites).toHaveLength(2);
    const defaultWrite = optionWrites.find((statement) => statement.values[3] === "Default");
    const selectedWrite = optionWrites.find((statement) => statement.values[3] === "Option 2");
    expect(defaultWrite?.values[9]).toBe(1);
    expect(selectedWrite?.values[9]).toBe(0);
    expect(defaultWrite?.values[0]).not.toBe(defaultSourceOptionId);
    expect(selectedWrite?.values[0]).not.toBe(selectedSourceOptionId);
    expect(result.activePriceOptionId).toBe(defaultWrite?.values[0]);

    const itemWrite = database.statements.find((statement) => statement.sql.includes("INSERT INTO cost_library_items"));
    expect(itemWrite?.values[16]).toBe(defaultWrite?.values[0]);
    const rowWrite = database.statements.find((statement) => statement.sql.includes("UPDATE estimate_row_items"));
    const persistedSnapshot = JSON.parse(String(rowWrite?.values[1])) as Record<string, unknown>;
    const persistedMetadata = JSON.parse(String(rowWrite?.values[2])) as Record<string, unknown>;
    const persistedOptions = persistedSnapshot.priceOptions as Array<Record<string, unknown>>;
    expect(persistedSnapshot.sourceType).toBe("library_component");
    expect(persistedSnapshot.sourceLibraryItemId).toBe(result.itemId);
    expect(persistedSnapshot.priceOptionId).toBe(selectedWrite?.values[0]);
    expect(persistedMetadata.priceOptionId).toBe(selectedWrite?.values[0]);
    expect(persistedOptions.map((option) => option.label)).toEqual(["Default", "Option 2"]);
    expect(persistedOptions[1]).toMatchObject({
      id: selectedWrite?.values[0],
      sku: "VANITY-OAK",
      variantDescription: "Oak vanity",
      unit: "set",
      unitCost: 1800,
      miscCost: 120,
    });
    expect(persistedOptions[1]).not.toHaveProperty("imageBucket");
    expect(persistedOptions[1]).not.toHaveProperty("imagePath");
    expect(String(persistedOptions[1]?.thumbnailPath)).toContain("/api/component-library/images?path=");
    expect(persistedOptions[1]).not.toHaveProperty("attachments");
    const selectedOptionMetadata = JSON.parse(String(selectedWrite?.values[13])) as Record<string, unknown>;
    expect(selectedOptionMetadata.attachments).toEqual([expect.objectContaining({
      bucket: "component-attachments",
      scanStatus: "pending",
      reviewStatus: "uploaded",
      isCurrentApproved: false,
    })]);
    expect(selectedOptionMetadata.attachments).not.toEqual([expect.objectContaining({
      id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
      assetId: "ffffffff-ffff-4fff-8fff-ffffffffffff",
      path: "workspace/user/spec.pdf",
    })]);
    expect(database.statements.filter((statement) => statement.sql.includes("INSERT INTO cost_library_item_variant_cost_entries"))).toHaveLength(2);
    expect(database.statements.filter((statement) => statement.sql.includes("INSERT INTO component_variant_attachments"))).toHaveLength(1);
    expect(database.statements.filter((statement) => statement.sql.includes("INSERT INTO cost_library_item_versions"))).toHaveLength(1);
    expect(database.statements.filter((statement) => statement.sql.includes("INSERT INTO upload_assets"))).toHaveLength(2);
    expect(storageMocks.uploadObject).toHaveBeenCalledTimes(3);
    expect(storageMocks.uploadObject).not.toHaveBeenCalledWith(expect.objectContaining({
      bucket: "project-images",
    }));
    expect(result).toMatchObject({
      selectedPriceOptionId: selectedWrite?.values[0],
      versionNumber: 1,
      omittedImageCount: 0,
      omittedAttachmentCount: 0,
    });
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

});
