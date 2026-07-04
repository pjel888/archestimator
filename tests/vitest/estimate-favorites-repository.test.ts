import { beforeEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  requireCurrentUserContext: vi.fn(),
}));

const d1Mocks = vi.hoisted(() => ({
  getCloudflareD1Database: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => authMocks);
vi.mock("@/lib/cloudflare/d1", () => d1Mocks);

class FakeD1Statement {
  values: unknown[] = [];

  constructor(
    private readonly database: FakeD1Database,
    readonly sql: string,
  ) {}

  bind(...values: unknown[]) {
    this.values = values;
    this.database.statement = this;
    return this;
  }

  async all() {
    return { results: this.database.rows };
  }
}

class FakeD1Database {
  statement: FakeD1Statement | null = null;
  rows: unknown[] = [];

  prepare(sql: string) {
    return new FakeD1Statement(this, sql);
  }
}

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  authMocks.requireCurrentUserContext.mockResolvedValue({ userId: "user-1" });
});

describe("estimate favorites repository", () => {
  it("returns current-user estimate favorite timestamps from Cloudflare D1", async () => {
    const database = new FakeD1Database();
    database.rows = [
      { estimate_id: "estimate-1", created_at: "2026-06-01T00:00:00.000Z" },
      { estimate_id: "estimate-2", created_at: "2026-06-02T00:00:00.000Z" },
    ];
    d1Mocks.getCloudflareD1Database.mockResolvedValue(database);

    const { listCurrentUserEstimateFavoriteCreatedAtById } = await import(
      "@/lib/repositories/estimate-favorites-repository"
    );
    const result = await listCurrentUserEstimateFavoriteCreatedAtById(["estimate-1", "estimate-2", "estimate-1"]);

    expect(database.statement?.sql).toContain("FROM estimate_favorites");
    expect(database.statement?.sql).not.toContain("workspace_id = ?");
    expect(database.statement?.sql).toContain("user_id = ?");
    expect(database.statement?.sql).toContain("estimate_id IN (?, ?)");
    expect(database.statement?.values).toEqual(["user-1", "estimate-1", "estimate-2"]);
    expect(result).toEqual(
      new Map([
        ["estimate-1", "2026-06-01T00:00:00.000Z"],
        ["estimate-2", "2026-06-02T00:00:00.000Z"],
      ]),
    );
  });

  it("does not open workspace or D1 when no estimate ids are requested", async () => {
    const { listCurrentUserEstimateFavoriteCreatedAtById } = await import(
      "@/lib/repositories/estimate-favorites-repository"
    );
    await expect(listCurrentUserEstimateFavoriteCreatedAtById([])).resolves.toEqual(new Map());

    expect(authMocks.requireCurrentUserContext).not.toHaveBeenCalled();
    expect(d1Mocks.getCloudflareD1Database).not.toHaveBeenCalled();
  });
});
