import { describe, expect, it } from "vitest";

import type { D1DatabaseLike, D1PreparedStatementLike, D1Result, D1Value } from "@/lib/cloudflare/d1";
import { addClientPortalInternalNote, carryForwardClientPortalThread, replyToClientPortalThreadAsOwner, setClientPortalThreadStatusAsOwner } from "@/lib/client-portal/publisher-discussion-service";

type CapturedStatement = { sql: string; values: D1Value[] };

function createDatabase(options: { activeMentionIds?: string[]; subscribedRecipientIds?: string[]; targetPresent?: boolean } = {}) {
  const statements: CapturedStatement[] = [];
  const database: D1DatabaseLike = {
    prepare(sql: string): D1PreparedStatementLike {
      let values: D1Value[] = [];
      const prepared: D1PreparedStatementLike = {
        bind(...nextValues) { values = nextValues; statements.push({ sql, values }); return prepared; },
        async first<T>() {
          if (sql.includes("FROM client_portals")) return { id: "portal_1", workspace_id: "workspace_1", project_id: "project_1", status: "live", current_issue_id: "issue_2" } as T;
          if (sql.includes("FROM client_portal_threads")) return { id: "thread_1", issue_id: "issue_1", section_key: "section_1", target_kind: "row", target_public_id: "row_1", target_label: "Floor finish", target_secondary_label: null, subject: "Confirm basis", status: "open", waiting_state: "waiting_on_owner", assignee_user_id: null, created_by_actor_id: "recipient_1", created_at: "2026-07-12T00:00:00.000Z", updated_at: "2026-07-12T00:00:00.000Z" } as T;
          if (sql.includes("FROM client_portal_issues")) return { id: "issue_2", issue_number: 2, status: "issued", version_label: "Issue 2" } as T;
          return null;
        },
        async all<T>() {
          if (options.targetPresent && sql.includes("client_portal_issue_sections")) return { success: true, results: [{ id: "section_2", section_key: "estimate", kind: "estimate_browser", title: "Estimate", payload_storage: "d1_json", payload_json: JSON.stringify({ estimates: [{ id: "estimate_1", name: "Main estimate", tabs: [{ id: "tab_1", name: "Base", rows: [{ id: "row_1", description: "Floor finish" }] }] }] }) }] } as D1Result<T>;
          if (sql.includes("FROM client_portal_thread_subscriptions")) return { success: true, results: (options.subscribedRecipientIds ?? []).map((id) => ({ id })) } as D1Result<T>;
          if (sql.includes("FROM client_portal_recipients WHERE")) return { success: true, results: (options.activeMentionIds ?? []).map((id) => ({ id })) } as D1Result<T>;
          return { success: true, results: [] } as D1Result<T>;
        },
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
    expect(statements.filter((captured) => captured.sql.includes("INSERT INTO project_commitment_events"))).toHaveLength(1);
    expect(statements.some((captured) => captured.values.includes("discussion.updated"))).toBe(true);
  });

  it("does not move recipient-visible thread ordering for an internal note", async () => {
    const { database, statements } = createDatabase();

    await addClientPortalInternalNote({
      actor,
      body: "Confirm supplier before the next issue.",
      database,
      idempotencyKey: "note_private_1",
      portalId: "portal_1",
      threadId: "thread_1",
    });

    expect(statements.some((captured) => captured.sql.includes("visibility, created_at") && captured.sql.includes("'internal'"))).toBe(true);
    expect(statements.some((captured) => captured.sql.includes("UPDATE client_portal_threads SET updated_at"))).toBe(false);
  });

  it("notifies each active subscriber or mention once for an owner reply", async () => {
    const { database, statements } = createDatabase({
      activeMentionIds: ["recipient_2", "recipient_3"],
      subscribedRecipientIds: ["recipient_1", "recipient_2"],
    });
    await replyToClientPortalThreadAsOwner({
      actor,
      database,
      portalId: "portal_1",
      threadId: "thread_1",
      idempotencyKey: "reply_notify_1",
      body: "The issued finish is included.",
      mentionedRecipientIds: ["recipient_2", "recipient_3"],
    });

    const notifications = statements.filter((captured) => captured.sql.includes("INSERT INTO client_portal_notification_outbox"));
    expect(notifications).toHaveLength(3);
    expect(notifications.map((captured) => captured.values[3])).toEqual(["recipient_1", "recipient_2", "recipient_3"]);
    expect(notifications.every((captured) => captured.sql.includes("'message_created'") && captured.sql.includes("ON CONFLICT"))).toBe(true);
    expect(notifications.map((captured) => JSON.parse(String(captured.values[5])))).toEqual([
      expect.objectContaining({ audience: "recipient", recipientId: "recipient_1" }),
      expect.objectContaining({ audience: "recipient", recipientId: "recipient_2" }),
      expect.objectContaining({ audience: "recipient", recipientId: "recipient_3" }),
    ]);
    expect(JSON.stringify(statements)).toContain("'message_created', 'client_safe'");
  });

  it("carries a discussion forward without mutating its historic target", async () => {
    const { database, statements } = createDatabase();
    await carryForwardClientPortalThread({ actor, database, portalId: "portal_1", sourceThreadId: "thread_1", targetIssueId: "issue_2" });
    const serialized = JSON.stringify(statements);
    expect(serialized).toContain("carried_forward_from_thread_id");
    expect(serialized).toContain("closed_by_supersession");
    expect(serialized).toContain("requires_revalidation");
    expect(statements.filter((captured) => captured.sql.includes("INSERT INTO project_commitment_events"))).toHaveLength(2);
    expect(statements.some((captured) => captured.values.includes("discussion.started"))).toBe(true);
    expect(statements.some((captured) => captured.values.includes("discussion.updated"))).toBe(true);
  });

  it("re-resolves a semantic issued target before opening a carried-forward thread", async () => {
    const { database, statements } = createDatabase({ targetPresent: true });
    const result = await carryForwardClientPortalThread({ actor, database, portalId: "portal_1", sourceThreadId: "thread_1", targetIssueId: "issue_2" });
    expect(result.revalidated).toBe(true);
    const serialized = JSON.stringify(statements);
    expect(serialized).toContain("section_2");
    expect(serialized).toContain("waiting_on_owner");
  });

  it("records owner resolution without turning notes or assignments into commitments", async () => {
    const { database, statements } = createDatabase();
    await setClientPortalThreadStatusAsOwner({ actor, database, portalId: "portal_1", status: "resolved", threadId: "thread_1" });

    expect(statements.some((captured) => captured.values.includes("discussion.resolved"))).toBe(true);
    expect(JSON.stringify(statements)).not.toContain("assignment.updated");
    expect(JSON.stringify(statements)).not.toContain("internal_note");
  });
});
