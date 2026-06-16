import { beforeEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  getCurrentUserContext: vi.fn(),
  getRequiredCurrentUserContextResult: vi.fn(),
  requireCurrentUserContext: vi.fn(),
}));

const termsAcceptanceMocks = vi.hoisted(() => ({
  getCurrentUserTermsAcceptanceStatus: vi.fn(),
}));

const realtimeServerMocks = vi.hoisted(() => ({
  issueRealtimeIdentityEnvelope: vi.fn(),
}));

const supabaseServerMocks = vi.hoisted(() => ({
  createSupabaseServerClient: vi.fn(),
}));

const supabaseJsMocks = vi.hoisted(() => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => authMocks);
vi.mock("@/lib/legal/terms-acceptance", () => termsAcceptanceMocks);
vi.mock("@/lib/collaboration/realtime-identity-server", () => realtimeServerMocks);
vi.mock("@/lib/supabase/server", () => supabaseServerMocks);
vi.mock("@supabase/supabase-js", () => supabaseJsMocks);

const userContext = {
  userId: "22222222-2222-4222-8222-222222222222",
  email: "owner@example.com",
  role: "member",
  profile: { id: "22222222-2222-4222-8222-222222222222", role: "member" },
  displayName: "Owner",
  avatarUrl: null,
};

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  authMocks.getCurrentUserContext.mockResolvedValue(userContext);
  authMocks.getRequiredCurrentUserContextResult.mockResolvedValue({
    ok: true,
    context: userContext,
  });
  termsAcceptanceMocks.getCurrentUserTermsAcceptanceStatus.mockResolvedValue({
    requiresAcceptance: false,
  });
});

describe("Terms gate direct protected callers", () => {
  it("fails closed before serving private project images when current Terms are unaccepted", async () => {
    const workspaceId = "11111111-1111-4111-8111-111111111111";
    const projectId = "33333333-3333-4333-8333-333333333333";
    const path = `${workspaceId}/${userContext.userId}/project-images/${projectId}/image.webp`;
    termsAcceptanceMocks.getCurrentUserTermsAcceptanceStatus.mockResolvedValueOnce({
      requiresAcceptance: true,
    });
    const { GET } = await import("@/app/api/projects/images/route");

    const response = await GET(
      new Request(`http://localhost/api/projects/images?path=${encodeURIComponent(path)}`),
    );

    expect(response.status).toBe(404);
    expect(response.headers.get("cache-control")).toBe(
      "private, no-cache, no-store, max-age=0, must-revalidate",
    );
    expect(termsAcceptanceMocks.getCurrentUserTermsAcceptanceStatus).toHaveBeenCalledWith(
      userContext.userId,
    );
    expect(supabaseServerMocks.createSupabaseServerClient).not.toHaveBeenCalled();
    expect(supabaseJsMocks.createClient).not.toHaveBeenCalled();
  });

  it("returns no realtime identity envelope until current Terms are accepted", async () => {
    termsAcceptanceMocks.getCurrentUserTermsAcceptanceStatus.mockResolvedValueOnce({
      requiresAcceptance: true,
    });
    const { issueRealtimeIdentity } = await import("@/lib/collaboration/realtime-identity-actions");

    const result = await issueRealtimeIdentity({
      topic: "project:33333333-3333-4333-8333-333333333333",
    });

    expect(result).toBeNull();
    expect(termsAcceptanceMocks.getCurrentUserTermsAcceptanceStatus).toHaveBeenCalledWith(
      userContext.userId,
    );
    expect(realtimeServerMocks.issueRealtimeIdentityEnvelope).not.toHaveBeenCalled();
  });
});
