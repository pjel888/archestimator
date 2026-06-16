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
    expect(aiAuthSource).toContain("authMode: \"supabase\"");
    expect(aiAuthSource).toContain("getRequiredCurrentUserContextResult()");
    expect(aiAuthSource).toContain("workspaceId: context.profile.default_workspace_id ?? null");
    expect(aiAuthSource).not.toContain("workspaceId: routeContext");
  });

  it("enforces current Terms acceptance through the shared auth helper", () => {
    expect(aiAuthSource).toContain("getRequiredCurrentUserContextResult()");
    expect(aiAuthSource).toContain('authResult.reason === "unauthenticated"');
    expect(aiAuthSource).toContain("AI routes require current Terms acceptance.");
    expect(aiAuthSource).not.toContain("createSupabaseServerClient");
    expect(aiAuthSource).not.toContain(".auth.getUser()");
  });
});
