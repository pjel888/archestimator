import { beforeEach, describe, expect, it, vi } from "vitest";

const PROJECT_ID = "11111111-1111-4111-8111-111111111111";

const requireCurrentUserContext = vi.hoisted(() => vi.fn());
const serverFrom = vi.hoisted(() => vi.fn());
const createSupabaseServerClient = vi.hoisted(() => vi.fn(async () => ({ from: serverFrom })));
const insertSpy = vi.hoisted(() => vi.fn());

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({ requireCurrentUserContext }));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient,
}));
vi.mock("@/lib/supabase/service-role", () => ({
  createSupabaseServiceRoleClient: vi.fn(() => ({ from: () => ({ insert: insertSpy }) })),
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
    createSupabaseServerClient.mockClear();
    insertSpy.mockReset();
    insertSpy.mockResolvedValue({ error: null });
    requireCurrentUserContext.mockResolvedValue({ userId: "user-1", email: "a@b.co", role: "admin" });
    mockProjectsTable();
  });

  it("writes one project_metadata_updated event naming the changed field", async () => {
    await updateProjectDetails(formData({ ...BASE_FORM, clientName: "New Client" }));

    expect(insertSpy).toHaveBeenCalledTimes(1);
    expect(insertSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        actor_user_id: "user-1",
        project_id: PROJECT_ID,
        event_type: "project_metadata_updated",
        metadata: { changed_fields: ["client_name"] },
      }),
    );
  });

  it("writes no event for a no-op save", async () => {
    await updateProjectDetails(formData({ ...BASE_FORM, clientName: "Old Client" }));
    expect(insertSpy).not.toHaveBeenCalled();
  });

  it("enforces auth before opening the project mutation client", async () => {
    requireCurrentUserContext.mockRejectedValueOnce(new Error("NEXT_REDIRECT:/workshop/terms?next=%2Fworkshop"));

    await expect(updateProjectDetails(formData({ ...BASE_FORM, clientName: "New Client" }))).rejects.toThrow("NEXT_REDIRECT:/workshop/terms");

    expect(createSupabaseServerClient).not.toHaveBeenCalled();
    expect(serverFrom).not.toHaveBeenCalled();
    expect(insertSpy).not.toHaveBeenCalled();
  });

  it("does not fail the save when the audit insert errors (best-effort)", async () => {
    insertSpy.mockRejectedValueOnce(new Error("audit table unavailable"));
    await expect(updateProjectDetails(formData({ ...BASE_FORM, clientName: "New Client" }))).resolves.toBeUndefined();
  });
});
