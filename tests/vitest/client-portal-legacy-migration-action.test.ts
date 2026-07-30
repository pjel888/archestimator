import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  database: {
    batch: undefined as undefined | ReturnType<typeof vi.fn>,
    prepare: vi.fn(),
  },
  enabled: false,
  legacyWriteFreezeEnabled: false,
  manager: {
    project: { id: "project_1", workspace_id: "workspace_1" },
  },
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/cloudflare/d1", () => ({
  getCloudflareD1Database: vi.fn(async () => mocks.database),
}));
vi.mock("@/lib/publication/actions", () => ({
  assertProjectPublicationManager: vi.fn(async () => mocks.manager),
}));
vi.mock("@/lib/client-portal/rollout", () => ({
  isClientPortalLegacyMigrationEnabled: vi.fn(async () => mocks.enabled),
  isClientPortalLegacyWriteFreezeEnabled: vi.fn(async () => mocks.legacyWriteFreezeEnabled),
}));

import {
  migrateLegacyPublicationToClientPortalAction,
  rollbackLegacyPublicationClientPortalMigrationAction,
} from "@/lib/client-portal/legacy-migration-actions";

beforeEach(() => {
  mocks.database.prepare.mockReset();
  mocks.database.batch = undefined;
  mocks.enabled = false;
  mocks.legacyWriteFreezeEnabled = false;
});

