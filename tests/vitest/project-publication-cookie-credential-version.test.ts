import { describe, expect, it } from "vitest";

import {
  createPublicationAccessCookie,
  createSharedLinkSessionCookie,
  createSharedLinkSessionCookieName,
  deriveCredentialVersion,
  hasPublicationAccessCookie,
  verifyPublicationAccessCookieValue,
  verifySharedLinkSessionCookieValue,
} from "@/lib/publication/security";

// ============================================================================
// AC-MOD-01 regression — access/session cookies bind to a password-derived
// credentialVersion, NOT snapshot_version.
//
// Root cause this pins against: republishProjectPublication bumps
// snapshot_version on every "Update shared page" (even content-only). When the
// cookies were bound to snapshot_version, a benign content republish silently
// evicted every in-session recipient (password re-prompt + lost "Reviewing as"
// identity). The fix derives credentialVersion purely from password_hash, so a
// content-only republish keeps cookies valid while a credential change (password
// enable/disable/change) still invalidates them.
//
// Decision/comment staleness remains protected independently by the RPC
// p_expected_snapshot_version optimistic locks — those are intentionally NOT
// covered here (they are not cookie-bound).
// ============================================================================

const ACCESS_SECRET = "credential-version-test-secret";

describe("deriveCredentialVersion", () => {
  it("returns the constant 'open' for a null/undefined/empty password hash", () => {
    expect(deriveCredentialVersion(null)).toBe("open");
    expect(deriveCredentialVersion(undefined)).toBe("open");
    expect(deriveCredentialVersion("")).toBe("open");
  });

  it("is stable for the same password hash", () => {
    const hash = "scrypt-sha256-v1:abc:def";
    expect(deriveCredentialVersion(hash)).toBe(deriveCredentialVersion(hash));
  });

  it("changes when the password hash changes (and differs from 'open')", () => {
    const a = deriveCredentialVersion("scrypt-sha256-v1:salt-a:hash-a");
    const b = deriveCredentialVersion("scrypt-sha256-v1:salt-b:hash-b");
    expect(a).not.toBe(b);
    expect(a).not.toBe("open");
    expect(b).not.toBe("open");
  });
});

describe("verifyPublicationAccessCookieValue — snapshot decoupling (AC-MOD-01)", () => {
  const token = "access-token";
  const publicationId = "pub-1";
  // Two distinct snapshot versions simulate a content-only republish.
  const credentialVersion = deriveCredentialVersion("scrypt-sha256-v1:salt:original");

  const cookieValue = (() => {
    const cookie = createPublicationAccessCookie(
      { token, publicationId, credentialVersion },
      { now: Date.parse("2026-06-13T00:00:00.000Z"), secret: ACCESS_SECRET },
    );
    return cookie.split(";")[0].split("=").slice(1).join("=");
  })();

  it("STILL verifies after a content-only snapshot republish (credentialVersion unchanged)", () => {
    // A republish bumps snapshot_version but leaves password_hash — hence
    // credentialVersion — untouched. The cookie must remain valid: recipients
    // are NOT evicted and the password is NOT re-prompted.
    expect(
      verifyPublicationAccessCookieValue(
        cookieValue,
        { token, publicationId, credentialVersion },
        { now: Date.parse("2026-06-13T01:00:00.000Z"), secret: ACCESS_SECRET },
      ),
    ).toBe(true);
  });

  it("FAILS when the credential changes (password enable/disable/change)", () => {
    const changedCredentialVersion = deriveCredentialVersion("scrypt-sha256-v1:salt:rotated");
    expect(changedCredentialVersion).not.toBe(credentialVersion);
    expect(
      verifyPublicationAccessCookieValue(
        cookieValue,
        { token, publicationId, credentialVersion: changedCredentialVersion },
        { now: Date.parse("2026-06-13T01:00:00.000Z"), secret: ACCESS_SECRET },
      ),
    ).toBe(false);
  });

  it("FAILS when a password is disabled entirely (hash → 'open')", () => {
    expect(
      verifyPublicationAccessCookieValue(
        cookieValue,
        { token, publicationId, credentialVersion: deriveCredentialVersion(null) },
        { now: Date.parse("2026-06-13T01:00:00.000Z"), secret: ACCESS_SECRET },
      ),
    ).toBe(false);
  });

  it("still rejects expired cookies (security intent preserved)", () => {
    expect(
      verifyPublicationAccessCookieValue(
        cookieValue,
        { token, publicationId, credentialVersion },
        { now: Date.parse("2026-06-15T00:00:00.000Z"), secret: ACCESS_SECRET },
      ),
    ).toBe(false);
  });

  it("still rejects a cookie verified under a different signing secret (tamper-evident)", () => {
    expect(
      verifyPublicationAccessCookieValue(
        cookieValue,
        { token, publicationId, credentialVersion },
        { now: Date.parse("2026-06-13T01:00:00.000Z"), secret: "a-different-secret" },
      ),
    ).toBe(false);
  });
});

