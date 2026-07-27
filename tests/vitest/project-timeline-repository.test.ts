import { describe, expect, it } from "vitest";

import type { D1DatabaseLike, D1PreparedStatementLike, D1Result, D1Value } from "@/lib/cloudflare/d1";
import { readProjectTimelinePage } from "@/lib/project-ledger/timeline-repository";

const eventRows = [
  {
    actor_domain_role_snapshot: "quantity_surveyor",
    actor_name_snapshot: "Maria",
    actor_permission_role_snapshot: "owner",
    actor_type: "internal_user",
    event_type: "issue.issued",
    exposure_count: 1,
    exposure_statuses: "visible",
    id: "event-1",
    internal_metadata_json: JSON.stringify({ source: "composer" }),
    occurred_at: "2026-07-27T02:00:00.000Z",
    origin_portal_id: "portal-1",
    origin_portal_name: "Client",
    root_request_code: "CR-004",
    root_request_id: "request-4",
    root_request_title: "Revise millwork",
    source_id: "issue-2",
    source_type: "issue",
    source_version_id: null,
    summary: "Issued for formal review.",
    title: "Issue 2 published",
  },
  {
    actor_domain_role_snapshot: null,
    actor_name_snapshot: "System",
    actor_permission_role_snapshot: null,
    actor_type: "system",
    event_type: "artifact.created",
    exposure_count: 0,
    exposure_statuses: null,
    id: "event-2",
    internal_metadata_json: "{}",
    occurred_at: "2026-07-27T01:00:00.000Z",
    origin_portal_id: null,
    origin_portal_name: null,
    root_request_code: null,
    root_request_id: null,
    root_request_title: null,
    source_id: "artifact-1",
    source_type: "artifact",
    source_version_id: null,
    summary: "Internal artifact created.",
    title: "Estimate uploaded",
  },
  {
    actor_domain_role_snapshot: "contractor",
    actor_name_snapshot: "Sam",
    actor_permission_role_snapshot: "member",
    actor_type: "internal_user",
    event_type: "decision.recorded",
    exposure_count: 1,
    exposure_statuses: "visible",
    id: "event-3",
    internal_metadata_json: "{}",
    occurred_at: "2026-07-27T00:00:00.000Z",
    origin_portal_id: "portal-2",
    origin_portal_name: "Contractor",
    root_request_code: null,
    root_request_id: null,
    root_request_title: null,
    source_id: "decision-1",
    source_type: "decision",
    source_version_id: null,
    summary: "Contractor decision recorded.",
    title: "Alternate accepted",
  },
] as const;

function database() {
  const queries: Array<{ sql: string; values: D1Value[] }> = [];
  const db: D1DatabaseLike = {
    prepare(sql: string): D1PreparedStatementLike {
      let values: D1Value[] = [];
      const statement: D1PreparedStatementLike = {
        bind(...next) { values = next; queries.push({ sql, values }); return statement; },
        async all<T>() {
          if (sql.includes("FROM client_portals") && !sql.includes("project_commitment_events")) {
            return { success: true, results: [
              { id: "portal-1", name: "Client", status: "live", audience_kind: "client", is_primary: 1, current_issue_id: "issue-2" },
              { id: "portal-2", name: "Contractor", status: "ready", audience_kind: "contractor", is_primary: 0, current_issue_id: null },
            ] as T[] } as D1Result<T>;
          }
          if (sql.includes("FROM project_commitment_events event")) {
            const portalId = sql.includes("event.origin_portal_id = ?")
              ? values.find((value) => value === "portal-1" || value === "portal-2")
              : null;
            const results = portalId
              ? eventRows.filter((row) => row.origin_portal_id === portalId)
              : eventRows;
            return { success: true, results: results as unknown as T[] } as D1Result<T>;
          }
          return { success: true, results: [] as T[] } as D1Result<T>;
        },
        async first<T>() {
          if (sql.includes("FROM client_portal_baselines")) return { approved_approvals: 1, approver_names: "Morgan Client", baseline_number: 1, total_minor_units: 125_000, currency_code: "PHP", established_at: "2026-07-26T00:00:00.000Z", issue_number: 1, required_approvals: 1, version_label: "Issue 1" } as T;
          if (sql.includes("FROM client_portal_issues issue")) return { issue_number: 2, version_label: "Issue 2", status: "under_review", issued_at: "2026-07-27T01:00:00.000Z", total_cost: 1400, currency_code: "PHP", unresolved_item_count: 2 } as T;
          if (sql.includes("SELECT event_type, title, occurred_at")) return { event_type: "issue.issued", occurred_at: "2026-07-27T02:00:00.000Z", title: "Issue 2 published" } as T;
          if (sql.includes("FROM project_commitment_events")) return { total: 3 } as T;
          if (sql.includes("FROM project_change_requests")) return { total: 2 } as T;
          if (sql.includes("FROM project_artifacts")) return { total: 3 } as T;
          if (sql.includes("FROM client_portal_threads")) return { total: 4 } as T;
          return null;
        },
        async run<T>() { return { success: true } as D1Result<T>; },
      };
      return statement;
    },
  };
  return { db, queries };
}

