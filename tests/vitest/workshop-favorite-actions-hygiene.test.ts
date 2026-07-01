import { beforeEach, describe, expect, it, vi } from "vitest";

const PROJECT_ID = "22222222-2222-4222-8222-222222222222";
const ESTIMATE_ID = "33333333-3333-4333-8333-333333333333";
const WORKSPACE_ID = "ws-1";
const USER_ID = "11111111-1111-4111-8111-111111111111";

const mocks = vi.hoisted(() => ({
  ensureDefaultWorkspace: vi.fn(),
  getCloudflareD1Database: vi.fn(),
  revalidatePath: vi.fn(),
  requireAuth: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({ requireAuth: mocks.requireAuth }));
vi.mock("@/lib/repositories/workspace-repository", () => ({ ensureDefaultWorkspace: mocks.ensureDefaultWorkspace }));
vi.mock("@/lib/cloudflare/d1", () => ({ getCloudflareD1Database: mocks.getCloudflareD1Database }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

type PreparedD1Statement = {
  sql: string;
  values: unknown[];
};

class FakeD1Statement {
  private values: unknown[] = [];

  constructor(
    private readonly database: FakeD1Database,
    private readonly sql: string,
  ) {}

  bind(...values: unknown[]) {
    this.values = values;
    this.database.prepared.push({ sql: this.sql, values });
    return this;
  }

  async first() {
    return this.database.firstRows.shift() ?? null;
  }

  async run() {
    this.database.runStatements.push({ sql: this.sql, values: this.values });
    return { success: true };
  }
}

class FakeD1Database {
  firstRows: unknown[] = [];
  prepared: PreparedD1Statement[] = [];
  runStatements: PreparedD1Statement[] = [];

  prepare(sql: string) {
    return new FakeD1Statement(this, sql);
  }
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.ensureDefaultWorkspace.mockResolvedValue({ workspace: { id: WORKSPACE_ID }, profile: { id: USER_ID } });
  mocks.requireAuth.mockResolvedValue(undefined);
});

describe("favorite actions boolean hygiene", () => {
  it("setProjectFavorite rejects a non-boolean favorite before touching D1", async () => {
    const { setProjectFavorite } = await import("@/lib/workshop/actions");

    // @ts-expect-error simulates a raw POST payload that bypasses the TS type.
    await expect(setProjectFavorite({ projectId: PROJECT_ID, favorite: "true" })).rejects.toThrow(/invalid input/i);

    expect(mocks.ensureDefaultWorkspace).not.toHaveBeenCalled();
    expect(mocks.getCloudflareD1Database).not.toHaveBeenCalled();
  });

  it("setEstimateFavorite rejects a non-boolean favorite before touching D1", async () => {
    const { setEstimateFavorite } = await import("@/lib/workshop/actions");

    // @ts-expect-error simulates a raw POST payload that bypasses the TS type.
    await expect(setEstimateFavorite({ estimateId: ESTIMATE_ID, favorite: 1 })).rejects.toThrow(/invalid input/i);

    expect(mocks.ensureDefaultWorkspace).not.toHaveBeenCalled();
    expect(mocks.getCloudflareD1Database).not.toHaveBeenCalled();
  });
});

describe("favorite actions D1 writes", () => {
  it("scopes project unfavorite deletes by workspace_id, user_id, and project_id", async () => {
    const database = new FakeD1Database();
    mocks.getCloudflareD1Database.mockResolvedValue(database);

    const { setProjectFavorite } = await import("@/lib/workshop/actions");
    await setProjectFavorite({ projectId: PROJECT_ID, favorite: false });

    expect(database.runStatements[0]?.sql).toContain("DELETE FROM project_favorites");
    expect(database.runStatements[0]?.values).toEqual([WORKSPACE_ID, USER_ID, PROJECT_ID]);
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/workshop");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/workshop/projects");
  });

  it("validates project workspace membership before inserting a project favorite", async () => {
    const database = new FakeD1Database();
    database.firstRows = [{ id: PROJECT_ID, workspace_id: WORKSPACE_ID }];
    mocks.getCloudflareD1Database.mockResolvedValue(database);

    const { setProjectFavorite } = await import("@/lib/workshop/actions");
    await setProjectFavorite({ projectId: PROJECT_ID, favorite: true });

    expect(database.prepared[0]?.sql).toContain("FROM projects");
    expect(database.prepared[0]?.values).toEqual([PROJECT_ID, WORKSPACE_ID]);
    expect(database.runStatements[0]?.sql).toContain("INSERT INTO project_favorites");
    expect(database.runStatements[0]?.sql).toContain("ON CONFLICT(user_id, project_id) DO NOTHING");
    expect(database.runStatements[0]?.values).toEqual([
      expect.any(String),
      WORKSPACE_ID,
      USER_ID,
      PROJECT_ID,
      expect.any(String),
    ]);
  });

  it("validates estimate workspace membership before inserting an estimate favorite", async () => {
    const database = new FakeD1Database();
    database.firstRows = [{ id: ESTIMATE_ID, project_id: PROJECT_ID }];
    mocks.getCloudflareD1Database.mockResolvedValue(database);

    const { setEstimateFavorite } = await import("@/lib/workshop/actions");
    await setEstimateFavorite({ estimateId: ESTIMATE_ID, favorite: true });

    expect(database.prepared[0]?.sql).toContain("FROM estimates estimate");
    expect(database.prepared[0]?.sql).toContain("JOIN projects project");
    expect(database.prepared[0]?.values).toEqual([ESTIMATE_ID, WORKSPACE_ID]);
    expect(database.runStatements[0]?.sql).toContain("INSERT INTO estimate_favorites");
    expect(database.runStatements[0]?.sql).toContain("ON CONFLICT(user_id, estimate_id) DO NOTHING");
    expect(database.runStatements[0]?.values).toEqual([
      expect.any(String),
      WORKSPACE_ID,
      USER_ID,
      PROJECT_ID,
      ESTIMATE_ID,
      expect.any(String),
    ]);
    expect(mocks.revalidatePath).toHaveBeenCalledWith(`/workshop/projects/${PROJECT_ID}/estimates`);
  });

  it("scopes estimate unfavorite deletes by workspace_id, user_id, and estimate_id", async () => {
    const database = new FakeD1Database();
    database.firstRows = [{ id: ESTIMATE_ID, project_id: PROJECT_ID }];
    mocks.getCloudflareD1Database.mockResolvedValue(database);

    const { setEstimateFavorite } = await import("@/lib/workshop/actions");
    await setEstimateFavorite({ estimateId: ESTIMATE_ID, favorite: false });

    expect(database.runStatements[0]?.sql).toContain("DELETE FROM estimate_favorites");
    expect(database.runStatements[0]?.values).toEqual([WORKSPACE_ID, USER_ID, ESTIMATE_ID]);
  });
});
