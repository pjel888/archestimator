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

const rateLimitMocks = vi.hoisted(() => ({
  checkRecordedDurableRateLimit: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => supabaseServerMocks);
vi.mock("@/lib/auth/account-setup", () => accountSetupMocks);
vi.mock("@/lib/auth/account-audit", () => accountAuditMocks);
vi.mock("@/lib/security/durable-rate-limits", () => rateLimitMocks);

function request(url: string, headers?: HeadersInit) {
  return new NextRequest(new URL(url), { headers });
}

describe("auth callback route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000");
    vi.stubEnv("ARCHESTIMATOR_ALLOWED_APP_ORIGINS", "http://localhost:3000");
    vi.stubEnv("CLOSED_BETA_ACCESS_ENABLED", "false");
    rateLimitMocks.checkRecordedDurableRateLimit.mockResolvedValue({ allowed: true });
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

  it("bounds callback audit writes per client without changing the public redirect", async () => {
    rateLimitMocks.checkRecordedDurableRateLimit.mockResolvedValue({
      allowed: false,
      message: "Auth callback audit limit reached.",
      retryAfter: 60,
    });
    const { GET } = await import("@/app/auth/callback/route");

    const response = await GET(request(
      "http://localhost:3000/auth/callback?code=abc&next=/workshop",
      {
        "cf-connecting-ip": "203.0.113.8",
        "user-agent": "callback-test-agent",
      },
    ));

    expect(rateLimitMocks.checkRecordedDurableRateLimit).toHaveBeenCalledWith(
      expect.objectContaining({
        scope: "auth_callback_audit",
        keyParts: ["203.0.113.8"],
      }),
    );
    expect(accountAuditMocks.recordAccountSecurityEvent).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/login?error=callback_exchange_failed&next=%2Fworkshop",
    );
  });

  it("uses one fail-closed bucket when the trusted Cloudflare client IP is absent", async () => {
    const { GET } = await import("@/app/auth/callback/route");

    await GET(request(
      "http://localhost:3000/auth/callback?code=abc&next=/workshop",
      {
        "user-agent": "attacker-agent-a",
        "x-forwarded-for": "203.0.113.10",
        "x-real-ip": "203.0.113.11",
      },
    ));
    await GET(request(
      "http://localhost:3000/auth/callback?code=abc&next=/workshop",
      {
        "user-agent": "attacker-agent-b",
        "x-forwarded-for": "198.51.100.10",
        "x-real-ip": "198.51.100.11",
      },
    ));

    expect(rateLimitMocks.checkRecordedDurableRateLimit).toHaveBeenCalledTimes(2);
    expect(rateLimitMocks.checkRecordedDurableRateLimit).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ keyParts: ["unattributed"] }),
    );
    expect(rateLimitMocks.checkRecordedDurableRateLimit).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ keyParts: ["unattributed"] }),
    );
  });

  it("fails closed for audit persistence when durable abuse control is unavailable", async () => {
    rateLimitMocks.checkRecordedDurableRateLimit.mockRejectedValue(new Error("D1 unavailable"));
    const { GET } = await import("@/app/auth/callback/route");

    const response = await GET(request("http://localhost:3000/auth/callback?next=/workshop"));

    expect(accountAuditMocks.recordAccountSecurityEvent).not.toHaveBeenCalled();
    expect(response.status).toBe(307);
  });
});
