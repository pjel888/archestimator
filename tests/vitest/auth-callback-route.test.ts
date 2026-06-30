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

  it("rejects legacy callback codes with a stable public error", async () => {
    const { GET } = await import("@/app/auth/callback/route");

    const response = await GET(
      request("http://localhost:3000/auth/callback?code=abc&next=/workshop/projects"),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/login?error=callback_exchange_failed&next=%2Fworkshop%2Fprojects",
    );
    expect(supabaseServerMocks.createSupabaseServerClient).not.toHaveBeenCalled();
    expect(accountAuditMocks.recordAccountSecurityEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "auth_callback_legacy_disabled",
        metadata: expect.objectContaining({
          public_error_code: "callback_exchange_failed",
          safe_next: "/workshop/projects",
        }),
      }),
    );
  });

  it("does not route legacy callbacks to post-auth destinations", async () => {
    const { GET } = await import("@/app/auth/callback/route");

    const response = await GET(
      request("http://localhost:3000/auth/callback?code=abc&next=/workshop/projects"),
    );

    expect(accountSetupMocks.resolvePostAuthDestination).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/login?error=callback_exchange_failed&next=%2Fworkshop%2Fprojects",
    );
  });

  it("does not run Supabase beta access checks from the retired callback", async () => {
    const { GET } = await import("@/app/auth/callback/route");

    const response = await GET(request("http://localhost:3000/auth/callback?code=abc&next=/workshop"));

    expect(supabaseServerMocks.createSupabaseServerClient).not.toHaveBeenCalled();
    expect(accountSetupMocks.resolvePostAuthDestination).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/login?error=callback_exchange_failed&next=%2Fworkshop",
    );
  });
});
