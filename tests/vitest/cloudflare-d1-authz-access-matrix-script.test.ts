import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  buildCloudflareD1AuthzAccessMatrix,
  writeMarkdown,
} from "../../scripts/generate-cloudflare-d1-authz-access-matrix";

const source = <T>(value: T, path = "inventory.json") => ({
  source: path,
  present: true,
  value,
});

function fixtureInventory() {
  return {
    appRoutes: [
      {
        route: "/workshop/projects/[projectId]",
        file: "src/app/workshop/projects/[projectId]/page.tsx",
        kind: "page" as const,
        dynamic: true,
        providerDependencies: ["supabase-rpc"],
      },
    ],
    providerCoupling: [
      {
        file: "src/app/workshop/projects/[projectId]/page.tsx",
        route: "/workshop/projects/[projectId]",
        dependencies: ["supabase-rpc"],
        rpcNames: ["can_edit_project"],
      },
      {
        file: "src/lib/component-library/actions.ts",
        route: null,
        dependencies: ["supabase-rpc"],
        rpcNames: ["is_workspace_editor", "create_cost_library_component"],
      },
      {
        file: "src/lib/uploads/upload-records.ts",
        route: null,
        dependencies: ["supabase-rpc"],
        rpcNames: ["record_upload_asset"],
      },
      {
        file: "src/lib/email/resend-webhooks.ts",
        route: null,
        dependencies: ["resend-email"],
        rpcNames: [],
      },
    ],
  };
}

