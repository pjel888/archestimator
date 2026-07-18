import { describe, expect, it, vi } from "vitest";

import type { D1DatabaseLike, D1Value } from "@/lib/cloudflare/d1";
import {
  canAccessEstimateInD1,
  canAccessProjectInD1,
  canAccessWholeProjectInD1,
  canEditEstimateInD1,
  canEditProjectInD1,
} from "@/lib/authz/d1-access";
import { canEditEstimate, canEditProject } from "@/lib/estimates/d1-intents/access";

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

function createFailingAuthzDatabase(stage: "prepare" | "first", error: Error) {
  const db: D1DatabaseLike = {
    prepare: vi.fn((sql: string) => {
      if (stage === "prepare") throw error;
      const statement = {
        bind: vi.fn(() => statement),
        first: vi.fn(async () => {
          throw error;
        }),
        all: vi.fn(async () => ({ results: [] })),
        run: vi.fn(async () => ({ success: true, meta: { changes: 0 } })),
        sql,
      };
      return statement;
    }),
  };
  return db;
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

  it("does not grant project edit through the typed Estimate access intent from created_by metadata", async () => {
    const user = { userId: "user-1", role: "member" as const };
    const editProbe = createAuthzProbeDatabase({
      allowWhen: ({ sql, values }) => sql.includes("project.created_by = ?") && values.includes(user.userId),
    });

    await expect(canEditProject(editProbe.db, user, "project-1")).resolves.toBe(false);
    expect(editProbe.queries[0]?.sql).not.toContain("project.created_by = ?");
    expect(editProbe.queries[0]?.values).toEqual(["project-1", "user-1", "user-1"]);
  });

  it("returns false for a null Estimate actor without preparing SQL", async () => {
    const estimateProbe = createAuthzProbeDatabase({ allowWhen: () => true });
    const projectProbe = createAuthzProbeDatabase({ allowWhen: () => true });

    const { canEditEstimate } = await import("@/lib/estimates/d1-intents/access");
    await expect(canEditEstimate(estimateProbe.db, null, "estimate-1")).resolves.toBe(false);
    await expect(canEditProject(projectProbe.db, null, "project-1")).resolves.toBe(false);
    expect(estimateProbe.db.prepare).not.toHaveBeenCalled();
    expect(projectProbe.db.prepare).not.toHaveBeenCalled();
  });

  it("propagates original D1 prepare and first failures from non-null typed edit probes", async () => {
    const user = { userId: "user-1", role: "member" as const };
    const probes = [canEditEstimate, canEditProject] as const;

    for (const probe of probes) {
      const prepareError = new Error("auth prepare failed");
      await expect(probe(createFailingAuthzDatabase("prepare", prepareError), user, "resource-1"))
        .rejects.toBe(prepareError);

      const firstError = new Error("auth first failed");
      await expect(probe(createFailingAuthzDatabase("first", firstError), user, "resource-1"))
        .rejects.toBe(firstError);
    }
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
