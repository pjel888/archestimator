import { beforeEach, describe, expect, it, vi } from "vitest";

const PROJECT_ID = "11111111-1111-4111-8111-111111111111";

const requireAuth = vi.hoisted(() => vi.fn());
const requireCurrentUserContext = vi.hoisted(() => vi.fn());
const serverFrom = vi.hoisted(() => vi.fn());
const recordProjectMetadataUpdatedEventInCloudflareD1 = vi.hoisted(() => vi.fn());

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({ requireAuth, requireCurrentUserContext }));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(async () => ({ from: serverFrom })),
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

function mockProjectsTable(existing: Record<string, unknown> = EXISTING) {
  serverFrom.mockImplementation(() => {
    const chain: Record<string, unknown> = {};
    chain.select = () => chain;
    chain.update = () => chain;
    chain.eq = () => chain;
    chain.single = async () => ({ data: existing, error: null });
    // `await supabase.from("projects").update(...).eq(...)` resolves here.
    chain.then = (resolve: (value: { error: null }) => unknown) => resolve({ error: null });
    return chain;
  });
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
    serverFrom.mockReset();
    requireAuth.mockReset();
    requireAuth.mockResolvedValue(undefined);
    recordProjectMetadataUpdatedEventInCloudflareD1.mockReset();
    recordProjectMetadataUpdatedEventInCloudflareD1.mockResolvedValue(true);
    requireCurrentUserContext.mockResolvedValue({ userId: "user-1", email: "a@b.co", role: "admin" });
    mockProjectsTable();
  });

  it("writes one project_metadata_updated event naming the changed field", async () => {
    await updateProjectDetails(formData({ ...BASE_FORM, clientName: "New Client" }));

    expect(recordProjectMetadataUpdatedEventInCloudflareD1).toHaveBeenCalledTimes(1);
    expect(recordProjectMetadataUpdatedEventInCloudflareD1).toHaveBeenCalledWith({
      actorUserId: "user-1",
      changedFields: ["client_name"],
      projectId: PROJECT_ID,
    });
  });

  it("writes no event for a no-op save", async () => {
    await updateProjectDetails(formData({ ...BASE_FORM, clientName: "Old Client" }));
    expect(recordProjectMetadataUpdatedEventInCloudflareD1).not.toHaveBeenCalled();
  });

  it("does not fail the save when the audit insert errors (best-effort)", async () => {
    recordProjectMetadataUpdatedEventInCloudflareD1.mockRejectedValueOnce(new Error("audit table unavailable"));
    await expect(updateProjectDetails(formData({ ...BASE_FORM, clientName: "New Client" }))).resolves.toBeUndefined();
  });
});
