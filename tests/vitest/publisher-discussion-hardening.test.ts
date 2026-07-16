import { describe, expect, it } from "vitest";

import type { D1DatabaseLike, D1PreparedStatementLike, D1Result, D1Value } from "@/lib/cloudflare/d1";
import {
  listPublisherDiscussionThreads,
  setClientPortalThreadStatusAsOwner,
} from "@/lib/client-portal/publisher-discussion-service";

const actor = {
  kind: "internal" as const,
  userId: "owner_1",
  workspaceId: "workspace_1",
  projectId: "project_1",
  projectRole: "viewer" as const,
  portalGrants: ["manager"] as const,
};

// Returns a portal that belongs to a DIFFERENT project than the actor — the IDOR probe.
// A manager of project_1 must not read/act on a portal scoped to project_other.
function crossProjectDatabase(): D1DatabaseLike {
  return {
    prepare(sql: string) {
      const prepared: D1PreparedStatementLike = {
        bind(...nextValues: D1Value[]) { return prepared; },
        async first<T>() {
          if (sql.includes("FROM client_portals")) {
            return { id: "portal_other", workspace_id: "workspace_1", project_id: "project_other", status: "live", current_issue_id: null } as T;
          }
          return null;
        },
        async all<T>() { return { success: true, results: [] } as D1Result<T>; },
        async run<T>() { return { success: true } as D1Result<T>; },
      };
      return prepared;
    },
    async batch() { return [{ success: true }]; },
  } as D1DatabaseLike;
}

describe("publisher discussion hardening", () => {
  it("denies a portal that belongs to a different project (IDOR guard)", async () => {
    const database = crossProjectDatabase();
    await expect(
      listPublisherDiscussionThreads({ actor, database, portalId: "portal_other" }),
    ).rejects.toMatchObject({ code: "client_portal_discussion_denied" });
  });

  it("rejects a non-enum thread status at runtime even though the TS type is erased", async () => {
    const database = crossProjectDatabase();
    await expect(
      setClientPortalThreadStatusAsOwner({
        actor,
        database,
        portalId: "portal_other",
        threadId: "thread_1",
        status: "archived" as unknown as "open" | "resolved",
      }),
    ).rejects.toMatchObject({ code: "client_portal_discussion_invalid" });
  });
});
