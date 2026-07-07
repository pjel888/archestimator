import { describe, expect, it, vi } from "vitest";

import {
  canAccessEstimateInD1,
  canAccessProjectInD1,
  canAccessWholeProjectInD1,
  canEditEstimateInD1,
  canEditProjectInD1,
  isWorkspaceEditorInD1,
  isWorkspaceMemberInD1,
} from "@/lib/authz/d1-access";
import type { D1DatabaseLike, D1Value } from "@/lib/cloudflare/d1";

vi.mock("server-only", () => ({}));

type AuthzQuery = {
  sql: string;
  values: D1Value[];
};

const user = { userId: "user-1", role: "member" as const };

function createAuthzRoleDatabase({
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

function createThrowingDatabase() {
  const db: D1DatabaseLike = {
    prepare: vi.fn((sql: string) => {
      const statement = {
        bind: vi.fn(() => statement),
        first: vi.fn(async () => {
          throw new Error(`D1 read failed for ${sql.slice(0, 24)}`);
        }),
        all: vi.fn(async () => {
          throw new Error("D1 all failed");
        }),
        run: vi.fn(async () => {
          throw new Error("D1 run failed");
        }),
      };
      return statement;
    }),
  };
  return db;
}

describe("D1 access role boundaries", () => {
  it("returns false for outsiders on project and estimate reads", async () => {
    const projectProbe = createAuthzRoleDatabase({ allowWhen: () => false });
    const estimateProbe = createAuthzRoleDatabase({ allowWhen: () => false });

    await expect(canAccessProjectInD1(projectProbe.db, "project-1", user)).resolves.toBe(false);
    await expect(canAccessEstimateInD1(estimateProbe.db, "estimate-1", user)).resolves.toBe(false);

    expect(projectProbe.queries[0]?.values).toEqual(["project-1", "user-1", "user-1", "user-1"]);
    expect(estimateProbe.queries[0]?.values).toEqual([
      "estimate-1",
      "user-1",
      "user-1",
      "user-1",
    ]);
  });

  it("does not grant workspace or project edits to viewer roles", async () => {
    const workspaceEditorProbe = createAuthzRoleDatabase({ allowWhen: () => false });
    const workspaceViewerProbe = createAuthzRoleDatabase({ allowWhen: () => false });
    const projectViewerProbe = createAuthzRoleDatabase({ allowWhen: () => false });

    await expect(isWorkspaceEditorInD1(workspaceEditorProbe.db, "workspace-1", user)).resolves.toBe(false);
    await expect(canEditProjectInD1(workspaceViewerProbe.db, "project-1", user)).resolves.toBe(false);
    await expect(canEditProjectInD1(projectViewerProbe.db, "project-1", user)).resolves.toBe(false);

    expect(workspaceEditorProbe.queries[0]?.sql).toContain("workspace_member.role IN ('owner', 'admin', 'member')");
    expect(workspaceViewerProbe.queries[0]?.sql).toContain("workspace_member.role IN ('owner', 'admin', 'member')");
    expect(projectViewerProbe.queries[0]?.sql).toContain("project_member.role IN ('owner', 'admin', 'editor')");
    expect(workspaceEditorProbe.queries[0]?.sql).not.toContain("'viewer'");
    expect(workspaceViewerProbe.queries[0]?.sql).not.toContain("'viewer'");
    expect(projectViewerProbe.queries[0]?.sql).not.toContain("'viewer'");
  });

  it("does not grant estimate edits to viewer-only roles", async () => {
    const estimateViewerProbe = createAuthzRoleDatabase({ allowWhen: () => false });

    await expect(canEditEstimateInD1(estimateViewerProbe.db, "estimate-1", user)).resolves.toBe(false);

    const sql = estimateViewerProbe.queries[0]?.sql ?? "";
    expect(sql).toContain("sheet_member.role IN ('owner', 'admin', 'editor')");
    expect(sql).toContain("project_member.role IN ('owner', 'admin', 'editor')");
    expect(sql).not.toContain("'viewer'");
  });

  it("allows project editors only through scoped project edit authority", async () => {
    const projectEditorProbe = createAuthzRoleDatabase({
      allowWhen: ({ sql, values }) =>
        sql.includes("project_member.project_id = project.id") &&
        sql.includes("project_member.role IN ('owner', 'admin', 'editor')") &&
        values[2] === user.userId,
    });
    const estimateOnlyEditorProbe = createAuthzRoleDatabase({ allowWhen: () => false });

    await expect(canEditProjectInD1(projectEditorProbe.db, "project-1", user)).resolves.toBe(true);
    await expect(canEditProjectInD1(estimateOnlyEditorProbe.db, "project-1", user)).resolves.toBe(false);
  });

  it("distinguishes estimate-only project visibility from whole-project access", async () => {
    const estimateOnlyProbe = createAuthzRoleDatabase({
      allowWhen: ({ sql, values }) =>
        sql.includes("FROM estimate_sheet_members sheet_member") &&
        sql.includes("sheet_member.project_id = project.id") &&
        values[3] === user.userId,
    });
    const wholeProjectProbe = createAuthzRoleDatabase({
      allowWhen: ({ sql }) => sql.includes("FROM estimate_sheet_members sheet_member"),
    });

    await expect(canAccessProjectInD1(estimateOnlyProbe.db, "project-1", user)).resolves.toBe(true);
    await expect(canAccessWholeProjectInD1(wholeProjectProbe.db, "project-1", user)).resolves.toBe(false);

    expect(wholeProjectProbe.queries[0]?.sql).not.toContain("estimate_sheet_members");
    expect(wholeProjectProbe.queries[0]?.values).toEqual(["project-1", "user-1", "user-1"]);
  });

  it("allows estimate editors only through scoped estimate edit authority", async () => {
    const estimateEditorProbe = createAuthzRoleDatabase({
      allowWhen: ({ sql, values }) =>
        sql.includes("sheet_member.estimate_id = estimate.id") &&
        sql.includes("sheet_member.role IN ('owner', 'admin', 'editor')") &&
        values[1] === user.userId,
    });
    const projectViewerProbe = createAuthzRoleDatabase({ allowWhen: () => false });

    await expect(canEditEstimateInD1(estimateEditorProbe.db, "estimate-1", user)).resolves.toBe(true);
    await expect(canEditEstimateInD1(projectViewerProbe.db, "estimate-1", user)).resolves.toBe(false);
  });

  it("uses inherited project access for estimate read and edit helpers", async () => {
    const inheritedProjectReadProbe = createAuthzRoleDatabase({
      allowWhen: ({ sql, values }) =>
        sql.includes("COALESCE(access.inherit_project_access, 1) = 1") &&
        sql.includes("project_member.project_id = project.id") &&
        values[3] === user.userId,
    });
    const inheritedProjectEditProbe = createAuthzRoleDatabase({
      allowWhen: ({ sql, values }) =>
        sql.includes("COALESCE(access.inherit_project_access, 1) = 1") &&
        sql.includes("project_member.role IN ('owner', 'admin', 'editor')") &&
        values[3] === user.userId,
    });
    const inheritDisabledProbe = createAuthzRoleDatabase({ allowWhen: () => false });

    await expect(canAccessEstimateInD1(inheritedProjectReadProbe.db, "estimate-1", user)).resolves.toBe(true);
    await expect(canEditEstimateInD1(inheritedProjectEditProbe.db, "estimate-1", user)).resolves.toBe(true);
    await expect(canAccessEstimateInD1(inheritDisabledProbe.db, "estimate-1", user)).resolves.toBe(false);
  });

  it("fails closed when D1 read probes throw", async () => {
    const db = createThrowingDatabase();

    await expect(canAccessProjectInD1(db, "project-1", user)).resolves.toBe(false);
    await expect(canAccessWholeProjectInD1(db, "project-1", user)).resolves.toBe(false);
    await expect(canEditProjectInD1(db, "project-1", user)).resolves.toBe(false);
    await expect(canAccessEstimateInD1(db, "estimate-1", user)).resolves.toBe(false);
    await expect(canEditEstimateInD1(db, "estimate-1", user)).resolves.toBe(false);
    await expect(isWorkspaceEditorInD1(db, "workspace-1", user)).resolves.toBe(false);
    await expect(isWorkspaceMemberInD1(db, "workspace-1", user)).resolves.toBe(false);
  });
});
