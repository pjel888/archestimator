import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import type { D1DatabaseLike, D1PreparedStatementLike, D1Result, D1Value } from "@/lib/cloudflare/d1";
import { ClientPortalDecisionError, submitClientPortalDecision } from "@/lib/client-portal/decision-service";

function databaseFor(role: "reviewer" | "approver", replay: Record<string, unknown> | null = null) {
  const statements: Array<{ sql: string; values: D1Value[] }> = [];
  const database: D1DatabaseLike = {
    prepare(sql: string): D1PreparedStatementLike {
      let values: D1Value[] = [];
      const prepared: D1PreparedStatementLike = {
        bind(...next) { values = next; statements.push({ sql, values }); return prepared; },
        async first<T>() {
          if (sql.includes("idempotency_key = ?")) return replay as T | null;
          if (sql.includes("FROM client_portals")) return { id: "portal_1", workspace_id: "workspace_1", project_id: "project_1", status: "live", current_issue_id: "issue_1" } as T;
          if (sql.includes("FROM client_portal_issues")) return { id: "issue_1", issue_number: 4, version_label: "Issue 4", status: "issued", content_hash: "a".repeat(64), total_cost: 125000, currency_code: "USD", valid_through: null, decision_policy_snapshot_json: JSON.stringify({ requiredApprovals: 1, rule: "any_approver" }) } as T;
          if (sql.includes("FROM client_portal_recipients")) return { email_normalized: "reviewer@example.com", display_name: "Reviewer", role_template: role, is_required_approver: role === "approver" ? 1 : 0 } as T;
          return null;
        },
        async all<T>() { return { success: true, results: [] } as D1Result<T>; },
        async run<T>() { return { success: true } as D1Result<T>; },
      };
      return prepared;
    },
    async batch(batch) { statements.push(...batch.map(() => ({ sql: "__batch__", values: [] }))); return batch.map(() => ({ success: true })); },
  };
  return { database, statements };
}

const baseActor = { kind: "recipient" as const, recipientId: "recipient_1", portalId: "portal_1", role: "reviewer" as const, status: "active" as const, verificationState: "verified" as const, organization: null, isRequiredApprover: false, overrides: [] };

describe("client portal decisions", () => {
  it("binds an approver decision to the exact current issue hash and receipt facts", async () => {
    const { database, statements } = databaseFor("approver");
    const receipt = await submitClientPortalDecision({ actor: baseActor, database, portalId: "portal_1", issueId: "issue_1", decision: "approved", expectedIssueContentHash: "a".repeat(64), idempotencyKey: "approve_1", signerName: "A. Approver" });
    expect(receipt).toMatchObject({ decision: "approved", issueNumber: 4, total: 125000, currencyCode: "USD", replayed: false });
    expect(JSON.stringify(statements)).toContain("'issue', 'issue'");
  });

  it("does not let a reviewer approve or submit a stale issue hash", async () => {
    const reviewer = databaseFor("reviewer");
    await expect(submitClientPortalDecision({ actor: baseActor, database: reviewer.database, portalId: "portal_1", issueId: "issue_1", decision: "approved", expectedIssueContentHash: "a".repeat(64), idempotencyKey: "approve_1" })).rejects.toMatchObject({ code: "client_portal_decision_denied" } satisfies Partial<ClientPortalDecisionError>);
    const approver = databaseFor("approver");
    await expect(submitClientPortalDecision({ actor: baseActor, database: approver.database, portalId: "portal_1", issueId: "issue_1", decision: "approved", expectedIssueContentHash: "b".repeat(64), idempotencyKey: "approve_2" })).rejects.toMatchObject({ code: "client_portal_decision_stale" } satisfies Partial<ClientPortalDecisionError>);
  });

  it("keeps request changes reviewer-authorized but requires a formal approver to decline", async () => {
    const reviewer = databaseFor("reviewer");
    await expect(submitClientPortalDecision({ actor: baseActor, database: reviewer.database, portalId: "portal_1", issueId: "issue_1", decision: "changes_requested", expectedIssueContentHash: "a".repeat(64), idempotencyKey: "changes_1" })).resolves.toMatchObject({ decision: "changes_requested" });
    await expect(submitClientPortalDecision({ actor: baseActor, database: reviewer.database, portalId: "portal_1", issueId: "issue_1", decision: "declined", expectedIssueContentHash: "a".repeat(64), idempotencyKey: "decline_1" })).rejects.toMatchObject({ code: "client_portal_decision_denied" } satisfies Partial<ClientPortalDecisionError>);
  });

  it("writes issue aggregation and an owner-addressed outbox row in the same batch", async () => {
    const { database, statements } = databaseFor("approver");
    await submitClientPortalDecision({ actor: baseActor, database, portalId: "portal_1", issueId: "issue_1", decision: "declined", expectedIssueContentHash: "a".repeat(64), idempotencyKey: "decline_1" });
    const serialized = JSON.stringify(statements);
    expect(serialized).toContain("UPDATE client_portal_issues");
    expect(serialized).toContain("recipient_id, event_type");
    expect(serialized).toContain("NULL");
    expect(serialized).toContain("outbox_");
  });

  it("rejects reuse of an idempotency key for a different decision intent", async () => {
    const issueContentHash = "a".repeat(64);
    const savedIntent = createHash("sha256").update(JSON.stringify({ decision: "approved", issueContentHash, note: null, signerName: null })).digest("hex");
    const { database } = databaseFor("approver", { id: "decision_1", issue_id: "issue_1", decision: "approved", note: null, signer_name: null, issue_content_hash: issueContentHash, intent_hash: savedIntent, submitted_at: "2026-07-14T00:00:00.000Z" });
    await expect(submitClientPortalDecision({ actor: baseActor, database, portalId: "portal_1", issueId: "issue_1", decision: "approved", expectedIssueContentHash: issueContentHash, idempotencyKey: "approve_1", note: "Different intent" })).rejects.toMatchObject({ code: "client_portal_decision_invalid" } satisfies Partial<ClientPortalDecisionError>);
  });
});
