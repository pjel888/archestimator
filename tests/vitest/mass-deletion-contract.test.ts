import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import type {
  D1DatabaseLike,
  D1PreparedStatementLike,
  D1Result,
  D1Value,
} from "@/lib/cloudflare/d1";
import {
  executeBulkDeleteEstimateSheets,
  previewBulkDeleteEstimateSheets,
} from "@/lib/estimates/d1-intents/bulk-sheets";

const BULK_PROJECT_ID = "11111111-1111-4111-8111-111111111111";
const BULK_WORKSPACE_ID = "22222222-2222-4222-8222-222222222222";
const BULK_ACTOR_ID = "33333333-3333-4333-8333-333333333333";
const BULK_ESTIMATE_A = "44444444-4444-4444-8444-444444444444";
const BULK_ESTIMATE_B = "55555555-5555-4555-8555-555555555555";
const SPOOF_ACTOR_ID = "99999999-9999-4999-8999-999999999999";

class BulkDeleteStatement<T = Record<string, unknown>> implements D1PreparedStatementLike<T> {
  values: D1Value[] = [];

  constructor(
    readonly database: BulkDeleteDatabase,
    readonly sql: string,
  ) {}

  bind(...values: D1Value[]) {
    this.values = values;
    return this;
  }

  async first<R = T>(): Promise<R | null> {
    if (this.sql.includes("SELECT id, workspace_id") && this.sql.includes("FROM projects")) {
      return this.values[0] === BULK_PROJECT_ID
        ? ({ id: BULK_PROJECT_ID, workspace_id: BULK_WORKSPACE_ID } as R)
        : null;
    }
    if (this.sql.includes("FROM mass_deletion_events")) return null;
    return null;
  }

  async all<R = T>(): Promise<D1Result<R>> {
    if (this.sql.includes("SELECT estimate.id")) {
      const selected = new Set(this.values.slice(1).map(String));
      return {
        success: true,
        results: [...this.database.estimateIds]
          .filter((id) => selected.has(id))
          .map((id) => ({ id })) as R[],
      };
    }
    if (this.sql.includes("SELECT * FROM estimate_row_items")) {
      return { success: true, results: [] };
    }
    return { success: true, results: [] };
  }

  async run(): Promise<D1Result<T>> {
    this.database.sequentialWrites.push(this);
    return { success: true };
  }
}

class BulkDeleteDatabase implements D1DatabaseLike {
  readonly estimateIds = new Set([BULK_ESTIMATE_A, BULK_ESTIMATE_B]);
  readonly batches: BulkDeleteStatement[][] = [];
  readonly sequentialWrites: BulkDeleteStatement[] = [];

  prepare<T = Record<string, unknown>>(sql: string) {
    return new BulkDeleteStatement<T>(this, sql);
  }

  async batch<T = Record<string, unknown>>(statements: D1PreparedStatementLike<T>[]) {
    this.batches.push(statements as BulkDeleteStatement[]);
    return statements.map(() => ({ success: true }));
  }
}

const bulkActor = { userId: BULK_ACTOR_ID, role: "admin" } as const;

const massDeletionMigrationPaths = readdirSync(join(process.cwd(), "supabase/migrations"))
  .filter((name) => name.includes("mass_deletion"))
  .sort();
const migration = massDeletionMigrationPaths
  .map((migrationPath) => readFileSync(join(process.cwd(), "supabase/migrations", migrationPath), "utf8"))
  .join("\n");
const actorDerivationMigrationPath = massDeletionMigrationPaths.find((name) => name.includes("harden_mass_deletion_actor_derivation"));
const actorDerivationMigration = actorDerivationMigrationPath
  ? readFileSync(join(process.cwd(), "supabase/migrations", actorDerivationMigrationPath), "utf8")
  : "";
const cleanupResultMigrationPath = massDeletionMigrationPaths.find((name) => name.includes("lock_mass_deletion_cleanup_result_rpc"));
const cleanupResultMigration = cleanupResultMigrationPath
  ? readFileSync(join(process.cwd(), "supabase/migrations", cleanupResultMigrationPath), "utf8")
  : "";