describe("project timeline repository", () => {
  it("defaults to all project activity including null-origin and multi-portal events", async () => {
    const { db, queries } = database();
    const result = await readProjectTimelinePage({ database: db, projectId: "project-1" });

    expect(result.context).toMatchObject({
      activeBaseline: { approvals: { approved: 1, names: ["Morgan Client"], required: 1 }, baselineNumber: 1 },
      counts: { activeFiles: 3, openRequests: 2, totalEvents: 3, waitingDiscussions: 4 },
      currentIssue: { issueNumber: 2, unresolvedItems: 2 },
      currentPortal: { id: "portal-1", isPrimary: true, name: "Client" },
      latestOfficialEvent: { eventType: "issue.issued", title: "Issue 2 published" },
      selectedPortalId: null,
    });
    expect(result.events).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "event-1", portal: { id: "portal-1", name: "Client" } }),
      expect.objectContaining({ id: "event-2", portal: null, source: expect.objectContaining({ type: "artifact" }) }),
      expect.objectContaining({ id: "event-3", portal: { id: "portal-2", name: "Contractor" } }),
    ]));
    const eventQuery = queries.find((query) => query.sql.includes("FROM project_commitment_events event"));
    expect(eventQuery?.sql).not.toContain("event.origin_portal_id = ?");
    expect(eventQuery?.values).not.toContain("portal-1");
    expect(eventQuery?.values).not.toContain("portal-2");
    const currentStateQueries = queries.filter((query) => query.sql.includes("SELECT count(*) AS total FROM project_change_requests") || query.sql.includes("FROM client_portal_threads"));
    expect(currentStateQueries.every((query) => query.values.includes("portal-1"))).toBe(true);
  });

  it("applies a portal filter only when explicitly selected", async () => {
    const { db, queries } = database();
    const result = await readProjectTimelinePage({ database: db, filters: { portalId: "portal-1" }, projectId: "project-1" });

    expect(result.context).toMatchObject({
      activeBaseline: { baselineNumber: 1, issueNumber: 1 },
      currentIssue: { issueNumber: 2, status: "under_review" },
      selectedPortalId: "portal-1",
    });
    expect(result.events).toHaveLength(1);
    expect(result.events[0]).toMatchObject({
      exposure: { count: 1, statuses: ["visible"] },
      href: "/workshop/projects/project-1/client-portals?portal=portal-1",
      rootRequest: { code: "CR-004", title: "Revise millwork" },
    });
    const eventQuery = queries.find((query) => query.sql.includes("FROM project_commitment_events event"));
    expect(eventQuery?.values).toContain("portal-1");
  });

  it("rejects malformed cursors before querying events", async () => {
    const { db } = database();
    await expect(readProjectTimelinePage({ cursor: "not-a-cursor", database: db, projectId: "project-1" })).rejects.toThrow("cursor is invalid");
  });
});
