import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function readProjectFile(path: string) {
  return readFileSync(join(root, path), "utf8");
}

describe("magic-link auth callback", () => {
  it("uses a route handler so Supabase session cookies can be written before redirect", () => {
    const callbackRoute = readProjectFile("src/app/auth/callback/route.ts");

    expect(callbackRoute).toContain("export async function GET");
    expect(callbackRoute).toContain("exchangeCodeForSession(code)");
    expect(callbackRoute).toContain("NextResponse.redirect");
    expect(callbackRoute).toContain("Missing magic-link code");
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

    expect(authActions).toContain("signInWithGoogle");
    expect(authActions).toContain("signInWithOAuth");
    expect(authActions).toContain('provider: "google"');
    expect(authActions).toContain("redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`");
    expect(loginPage).toContain("Continue with Google");
    expect(loginPage).toContain("signInWithGoogle");
    expect(loginPage).toContain("signInWithEmail");
  });
});
