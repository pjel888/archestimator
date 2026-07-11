import { readFileSync } from "node:fs";

import { beforeEach, describe, expect, it, vi } from "vitest";

const d1Mocks = vi.hoisted(() => ({
  getCloudflareD1Database: vi.fn(),
}));

vi.mock("@/lib/cloudflare/d1", () => d1Mocks);
vi.mock("@/lib/observability/logger", () => ({
  emitLogRecord: vi.fn(),
}));

class FakeStatement {
  values: unknown[] = [];

  constructor(
    readonly sql: string,
    private readonly results: unknown[],
  ) {}

  bind(...values: unknown[]) {
    this.values = values;
    return this;
  }

  async all() {
    return { results: this.results };
  }

  async first() {
    return null;
  }

  async run() {
    return { meta: { changes: 0 } };
  }
}

class FakeDatabase {
  statements: FakeStatement[] = [];

  constructor(private readonly resultSets: unknown[][]) {}

  prepare(sql: string) {
    const statement = new FakeStatement(sql, this.resultSets[this.statements.length] ?? []);
    this.statements.push(statement);
    return statement;
  }
}

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

describe("corporate account team leader read-only view", () => {
  it("reads organization data through owner/team-leader scoped queries", async () => {
    const database = new FakeDatabase([
      [{
        id: "account-1",
        name: "Acme",
        description: "Estimating group",
        status: "active",
        created_by: "owner-1",
        created_at: "2026-07-11T00:00:00.000Z",
        updated_at: "2026-07-11T00:00:00.000Z",
        member_role: "team_leader",
      }],
      [{
        corporate_account_id: "account-1",
        user_id: "leader-1",
        email: "leader@example.test",
        display_name: "Leader",
        avatar_url: null,
        role: "team_leader",
        job_title: null,
        created_at: "2026-07-11T00:00:00.000Z",
      }],
      [{
        corporate_account_id: "account-1",
        id: "workspace-1",
        name: "Acme Estimating",
        slug: "acme-estimating",
        created_by: "owner-1",
        created_at: "2026-07-11T00:00:00.000Z",
      }],
    ]);
    d1Mocks.getCloudflareD1Database.mockResolvedValue(database);

    const { listCorporateAccountReadOnlyViewsForMember } = await import("@/lib/admin/corporate-account-repository");
    await expect(listCorporateAccountReadOnlyViewsForMember("leader-1")).resolves.toEqual({
      data: [{
        account: {
          id: "account-1",
          name: "Acme",
          description: "Estimating group",
          status: "active",
          created_by: "owner-1",
          created_at: "2026-07-11T00:00:00.000Z",
          updated_at: "2026-07-11T00:00:00.000Z",
        },
        memberRole: "team_leader",
        members: [{
          user_id: "leader-1",
          email: "leader@example.test",
          display_name: "Leader",
          avatar_url: null,
          role: "team_leader",
          job_title: null,
          created_at: "2026-07-11T00:00:00.000Z",
        }],
        workspaces: [{
          id: "workspace-1",
          name: "Acme Estimating",
          slug: "acme-estimating",
          created_by: "owner-1",
          created_at: "2026-07-11T00:00:00.000Z",
        }],
      }],
      error: null,
    });

    expect(database.statements).toHaveLength(3);
    for (const statement of database.statements) {
      expect(statement.sql).toContain("IN ('owner', 'team_leader')");
      expect(statement.sql).toContain("a.status != 'archived'");
      expect(statement.values).toEqual(["leader-1"]);
    }
  });

  it("keeps the route read-only and reachable through workshop settings", () => {
    const route = readFileSync("src/app/workshop/settings/organization/page.tsx", "utf8");
    const settings = readFileSync("src/components/workshop/WorkshopSettingsModalContentView.tsx", "utf8");

    expect(route).toContain("requireCurrentUserContext");
    expect(route).toContain("listCorporateAccountReadOnlyViewsForMember");
    expect(route).not.toContain("corporate-account-actions");
    expect(settings).toContain('href: "/workshop/settings/organization"');
  });
});
