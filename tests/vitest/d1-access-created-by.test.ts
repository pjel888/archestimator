import { describe, expect, it, vi } from "vitest";

import type { CurrentUserContext } from "@/lib/auth/session";
import type { D1DatabaseLike, D1Value } from "@/lib/cloudflare/d1";
import {
  canAccessEstimateInD1,
  canAccessProjectInD1,
  canAccessWholeProjectInD1,
  canEditEstimateInD1,
  canEditProjectInD1,
} from "@/lib/authz/d1-access";
import { EstimateActionsD1Client } from "@/lib/estimates/d1-action-client";

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

function createCurrentUserContext(userId: string): CurrentUserContext {
  const email = `${userId}@example.test`;
  const now = "2026-07-03T00:00:00.000Z";
  return {
    avatarUrl: null,
    displayName: userId,
    email,
    profile: {
      avatar_url: null,
      created_at: now,
      default_workspace_id: null,
      display_name: userId,
      email,
      id: userId,
      role: "member",
      updated_at: now,
    },
    role: "member",
    userId,
  };
}

describe("D1 created-by authorization", () => {
  it("does not grant project access or edit rights from historical project.created_by metadata", async () => {
    const user = { userId: "user-1", role: "member" as const };
    const accessProbe = createAuthzProbeDatabase({
      allowWhen: ({ sql, values }) => sql.includes("project.created_by = ?") && values.includes(user.userId),
    });
    const wholeAccessProbe = createAuthzProbeDatabase({
      allowWhen: ({ sql, values }) => sql.includes("project.created_by = ?") && values.includes(user.userId),
    });
    const editProbe = createAuthzProbeDatabase({
      allowWhen: ({ sql, values }) => sql.includes("project.created_by = ?") && values.includes(user.userId),
    });

    await expect(canAccessProjectInD1(accessProbe.db, "project-1", user)).resolves.toBe(false);
    await expect(canAccessWholeProjectInD1(wholeAccessProbe.db, "project-1", user)).resolves.toBe(false);
    await expect(canEditProjectInD1(editProbe.db, "project-1", user)).resolves.toBe(false);
    expect(accessProbe.queries[0]?.sql).not.toContain("project.created_by = ?");
    expect(wholeAccessProbe.queries[0]?.sql).not.toContain("project.created_by = ?");
    expect(editProbe.queries[0]?.sql).not.toContain("project.created_by = ?");
    expect(accessProbe.queries[0]?.values).toEqual(["project-1", "user-1", "user-1", "user-1"]);
    expect(wholeAccessProbe.queries[0]?.values).toEqual(["project-1", "user-1", "user-1"]);
    expect(editProbe.queries[0]?.values).toEqual(["project-1", "user-1", "user-1"]);
  });

  it("does not grant project edit through the D1 estimate action client from created_by metadata", async () => {
    const user = createCurrentUserContext("user-1");
    const editProbe = createAuthzProbeDatabase({
      allowWhen: ({ sql, values }) => sql.includes("project.created_by = ?") && values.includes(user.userId),
    });
    const client = new EstimateActionsD1Client(editProbe.db, user);

    await expect(client.call("can_edit_project", { target_project_id: "project-1" })).resolves.toEqual({
      data: false,
      error: null,
    });
    expect(editProbe.queries[0]?.sql).not.toContain("project.created_by = ?");
    expect(editProbe.queries[0]?.values).toEqual(["project-1", "user-1", "user-1"]);
  });

  it("does not grant estimate access or edit rights from estimate or inherited project created_by metadata", async () => {
    const user = { userId: "user-1", role: "member" as const };
    const directEstimateProbe = createAuthzProbeDatabase({
      allowWhen: ({ sql, values }) => sql.includes("estimate.created_by = ?") && values.includes(user.userId),
    });
    const inheritedProjectProbe = createAuthzProbeDatabase({
      allowWhen: ({ sql, values }) => sql.includes("project.created_by = ?") && values.includes(user.userId),
    });

    await expect(canAccessEstimateInD1(directEstimateProbe.db, "estimate-1", user)).resolves.toBe(false);
    await expect(canEditEstimateInD1(inheritedProjectProbe.db, "estimate-1", user)).resolves.toBe(false);
    expect(directEstimateProbe.queries[0]?.sql).not.toContain("estimate.created_by = ?");
    expect(inheritedProjectProbe.queries[0]?.sql).not.toContain("project.created_by = ?");
    expect(directEstimateProbe.queries[0]?.values).toEqual(["estimate-1", "user-1", "user-1", "user-1"]);
    expect(inheritedProjectProbe.queries[0]?.values).toEqual(["estimate-1", "user-1", "user-1", "user-1"]);
  });
});