describe("mass deletion backend contract", () => {
  it("previews and executes sorted estimate deletion directly in one ordered atomic audit batch", async () => {
    const database = new BulkDeleteDatabase();
    const firstPreview = await previewBulkDeleteEstimateSheets(database, bulkActor, {
      projectId: BULK_PROJECT_ID,
      estimateIds: [BULK_ESTIMATE_B, BULK_ESTIMATE_A],
    });
    const secondPreview = await previewBulkDeleteEstimateSheets(database, bulkActor, {
      projectId: BULK_PROJECT_ID,
      estimateIds: [BULK_ESTIMATE_A, BULK_ESTIMATE_B],
    });

    expect(firstPreview).toMatchObject({
      ok: true,
      ids: [BULK_ESTIMATE_A, BULK_ESTIMATE_B],
      eligibleIds: [BULK_ESTIMATE_A, BULK_ESTIMATE_B],
      summary: { requestedCount: 2, eligibleCount: 2, blockedCount: 0 },
    });
    expect(secondPreview.previewHash).toBe(firstPreview.previewHash);

    const result = await executeBulkDeleteEstimateSheets(database, bulkActor, {
      projectId: BULK_PROJECT_ID,
      estimateIds: [BULK_ESTIMATE_B, BULK_ESTIMATE_A],
      expectedPreviewHash: firstPreview.previewHash,
      correlationId: "bulk-delete-correlation",
      acting_user_id: SPOOF_ACTOR_ID,
    } as Parameters<typeof executeBulkDeleteEstimateSheets>[2]);

    expect(result).toMatchObject({
      ok: true,
      deletedIds: [BULK_ESTIMATE_A, BULK_ESTIMATE_B],
      previewHash: firstPreview.previewHash,
    });
    expect(database.batches).toHaveLength(1);
    expect(database.sequentialWrites).toEqual([]);
    const sql = database.batches[0].map((statement) => statement.sql.replace(/\s+/g, " ").trim());
    expect(sql).toEqual([
      expect.stringContaining("UPDATE projects SET publication_source_revision"),
      expect.stringContaining("DELETE FROM estimate_sheet_user_preferences"),
      expect.stringContaining("DELETE FROM estimate_sheet_access_settings"),
      expect.stringContaining("DELETE FROM estimate_sheet_members"),
      expect.stringContaining("DELETE FROM estimate_sheet_adjustments"),
      expect.stringContaining("DELETE FROM estimate_sheet_events"),
      expect.stringContaining("DELETE FROM estimate_row_items"),
      expect.stringContaining("DELETE FROM estimate_nodes"),
      expect.stringContaining("DELETE FROM estimate_tabs"),
      expect.stringContaining("DELETE FROM estimate_favorites"),
      expect.stringContaining("DELETE FROM estimates"),
      expect.stringContaining("INSERT INTO mass_deletion_events"),
    ]);
    const audit = database.batches[0].at(-1)!;
    expect(audit.values[2]).toBe(BULK_ACTOR_ID);
    expect(database.batches[0].flatMap((statement) => statement.values)).not.toContain(SPOOF_ACTOR_ID);
  });

  it("returns stale preview with zero writes and fails closed when an eligible execution lacks atomic batch support", async () => {
    const staleDatabase = new BulkDeleteDatabase();
    const stale = await executeBulkDeleteEstimateSheets(staleDatabase, bulkActor, {
      projectId: BULK_PROJECT_ID,
      estimateIds: [BULK_ESTIMATE_A],
      expectedPreviewHash: "stale-preview",
      correlationId: "stale-correlation",
    });
    expect(stale).toMatchObject({ ok: false, deletedIds: [] });
    expect(stale.issues).toContainEqual({
      code: "stale_preview",
      message: "Preview changed; refresh the deletion preview.",
    });
    expect(staleDatabase.batches).toEqual([]);
    expect(staleDatabase.sequentialWrites).toEqual([]);

    const nonAtomicDatabase = new BulkDeleteDatabase();
    const preview = await previewBulkDeleteEstimateSheets(nonAtomicDatabase, bulkActor, {
      projectId: BULK_PROJECT_ID,
      estimateIds: [BULK_ESTIMATE_A],
    });
    Object.defineProperty(nonAtomicDatabase, "batch", { value: undefined });
    await expect(executeBulkDeleteEstimateSheets(nonAtomicDatabase, bulkActor, {
      projectId: BULK_PROJECT_ID,
      estimateIds: [BULK_ESTIMATE_A],
      expectedPreviewHash: preview.previewHash,
      correlationId: "non-atomic-correlation",
    })).rejects.toThrow("Atomic estimate sheet bulk deletion is unavailable.");
    expect(nonAtomicDatabase.batches).toEqual([]);
    expect(nonAtomicDatabase.sequentialWrites).toEqual([]);
  });

  it("adds a durable audit table, preview/execute RPC split, permission checks, and grants", () => {
    expect(migration).toContain("create table if not exists public.mass_deletion_events");
    expect(migration).toContain("preview_bulk_delete_projects");
    expect(migration).toContain("execute_bulk_delete_projects");
    expect(migration).toContain("preview_bulk_delete_estimate_sheets");
    expect(migration).toContain("execute_bulk_delete_estimate_sheets");
    expect(migration).toContain("preview_bulk_archive_library_components");
    expect(migration).toContain("execute_bulk_archive_library_components");
    expect(migration).toContain("SECURITY DEFINER");
    expect(migration).toContain("set search_path = public");
    expect(migration).toContain("public.can_manage_project_access");
    expect(migration).toContain("public.can_edit_estimate");
    expect(migration).toContain("public.is_workspace_editor");
    expect(migration).toContain("status = 'published'");
    expect(migration).toContain("revoked_at is null");
    expect(migration).toContain("preview_hash");
    expect(migration).toContain("correlation_id");
    expect(migration).toContain("pg_advisory_xact_lock");
    expect(migration).toContain("revoke execute on function public.execute_bulk_delete_projects");
    expect(migration).toContain("grant execute on function public.execute_bulk_delete_projects");
  });

  it("derives mass deletion audit actors from auth.uid instead of caller input", () => {
    expect(actorDerivationMigration).toContain("actor_id uuid := auth.uid()");
    expect(actorDerivationMigration).toContain("actor_id is null");
    expect(actorDerivationMigration).toContain("actor_user_id, target_type");
    expect(actorDerivationMigration).toContain("values (workspace_id, actor_id, 'project'");
    expect(actorDerivationMigration).toContain("values (workspace_id, actor_id, 'estimate_sheet'");
    expect(actorDerivationMigration).toContain("values (target_workspace_id, actor_id, 'library_component'");
    expect(actorDerivationMigration).not.toContain("acting_user_id uuid default auth.uid()");
    expect(actorDerivationMigration).not.toContain("values (workspace_id, acting_user_id");
    expect(actorDerivationMigration).not.toContain("values (target_workspace_id, acting_user_id");
  });

  it("restricts mass deletion storage cleanup audit writes to the service role", () => {
    expect(cleanupResultMigration).toContain("record_mass_deletion_storage_cleanup_result");
    expect(cleanupResultMigration).toContain("auth.role() <> 'service_role'");
    expect(cleanupResultMigration).toContain("status = 'storage_cleanup_pending'");
    expect(cleanupResultMigration).toContain("target_type = 'project'");
    expect(cleanupResultMigration).toContain("revoke execute on function public.record_mass_deletion_storage_cleanup_result(uuid, jsonb) from public, anon, authenticated");
    expect(cleanupResultMigration).toContain("grant execute on function public.record_mass_deletion_storage_cleanup_result(uuid, jsonb) to service_role");
  });

  it("keeps record_mass_deletion_storage_cleanup_result atomic and duplicate retry safe", () => {
    expect(cleanupResultMigration).toContain("set storage_cleanup_result = normalized_result");
    expect(cleanupResultMigration).toContain("status = updated_status");
    expect(cleanupResultMigration).toContain("returning * into updated_row");
    expect(cleanupResultMigration).toContain("status = 'storage_cleanup_pending'");
    expect(cleanupResultMigration).toContain("Mass deletion cleanup event not found or already finalized.");
  });

  it("keeps active D1 mass deletion actions aligned with the historical provider contract", () => {
    const d1Migration = readFileSync("migrations/0023_mass_deletion_events.sql", "utf8");
    const projectActions = readFileSync("src/lib/projects/actions.ts", "utf8");
    const estimateBulkIntents = readFileSync("src/lib/estimates/d1-intents/bulk-sheets.ts", "utf8");
    const estimateActions = readFileSync("src/lib/estimates/actions.ts", "utf8");
    const componentActions = readFileSync("src/lib/component-library/actions.ts", "utf8");

    expect(d1Migration).toContain("CREATE TABLE IF NOT EXISTS mass_deletion_events");
    expect(d1Migration).toContain("target_type TEXT NOT NULL CHECK");
    expect(d1Migration).toContain("'project', 'estimate_sheet', 'library_component'");
    expect(d1Migration).toContain("preview_hash TEXT NOT NULL");
    expect(d1Migration).toContain("correlation_id TEXT NOT NULL");
    expect(projectActions).toContain("function canManageProjectRow");
    expect(projectActions).toContain("previewBulkDeleteProjectsInD1");
    expect(projectActions).toContain("executeBulkDeleteProjectsInD1");
    expect(projectActions).toContain("INSERT INTO mass_deletion_events");
    expect(estimateBulkIntents).toContain("export async function previewBulkDeleteEstimateSheets");
    expect(estimateBulkIntents).toContain("export async function executeBulkDeleteEstimateSheets");
    expect(estimateBulkIntents).toContain("INSERT INTO mass_deletion_events");
    expect(estimateActions).toContain("await previewBulkDeleteEstimateSheetsIntent(database, currentUser,");
    expect(estimateActions).toContain("await executeBulkDeleteEstimateSheetsIntent(database, currentUser,");
    expect(estimateActions).not.toMatch(/preview_bulk_delete_estimate_sheets|execute_bulk_delete_estimate_sheets/);
    expect(componentActions).toContain("previewBulkArchiveLibraryComponents");
    expect(componentActions).toContain("executeBulkArchiveLibraryComponents");
    expect(componentActions).not.toMatch(/preview_bulk_archive_library_components|execute_bulk_archive_library_components|supabase\.rpc/);
  });
});
