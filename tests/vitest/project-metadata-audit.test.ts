import { beforeEach, describe, expect, it, vi } from "vitest";

const PROJECT_ID = "11111111-1111-4111-8111-111111111111";
const WORKSPACE_ID = "22222222-2222-4222-8222-222222222222";

const requireAuth = vi.hoisted(() => vi.fn());
const requireCurrentUserContext = vi.hoisted(() => vi.fn());
const getCloudflareD1Database = vi.hoisted(() => vi.fn());
const ensureDefaultWorkspace = vi.hoisted(() => vi.fn());
const recordProjectMetadataUpdatedEventInCloudflareD1 = vi.hoisted(() =>
  vi.fn(),
);

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({
  requireAuth,
  requireCurrentUserContext,
}));
vi.mock("@/lib/cloudflare/d1", () => ({ getCloudflareD1Database }));
vi.mock("@/lib/repositories/workspace-repository", () => ({
  ensureDefaultWorkspace,
}));
vi.mock("@/lib/projects/d1-audit", () => ({
  recordProjectMetadataUpdatedEventInCloudflareD1,
}));

import { updateProjectDetails } from "@/lib/projects/actions";

const EXISTING = {
  name: "Lewis Residence",
  client_name: "Old Client",
  location: "Quezon City",
  project_code: "AE-001",
  currency_code: "PHP",
  metadata: {},
};

class FakeD1Statement {
  values: unknown[] = [];

  constructor(
    private readonly database: FakeD1Database,
    readonly sql: string,
  ) {}

  bind(...values: unknown[]) {
    this.values = values;
    return this;
  }

  async first<T>() {
    this.database.firstStatements.push(this);
    if (
      this.sql.includes(
        "SELECT name, client_name, location, project_code, currency_code, metadata",
      )
    ) {
      return this.database.existing as T;
    }
    return null;
  }

  async all<T>() {
    return { results: [] as T[], success: true };
  }

  async run() {
    this.database.runStatements.push(this);
    return { success: true };
  }
}

class FakeD1Database {
  firstStatements: FakeD1Statement[] = [];
  runStatements: FakeD1Statement[] = [];

  constructor(readonly existing: Record<string, unknown> = EXISTING) {}

  prepare(sql: string) {
    return new FakeD1Statement(this, sql);
  }
}

function formData(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) fd.set(key, value);
  return fd;
}

const BASE_FORM = {
  projectId: PROJECT_ID,
  name: "Lewis Residence",
  location: "Quezon City",
  projectCode: "AE-001",
  currencyCode: "PHP",
};

describe("updateProjectDetails audit instrumentation (R11)", () => {
  beforeEach(() => {
    getCloudflareD1Database.mockReset();
    ensureDefaultWorkspace.mockReset();
    requireAuth.mockReset();
    requireAuth.mockResolvedValue(undefined);
    recordProjectMetadataUpdatedEventInCloudflareD1.mockReset();
    recordProjectMetadataUpdatedEventInCloudflareD1.mockResolvedValue(true);
    requireCurrentUserContext.mockResolvedValue({
      userId: "user-1",
      email: "a@b.co",
      role: "admin",
    });
    ensureDefaultWorkspace.mockResolvedValue({
      workspace: { id: WORKSPACE_ID },
      profile: { id: "user-1" },
    });
    getCloudflareD1Database.mockResolvedValue(new FakeD1Database());
  });

  it("writes one project_metadata_updated event naming the changed field", async () => {
    await updateProjectDetails(
      formData({ ...BASE_FORM, clientName: "New Client" }),
    );

    expect(
      recordProjectMetadataUpdatedEventInCloudflareD1,
    ).toHaveBeenCalledTimes(1);
    expect(
      recordProjectMetadataUpdatedEventInCloudflareD1,
    ).toHaveBeenCalledWith({
      actorUserId: "user-1",
      changedFields: ["client_name"],
      projectId: PROJECT_ID,
    });
  });

  it("writes no event for a no-op save", async () => {
    await updateProjectDetails(
      formData({ ...BASE_FORM, clientName: "Old Client" }),
    );
    expect(
      recordProjectMetadataUpdatedEventInCloudflareD1,
    ).not.toHaveBeenCalled();
  });

  it("loads and updates through a workspace-scoped D1 query", async () => {
    const database = new FakeD1Database();
    getCloudflareD1Database.mockResolvedValue(database);

    await updateProjectDetails(
      formData({ ...BASE_FORM, clientName: "New Client" }),
    );

    expect(database.firstStatements[0]?.sql).toContain(
      "WHERE id = ? AND workspace_id = ?",
    );
    expect(database.firstStatements[0]?.values).toEqual([
      PROJECT_ID,
      WORKSPACE_ID,
    ]);
    expect(database.runStatements[0]?.sql).toContain("UPDATE projects");
    expect(database.runStatements[0]?.sql).toContain(
      "WHERE id = ? AND workspace_id = ?",
    );
    expect(database.runStatements[0]?.values.slice(-2)).toEqual([
      PROJECT_ID,
      WORKSPACE_ID,
    ]);
  });

  it("does not fail the save when the audit insert errors (best-effort)", async () => {
    recordProjectMetadataUpdatedEventInCloudflareD1.mockRejectedValueOnce(
      new Error("audit table unavailable"),
    );
    await expect(
      updateProjectDetails(
        formData({ ...BASE_FORM, clientName: "New Client" }),
      ),
    ).resolves.toBeUndefined();
  });
});
