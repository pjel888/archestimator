import { beforeEach, describe, expect, it, vi } from "vitest";

const workspaceRepositoryMocks = vi.hoisted(() => ({
  getCurrentWorkspaceProject: vi.fn(),
}));

const d1Mocks = vi.hoisted(() => ({
  getCloudflareD1Database: vi.fn(),
}));

vi.mock("@/lib/repositories/workspace-repository", () => workspaceRepositoryMocks);
vi.mock("@/lib/cloudflare/d1", () => d1Mocks);

const ACTOR_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

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
  eventResults: Array<unknown[] | Error> = [];
  prepared: PreparedD1Statement[] = [];
  profileRows: unknown[] = [];

  prepare(sql: string) {
    return new FakeD1Statement(this, sql);
  }

  resolve(sql: string, _values: unknown[]) {
    if (sql.includes("FROM estimate_sheet_events event")) {
      const next = this.eventResults.shift() ?? [];
      if (next instanceof Error) throw next;
      return next;
    }
    if (sql.includes("FROM profiles")) {
      return this.profileRows;
    }
    throw new Error(`Unexpected D1 query: ${sql}`);
  }
}

function makeEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    event_type: "row_updated",
    event_source: "server_action",
    created_at: "2026-06-19T08:00:00.000Z",
    actor_user_id: ACTOR_ID,
    estimate_id: "estimate-1",
    estimate_name: "Shell Estimate",
    estimate_sheet_code: "EST-001",
    estimate_tab_id: null,
    target_row_id: "row-1",
    estimate_node_id: "node-1",
    row_context: JSON.stringify({ material: "Porcelain tile", nodePath: "Ground Floor / Bath" }),
    old_snapshot: JSON.stringify({ quantity: 1, internalNote: "do not leak" }),
    new_snapshot: JSON.stringify({ quantity: 2, supplierEmail: "supplier@example.test" }),
    changed_fields: JSON.stringify(["quantity"]),
    total_delta: 1000,
    payload: JSON.stringify({ rawSecret: "hidden", estimateName: "Shell Estimate" }),
    correlation_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    ...overrides,
  };
}

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  workspaceRepositoryMocks.getCurrentWorkspaceProject.mockResolvedValue({
    project: { id: "project-1", workspace_id: "workspace-1" },
  });
});

