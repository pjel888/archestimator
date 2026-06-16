import { beforeEach, describe, expect, it, vi } from "vitest";
const PROJECT_ID = "22222222-2222-4222-8222-222222222222";
const ESTIMATE_ID = "33333333-3333-4333-8333-333333333333";
const WORKSPACE_ID = "ws-1";
const USER_ID = "11111111-1111-4111-8111-111111111111";
const ensureDefaultWorkspace = vi.hoisted(() => vi.fn());
const fromSpy = vi.hoisted(() => vi.fn());
vi.mock("@/lib/repositories/workspace-repository", () => ({ ensureDefaultWorkspace }));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: vi.fn(async () => ({ from: fromSpy })) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
import { setEstimateFavorite, setProjectFavorite } from "@/lib/workshop/actions";
beforeEach(() => { fromSpy.mockReset(); ensureDefaultWorkspace.mockResolvedValue({ workspace: { id: WORKSPACE_ID }, profile: { id: USER_ID } }); });

describe("favorite actions — boolean hygiene (D14 / 13 C2 / QA-13)", () => {
  it("setProjectFavorite rejects a non-boolean favorite before touching Supabase", async () => {
    // @ts-expect-error — simulating a raw POST payload that bypasses the TS type
    await expect(setProjectFavorite({ projectId: PROJECT_ID, favorite: "true" })).rejects.toThrow(/invalid input/i);
    expect(fromSpy).not.toHaveBeenCalled();
  });
  it("setEstimateFavorite rejects a non-boolean favorite before touching Supabase", async () => {
    // @ts-expect-error
    await expect(setEstimateFavorite({ estimateId: ESTIMATE_ID, favorite: 1 })).rejects.toThrow(/invalid input/i);
    expect(fromSpy).not.toHaveBeenCalled();
  });
});
