import { beforeEach, describe, expect, it, vi } from "vitest";

import type { D1DatabaseLike, D1PreparedStatementLike, D1Result, D1Value } from "@/lib/cloudflare/d1";

const mocks = vi.hoisted(() => ({ context: null as Record<string, unknown> | null }));

vi.mock("@/lib/client-portal/public-repository", () => ({
  resolveClientPortalBaseContext: vi.fn(async () => mocks.context),
}));

import { getClientPortalTimeline } from "@/lib/client-portal/timeline-repository";

function database() {
  const queries: Array<{ sql: string; values: D1Value[] }> = [];
  const db: D1DatabaseLike = {
    prepare(sql: string): D1PreparedStatementLike {
      let values: D1Value[] = [];
      const prepared: D1PreparedStatementLike = {
        bind(...next) { values = next; queries.push({ sql, values }); return prepared; },
        async first<T>() {
          if (sql.includes("FROM projects")) return { name: "Riverside Offices", project_code: "RS-01", currency_code: "PHP" } as T;
          if (sql.includes("FROM client_portal_baselines")) return { baseline_number: 2, total_minor_units: 125_000, currency_code: "PHP", established_at: "2026-07-27T01:00:00.000Z", issue_number: 3, version_label: "Issue 3" } as T;
          if (sql.includes("JOIN client_portals portal ON portal.current_issue_id")) return { issue_number: 4, version_label: "Issue 4", status: "under_review", issued_at: "2026-07-27T02:00:00.000Z", total_cost: 1400, currency_code: "PHP" } as T;
          if (sql.includes("FROM client_portal_issues")) return { total: 4 } as T;
          return null;
        },
        async all<T>() {
          if (sql.includes("FROM client_portal_request_exposures")) {
            return { success: true, results: [
              { owner_recipient_id: "recipient_1", policy_snapshot_json: "{}", status: "visible" },
              { owner_recipient_id: "recipient_2", policy_snapshot_json: JSON.stringify({ allowedRecipientIds: ["recipient_1"] }), status: "visible" },
            ] as T[] } as D1Result<T>;
          }
          if (sql.includes("FROM client_portal_issue_artifacts")) {
            return { success: true, results: [{ policy_snapshot_json: "{}", status: "visible" }] as T[] } as D1Result<T>;
          }
          if (sql.includes("FROM client_portal_event_exposures") && !sql.includes("JOIN project_commitment_events")) {
            return { success: true, results: [{ policy_snapshot_json: "{}", status: "visible" }] as T[] } as D1Result<T>;
          }
          return { success: true, results: [{
            actor_name_snapshot: "Client reviewer",
            actor_type: "recipient",
            client_safe_snapshot_json: JSON.stringify({ decision: "approved", issueNumber: 4, signerName: "Client reviewer" }),
            event_type: "decision.approved",
            occurred_at: "2026-07-27T03:00:00.000Z",
            policy_snapshot_json: "{}",
            public_event_id: "decision_event_public_1",
            internal_metadata_json: JSON.stringify({ decisionId: "decision_internal_1", issueContentHash: "private_hash" }),
            source_id: "decision_internal_1",
            source_type: "decision",
            status: "visible",
            summary: "Approved for construction.",
            title: "Issue 4 was approved",
          }, {
            actor_name_snapshot: "Client reviewer",
            actor_type: "recipient",
            client_safe_snapshot_json: JSON.stringify({ issueNumber: 4, status: "under_review", versionLabel: "Issue 4" }),
            event_type: "discussion.updated",
            occurred_at: "2026-07-27T02:59:30.000Z",
            internal_metadata_json: JSON.stringify({ messageId: "message_internal_1", threadId: "thread_internal_1" }),
            policy_snapshot_json: "{}",
            public_event_id: "discussion_event_public_1",
            source_id: "issue_internal_4",
            source_type: "issue",
            status: "visible",
            summary: "Budget clarification",
            title: "Discussion updated",
          }, {
            actor_name_snapshot: null,
            actor_type: "system",
            client_safe_snapshot_json: JSON.stringify({ publicRequestId: "request_public_1", status: "submitted", title: "Revise millwork", versionNumber: 2, producerTrace: "private" }),
            event_type: "request.amended",
            occurred_at: "2026-07-27T02:59:15.000Z",
            internal_metadata_json: JSON.stringify({ requestId: "request_internal_1", requestVersionId: "request_version_internal_2" }),
            policy_snapshot_json: "{}",
            public_event_id: "request_event_public_1",
            source_id: "request_internal_1",
            source_type: "change_request",
            status: "visible",
            summary: null,
            title: "Request amended",
          }, {
            actor_name_snapshot: null,
            actor_type: "system",
            client_safe_snapshot_json: JSON.stringify({ issueNumber: 4, privateIssueId: "issue_private_1" }),
            event_type: "baseline.established",
            occurred_at: "2026-07-27T02:59:00.000Z",
            policy_snapshot_json: "{}",
            public_event_id: "baseline_event_public_1",
            internal_metadata_json: JSON.stringify({ decisionId: "decision_internal_1", issueId: "issue_private_1" }),
            source_id: "baseline_internal_1",
            source_type: "baseline",
            status: "visible",
            summary: null,
            title: "Issue 4 became the active baseline",
          }] as T[] } as D1Result<T>;
        },
        async run<T>() { return { success: true } as D1Result<T>; },
      };
      return prepared;
    },
  };
  return { db, queries };
}