describe("verifySharedLinkSessionCookieValue — recipient identity persists across republish (AC-MOD-01)", () => {
  const token = "session-token";
  const publicationId = "pub-2";
  const recipientId = "11111111-1111-1111-1111-111111111111";
  const credentialVersion = deriveCredentialVersion("scrypt-sha256-v1:salt:original");

  const sessionCookieValue = (() => {
    const cookie = createSharedLinkSessionCookie(
      { token, publicationId, credentialVersion, recipientId },
      { now: Date.parse("2026-06-13T00:00:00.000Z"), secret: ACCESS_SECRET },
    );
    const name = createSharedLinkSessionCookieName(token);
    return cookie.split(";")[0].slice(name.length + 1);
  })();

  it("KEEPS the 'Reviewing as' identity after a content-only republish (credentialVersion unchanged)", () => {
    expect(
      verifySharedLinkSessionCookieValue(
        sessionCookieValue,
        { token, publicationId, credentialVersion, recipientId },
        { now: Date.parse("2026-06-13T02:00:00.000Z"), secret: ACCESS_SECRET },
      ),
    ).toBe(true);
  });

  it("DROPS the session when the credential changes", () => {
    const changedCredentialVersion = deriveCredentialVersion("scrypt-sha256-v1:salt:rotated");
    expect(
      verifySharedLinkSessionCookieValue(
        sessionCookieValue,
        { token, publicationId, credentialVersion: changedCredentialVersion, recipientId },
        { now: Date.parse("2026-06-13T02:00:00.000Z"), secret: ACCESS_SECRET },
      ),
    ).toBe(false);
  });

  it("still rejects a mismatched recipient (security intent preserved)", () => {
    expect(
      verifySharedLinkSessionCookieValue(
        sessionCookieValue,
        {
          token,
          publicationId,
          credentialVersion,
          recipientId: "22222222-2222-2222-2222-222222222222",
        },
        { now: Date.parse("2026-06-13T02:00:00.000Z"), secret: ACCESS_SECRET },
      ),
    ).toBe(false);
  });
});

describe("hasPublicationAccessCookie — header-level decoupling (AC-MOD-01)", () => {
  it("matches by credentialVersion across a content republish, drops on credential change", () => {
    const token = "header-token";
    const publicationId = "pub-3";
    const credentialVersion = deriveCredentialVersion("scrypt-sha256-v1:salt:original");
    const cookie = createPublicationAccessCookie(
      { token, publicationId, credentialVersion },
      { now: Date.parse("2026-06-13T00:00:00.000Z"), secret: ACCESS_SECRET },
    );
    const cookiePair = cookie.split(";")[0];

    expect(
      hasPublicationAccessCookie(
        cookiePair,
        { token, publicationId, credentialVersion },
        { now: Date.parse("2026-06-13T01:00:00.000Z"), secret: ACCESS_SECRET },
      ),
    ).toBe(true);
    expect(
      hasPublicationAccessCookie(
        cookiePair,
        {
          token,
          publicationId,
          credentialVersion: deriveCredentialVersion("scrypt-sha256-v1:salt:rotated"),
        },
        { now: Date.parse("2026-06-13T01:00:00.000Z"), secret: ACCESS_SECRET },
      ),
    ).toBe(false);
  });
});
