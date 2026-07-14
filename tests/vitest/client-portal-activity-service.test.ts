import { describe, expect, it } from "vitest";

import type { D1DatabaseLike, D1PreparedStatementLike, D1Result, D1Value } from "@/lib/cloudflare/d1";
import { enqueueClientPortalReminder, listClientPortalClientSafeActivity, listClientPortalOwnerAudit, listClientPortalRecipientNextActions, recordClientPortalAnalyticsEvent } from "@/lib/client-portal/activity-service";

function databaseWith(existingOutbox = false, auditRows: unknown[] = []) {
  const statements: { sql: string; values: D1Value[] }[] = [];
  const database: D1DatabaseLike = {
    prepare(sql: string): D1PreparedStatementLike {
      let values: D1Value[] = [];
      const prepared: D1PreparedStatementLike = {
        bind(...nextValues) { values = nextValues; statements.push({ sql, values }); return prepared; },
        async first<T>() {
          if (sql.includes("FROM client_portals")) return { id: "portal_1", workspace_id: "workspace_1", project_id: "project_1", status: "live" } as T;
          if (sql.includes("FROM client_portal_recipients")) return { id: "recipient_1", status: "active" } as T;
          if (sql.includes("FROM client_portal_notification_outbox")) return (existingOutbox ? { id: "outbox_existing" } : null) as T | null;
          return null;
        },
        async all<T>() { return { success: true, results: sql.includes("FROM client_portal_audit_events") ? auditRows as T[] : [] } as D1Result<T>; },
        async run<T>() { return { success: true } as D1Result<T>; },
      };
      return prepared;
    },
    async batch(statements) {
      return Promise.all(statements.map((statement) => statement.run()));
    },
  };
  return { database, statements };
}

const recipient = { kind: "recipient" as const, recipientId: "recipient_1", portalId: "portal_1", role: "reviewer" as const, status: "active" as const, verificationState: "verified" as const, organization: null, isRequiredApprover: false, overrides: [] };
const manager = { kind: "internal" as const, userId: "owner_1", workspaceId: "workspace_1", projectId: "project_1", projectRole: "viewer" as const, portalGrants: ["manager"] as const };

