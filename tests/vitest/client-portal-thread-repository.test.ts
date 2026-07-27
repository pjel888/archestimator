import { describe, expect, it } from "vitest";

import type { D1DatabaseLike, D1PreparedStatementLike, D1Result, D1Value } from "@/lib/cloudflare/d1";
import { createClientPortalRecipientThread, editClientPortalRecipientMessage, listClientPortalRecipientThreadMessages, listClientPortalRecipientThreads, markClientPortalRecipientThreadRead, replyToClientPortalThread, setClientPortalRecipientThreadStatus, tombstoneClientPortalRecipientMessage } from "@/lib/client-portal/thread-repository";

type CapturedStatement = { sql: string; values: D1Value[] };

function createDatabase(options: { activeMentionIds?: string[]; messages?: Record<string, unknown>[]; raceReplay?: { body: string; thread_id: string }; recipientMessage?: { created_at: string; id: string; thread_id: string; tombstoned_at: string | null }; replay?: { body: string; thread_id: string }; sectionPolicy?: Record<string, unknown>; threads?: Record<string, unknown>[] } = {}) {
  const statements: CapturedStatement[] = [];
  let batchAttempted = false;
  const database: D1DatabaseLike = {
    prepare(sql: string): D1PreparedStatementLike {
      let values: D1Value[] = [];
      const prepared: D1PreparedStatementLike = {
        bind(...nextValues) { values = nextValues; statements.push({ sql, values }); return prepared; },
        async first<T>() {
          if (sql.includes("FROM client_portal_messages WHERE actor_type")) return (batchAttempted ? options.raceReplay : options.replay) as T | null;
          if (sql.includes("FROM client_portal_messages m")) return (options.recipientMessage ?? { id: "message_1", thread_id: "thread_1", created_at: new Date().toISOString(), tombstoned_at: null }) as T;
          if (sql.includes("FROM client_portals")) return { id: "portal_1", name: "Harbor House", workspace_id: "workspace_1", project_id: "project_1", status: "live", current_issue_id: "issue_1" } as T;
          if (sql.includes("FROM client_portal_issues")) return { id: "issue_1", issue_number: 1, version_label: "Issue 1", status: "issued", valid_through: null } as T;
          if (sql.includes("FROM client_portal_issue_sections")) return { id: "section_1", policy_snapshot_json: JSON.stringify(options.sectionPolicy ?? { enabled: true, commentable: true }) } as T;
          if (sql.includes("FROM client_portal_threads")) return { id: "thread_1", issue_id: "issue_1", section_key: "section_1", target_kind: "row", target_public_id: "row_1", target_label: "Floor finish", target_secondary_label: null, subject: "Confirm basis", status: "open", waiting_state: "waiting_on_owner", created_by_actor_id: "recipient_1", created_at: "2026-07-12T00:00:00.000Z", updated_at: "2026-07-12T00:00:00.000Z" } as T;
          return null;
        },
        async all<T>() {
          if (sql.includes("FROM client_portal_recipients")) return { success: true, results: (options.activeMentionIds ?? []).map((id) => ({ id })) } as D1Result<T>;
          if (sql.includes("SELECT id, section_key, kind, title, payload_storage, payload_json FROM client_portal_issue_sections")) return { success: true, results: [{ id: "section_1", section_key: "estimate", kind: "estimate_browser", title: "Estimate", payload_storage: "d1_json", payload_json: JSON.stringify({ estimates: [{ id: "estimate_1", name: "Main estimate", tabs: [{ id: "tab_1", name: "Base", rows: [{ id: "row_1", description: "Floor finish", componentAnchor: "component_1", variantLabel: "Standard" }] }] }] }) }] } as D1Result<T>;
          if (sql.includes("FROM client_portal_threads t")) return { success: true, results: options.threads ?? [] } as D1Result<T>;
          if (sql.includes("FROM client_portal_messages WHERE thread_id")) return { success: true, results: options.messages ?? [] } as D1Result<T>;
          return { success: true, results: [] } as D1Result<T>;
        },
        async run<T>() { return { success: true } as D1Result<T>; },
      };
      return prepared;
    },
    async batch(batchStatements) {
      statements.push(...batchStatements.map(() => ({ sql: "__batch__", values: [] })));
      batchAttempted = true;
      if (options.raceReplay) throw new Error("unique constraint race");
      return batchStatements.map(() => ({ success: true }));
    },
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
      subject: "Confirm basis", body: "Please confirm the floor finish basis.", target: { kind: "row", publicId: "row_1" },
    });

    expect(thread).toMatchObject({ target_kind: "row", waiting_state: "waiting_on_owner" });
    const serialized = JSON.stringify(statements);
    expect(serialized).toContain("INSERT INTO client_portal_threads");
    expect(serialized).toContain("INSERT INTO client_portal_messages");
    expect(serialized).toContain("client_portal_thread_subscriptions");
    expect(serialized).toContain("project_commitment_events");
    expect(serialized).toContain("client_portal_event_exposures");
    expect(statements.some((captured) => captured.values.includes("discussion.started"))).toBe(true);
    expect(serialized).not.toContain("'internal'");
  });

  it("replays the saved thread for a matching recipient idempotency key", async () => {
    const { database } = createDatabase({ replay: { body: "Saved message", thread_id: "thread_1" } });
    const thread = await createClientPortalRecipientThread({
      actor, database, portalId: "portal_1", issueId: "issue_1", idempotencyKey: "create_1", subject: "Confirm basis", body: "Saved message", target: { kind: "row", publicId: "row_1" },
    });
    expect(thread.id).toBe("thread_1");
  });

  it("recovers the authoritative thread when a concurrent idempotent create wins", async () => {
    const { database } = createDatabase({ raceReplay: { body: "Saved message", thread_id: "thread_1" } });
    await expect(createClientPortalRecipientThread({ actor, database, portalId: "portal_1", issueId: "issue_1", idempotencyKey: "create_race", subject: "Confirm basis", body: "Saved message", target: { kind: "row", publicId: "row_1" } })).resolves.toMatchObject({ id: "thread_1" });
  });

  it("uses the same client-only path for replies and recipient resolution", async () => {
    const { database, statements } = createDatabase();
    await replyToClientPortalThread({ actor, database, portalId: "portal_1", threadId: "thread_1", idempotencyKey: "reply_1", body: "Thank you for the clarification." });
    await setClientPortalRecipientThreadStatus({ actor, database, portalId: "portal_1", threadId: "thread_1", status: "resolved" });
    const serialized = JSON.stringify(statements);
    expect(serialized).toContain("waiting_on_owner");
    expect(serialized).toContain("resolved_at");
    expect(statements.some((captured) => captured.values.includes("discussion.updated"))).toBe(true);
    expect(statements.some((captured) => captured.values.includes("discussion.resolved"))).toBe(true);
    expect(serialized).not.toContain("audience = 'internal'");
  });

  it("only updates a recent recipient message through edit or tombstone writes", async () => {
    const { database, statements } = createDatabase();
    await editClientPortalRecipientMessage({ actor, database, portalId: "portal_1", messageId: "message_1", body: "Revised clarification." });
    await tombstoneClientPortalRecipientMessage({ actor, database, portalId: "portal_1", messageId: "message_1" });
    const serialized = JSON.stringify(statements);
    expect(serialized).toContain("edited_at");
    expect(serialized).toContain("tombstoned_at");
    expect(serialized).toContain("Message removed by its author.");
    expect(serialized).toContain("t.audience = 'client'");
  });

  it("persists mentions only for active recipients in the same portal", async () => {
    const { database, statements } = createDatabase({ activeMentionIds: ["recipient_2"] });
    await createClientPortalRecipientThread({
      actor, database, portalId: "portal_1", issueId: "issue_1", idempotencyKey: "mention_1", mentionedRecipientIds: ["recipient_1", "recipient_2", "recipient_2"],
      subject: "Confirm basis", body: "Please confirm the floor finish basis.", target: { kind: "row", publicId: "row_1" },
    });
    const serialized = JSON.stringify(statements);
    expect(serialized).toContain("client_portal_message_mentions");
    const mentionInserts = statements.filter((statement) => statement.sql.includes("client_portal_message_mentions"));
    expect(mentionInserts).toHaveLength(1);
    expect(mentionInserts[0]?.values).toContain("recipient_2");
  });

  it("filters threads whose issued section policy is hidden from the recipient", async () => {
    const database: D1DatabaseLike = {
      prepare<T>() {
        const prepared: D1PreparedStatementLike<T> = {
          bind() { return prepared; },
          async first<R>() { return { id: "portal_1", workspace_id: "workspace_1", project_id: "project_1", status: "live", current_issue_id: "issue_1" } as R; },
          async all<R>() { return { success: true, results: [{ id: "thread_hidden", issue_id: "issue_1", section_key: "section_hidden", target_kind: "row", target_public_id: "row_1", target_label: "Hidden row", target_secondary_label: null, subject: "Hidden", status: "open", waiting_state: "waiting_on_owner", created_by_actor_id: "recipient_2", created_at: "2026-07-12T00:00:00.000Z", updated_at: "2026-07-12T00:00:00.000Z", issue_status: "issued", issue_valid_through: null, section_policy_snapshot_json: JSON.stringify({ enabled: false, commentable: false }), unread_count: 1 }] as R[] }; },
          async run<R>() { return { success: true } as D1Result<R>; },
        };
        return prepared;
      },
    };
    await expect(listClientPortalRecipientThreads({ actor, database, portalId: "portal_1" })).resolves.toEqual({ hasMore: false, nextCursor: null, threads: [] });
  });

  it("hides messages and read markers behind the same issued section policy", async () => {
    const { database } = createDatabase({ sectionPolicy: { enabled: false, commentable: false } });
    await expect(listClientPortalRecipientThreadMessages({ actor, database, portalId: "portal_1", threadId: "thread_1" })).rejects.toMatchObject({ code: "client_portal_thread_not_found" });
    await expect(markClientPortalRecipientThreadRead({ actor, database, portalId: "portal_1", threadId: "thread_1" })).rejects.toMatchObject({ code: "client_portal_thread_not_found" });
  });

  it("bounds recipient thread reads and returns a stable continuation cursor", async () => {
    const threads = [3, 2, 1].map((sequence) => ({
      id: `thread_${sequence}`,
      issue_id: "issue_1",
      section_key: "section_1",
      target_kind: "row",
      target_public_id: `row_${sequence}`,
      target_label: `Row ${sequence}`,
      target_secondary_label: null,
      subject: `Question ${sequence}`,
      status: "open",
      waiting_state: "waiting_on_owner",
      created_by_actor_id: "recipient_1",
      created_at: `2026-07-12T00:00:0${sequence}.000Z`,
      updated_at: `2026-07-12T00:00:0${sequence}.000Z`,
      issue_status: "issued",
      issue_valid_through: null,
      section_policy_snapshot_json: JSON.stringify({ enabled: true, commentable: true }),
      unread_count: 0,
    }));
    const { database, statements } = createDatabase({ threads });

    const page = await listClientPortalRecipientThreads({ actor, database, portalId: "portal_1", limit: 2 });

    expect(page).toMatchObject({ hasMore: true, threads: [{ id: "thread_3" }, { id: "thread_2" }] });
    expect(page.nextCursor).toBe("2026-07-12T00:00:02.000Z|thread_2");
    const listStatement = statements.find((entry) => entry.sql.includes("FROM client_portal_threads t"));
    expect(listStatement?.sql).toContain("LIMIT ?");
    expect(listStatement?.values.at(-1)).toBe(3);

    await listClientPortalRecipientThreads({ actor, cursor: page.nextCursor, database, portalId: "portal_1", limit: 2 });
    const cursorStatement = statements.filter((entry) => entry.sql.includes("FROM client_portal_threads t")).at(-1);
    expect(cursorStatement?.values).toContain("thread_2");
  });

  it("bounds client-visible messages and returns an ascending continuation cursor", async () => {
    const messages = [1, 2, 3].map((sequence) => ({
      id: `message_${sequence}`,
      author_snapshot_json: JSON.stringify({ displayName: "Client Reviewer", side: "client" }),
      body: `Message ${sequence}`,
      created_at: `2026-07-12T00:00:0${sequence}.000Z`,
      edited_at: null,
      tombstoned_at: null,
    }));
    const { database, statements } = createDatabase({ messages });

    const page = await listClientPortalRecipientThreadMessages({ actor, database, portalId: "portal_1", threadId: "thread_1", limit: 2 });

    expect(page).toMatchObject({ hasMore: true, messages: [{ id: "message_1" }, { id: "message_2" }] });
    expect(page.nextCursor).toBe("2026-07-12T00:00:02.000Z|message_2");
    const listStatement = statements.find((entry) => entry.sql.includes("FROM client_portal_messages WHERE thread_id"));
    expect(listStatement?.sql).toContain("LIMIT ?");
    expect(listStatement?.values.at(-1)).toBe(3);
  });
});
