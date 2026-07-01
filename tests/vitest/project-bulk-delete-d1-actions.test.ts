import { beforeEach, describe, expect, it, vi } from "vitest";

const getCloudflareD1Database = vi.hoisted(() => vi.fn());
const requireCurrentUserContext = vi.hoisted(() => vi.fn());
const requireAuth = vi.hoisted(() => vi.fn());
const createRuntimeUploadStorageProvider = vi.hoisted(() => vi.fn());
const revalidatePath = vi.hoisted(() => vi.fn());

vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({
  requireAuth,
  requireCurrentUserContext,
}));
vi.mock("@/lib/cloudflare/d1", () => ({ getCloudflareD1Database }));
vi.mock("@/lib/uploads/runtime-storage-provider", () => ({
  createRuntimeUploadStorageProvider,
}));

import {
  executeBulkDeleteProjects,
  previewBulkDeleteProjects,
} from "@/lib/projects/actions";

const PROJECT_ID = "11111111-1111-4111-8111-111111111111";
const WORKSPACE_ID = "22222222-2222-4222-8222-222222222222";
const USER_ID = "33333333-3333-4333-8333-333333333333";
const ESTIMATE_ID = "44444444-4444-4444-8444-444444444444";
const PUBLICATION_ID = "55555555-5555-4555-8555-555555555555";

type FakeProjectRow = {
  id: string;
  workspace_id: string;
  name: string;
  client_name: string | null;
  location: string | null;
  project_code: string | null;
  currency_code: string | null;
  metadata: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  workspace_role: string | null;
  project_role: string | null;
};

class FakeD1Statement {
  values: unknown[] = [];

  constructor(
    private readonly database: FakeD1Database,
    readonly sql: string,
  ) {}

  bind(...values: unknown[]) {
    this.values = values;
    return this;
  }

  async first<T>() {
    this.database.firstStatements.push(this);
    if (this.sql.includes("COUNT(*) AS count FROM estimates")) {
      const projectIds = new Set(this.values.map(String));
      return {
        count: this.database.estimates.filter((row) =>
          projectIds.has(row.project_id),
        ).length,
      } as T;
    }
    if (this.sql.includes("SELECT workspace_id FROM projects")) {
      const ids = new Set(this.values.map(String));
      const project = this.database.projects.find((row) => ids.has(row.id));
      return project ? ({ workspace_id: project.workspace_id } as T) : null;
    }
    return null;
  }

  async all<T>() {
    this.database.allStatements.push(this);
    if (this.sql.includes("FROM projects project")) {
      const projectIds = new Set(this.values.slice(3).map(String));
      const activeProjectIds = new Set(
        this.database.publications
          .filter((row) => row.status === "published" && !row.revoked_at)
          .map((row) => row.project_id),
      );
      return {
        results: this.database.projects
          .filter((row) => projectIds.has(row.id))
          .map((row) => ({
            ...row,
            active_publication_count: activeProjectIds.has(row.id) ? 1 : 0,
          })) as T[],
        success: true,
      };
    }
    if (this.sql.includes("SELECT id FROM project_publications")) {
      const projectIds = new Set(this.values.map(String));
      return {
        results: this.database.publications
          .filter((row) => projectIds.has(row.project_id))
          .map((row) => ({ id: row.id })) as T[],
        success: true,
      };
    }
    if (this.sql.includes("SELECT id FROM estimates")) {
      const projectIds = new Set(this.values.map(String));
      return {
        results: this.database.estimates
          .filter((row) => projectIds.has(row.project_id))
          .map((row) => ({ id: row.id })) as T[],
        success: true,
      };
    }
    return { results: [] as T[], success: true };
  }

  async run() {
    this.database.runStatements.push(this);
    return { success: true };
  }
}

