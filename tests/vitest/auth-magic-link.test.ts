import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DEV_AUTH_BYPASS_SECRET_HEADER, isDevAdminDatabaseBypassEnabled, isDevAdminDatabaseBypassRequest, isDevAuthBypassCredentialValid, isDevAuthBypassRequest, isLocalDevHostname } from "@/lib/auth/dev-auth-gate";

const root = process.cwd();

function readProjectFile(path: string) {
  return readFileSync(join(root, path), "utf8");
}

describe("magic-link auth callback", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses a route handler so Supabase session cookies can be written before redirect", () => {
    const callbackRoute = readProjectFile("src/app/auth/callback/route.ts");

    expect(callbackRoute).toContain("export async function GET");
    expect(callbackRoute).toContain("exchangeCodeForSession(code)");
    expect(callbackRoute).toContain("NextResponse.redirect");
    expect(callbackRoute).toContain("callback_missing_code");
  });

  it("keeps magic-link redirects pointed at the callback route with sanitized next path", () => {
    const authActions = readProjectFile("src/lib/auth/actions.ts");

    expect(authActions).toContain("signInWithOtp");
    expect(authActions).toContain("emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`");
    expect(authActions).toContain("sanitizeNextPath");
  });

  it("supports Google OAuth through the same callback route while keeping email as fallback", () => {
    const authActions = readProjectFile("src/lib/auth/actions.ts");
    const loginPage = readProjectFile("src/app/login/page.tsx");
    const loginForm = readProjectFile("src/components/auth/LoginForm.tsx");
    const loginSurface = `${loginPage}\n${loginForm}`;

    expect(authActions).toContain("signInWithGoogle");
    expect(authActions).toContain("signInWithOAuth");
    expect(authActions).toContain('provider: "google"');
    expect(authActions).toContain("redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`");
    expect(loginSurface).toContain("Continue with Google");
    expect(loginSurface).toContain("signInWithGoogle");
    expect(loginSurface).toContain("signInWithEmail");
  });

  it("keeps the local dev auth bypass explicit, localhost-gated, and server-only", () => {
    const devAuthGate = readProjectFile("src/lib/auth/dev-auth-gate.ts");
    const devAuth = readProjectFile("src/lib/auth/dev-auth.ts");
    const proxy = readProjectFile("src/proxy.ts");
    const session = readProjectFile("src/lib/auth/session.ts");
    const serverClient = readProjectFile("src/lib/supabase/server.ts");
    const envExample = readProjectFile(".env.example");

    expect(devAuthGate).toContain('process.env.NODE_ENV !== "production"');
    expect(devAuthGate).toContain('normalizedHostname === "localhost"');
    expect(devAuthGate).toContain('normalizedHostname === "127.0.0.1"');
    expect(devAuthGate).toContain('normalizedHostname === "::1"');
    expect(devAuthGate).toContain("DEV_AUTH_ADMIN_DB_FLAG");
    expect(devAuth).toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(devAuth).toContain("persistSession: false");
    expect(devAuth).toContain("getDevCurrentUserContext");
    expect(proxy).toContain("getDevAuthBypassCredentialFromRequestParts(request.headers, request.cookies)");
    expect(proxy).toContain("isDevAuthBypassRequest(request.nextUrl.hostname, devAuthBypassCredential)");
    expect(session).toContain("getDevCurrentUserContext()");
    expect(devAuth).toContain("headers");
    expect(devAuth).toContain("getDevAuthBypassCredentialFromRequestParts(requestHeaders, await cookies())");
    expect(devAuth).toContain("isDevAuthBypassRequest(hostHeader, devAuthBypassCredential)");
    expect(serverClient).toContain("headers");
    expect(serverClient).toContain("isDevAdminDatabaseBypassRequest(hostHeader, devAuthBypassCredential)");
    expect(envExample).toContain("ARCHESTIMATOR_DEV_AUTH_BYPASS=0");
    expect(envExample).toContain("ARCHESTIMATOR_DEV_AUTH_ADMIN_DB=0");
    expect(envExample).toContain("ARCHESTIMATOR_DEV_AUTH_BYPASS_SECRET=");
  });

  it("requires explicit local-only flags for dev auth and admin database bypasses", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("ARCHESTIMATOR_DEV_AUTH_BYPASS", "1");
    vi.stubEnv("ARCHESTIMATOR_DEV_AUTH_BYPASS_SECRET", "local-dev-secret-with-at-least-32-chars");

    expect(isLocalDevHostname("localhost")).toBe(true);
    expect(isLocalDevHostname("127.0.0.1")).toBe(true);
    expect(isLocalDevHostname("[::1]")).toBe(true);
    expect(isLocalDevHostname("project.localhost")).toBe(true);
    expect(isLocalDevHostname("example.com")).toBe(false);
    expect(isDevAuthBypassCredentialValid("local-dev-secret-with-at-least-32-chars")).toBe(true);
    expect(isDevAuthBypassRequest("localhost", null)).toBe(false);
    expect(isDevAuthBypassRequest("localhost", "wrong-secret")).toBe(false);
    expect(isDevAuthBypassRequest("localhost", "local-dev-secret-with-at-least-32-chars")).toBe(true);
    expect(isDevAuthBypassRequest("example.com", "local-dev-secret-with-at-least-32-chars")).toBe(false);
    expect(isDevAdminDatabaseBypassEnabled()).toBe(false);

    vi.stubEnv("ARCHESTIMATOR_DEV_AUTH_ADMIN_DB", "1");
    expect(isDevAdminDatabaseBypassEnabled()).toBe(true);
    expect(isDevAdminDatabaseBypassRequest("localhost", "local-dev-secret-with-at-least-32-chars")).toBe(true);
    expect(isDevAdminDatabaseBypassRequest("example.com", "local-dev-secret-with-at-least-32-chars")).toBe(false);

    vi.stubEnv("NODE_ENV", "production");
    expect(isDevAuthBypassRequest("localhost", "local-dev-secret-with-at-least-32-chars")).toBe(false);
    expect(isDevAdminDatabaseBypassEnabled()).toBe(false);
    expect(DEV_AUTH_BYPASS_SECRET_HEADER).toBe("x-archestimator-dev-auth-bypass");
  });
});
