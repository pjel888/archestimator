import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  database: null as FakeD1Database | null,
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/cloudflare/d1", () => ({
  getCloudflareD1Database: vi.fn(async () => mocks.database),
}));

type Query = { sql: string; values: unknown[] };

class FakeD1Database {
  direct = false;
  mapped = true;
  queries: Query[] = [];

  prepare = (sql: string) => {
    let values: unknown[] = [];
    const statement = {
      bind: (...nextValues: unknown[]) => {
        values = nextValues;
        this.queries.push({ sql, values });
        return statement;
      },
      first: async <T,>() => {
        if (sql.includes("FROM client_portals WHERE stable_token_hash")) {
          return this.direct ? {
            access_credential_version: 1,
            access_policy_json: '{"allowAnonymousView":true}',
            current_issue_id: null,
            id: "portal_direct",
            name: "Direct Portal",
            password_hash: null,
            project_id: "project_1",
            status: "live",
            workspace_id: "workspace_1",
          } as T : null as T | null;
        }
        if (sql.includes("FROM project_publications AS legacy")) {
          return this.mapped
            ? {
                access_credential_version: 1,
                access_policy_json: '{"allowAnonymousView":true}',
                current_issue_id: "issue_current",
                id: "portal_1",
                legacy_password_hash: null,
                mapped_issue_id: "issue_legacy_2",
                name: "Makati Tower",
                password_hash: null,
                project_id: "project_1",
                status: "live",
                workspace_id: "workspace_1",
              } as T
            : null as T | null;
        }
        if (sql.includes("FROM client_portal_issues WHERE id = ?")) {
          if (values[0] === "") return null as T | null;
          return {
            brand_snapshot_json: "{}",
            content_hash: "a".repeat(64),
            currency_code: "USD",
            decision_policy_snapshot_json: "{}",
            id: "issue_legacy_2",
            issue_number: 2,
            issued_at: "2026-07-12T00:00:00.000Z",
            manifest_json: '{"project":{"name":"Makati Tower","code":"MK-100"}}',
            portal_id: "portal_1",
            status: "issued",
            total_cost: 100,
            valid_through: null,
            version_label: "Legacy issue 2",
          } as T;
        }
        return null as T | null;
      },
      all: async <T,>() => ({ results: [] as T[] }),
    };
    return statement;
  };
}

import { isClientPortalToken, resolveClientPortalBaseContext, resolveClientPortalPublicContext } from "@/lib/client-portal/public-repository";

const token = "a".repeat(43);

beforeEach(() => {
  mocks.database = new FakeD1Database();
});

describe("legacy Client Portal token resolution", () => {
  it("routes a verified legacy token to its mapped immutable issue", async () => {
    const context = await resolveClientPortalPublicContext(token, 99);

    expect(context).toMatchObject({ portal: { id: "portal_1" }, issue: { id: "issue_legacy_2", issue_number: 2 } });
    expect(mocks.database?.queries.some((query) =>
      query.sql.includes("mapping.migration_status IN ('verified', 'cutover_complete')")
      && query.sql.includes("portal.workspace_id = legacy.workspace_id")
      && query.sql.includes("portal.project_id = legacy.project_id")
      && query.sql.includes("issue.portal_id = portal.id")
    )).toBe(true);
    expect(mocks.database?.queries.some((query) =>
      query.sql.includes("FROM client_portal_issues WHERE id = ? AND portal_id = ?")
      && query.values[0] === "issue_legacy_2"
      && query.values[1] === "portal_1"
    )).toBe(true);
    expect(mocks.database?.queries.some((query) => query.sql.includes("FROM client_portals WHERE stable_token_hash"))).toBe(false);
    expect(await isClientPortalToken(token)).toBe(true);
  });

  it("does not resolve a legacy token without a verified mapping", async () => {
    if (!mocks.database) throw new Error("D1 mock missing");
    mocks.database.mapped = false;

    await expect(resolveClientPortalPublicContext(token)).resolves.toBeNull();
    await expect(isClientPortalToken(token)).resolves.toBe(false);
  });

  it("resolves a live portal base context before its first issue exists", async () => {
    if (!mocks.database) throw new Error("D1 mock missing");
    mocks.database.mapped = false;
    mocks.database.direct = true;

    await expect(resolveClientPortalBaseContext(token)).resolves.toMatchObject({
      mappedIssueId: null,
      portal: { current_issue_id: null, id: "portal_direct" },
    });
    await expect(resolveClientPortalPublicContext(token)).resolves.toBeNull();
  });
});
