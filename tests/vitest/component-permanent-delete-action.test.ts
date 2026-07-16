import { beforeEach, describe, expect, it, vi } from "vitest";

const cacheMocks = vi.hoisted(() => ({ revalidatePath: vi.fn() }));
const authMocks = vi.hoisted(() => ({ requireCurrentUserContext: vi.fn() }));
const authzMocks = vi.hoisted(() => ({
  canEditEstimateInD1: vi.fn(),
  isWorkspaceEditorInD1: vi.fn(),
  isWorkspaceMemberInD1: vi.fn(),
}));
const d1Mocks = vi.hoisted(() => ({ getCloudflareD1Database: vi.fn() }));
const workspaceMocks = vi.hoisted(() => ({
  ensureDefaultWorkspace: vi.fn(),
  listCurrentWorkspaceProjects: vi.fn(),
  listProjectEstimateSheets: vi.fn(),
}));
const storageMocks = vi.hoisted(() => ({ createRuntimeUploadStorageProvider: vi.fn() }));
const cleanupAuditMocks = vi.hoisted(() => ({ recordMassDeletionStorageCleanupResultInD1: vi.fn() }));

vi.mock("next/cache", () => cacheMocks);
vi.mock("@/lib/auth/session", () => authMocks);
vi.mock("@/lib/authz/d1-access", () => authzMocks);
vi.mock("@/lib/cloudflare/d1", () => d1Mocks);
vi.mock("@/lib/repositories/workspace-repository", () => workspaceMocks);
vi.mock("@/lib/uploads/runtime-storage-provider", () => storageMocks);
vi.mock("@/lib/projects/d1-audit", () => cleanupAuditMocks);

const WORKSPACE_ID = "11111111-1111-4111-8111-111111111111";
const COMPONENT_ID = "22222222-2222-4222-8222-222222222222";
const OPTION_ID = "33333333-3333-4333-8333-333333333333";
const ASSET_ID = "44444444-4444-4444-8444-444444444444";

function createDeleteDatabase(options: { failBatch?: boolean } = {}) {
  const batchStatements: Array<{ sql: string; values: unknown[] }> = [];
  const database = {
    prepare: vi.fn((sql: string) => ({
      bind: vi.fn((...values: unknown[]) => ({
        sql,
        values,
        first: vi.fn(async () => null),
        all: vi.fn(async () => {
          if (sql.includes("FROM upload_assets asset")) {
            return { success: true, results: [{
              id: ASSET_ID,
              retained_by_another_owner: 0,
              status: "finalized",
              storage_bucket: "component-images",
              storage_path: `${WORKSPACE_ID}/component-images/component.webp`,
              thumbnail_path: null,
              updated_at: "2026-07-15T00:00:00.000Z",
            }] };
          }
          if (sql.includes("FROM cost_library_items item")) {
            return { success: true, results: [{
              id: COMPONENT_ID,
              workspace_id: WORKSPACE_ID,
              name: "Component",
              lifecycle_state: "available",
              current_version_number: 1,
              updated_at: "2026-07-15T00:00:00.000Z",
            }] };
          }
          if (sql.includes("FROM cost_library_item_price_options price_option")) {
            return { success: true, results: [{
              id: OPTION_ID,
              item_id: COMPONENT_ID,
              workspace_id: WORKSPACE_ID,
              metadata_json: JSON.stringify({ imageMetadata: { assetId: ASSET_ID } }),
              image_asset_id: ASSET_ID,
              image_path: `${WORKSPACE_ID}/component-images/component.webp`,
              thumbnail_path: null,
              updated_at: "2026-07-15T00:00:00.000Z",
            }] };
          }
          return { success: true, results: [] };
        }),
        run: vi.fn(async () => ({ success: true, meta: { changes: 1 }, results: [] })),
      })),
    })),
    batch: vi.fn(async (statements: Array<{ sql: string; values: unknown[] }>) => {
      batchStatements.push(...statements);
      return statements.map((_, index) => ({
        success: !options.failBatch || index !== 0,
        meta: { changes: options.failBatch && index === 0 ? 0 : 1 },
        results: [],
      }));
    }),
    batchStatements,
  };
  return database;
}

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  authMocks.requireCurrentUserContext.mockResolvedValue({ userId: "user-1" });
  authzMocks.isWorkspaceEditorInD1.mockResolvedValue(true);
  authzMocks.canEditEstimateInD1.mockResolvedValue(true);
  authzMocks.isWorkspaceMemberInD1.mockResolvedValue(true);
  workspaceMocks.ensureDefaultWorkspace.mockResolvedValue({ workspace: { id: WORKSPACE_ID } });
  storageMocks.createRuntimeUploadStorageProvider.mockResolvedValue({ removeObjects: vi.fn() });
});

describe("component permanent delete action", () => {
  it("does not touch object storage when the atomic D1 batch fails", async () => {
    const database = createDeleteDatabase({ failBatch: true });
    d1Mocks.getCloudflareD1Database.mockResolvedValue(database);
    const {
      executeBulkDeleteLibraryComponents,
      previewBulkDeleteLibraryComponents,
    } = await import("@/lib/component-library/actions");

    const preview = await previewBulkDeleteLibraryComponents({ itemIds: [COMPONENT_ID] });
    const result = await executeBulkDeleteLibraryComponents({
      itemIds: [COMPONENT_ID],
      expectedPreviewHash: preview.previewHash ?? "",
      correlationId: "55555555-5555-4555-8555-555555555555",
    });

    expect(preview.ok).toBe(true);
    expect(preview.storageTargets).toHaveLength(1);
    expect(result).toMatchObject({
      ok: false,
      deletedIds: [],
      issues: [expect.objectContaining({ code: "rpc_error" })],
    });
    expect(database.batch).toHaveBeenCalledTimes(1);
    expect(database.batchStatements.some((statement) => statement.sql.includes("INSERT INTO mass_deletion_events"))).toBe(true);
    expect(storageMocks.createRuntimeUploadStorageProvider).not.toHaveBeenCalled();
    expect(cleanupAuditMocks.recordMassDeletionStorageCleanupResultInD1).not.toHaveBeenCalled();
    expect(cacheMocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("queues object cleanup without touching storage after the D1 delete commits", async () => {
    const database = createDeleteDatabase();
    d1Mocks.getCloudflareD1Database.mockResolvedValue(database);
    const {
      executeBulkDeleteLibraryComponents,
      previewBulkDeleteLibraryComponents,
    } = await import("@/lib/component-library/actions");

    const preview = await previewBulkDeleteLibraryComponents({ itemIds: [COMPONENT_ID] });
    const result = await executeBulkDeleteLibraryComponents({
      itemIds: [COMPONENT_ID],
      expectedPreviewHash: preview.previewHash ?? "",
      correlationId: "55555555-5555-4555-8555-555555555555",
    });

    expect(result).toMatchObject({ ok: true, deletedIds: [COMPONENT_ID] });
    expect(database.batchStatements.some((statement) => (
      statement.sql.includes("UPDATE upload_assets")
      && statement.sql.includes("removal_claim_id")
      && statement.sql.includes("purge_state = 'pending'")
    ))).toBe(true);
    expect(storageMocks.createRuntimeUploadStorageProvider).not.toHaveBeenCalled();
    expect(cleanupAuditMocks.recordMassDeletionStorageCleanupResultInD1).not.toHaveBeenCalled();
  });
});
