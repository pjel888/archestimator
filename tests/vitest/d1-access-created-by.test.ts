import { describe, expect, it, vi } from "vitest";

import type { D1DatabaseLike, D1Value } from "@/lib/cloudflare/d1";
import {
  canAccessEstimateInD1,
  canAccessProjectInD1,
  canEditEstimateInD1,
  canEditProjectInD1,
} from "@/lib/authz/d1-access";

vi.mock("server-only", () => ({}));

function createAuthzProbeDatabase({
  allowWhen,
}: {
  allowWhen: (query: { sql: string; values: D1Value[] }) => boolean;
}) {
  const queries: Array<{ sql: string; values: D1Value[] }> = [];
  const db: D1DatabaseLike = {
    prepare: vi.fn((sql: string) => {
      const statement = {
        values: [] as D1Value[],
        bind: vi.fn((...values: D1Value[]) => {
          statement.values = values;
          return statement;
        }),
        first: vi.fn(async () => {
          const query = { sql, values: statement.values };
          queries.push(query);
          return allowWhen(query) ? { allowed: 1 } : null;
        }),
        all: vi.fn(async () => ({ results: [] })),
        run: vi.fn(async () => ({ success: true, meta: { changes: 0 } })),
      };
      return statement;
    }),
  };
  return { db, queries };
}

describe("D1 created-by authorization", () => {
  it("allows project creators to read and edit their own project without membership rows", async () => {
    const user = { userId: "user-1", role: "member" as const };
    const accessProbe = createAuthzProbeDatabase({
      allowWhen: ({ sql, values }) => sql.includes("project.created_by = ?") && values[1] === user.userId,
    });
    const editProbe = createAuthzProbeDatabase({
      allowWhen: ({ sql, values }) => sql.includes("project.created_by = ?") && values[1] === user.userId,
    });

    await expect(canAccessProjectInD1(accessProbe.db, "project-1", user)).resolves.toBe(true);
    await expect(canEditProjectInD1(editProbe.db, "project-1", user)).resolves.toBe(true);
    expect(accessProbe.queries[0]?.values).toEqual(["project-1", "user-1", "user-1", "user-1", "user-1"]);
    expect(editProbe.queries[0]?.values).toEqual(["project-1", "user-1", "user-1", "user-1"]);
  });

  it("allows estimate creators and inherited project creators to access estimate sheets", async () => {
    const user = { userId: "user-1", role: "member" as const };
    const directEstimateProbe = createAuthzProbeDatabase({
      allowWhen: ({ sql, values }) => sql.includes("estimate.created_by = ?") && values[1] === user.userId,
    });
    const inheritedProjectProbe = createAuthzProbeDatabase({
      allowWhen: ({ sql, values }) => sql.includes("project.created_by = ?") && values[3] === user.userId,
    });

    await expect(canAccessEstimateInD1(directEstimateProbe.db, "estimate-1", user)).resolves.toBe(true);
    await expect(canEditEstimateInD1(inheritedProjectProbe.db, "estimate-1", user)).resolves.toBe(true);
    expect(directEstimateProbe.queries[0]?.values).toEqual([
      "estimate-1",
      "user-1",
      "user-1",
      "user-1",
      "user-1",
      "user-1",
    ]);
    expect(inheritedProjectProbe.queries[0]?.values).toEqual([
      "estimate-1",
      "user-1",
      "user-1",
      "user-1",
      "user-1",
      "user-1",
    ]);
  });
});
