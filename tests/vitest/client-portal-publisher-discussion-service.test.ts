import { describe, expect, it } from "vitest";

import type { D1DatabaseLike, D1PreparedStatementLike, D1Result, D1Value } from "@/lib/cloudflare/d1";
import { addClientPortalInternalNote, carryForwardClientPortalThread, replyToClientPortalThreadAsOwner } from "@/lib/client-portal/publisher-discussion-service";

type CapturedStatement = { sql: string; values: D1Value[] };

function createDatabase() {
  const statements: CapturedStatement[] = [];
  const database: D1DatabaseLike = {
    prepare(sql: string): D1PreparedStatementLike {
      let values: D1Value[] = [];
      const prepared: D1PreparedStatementLike = {
        bind(...nextValues) { values = nextValues; statements.push({ sql, values }); return prepared; },
        async first<T>() {
          if (sql.includes("FROM client_portals")) return { id: "portal_1", workspace_id: "workspace_1", project_id: "project_1", status: "live", current_issue_id: "issue_2" } as T;
          if (sql.includes("FROM client_portal_threads")) return { id: "thread_1", issue_id: "issue_1", section_key: "section_1", target_kind: "row", target_public_id: "row_1", target_label: "Floor finish", target_secondary_label: null, subject: "Confirm basis", status: "open", waiting_state: "waiting_on_owner", assignee_user_id: null, created_by_actor_id: "recipient_1", created_at: "2026-07-12T00:00:00.000Z", updated_at: "2026-07-12T00:00:00.000Z" } as T;
          if (sql.includes("FROM client_portal_issues")) return { id: "issue_2", status: "issued" } as T;
          return null;
        },
        async all<T>() { return { success: true, results: [] } as D1Result<T>; },
        async run<T>() { return { success: true } as D1Result<T>; },
      };
      return prepared;
    },
    async batch(batchStatements) { statements.push(...batchStatements.map(() => ({ sql: "__batch__", values: [] }))); return batchStatements.map(() => ({ success: true })); },
  };
  return { database, statements };
}

const actor = {
  kind: "internal" as const,
  userId: "owner_1",
  workspaceId: "workspace_1",
  projectId: "project_1",
  projectRole: "viewer" as const,
  portalGrants: ["manager"] as const,
};

describe("publisher client portal discussions", () => {
  it("separates owner replies from internal notes at the persistence boundary", async () => {
    const { database, statements } = createDatabase();
    await replyToClientPortalThreadAsOwner({ actor, database, portalId: "portal_1", threadId: "thread_1", idempotencyKey: "reply_1", body: "The issued finish is included." });
    await addClientPortalInternalNote({ actor, database, portalId: "portal_1", threadId: "thread_1", idempotencyKey: "note_1", body: "Confirm supplier before the next issue." });
    const serialized = JSON.stringify(statements);
    expect(serialized).toContain("'client'");
    expect(serialized).toContain("'internal'");
    expect(serialized).toContain("waiting_on_client");
  });

  it("carries a discussion forward without mutating its historic target", async () => {
    const { database, statements } = createDatabase();
    await carryForwardClientPortalThread({ actor, database, portalId: "portal_1", sourceThreadId: "thread_1", targetIssueId: "issue_2" });
    const serialized = JSON.stringify(statements);
    expect(serialized).toContain("carried_forward_from_thread_id");
    expect(serialized).toContain("closed_by_supersession");
    expect(serialized).toContain("requires_revalidation");
  });
});
