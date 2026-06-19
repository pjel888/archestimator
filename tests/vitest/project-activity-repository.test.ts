import { beforeEach, describe, expect, it, vi } from "vitest";

const workspaceRepositoryMocks = vi.hoisted(() => ({
  getCurrentWorkspaceProject: vi.fn(),
}));

const supabaseServerMocks = vi.hoisted(() => ({
  createSupabaseServerClient: vi.fn(),
}));

vi.mock("@/lib/repositories/workspace-repository", () => workspaceRepositoryMocks);
vi.mock("@/lib/supabase/server", () => supabaseServerMocks);

type QueryResult<T> = { data: T; error: (Error & { code?: string }) | null };

function createQuery<T>(result: QueryResult<T>) {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    not: vi.fn(() => builder),
    or: vi.fn(() => builder),
    order: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    in: vi.fn(async () => result),
    maybeSingle: vi.fn(async () => result),
    then: (resolve: (value: QueryResult<T>) => void) => Promise.resolve(result).then(resolve),
  };
  return builder;
}

function makeEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    event_type: "row_updated",
    event_source: "server_action",
    created_at: "2026-06-19T08:00:00.000Z",
    actor_user_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    estimate_id: "estimate-1",
    estimate_tab_id: null,
    target_row_id: "row-1",
    estimate_node_id: "node-1",
    row_context: { material: "Porcelain tile", nodePath: "Ground Floor / Bath" },
    old_snapshot: { quantity: 1, internalNote: "do not leak" },
    new_snapshot: { quantity: 2, supplierEmail: "supplier@example.test" },
    changed_fields: ["quantity"],
    total_delta: 1000,
    payload: { rawSecret: "hidden", estimateName: "Shell Estimate" },
    correlation_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    metadata: { requestId: "secret" },
    estimates: { id: "estimate-1", name: "Shell Estimate", sheet_code: "EST-001" },
    ...overrides,
  };
}