class FakeD1Database {
  allStatements: FakeD1Statement[] = [];
  firstStatements: FakeD1Statement[] = [];
  runStatements: FakeD1Statement[] = [];
  batchStatements: FakeD1Statement[] = [];
  projects: FakeProjectRow[] = [
    {
      id: PROJECT_ID,
      workspace_id: WORKSPACE_ID,
      name: "Library Tower",
      client_name: null,
      location: null,
      project_code: "LT-01",
      currency_code: "PHP",
      metadata: JSON.stringify({
        projectImagePath: `${WORKSPACE_ID}/project-images/tower.webp`,
        projectImageThumbnailPath: `${WORKSPACE_ID}/project-images/tower-thumb.webp`,
      }),
      created_by: USER_ID,
      created_at: "2026-07-01T00:00:00.000Z",
      updated_at: "2026-07-01T00:00:00.000Z",
      workspace_role: "owner",
      project_role: null,
    },
  ];
  estimates = [{ id: ESTIMATE_ID, project_id: PROJECT_ID }];
  publications = [
    {
      id: PUBLICATION_ID,
      project_id: PROJECT_ID,
      status: "published",
      revoked_at: null,
    },
  ];

  prepare(sql: string) {
    return new FakeD1Statement(this, sql);
  }

  async batch(statements: FakeD1Statement[]) {
    this.batchStatements.push(...statements);
    return statements.map(() => ({ success: true }));
  }
}

describe("project bulk deletion D1 actions", () => {
  beforeEach(() => {
    getCloudflareD1Database.mockReset();
    requireCurrentUserContext.mockReset();
    requireAuth.mockReset();
    createRuntimeUploadStorageProvider.mockReset();
    revalidatePath.mockReset();
    requireCurrentUserContext.mockResolvedValue({
      userId: USER_ID,
      email: "owner@example.test",
      role: "user",
    });
    requireAuth.mockResolvedValue(undefined);
    createRuntimeUploadStorageProvider.mockResolvedValue({
      removeObjects: vi.fn(async () => undefined),
    });
  });

  it("previews owner-managed project deletion with active-publication warnings and R2 cleanup targets", async () => {
    const database = new FakeD1Database();
    getCloudflareD1Database.mockResolvedValue(database);

    const preview = await previewBulkDeleteProjects({
      projectIds: [PROJECT_ID],
    });

    expect(preview.ok).toBe(true);
    expect(preview.eligibleIds).toEqual([PROJECT_ID]);
    expect(preview.summary).toMatchObject({
      eligibleCount: 1,
      warningsCount: 1,
      estimateCount: 1,
      storageTargetCount: 2,
    });
    expect(preview.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "active_publication" }),
      ]),
    );
    expect(preview.storageTargets).toEqual([
      {
        bucket: "project-images",
        path: `${WORKSPACE_ID}/project-images/tower-thumb.webp`,
      },
      {
        bucket: "project-images",
        path: `${WORKSPACE_ID}/project-images/tower.webp`,
      },
    ]);
  });

  it("executes project deletion through a D1 batch and rejects stale previews", async () => {
    const database = new FakeD1Database();
    getCloudflareD1Database.mockResolvedValue(database);

    const preview = await previewBulkDeleteProjects({
      projectIds: [PROJECT_ID],
    });
    const stale = await executeBulkDeleteProjects({
      projectIds: [PROJECT_ID],
      expectedPreviewHash: "stale",
    });
    const executed = await executeBulkDeleteProjects({
      projectIds: [PROJECT_ID],
      expectedPreviewHash: preview.previewHash ?? "",
      correlationId: "66666666-6666-4666-8666-666666666666",
    });

    expect(stale.ok).toBe(false);
    expect(stale.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "stale_preview" }),
      ]),
    );
    expect(executed.ok).toBe(true);
    expect(executed.deletedIds).toEqual([PROJECT_ID]);
    expect(executed.auditEventId).toMatch(/[0-9a-f-]{36}/);
    expect(
      database.batchStatements.map((statement) => statement.sql).join("\n"),
    ).toContain("INSERT INTO mass_deletion_events");
    expect(
      database.batchStatements.map((statement) => statement.sql).join("\n"),
    ).toContain("DELETE FROM project_publications");
    expect(
      database.batchStatements.map((statement) => statement.sql).join("\n"),
    ).toContain("DELETE FROM projects");
    expect(createRuntimeUploadStorageProvider).toHaveBeenCalledTimes(1);
    expect(revalidatePath).toHaveBeenCalledWith("/workshop/projects");
  });
});
