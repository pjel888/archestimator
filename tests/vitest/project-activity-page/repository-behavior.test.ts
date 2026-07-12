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

import { decodeProjectActivityFeedCursor, readProjectActivityFeed } from "@/lib/repositories/project-activity-feed-repository";

const PROJECT_ID = "11111111-1111-4111-8111-111111111111";
const WORKSPACE_ID = "22222222-2222-4222-8222-222222222222";
const ESTIMATE_ID = "33333333-3333-4333-8333-333333333333";
const BETTER_AUTH_USER_ID = "OSqP1zB0TgLTAzeGFpHCFEfRM6nQ79pG";

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
  clientPortalAuditResults: Array<unknown[] | Error> | null = null;

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
    if (sql.includes("FROM client_portal_audit_events")) {
      const next = this.clientPortalAuditResults?.shift();
      if (next instanceof Error) throw next;
      return next ?? this.rows.client_portal_audit_events ?? [];
    }
    if (sql.includes("FROM collaboration_audit_events")) return this.rows.collaboration_audit_events ?? [];
    if (sql.includes("FROM shared_link_recipients")) return this.rows.shared_link_recipients ?? [];
    if (sql.includes('FROM "user"')) return this.rows.user ?? [];
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

function estimateEventRow(overrides: Record<string, unknown> = {}) {
  return {
    actor_user_id: BETTER_AUTH_USER_ID,
    changed_fields: ["name"],
    correlation_id: "corr-1",
    created_at: "2026-06-28T09:00:00.000Z",
    estimate_id: ESTIMATE_ID,
    estimate_node_id: null,
    estimate_tab_id: null,
    event_source: "server_action",
    event_type: "estimate_details_updated",
    id: "event-1",
    new_snapshot: { name: "Main Estimate" },
    old_snapshot: { name: "Original Estimate" },
    payload: {},
    project_id: PROJECT_ID,
    row_context: {},
    target_row_id: null,
    total_delta: null,
    ...overrides,
  };
}