describe("client portal activity service", () => {
  it("does not count bot or preview traffic as verified human analytics", async () => {
    const { database, statements } = databaseWith();
    await expect(recordClientPortalAnalyticsEvent({ actor: recipient, database, portalId: "portal_1", eventType: "viewed", userAgentClass: "bot" })).resolves.toEqual({ recorded: false });
    expect(statements.some((statement) => statement.sql.includes("INSERT INTO client_portal_analytics_events"))).toBe(false);
  });

  it("replays an existing reminder rather than queueing another send", async () => {
    const { database, statements } = databaseWith(true);
    await expect(enqueueClientPortalReminder({ actor: manager, database, portalId: "portal_1", recipientId: "recipient_1", idempotencyKey: "reminder:recipient_1:issue_1" })).resolves.toEqual({ id: "outbox_existing", replayed: true });
    expect(statements.some((statement) => statement.sql.includes("INSERT INTO client_portal_notification_outbox"))).toBe(false);
  });

  it("records a new reminder as one audit-backed outbox intent", async () => {
    const { database, statements } = databaseWith();

    await expect(enqueueClientPortalReminder({ actor: manager, database, portalId: "portal_1", recipientId: "recipient_1", idempotencyKey: "reminder:recipient_1:issue_1" })).resolves.toMatchObject({ replayed: false });

    expect(statements.some((statement) => statement.sql.includes("INSERT INTO client_portal_notification_outbox"))).toBe(true);
    expect(statements.some((statement) => statement.sql.includes("portal.recipient.reminded") && statement.sql.includes("client_portal_audit_events"))).toBe(true);
  });

  it("suppresses reminders after a current-issue decision", async () => {
    const database: D1DatabaseLike = {
      prepare(sql: string): D1PreparedStatementLike {
        const statement: D1PreparedStatementLike = {
          bind() { return statement; },
          async first<T>() {
            if (sql.includes("FROM client_portals")) return { current_issue_id: "issue_1", id: "portal_1", project_id: "project_1", status: "live", workspace_id: "workspace_1" } as T;
            if (sql.includes("MAX(CASE WHEN d.voided_at")) return { decision_submitted_at: "2026-07-12T00:00:00.000Z", id: "recipient_1", last_reminder_at: null, status: "active", unsubscribed: 0 } as T;
            return null;
          },
          async all<T>() { return { results: [], success: true } as D1Result<T>; },
          async run<T>() { return { success: true } as D1Result<T>; },
        };
        return statement;
      },
    };

    await expect(enqueueClientPortalReminder({ actor: manager, database, portalId: "portal_1", recipientId: "recipient_1", idempotencyKey: "reminder:recipient_1:issue_1" })).resolves.toEqual({ id: null, replayed: false, suppressed: true });
  });

  it("returns only client-safe activity event types", async () => {
    const { database } = databaseWith(false, [
      { id: "audit_1", issue_id: "issue_1", actor_type: "recipient", event_type: "thread_created", metadata_json: "{}", occurred_at: "2026-07-12T00:00:00.000Z" },
      { id: "audit_2", issue_id: "issue_1", actor_type: "system", event_type: "authorization_denied", metadata_json: "{}", occurred_at: "2026-07-12T00:01:00.000Z" },
    ]);
    await expect(listClientPortalClientSafeActivity({ actor: recipient, database, issueId: "issue_1", portalId: "portal_1" })).resolves.toEqual({
      activities: [{ id: "audit_1", issueId: "issue_1", eventType: "thread_created", occurredAt: "2026-07-12T00:00:00.000Z", title: "Discussion started" }],
      hasMore: false,
      nextCursor: null,
    });
  });

  it("builds recipient next actions from delivery, view, thread, and decision state", async () => {
    const database: D1DatabaseLike = {
      prepare(sql: string): D1PreparedStatementLike {
        const statement: D1PreparedStatementLike = {
          bind() { return statement; },
          async first<T>() {
            if (sql.includes("FROM client_portals")) return { current_issue_id: "issue_1", id: "portal_1", project_id: "project_1", status: "live", workspace_id: "workspace_1" } as T;
            return null;
          },
          async all<T>() {
            if (sql.includes("FROM client_portal_recipients r")) {
              return {
                results: [{ decision_submitted_at: null, delivery_state: "delivered", display_name: "Avery Client", first_viewed_at: null, id: "recipient_1", last_reminder_at: null, last_viewed_at: null, open_thread_count: 0, required_approver: 1, role_template: "approver", section_view_count: 0, status: "active", unsubscribed: 0, verification_state: "verified", waiting_on_owner_count: 0 }],
                success: true,
              } as D1Result<T>;
            }
            return { results: [], success: true } as D1Result<T>;
          },
          async run<T>() { return { success: true } as D1Result<T>; },
        };
        return statement;
      },
    };

    await expect(listClientPortalRecipientNextActions({ actor: manager, database, portalId: "portal_1" })).resolves.toEqual([expect.objectContaining({
      displayName: "Avery Client",
      nextAction: "decision_pending",
      recipientId: "recipient_1",
    })]);
  });

  it("projects the latest invite delivery state instead of a historical aggregate", async () => {
    const statements: string[] = [];
    const database: D1DatabaseLike = {
      prepare(sql: string): D1PreparedStatementLike {
        statements.push(sql);
        const statement: D1PreparedStatementLike = {
          bind() { return statement; },
          async first<T>() { return sql.includes("FROM client_portals") ? { current_issue_id: "issue_1", id: "portal_1", project_id: "project_1", status: "live", workspace_id: "workspace_1" } as T : null; },
          async all<T>() { return { results: [{ decision_submitted_at: null, delivery_state: "dead", display_name: "Avery Client", first_viewed_at: null, id: "recipient_1", last_reminder_at: null, last_viewed_at: null, open_thread_count: 0, required_approver: 0, role_template: "reviewer", section_view_count: 0, status: "active", unsubscribed: 0, verification_state: "unverified", waiting_on_owner_count: 0 }], success: true } as D1Result<T>; },
          async run<T>() { return { success: true } as D1Result<T>; },
        };
        return statement;
      },
    };

    await expect(listClientPortalRecipientNextActions({ actor: manager, database, portalId: "portal_1" })).resolves.toEqual([expect.objectContaining({ deliveryState: "dead", nextAction: "fix_delivery" })]);
    expect(statements.some((sql) => sql.includes("ORDER BY latest.created_at DESC") && sql.includes("portal.recipient.resent"))).toBe(true);
  });

  it("keeps security events in the owner audit projection only", async () => {
    const { database } = databaseWith(false, [
      { actor_id: "system", actor_type: "system", event_type: "authorization_denied", id: "audit_security", issue_id: null, metadata_json: "{}", occurred_at: "2026-07-12T00:00:00.000Z", visibility: "security" },
    ]);

    await expect(listClientPortalOwnerAudit({ actor: manager, database, portalId: "portal_1" })).resolves.toEqual([expect.objectContaining({
      eventType: "authorization_denied",
      visibility: "security",
    })]);
  });
});
