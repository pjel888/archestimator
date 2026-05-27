import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  buildAccountSecurityAuditRow,
  hashAccountSecurityValue,
} from "@/lib/auth/account-audit";
import {
  ORGANIZATION_TYPE_OPTIONS,
  USER_CATEGORY_OPTIONS,
  buildAccountSecurityEvent,
  sanitizeAccountSecurityMetadata,
} from "@/lib/auth/account-data";

describe("auth account data contracts", () => {
  it("keeps required onboarding taxonomy stable", () => {
    expect(USER_CATEGORY_OPTIONS.map((option) => option.value)).toEqual([
      "architect",
      "contractor",
      "engineer",
      "quantity_surveyor",
      "owner_developer",
      "student_educator",
      "other",
    ]);
    expect(ORGANIZATION_TYPE_OPTIONS.map((option) => option.value)).toEqual([
      "architecture_design",
      "construction_contractor",
      "engineering_consultancy",
      "quantity_surveying",
      "owner_developer",
      "education",
      "solo_practice",
      "other",
    ]);
  });

  it("redacts raw auth secrets from account security audit metadata", () => {
    const metadata = sanitizeAccountSecurityMetadata({
      provider: "google",
      code: "raw-callback-code",
      otp: "123456",
      access_token: "access-secret",
      refresh_token: "refresh-secret",
      redirect_to: "https://app.archestimator.com/workshop",
      safe_next: "/workshop",
    });

    expect(metadata).toEqual({
      provider: "google",
      redirect_to: "https://app.archestimator.com/workshop",
      safe_next: "/workshop",
    });
    expect(JSON.stringify(metadata)).not.toMatch(
      /raw-callback-code|123456|access-secret|refresh-secret/i,
    );
  });

  it("recursively redacts nested raw auth secrets from audit metadata", () => {
    const metadata = sanitizeAccountSecurityMetadata({
      public_error_code: "callback_exchange_failed",
      nested: {
        callback_code: "raw-code",
        details: [{ refresh_token: "refresh-secret" }, { safe: "kept" }],
      },
    });

    expect(metadata).toEqual({
      public_error_code: "callback_exchange_failed",
      nested: {
        details: [{}, { safe: "kept" }],
      },
    });
    expect(JSON.stringify(metadata)).not.toMatch(/raw-code|refresh-secret/i);
  });

  it("keeps account security audit metadata JSON-safe", () => {
    const metadata = sanitizeAccountSecurityMetadata({
      safe_next: "/workshop",
      nested: { provider: "google", retries: 1 },
      list: ["email", 2, true],
      not_a_number: Number.NaN,
      infinity: Number.POSITIVE_INFINITY,
      date: new Date("2026-05-27T00:00:00.000Z"),
      callback: () => null,
    });

    expect(metadata).toEqual({
      safe_next: "/workshop",
      nested: { provider: "google", retries: 1 },
      list: ["email", 2, true],
    });
  });

  it("builds server-owned account security events without raw provider payloads", () => {
    const event = buildAccountSecurityEvent({
      eventType: "auth_callback_failed",
      userId: "00000000-0000-0000-0000-000000000001",
      workspaceId: null,
      requestId: "req_123",
      ipHash: "ip_hash",
      userAgentHash: "ua_hash",
      metadata: {
        raw_provider_payload: { error: "invalid_grant" },
        public_error_code: "callback_exchange_failed",
      },
    });

    expect(event.event_type).toBe("auth_callback_failed");
    expect(event.metadata_json).toEqual({
      public_error_code: "callback_exchange_failed",
    });
    expect(JSON.stringify(event)).not.toMatch(/invalid_grant|raw_provider/i);
  });

  it("hashes request metadata before building server-owned audit rows", () => {
    const row = buildAccountSecurityAuditRow({
      eventType: "auth_google_started",
      userId: null,
      workspaceId: null,
      ipAddress: "203.0.113.10",
      userAgent: "Browser With Version",
      metadata: {
        provider: "google",
        safe_next: "/workshop",
      },
    });

    expect(row.ip_hash).toBe(hashAccountSecurityValue("203.0.113.10"));
    expect(row.user_agent_hash).toBe(hashAccountSecurityValue("Browser With Version"));
    expect(JSON.stringify(row)).not.toContain("203.0.113.10");
    expect(JSON.stringify(row)).not.toContain("Browser With Version");
  });

  it("keeps account security audit persistence server-only", () => {
    const auditSource = readFileSync(
      join(process.cwd(), "src/lib/auth/account-audit.ts"),
      "utf8",
    );

    expect(auditSource.startsWith('import "server-only";')).toBe(true);
    expect(auditSource).toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(auditSource).toContain("persistSession: false");
  });
});
