import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";

const publicRepository = readFileSync("src/lib/publication/public-repository.ts", "utf8");

describe("project publication public repository (Shared Link V2 context)", () => {
  afterEach(() => {
    vi.doUnmock("@supabase/supabase-js");
    vi.resetModules();
  });

  it("keeps password verification server-side and increments open counters with public events", () => {
    expect(publicRepository).toContain("verifyProjectPublicationPasswordByToken");
    expect(publicRepository).toContain("verifyPublicationPassword");
    expect(publicRepository).toContain("resolveProjectPublicationAccessByToken");
    expect(publicRepository).toContain("resolveProjectPublicationSnapshotByToken");
    expect(publicRepository).toContain('.select("id, status, password_hash, expires_at, revoked_at, snapshot_version")');
    expect(publicRepository).toContain('rpc("increment_project_publication_open"');
  });

  it("preserves duplicate decision conflicts when the submit_client_response RPC returns no id", async () => {
    vi.resetModules();

    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://archestimator.test";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";
    process.env.PUBLICATION_TOKEN_HASH_SECRET = "publication-token-hash-secret";

    const recipientQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { recipient_token_hash: "recipient-token-hash" },
        error: null,
      }),
    };
    const rpc = vi.fn().mockResolvedValue({ data: null, error: null });

    vi.doMock("@supabase/supabase-js", () => ({
      createClient: vi.fn(() => ({
        from: vi.fn((table: string) => {
          if (table === "shared_link_recipients") return recipientQuery;
          throw new Error(`Unexpected table: ${table}`);
        }),
        rpc,
      })),
    }));

    const { submitSharedLinkDecision } = await import("@/lib/publication/public-repository");

    await expect(
      submitSharedLinkDecision({
        publicationToken: "publication-token",
        recipientId: "recipient-id",
        expectedSnapshotVersion: 3,
        decision: "accepted",
      }),
    ).rejects.toThrow("Decision already submitted.");

    expect(rpc).toHaveBeenCalledWith(
      "submit_client_response",
      expect.objectContaining({ p_decision: "accepted", p_expected_snapshot_version: 3 }),
    );
  });

  it("wraps submit_client_response RPC error objects so duplicate decisions stay mappable to 409", async () => {
    vi.resetModules();

    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://archestimator.test";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";
    process.env.PUBLICATION_TOKEN_HASH_SECRET = "publication-token-hash-secret";

    const recipientQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { recipient_token_hash: "recipient-token-hash" },
        error: null,
      }),
    };
    const rpc = vi.fn().mockResolvedValue({
      data: null,
      error: { code: "P0001", message: "Decision already submitted." },
    });

    vi.doMock("@supabase/supabase-js", () => ({
      createClient: vi.fn(() => ({
        from: vi.fn((table: string) => {
          if (table === "shared_link_recipients") return recipientQuery;
          throw new Error(`Unexpected table: ${table}`);
        }),
        rpc,
      })),
    }));

    const { submitSharedLinkDecision } = await import("@/lib/publication/public-repository");

    await expect(
      submitSharedLinkDecision({
        publicationToken: "publication-token",
        recipientId: "recipient-id",
        expectedSnapshotVersion: 3,
        decision: "accepted",
      }),
    ).rejects.toThrow("Decision already submitted.");
  });
  it("records access analytics without open-count, recipient, shared-link, or prohibited-field side effects", async () => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://archestimator.test");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role-key");
    vi.stubEnv("PUBLICATION_TOKEN_HASH_SECRET", "publication-token-hash-secret");
    vi.stubEnv("ARCHESTIMATOR_ACCESS_TELEMETRY_ENABLED", "true");

    const publicationQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { id: "publication-1", status: "published", password_hash: null, expires_at: null, revoked_at: null, snapshot_version: 1 },
        error: null,
      }),
    };
    const eventInsert = vi.fn().mockResolvedValue({ error: null });
    const rpc = vi.fn();
    const tableCalls: string[] = [];

    vi.doMock("@supabase/supabase-js", () => ({
      createClient: vi.fn(() => ({
        from: vi.fn((table: string) => {
          tableCalls.push(table);
          if (table === "project_publications") return publicationQuery;
          if (table === "project_publication_events") return { insert: eventInsert };
          throw new Error(`Unexpected table: ${table}`);
        }),
        rpc,
      })),
    }));

    const { recordProjectPublicationAnalyticsEvent } = await import("@/lib/publication/public-repository");
    const result = await recordProjectPublicationAnalyticsEvent({
      token: "client-token",
      eventType: "open",
      accessStage: "page_visit",
      recipientKnown: false,
      request: new Request("https://archestimator.test/share/client-token", {
        headers: {
          "x-forwarded-for": "203.0.113.44",
          "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/537.36 Chrome/125.0.6422.0 Safari/537.36",
          "x-vercel-ip-country": "PH",
          "x-vercel-ip-city": "Manila",
          referer: "https://client.example/private",
        },
      }),
    });

    expect(result).toEqual({ recorded: true });
    expect(eventInsert).toHaveBeenCalledTimes(1);
    const inserted = eventInsert.mock.calls[0]?.[0] as { metadata_json: Record<string, unknown>; ip_hash?: string; user_agent_hash?: string };
    expect(inserted.ip_hash).toEqual(expect.any(String));
    expect(inserted.user_agent_hash).toEqual(expect.any(String));
    expect(inserted.metadata_json).toEqual(expect.objectContaining({
      access_stage: "page_visit",
      recipient_known: false,
      country: "PH",
      browser_family: "Chrome",
      os_family: "macOS",
      device_type: "desktop",
      bot: false,
    }));
    const serialized = JSON.stringify(inserted);
    expect(serialized).not.toContain("203.0.113.44");
    expect(serialized).not.toContain("Chrome/125.0.6422.0");
    expect(serialized).not.toContain("Manila");
    expect(serialized).not.toContain("client.example");
    expect(rpc).not.toHaveBeenCalled();
    expect(tableCalls).not.toContain("shared_link_events");
    expect(tableCalls).not.toContain("shared_link_recipients");
  });

  it("keeps access telemetry disabled by default in production unless explicitly truth-locked", async () => {
    vi.resetModules();
    const { isProjectPublicationAccessTelemetryEnabled } = await import("@/lib/publication/public-repository");

    expect(isProjectPublicationAccessTelemetryEnabled({ NODE_ENV: "production" })).toBe(false);
    expect(isProjectPublicationAccessTelemetryEnabled({ NODE_ENV: "production", ARCHESTIMATOR_ACCESS_TELEMETRY_ENABLED: "true" })).toBe(false);
    expect(isProjectPublicationAccessTelemetryEnabled({ NODE_ENV: "production", ARCHESTIMATOR_ACCESS_TELEMETRY_ENABLED: "true", ARCHESTIMATOR_ACCESS_TELEMETRY_PRODUCTION_READY: "true" })).toBe(true);
    expect(isProjectPublicationAccessTelemetryEnabled({ NODE_ENV: "test", ARCHESTIMATOR_ACCESS_TELEMETRY_ENABLED: "true" })).toBe(true);
  });

});