describe("project activity repository", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    workspaceRepositoryMocks.getCurrentWorkspaceProject.mockResolvedValue({
      project: { id: "project-1", workspace_id: "workspace-1" },
    });
  });

  it("returns an empty page without profile hydration when no project activity exists", async () => {
    const eventsQuery = createQuery({ data: [], error: null });
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === "estimate_sheet_events") return eventsQuery;
        throw new Error(`Unexpected table ${table}`);
      }),
    };
    supabaseServerMocks.createSupabaseServerClient.mockResolvedValue(supabase);

    const { listProjectActivityPage } = await import("@/lib/repositories/project-activity-repository");
    const result = await listProjectActivityPage({ projectId: "project-1" });

    expect(eventsQuery.eq).toHaveBeenCalledWith("project_id", "project-1");
    expect(eventsQuery.not).toHaveBeenCalledWith("event_type", "in", "(sheet_version_created,sheet_restored_as_copy)");
    expect(eventsQuery.order).toHaveBeenNthCalledWith(1, "created_at", { ascending: false });
    expect(eventsQuery.order).toHaveBeenNthCalledWith(2, "id", { ascending: false });
    expect(eventsQuery.limit).toHaveBeenCalledWith(21);
    expect(result).toEqual({ items: [], nextCursor: null });
    expect(supabase.from).toHaveBeenCalledTimes(1);
  });

  it("returns an empty page when the project activity migration is not applied", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const eventsQuery = createQuery({
      data: null,
      error: Object.assign(new Error("column estimate_sheet_events.project_id does not exist"), { code: "42703" }),
    });
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === "estimate_sheet_events") return eventsQuery;
        throw new Error(`Unexpected table ${table}`);
      }),
    };
    supabaseServerMocks.createSupabaseServerClient.mockResolvedValue(supabase);

    const { listProjectActivityPage } = await import("@/lib/repositories/project-activity-repository");
    const result = await listProjectActivityPage({ projectId: "project-1" });

    expect(result).toEqual({ items: [], nextCursor: null });
    expect(supabase.from).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledWith("[project-dashboard] Project activity schema is unavailable; apply migration 20260619105250.");
    warnSpy.mockRestore();
  });

  it("rethrows unrelated activity schema errors", async () => {
    const eventsQuery = createQuery({
      data: null,
      error: Object.assign(new Error("column estimate_sheet_events.actor_display_name does not exist"), { code: "42703" }),
    });
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === "estimate_sheet_events") return eventsQuery;
        throw new Error(`Unexpected table ${table}`);
      }),
    };
    supabaseServerMocks.createSupabaseServerClient.mockResolvedValue(supabase);

    const { listProjectActivityPage } = await import("@/lib/repositories/project-activity-repository");
    await expect(listProjectActivityPage({ projectId: "project-1" })).rejects.toThrow(
      "column estimate_sheet_events.actor_display_name does not exist",
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
      estimates: null,
    });
    const third = makeEvent({
      id: "33333333-3333-4333-8333-333333333333",
      created_at: "2026-06-19T06:00:00.000Z",
    });
    const eventsQuery = createQuery({ data: [first, second, third], error: null });
    const profilesQuery = createQuery({
      data: [{ id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", display_name: "Philip Lewis", email: "philip@example.test" }],
      error: null,
    });
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === "estimate_sheet_events") return eventsQuery;
        if (table === "profiles") return profilesQuery;
        throw new Error(`Unexpected table ${table}`);
      }),
    };
    supabaseServerMocks.createSupabaseServerClient.mockResolvedValue(supabase);

    const { listProjectActivityPage } = await import("@/lib/repositories/project-activity-repository");
    const result = await listProjectActivityPage({
      projectId: "project-1",
      limit: 2,
      cursor: {
        createdAt: "2026-06-19T09:00:00.000Z",
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      },
    });

    expect(eventsQuery.limit).toHaveBeenCalledWith(3);
    expect(eventsQuery.or).toHaveBeenCalledWith(
      "created_at.lt.2026-06-19T09:00:00.000Z,and(created_at.eq.2026-06-19T09:00:00.000Z,id.lt.aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa)",
    );
    expect(profilesQuery.select).toHaveBeenCalledWith("id, display_name, email");
    expect(profilesQuery.in).toHaveBeenCalledWith("id", ["aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"]);
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
    const eventQueries = [
      createQuery({ data: [first, second, third], error: null }),
      createQuery({ data: [third, fourth], error: null }),
    ];
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === "estimate_sheet_events") {
          const query = eventQueries.shift();
          if (!query) throw new Error("Unexpected extra activity query.");
          return query;
        }
        throw new Error(`Unexpected table ${table}`);
      }),
    };
    supabaseServerMocks.createSupabaseServerClient.mockResolvedValue(supabase);

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

  it("keeps concurrent newer inserts out of the next cursor window", async () => {
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
    const concurrentNewer = makeEvent({
      id: "99999999-9999-4999-8999-999999999999",
      created_at: "2026-06-19T09:00:00.000Z",
      actor_user_id: null,
    });
    const eventQueries = [
      createQuery({ data: [first, second, third], error: null }),
      createQuery({ data: [third], error: null }),
    ];
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === "estimate_sheet_events") {
          const query = eventQueries.shift();
          if (!query) throw new Error("Unexpected extra activity query.");
          return query;
        }
        throw new Error(`Unexpected table ${table}`);
      }),
    };
    supabaseServerMocks.createSupabaseServerClient.mockResolvedValue(supabase);

    const { listProjectActivityPage } = await import("@/lib/repositories/project-activity-repository");
    const firstPage = await listProjectActivityPage({ projectId: "project-1", limit: 2 });
    const secondPage = await listProjectActivityPage({
      projectId: "project-1",
      limit: 2,
      cursor: firstPage.nextCursor,
    });

    expect(secondPage.items.map((item) => item.id)).toEqual([third.id]);
    expect(secondPage.items.map((item) => item.id)).not.toContain(concurrentNewer.id);
    expect(supabase.from).toHaveBeenCalledTimes(2);
  });

  it("rejects invalid cursors before querying event rows", async () => {
    const supabase = {
      from: vi.fn(() => {
        throw new Error("Activity rows should not be queried with an invalid cursor.");
      }),
    };
    supabaseServerMocks.createSupabaseServerClient.mockResolvedValue(supabase);

    const { listProjectActivityPage } = await import("@/lib/repositories/project-activity-repository");
    await expect(listProjectActivityPage({
      projectId: "project-1",
      cursor: { createdAt: "bad-date", id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" },
    })).rejects.toThrow("Project activity cursor timestamp is invalid.");

    expect(supabase.from).not.toHaveBeenCalled();
  });
});
