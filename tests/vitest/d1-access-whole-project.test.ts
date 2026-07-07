import { describe, expect, it, vi } from "vitest";

import { canAccessProjectInD1, canAccessWholeProjectInD1 } from "@/lib/authz/d1-access";
import type { D1DatabaseLike, D1Value } from "@/lib/cloudflare/d1";

vi.mock("server-only", () => ({}));

type AuthzQuery = {
  sql: string;
  values: D1Value[];
};

const user = { userId: "user-1", role: "member" as const };

function createAuthzDatabase({
  allowWhen,
}: {
  allowWhen: (query: AuthzQuery) => boolean;
}) {
  const queries: AuthzQuery[] = [];
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

describe("D1 whole-project access", () => {
  it("distinguishes estimate-only project visibility from whole-project access", async () => {
    const estimateOnlyProbe = createAuthzDatabase({
      allowWhen: ({ sql, values }) =>
        sql.includes("FROM estimate_sheet_members sheet_member") &&
        sql.includes("sheet_member.project_id = project.id") &&
        values[3] === user.userId,
    });
    const wholeProjectProbe = createAuthzDatabase({
      allowWhen: ({ sql }) => sql.includes("FROM estimate_sheet_members sheet_member"),
    });

    await expect(canAccessProjectInD1(estimateOnlyProbe.db, "project-1", user)).resolves.toBe(true);
    await expect(canAccessWholeProjectInD1(wholeProjectProbe.db, "project-1", user)).resolves.toBe(false);

    expect(wholeProjectProbe.queries[0]?.sql).not.toContain("estimate_sheet_members");
    expect(wholeProjectProbe.queries[0]?.values).toEqual(["project-1", "user-1", "user-1"]);
  });
});
