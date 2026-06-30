import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  appRouteFromFile,
  buildCloudflareMigrationInventory,
  classifyPackageScript,
  extractRpcNames,
  writeMarkdown,
} from "../../scripts/generate-cloudflare-migration-inventory";

const PACKAGE_JSON = JSON.stringify({
  scripts: {
    "cf:build": "opennextjs-cloudflare build",
    "cf:inventory": "bun run scripts/generate-cloudflare-migration-inventory.ts",
    "launch:check-vercel-env": "bun run scripts/check-vercel-env-readiness.ts",
    "prove:upload": "node scripts/prove-upload-provider-postgres.mjs",
    "perf:measure-routes": "bun run scripts/measure-route-transitions.ts",
    test: "vitest run",
  },
});

function fixtureInventory() {
  return buildCloudflareMigrationInventory({
    generatedAt: "2026-06-30T00:00:00.000Z",
    appFiles: [
      "src/app/page.tsx",
      "src/app/workshop/page.tsx",
      "src/app/api/share/[token]/route.ts",
      "src/app/sitemap.ts",
      "src/app/not-found.tsx",
    ],
    sourceFileTextByPath: {
      "src/app/page.tsx": "export default function Page() { return null }",
      "src/app/workshop/page.tsx": "import { createServerClient } from '@supabase/ssr'; export const x = createServerClient;",
      "src/app/api/share/[token]/route.ts": "await supabase.rpc('increment_project_publication_open', {});",
      "src/app/sitemap.ts": "export default function sitemap() { return [] }",
      "src/lib/uploads/storage-provider.ts": "await supabase.storage.from(bucket).download(path);",
      "src/hooks/use-project-presence.ts": "client.channel(topic, { config: { private: true } });",
      "src/lib/email/resend-webhooks.ts": "import { Resend } from 'resend'; const resend = new Resend('test');",
    },
    packageJsonText: PACKAGE_JSON,
    scriptFiles: [
      "scripts/generate-cloudflare-migration-inventory.ts",
      "scripts/check-vercel-env-readiness.ts",
      "scripts/prove-upload-provider-postgres.mjs",
    ],
    sqlFileTextByPath: {
      "supabase/migrations/20260101000000_test.sql": "create or replace function public.test() returns void language sql as $$ select 1 $$; create policy p on t using (auth.uid() is not null);",
      "supabase/migrations-pending-review/20260102000000_test.sql": "alter table public.t enable row level security;",
    },
  });
}

describe("Cloudflare migration inventory generator", () => {
  it("maps App Router files to routes without counting non-route files", () => {
    expect(appRouteFromFile("src/app/page.tsx")).toMatchObject({ route: "/", kind: "page", dynamic: false });
    expect(appRouteFromFile("src/app/api/share/[token]/route.ts")).toMatchObject({
      route: "/api/share/[token]",
      kind: "route-handler",
      dynamic: true,
    });
    expect(appRouteFromFile("src/app/sitemap.ts")).toMatchObject({ route: "/sitemap.xml", kind: "metadata-route" });
    expect(appRouteFromFile("src/app/not-found.tsx")).toBeNull();
  });

  it("extracts literal Supabase RPC names", () => {
    expect(extractRpcNames(`
      await supabase.rpc("can_edit_project", {});
      await client.rpc<'typed'>('create_upload_session', {});
      await supabase.rpc(dynamicName, {});
    `)).toEqual(["can_edit_project", "create_upload_session"]);
  });

  it("classifies migration-relevant package scripts", () => {
    expect(classifyPackageScript("cf:build", "opennextjs-cloudflare build")).toBe("cloudflare");
    expect(classifyPackageScript("launch:check-resend-readiness", "bun run scripts/check-resend-readiness.ts")).toBe(
      "provider-readiness",
    );
    expect(classifyPackageScript("prove:rls", "node scripts/prove-rls-postgres.mjs")).toBe("proof");
    expect(classifyPackageScript("perf:measure-routes", "bun run scripts/measure-route-transitions.ts")).toBe("performance");
  });

  it("builds a safe local inventory across routes, provider coupling, RPCs, scripts, and SQL", () => {
    const inventory = fixtureInventory();

    expect(inventory.mode).toBe("cloudflare-migration-inventory");
    expect(inventory.counts.appRoutes).toBe(4);
    expect(inventory.counts.providerCoupledFiles).toBe(5);
    expect(inventory.counts.distinctRpcNames).toBe(1);
    expect(inventory.counts.cloudflareScripts).toBe(2);
    expect(inventory.counts.providerReadinessScripts).toBe(1);
    expect(inventory.sqlInventory.appliedMigrationFiles).toBe(1);
    expect(inventory.sqlInventory.pendingReviewFiles).toBe(1);
    expect(inventory.sqlInventory.functionDeclarationMatches).toBe(1);
    expect(inventory.sqlInventory.rlsPolicyStorageAuthMatches).toBe(3);
    expect(inventory.providerCoupling.find((row) => row.file === "src/lib/uploads/storage-provider.ts")?.dependencies).toContain(
      "supabase-storage",
    );
    expect(inventory.rpcCalls).toEqual([
      { name: "increment_project_publication_open", callerFiles: ["src/app/api/share/[token]/route.ts"] },
    ]);
    expect(inventory.note).toContain("does not read env files");
  });

  it("keeps markdown evidence free of secret-like source values", () => {
    const inventory = buildCloudflareMigrationInventory({
      generatedAt: "2026-06-30T00:00:00.000Z",
      appFiles: ["src/app/api/internal/upload-scan/route.ts"],
      sourceFileTextByPath: {
        "src/app/api/internal/upload-scan/route.ts":
          "const secret = 'do-not-leak-this-value'; await supabase.rpc('record_upload_scan_result', {});",
      },
      packageJsonText: PACKAGE_JSON,
      scriptFiles: ["scripts/generate-cloudflare-migration-inventory.ts"],
      sqlFileTextByPath: {},
    });
    const dir = mkdtempSync(join(tmpdir(), "cloudflare-inventory-"));
    try {
      const file = join(dir, "inventory.md");
      writeMarkdown(inventory, file);
      const markdown = readFileSync(file, "utf8");
      expect(markdown).toContain("record_upload_scan_result");
      expect(markdown).not.toContain("do-not-leak-this-value");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("keeps the repository inventory generator wired to current Cloudflare scripts", () => {
    const inventory = buildCloudflareMigrationInventory({
      appFiles: ["src/app/api/health/route.ts"],
      sourceFileTextByPath: {
        "src/app/api/health/route.ts": readFileSync("src/app/api/health/route.ts", "utf8"),
      },
      packageJsonText: readFileSync("package.json", "utf8"),
      scriptFiles: ["scripts/generate-cloudflare-migration-inventory.ts"],
      sqlFileTextByPath: {},
    });

    expect(inventory.appRoutes).toContainEqual(expect.objectContaining({ route: "/api/health", kind: "route-handler" }));
    expect(inventory.packageScripts.map((script) => script.name)).toContain("cf:build");
    expect(inventory.packageScripts.map((script) => script.name)).toContain("cf:check-readiness");
  });
});
