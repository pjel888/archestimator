import { beforeEach, describe, expect, it, vi } from "vitest";

const PROJECT_ID = "11111111-1111-4111-8111-111111111111";
const WORKSPACE_ID = "22222222-2222-4222-8222-222222222222";

const requireAuth = vi.hoisted(() => vi.fn());
const requireCurrentUserContext = vi.hoisted(() => vi.fn());
const getCloudflareD1Database = vi.hoisted(() => vi.fn());
const ensureDefaultWorkspace = vi.hoisted(() => vi.fn());
const createRuntimeUploadStorageProvider = vi.hoisted(() => vi.fn());
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
vi.mock("@/lib/uploads/runtime-storage-provider", () => ({
  createRuntimeUploadStorageProvider,
}));
vi.mock("@/lib/projects/d1-audit", () => ({
  recordProjectMetadataUpdatedEventInCloudflareD1,
}));

import {
  updateProjectDetails,
  updateProjectImageMetadata,
  updateProjectStatus,
} from "@/lib/projects/actions";

const EXISTING = {
  name: "Lewis Residence",
  client_name: "Old Client",
  location: "Quezon City",
  project_code: "AE-001",
  currency_code: "PHP",
  metadata: {},
  workspace_id: WORKSPACE_ID,
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
      this.sql.includes("SELECT id, workspace_id") &&
      this.sql.includes("FROM projects")
    ) {
      return {
        id: PROJECT_ID,
        workspace_id: this.database.existing.workspace_id,
      } as T;
    }
    if (
      this.sql.includes(
        "SELECT name, client_name, location, project_code, currency_code, metadata",
      )
    ) {
      return this.database.existing as T;
    }
    if (this.sql.includes("SELECT metadata FROM projects")) {
      return { metadata: this.database.existing.metadata } as T;
    }
    if (
      this.sql.includes("SELECT 1 AS allowed") &&
      this.sql.includes("FROM projects project")
    ) {
      if (
        this.database.allowProjectCreatorEditViaSql &&
        this.sql.includes("project.created_by = ?") &&
        this.values[1] === "user-1"
      ) {
        return { allowed: 1 } as T;
      }
      return this.database.canEditProject ? ({ allowed: 1 } as T) : null;
    }
    return null;
  }

  async all<T>() {
    this.database.allStatements.push(this);
    return { results: [] as T[], success: true };
  }

  async run() {
    this.database.runStatements.push(this);
    return { success: true, meta: { changes: this.database.runChanges } };
  }
}

class FakeD1Database {
  allowProjectCreatorEditViaSql = false;
  canEditProject = true;
  runChanges = 1;
  firstStatements: FakeD1Statement[] = [];
  allStatements: FakeD1Statement[] = [];
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
    createRuntimeUploadStorageProvider.mockReset();
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

  it("loads by project id and updates through the target project workspace", async () => {
    const database = new FakeD1Database();
    getCloudflareD1Database.mockResolvedValue(database);
    requireCurrentUserContext.mockResolvedValue({
      userId: "user-1",
      email: "a@b.co",
      role: "user",
    });

    await updateProjectDetails(
      formData({ ...BASE_FORM, clientName: "New Client" }),
    );

    expect(database.firstStatements[0]?.sql).toContain("WHERE id = ?");
    expect(database.firstStatements[0]?.sql).not.toContain(
      "AND workspace_id = ?",
    );
    expect(database.firstStatements[0]?.values).toEqual([PROJECT_ID]);
    expect(database.firstStatements[1]?.sql).toContain("FROM projects project");
    expect(database.runStatements[0]?.sql).toContain("UPDATE projects");
    expect(database.runStatements[0]?.sql).toContain(
      "publication_source_revision = publication_source_revision + 1",
    );
    expect(database.runStatements[0]?.sql).toContain(
      "WHERE id = ? AND workspace_id = ?",
    );
    expect(database.runStatements[0]?.sql).toContain(
      "publication_source_revision = publication_source_revision + 1",
    );
    expect(database.runStatements[0]?.values.slice(7, 9)).toEqual([
      PROJECT_ID,
      WORKSPACE_ID,
    ]);
  });

  it("updates project status through the target workspace and audits status", async () => {
    const database = new FakeD1Database();
    getCloudflareD1Database.mockResolvedValue(database);
    requireCurrentUserContext.mockResolvedValue({
      userId: "user-1",
      email: "a@b.co",
      role: "user",
    });

    await updateProjectStatus({ projectId: PROJECT_ID, status: "completed" });

    expect(database.firstStatements[0]?.sql).toContain("WHERE id = ?");
    expect(database.firstStatements[1]?.sql).toContain("FROM projects project");
    expect(database.runStatements[0]?.sql).toContain("UPDATE projects");
    expect(database.runStatements[0]?.sql).toContain("SET status = ?");
    expect(database.runStatements[0]?.sql).toContain(
      "WHERE id = ? AND workspace_id = ?",
    );
    expect(database.runStatements[0]?.values.slice(-2)).toEqual([
      PROJECT_ID,
      WORKSPACE_ID,
    ]);
    expect(
      recordProjectMetadataUpdatedEventInCloudflareD1,
    ).toHaveBeenCalledWith({
      actorUserId: "user-1",
      changedFields: ["status"],
      projectId: PROJECT_ID,
    });
  });

