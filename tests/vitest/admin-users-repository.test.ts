import { beforeEach, describe, expect, it, vi } from "vitest";

const d1Mocks = vi.hoisted(() => ({
  getCloudflareD1Database: vi.fn(),
}));

const loggerMocks = vi.hoisted(() => ({
  emitLogRecord: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/cloudflare/d1", () => d1Mocks);
vi.mock("@/lib/observability/logger", () => loggerMocks);

class UsersStatement {
  private values: unknown[] = [];

  constructor(
    private readonly database: UsersDatabase,
    private readonly sql: string,
  ) {}

  bind(...values: unknown[]) {
    this.values = values;
    this.database.bound.push({ sql: this.sql, values });
    return this;
  }

  async first() {
    if (this.sql.includes("COUNT(*) AS signups")) return { signups: 2 };
    return { count: 1 };
  }

  async all() {
    return {
      results: [
        {
          id: "user-1",
          email: "admin@example.com",
          display_name: "Admin User",
          role: "admin",
          default_workspace_id: "workspace-1",
          avatar_url: null,
          created_at: "2026-07-10T05:00:00.000Z",
          updated_at: "2026-07-10T05:00:00.000Z",
          active_session_count: 1,
          last_session_at: "2026-07-10T05:10:00.000Z",
        },
      ],
    };
  }
}

class UsersDatabase {
  bound: { sql: string; values: unknown[] }[] = [];
  prepared: string[] = [];

  prepare(sql: string) {
    this.prepared.push(sql);
    return new UsersStatement(this, sql);
  }
}

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

describe("admin users repository", () => {
  it("lists profile users with active Better Auth session aggregates", async () => {
    const database = new UsersDatabase();
    d1Mocks.getCloudflareD1Database.mockResolvedValue(database);

    const { listAdminUsers } = await import("@/lib/admin/users-repository");
    const result = await listAdminUsers({ search: "Admin", page: 2, limit: 20 });

    expect(result.error).toBeNull();
    expect(result.count).toBe(1);
    expect(result.data[0]).toMatchObject({
      active_session_count: 1,
      email: "admin@example.com",
      last_session_at: "2026-07-10T05:10:00.000Z",
    });
    const usersSql = database.prepared.find((sql) => sql.includes("LEFT JOIN"));
    expect(usersSql).toContain('FROM "session"');
    expect(usersSql).toContain('"userId" AS user_id');
    expect(usersSql).toContain('"expiresAt" > ?');
    expect(usersSql).toContain('MAX("updatedAt") AS last_session_at');
    expect(database.bound.at(-1)?.values.slice(1)).toEqual(["%admin%", "%admin%", 20, 20]);
  });

  it("counts signups from profiles within the requested window", async () => {
    const database = new UsersDatabase();
    d1Mocks.getCloudflareD1Database.mockResolvedValue(database);

    const { countSignups } = await import("@/lib/admin/users-repository");
    const result = await countSignups(7);

    expect(result).toEqual({ data: 2, error: null });
    expect(database.bound[0]?.sql).toContain("FROM profiles");
    expect(database.bound[0]?.sql).toContain("created_at >= ?");
    expect(database.bound[0]?.values[0]).toEqual(expect.stringContaining("T"));
  });

  it("returns QueryResult-style errors when D1 is unavailable", async () => {
    d1Mocks.getCloudflareD1Database.mockResolvedValue(null);

    const { listAdminUsers } = await import("@/lib/admin/users-repository");
    const result = await listAdminUsers({ page: 1, limit: 10 });

    expect(result).toEqual({
      data: [],
      error: "Cloudflare D1 is not available.",
      count: 0,
    });
  });
});
