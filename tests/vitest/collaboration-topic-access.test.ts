import { describe, expect, it, vi } from "vitest";

import { readCollaborationTopicAccessInD1 } from "@/lib/authz/d1-access";

const member = { userId: "member-1", role: "member" as const };

function databaseWithRow(row: Record<string, unknown> | null) {
  const first = vi.fn().mockResolvedValue(row);
  const bind = vi.fn().mockReturnValue({ first });
  const prepare = vi.fn().mockReturnValue({ bind });
  return { database: { prepare }, prepare, bind };
}

describe("collaboration realtime topic access", () => {
  it("maps a workspace member to editor authority for a whole-project topic", async () => {
    const { database, bind } = databaseWithRow({ workspace_role: "member", project_role: null });

    await expect(readCollaborationTopicAccessInD1(database, {
      kind: "project",
      resourceId: "project-1",
    }, member)).resolves.toMatchObject({ role: "editor", source: "workspace" });
    expect(bind).toHaveBeenCalledWith("member-1", "member-1", "project-1");
  });

  it("denies a project topic when the caller has no whole-project grant", async () => {
    const { database } = databaseWithRow({ workspace_role: null, project_role: null });

    await expect(readCollaborationTopicAccessInD1(database, {
      kind: "project",
      resourceId: "project-1",
    }, member)).resolves.toBeNull();
  });

  it("admits a direct estimate member only to its estimate topic when inheritance is restricted", async () => {
    const { database, bind } = databaseWithRow({
      workspace_role: null,
      project_role: null,
      estimate_role: "editor",
      inherit_project_access: 0,
    });

    await expect(readCollaborationTopicAccessInD1(database, {
      kind: "estimate",
      resourceId: "estimate-1",
    }, member)).resolves.toMatchObject({
      role: "editor",
      source: "estimate",
      authorizedEstimateIds: ["estimate-1"],
    });
    expect(bind).toHaveBeenCalledWith("member-1", "member-1", "member-1", "estimate-1");
  });

  it("fails closed when the D1 lookup fails", async () => {
    const database = {
      prepare: vi.fn(() => {
        throw new Error("D1 unavailable");
      }),
    };

    await expect(readCollaborationTopicAccessInD1(database, {
      kind: "project",
      resourceId: "project-1",
    }, member)).resolves.toBeNull();
  });
});
