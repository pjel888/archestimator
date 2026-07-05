import { describe, expect, it, vi } from "vitest";

import type { D1DatabaseLike, D1Value } from "@/lib/cloudflare/d1";
import type { ProfileRow } from "@/lib/repositories/workspace-repository";

// Mock server-only so the module loads in the test environment.
vi.mock("server-only", () => ({}));

import { __testing__filterAccessibleSidebarProjectIds } from "@/lib/repositories/workspace-repository";

// Helper: build a fake D1DatabaseLike whose `.all()` returns a synthetic result
// set based on a preconfigured access set. Lets the test simulate each branch
// of the batched authz predicate without a real D1 round-trip.
function createBatchedAuthzDatabase({
  accessibleProjectIds,
  capture,
}: {
  accessibleProjectIds: ReadonlySet<string>;
  capture?: (query: { sql: string; values: D1Value[] }) => void;
}): D1DatabaseLike {
  const db: D1DatabaseLike = {
    prepare: vi.fn((sql: string) => {
      let boundValues: D1Value[] = [];
      const statement = {
        bind: vi.fn((...values: D1Value[]) => {
          boundValues = values;
          return statement;
        }),
        all: vi.fn(async <T>() => {
          capture?.({ sql, values: boundValues });
          // The batched SQL binds [projectIds..., userId x4] (created_by,
          // workspace_members.user_id, project_members.user_id,
          // estimate_sheet_members.user_id).
          const trailingUserIdCount = 4;
          const inputProjectIds = boundValues.slice(0, boundValues.length - trailingUserIdCount);
          const results = inputProjectIds
            .filter((id): id is string => typeof id === "string" && accessibleProjectIds.has(id))
            .map((id) => ({ id })) as unknown as T[];
          return { results, success: true as const, meta: { changes: 0 } };
        }),
        first: vi.fn(async () => null),
        run: vi.fn(async () => ({ success: true, meta: { changes: 0 } })),
      };
      return statement;
    }),
  };
  return db;
}

function createProfile(role: ProfileRow["role"], id = "user-1"): ProfileRow {
  const now = "2026-07-05T00:00:00.000Z";
  return {
    avatar_url: null,
    created_at: now,
    default_workspace_id: null,
    display_name: id,
    email: `${id}@example.test`,
    id,
    role,
    updated_at: now,
  };
}

describe("filterAccessibleSidebarProjectIds (batched authz)", () => {
  it("returns an empty array when projectIds is empty without executing SQL", async () => {
    const captured: Array<{ sql: string; values: D1Value[] }> = [];
    const db = createBatchedAuthzDatabase({
      accessibleProjectIds: new Set(),
      capture: (q) => captured.push(q),
    });
    const result = await __testing__filterAccessibleSidebarProjectIds(db, [], createProfile("member"));
    expect(result).toEqual([]);
    expect(captured).toHaveLength(0);
  });

  it("short-circuits for platform admin: returns all projectIds without SQL", async () => {
    const captured: Array<{ sql: string; values: D1Value[] }> = [];
    const db = createBatchedAuthzDatabase({
      accessibleProjectIds: new Set(),
      capture: (q) => captured.push(q),
    });
    const projectIds = ["p1", "p2", "p3"];
    const result = await __testing__filterAccessibleSidebarProjectIds(db, projectIds, createProfile("admin"));
    expect(result).toEqual(projectIds);
    expect(captured).toHaveLength(0);
  });

  it("returns only accessible projectIds (mixed: 3 accessible + 2 denied)", async () => {
    const captured: Array<{ sql: string; values: D1Value[] }> = [];
    const db = createBatchedAuthzDatabase({
      accessibleProjectIds: new Set(["p1", "p3", "p5"]),
      capture: (q) => captured.push(q),
    });
    const result = await __testing__filterAccessibleSidebarProjectIds(
      db,
      ["p1", "p2", "p3", "p4", "p5"],
      createProfile("member"),
    );
    expect(result).toEqual(["p1", "p3", "p5"]);
    expect(captured).toHaveLength(1);
    // Verify the SQL uses the batched IN-list shape and the 4 EXISTS/created_by branches
    const sql = captured[0]?.sql ?? "";
    expect(sql).toContain("FROM projects");
    expect(sql).toContain("id IN (");
    expect(sql).toContain("created_by = ?");
    expect(sql).toContain("FROM workspace_members");
    expect(sql).toContain("FROM project_members");
    expect(sql).toContain("FROM estimate_sheet_members");
  });

  it("issues exactly ONE SQL query regardless of projectIds length", async () => {
    const captured: Array<{ sql: string; values: D1Value[] }> = [];
    const db = createBatchedAuthzDatabase({
      accessibleProjectIds: new Set(["p1", "p2", "p3", "p4", "p5"]),
      capture: (q) => captured.push(q),
    });
    const result = await __testing__filterAccessibleSidebarProjectIds(
      db,
      ["p1", "p2", "p3", "p4", "p5"],
      createProfile("member"),
    );
    expect(result).toEqual(["p1", "p2", "p3", "p4", "p5"]);
    expect(captured).toHaveLength(1);
  });

  it("preserves input order of accessible projectIds", async () => {
    const db = createBatchedAuthzDatabase({
      accessibleProjectIds: new Set(["p3", "p1", "p5"]),
    });
    const result = await __testing__filterAccessibleSidebarProjectIds(
      db,
      ["p5", "p1", "p2", "p3", "p4"],
      createProfile("member"),
    );
    // Should preserve INPUT order, not access-set order.
    expect(result).toEqual(["p5", "p1", "p3"]);
  });

  it("returns empty array when no projectIds are accessible", async () => {
    const db = createBatchedAuthzDatabase({
      accessibleProjectIds: new Set(),
    });
    const result = await __testing__filterAccessibleSidebarProjectIds(
      db,
      ["p1", "p2", "p3"],
      createProfile("member"),
    );
    expect(result).toEqual([]);
  });
});
