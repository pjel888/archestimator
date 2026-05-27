import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const applySource = readFileSync("src/lib/ai/package-builder/apply.ts", "utf8");
const readToolsSource = readFileSync("src/lib/ai/package-builder/read-tools.ts", "utf8");
const routeSource = readFileSync("src/app/api/ai/package-builder/route.ts", "utf8");

describe("AI package-builder security contract", () => {
  it("keeps normal package-builder reads and writes off the service-role client", () => {
    expect(applySource).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(applySource).not.toContain("createClient<Database>");
    expect(readToolsSource).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(readToolsSource).not.toContain("createClient<Database>");
    expect(applySource).toContain("createSupabaseServerClient");
    expect(readToolsSource).toContain("ensureDefaultWorkspace");
  });

  it("derives workspace and user server-side before Apply writes", () => {
    expect(applySource).toContain("requireCurrentUserContext()");
    expect(applySource).toContain("ensureDefaultWorkspace()");
    expect(applySource).toContain("workspace.id !== input.userContext.workspaceId");
    expect(applySource).toContain("workspace_id: workspace.id");
    expect(applySource).toContain("created_by: currentUser.userId");
  });

  it("requires Supabase workspace auth and explicit Apply confirmation at the route boundary", () => {
    expect(routeSource).toContain("Package Apply requires an authenticated workspace.");
    expect(routeSource).toContain("parsePackageBuilderApplyRequest");
    expect(routeSource).toContain("confirmation");
    expect(routeSource).toContain("draftHash");
  });

  it("audits read tools with compact source table summaries", () => {
    expect(readToolsSource).toContain("buildAiPackageDataAccessEvent");
    expect(readToolsSource).toContain("search_component_library");
    expect(readToolsSource).toContain("search_estimate_templates");
    expect(readToolsSource).toContain("sourceTables");
    expect(readToolsSource).toContain("rowCount");
  });
});