function clientPortalAuditRow(overrides: Record<string, unknown> = {}) {
  return {
    actor_id: "portal-recipient-id",
    actor_type: "recipient",
    event_type: "thread_created",
    id: "portal-audit-1",
    occurred_at: "2026-07-12T08:00:00.000Z",
    metadata_json: { email: "recipient@example.test", threadId: "secret-thread-id" },
    ...overrides,
  };
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
    }, { project_publications: 1 });
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

    expect(sourceRead?.values).toEqual([PROJECT_ID, WORKSPACE_ID, "open", "password_attempt", 21]);
    expect(filteredCount?.values).toEqual([PROJECT_ID, WORKSPACE_ID, "open", "password_attempt"]);
  });

  it("resolves Better Auth actor names without requiring legacy profile rows or UUID ids", async () => {
    const database = new FakeD1Database({
      estimate_sheet_events: [estimateEventRow()],
      user: [{ id: BETTER_AUTH_USER_ID, name: "Philip Lewis", email: "philip@example.test" }],
    });
    d1Mocks.getCloudflareD1Database.mockResolvedValue(database);

    const page = await readProjectActivityFeed({
      projectId: PROJECT_ID,
      limit: 20,
    });

    expect(page.items[0]?.actor).toMatchObject({
      id: BETTER_AUTH_USER_ID,
      displayName: "Philip Lewis",
      kind: "user",
    });
    expect(page.items[0]?.title).toContain("Philip Lewis");
  });

  it("keeps Better Auth ids when filtering activity by the current actor", async () => {
    mocks.getCurrentUserContext.mockResolvedValue({ userId: BETTER_AUTH_USER_ID });
    const database = new FakeD1Database({ estimate_sheet_events: [] });
    d1Mocks.getCloudflareD1Database.mockResolvedValue(database);

    await readProjectActivityFeed({
      projectId: PROJECT_ID,
      filters: { actorUserId: "me" },
      limit: 20,
    });

    const sourceRead = d1RecordsFor(database, "estimate_sheet_events")
      .find((record) => record.sql.includes("SELECT id, event_type"));
    expect(sourceRead?.sql).toContain("actor_user_id = ?");
    expect(sourceRead?.values).toContain(BETTER_AUTH_USER_ID);
  });

  it("projects only allowlisted Client Portal audit facts within the current project and workspace", async () => {
    const database = new FakeD1Database({
      client_portal_audit_events: [clientPortalAuditRow()],
    }, { client_portal_audit_events: 1 });
    d1Mocks.getCloudflareD1Database.mockResolvedValue(database);

    const page = await readProjectActivityFeed({ projectId: PROJECT_ID, limit: 20 });
    const activity = page.items.find((item) => item.id === "portal-audit-1");
    const sourceRead = d1RecordsFor(database, "client_portal_audit_events")
      .find((record) => record.sql.includes("SELECT event.id"));

    expect(sourceRead?.sql).toContain("INNER JOIN client_portals portal ON portal.id = event.portal_id");
    expect(sourceRead?.sql).toContain("event.visibility = 'client_safe'");
    expect(sourceRead?.sql).toContain("event.event_type IN");
    expect(sourceRead?.sql).not.toContain("metadata_json");
    expect(sourceRead?.values).toEqual([
      WORKSPACE_ID,
      WORKSPACE_ID,
      PROJECT_ID,
      "issue_issued",
      "issue_superseded",
      "thread_created",
      "message_created",
      "thread_resolved",
      "thread_reopened",
      "decision_submitted",
      21,
    ]);
    expect(activity).toMatchObject({
      actor: { kind: "recipient", displayName: "Client" },
      source: "system",
      target: { kind: "system", label: "Client portal" },
      title: "Client portal activity recorded.",
    });
    expect(JSON.stringify(activity)).not.toContain("recipient@example.test");
    expect(JSON.stringify(activity)).not.toContain("portal-recipient-id");
    expect(JSON.stringify(activity)).not.toContain("secret-thread-id");
  });

  it("retains a separate Client Portal cursor across pages", async () => {
    const first = clientPortalAuditRow({ id: "portal-audit-1", occurred_at: "2026-07-12T08:00:00.000Z" });
    const second = clientPortalAuditRow({ id: "portal-audit-2", occurred_at: "2026-07-12T07:00:00.000Z" });
    const third = clientPortalAuditRow({ id: "portal-audit-3", occurred_at: "2026-07-12T06:00:00.000Z" });
    const database = new FakeD1Database({}, { client_portal_audit_events: 3 });
    database.clientPortalAuditResults = [[first, second], [second, third]];
    d1Mocks.getCloudflareD1Database.mockResolvedValue(database);

    const firstPage = await readProjectActivityFeed({ projectId: PROJECT_ID, includeCounts: false, limit: 1 });
    const secondPage = await readProjectActivityFeed({ projectId: PROJECT_ID, includeCounts: false, cursor: firstPage.nextCursor, limit: 1 });

    expect(firstPage.items.map((item) => item.id)).toEqual([first.id]);
    expect(decodeProjectActivityFeedCursor(firstPage.nextCursor).client_portal_audit_events).toEqual({ createdAt: first.occurred_at, id: first.id });
    expect(secondPage.items.map((item) => item.id)).toEqual([second.id]);
  });

  it("marks Client Portal audit data unavailable without failing the rest of the project feed", async () => {
    const database = new FakeD1Database();
    database.clientPortalAuditResults = [new Error("no such table: client_portal_audit_events")];
    d1Mocks.getCloudflareD1Database.mockResolvedValue(database);

    const page = await readProjectActivityFeed({ projectId: PROJECT_ID, includeCounts: false, limit: 20 });

    expect(page.items).toEqual([]);
    expect(page.partial).toBe(true);
    expect(page.unavailableSources).toContain("client_portal_audit_events");
  });
});
