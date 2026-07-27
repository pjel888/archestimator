import { describe, expect, it } from "vitest";

import type { D1DatabaseLike, D1PreparedStatementLike, D1Result, D1Value } from "@/lib/cloudflare/d1";
import { readProjectTimelinePage } from "@/lib/project-ledger/timeline-repository";

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
            return { success: true, results: [{
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
            }] as T[] } as D1Result<T>;
          }
          return { success: true, results: [] as T[] } as D1Result<T>;
        },
        async first<T>() {
          if (sql.includes("FROM client_portal_baselines")) return { baseline_number: 1, total_minor_units: 125_000, currency_code: "PHP", established_at: "2026-07-26T00:00:00.000Z", issue_number: 1, version_label: "Issue 1" } as T;
          if (sql.includes("FROM client_portal_issues issue")) return { issue_number: 2, version_label: "Issue 2", status: "under_review", issued_at: "2026-07-27T01:00:00.000Z", total_cost: 1400, currency_code: "PHP" } as T;
          if (sql.includes("FROM project_commitment_events")) return { total: 1 } as T;
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
  it("returns selected portal state, root-request grouping, and exposure badges", async () => {
    const { db, queries } = database();
    const result = await readProjectTimelinePage({ database: db, projectId: "project-1" });

    expect(result.context).toMatchObject({
      activeBaseline: { baselineNumber: 1, issueNumber: 1 },
      counts: { activeFiles: 3, openRequests: 2, totalEvents: 1, waitingDiscussions: 4 },
      currentIssue: { issueNumber: 2, status: "under_review" },
      selectedPortalId: "portal-1",
    });
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
