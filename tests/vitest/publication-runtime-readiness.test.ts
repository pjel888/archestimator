import { afterEach, describe, expect, it, vi } from "vitest";

import {
  readPublicationAccessCookieSecret,
  readPublicationTokenEncryptionSecret,
  readPublicationTokenHashSecret,
} from "@/lib/publication/security";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("publication runtime secret readiness", () => {
  it("fails closed for every required publication secret in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("PUBLICATION_TOKEN_ENCRYPTION_SECRET", "");
    vi.stubEnv("ARCHESTIMATOR_PUBLICATION_TOKEN_SECRET", "");
    vi.stubEnv("PUBLICATION_TOKEN_HASH_SECRET", "");
    vi.stubEnv("ARCHESTIMATOR_PUBLICATION_TOKEN_HASH_SECRET", "");
    vi.stubEnv("PUBLICATION_ACCESS_COOKIE_SECRET", "");
    vi.stubEnv("ARCHESTIMATOR_PUBLICATION_ACCESS_COOKIE_SECRET", "");

    expect(readPublicationTokenEncryptionSecret).toThrow("PUBLICATION_TOKEN_ENCRYPTION_SECRET is required in production.");
    expect(readPublicationTokenHashSecret).toThrow("PUBLICATION_TOKEN_HASH_SECRET is required in production.");
    expect(readPublicationAccessCookieSecret).toThrow("PUBLICATION_ACCESS_COOKIE_SECRET is required in production.");
  });
});