  it("updates project image metadata through the target project workspace", async () => {
    const database = new FakeD1Database({
      ...EXISTING,
      workspace_id: "shared-workspace",
    });
    getCloudflareD1Database.mockResolvedValue(database);
    requireCurrentUserContext.mockResolvedValue({
      userId: "user-1",
      email: "a@b.co",
      role: "user",
    });

    await updateProjectImageMetadata(PROJECT_ID, {
      url: `/api/projects/images?path=shared-workspace/user-1/project-images/${PROJECT_ID}/cover.webp`,
      path: `shared-workspace/user-1/project-images/${PROJECT_ID}/cover.webp`,
    });

    expect(database.firstStatements[0]?.sql).toContain(
      "SELECT id, workspace_id",
    );
    expect(database.firstStatements[0]?.values).toEqual([PROJECT_ID]);
    expect(database.firstStatements[1]?.sql).toContain("FROM projects project");
    expect(database.firstStatements[2]?.values).toEqual([
      PROJECT_ID,
      "shared-workspace",
    ]);
    expect(database.runStatements[0]?.sql).toContain(
      "WHERE id = ? AND workspace_id = ?",
    );
    expect(database.runStatements[0]?.values.slice(2, 4)).toEqual([
      PROJECT_ID,
      "shared-workspace",
    ]);
    expect(database.runStatements[0]?.values.slice(-4)).toEqual([
      `shared-workspace/user-1/project-images/${PROJECT_ID}/cover.webp`,
      `shared-workspace/user-1/project-images/${PROJECT_ID}/cover.webp`,
      null,
      null,
    ]);
    expect(database.runStatements[0]?.sql).toContain("image_asset.purge_state = 'active'");
  });

  it("rejects project image metadata when the active upload guard loses the save race", async () => {
    const database = new FakeD1Database();
    database.runChanges = 0;
    getCloudflareD1Database.mockResolvedValue(database);
    const path = `${WORKSPACE_ID}/user-1/project-images/${PROJECT_ID}/cover.webp`;

    await expect(updateProjectImageMetadata(PROJECT_ID, {
      url: `/api/projects/images?path=${path}`,
      path,
    })).rejects.toThrow(
      "Project image is no longer active. Upload it again before saving.",
    );
  });

  it("rejects project image metadata edits when only historical created_by matches", async () => {
    const database = new FakeD1Database({
      ...EXISTING,
      workspace_id: "shared-workspace",
    });
    database.canEditProject = false;
    database.allowProjectCreatorEditViaSql = true;
    getCloudflareD1Database.mockResolvedValue(database);
    requireCurrentUserContext.mockResolvedValue({
      userId: "user-1",
      email: "a@b.co",
      role: "member",
    });

    await expect(
      updateProjectImageMetadata(PROJECT_ID, {
        url: `/api/projects/images?path=shared-workspace/user-1/project-images/${PROJECT_ID}/cover.webp`,
        path: `shared-workspace/user-1/project-images/${PROJECT_ID}/cover.webp`,
        thumbnailPath: `shared-workspace/user-1/project-images/${PROJECT_ID}/cover-thumb.webp`,
      }),
    ).rejects.toThrow("You do not have permission to edit this project.");

    const editGuard = database.firstStatements.find((statement) =>
      statement.sql.includes("FROM projects project"),
    );
    expect(editGuard?.sql).not.toContain("project.created_by = ?");
    expect(editGuard?.values).toEqual([PROJECT_ID, "user-1", "user-1"]);
    expect(database.runStatements).toHaveLength(0);
  });

  it("rejects project image metadata paths outside the target project", async () => {
    const database = new FakeD1Database();
    getCloudflareD1Database.mockResolvedValue(database);

    await expect(
      updateProjectImageMetadata(PROJECT_ID, {
        url: "/api/projects/images?path=other-workspace/user-1/project-images/other-project/cover.webp",
        path: "other-workspace/user-1/project-images/other-project/cover.webp",
      }),
    ).rejects.toThrow("projectImagePath must belong to this project.");

    expect(database.runStatements).toHaveLength(0);
  });

  it("rejects project detail image paths outside the target project", async () => {
    const database = new FakeD1Database();
    getCloudflareD1Database.mockResolvedValue(database);

    await expect(
      updateProjectDetails(
        formData({
          ...BASE_FORM,
          clientName: "Old Client",
          projectImageUrl:
            "/api/projects/images?path=other-workspace/user-1/project-images/other-project/cover.webp",
          projectImagePath:
            "other-workspace/user-1/project-images/other-project/cover.webp",
        }),
      ),
    ).rejects.toThrow("projectImagePath must belong to this project.");

    expect(database.runStatements).toHaveLength(0);
  });