const actor = {
  kind: "recipient" as const,
  recipientId: "recipient_1",
  portalId: "portal_1",
  role: "approver" as const,
  status: "active" as const,
  verificationState: "verified" as const,
  organization: "Client Co",
  isRequiredApprover: true,
  overrides: [],
};

beforeEach(() => { mocks.context = null; });

describe("client portal timeline repository", () => {
  it("returns portal-scoped public events and current agreement summaries", async () => {
    const { db, queries } = database();
    mocks.context = {
      database: db,
      mappedIssueId: null,
      policyPortal: { id: "portal_1", workspaceId: "workspace_1", projectId: "project_1", status: "live", allowAnonymousView: false },
      portal: { id: "portal_1", workspace_id: "workspace_1", project_id: "project_1", name: "Owner Portal", status: "live", current_issue_id: "issue_4" },
    };

    const result = await getClientPortalTimeline({ actor, token: "a".repeat(43) });
    const repeatedResult = await getClientPortalTimeline({ actor, token: "a".repeat(43) });
    const otherTokenResult = await getClientPortalTimeline({ actor, token: "b".repeat(43) });

    expect(result?.summary).toMatchObject({ activeBaseline: { baselineNumber: 2, issueNumber: 3 }, currentIssue: { issueNumber: 4, status: "under_review" }, openRequestCount: 2 });
    expect(result?.events[0]).toMatchObject({ id: "decision_event_public_1", snapshot: { decision: "approved", issueNumber: 4, signerName: "Client reviewer" }, target: { kind: "decision", issueNumber: 4 } });
    expect(result?.events[0]?.target).toHaveProperty("publicDecisionId", expect.stringMatching(/^cpd_[A-Za-z0-9_-]{43}$/));
    expect(result?.events[1]).toMatchObject({ id: "discussion_event_public_1", snapshot: { issueNumber: 4, status: "under_review", versionLabel: "Issue 4" }, target: { kind: "thread", issueNumber: 4 } });
    expect(result?.events[1]?.target).toHaveProperty("publicThreadId", expect.stringMatching(/^cpt_[A-Za-z0-9_-]{43}$/));
    expect(result?.events[2]).toMatchObject({ snapshot: { publicRequestId: "request_public_1", status: "submitted", title: "Revise millwork", versionNumber: 2 }, target: { kind: "request", publicRequestId: "request_public_1" } });
    expect(result?.events[3]?.snapshot).toEqual({ issueNumber: 4 });
    expect(result?.events[0]?.target).toEqual(repeatedResult?.events[0]?.target);
    expect(result?.events[1]?.target).toEqual(repeatedResult?.events[1]?.target);
    expect(result?.events[0]?.target).not.toEqual(otherTokenResult?.events[0]?.target);
    expect(result?.events[1]?.target).not.toEqual(otherTokenResult?.events[1]?.target);
    expect(JSON.stringify(result)).not.toContain("issue_private_1");
    expect(JSON.stringify(result)).not.toContain("decision_internal_1");
    expect(JSON.stringify(result)).not.toContain("thread_internal_1");
    expect(JSON.stringify(result)).not.toContain("producerTrace");
    expect(queries.find((query) => query.sql.includes("client_portal_event_exposures"))?.values[0]).toBe("portal_1");
  });

  it("fails closed for anonymous viewers without timeline capability", async () => {
    const { db } = database();
    mocks.context = {
      database: db,
      mappedIssueId: null,
      policyPortal: { id: "portal_1", workspaceId: "workspace_1", projectId: "project_1", status: "live", allowAnonymousView: true },
      portal: { id: "portal_1", workspace_id: "workspace_1", project_id: "project_1", name: "Owner Portal", status: "live", current_issue_id: "issue_4" },
    };

    await expect(getClientPortalTimeline({ token: "token" })).resolves.toBeNull();
  });
});
