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
        decision: "accepted",
      }),
    ).rejects.toThrow("Decision already submitted.");

    expect(rpc).toHaveBeenCalledWith("submit_client_response", expect.objectContaining({ p_decision: "accepted" }));
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
        decision: "accepted",
      }),
    ).rejects.toThrow("Decision already submitted.");
  });
});
