import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCloudflareD1Database: vi.fn(),
  listCurrentWorkspaceProjects: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/cloudflare/d1", () => ({
  getCloudflareD1Database: mocks.getCloudflareD1Database,
}));
vi.mock("@/lib/repositories/workspace-repository", () => ({
  listCurrentWorkspaceProjects: mocks.listCurrentWorkspaceProjects,
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
      return [{ id: "publication-1", project_id: "project-1" }];
    }
    if (sql.includes("FROM shared_link_comments")) {
      return [
        {
          id: "comment-1",
          created_at: "2026-06-22T00:00:00.000Z",
          body: "Looks good",
          is_internal: 0,
          author_email: "client@example.com",
          author_name: null,
          recipient_id: "recipient-1",
          publication_id: "publication-1",
          estimate_id: "estimate-1",
          row_id: null,
          target_kind: "proposal",
          target_label: "Proposal",
          target_secondary_label: null,
          snapshot_version_at_comment: 2,
        },
      ];
    }
    if (sql.includes("FROM shared_link_responses")) {
      return [
        {
          id: "response-1",
          created_at: "2026-06-23T00:00:00.000Z",
          decision: "accepted",
          note: "Approved",
          recipient_id: "recipient-1",
          publication_id: "publication-1",
          estimate_id: "estimate-1",
          row_id: null,
          signer_name: "Client Signer",
          target_kind: "proposal",
          target_label: "Proposal",
          target_secondary_label: null,
          snapshot_version_at_decision: 2,
        },
      ];
    }
    if (sql.includes("FROM shared_link_events")) {
      return [
        {
          id: "event-1",
          created_at: "2026-06-24T00:00:00.000Z",
          event_type: "open",
          metadata_json: JSON.stringify({ channel: "share" }),
          publication_id: "publication-1",
          recipient_id: "recipient-1",
        },
      ];
    }
    if (sql.includes("FROM collaboration_audit_events")) {
      return [
        {
          id: "collab-1",
          created_at: "2026-06-21T00:00:00.000Z",
          event_type: "invite_email_attempted",
          actor_user_id: "11111111-1111-4111-8111-111111111111",
          project_id: "project-1",
          metadata: JSON.stringify({ role: "viewer" }),
        },
      ];
    }
    if (sql.includes("FROM estimate_sheet_events")) {
      throw new Error("no such table: estimate_sheet_events");
    }
    if (sql.includes("FROM shared_link_recipients")) {
      return [{ id: "recipient-1", email: "client@example.com", display_name: "Client Person" }];
    }
    if (sql.includes("FROM profiles")) {
      return [
        {
          id: "11111111-1111-4111-8111-111111111111",
          display_name: "Philip Lewis",
          email: "philip@example.com",
        },
      ];
    }
    throw new Error(`Unexpected D1 query: ${sql}`);
  }
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.listCurrentWorkspaceProjects.mockResolvedValue({
    workspace: { id: "workspace-1" },
    projects: [
      {
        currentUserRole: "owner",
        project: { id: "project-1", name: "Kitchen Remodel" },
      },
    ],
  });
});

describe("Publisher activity D1 repository", () => {
  it("builds the workspace activity union from D1 and reports missing estimate events as partial", async () => {
    const database = new FakeD1Database();
    mocks.getCloudflareD1Database.mockResolvedValue(database);

    const { readPublisherWorkspaceActivity } = await import("@/lib/publisher/activity-repository");
    const result = await readPublisherWorkspaceActivity({ limit: 10 });

    expect(result.partial).toBe(true);
    expect(result.unavailableSources).toEqual(["estimate_sheet_events"]);
    expect(result.hasMore).toBe(false);
    expect(result.activities.map((activity) => activity.id)).toEqual([
      "event-1",
      "response-1",
      "comment-1",
      "collab-1",
    ]);
    expect(result.activities[0]?.title).toBe("Client Person viewed the proposal.");
    expect(result.activities[1]?.title).toBe("Client Person approved the proposal.");
    expect(result.activities[3]?.title).toBe("Philip Lewis invited a collaborator.");
    expect(database.prepared[0]?.sql).toContain("FROM project_publications");
    expect(database.prepared[0]?.values).toEqual(["workspace-1", "project-1", 250]);
    expect(database.prepared.map((statement) => statement.sql).join("\n")).not.toContain("createSupabase");
  });
});
