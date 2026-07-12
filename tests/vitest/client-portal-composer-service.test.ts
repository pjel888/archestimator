import { describe, expect, it } from "vitest";

import type { D1DatabaseLike, D1PreparedStatementLike, D1Result, D1Value } from "@/lib/cloudflare/d1";
import { createClientPortalDraft, evaluateClientPortalReadiness } from "@/lib/client-portal/composer-service";

const manager = {
  kind: "internal" as const,
  portalGrants: ["manager"] as const,
  projectId: "project_1",
  projectRole: "viewer" as const,
  userId: "owner_1",
  workspaceId: "workspace_1",
};

function databaseForComposer(options: { sections?: unknown[] } = {}) {
  const statements: Array<{ sql: string; values: D1Value[] }> = [];
  const database: D1DatabaseLike = {
    prepare(sql: string): D1PreparedStatementLike {
      let values: D1Value[] = [];
      const statement: D1PreparedStatementLike = {
        bind(...nextValues) { values = nextValues; statements.push({ sql, values }); return statement; },
        async first<T>() {
          if (sql.includes("FROM client_portals")) return { id: "portal_1", name: "Client portal", project_id: "project_1", status: "draft", workspace_id: "workspace_1" } as T;
          if (sql.includes("COUNT(*) AS count")) return { count: 0 } as T;
          return null as T | null;
        },
        async all<T>() {
          if (sql.includes("FROM client_portal_sections")) return { results: (options.sections ?? []) as T[], success: true } as D1Result<T>;
          return { results: [], success: true } as D1Result<T>;
        },
        async run<T>() { return { success: true } as D1Result<T>; },
      };
      return statement;
    },
  };
  return { database, statements };
}

describe("client portal composer service", () => {
  it("creates a manager-owned draft without persisting its raw stable token", async () => {
    const { database, statements } = databaseForComposer();

    const created = await createClientPortalDraft({ actor: manager, database, name: "Makati Tower", projectId: "project_1" });

    const insert = statements.find((statement) => statement.sql.includes("INSERT INTO client_portals"));
    expect(created.portalId).toMatch(/^portal_/);
    expect(created.publicPath).toMatch(/^\/share\/[A-Za-z0-9_-]+$/);
    expect(insert?.values).toEqual(expect.arrayContaining([expect.stringMatching(/^hmac-sha256-v1:/), expect.stringMatching(/^aes-256-gcm-v1:/)]));
    expect(JSON.stringify(insert?.values)).not.toContain(created.publicPath.slice("/share/".length));
  });

  it("rejects portal creation outside the actor project boundary", async () => {
    const { database, statements } = databaseForComposer();

    await expect(createClientPortalDraft({ actor: manager, database, name: "Forbidden", projectId: "project_2" })).rejects.toThrow("cannot configure");
    expect(statements).toHaveLength(0);
  });

  it("blocks publishing until Estimate Browser sources are selected", async () => {
    const { database } = databaseForComposer({
      sections: [{ config_json: "{}", enabled: 1, id: "section_1", kind: "estimate_browser", title: "Estimate" }],
    });

    const readiness = await evaluateClientPortalReadiness({ actor: manager, database, portalId: "portal_1" });

    expect(readiness).toEqual({
      blockers: ["Choose estimate sources for each Estimate Browser section before publishing."],
      ready: false,
      warnings: [
        "No external recipients are ready to receive this Client Portal.",
      ],
    });
  });
});
