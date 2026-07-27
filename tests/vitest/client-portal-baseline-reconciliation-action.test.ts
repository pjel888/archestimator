import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  assertManager: vi.fn(),
  database: { prepare: vi.fn() },
  getDatabase: vi.fn(),
  reconcile: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/cloudflare/d1", () => ({ getCloudflareD1Database: mocks.getDatabase }));
vi.mock("@/lib/publication/actions", () => ({ assertProjectPublicationManager: mocks.assertManager }));
vi.mock("@/lib/client-portal/baseline-service", () => ({ reconcileAcceptedClientPortalBaseline: mocks.reconcile }));

import { reconcileAcceptedClientPortalBaselineAction } from "@/lib/client-portal/composer-actions";

describe("accepted baseline reconciliation action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.assertManager.mockResolvedValue({
      currentUserId: "owner-1",
      project: { id: "project-1", workspace_id: "workspace-1" },
    });
    mocks.getDatabase.mockResolvedValue(mocks.database);
    mocks.reconcile.mockResolvedValue({ baselineId: "baseline-1" });
  });

  it("uses owner-authorized project scope and revalidates the action destination", async () => {
    await reconcileAcceptedClientPortalBaselineAction({
      issueId: "issue-1",
      portalId: "portal-1",
      projectId: "project-1",
    });

    expect(mocks.assertManager).toHaveBeenCalledWith("project-1");
    expect(mocks.reconcile).toHaveBeenCalledWith(expect.objectContaining({
      actor: expect.objectContaining({ portalGrants: ["manager"], userId: "owner-1" }),
      database: mocks.database,
      issueId: "issue-1",
      portalId: "portal-1",
    }));
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/workshop/publisher");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/workshop/projects/project-1/timeline");
  });
});
