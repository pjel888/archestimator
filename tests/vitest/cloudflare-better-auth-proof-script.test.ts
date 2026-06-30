import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  buildCloudflareBetterAuthProof,
  generateLocalBetterAuthD1SchemaSqlProof,
  writeMarkdown,
} from "../../scripts/generate-cloudflare-better-auth-proof";

const SCAFFOLD_SOURCE = `
import { betterAuth } from "better-auth";
import { getMigrations } from "better-auth/db/migration";
import { toNextJsHandler } from "better-auth/next-js";

export const BETTER_AUTH_CLOUDFLARE_BASE_PATH = "/api/auth";
type CloudflareD1DatabaseOption = unknown;

export function createCloudflareBetterAuthForD1(options: { d1Database: CloudflareD1DatabaseOption }) {
  return betterAuth({ database: options.d1Database });
}

export function createCloudflareBetterAuthNextHandlers(options: { d1Database: CloudflareD1DatabaseOption }) {
  return toNextJsHandler(createCloudflareBetterAuthForD1(options));
}

export async function compileCloudflareBetterAuthD1Migrations(options: { d1Database: CloudflareD1DatabaseOption }) {
  const migrations = await getMigrations({ database: options.d1Database });
  return migrations.compileMigrations();
}

export async function requireUserForBetterAuthRouteGate(auth: { api: { getSession: Function } }, headers: Headers) {
  return auth.api.getSession({ headers, query: { disableCookieCache: true } });
}
`;

const GUARDED_NEXT_ROUTE_SOURCE = `
import { NextResponse } from "next/server";
import { createCloudflareBetterAuthNextHandlers } from "@/lib/auth/better-auth-cloudflare";

function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status, headers: { "Cache-Control": "private, no-cache, no-store" } });
}

async function loadCloudflareBetterAuthContext() {
  const { getCloudflareContext } = await import("@opennextjs/cloudflare");
  return getCloudflareContext({ async: true });
}

async function createHandlers(request: Request) {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) return jsonError("Better Auth route is not configured.", 503);
  const context = await loadCloudflareBetterAuthContext();
  const d1Database = context.env.ARCH_DB;
  if (!d1Database) return jsonError("Better Auth D1 binding is not available.", 503);
  return createCloudflareBetterAuthNextHandlers({ d1Database, baseURL: new URL(request.url).origin, secret });
}

export async function GET(request: Request) {
  const handlers = await createHandlers(request);
  return handlers instanceof Response ? handlers : handlers.GET(request);
}

export async function POST(request: Request) {
  const handlers = await createHandlers(request);
  return handlers instanceof Response ? handlers : handlers.POST(request);
}
`;

const ROUTE_GATE_HELPER_TEST_SOURCE = `
import { createRequire } from "node:module";
import { makeSignature } from "better-auth/crypto";
import { getBetterAuthRouteGateSession, requireUserForBetterAuthRouteGate } from "@/lib/auth/better-auth-cloudflare";
import { createCloudflareBetterAuthForD1 } from "@/lib/auth/better-auth-cloudflare";

it("requests uncached session and fails closed", async () => {
  expect(await getBetterAuthRouteGateSession(auth, headers)).toEqual(session);
  expect(auth.api.getSession).toHaveBeenCalledWith({ headers, query: { disableCookieCache: true } });
  await expect(requireUserForBetterAuthRouteGate(missingAuth, headers)).resolves.toEqual({ ok: false, reason: "missing-session" });
  await expect(requireUserForBetterAuthRouteGate(auth, headers)).resolves.toEqual({ ok: true, session });
});

it("accepts D1-backed signed cookie session fixtures", async () => {
  const requireRuntime = createRequire(import.meta.url);
  requireRuntime("node:sqlite");
  const auth = await createCloudflareBetterAuthForD1({ d1Database });
  const signature = await makeSignature("session-token-fixture", secret);
  const headers = new Headers({ cookie: "better-auth.session_token=session-token-fixture." + signature });
  const expiresAt = new Date("2026-07-30T00:00:00.000Z");
  await expect(requireUserForBetterAuthRouteGate(auth, headers)).resolves.toEqual({ ok: true, session });
  await expect(requireUserForBetterAuthRouteGate(auth, expiredHeaders)).resolves.toEqual({ ok: false, reason: "missing-session" });
});
`;

const SCHEMA_SQL_PROOF = {
  generated: true,
  staticReviewReady: true,
  statementCount: 7,
  byteLength: 1253,
  sha256: "proof-sha",
  tableNames: ["account", "session", "user", "verification"],
  indexNames: ["account_userId_idx", "session_userId_idx", "verification_identifier_idx"],
  expectedCoreTablesPresent: true,
  expectedIndexesPresent: true,
  source: "local-empty-d1-binding" as const,
  sql: "create table \"user\" (\"id\" text not null primary key, \"email\" text not null unique, \"token\" text not null unique, \"userId\" text references \"user\" (\"id\") on delete cascade);",
  error: null,
};

