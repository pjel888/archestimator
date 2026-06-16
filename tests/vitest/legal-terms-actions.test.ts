import { beforeEach, describe, expect, it, vi } from "vitest";

import { CURRENT_TERMS } from "@/lib/legal/terms-content";

const authMocks = vi.hoisted(() => ({
  requireCurrentUserContext: vi.fn(),
}));

const nextNavigationMocks = vi.hoisted(() => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));

const termsAcceptanceMocks = vi.hoisted(() => ({
  recordCurrentTermsAcceptance: vi.fn(),
}));

vi.mock("next/navigation", () => nextNavigationMocks);
vi.mock("@/lib/auth/session", () => authMocks);
vi.mock("@/lib/legal/terms-acceptance", () => termsAcceptanceMocks);

function acceptedFormData() {
  const formData = new FormData();
  formData.set("next", "/workshop/projects");
  formData.set("terms_version", CURRENT_TERMS.version);
  formData.set("accepted_responsibility", "on");
  return formData;
}

describe("acceptCurrentTermsAction", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    authMocks.requireCurrentUserContext.mockResolvedValue({ userId: "user-1" });
    termsAcceptanceMocks.recordCurrentTermsAcceptance.mockResolvedValue({
      ok: true,
      acceptedAt: "2026-06-16T00:00:00.000Z",
      duplicate: false,
    });
  });

  it("lets an authenticated unaccepted user persist the current Terms acceptance", async () => {
    const { acceptCurrentTermsAction } = await import("@/lib/legal/actions");

    await expect(acceptCurrentTermsAction(acceptedFormData())).rejects.toThrow(
      "NEXT_REDIRECT:/workshop/projects",
    );

    expect(authMocks.requireCurrentUserContext).toHaveBeenCalledWith({
      enforceTermsAcceptance: false,
    });
    expect(termsAcceptanceMocks.recordCurrentTermsAcceptance).toHaveBeenCalledWith({
      userId: "user-1",
      acceptanceContext: "workshop_terms_gate",
      acceptanceMethod: "authenticated_clickwrap",
    });
  });
});
