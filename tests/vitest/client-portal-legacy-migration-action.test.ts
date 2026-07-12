import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  database: {
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
});
