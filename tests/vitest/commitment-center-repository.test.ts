import { describe, expect, it } from "vitest";

import type {
  D1DatabaseLike,
  D1PreparedStatementLike,
  D1Result,
  D1Value,
} from "@/lib/cloudflare/d1";
import {
  COMMITMENT_CENTER_DETAIL_LIMIT,
  readWorkspaceCommitmentCenter,
} from "@/lib/publisher/commitment-center-repository";

type QueryRecord = { sql: string; values: D1Value[] };

function fixtureDatabase(options: { emptyPortals?: boolean; portalOverrides?: Record<string, unknown> } = {}) {
  const queries: QueryRecord[] = [];
  const database: D1DatabaseLike = {
    prepare<T>(sql: string): D1PreparedStatementLike<T> {
      let values: D1Value[] = [];
      const statement: D1PreparedStatementLike<T> = {
        bind(...nextValues) {
          values = nextValues;
          return statement;
        },
        async first<R>() {
          return (await statement.all<R>()).results?.[0] ?? null;
        },
        async all<R>(): Promise<D1Result<R>> {
          queries.push({ sql, values });
          if (sql.includes("commitment-center:portals")) {
            if (options.emptyPortals) return { results: [] };
            return { results: [{
              active_recipient_count: 2,
              audience_kind: "client",
              baseline_currency_code: "USD",
              baseline_established_at: "2026-07-25T09:00:00.000Z",
              baseline_number: 3,
              baseline_total_minor_units: 250000,
              baseline_version_label: "Approved v3",
              can_manage_portal: 1,
              decision_approved_count: 1,
              decision_changes_requested_count: 0,
              decision_count: 1,
              decision_declined_count: 0,
              delivery_dead_count: 0,
              delivery_delivered_count: 2,
              delivery_pending_count: 1,
              invited_recipient_count: 1,
              issue_issued_at: "2026-07-26T10:00:00.000Z",
              issue_id: "issue-4",
              issue_number: 4,
              issue_status: "under_review",
              issue_version_label: "Proposal v4",
              is_primary: 1,
              latest_delivery_state: "pending",
              latest_event_occurred_at: "2026-07-26T10:00:00.000Z",
              latest_event_title: "Proposal v4 issued",
              latest_event_type: "issue.published",
              open_request_count: 2,
              password_required: 1,
              portal_id: "portal-1",
              portal_name: "Owner approvals",
              portal_purpose: "Formal approvals",
              portal_status: "live",
              project_code: "A-100",
              project_id: "project-1",
              project_name: "Civic Center",
              required_approval_count: 1,
              required_approver_count: 1,
              total_recipient_count: 3,
              unverified_recipient_count: 1,
              waiting_discussion_count: 1,
              ...options.portalOverrides,
            }] as R[] };
          }
          if (sql.includes("commitment-center:requests")) {
            return { results: [{
              id: "request-1",
              origin_portal_id: "portal-1",
              portal_name: "Owner approvals",
              project_id: "project-1",
              project_name: "Civic Center",
              request_code: "CR-004",
              requested_at: "2026-07-26T08:00:00.000Z",
              status: "under_assessment",
              title: "Revise lobby finishes",
            }] as R[] };
          }
          return { results: [{
            decision: "approved",
            id: "decision-1",
            issue_number: 4,
            portal_id: "portal-1",
            portal_name: "Owner approvals",
            project_id: "project-1",
            project_name: "Civic Center",
            signer_name: "Morgan Client",
            submitted_at: "2026-07-26T11:00:00.000Z",
            version_label: "Proposal v4",
          }] as R[] };
        },
        async run() {
          return { success: true };
        },
      };
      return statement;
    },
  };
  return { database, queries };
}

describe("workspace Commitment Center repository", () => {
  it("returns the complete modern commitment projection with bounded direct queries", async () => {
    const { database, queries } = fixtureDatabase();
    const result = await readWorkspaceCommitmentCenter({
      database,
      limit: 20,
      userId: "user-1",
      workspaceId: "workspace-1",
    });

    expect(result.summary).toEqual({
      actionRequired: 1,
      activeBaselines: 1,
      openRequests: 2,
      portals: 1,
      waitingDiscussions: 1,
    });
    expect(result.portals[0]).toMatchObject({
      activeBaseline: { versionLabel: "Approved v3" },
      audience: "client",
      currentDecisions: { approved: 1, total: 1 },
      delivery: { delivered: 2, latestState: "pending", pending: 1 },
      nextAction: {
        kind: "portal_control",
        label: "Respond to 1 discussion",
        priority: "urgent",
      },
      openRequests: 2,
      pendingIssue: { status: "under_review", versionLabel: "Proposal v4" },
      recipients: { requiredApprovers: 1, total: 3, unverified: 1 },
      waitingDiscussions: 1,
    });
    expect(result.requests[0]).toMatchObject({ requestCode: "CR-004", status: "under_assessment" });
    expect(result.decisions[0]).toMatchObject({ decision: "approved", signerName: "Morgan Client" });

    const sql = queries.map((query) => query.sql).join("\n");
    for (const table of [
      "client_portals",
      "client_portal_baselines",
      "client_portal_issues",
      "project_change_requests",
      "client_portal_threads",
      "client_portal_decisions",
      "client_portal_recipients",
      "client_portal_notification_outbox",
      "project_commitment_events",
    ]) {
      expect(sql).toContain(table);
    }
    expect(sql).not.toContain("project_publications");
    expect(queries[0]?.values.at(-1)).toBe(21);
    expect(queries[1]?.values.at(-1)).toBe(COMMITMENT_CENTER_DETAIL_LIMIT);
    expect(queries[2]?.values.at(-1)).toBe(COMMITMENT_CENTER_DETAIL_LIMIT);
  });

  it("does not issue detail scans when the workspace has no modern portals", async () => {
    const { database, queries } = fixtureDatabase({ emptyPortals: true });

    const result = await readWorkspaceCommitmentCenter({
      database,
      userId: "user-1",
      workspaceId: "workspace-1",
    });

    expect(result.portals).toEqual([]);
    expect(queries).toHaveLength(1);
  });

  it("routes pending required approvals as action-required", async () => {
    const { database } = fixtureDatabase({ portalOverrides: {
      baseline_number: null,
      decision_approved_count: 1,
      issue_status: "under_review",
      open_request_count: 0,
      required_approval_count: 2,
      required_approver_count: 2,
      unverified_recipient_count: 0,
      waiting_discussion_count: 0,
    } });

    const result = await readWorkspaceCommitmentCenter({ database, userId: "user-1", workspaceId: "workspace-1" });

    expect(result.portals[0]?.nextAction).toEqual({
      href: "/workshop/projects/project-1/client-portals/portal-1?tab=decisions",
      kind: "portal_control",
      label: "Await 1 required approval",
      priority: "attention",
    });
  });

  it("prioritizes executable accepted-baseline reconciliation over overlapping portal work", async () => {
    const { database } = fixtureDatabase({ portalOverrides: {
      baseline_number: null,
      delivery_dead_count: 2,
      issue_status: "accepted",
      open_request_count: 3,
      unverified_recipient_count: 4,
      waiting_discussion_count: 1,
    } });

    const result = await readWorkspaceCommitmentCenter({ database, userId: "user-1", workspaceId: "workspace-1" });

    expect(result.portals[0]?.nextAction).toEqual({
      issueId: "issue-4",
      kind: "baseline_reconciliation",
      label: "Restore the accepted baseline",
      priority: "urgent",
    });
  });
});