describe("Cloudflare D1 app-layer authorization access matrix", () => {
  it("maps current Supabase RPC/RLS access paths to required D1 app-layer checks and test evidence", () => {
    const report = buildCloudflareD1AuthzAccessMatrix({
      generatedAt: "2026-06-30T00:00:00.000Z",
      inventory: source(fixtureInventory()),
      sourceFileTextByPath: {
        "src/app/workshop/projects/[projectId]/page.tsx":
          'const { data } = await supabase.rpc("can_edit_project", { target_project_id: projectId });',
        "src/lib/component-library/actions.ts":
          'await supabase.rpc("is_workspace_editor", { target_workspace_id: workspaceId }); await supabase.rpc("create_cost_library_component", {});',
        "src/lib/uploads/upload-records.ts":
          'await client.rpc("record_upload_asset", { target_workspace_id: workspaceId });',
        "src/hooks/use-project-presence.ts":
          'createSupabaseBrowserClient().channel(`project:${projectId}`, { config: { private: true } });',
        "src/lib/publication/types.ts":
          "export type PublicationSummary = { workspaceId: string; projectId: string; uploadAssetId: string };",
        "src/lib/email/resend-webhooks.ts": "new Resend('do-not-leak');",
      },
      testFileTextByPath: {
        "tests/vitest/project-activity-page/route-contract.test.ts":
          'it("allows project editors and denies cross-workspace project access", () => { expect(source).toContain(\'rpc("can_edit_project"\'); });',
        "tests/vitest/component-library-folder-actions.test.ts":
          'it("allows workspace editors and blocks workspace viewers before any direct folder mutation path", () => { expect(rpc).toHaveBeenCalledWith("is_workspace_editor"); });',
        "tests/vitest/upload-scan-rpc-provider-proof-script.test.ts":
          'it("exercises checksum-bound scanner results", () => { expect(script).toContain(\'rpc("record_upload_asset"\'); });',
      },
      sources: {
        sourceRoots: ["src/app", "src/lib"],
        testRoots: ["tests/vitest"],
      },
    });

    expect(report.mode).toBe("cloudflare-d1-authz-access-matrix");
    expect(report.accessPathCount).toBe(3);
    expect(report.rows.map((row) => row.file)).not.toContain("src/lib/email/resend-webhooks.ts");
    expect(report.rows.map((row) => row.file)).not.toContain("src/hooks/use-project-presence.ts");
    expect(report.rows.map((row) => row.file)).not.toContain("src/lib/publication/types.ts");
    expect(report.positiveTestCount).toBe(3);
    expect(report.denialTestCount).toBe(2);
    expect(report.crossWorkspaceDenialTestCount).toBe(1);
    expect(report.allProtectedAccessPathsCovered).toBe(true);
    expect(report.routeActionCoverageReady).toBe(false);
    expect(report.crossWorkspaceDenialsReady).toBe(false);
    expect(report.blockers).toEqual(
      expect.arrayContaining([
        expect.stringContaining("lack a matching denial/fail-closed test reference"),
        expect.stringContaining("lack a matching cross-workspace denial reference"),
      ]),
    );
    expect(report.rows.find((row) => row.file === "src/app/workshop/projects/[projectId]/page.tsx")?.requiredD1Checks).toEqual(
      expect.arrayContaining([
        expect.stringContaining("D1 project edit guard"),
      ]),
    );
  });

  it("marks the matrix ready only when positive, denial, and cross-workspace refs cover every tenant-scoped path", () => {
    const report = buildCloudflareD1AuthzAccessMatrix({
      inventory: source({
        providerCoupling: [
          {
            file: "src/lib/projects/actions.ts",
            route: null,
            dependencies: ["supabase-rpc"],
            rpcNames: ["execute_bulk_delete_projects"],
          },
        ],
      }),
      sourceFileTextByPath: {
        "src/lib/projects/actions.ts":
          'await supabase.rpc("execute_bulk_delete_projects", { target_workspace_id: workspaceId });',
      },
      testFileTextByPath: {
        "tests/vitest/projects-actions-authz.test.ts":
          'it("allows owners and denies cross-workspace viewers for execute_bulk_delete_projects", () => {});',
      },
    });

    expect(report.allProtectedAccessPathsCovered).toBe(true);
    expect(report.routeActionCoverageReady).toBe(true);
    expect(report.crossWorkspaceDenialsReady).toBe(true);
    expect(report.blockers).toEqual([]);
  });

  it("does not require user-style cross-workspace refs for internal upload service operations", () => {
    const report = buildCloudflareD1AuthzAccessMatrix({
      inventory: source({
        providerCoupling: [],
      }),
      sourceFileTextByPath: {
        "src/lib/uploads/cleanup-job.ts":
          'client.from("upload_assets").select("*"); client.from("upload_sessions").select("*");',
      },
      testFileTextByPath: {
        "tests/vitest/upload-cleanup-route.test.ts":
          'it("blocks unauthorized cleanup job calls and returns cleanup-job success for src/lib/uploads/cleanup-job.ts authorized cron", () => {});',
      },
    });

    expect(report.accessPathCount).toBe(1);
    expect(report.routeActionCoverageReady).toBe(true);
    expect(report.crossWorkspaceDenialsReady).toBe(true);
    expect(report.rows[0]?.status).toBe("covered");
    expect(report.blockers).toEqual([]);
  });

  it("writes markdown without copying source or test secret-looking values", () => {
    const report = buildCloudflareD1AuthzAccessMatrix({
      generatedAt: "2026-06-30T00:00:00.000Z",
      inventory: source({
        providerCoupling: [
          {
            file: "src/lib/uploads/upload-records.ts",
            route: null,
            dependencies: ["supabase-rpc"],
            rpcNames: ["record_upload_asset"],
          },
        ],
      }),
      sourceFileTextByPath: {
        "src/lib/uploads/upload-records.ts":
          'const token = "do-not-leak-source-value"; await client.rpc("record_upload_asset", {});',
      },
      testFileTextByPath: {
        "tests/vitest/upload-scan-rpc-provider-proof-script.test.ts":
          'const token = "do-not-leak-test-value"; expect(script).toContain(\'rpc("record_upload_asset"\');',
      },
    });
    const dir = mkdtempSync(join(tmpdir(), "cloudflare-d1-authz-matrix-"));
    try {
      const file = join(dir, "matrix.md");
      writeMarkdown(report, file);
      const markdown = readFileSync(file, "utf8");
      expect(markdown).toContain("Cloudflare D1 App-Layer Authorization Access Matrix");
      expect(markdown).toContain("record_upload_asset");
      expect(markdown).not.toContain("do-not-leak-source-value");
      expect(markdown).not.toContain("do-not-leak-test-value");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
