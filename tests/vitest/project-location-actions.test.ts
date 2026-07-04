import { beforeEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  requireCurrentUserContext: vi.fn(),
}));

const workspaceRepositoryMocks = vi.hoisted(() => ({
  getCurrentWorkspaceProject: vi.fn(),
}));

const cloudflareD1Mocks = vi.hoisted(() => ({
  getCloudflareD1Database: vi.fn(),
}));

const nextCacheMocks = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => authMocks);
vi.mock("@/lib/repositories/workspace-repository", () => workspaceRepositoryMocks);
vi.mock("@/lib/cloudflare/d1", () => cloudflareD1Mocks);
vi.mock("next/cache", () => nextCacheMocks);

function formData(fields: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

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
    if (this.sql.includes("SELECT 1 AS allowed")) return this.database.canEdit ? { allowed: 1 } : null;
    return null;
  }

  async all() {
    return { results: [] };
  }

  async run() {
    return { success: true, meta: { changes: 1 } };
  }
}

class FakeD1Database {
  prepared: PreparedD1Statement[] = [];

  constructor(readonly canEdit = true) {}

  prepare(sql: string) {
    return new FakeD1Statement(this, sql);
  }
}

function findPrepared(database: FakeD1Database, pattern: RegExp) {
  const statement = database.prepared.find((entry) => pattern.test(entry.sql));
  if (!statement) throw new Error(`No prepared D1 statement matched ${pattern}`);
  return statement;
}

