import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const loginSource = readFileSync(
  join(process.cwd(), "src/app/login/page.tsx"),
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

describe("/login auth entry UI contract", () => {
  it("does not expose password UI or internal admin-only copy", () => {
    expect(loginSource).not.toMatch(/type=["']password["']/i);
    expect(loginSource).not.toMatch(/password reset|forgot password/i);
    expect(loginSource).not.toMatch(/CEO|founder|platform admin/i);
  });

  it("presents Google as primary and email link as fallback", () => {
    expect(loginSource).toMatch(/Continue with Google/);
    expect(loginSource).toMatch(/Send sign-in link/);
    expect(loginSource).toMatch(/No password required/);
  });

  it("links to truthful privacy and terms surfaces", () => {
    expect(loginSource).toMatch(/href=["']\/privacy["']/);
    expect(loginSource).toMatch(/href=["']\/terms["']/);
    expect(privacySource).toMatch(/public self-serve launch is blocked/i);
    expect(termsSource).toMatch(/public self-serve launch is blocked/i);
  });

  it("does not echo submitted email addresses in the success query state", () => {
    expect(loginSource).not.toMatch(/params\.email/);
    expect(loginSource).not.toMatch(/searchParams\.email/);
  });
});
