import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCloudflareD1Database: vi.fn(),
  getCurrentUserContext: vi.fn(),
  getCurrentWorkspaceProjectForEstimate: vi.fn(),
  result: { meta: { changes: 1 }, success: true } as { meta: { changes: number }; success: boolean },
  values: [] as unknown[][],
}));

vi.mock("@/lib/auth/session", () => ({ getCurrentUserContext: mocks.getCurrentUserContext }));
vi.mock("@/lib/cloudflare/d1", () => ({ getCloudflareD1Database: mocks.getCloudflareD1Database }));
vi.mock("@/lib/repositories/workspace-repository", () => ({
  getCurrentWorkspaceProjectForEstimate: mocks.getCurrentWorkspaceProjectForEstimate,
}));

import { POST } from "@/app/api/activation/proposal-export-completed/route";

const projectId = "11111111-1111-4111-8111-111111111111";
const estimateId = "22222222-2222-4222-8222-222222222222";

describe("proposal export activation acknowledgement", () => {
  beforeEach(() => {
    mocks.values.length = 0;
    mocks.result = { meta: { changes: 1 }, success: true };
    mocks.getCurrentUserContext.mockResolvedValue({ userId: "user-1" });
    mocks.getCurrentWorkspaceProjectForEstimate.mockResolvedValue({
      project: { id: projectId },
      workspace: { id: "workspace-1" },
    });
    mocks.getCloudflareD1Database.mockResolvedValue({
      prepare: () => {
        const statement = {
          bind: (...values: unknown[]) => {
            mocks.values.push(values);
            return statement;
          },
          run: async () => mocks.result,
        };
        return statement;
      },
    });
  });

  it("records a tenant-scoped, idempotent export completion intent after reauthorization", async () => {
    const response = await POST(new Request("https://app.example.test/api/activation/proposal-export-completed", {
      body: JSON.stringify({ estimateId, projectId }),
      headers: { "content-type": "application/json", origin: "https://app.example.test" },
      method: "POST",
    }));

    await expect(response.json()).resolves.toEqual({ status: "recorded" });
    expect(mocks.getCurrentWorkspaceProjectForEstimate).toHaveBeenCalledWith(projectId, estimateId);
    expect(mocks.values[0]).toEqual(expect.arrayContaining([
      "user-1",
      "workspace-1",
      projectId,
      estimateId,
      "export_completed",
      "export",
      `workspace-1:proposal-export:${estimateId}:export_completed`,
    ]));
  });

  it("returns idempotent success when the export completion was already recorded", async () => {
    mocks.result = { meta: { changes: 0 }, success: true };

    const response = await POST(new Request("https://app.example.test/api/activation/proposal-export-completed", {
      body: JSON.stringify({ estimateId, projectId }),
      headers: { "content-type": "application/json", origin: "https://app.example.test" },
      method: "POST",
    }));

    await expect(response.json()).resolves.toEqual({ status: "already_recorded" });
  });
});