describe("project location actions", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    authMocks.requireAuth.mockResolvedValue(undefined);
    authMocks.requireCurrentUserContext.mockResolvedValue({ userId: "user-1", email: "owner@example.test", role: "member" });
    workspaceRepositoryMocks.getCurrentWorkspaceProject.mockResolvedValue({
      project: { id: "project-1", workspace_id: "workspace-1" },
    });
  });

  it("rejects invalid latitude and longitude before creating a D1 write", async () => {
    const database = new FakeD1Database();
    cloudflareD1Mocks.getCloudflareD1Database.mockResolvedValue(database);

    const { saveProjectLocation } = await import("@/lib/projects/location-actions");
    const result = await saveProjectLocation({ status: "idle", message: "" }, formData({
      projectId: "project-1",
      latitude: "91",
      longitude: "181",
    }));

    expect(result.status).toBe("error");
    expect(result.fieldErrors?.latitude).toContain("between -90 and 90");
    expect(authMocks.requireCurrentUserContext).not.toHaveBeenCalled();
    expect(database.prepared).toEqual([]);
    expect(nextCacheMocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("saves and reloads a valid manual pin through project_locations", async () => {
    const database = new FakeD1Database();
    cloudflareD1Mocks.getCloudflareD1Database.mockResolvedValue(database);

    const { saveProjectLocation } = await import("@/lib/projects/location-actions");
    const result = await saveProjectLocation({ status: "idle", message: "" }, formData({
      projectId: "project-1",
      latitude: "14.5995122",
      longitude: "120.9842224",
      accuracyMeters: "8.249",
      displayLabel: "Site gate",
      addressText: "Quezon City",
    }));

    expect(findPrepared(database, /SELECT 1 AS allowed/).values).toEqual(["project-1", "user-1", "user-1", "user-1"]);
    const upsert = findPrepared(database, /INSERT INTO project_locations/);
    expect(upsert.sql).toContain("ON CONFLICT(project_id) DO UPDATE");
    expect(upsert.values.slice(1, 11)).toEqual([
      "project-1",
      "workspace-1",
      14.599512,
      120.984222,
      8.25,
      "manual",
      "Site gate",
      "Quezon City",
      null,
      null,
    ]);
    expect(result).toEqual({ status: "success", message: "Project pin saved." });
    expect(nextCacheMocks.revalidatePath).toHaveBeenCalledWith("/workshop/projects/project-1");
  });

  it("saves a shared project pin using the target project workspace instead of the user's default workspace", async () => {
    authMocks.requireCurrentUserContext.mockResolvedValue({
      userId: "user-1",
      email: "editor@example.test",
      role: "member",
      profile: { default_workspace_id: "workspace-default" },
    });
    workspaceRepositoryMocks.getCurrentWorkspaceProject.mockResolvedValueOnce({
      project: { id: "shared-project", workspace_id: "workspace-shared" },
    });
    const database = new FakeD1Database();
    cloudflareD1Mocks.getCloudflareD1Database.mockResolvedValue(database);

    const { saveProjectLocation } = await import("@/lib/projects/location-actions");
    const result = await saveProjectLocation({ status: "idle", message: "" }, formData({
      projectId: "shared-project",
      latitude: "14.5995122",
      longitude: "120.9842224",
      displayLabel: "Shared site",
    }));

    expect(findPrepared(database, /SELECT 1 AS allowed/).values).toEqual(["shared-project", "user-1", "user-1", "user-1"]);
    const upsert = findPrepared(database, /INSERT INTO project_locations/);
    expect(upsert.values.slice(1, 3)).toEqual(["shared-project", "workspace-shared"]);
    expect(result).toEqual({ status: "success", message: "Project pin saved." });
    expect(nextCacheMocks.revalidatePath).toHaveBeenCalledWith("/workshop/projects/shared-project");
  });

  it("denies saving a project pin without edit access and skips writes and revalidation", async () => {
    const database = new FakeD1Database(false);
    cloudflareD1Mocks.getCloudflareD1Database.mockResolvedValue(database);

    const { saveProjectLocation } = await import("@/lib/projects/location-actions");
    const result = await saveProjectLocation({ status: "idle", message: "" }, formData({
      projectId: "project-1",
      latitude: "14.5995122",
      longitude: "120.9842224",
      displayLabel: "Denied site",
    }));

    expect(result).toEqual({
      status: "error",
      message: "You do not have permission to edit this project location.",
      fieldErrors: undefined,
    });
    expect(findPrepared(database, /SELECT 1 AS allowed/).values).toEqual(["project-1", "user-1", "user-1", "user-1"]);
    expect(database.prepared.some((entry) => /INSERT INTO project_locations/.test(entry.sql))).toBe(false);
    expect(database.prepared.some((entry) => /UPDATE projects/.test(entry.sql))).toBe(false);
    expect(nextCacheMocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("saves a Google place selection and syncs the formatted address back to the project", async () => {
    const database = new FakeD1Database();
    cloudflareD1Mocks.getCloudflareD1Database.mockResolvedValue(database);

    const { saveProjectLocation } = await import("@/lib/projects/location-actions");
    const result = await saveProjectLocation({ status: "idle", message: "" }, formData({
      projectId: "project-1",
      latitude: "14.676",
      longitude: "121.0437",
      displayLabel: "Quezon City",
      addressText: "Quezon City, Metro Manila, Philippines",
      source: "geocoded",
      geocoderName: "google",
      providerPlaceId: "google-place-1",
      syncProjectAddress: "1",
    }));

    const upsert = findPrepared(database, /INSERT INTO project_locations/);
    expect(upsert.values.slice(1, 11)).toEqual([
      "project-1",
      "workspace-1",
      14.676,
      121.0437,
      null,
      "geocoded",
      "Quezon City",
      "Quezon City, Metro Manila, Philippines",
      "google",
      "google-place-1",
    ]);
    expect(findPrepared(database, /UPDATE projects/).values).toEqual([
      "Quezon City, Metro Manila, Philippines",
      expect.any(String),
      "project-1",
    ]);
    expect(result).toEqual({ status: "success", message: "Project pin saved." });
  });

  it("clears a saved manual pin by project id", async () => {
    const database = new FakeD1Database();
    cloudflareD1Mocks.getCloudflareD1Database.mockResolvedValue(database);

    const { clearProjectLocation } = await import("@/lib/projects/location-actions");
    const result = await clearProjectLocation({ status: "idle", message: "" }, formData({ projectId: "project-1" }));

    expect(findPrepared(database, /DELETE FROM project_locations/).values).toEqual(["project-1"]);
    expect(result).toEqual({ status: "success", message: "Project pin cleared." });
    expect(nextCacheMocks.revalidatePath).toHaveBeenCalledWith("/workshop/projects/project-1");
  });

  it("denies clearing a project pin without edit access and skips writes and revalidation", async () => {
    const database = new FakeD1Database(false);
    cloudflareD1Mocks.getCloudflareD1Database.mockResolvedValue(database);

    const { clearProjectLocation } = await import("@/lib/projects/location-actions");
    const result = await clearProjectLocation({ status: "idle", message: "" }, formData({ projectId: "project-1" }));

    expect(result).toEqual({
      status: "error",
      message: "You do not have permission to edit this project location.",
    });
    expect(findPrepared(database, /SELECT 1 AS allowed/).values).toEqual(["project-1", "user-1", "user-1", "user-1"]);
    expect(database.prepared.some((entry) => /DELETE FROM project_locations/.test(entry.sql))).toBe(false);
    expect(nextCacheMocks.revalidatePath).not.toHaveBeenCalled();
  });
});
