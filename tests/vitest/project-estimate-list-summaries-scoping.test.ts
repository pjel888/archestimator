import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Regression guard for the bounded dashboard RPC
// `project_estimate_list_summaries_for_estimates`. The security property that
// keeps this safe from cross-project data leakage is two-fold:
//   1. The repository call site MUST pass BOTH `target_project_id` (project
//      scoping) AND `target_estimate_ids`. Dropping/blanking the project id at
//      the call site would silently widen scoping to other projects.
//   2. The SQL function MUST stay SECURITY INVOKER, pin `search_path`, revoke
//      execute from public/anon, and grant only to authenticated. Weakening any
//      of these in the migration would erode the privilege boundary.
// Neither property was previously guarded by a test.

type QueryBuilder = {
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  in: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
};

const supabaseMocks = vi.hoisted(() => ({
  from: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(async () => ({
    from: supabaseMocks.from,
    rpc: supabaseMocks.rpc,
  })),
}));

function createBuilder(): QueryBuilder {
  const builder = {
    select: vi.fn(),
    eq: vi.fn(),
    in: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
  } satisfies QueryBuilder;
  builder.select.mockReturnValue(builder);
  builder.eq.mockReturnValue(builder);
  builder.in.mockReturnValue(builder);
  builder.order.mockReturnValue(builder);
  builder.limit.mockReturnValue(builder);
  return builder;
}

beforeEach(() => {
  supabaseMocks.from.mockReset();
  supabaseMocks.rpc.mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("project_estimate_list_summaries_for_estimates call-site scoping guard", () => {
  it("passes BOTH the project id and the selected estimate ids to the RPC", async () => {
    const projectId = "project-scoping-1";
    const estimatesBuilder = createBuilder();
    const nodesBuilder = createBuilder();

    estimatesBuilder.limit.mockResolvedValue({
      data: [
        {
          id: "estimate-2",
          project_id: projectId,
          name: "Site Works",
          sheet_code: null,
          project_budget: 120000,
          updated_at: "2026-06-13T08:00:00.000Z",
        },
        {
          id: "estimate-1",
          project_id: projectId,
          name: "Lobby Estimate",
          sheet_code: "EST-002",
          project_budget: null,
          updated_at: "2026-06-12T08:00:00.000Z",
        },
      ],
      error: null,
    });
    nodesBuilder.order.mockResolvedValue({ data: [], error: null });
    supabaseMocks.rpc.mockResolvedValue({ data: [], error: null });
    supabaseMocks.from.mockImplementation((table: string) => {
      if (table === "estimates") return estimatesBuilder;
      if (table === "estimate_nodes") return nodesBuilder;
      throw new Error(`Unexpected table ${table}`);
    });

    const { listRecentProjectEstimateSheets } = await import(
      "@/lib/repositories/project-estimate-sheets-repository"
    );
    await listRecentProjectEstimateSheets(projectId);

    expect(supabaseMocks.rpc).toHaveBeenCalledTimes(1);
    const [rpcName, rpcParams] = supabaseMocks.rpc.mock.calls[0] as [
      string,
      Record<string, unknown>,
    ];

    // Guards against renaming / repointing the RPC away from the scoped helper.
    expect(rpcName).toBe("project_estimate_list_summaries_for_estimates");

    // Guards against dropping the project-scoping argument (cross-project leak).
    expect(rpcParams).toHaveProperty("target_project_id", projectId);

    // Guards against dropping the bounded estimate-id list (unbounded scan / leak).
    expect(rpcParams).toHaveProperty("target_estimate_ids");
    expect(rpcParams.target_estimate_ids).toEqual(["estimate-2", "estimate-1"]);
  });

  it("never invokes the RPC without a non-empty project id", async () => {
    const projectId = "project-scoping-2";
    const estimatesBuilder = createBuilder();
    const nodesBuilder = createBuilder();

    estimatesBuilder.limit.mockResolvedValue({
      data: [
        {
          id: "estimate-9",
          project_id: projectId,
          name: "Only Sheet",
          sheet_code: "EST-009",
          project_budget: null,
          updated_at: "2026-06-14T08:00:00.000Z",
        },
      ],
      error: null,
    });
    nodesBuilder.order.mockResolvedValue({ data: [], error: null });
    supabaseMocks.rpc.mockResolvedValue({ data: [], error: null });
    supabaseMocks.from.mockImplementation((table: string) => {
      if (table === "estimates") return estimatesBuilder;
      if (table === "estimate_nodes") return nodesBuilder;
      throw new Error(`Unexpected table ${table}`);
    });

    const { listRecentProjectEstimateSheets } = await import(
      "@/lib/repositories/project-estimate-sheets-repository"
    );
    await listRecentProjectEstimateSheets(projectId);

    for (const call of supabaseMocks.rpc.mock.calls) {
      const params = call[1] as Record<string, unknown>;
      const targetProjectId = params?.target_project_id;
      expect(typeof targetProjectId).toBe("string");
      expect(targetProjectId).toBe(projectId);
      expect((targetProjectId as string).length).toBeGreaterThan(0);
    }
  });
});

describe("project_estimate_list_summaries_for_estimates migration SQL-content guard", () => {
  const migrationPath = resolve(
    dirname(fileURLToPath(import.meta.url)),
    "../../supabase/migrations/20260620030500_project_estimate_list_summaries_for_estimates.sql",
  );
  const sql = readFileSync(migrationPath, "utf8");
  // Collapse runs of whitespace so casing/whitespace drift does not defeat the guard.
  const normalized = sql.toLowerCase().replace(/\s+/g, " ");

  it("does NOT use SECURITY DEFINER (must stay SECURITY INVOKER)", () => {
    expect(normalized).not.toContain("security definer");
    expect(normalized).toContain("security invoker");
  });

  it("pins search_path to public", () => {
    // Matches `set search_path = public` tolerant of spacing around `=`.
    expect(normalized).toMatch(/set\s+search_path\s*=\s*public/);
  });

  it("revokes execute from public and anon", () => {
    expect(normalized).toMatch(/revoke\s+execute\s+on\s+function/);
    // Both public and anon must appear in the revoke statement.
    const revokeMatch = normalized.match(/revoke\s+execute\s+on\s+function[^;]*;/);
    expect(revokeMatch).not.toBeNull();
    const revokeClause = revokeMatch?.[0] ?? "";
    expect(revokeClause).toContain("public");
    expect(revokeClause).toContain("anon");
  });

  it("grants execute only to authenticated", () => {
    const grantMatch = normalized.match(/grant\s+execute\s+on\s+function[^;]*;/);
    expect(grantMatch).not.toBeNull();
    const grantClause = grantMatch?.[0] ?? "";
    expect(grantClause).toContain("authenticated");
  });
});
