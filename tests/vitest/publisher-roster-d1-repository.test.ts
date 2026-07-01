import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCloudflareD1Database: vi.fn(),
  requireCurrentUserContext: vi.fn(),
  listCurrentWorkspaceProjects: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/cloudflare/d1", () => ({
  getCloudflareD1Database: mocks.getCloudflareD1Database,
}));
vi.mock("@/lib/auth/session", () => ({
  requireCurrentUserContext: mocks.requireCurrentUserContext,
}));
vi.mock("@/lib/repositories/workspace-repository", () => ({
  listCurrentWorkspaceProjects: mocks.listCurrentWorkspaceProjects,
  readLatestPublicationActivityTimestamp: (values: Array<string | null | undefined>) => {
    return values
      .filter((value): value is string => Boolean(value))
      .sort((left, right) => Date.parse(right) - Date.parse(left))[0] ?? null;
  },
  readPublicationSnapshotStaleness: ({
    latestEstimateUpdatedAt,
    snapshotGeneratedAt,
  }: {
    latestEstimateUpdatedAt: string | null;
    snapshotGeneratedAt: string | null;
  }) => {
    if (!latestEstimateUpdatedAt || !snapshotGeneratedAt) return null;
    if (Date.parse(latestEstimateUpdatedAt) <= Date.parse(snapshotGeneratedAt)) return null;
    return { daysBehind: 1, latestEstimateUpdatedAt, snapshotGeneratedAt };
  },
}));

type PreparedD1Statement = {
  sql: string;
  values: unknown[];
};

class FakeD1Statement {
  private values: unknown[] = [];

  constructor(
    private readonly database: FakeD1Database,
    private readonly sql: string,
  ) {}

  bind(...values: unknown[]) {
    this.values = values;
    this.database.prepared.push({ sql: this.sql, values });
    return this;
  }

  async all() {
    return { results: this.database.resolve(this.sql, this.values) };
  }
}

class FakeD1Database {
  prepared: PreparedD1Statement[] = [];

  prepare(sql: string) {
    return new FakeD1Statement(this, sql);
  }

  resolve(sql: string, _values: unknown[]) {
    if (sql.includes("FROM project_publications")) {
      return [
        {
          id: "publication-1",
          project_id: "project-1",
          workspace_id: "workspace-1",
          encrypted_token: null,
          password_hash: "stored-password-hash",
          status: "published",
          snapshot_json: JSON.stringify({ generatedAt: "2026-06-19T00:00:00.000Z" }),
          snapshot_version: 4,
          selected_estimate_ids: JSON.stringify(["estimate-1"]),
          published_at: "2026-06-20T00:00:00.000Z",
          expires_at: null,
          revoked_at: null,
          open_count: 3,
          latest_opened_at: "2026-06-21T00:00:00.000Z",
        },
      ];
    }
    if (sql.includes("FROM shared_link_recipients")) {
      return [{ publication_id: "publication-1" }, { publication_id: "publication-1" }];
    }
    if (sql.includes("FROM shared_link_comments")) {
      return [{ publication_id: "publication-1", created_at: "2026-06-22T00:00:00.000Z" }];
    }
    if (sql.includes("FROM shared_link_responses")) {
      return [{ publication_id: "publication-1", created_at: "2026-06-23T00:00:00.000Z" }];
    }
    if (sql.includes("FROM estimates")) {
      return [{ id: "estimate-1", project_id: "project-1", updated_at: "2026-06-24T00:00:00.000Z" }];
    }
    throw new Error(`Unexpected D1 query: ${sql}`);
  }
}

const filters = {
  page: 1,
  pageSize: 50,
  projectId: null,
  search: "",
  status: "all" as const,
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireCurrentUserContext.mockResolvedValue({ userId: "user-1" });
  mocks.listCurrentWorkspaceProjects.mockResolvedValue({
    workspace: { id: "workspace-1" },
    projects: [
      {
        currentUserRole: "owner",
        project: {
          id: "project-1",
          name: "Kitchen Remodel",
          project_code: "KR-001",
          client_name: "Lewis Family",
          location: "Makati",
        },
      },
    ],
  });
});

describe("Publisher roster D1 repository", () => {
  it("reads publication roster facts from Cloudflare D1", async () => {
    const database = new FakeD1Database();
    mocks.getCloudflareD1Database.mockResolvedValue(database);

    const { readWorkspacePublicationsRoster } = await import("@/lib/publisher/roster-repository");
    const result = await readWorkspacePublicationsRoster("workspace-1", "user-1", filters);

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({
      clientName: "Lewis Family",
      latestActivityAt: "2026-06-23T00:00:00.000Z",
      openCount: 3,
      passwordRequired: true,
      projectCode: "KR-001",
      projectId: "project-1",
      projectName: "Kitchen Remodel",
      publicationId: "publication-1",
      recipientCount: 2,
      selectedEstimateCount: 1,
      selectedEstimateIds: ["estimate-1"],
      snapshotVersion: 4,
      status: "published",
      workspaceId: "workspace-1",
    });
    expect(result.rows[0]?.staleSnapshotWarning).toEqual({
      daysBehind: 1,
      latestEstimateUpdatedAt: "2026-06-24T00:00:00.000Z",
      snapshotGeneratedAt: "2026-06-19T00:00:00.000Z",
    });

    expect(database.prepared).toHaveLength(5);
    expect(database.prepared[0]?.sql).toContain("FROM project_publications");
    expect(database.prepared[0]?.sql).toContain("WHERE workspace_id = ? AND project_id IN (?)");
    expect(database.prepared[0]?.values).toEqual(["workspace-1", "project-1", 100]);
    expect(database.prepared.map((statement) => statement.sql).join("\n")).not.toContain("supabase");
  });
});
