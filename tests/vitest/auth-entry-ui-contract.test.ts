import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const loginSource = readFileSync(
  join(process.cwd(), "src/app/login/page.tsx"),
  "utf8",
);
const loginFormSource = readFileSync(
  join(process.cwd(), "src/components/auth/LoginForm.tsx"),
  "utf8",
);
const privacySource = readFileSync(
  join(process.cwd(), "src/app/privacy/page.tsx"),
  "utf8",
);
const termsSource = readFileSync(
  join(process.cwd(), "src/app/terms/page.tsx"),
  "utf8",
);
const termsContentSource = readFileSync(
  join(process.cwd(), "src/lib/legal/terms-content.ts"),
  "utf8",
);
const loginSurfaceSource = [loginSource, loginFormSource].join("\n");

describe("/login auth entry UI contract", () => {
  it("does not expose password UI or internal admin-only copy", () => {
    expect(loginSurfaceSource).not.toMatch(/type=["']password["']/i);
    expect(loginSurfaceSource).not.toMatch(/password reset|forgot password/i);
    expect(loginSurfaceSource).not.toMatch(/CEO|founder|platform admin/i);
  });

  it("presents Google as primary and email link as fallback", () => {
    expect(loginSurfaceSource).toMatch(/Continue with Google/);
    expect(loginSurfaceSource).toMatch(/Email me a sign-in link/);
    expect(loginSurfaceSource).toMatch(/signInWithGoogle/);
    expect(loginSurfaceSource).toMatch(/signInWithEmail/);
  });

  it("links to truthful privacy and terms surfaces", () => {
    expect(loginSurfaceSource).toMatch(/href=["']\/privacy["']/);
    expect(loginSurfaceSource).toMatch(/href=["']\/terms["']/);
    expect(loginSurfaceSource).not.toMatch(/terms status|privacy status/);
    expect(privacySource).toMatch(/closed beta privacy notice/i);
    expect(privacySource).toMatch(/account email/i);
    expect(privacySource).toMatch(/project and estimate data/i);
    expect(privacySource).toMatch(/support@archestimator\.com/i);
    expect(termsSource).toMatch(/closed beta terms/i);
    expect(termsSource).toMatch(/invite-only professional\/business beta use/i);
    expect(termsContentSource).toMatch(/software tool/i);
    expect(termsSource + termsContentSource).toMatch(/raw IP address and raw user-agent strings are not stored/i);
  });

  it("does not echo submitted email addresses in the success query state", () => {
    expect(loginSource).not.toMatch(/params\.email/);
    expect(loginSource).not.toMatch(/searchParams\.email/);
  });
});
