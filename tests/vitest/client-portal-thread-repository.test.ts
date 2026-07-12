import { describe, expect, it } from "vitest";

import type { D1DatabaseLike, D1PreparedStatementLike, D1Result, D1Value } from "@/lib/cloudflare/d1";
import { createClientPortalRecipientThread, replyToClientPortalThread, setClientPortalRecipientThreadStatus } from "@/lib/client-portal/thread-repository";

type CapturedStatement = { sql: string; values: D1Value[] };

function createDatabase(options: { replay?: { body: string; thread_id: string } } = {}) {
  const statements: CapturedStatement[] = [];
  const database: D1DatabaseLike = {
    prepare(sql: string): D1PreparedStatementLike {
      let values: D1Value[] = [];
      const prepared: D1PreparedStatementLike = {
        bind(...nextValues) { values = nextValues; statements.push({ sql, values }); return prepared; },
        async first<T>() {
          if (sql.includes("FROM client_portal_messages WHERE actor_type")) return (options.replay ?? null) as T | null;
          if (sql.includes("FROM client_portals")) return { id: "portal_1", workspace_id: "workspace_1", project_id: "project_1", status: "live", current_issue_id: "issue_1" } as T;
          if (sql.includes("FROM client_portal_issues")) return { id: "issue_1", status: "issued" } as T;
          if (sql.includes("FROM client_portal_issue_sections")) return { id: "section_1", policy_snapshot_json: JSON.stringify({ enabled: true, commentable: true }) } as T;
          if (sql.includes("FROM client_portal_threads")) return { id: "thread_1", issue_id: "issue_1", section_key: "section_1", target_kind: "row", target_public_id: "row_1", target_label: "Floor finish", target_secondary_label: null, subject: "Confirm basis", status: "open", waiting_state: "waiting_on_owner", created_at: "2026-07-12T00:00:00.000Z", updated_at: "2026-07-12T00:00:00.000Z" } as T;
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
  kind: "recipient" as const,
  recipientId: "recipient_1",
  displayName: "Client Reviewer",
  portalId: "portal_1",
  role: "reviewer" as const,
  status: "active" as const,
  verificationState: "verified" as const,
  organization: null,
  isRequiredApprover: false,
  overrides: [],
};

describe("client portal thread repository", () => {
  it("creates a client-visible thread, first message, subscription, and read marker in one batch", async () => {
    const { database, statements } = createDatabase();
    const thread = await createClientPortalRecipientThread({
      actor, database, portalId: "portal_1", issueId: "issue_1", sectionId: "section_1", idempotencyKey: "create_1",
      subject: "Confirm basis", body: "Please confirm the floor finish basis.", target: { kind: "row", publicId: "row_1", label: "Floor finish" },
    });

    expect(thread).toMatchObject({ target_kind: "row", waiting_state: "waiting_on_owner" });
    const serialized = JSON.stringify(statements);
    expect(serialized).toContain("INSERT INTO client_portal_threads");
    expect(serialized).toContain("INSERT INTO client_portal_messages");
    expect(serialized).toContain("client_portal_thread_subscriptions");
    expect(serialized).not.toContain("'internal'");
  });

  it("replays the saved thread for a matching recipient idempotency key", async () => {
    const { database } = createDatabase({ replay: { body: "Saved message", thread_id: "thread_1" } });
    const thread = await createClientPortalRecipientThread({
      actor, database, portalId: "portal_1", issueId: "issue_1", idempotencyKey: "create_1", subject: "Saved subject", body: "Saved message", target: { kind: "portal", label: "General discussion" },
    });
    expect(thread.id).toBe("thread_1");
  });

  it("uses the same client-only path for replies and recipient resolution", async () => {
    const { database, statements } = createDatabase();
    await replyToClientPortalThread({ actor, database, portalId: "portal_1", threadId: "thread_1", idempotencyKey: "reply_1", body: "Thank you for the clarification." });
    await setClientPortalRecipientThreadStatus({ actor, database, portalId: "portal_1", threadId: "thread_1", status: "resolved" });
    const serialized = JSON.stringify(statements);
    expect(serialized).toContain("waiting_on_owner");
    expect(serialized).toContain("resolved_at");
    expect(serialized).not.toContain("audience = 'internal'");
  });
});