function proofInputs() {
  return {
    generatedAt: "2026-06-30T00:00:00.000Z",
    packageJsonText: JSON.stringify({
      dependencies: {
        "better-auth": "1.6.22",
      },
    }),
    wranglerConfigText: JSON.stringify({
      d1_databases: [{ binding: "ARCH_DB", database_name: "archestimator-proof", database_id: "proof-id" }],
    }),
    generatedTypesText: `
      interface __BaseEnv_CloudflareEnv {
        ARCH_DB: D1Database;
      }
    `,
    sourceFileTextByPath: {
      "src/lib/auth/better-auth-cloudflare.ts": SCAFFOLD_SOURCE,
      "src/lib/auth/request-proxy.ts": "await supabase.auth.getClaims(); import '@supabase/ssr';",
      "src/lib/auth/session.ts": "await supabase.auth.getUser();",
      "src/app/auth/callback/route.ts": "await supabase.auth.exchangeCodeForSession(code);",
      "src/lib/auth/actions.ts": "await supabase.auth.signInWithOtp({ email }); await supabase.auth.signOut();",
      "tests/vitest/cloudflare-better-auth-route-gate.test.ts": ROUTE_GATE_HELPER_TEST_SOURCE,
    },
    schemaSqlProof: SCHEMA_SQL_PROOF,
    sources: {
      packageJson: "package.json",
      wranglerConfig: "wrangler.jsonc",
      generatedTypes: "cloudflare-env.d.ts",
      schemaSql: "evidence/proof.sql",
      scaffoldFiles: ["src/lib/auth/better-auth-cloudflare.ts"],
      testFiles: [
        "tests/vitest/cloudflare-better-auth-route.test.ts",
        "tests/vitest/cloudflare-better-auth-route-gate.test.ts",
      ],
      currentSupabaseGateFiles: [
        "src/lib/auth/request-proxy.ts",
        "src/lib/auth/session.ts",
        "src/app/auth/callback/route.ts",
        "src/lib/auth/actions.ts",
      ],
    },
  };
}

describe("Cloudflare Better Auth proof generator", () => {
  it("generates and statically reviews Better Auth D1 schema SQL locally", async () => {
    const proof = await generateLocalBetterAuthD1SchemaSqlProof();

    expect(proof.generated).toBe(true);
    expect(proof.staticReviewReady).toBe(true);
    expect(proof.statementCount).toBe(7);
    expect(proof.tableNames).toEqual(["account", "session", "user", "verification"]);
    expect(proof.indexNames).toEqual(["account_userId_idx", "session_userId_idx", "verification_identifier_idx"]);
    expect(proof.sql).toContain('create table "user"');
    expect(proof.sql).toContain('create index "session_userId_idx"');
  });

  it("marks the local D1 route-gate scaffold ready without overclaiming production auth", () => {
    const report = buildCloudflareBetterAuthProof(proofInputs());

    expect(report.manifestSummary.betterAuthVersion).toBe("1.6.22");
    expect(report.readiness).toMatchObject({
      betterAuthDependencyPresent: true,
      d1BindingReady: true,
      d1DatabaseAdapterPatternReady: true,
      nextRouteHandlerPatternReady: true,
      secureServerSessionCheckPatternReady: true,
      migrationCompilationHelperReady: true,
      routeGateHelperTestCoverageReady: true,
      routeGateD1SessionFixtureReady: true,
      betterAuthD1SchemaSqlGenerated: true,
      betterAuthD1SchemaSqlReviewReady: true,
      routeGateParityMatrixReady: true,
      currentSupabaseGatePreserved: true,
      localBetterAuthRouteGateProofReady: true,
      productionBetterAuthReady: false,
    });
    expect(report.scaffoldSummary.actualNextRouteMounted).toBe(false);
    expect(report.productionCutoverBlockers).toEqual(
      expect.arrayContaining([
        expect.stringContaining("/api/auth/[...all] route is intentionally not mounted"),
      ]),
    );
    expect(report.providerBacked).toBe(false);
  });

  it("detects the guarded Next route mount without overclaiming production replacement", () => {
    const inputs = proofInputs();
    inputs.sourceFileTextByPath["src/app/api/auth/[...all]/route.ts"] = GUARDED_NEXT_ROUTE_SOURCE;
    const report = buildCloudflareBetterAuthProof(inputs);

    expect(report.scaffoldSummary.actualNextRouteMounted).toBe(true);
    expect(report.readiness.localBetterAuthRouteGateProofReady).toBe(true);
    expect(report.readiness.productionBetterAuthReady).toBe(false);
    expect(report.productionCutoverBlockers).not.toEqual(
      expect.arrayContaining([
        expect.stringContaining("/api/auth/[...all] route is intentionally not mounted"),
      ]),
    );
    expect(report.productionCutoverBlockers).toEqual(
      expect.arrayContaining([
        expect.stringContaining("D1 schema SQL is generated and statically reviewed locally"),
        expect.stringContaining("has not been applied to hosted D1"),
        expect.stringContaining("secret rotation"),
        expect.stringContaining("Supabase callback/actions/session helpers"),
        expect.stringContaining("local Better Auth helper denial/success behavior"),
        expect.stringContaining("D1-backed signed-cookie session fixtures"),
        expect.stringContaining("provider-backed callback/session cutover tests"),
      ]),
    );
    expect(report.note).toContain("fails closed without a Better Auth secret and ARCH_DB binding");
  });

  it("writes markdown without copying secret-looking source text", () => {
    const inputs = proofInputs();
    inputs.sourceFileTextByPath["src/lib/auth/better-auth-cloudflare.ts"] += "\nconst secret = 'do-not-leak-this-token';";
    const report = buildCloudflareBetterAuthProof(inputs);
    const dir = mkdtempSync(join(tmpdir(), "cloudflare-better-auth-proof-"));
    try {
      const file = join(dir, "proof.md");
      writeMarkdown(report, file);
      const markdown = readFileSync(file, "utf8");
      expect(markdown).toContain("Cloudflare Better Auth D1 Route-Gate Proof");
      expect(markdown).toContain("Local Better Auth route-gate proof ready");
      expect(markdown).not.toContain("do-not-leak-this-token");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
