import { describe, expect, it } from "vitest";

import {
  buildShareUrl,
  isLocalDevBaseUrl,
  parseSeedInputs,
  renderShareUrlEnv,
  selectSeedCandidate,
} from "../../scripts/seed-shared-link-smoke";

describe("shared-link smoke seed script", () => {
  it("requires Supabase service-role inputs and a local base URL by default", () => {
    expect(() => parseSeedInputs({} as NodeJS.ProcessEnv)).toThrow(/NEXT_PUBLIC_SUPABASE_URL/);
    expect(() => parseSeedInputs({
      NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "service-role-secret",
      NEXT_PUBLIC_APP_URL: "https://preview.example",
    } as NodeJS.ProcessEnv)).toThrow(/non-local base URL/);
  });

  it("allows localhost smoke URLs without hosted override", () => {
    const inputs = parseSeedInputs({
      NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "service-role-secret",
      NEXT_PUBLIC_APP_URL: "http://localhost:3000/",
    } as NodeJS.ProcessEnv);

    expect(inputs.baseUrl).toBe("http://localhost:3000");
    expect(isLocalDevBaseUrl(inputs.baseUrl)).toBe(true);
  });

  it("selects active published no-password publication candidates only", () => {
    const now = new Date("2026-06-21T00:00:00.000Z");
    const rows = [
      {
        encrypted_token: "expired",
        expires_at: "2026-06-20T00:00:00.000Z",
        password_hash: null,
        published_at: "2026-06-20T00:00:00.000Z",
        revoked_at: null,
        status: "published" as const,
      },
      {
        encrypted_token: "protected",
        expires_at: null,
        password_hash: "hash",
        published_at: "2026-06-20T00:00:00.000Z",
        revoked_at: null,
        status: "published" as const,
      },
      {
        encrypted_token: "usable",
        expires_at: null,
        password_hash: null,
        published_at: "2026-06-21T00:00:00.000Z",
        revoked_at: null,
        status: "published" as const,
      },
    ];

    expect(selectSeedCandidate(rows, now)?.encrypted_token).toBe("usable");
  });

  it("renders a plain SHARE_URL env line for the smoke command", () => {
    const shareUrl = buildShareUrl("http://localhost:3000", "raw-share-token");
    expect(shareUrl).toBe("http://localhost:3000/share/raw-share-token");
    expect(renderShareUrlEnv(shareUrl)).toBe("SHARE_URL=http://localhost:3000/share/raw-share-token\n");
  });
});
