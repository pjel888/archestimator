import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  supabase: null as ReturnType<typeof createSupabaseMock> | null,
  getCurrentUserContext: vi.fn(),
  getCurrentWorkspaceProject: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@/lib/auth/session", () => ({
  getCurrentUserContext: mocks.getCurrentUserContext,
}));

vi.mock("@/lib/repositories/workspace-repository", () => ({
  getCurrentWorkspaceProject: mocks.getCurrentWorkspaceProject,
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(async () => mocks.supabase),
}));

import { readProjectActivityFeed } from "@/lib/repositories/project-activity-feed-repository";

const PROJECT_ID = "11111111-1111-4111-8111-111111111111";
const WORKSPACE_ID = "22222222-2222-4222-8222-222222222222";
const ESTIMATE_ID = "33333333-3333-4333-8333-333333333333";

type QueryResult = {
  count?: number | null;
  data?: unknown[] | null;
  error?: unknown;
};

type QueryMock = {
  contains: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  in: ReturnType<typeof vi.fn>;
  is: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
  or: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  select: ReturnType<typeof vi.fn>;
  then: Promise<QueryResult>["then"];
};

type QueryRecord = {
  table: string;
  query: QueryMock;
};

function isCountQuery(query: QueryMock) {
  return query.select.mock.calls.some((call) => {
    const options = call[1] as { count?: string } | undefined;
    return options?.count === "exact";
  });
}

function createQueryMock(resolveResult: (query: QueryMock) => QueryResult): QueryMock {
  const query = {
    contains: vi.fn(() => query),
    eq: vi.fn(() => query),
    in: vi.fn(() => query),
    is: vi.fn(() => query),
    limit: vi.fn(() => query),
    or: vi.fn(() => query),
    order: vi.fn(() => query),
    select: vi.fn(() => query),
    then: (onFulfilled, onRejected) => Promise.resolve(resolveResult(query)).then(onFulfilled, onRejected),
  } as QueryMock;
  return query;
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

function createSupabaseMock({
  rows = {},
  counts = {},
}: {
  rows?: Record<string, unknown[]>;
  counts?: Record<string, number>;
} = {}) {
  const records: QueryRecord[] = [];
  const rpcRecords: { name: string; args: Record<string, unknown>; query: QueryMock }[] = [];

  return {
    records,
    rpcRecords,
    from: vi.fn((table: string) => {
      const query = createQueryMock((currentQuery) => ({
        count: isCountQuery(currentQuery) ? counts[table] ?? 0 : null,
        data: isCountQuery(currentQuery) ? null : rows[table] ?? [],
        error: null,
      }));
      records.push({ table, query });
      return query;
    }),
    rpc: vi.fn((name: string, args: Record<string, unknown>) => {
      const query = createQueryMock(() => ({
        data: rows[`rpc:${name}`] ?? [],
        error: null,
      }));
      rpcRecords.push({ name, args, query });
      return query;
    }),
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
    mocks.supabase = createSupabaseMock({
      rows: {
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
      },
    });

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
    mocks.supabase = createSupabaseMock({
      rows: {
        project_publications: [publicationRow({ id: "pub-project" })],
      },
    });

    await readProjectActivityFeed({
      projectId: PROJECT_ID,
      scope: { kind: "project-only" },
      limit: 20,
    });

    const comments = mocks.supabase.records.filter((record) => record.table === "shared_link_comments");
    const responses = mocks.supabase.records.filter((record) => record.table === "shared_link_responses");

    expect(comments.length).toBeGreaterThanOrEqual(2);
    expect(responses.length).toBeGreaterThanOrEqual(2);
    for (const record of [...comments, ...responses]) {
      expect(record.query.is).toHaveBeenCalledWith("estimate_id", null);
    }
  });

  it("pushes viewed action filtering into shared-link event reads and filtered counts", async () => {
    mocks.supabase = createSupabaseMock({
      rows: {
        project_publications: [publicationRow({ id: "pub-project" })],
      },
    });

    await readProjectActivityFeed({
      projectId: PROJECT_ID,
      filters: { actions: ["viewed"] },
      limit: 20,
    });

    const eventRecords = mocks.supabase.records.filter((record) => record.table === "shared_link_events");
    const sourceRead = eventRecords.find((record) => String(record.query.select.mock.calls[0]?.[0]).includes("event_type"));
    const filteredCount = eventRecords.find((record) =>
      isCountQuery(record.query) && record.query.in.mock.calls.some((call) => call[0] === "event_type"));

    expect(sourceRead?.query.in).toHaveBeenCalledWith("event_type", ["open", "password_attempt"]);
    expect(filteredCount?.query.in).toHaveBeenCalledWith("event_type", ["open", "password_attempt"]);
  });
});
