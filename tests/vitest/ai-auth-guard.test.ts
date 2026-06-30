import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const aiAuthSource = readFileSync("src/lib/ai/auth.ts", "utf8");

describe("AI auth guard", () => {
  it("rejects the admin DB bypass before resolving AI user context", () => {
    expect(aiAuthSource).toContain("isDevAdminDatabaseBypassRequest(hostHeader, devAuthBypassCredential)");
    expect(aiAuthSource.indexOf("isDevAdminDatabaseBypassRequest(hostHeader, devAuthBypassCredential)")).toBeLessThan(aiAuthSource.indexOf("isDevAuthBypassRequest(hostHeader, devAuthBypassCredential)"));
    expect(aiAuthSource).toContain("AI routes cannot use the local admin database bypass.");
  });

  it("does not call the dev Supabase admin client for AI dev auth context", () => {
    expect(aiAuthSource).not.toContain("createDevSupabaseAdminClient");
    expect(aiAuthSource).toContain("getDevAuthEmail()");
  });

  it("classifies AI auth mode for audit without making browser context authoritative", () => {
    expect(aiAuthSource).toContain("authMode: \"dev-bypass\"");
    expect(aiAuthSource).toContain("authMode: \"better-auth\"");
    expect(aiAuthSource).toContain("workspaceId: user.profile.default_workspace_id ?? null");
    expect(aiAuthSource).not.toContain("workspaceId: routeContext");
  });
});
