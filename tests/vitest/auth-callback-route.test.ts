import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const supabaseServerMocks = vi.hoisted(() => ({
  createSupabaseServerClient: vi.fn(),
}));

const accountSetupMocks = vi.hoisted(() => ({
  resolvePostAuthDestination: vi.fn(),
}));

const accountAuditMocks = vi.hoisted(() => ({
  recordAccountSecurityEvent: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => supabaseServerMocks);
vi.mock("@/lib/auth/account-setup", () => accountSetupMocks);
vi.mock("@/lib/auth/account-audit", () => accountAuditMocks);

function request(url: string) {
  return new NextRequest(new URL(url));
}

describe("auth callback route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000");
    vi.stubEnv("ARCHESTIMATOR_ALLOWED_APP_ORIGINS", "http://localhost:3000");
    vi.stubEnv("CLOSED_BETA_ACCESS_ENABLED", "false");
  });

  it("maps missing auth code to a stable public error and sanitized next", async () => {
    const { GET } = await import("@/app/auth/callback/route");

    const response = await GET(
      request("http://localhost:3000/auth/callback?next=https%3A%2F%2Fevil.example"),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/login?error=callback_missing_code&next=%2Fworkshop",
    );
    expect(accountAuditMocks.recordAccountSecurityEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "auth_callback_missing_code",
        metadata: expect.objectContaining({
          public_error_code: "callback_missing_code",
          safe_next: "/workshop",
        }),
      }),
    );
  });

  it("hides raw provider exchange errors from callback redirects", async () => {
    supabaseServerMocks.createSupabaseServerClient.mockResolvedValue({
      auth: {
        exchangeCodeForSession: vi.fn(async () => ({
          error: { message: "invalid_grant refresh_token secret" },
        })),
      },
    });
    const { GET } = await import("@/app/auth/callback/route");

    const response = await GET(
      request("http://localhost:3000/auth/callback?code=abc&next=/workshop/projects"),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/login?error=callback_exchange_failed&next=%2Fworkshop%2Fprojects",
    );
    expect(response.headers.get("location")).not.toMatch(/invalid_grant|refresh_token|secret/i);
  });

  it("routes successful auth callbacks directly to the workshop homebase", async () => {
    const getUser = vi.fn(async () => ({
      data: { user: { id: "user-1" } },
    }));
    const supabase = {
      auth: {
        exchangeCodeForSession: vi.fn(async () => ({ error: null })),
        getUser,
      },
    };
    supabaseServerMocks.createSupabaseServerClient.mockResolvedValue(supabase);
    accountSetupMocks.resolvePostAuthDestination.mockReturnValue("/workshop");
    const { GET } = await import("@/app/auth/callback/route");

    const response = await GET(
      request("http://localhost:3000/auth/callback?code=abc&next=/workshop/projects"),
    );

    expect(accountSetupMocks.resolvePostAuthDestination).toHaveBeenCalledWith("/workshop/projects");
    expect(response.headers.get("location")).toBe("http://localhost:3000/workshop");
  });

  it("routes successful but non-allowlisted callbacks to beta access-required", async () => {
    const rpc = vi.fn(async () => ({
      data: { allowed: false, status: "missing", normalized_email: "outsider@example.com" },
      error: null,
    }));
    const supabase = {
      auth: {
        exchangeCodeForSession: vi.fn(async () => ({ error: null })),
        getUser: vi.fn(async () => ({
          data: { user: { id: "user-1", email: "outsider@example.com" } },
        })),
      },
      rpc,
    };
    supabaseServerMocks.createSupabaseServerClient.mockResolvedValue(supabase);
    vi.stubEnv("CLOSED_BETA_ACCESS_ENABLED", "true");
    const { GET } = await import("@/app/auth/callback/route");

    const response = await GET(request("http://localhost:3000/auth/callback?code=abc&next=/workshop"));

    expect(rpc).toHaveBeenCalledWith("check_closed_beta_access", { raw_email: "outsider@example.com" });
    expect(accountSetupMocks.resolvePostAuthDestination).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toBe("http://localhost:3000/beta/access-required");
  });
});