describe("project activity repository", () => {
  it("returns an empty page without profile hydration when no D1 project activity exists", async () => {
    const database = new FakeD1Database();
    database.eventResults = [[]];
    d1Mocks.getCloudflareD1Database.mockResolvedValue(database);

    const { listProjectActivityPage } = await import("@/lib/repositories/project-activity-repository");
    const result = await listProjectActivityPage({ projectId: "project-1" });

    expect(result).toEqual({ items: [], nextCursor: null });
    expect(database.prepared).toHaveLength(1);
    expect(database.prepared[0]?.sql).toContain("FROM estimate_sheet_events event");
    expect(database.prepared[0]?.sql).toContain("LEFT JOIN estimates estimate");
    expect(database.prepared[0]?.sql).toContain("event.event_type NOT IN (?, ?)");
    expect(database.prepared[0]?.values).toEqual([
      "project-1",
      "sheet_version_created",
      "sheet_restored_as_copy",
      21,
    ]);
  });

  it("returns an empty page when the D1 project activity table is not available", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const database = new FakeD1Database();
    database.eventResults = [new Error("no such table: estimate_sheet_events")];
    d1Mocks.getCloudflareD1Database.mockResolvedValue(database);

    const { listProjectActivityPage } = await import("@/lib/repositories/project-activity-repository");
    const result = await listProjectActivityPage({ projectId: "project-1" });

    expect(result).toEqual({ items: [], nextCursor: null });
    expect(warnSpy).toHaveBeenCalledWith(
      "[project-dashboard] Project activity D1 schema is unavailable; apply estimate_sheet_events migration.",
    );
    warnSpy.mockRestore();
  });

  it("rethrows unrelated activity schema errors", async () => {
    const database = new FakeD1Database();
    database.eventResults = [new Error("no such column: event.actor_display_name")];
    d1Mocks.getCloudflareD1Database.mockResolvedValue(database);

    const { listProjectActivityPage } = await import("@/lib/repositories/project-activity-repository");
    await expect(listProjectActivityPage({ projectId: "project-1" })).rejects.toThrow(
      "no such column: event.actor_display_name",
    );
  });

  it("returns a redacted bounded activity page with a stable keyset cursor", async () => {
    const first = makeEvent({
      id: "11111111-1111-4111-8111-111111111111",
      created_at: "2026-06-19T08:00:00.000Z",
    });
    const second = makeEvent({
      id: "22222222-2222-4222-8222-222222222222",
      created_at: "2026-06-19T07:00:00.000Z",
      estimate_name: null,
      estimate_sheet_code: null,
    });
    const third = makeEvent({
      id: "33333333-3333-4333-8333-333333333333",
      created_at: "2026-06-19T06:00:00.000Z",
    });
    const database = new FakeD1Database();
    database.eventResults = [[first, second, third]];
    database.profileRows = [{ id: ACTOR_ID, display_name: "Philip Lewis", email: "philip@example.test" }];
    d1Mocks.getCloudflareD1Database.mockResolvedValue(database);

    const { listProjectActivityPage } = await import("@/lib/repositories/project-activity-repository");
    const result = await listProjectActivityPage({
      projectId: "project-1",
      limit: 2,
      cursor: {
        createdAt: "2026-06-19T09:00:00.000Z",
        id: ACTOR_ID,
      },
    });

    expect(database.prepared[0]?.values).toEqual([
      "project-1",
      "sheet_version_created",
      "sheet_restored_as_copy",
      "2026-06-19T09:00:00.000Z",
      "2026-06-19T09:00:00.000Z",
      ACTOR_ID,
      3,
    ]);
    expect(database.prepared[1]?.sql).toContain("FROM profiles");
    expect(database.prepared[1]?.values).toEqual([ACTOR_ID]);
    expect(result.items).toHaveLength(2);
    expect(result.items[0]).toEqual(expect.objectContaining({
      actorLabel: "Philip Lewis",
      estimateName: "Shell Estimate",
      sheetCode: "EST-001",
      href: "/workshop/projects/project-1/estimates",
    }));
    expect(result.items[1]).toEqual(expect.objectContaining({
      estimateName: "Deleted estimate",
      sheetCode: null,
    }));
    expect(JSON.stringify(result.items)).not.toContain("rawSecret");
    expect(JSON.stringify(result.items)).not.toContain("internalNote");
    expect(JSON.stringify(result.items)).not.toContain("supplier@example.test");
    expect(JSON.stringify(result.items)).not.toContain("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb");
    expect(result.nextCursor).toEqual({
      createdAt: "2026-06-19T07:00:00.000Z",
      id: "22222222-2222-4222-8222-222222222222",
    });
  });

  it("pages activity with no duplicate rows across cursor windows", async () => {
    const first = makeEvent({
      id: "11111111-1111-4111-8111-111111111111",
      created_at: "2026-06-19T08:00:00.000Z",
      actor_user_id: null,
    });
    const second = makeEvent({
      id: "22222222-2222-4222-8222-222222222222",
      created_at: "2026-06-19T07:00:00.000Z",
      actor_user_id: null,
    });
    const third = makeEvent({
      id: "33333333-3333-4333-8333-333333333333",
      created_at: "2026-06-19T06:00:00.000Z",
      actor_user_id: null,
    });
    const fourth = makeEvent({
      id: "44444444-4444-4444-8444-444444444444",
      created_at: "2026-06-19T05:00:00.000Z",
      actor_user_id: null,
    });
    const database = new FakeD1Database();
    database.eventResults = [[first, second, third], [third, fourth]];
    d1Mocks.getCloudflareD1Database.mockResolvedValue(database);

    const { listProjectActivityPage } = await import("@/lib/repositories/project-activity-repository");
    const firstPage = await listProjectActivityPage({ projectId: "project-1", limit: 2 });
    const secondPage = await listProjectActivityPage({
      projectId: "project-1",
      limit: 2,
      cursor: firstPage.nextCursor,
    });

    expect(firstPage.items.map((item) => item.id)).toEqual([first.id, second.id]);
    expect(firstPage.nextCursor).toEqual({ createdAt: second.created_at, id: second.id });
    expect(secondPage.items.map((item) => item.id)).toEqual([third.id, fourth.id]);
    expect(new Set([...firstPage.items, ...secondPage.items].map((item) => item.id)).size).toBe(4);
  });

  it("rejects invalid cursors before querying event rows", async () => {
    const database = new FakeD1Database();
    d1Mocks.getCloudflareD1Database.mockResolvedValue(database);

    const { listProjectActivityPage } = await import("@/lib/repositories/project-activity-repository");
    await expect(listProjectActivityPage({
      projectId: "project-1",
      cursor: { createdAt: "bad-date", id: ACTOR_ID },
    })).rejects.toThrow("Project activity cursor timestamp is invalid.");

    expect(database.prepared).toEqual([]);
  });
});
