import { describe, expect, it } from "vitest";

import type { D1DatabaseLike, D1PreparedStatementLike, D1Result, D1Value } from "@/lib/cloudflare/d1";
import { listClientPortalsForProject, loadClientPortalControlCenter } from "@/lib/client-portal/control-center-service";

const manager = {
  kind: "internal" as const,
  portalGrants: ["manager"] as const,
  projectId: "project_1",
  projectRole: "viewer" as const,
  userId: "owner_1",
  workspaceId: "workspace_1",
};

function databaseWithRoster() {
  const statements: Array<{ sql: string; values: D1Value[] }> = [];
  const database: D1DatabaseLike = {
    prepare(sql: string): D1PreparedStatementLike {
      let values: D1Value[] = [];
      const statement: D1PreparedStatementLike = {
        bind(...nextValues) { values = nextValues; statements.push({ sql, values }); return statement; },
        async first<T>() { return null as T | null; },
        async all<T>() {
          const rows = Array.from({ length: 21 }, (_, index) => ({
            current_issue_number: index + 1,
            current_issue_status: "issued",
            id: `portal_${String(99 - index).padStart(2, "0")}`,
            name: `Portal ${index + 1}`,
            recipient_count: 1,
            status: "live",
            waiting_thread_count: 0,
          }));
          return { results: rows as T[], success: true } as D1Result<T>;
        },
        async run<T>() { return { success: true } as D1Result<T>; },
      };
      return statement;
    },
  };
  return { database, statements };
}

function databaseWithContentSource() {
  const statements: Array<{ sql: string; values: D1Value[] }> = [];
  const database: D1DatabaseLike = {
    prepare(sql: string): D1PreparedStatementLike {
      let values: D1Value[] = [];
      const statement: D1PreparedStatementLike = {
        bind(...nextValues) { values = nextValues; statements.push({ sql, values }); return statement; },
        async first<T>() {
          if (sql.includes("MAX(e.updated_at)")) return { source_updated_at: "2026-07-12T10:00:00.000Z" } as T;
          if (sql.includes("FROM client_portals")) return { access_policy_json: "{}", current_issue_id: null, id: "portal_1", name: "Client portal", project_id: "project_1", status: "draft", workspace_id: "workspace_1" } as T;
          return null as T | null;
        },
        async all<T>() {
          if (sql.includes("FROM client_portal_sections")) return { results: [{ enabled: 1, id: "section_1", kind: "estimate_browser", section_key: "estimate", title: "Estimate", updated_at: "2026-07-11T10:00:00.000Z" }] as T[], success: true } as D1Result<T>;
          return { results: [], success: true } as D1Result<T>;
        },
        async run<T>() { return { success: true } as D1Result<T>; },
      };
      return statement;
    },
  };
  return { database, statements };
}

describe("client portal control-center roster", () => {
  it("uses project, status, and cursor values in one bounded D1 roster query", async () => {
    const { database, statements } = databaseWithRoster();

    const result = await listClientPortalsForProject({ actor: manager, cursor: "portal_50", database, projectId: "project_1", status: "live" });

    expect(result.rows).toHaveLength(20);
    expect(result.nextCursor).toBe("portal_80");
    expect(statements).toHaveLength(1);
    expect(statements[0]?.sql).toContain("WHERE p.project_id = ?");
    expect(statements[0]?.sql).toContain("AND p.status = ?");
    expect(statements[0]?.sql).toContain("LIMIT 21");
    expect(statements[0]?.values).toEqual(["project_1", "live", "portal_50", "portal_50"]);
  });

  it("rejects a portal roster request outside the actor project scope", async () => {
    const { database } = databaseWithRoster();

    await expect(listClientPortalsForProject({ actor: manager, database, projectId: "project_2" })).rejects.toThrow("cannot view Client Portals");
  });

  it("loads only content and selected-estimate freshness for the Content tab", async () => {
    const { database, statements } = databaseWithContentSource();

    const result = await loadClientPortalControlCenter({ actor: manager, database, portalId: "portal_1", tab: "content" });

    expect(result.sections).toHaveLength(1);
    expect(result.sourceFreshness).toBe("2026-07-12T10:00:00.000Z");
    expect(statements.some((statement) => statement.sql.includes("json_each(s.config_json"))).toBe(true);
    expect(statements.some((statement) => statement.sql.includes("client_portal_recipients"))).toBe(false);
    expect(statements.some((statement) => statement.sql.includes("client_portal_threads"))).toBe(false);
    expect(statements.some((statement) => statement.sql.includes("client_portal_decisions"))).toBe(false);
    expect(statements.some((statement) => statement.sql.includes("client_portal_audit_events"))).toBe(false);
  });
});