  it("rejects project detail thumbnail paths outside the target project", async () => {
    const database = new FakeD1Database();
    getCloudflareD1Database.mockResolvedValue(database);

    await expect(
      updateProjectDetails(
        formData({
          ...BASE_FORM,
          clientName: "Old Client",
          projectImageUrl: `/api/projects/images?path=${WORKSPACE_ID}/user-1/project-images/${PROJECT_ID}/cover.webp`,
          projectImagePath: `${WORKSPACE_ID}/user-1/project-images/${PROJECT_ID}/cover.webp`,
          projectImageThumbnailUrl:
            "/api/projects/images?path=other-workspace/user-1/project-images/other-project/cover-thumb.webp",
          projectImageThumbnailPath:
            "other-workspace/user-1/project-images/other-project/cover-thumb.webp",
        }),
      ),
    ).rejects.toThrow(
      "projectImageThumbnailPath must belong to this project.",
    );

    expect(database.runStatements).toHaveLength(0);
  });

  it("updates shared-workspace project image metadata and claims only prior target-project paths", async () => {
    const previousPath = `shared-workspace/user-1/project-images/${PROJECT_ID}/old-cover.webp`;
    const previousThumbnailPath = `shared-workspace/user-1/project-images/${PROJECT_ID}/old-cover-thumb.webp`;
    const foreignPath =
      "shared-workspace/user-1/project-images/33333333-3333-4333-8333-333333333333/foreign-cover.webp";
    const nextPath = `shared-workspace/user-1/project-images/${PROJECT_ID}/new-cover.webp`;
    const nextThumbnailPath = `shared-workspace/user-1/project-images/${PROJECT_ID}/new-cover-thumb.webp`;
    const database = new FakeD1Database({
      ...EXISTING,
      workspace_id: "shared-workspace",
      metadata: {
        projectImagePath: previousPath,
        projectImageThumbnailPath: previousThumbnailPath,
        staleForeignImagePath: foreignPath,
      },
    });
    getCloudflareD1Database.mockResolvedValue(database);

    await updateProjectDetails(
      formData({
        ...BASE_FORM,
        clientName: "Old Client",
        projectImageUrl: `/api/projects/images?path=${nextPath}`,
        projectImagePath: nextPath,
        projectImageThumbnailUrl: `/api/projects/images?path=${nextThumbnailPath}`,
        projectImageThumbnailPath: nextThumbnailPath,
      }),
    );

    expect(database.runStatements[0]?.sql).toContain(
      "WHERE id = ? AND workspace_id = ?",
    );
    expect(database.runStatements[0]?.values.slice(7, 9)).toEqual([
      PROJECT_ID,
      "shared-workspace",
    ]);
    expect(database.runStatements[0]?.values.slice(-4)).toEqual([
      nextPath,
      nextPath,
      nextThumbnailPath,
      nextThumbnailPath,
    ]);
    const removalClaim = database.allStatements.find((statement) =>
      statement.sql.includes("UPDATE upload_assets AS asset"));
    expect(removalClaim?.values[0]).toBe(JSON.stringify([
      previousPath,
      previousThumbnailPath,
    ]));
    expect(createRuntimeUploadStorageProvider).not.toHaveBeenCalled();
  });

  it("claims only target-project image paths from legacy metadata", async () => {
    const validPath = `${WORKSPACE_ID}/user-1/project-images/${PROJECT_ID}/old-cover.webp`;
    const foreignPath = `${WORKSPACE_ID}/user-1/project-images/33333333-3333-4333-8333-333333333333/foreign-cover.webp`;
    const database = new FakeD1Database({
      ...EXISTING,
      metadata: {
        projectImagePath: validPath,
        projectImageThumbnailPath: foreignPath,
      },
    });
    getCloudflareD1Database.mockResolvedValue(database);

    await updateProjectDetails(
      formData({
        ...BASE_FORM,
        clientName: "Old Client",
        projectImageRemove: "1",
      }),
    );

    const removalClaim = database.allStatements.find((statement) =>
      statement.sql.includes("UPDATE upload_assets AS asset"));
    expect(removalClaim?.values[0]).toBe(JSON.stringify([validPath]));
    expect(createRuntimeUploadStorageProvider).not.toHaveBeenCalled();
  });

  it("rejects project details when a selected upload is no longer active", async () => {
    const database = new FakeD1Database();
    database.runChanges = 0;
    getCloudflareD1Database.mockResolvedValue(database);
    const path = `${WORKSPACE_ID}/user-1/project-images/${PROJECT_ID}/cover.webp`;

    await expect(updateProjectDetails(formData({
      ...BASE_FORM,
      clientName: "Old Client",
      projectImageUrl: `/api/projects/images?path=${path}`,
      projectImagePath: path,
    }))).rejects.toThrow(
      "Project image is no longer active. Upload it again before saving.",
    );
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
