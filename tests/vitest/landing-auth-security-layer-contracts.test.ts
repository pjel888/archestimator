import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function readProjectFile(path: string) {
  return readFileSync(join(root, path), "utf8");
}

describe("Landing-Page-Auth-Security-Layer contracts", () => {
  it("hashes magic-link tokens at rest in production and proof configs (SEC-1)", () => {
    const production = readProjectFile("src/lib/auth/better-auth-cloudflare.ts");
    const proof = readProjectFile("src/lib/cloudflare/better-auth-proof-router.ts");

    expect(production).toContain('storeToken: "hashed"');
    expect(production).toMatch(/expiresIn:\s*300/);
    expect(production).toMatch(/rateLimit:\s*\{[\s\S]*window:\s*60[\s\S]*max:\s*10/);
    expect(proof).toContain('storeToken: "hashed"');
    expect(proof).not.toContain('storeToken: "plain"');
  });

  it("enables durable Better Auth rate limits and explicit account linking (SEC-5/SEC-14)", () => {
    const production = readProjectFile("src/lib/auth/better-auth-cloudflare.ts");

    expect(production).toMatch(/rateLimit:\s*\{[\s\S]*enabled:\s*true/);
    expect(production).toMatch(/storage:\s*"database"/);
    expect(production).toMatch(/window:\s*60/);
    expect(production).toMatch(/max:\s*60/);
    expect(production).toContain("accountLinking");
    expect(production).toContain("disableImplicitLinking: true");
    expect(production).toContain("allowDifferentEmails: false");
    expect(production).toContain('trustedProviders: ["google"]');
    expect(production).toContain("requireLocalEmailVerified: true");
  });

  it("keeps auth-method exclusivity to Google OAuth + magic link (ARCH-1)", () => {
    const production = readProjectFile("src/lib/auth/better-auth-cloudflare.ts");
    const authActions = readProjectFile("src/lib/auth/actions.ts");
    const loginForm = readProjectFile("src/components/auth/LoginForm.tsx");

    expect(production).not.toContain("emailAndPassword");
    expect(authActions).not.toContain("/api/auth/sign-in/email");
    expect(authActions).toContain("/api/auth/sign-in/magic-link");
    expect(authActions).toContain("/api/auth/sign-in/social");
    expect(loginForm).not.toMatch(/type=["']password["']/);
  });

  it("requires action-layer auth on loadRecipientProposals (SEC-4)", () => {
    const actions = readProjectFile("src/lib/recipient-proposals/actions.ts");
    expect(actions).toContain("requireCurrentUserContext");
    expect(actions).toMatch(/await\s+requireCurrentUserContext\s*\(/);
  });

  it("fail-closes project estimate sheet repository reads behind project access (SEC-3)", () => {
    const sheets = readProjectFile("src/lib/repositories/project-estimate-sheets-repository.ts");
    expect(sheets).toContain("requireCurrentUserContext");
    expect(sheets).toContain("canAccessProjectInD1");
  });

  it("separates terms-gate secret from BETTER_AUTH_SECRET fallback (SEC-13)", () => {
    const termsGate = readProjectFile("src/lib/legal/terms-gate-cookie.ts");
    const envExample = readProjectFile(".env.example");

    expect(termsGate).toContain("ARCHESTIMATOR_TERMS_GATE_SECRET");
    expect(termsGate).not.toMatch(/process\.env\.BETTER_AUTH_SECRET/);
    expect(termsGate).not.toMatch(/process\.env\.PUBLICATION_ACCESS_COOKIE_SECRET/);
    expect(envExample).toContain("ARCHESTIMATOR_TERMS_GATE_SECRET=");
    expect(envExample).toMatch(/required|do not fall back|no fallback/i);
  });

  it("documents session-token-at-rest compensating controls (SEC-11)", () => {
    const production = readProjectFile("src/lib/auth/better-auth-cloudflare.ts");
    expect(production).toContain("SEC-11");
    expect(production).toContain("cookieCache");
    expect(production).toMatch(/expiresIn:\s*60\s*\*\s*60\s*\*\s*24\s*\*\s*7|expiresIn:\s*604800/);
  });

  it("keeps protected workshop prefix and public allowlist fail-closed (SEC-2)", () => {
    const proxy = readProjectFile("src/lib/auth/request-proxy.ts");
    expect(proxy).toContain('PROTECTED_PREFIXES = ["/workshop"]');
    expect(proxy).toContain("LOGIN_PATH");
    expect(proxy).toContain("/access-required");
    expect(proxy).toContain("hasBetterAuthSessionCookie");
  });

  it("routes project chart/activity/location/data reads through workspace authz (SEC-3)", () => {
    const charts = readProjectFile("src/lib/repositories/project-charts-repository.ts");
    const activity = readProjectFile("src/lib/repositories/project-activity-repository.ts");
    const location = readProjectFile("src/lib/repositories/project-location-repository.ts");
    const data = readProjectFile("src/lib/repositories/project-data-repository.ts");
    const workspace = readProjectFile("src/lib/repositories/workspace-repository.ts");

    expect(charts).toContain("getCurrentWorkspaceProject");
    expect(activity).toContain("getCurrentWorkspaceProject");
    expect(location).toContain("getCurrentWorkspaceProject");
    expect(data).toContain("listProjectEstimates");
    expect(workspace).toContain("canAccessWholeProjectInD1");
    expect(workspace).toContain("requireCurrentUserContext");
  });

  it("keeps recipient proposals repository fail-closed on missing session (SEC-3 audit)", () => {
    const repo = readProjectFile("src/lib/repositories/recipient-proposals-repository.ts");
    expect(repo).toContain("getCurrentUserContext");
    expect(repo).toContain('error: "unauthorized"');
  });

  it("documents Better Auth core schema readiness contract without committed DDL (SEC-7)", () => {
    const readiness = readProjectFile("scripts/check-cloudflare-d1-auth-realtime-readiness.ts");
    const proof = readProjectFile("scripts/generate-cloudflare-better-auth-proof.ts");
    expect(readiness).toContain("schemaSqlReady");
    expect(proof).toContain('EXPECTED_SCHEMA_TABLES');
    expect(proof).toContain('"verification"');
    expect(proof).toContain('"session"');
  });


  it("commits Better Auth rateLimit D1 table for durable SEC-5 storage", () => {
    const migration = readProjectFile("migrations/0041_better_auth_rate_limit.sql");
    const proof = readProjectFile("src/lib/cloudflare/better-auth-proof-router.ts");
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS "rateLimit"');
    expect(migration).toContain('"lastRequest"');
    expect(proof).toContain('"rateLimit"');
    expect(proof).toContain('CREATE TABLE IF NOT EXISTS "rateLimit"');
  });

  it("signs out through Better Auth so D1 session rows are deleted (SEC-10)", () => {
    const actions = readProjectFile("src/lib/auth/actions.ts");
    expect(actions).toContain("/api/auth/sign-out");
    expect(actions).toContain("signOut");
  });

});
