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
const authSearchParamsStateSource = readFileSync(
  join(process.cwd(), "src/components/auth/AuthSearchParamsState.tsx"),
  "utf8",
);
const rootLayoutSource = readFileSync(
  join(process.cwd(), "src/app/layout.tsx"),
  "utf8",
);
const stateMismatchRecoverySource = readFileSync(
  join(process.cwd(), "src/components/auth/AuthStateMismatchRecoveryScript.tsx"),
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

  it("keeps the auth entry shell cacheable while resolving query-specific state on the client", () => {
    expect(loginSource).not.toContain('export const dynamic = "force-dynamic"');
    expect(loginSource).not.toContain("export const revalidate = 0");
    expect(loginSource).toContain("LoginFormFromSearchParams");
    expect(loginSource).toContain('<LoginForm next="/workshop" />');
    expect(authSearchParamsStateSource).toContain("useSearchParams");
    expect(authSearchParamsStateSource).toContain("sanitizeProtectedReturnPath");
  });

  it("keeps a root-shell fallback for stale client-side state mismatch URLs", () => {
    expect(rootLayoutSource).toContain("AuthStateMismatchRecoveryScript");
    expect(stateMismatchRecoverySource).toContain("sanitizeProtectedReturnPath");
    expect(stateMismatchRecoverySource).toContain("const hasStateMismatch");
    expect(stateMismatchRecoverySource).toContain('"error") === "state_mismatch"');
    expect(stateMismatchRecoverySource).toContain('"oauth_state_reset", "1"');
    expect(stateMismatchRecoverySource).toContain("window.location.replace");
    expect(stateMismatchRecoverySource).toContain("window.caches.delete");
  });
});