describe("legacy Client Portal migration action", () => {
  it("fails closed before reading publication data when the rollout flag is disabled", async () => {
    await expect(migrateLegacyPublicationToClientPortalAction({ apply: true, legacyPublicationId: "publication_1", projectId: "project_1" }))
      .rejects.toThrow("not enabled for this rollout cohort");

    expect(mocks.database.prepare).not.toHaveBeenCalled();
  });

  it("also fails closed before a rollback can inspect or change a legacy mapping", async () => {
    await expect(rollbackLegacyPublicationClientPortalMigrationAction({ legacyPublicationId: "publication_1", projectId: "project_1" }))
      .rejects.toThrow("not enabled for this rollout cohort");

    expect(mocks.database.prepare).not.toHaveBeenCalled();
  });

  it("requires the legacy write freeze before apply can inspect publication data", async () => {
    mocks.enabled = true;

    await expect(migrateLegacyPublicationToClientPortalAction({ apply: true, legacyPublicationId: "publication_1", projectId: "project_1" }))
      .rejects.toThrow("writes must be frozen");

    expect(mocks.database.prepare).not.toHaveBeenCalled();
  });

  it("records a non-destructive rollback only for the authorized publication mapping", async () => {
    mocks.enabled = true;
    const statements: Array<{ sql: string; values: unknown[] }> = [];
    mocks.database.prepare.mockImplementation((sql: string) => ({
      bind: (...values: unknown[]) => ({
        first: async () => {
          if (sql.includes("FROM project_publications")) return { project_id: "project_1", workspace_id: "workspace_1" };
          if (sql.includes("SELECT migration_status FROM client_portal_legacy_mappings")) return { migration_status: "rejected" };
          if (sql.includes("FROM client_portal_legacy_mappings")) return { issue_id: "issue_1", migration_status: "verified", portal_id: "portal_1", workspace_id: "workspace_1" };
          return null;
        },
        run: async () => {
          statements.push({ sql, values });
          return { success: true };
        },
      }),
    }));

    await expect(rollbackLegacyPublicationClientPortalMigrationAction({ legacyPublicationId: "publication_1", projectId: "project_1" }))
      .resolves.toEqual({ issueId: "issue_1", legacyPublicationId: "publication_1", portalId: "portal_1", status: "rolled_back" });

    expect(statements).toHaveLength(2);
    expect(statements[0]?.sql).toContain("migration_status = 'rejected'");
    expect(statements[0]?.sql).not.toContain("DELETE");
    expect(statements[0]?.values).toContain("publication_1");
    expect(statements[0]?.values).toContain("portal_1");
    expect(statements[0]?.values).toContain("issue_1");
    expect(statements[1]?.sql).toContain("INSERT INTO client_portal_audit_events");
    expect(statements[1]?.values).toContain("legacy_migration_rolled_back");
  });

  it("does not let a project manager roll back a finalized cutover mapping", async () => {
    mocks.enabled = true;
    const statements: Array<{ sql: string; values: unknown[] }> = [];
    let mappingQuery = "";
    mocks.database.prepare.mockImplementation((sql: string) => ({
      bind: (...values: unknown[]) => ({
        first: async () => {
          if (sql.includes("FROM project_publications")) return { project_id: "project_1", workspace_id: "workspace_1" };
          if (sql.includes("FROM client_portal_legacy_mappings")) {
            mappingQuery = sql;
            return null;
          }
          return null;
        },
        run: async () => {
          statements.push({ sql, values });
          return { success: true };
        },
      }),
    }));

    await expect(rollbackLegacyPublicationClientPortalMigrationAction({
      legacyPublicationId: "publication_1",
      projectId: "project_1",
    })).rejects.toThrow("A verified Client Portal migration was not found");

    expect(mappingQuery).toContain("mapping.migration_status = 'verified'");
    expect(mappingQuery).not.toContain("cutover_complete");
    expect(statements).toEqual([]);
  });

  it("does not emit a rollback audit when cutover finalizes before the rollback batch", async () => {
    mocks.enabled = true;
    const prepared: Array<{ sql: string; values: unknown[] }> = [];
    let auditInsertCount = 0;
    mocks.database.prepare.mockImplementation((sql: string) => ({
      bind: (...values: unknown[]) => {
        const bound = {
          sql,
          values,
          first: async () => {
            if (sql.includes("FROM project_publications")) return { project_id: "project_1", workspace_id: "workspace_1" };
            if (sql.includes("SELECT migration_status FROM client_portal_legacy_mappings")) return null;
            if (sql.includes("FROM client_portal_legacy_mappings")) return { issue_id: "issue_1", migration_status: "verified", portal_id: "portal_1", workspace_id: "workspace_1" };
            return null;
          },
          run: async () => ({ success: true }),
        };
        prepared.push(bound);
        return bound;
      },
    }));
    mocks.database.batch = vi.fn(async (statements: Array<{ sql: string }>) => {
      const rollbackUpdate = statements[0]?.sql ?? "";
      const auditInsert = statements[1]?.sql ?? "";
      expect(rollbackUpdate).toContain("migration_status = 'verified'");
      expect(auditInsert).toContain("INSERT INTO client_portal_audit_events");
      expect(auditInsert).toContain("SELECT");
      expect(auditInsert).toContain("mapping.migration_status = 'rejected'");
      expect(auditInsert).toContain("rollback_operation_id");
      auditInsertCount = 0;
      return [{ success: true }, { success: true }];
    });

    await expect(rollbackLegacyPublicationClientPortalMigrationAction({
      legacyPublicationId: "publication_1",
      projectId: "project_1",
    })).rejects.toThrow("rollback could not be confirmed because the migration state changed");

    expect(mocks.database.batch).toHaveBeenCalledOnce();
    expect(auditInsertCount).toBe(0);
    expect(prepared.some((entry) => entry.sql.includes("SELECT migration_status FROM client_portal_legacy_mappings"))).toBe(true);
  });

  it("does not confuse same-timestamp concurrent rollback attempts", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-28T14:00:00.000Z"));
    try {
      mocks.enabled = true;
      let attemptedOperationId: unknown;
      let auditInsertCount = 0;
      mocks.database.prepare.mockImplementation((sql: string) => ({
        bind: (...values: unknown[]) => ({
          sql,
          values,
          first: async () => {
            if (sql.includes("FROM project_publications")) return { project_id: "project_1", workspace_id: "workspace_1" };
            if (sql.includes("SELECT migration_status FROM client_portal_legacy_mappings")) return null;
            if (sql.includes("FROM client_portal_legacy_mappings")) return { issue_id: "issue_1", migration_status: "verified", portal_id: "portal_1", workspace_id: "workspace_1" };
            return null;
          },
          run: async () => ({ success: true }),
        }),
      }));
      mocks.database.batch = vi.fn(async (statements: Array<{ sql: string; values: unknown[] }>) => {
        attemptedOperationId = statements[0]?.values[2];
        expect(attemptedOperationId).toEqual(expect.any(String));
        expect(statements[0]?.sql).toContain("rollback_operation_id");
        expect(statements[1]?.sql).toContain("json_extract(mapping.notes, '$.rollback_operation_id') = ?");
        expect(statements[1]?.values.at(-1)).toBe(attemptedOperationId);
        auditInsertCount = 0;
        return [{ success: true }, { success: true }];
      });

      await expect(rollbackLegacyPublicationClientPortalMigrationAction({
        legacyPublicationId: "publication_1",
        projectId: "project_1",
      })).rejects.toThrow("rollback could not be confirmed because the migration state changed");

      expect(mocks.database.batch).toHaveBeenCalledOnce();
      expect(auditInsertCount).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });
});
