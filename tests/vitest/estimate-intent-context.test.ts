import { beforeEach, describe, expect, it, vi } from "vitest";

import type { D1DatabaseLike, D1PreparedStatementLike, D1Result, D1Value } from "@/lib/cloudflare/d1";

const mocks = vi.hoisted(() => ({
  canEditEstimate: vi.fn(),
  canEditProject: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/authz/d1-access", () => ({
  canEditEstimateStrictInD1: mocks.canEditEstimate,
  canEditProjectStrictInD1: mocks.canEditProject,
}));

import { assertProjectEditIntent } from "@/lib/estimates/d1-intents/intent-context";

function projectDatabase(row: { id: string; workspace_id: string } | null): D1DatabaseLike {
  return {
    prepare<T = Record<string, unknown>>(): D1PreparedStatementLike<T> {
      const statement: D1PreparedStatementLike<T> = {
        bind(...values: D1Value[]) {
          void values;
          return statement;
        },
        async first<R = T>() {
          return row as R | null;
        },
        async all<R = T>(): Promise<D1Result<R>> {
          return { success: true, results: [] };
        },
        async run(): Promise<D1Result<T>> {
          return { success: true };
        },
      };
      return statement;
    },
    async batch() {
      return [];
    },
  };
}

const actor = { userId: "user-1", role: "member" as const };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.canEditProject.mockResolvedValue(true);
});

describe("project estimate intent context", () => {
  it("returns the authorized project workspace boundary", async () => {
    const database = projectDatabase({ id: "project-1", workspace_id: "workspace-1" });

    await expect(assertProjectEditIntent(database, actor, "project-1")).resolves.toEqual({
      projectId: "project-1",
      workspaceId: "workspace-1",
    });
    expect(mocks.canEditProject).toHaveBeenCalledWith(database, "project-1", actor);
  });

  it("fails closed for denied or missing project context", async () => {
    const database = projectDatabase(null);
    mocks.canEditProject.mockResolvedValueOnce(false);
    await expect(assertProjectEditIntent(database, actor, "project-1"))
      .rejects.toThrow("Project edit access denied.");

    mocks.canEditProject.mockResolvedValueOnce(true);
    await expect(assertProjectEditIntent(database, actor, "project-1"))
      .rejects.toThrow("Project not found in the current workspace.");
  });
});
