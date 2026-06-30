import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  buildCloudflareWranglerAuthReport,
  writeMarkdown,
} from "../../scripts/check-cloudflare-wrangler-auth";

describe("Cloudflare Wrangler auth checker", () => {
  it("records unauthenticated Wrangler as a provider blocker without failing the local command evidence", () => {
    const report = buildCloudflareWranglerAuthReport({
      exitCode: 0,
      signal: null,
      timedOut: false,
      stdout: "\n ⛅️ wrangler 4.105.0\n────────────────────\nGetting User settings...\nYou are not authenticated. Please run `wrangler login`.\n",
      stderr: "",
    }, "2026-06-30T00:00:00.000Z");

    expect(report.readiness.wranglerCliAvailable).toBe(true);
    expect(report.readiness.wranglerAuthCheckCompleted).toBe(true);
    expect(report.readiness.wranglerApiAuthenticated).toBe(false);
    expect(report.readiness.providerReadbackReady).toBe(false);
    expect(report.auth.notAuthenticatedReason).toBe("wrangler-login-required");
    expect(report.blockers).toContain("Wrangler is not authenticated; run `wrangler login` or provide a scoped token outside the repo.");
  });

  it("marks provider readback ready when whoami output contains authenticated account evidence", () => {
    const report = buildCloudflareWranglerAuthReport({
      exitCode: 0,
      signal: null,
      timedOut: false,
      stdout: `
 ⛅️ wrangler 4.105.0
────────────────────
Getting User settings...
You are logged in with an OAuth Token
Email: owner@example.com
Account Name: Philipjonlewis@gmail.com's Account
Account ID: 7f6229cfea61b59f6f48b517fde86039
`,
      stderr: "",
    }, "2026-06-30T00:00:00.000Z");

    expect(report.auth.authenticated).toBe(true);
    expect(report.auth.method).toBe("oauth");
    expect(report.auth.accountEmailPresent).toBe(true);
    expect(report.auth.accountNames).toEqual(["Philipjonlewis@gmail.com's Account"]);
    expect(report.auth.accountIds).toEqual(["7f6229cfea61b59f6f48b517fde86039"]);
    expect(report.readiness.wranglerApiAuthenticated).toBe(true);
    expect(report.readiness.providerReadbackReady).toBe(true);
    expect(report.readiness.productionDeployReady).toBe(false);
  });

  it("writes markdown without copying secret-looking command output", () => {
    const report = buildCloudflareWranglerAuthReport({
      exitCode: 0,
      signal: null,
      timedOut: false,
      stdout: `
 ⛅️ wrangler 4.105.0
You are logged in with an API Token abc123-do-not-leak
Authorization: Bearer do-not-leak-this-token
Account Name: Example
Account ID: 123
`,
      stderr: "secret=do-not-leak-this-secret",
    }, "2026-06-30T00:00:00.000Z");
    const dir = mkdtempSync(join(tmpdir(), "cloudflare-wrangler-auth-"));
    try {
      const file = join(dir, "auth.md");
      writeMarkdown(report, file);
      const markdown = readFileSync(file, "utf8");
      expect(markdown).toContain("Cloudflare Wrangler Auth Readiness");
      expect(markdown).toContain("Account ID");
      expect(markdown).not.toContain("abc123-do-not-leak");
      expect(markdown).not.toContain("do-not-leak-this-token");
      expect(markdown).not.toContain("do-not-leak-this-secret");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
