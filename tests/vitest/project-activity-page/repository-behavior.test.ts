import { beforeEach, describe, expect, it, vi } from "vitest";

const d1Mocks = vi.hoisted(() => ({
  getCloudflareD1Database: vi.fn(),
}));

const mocks = vi.hoisted(() => ({
  getCurrentUserContext: vi.fn(),
  getCurrentWorkspaceProject: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@/lib/auth/session", () => ({
  getCurrentUserContext: mocks.getCurrentUserContext,
}));

vi.mock("@/lib/cloudflare/d1", () => ({
  getCloudflareD1Database: d1Mocks.getCloudflareD1Database,
}));

vi.mock("@/lib/repositories/workspace-repository", () => ({
  getCurrentWorkspaceProject: mocks.getCurrentWorkspaceProject,
}));

import { readProjectActivityFeed } from "@/lib/repositories/project-activity-feed-repository";

const PROJECT_ID = "11111111-1111-4111-8111-111111111111";
const WORKSPACE_ID = "22222222-2222-4222-8222-222222222222";
const ESTIMATE_ID = "33333333-3333-4333-8333-333333333333";

type PreparedRecord = {
  sql: string;
  values: unknown[];
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

  async all<T = Record<string, unknown>>() {
    this.database.records.push({ sql: this.sql, values: this.values });
    return { success: true, results: this.database.resolveRows(this.sql) as T[] };
  }

  async first<T = Record<string, unknown>>() {
    this.database.records.push({ sql: this.sql, values: this.values });
    return this.database.resolveRows(this.sql)[0] as T | undefined ?? null;
  }

  async run() {
    this.database.records.push({ sql: this.sql, values: this.values });
    return { success: true, meta: { changes: 1 } };
  }
}

class FakeD1Database {
  readonly records: PreparedRecord[] = [];

  constructor(
    private readonly rows: Record<string, unknown[]> = {},
    private readonly counts: Record<string, number> = {},
  ) {}

  prepare(sql: string) {
    return new FakeD1Statement(this, sql);
  }

  resolveRows(sql: string) {
    const countMatch = sql.match(/COUNT\(\*\) AS count FROM\s+([a-z_]+)/i);
    if (countMatch?.[1]) return [{ count: this.counts[countMatch[1]] ?? 0 }];

    if (sql.includes("FROM project_publications")) return this.rows.project_publications ?? [];
    if (sql.includes("FROM estimate_sheet_events")) return this.rows.estimate_sheet_events ?? [];
    if (sql.includes("FROM shared_link_comments")) return this.rows.shared_link_comments ?? [];
    if (sql.includes("FROM shared_link_responses")) return this.rows.shared_link_responses ?? [];
    if (sql.includes("FROM shared_link_events")) return this.rows.shared_link_events ?? [];
    if (sql.includes("FROM collaboration_audit_events")) return this.rows.collaboration_audit_events ?? [];
    if (sql.includes("FROM shared_link_recipients")) return this.rows.shared_link_recipients ?? [];
    if (sql.includes("FROM profiles")) return this.rows.profiles ?? [];
    return [];
  }
}

function publicationRow(overrides: Record<string, unknown> = {}) {
  return {
    activity_target_labels_json: { estimateLabels: {}, rowLabels: {}, rowEstimateIds: {} },
    id: "pub-base",
    project_id: PROJECT_ID,
    published_at: "2026-06-28T09:00:00.000Z",
    published_by: null,
    revoked_at: null,
    selected_estimate_ids: [],
    snapshot_version: 1,
    status: "published",
    ...overrides,
  };
}

function d1RecordsFor(database: FakeD1Database, table: string) {
  return database.records.filter((record) => record.sql.includes(`FROM ${table}`));
}

describe("project activity repository behavior", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUserContext.mockResolvedValue({ userId: "44444444-4444-4444-8444-444444444444" });
    mocks.getCurrentWorkspaceProject.mockResolvedValue({
      project: { id: PROJECT_ID, workspace_id: WORKSPACE_ID },
    });
  });

  it("includes estimate-scoped publications matched through activity target labels", async () => {
    const database = new FakeD1Database({
      project_publications: [
        publicationRow({
          id: "pub-label-match",
          activity_target_labels_json: { estimateLabels: { [ESTIMATE_ID]: "Main Estimate" } },
          selected_estimate_ids: [],
        }),
        publicationRow({
          id: "pub-other",
          activity_target_labels_json: { estimateLabels: { "55555555-5555-4555-8555-555555555555": "Other" } },
          selected_estimate_ids: [],
        }),
      ],
    });
    d1Mocks.getCloudflareD1Database.mockResolvedValue(database);

    const page = await readProjectActivityFeed({
      projectId: PROJECT_ID,
      scope: { kind: "estimate", estimateId: ESTIMATE_ID },
      filters: { actions: ["shared"] },
      limit: 20,
    });

    expect(page.items.map((item) => item.id)).toEqual(["pub-label-match"]);
    expect(page.counts).toMatchObject({
      filteredTotalCount: 1,
      scopeTotalCount: 1,
    });
  });

  it("excludes estimate-tied comments and responses from project-only scope in reads and counts", async () => {
    const database = new FakeD1Database({
      project_publications: [publicationRow({ id: "pub-project" })],
    });
    d1Mocks.getCloudflareD1Database.mockResolvedValue(database);

    await readProjectActivityFeed({
      projectId: PROJECT_ID,
      scope: { kind: "project-only" },
      limit: 20,
    });

    const comments = d1RecordsFor(database, "shared_link_comments");
    const responses = d1RecordsFor(database, "shared_link_responses");

    expect(comments.length).toBeGreaterThanOrEqual(2);
    expect(responses.length).toBeGreaterThanOrEqual(2);
    for (const record of [...comments, ...responses]) {
      expect(record.sql).toContain("estimate_id IS NULL");
    }
  });

  it("pushes viewed action filtering into shared-link event reads and filtered counts", async () => {
    const database = new FakeD1Database({
      project_publications: [publicationRow({ id: "pub-project" })],
    });
    d1Mocks.getCloudflareD1Database.mockResolvedValue(database);

    await readProjectActivityFeed({
      projectId: PROJECT_ID,
      filters: { actions: ["viewed"] },
      limit: 20,
    });

    const eventRecords = d1RecordsFor(database, "shared_link_events");
    const sourceRead = eventRecords.find((record) => record.sql.includes("SELECT id, created_at") && record.sql.includes("event_type IN"));
    const filteredCount = eventRecords.find((record) => record.sql.includes("COUNT(*) AS count") && record.sql.includes("event_type IN"));

    expect(sourceRead?.values).toEqual(["pub-project", "open", "password_attempt", 21]);
    expect(filteredCount?.values).toEqual(["pub-project", "open", "password_attempt"]);
  });
});
