#!/usr/bin/env bun

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import {
  BETTER_AUTH_ROUTE_GATE_PARITY_MATRIX,
  compileCloudflareBetterAuthD1Migrations,
} from "../src/lib/auth/better-auth-cloudflare";

type DocReference = {
  label: string;
  url: string;
};

type BetterAuthProofInputs = {
  generatedAt?: string;
  packageJsonText: string | null;
  wranglerConfigText: string | null;
  generatedTypesText: string | null;
  sourceFileTextByPath: Record<string, string>;
  schemaSqlProof?: BetterAuthD1SchemaSqlProof;
  sources?: Partial<CloudflareBetterAuthProofReport["sources"]>;
};

export type BetterAuthD1SchemaSqlProof = {
  generated: boolean;
  staticReviewReady: boolean;
  statementCount: number;
  byteLength: number;
  sha256: string | null;
  tableNames: string[];
  indexNames: string[];
  expectedCoreTablesPresent: boolean;
  expectedIndexesPresent: boolean;
  source: "local-empty-d1-binding";
  sql: string | null;
  error: string | null;
};

export type CloudflareBetterAuthProofReport = {
  generatedAt: string;
  mode: "cloudflare-better-auth-d1-route-gate-proof";
  sources: {
    packageJson: string | null;
    wranglerConfig: string | null;
    generatedTypes: string | null;
    scaffoldFiles: string[];
    currentSupabaseGateFiles: string[];
    nextRouteHandlerPath: string;
    testFiles: string[];
    schemaSql: string | null;
    docs: DocReference[];
  };
  manifestSummary: {
    betterAuthVersion: string | null;
    d1DatabaseBindings: string[];
    typedD1Bindings: string[];
  };
  scaffoldSummary: {
    betterAuthD1FactoryReady: boolean;
    nextRouteHandlerFactoryReady: boolean;
    actualNextRouteMounted: boolean;
    secureRouteGateSessionCheckReady: boolean;
    migrationCompilationHelperReady: boolean;
    routeGateHelperTestCoverageReady: boolean;
    routeGateD1SessionFixtureReady: boolean;
    routeGateParityRows: number;
    currentSupabaseGatePreserved: boolean;
  };
  schemaSqlSummary: BetterAuthD1SchemaSqlProof;
  readiness: {
    betterAuthDependencyPresent: boolean;
    d1BindingReady: boolean;
    d1DatabaseAdapterPatternReady: boolean;
    nextRouteHandlerPatternReady: boolean;
    secureServerSessionCheckPatternReady: boolean;
    migrationCompilationHelperReady: boolean;
    routeGateHelperTestCoverageReady: boolean;
    routeGateD1SessionFixtureReady: boolean;
    betterAuthD1SchemaSqlGenerated: boolean;
    betterAuthD1SchemaSqlReviewReady: boolean;
    routeGateParityMatrixReady: boolean;
    currentSupabaseGatePreserved: boolean;
    localBetterAuthRouteGateProofReady: boolean;
    productionBetterAuthReady: boolean;
  };
  routeGateParityMatrix: typeof BETTER_AUTH_ROUTE_GATE_PARITY_MATRIX;
  productionCutoverBlockers: string[];
  localOnly: true;
  providerBacked: false;
  blockers: string[];
  note: string;
};

const PLAN_ROOT = ".ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence";
const SCAFFOLD_FILE = "src/lib/auth/better-auth-cloudflare.ts";
const NEXT_ROUTE_HANDLER_PATH = "src/app/api/auth/[...all]/route.ts";
const DEFAULT_SCHEMA_SQL_FILE = `${PLAN_ROOT}/2026-06-30-cloudflare-better-auth-d1-schema.sql`;
const EXPECTED_SCHEMA_TABLES = ["account", "session", "user", "verification"] as const;
const EXPECTED_SCHEMA_INDEXES = ["account_userId_idx", "session_userId_idx", "verification_identifier_idx"] as const;
const CURRENT_SUPABASE_GATE_FILES = [
  "src/lib/auth/request-proxy.ts",
  "src/lib/auth/session.ts",
  "src/app/auth/callback/route.ts",
  "src/lib/auth/actions.ts",
];
const ROUTE_GATE_TEST_FILES = [
  "tests/vitest/cloudflare-better-auth-route.test.ts",
  "tests/vitest/cloudflare-better-auth-route-gate.test.ts",
];
const DOCS: DocReference[] = [
  { label: "Better Auth Next.js integration", url: "https://better-auth.com/docs/integrations/next" },
  { label: "Better Auth session management", url: "https://better-auth.com/docs/concepts/session-management" },
  { label: "Better Auth database and migrations", url: "https://better-auth.com/docs/concepts/database" },
  { label: "Better Auth other relational databases", url: "https://better-auth.com/docs/adapters/other-relational-databases" },
  { label: "Cloudflare D1 Worker binding API", url: "https://developers.cloudflare.com/d1/worker-api/d1-database/" },
  { label: "Next.js Proxy file convention", url: "node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md" },
];

function readEnv(name: string) {
  const value = process.env[name];
  return value?.trim() || undefined;
}

function readText(path: string) {
  return existsSync(path) ? readFileSync(path, "utf8") : null;
}

function stripJsonComments(input: string) {
  let output = "";
  let inString = false;
  let escaped = false;

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    const next = input[index + 1];

    if (inString) {
      output += char;
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === "\"") {
        inString = false;
      }
      continue;
    }

    if (char === "\"") {
      inString = true;
      output += char;
      continue;
    }

    if (char === "/" && next === "/") {
      while (index < input.length && input[index] !== "\n") index += 1;
      output += "\n";
      continue;
    }

    if (char === "/" && next === "*") {
      index += 2;
      while (index < input.length && !(input[index] === "*" && input[index + 1] === "/")) index += 1;
      index += 1;
      continue;
    }

    output += char;
  }

  return output;
}

function parseJsonObject(input: string | null): Record<string, unknown> {
  if (!input) return {};
  try {
    return JSON.parse(stripJsonComments(input)) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function boolLabel(value: unknown) {
  if (value === true) return "yes";
  if (value === false) return "no";
  return "(missing)";
}

function packageDependencyVersion(packageJsonText: string | null, dependencyName: string) {
  const parsed = parseJsonObject(packageJsonText);
  const sections = [parsed.dependencies, parsed.devDependencies];
  for (const section of sections) {
    if (!section || typeof section !== "object") continue;
    const version = (section as Record<string, unknown>)[dependencyName];
    if (typeof version === "string" && version.length > 0) return version;
  }
  return null;
}

function extractD1Bindings(wranglerConfigText: string | null) {
  const parsed = parseJsonObject(wranglerConfigText);
  const bindings = Array.isArray(parsed.d1_databases)
    ? parsed.d1_databases
      .map((entry) => entry && typeof entry === "object" ? (entry as { binding?: unknown }).binding : null)
      .filter((binding): binding is string => typeof binding === "string" && binding.length > 0)
    : [];
  return Array.from(new Set(bindings)).sort();
}

function extractEnvInterfaceBlock(generatedTypesText: string | null) {
  const match = generatedTypesText?.match(/interface\s+__BaseEnv_CloudflareEnv\s*{([\s\S]*?)\n\s*}/);
  return match?.[1] ?? "";
}

function extractTypedD1Bindings(generatedTypesText: string | null) {
  const block = extractEnvInterfaceBlock(generatedTypesText);
  const names = new Set<string>();
  for (const match of block.matchAll(/\b([A-Z][A-Z0-9_]*)\s*:\s*D1Database(?:<[^;]+>)?\s*;/g)) {
    names.add(match[1]);
  }
  return [...names].sort();
}

function readSourceFiles(paths: string[]) {
  const textByPath: Record<string, string> = {};
  for (const path of paths) {
    const text = readText(path);
    if (text !== null) textByPath[path] = text;
  }
  return textByPath;
}

function currentSupabaseGatePreserved(sourceFileTextByPath: Record<string, string>) {
  return /supabase\.auth\.getClaims|@supabase\/ssr/i.test(sourceFileTextByPath["src/lib/auth/request-proxy.ts"] ?? "")
    && /supabase\.auth\.getUser/i.test(sourceFileTextByPath["src/lib/auth/session.ts"] ?? "")
    && /exchangeCodeForSession/i.test(sourceFileTextByPath["src/app/auth/callback/route.ts"] ?? "")
    && /signInWithOtp|signInWithOAuth|supabase\.auth\.signOut/i.test(sourceFileTextByPath["src/lib/auth/actions.ts"] ?? "");
}

function combineSourceFiles(paths: string[], sourceFileTextByPath: Record<string, string>) {
  return paths.map((path) => sourceFileTextByPath[path] ?? "").join("\n");
}

function routeGateHelperTestCoverageReady(sourceFileTextByPath: Record<string, string>) {
  const testText = combineSourceFiles(ROUTE_GATE_TEST_FILES, sourceFileTextByPath);
  return /getBetterAuthRouteGateSession/.test(testText)
    && /requireUserForBetterAuthRouteGate/.test(testText)
    && /disableCookieCache\s*:\s*true/.test(testText)
    && /missing-session/.test(testText)
    && /ok\s*:\s*false/.test(testText)
    && /ok\s*:\s*true/.test(testText);
}

function routeGateD1SessionFixtureReady(sourceFileTextByPath: Record<string, string>) {
  const testText = combineSourceFiles(ROUTE_GATE_TEST_FILES, sourceFileTextByPath);
  return /createCloudflareBetterAuthForD1/.test(testText)
    && /node:sqlite/.test(testText)
    && /makeSignature/.test(testText)
    && /better-auth\.session_token/.test(testText)
    && /session-token-fixture/.test(testText)
    && /expiresAt/.test(testText)
    && /missing-session/.test(testText);
}

function emptySchemaSqlProof(error: string | null = null): BetterAuthD1SchemaSqlProof {
  return {
    generated: false,
    staticReviewReady: false,
    statementCount: 0,
    byteLength: 0,
    sha256: null,
    tableNames: [],
    indexNames: [],
    expectedCoreTablesPresent: false,
    expectedIndexesPresent: false,
    source: "local-empty-d1-binding",
    sql: null,
    error,
  };
}

function extractSqlNames(sql: string, pattern: RegExp) {
  return Array.from(sql.matchAll(pattern), (match) => match[1]).sort();
}

function summarizeSchemaSql(sql: string): BetterAuthD1SchemaSqlProof {
  const tableNames = extractSqlNames(sql, /create\s+table\s+"([^"]+)"/gi);
  const indexNames = extractSqlNames(sql, /create\s+index\s+"([^"]+)"/gi);
  const statementCount = sql.split(";").map((statement) => statement.trim()).filter(Boolean).length;
  const expectedCoreTablesPresent = EXPECTED_SCHEMA_TABLES.every((table) => tableNames.includes(table));
  const expectedIndexesPresent = EXPECTED_SCHEMA_INDEXES.every((index) => indexNames.includes(index));
  const foreignKeyCascadeReady = /references\s+"user"\s+\("id"\)\s+on\s+delete\s+cascade/i.test(sql);
  const uniqueEmailReady = /"email"\s+text\s+not\s+null\s+unique/i.test(sql);
  const uniqueSessionTokenReady = /"token"\s+text\s+not\s+null\s+unique/i.test(sql);
  const staticReviewReady = statementCount >= 7
    && expectedCoreTablesPresent
    && expectedIndexesPresent
    && foreignKeyCascadeReady
    && uniqueEmailReady
    && uniqueSessionTokenReady;

  return {
    generated: sql.trim().length > 0,
    staticReviewReady,
    statementCount,
    byteLength: Buffer.byteLength(sql, "utf8"),
    sha256: createHash("sha256").update(sql).digest("hex"),
    tableNames,
    indexNames,
    expectedCoreTablesPresent,
    expectedIndexesPresent,
    source: "local-empty-d1-binding",
    sql,
    error: null,
  };
}

function createLocalEmptyD1Binding() {
  const emptyResult = { results: [], meta: { changes: 0, last_row_id: null } };
  return {
    prepare(_sql: string) {
      const statement = {
        bind(..._parameters: unknown[]) {
          return statement;
        },
        async all() {
          return emptyResult;
        },
      };
      return statement;
    },
    async batch(statements: unknown[]) {
      return statements.map(() => emptyResult);
    },
    async exec(_sql: string) {
      return { count: 0, duration: 0 };
    },
  };
}

export async function generateLocalBetterAuthD1SchemaSqlProof(): Promise<BetterAuthD1SchemaSqlProof> {
  try {
    const sql = await compileCloudflareBetterAuthD1Migrations({
      d1Database: createLocalEmptyD1Binding(),
      baseURL: "http://localhost:3000",
      secret: "local-better-auth-schema-proof-secret",
      enableNextCookies: false,
    });
    return summarizeSchemaSql(sql);
  } catch (error) {
    return emptySchemaSqlProof(error instanceof Error ? error.message : String(error));
  }
}

function buildProductionCutoverBlockers(
  actualNextRouteMounted: boolean,
  schemaSqlSummary: BetterAuthD1SchemaSqlProof,
  routeGateHelperCoverageReady: boolean,
  routeGateD1FixtureReady: boolean,
) {
  const blockers = [
    schemaSqlSummary.staticReviewReady
      ? "Better Auth D1 schema SQL is generated and statically reviewed locally, but has not been applied to hosted D1 or restore-tested."
      : "Better Auth D1 schema SQL has not been generated, reviewed, applied to hosted D1, or restore-tested.",
    "Better Auth secret rotation, OAuth providers, magic-link/email provider config, trusted origins, and cookie settings have no sanitized Cloudflare provider evidence.",
    "Existing Supabase callback/actions/session helpers still own live auth behavior.",
    routeGateD1FixtureReady
      ? "Route-gate tests cover local Better Auth helper denial/success behavior and D1-backed signed-cookie session fixtures, but provider-backed callback/session cutover tests are still missing before replacing Supabase session fixtures."
      : routeGateHelperCoverageReady
        ? "Route-gate tests cover local Better Auth helper denial/success behavior, but still need D1-backed session fixtures before replacing Supabase session fixtures."
        : "Route-gate tests still need Better Auth helper denial/success coverage and D1-backed session fixtures before replacing Supabase session fixtures.",
  ];
  if (!actualNextRouteMounted) {
    blockers.unshift("The Better Auth /api/auth/[...all] route is intentionally not mounted yet.");
  }
  return blockers;
}

function detectsMountedNextRouteHandler(nextRouteText: string) {
  return /createCloudflareBetterAuthNextHandlers\s*\(/.test(nextRouteText)
    && /getCloudflareContext\s*\(/.test(nextRouteText)
    && /\bARCH_DB\b/.test(nextRouteText)
    && /\bBETTER_AUTH_SECRET\b/.test(nextRouteText)
    && /export\s+async\s+function\s+GET\s*\(/.test(nextRouteText)
    && /export\s+async\s+function\s+POST\s*\(/.test(nextRouteText)
    && /503/.test(nextRouteText)
    && /no-store/.test(nextRouteText);
}

function buildLocalBlockers(readiness: CloudflareBetterAuthProofReport["readiness"]) {
  const blockers: string[] = [];
  if (!readiness.betterAuthDependencyPresent) blockers.push("better-auth package dependency is missing.");
  if (!readiness.d1BindingReady) blockers.push("ARCH_DB D1 binding is not configured and typed.");
  if (!readiness.d1DatabaseAdapterPatternReady) blockers.push("Better Auth D1 database factory scaffold is missing.");
  if (!readiness.nextRouteHandlerPatternReady) blockers.push("Next route handler factory pattern is missing.");
  if (!readiness.secureServerSessionCheckPatternReady) blockers.push("Secure auth.api.getSession route-gate check is missing.");
  if (!readiness.migrationCompilationHelperReady) blockers.push("Better Auth D1 migration compilation helper is missing.");
  if (!readiness.routeGateHelperTestCoverageReady) blockers.push("Better Auth route-gate helper denial/success test coverage is missing.");
  if (!readiness.routeGateD1SessionFixtureReady) blockers.push("Better Auth D1-backed route-gate signed-cookie session fixture coverage is missing.");
  if (!readiness.betterAuthD1SchemaSqlGenerated) blockers.push("Better Auth D1 schema SQL generation failed.");
  if (!readiness.betterAuthD1SchemaSqlReviewReady) blockers.push("Better Auth D1 schema SQL static review failed.");
  if (!readiness.routeGateParityMatrixReady) blockers.push("Route-gate parity matrix is incomplete.");
  if (!readiness.currentSupabaseGatePreserved) blockers.push("Current Supabase-backed live auth gate was not detected.");
  return blockers;
}

export function buildCloudflareBetterAuthProof(inputs: BetterAuthProofInputs): CloudflareBetterAuthProofReport {
  const scaffoldText = inputs.sourceFileTextByPath[SCAFFOLD_FILE] ?? "";
  const nextRouteText = inputs.sourceFileTextByPath[NEXT_ROUTE_HANDLER_PATH] ?? "";
  const betterAuthVersion = packageDependencyVersion(inputs.packageJsonText, "better-auth");
  const d1DatabaseBindings = extractD1Bindings(inputs.wranglerConfigText);
  const typedD1Bindings = extractTypedD1Bindings(inputs.generatedTypesText);
  const actualNextRouteMounted = detectsMountedNextRouteHandler(nextRouteText);
  const schemaSqlSummary = inputs.schemaSqlProof ?? emptySchemaSqlProof("Schema SQL proof was not provided.");
  const routeGateHelperCoverageReady = routeGateHelperTestCoverageReady(inputs.sourceFileTextByPath);
  const routeGateD1FixtureReady = routeGateD1SessionFixtureReady(inputs.sourceFileTextByPath);
  const scaffoldSummary = {
    betterAuthD1FactoryReady: /betterAuth\s*\(/.test(scaffoldText)
      && /database:\s*options\.d1Database/.test(scaffoldText)
      && /CloudflareD1/i.test(scaffoldText),
    nextRouteHandlerFactoryReady: /toNextJsHandler\s*\(/.test(scaffoldText)
      && /BETTER_AUTH_CLOUDFLARE_BASE_PATH\s*=\s*"\/api\/auth"/.test(scaffoldText),
    actualNextRouteMounted,
    secureRouteGateSessionCheckReady: /auth\.api\.getSession\s*\(\s*{[\s\S]{0,400}\bheaders\b[\s\S]{0,400}disableCookieCache\s*:\s*true/.test(scaffoldText),
    migrationCompilationHelperReady: /\bgetMigrations\s*\(/.test(scaffoldText)
      && /compileMigrations\s*\(/.test(scaffoldText),
    routeGateHelperTestCoverageReady: routeGateHelperCoverageReady,
    routeGateD1SessionFixtureReady: routeGateD1FixtureReady,
    routeGateParityRows: BETTER_AUTH_ROUTE_GATE_PARITY_MATRIX.length,
    currentSupabaseGatePreserved: currentSupabaseGatePreserved(inputs.sourceFileTextByPath),
  };
  const d1BindingReady = d1DatabaseBindings.length > 0
    && d1DatabaseBindings.every((binding) => typedD1Bindings.includes(binding));
  const routeGateParityMatrixReady = BETTER_AUTH_ROUTE_GATE_PARITY_MATRIX.length >= 7
    && BETTER_AUTH_ROUTE_GATE_PARITY_MATRIX.every((row) => row.key.length > 0 && row.betterAuthD1Requirement.length > 0);
  const localBetterAuthRouteGateProofReady = Boolean(betterAuthVersion)
    && d1BindingReady
    && scaffoldSummary.betterAuthD1FactoryReady
    && scaffoldSummary.nextRouteHandlerFactoryReady
    && scaffoldSummary.secureRouteGateSessionCheckReady
    && scaffoldSummary.migrationCompilationHelperReady
    && scaffoldSummary.routeGateHelperTestCoverageReady
    && scaffoldSummary.routeGateD1SessionFixtureReady
    && schemaSqlSummary.generated
    && schemaSqlSummary.staticReviewReady
    && routeGateParityMatrixReady
    && scaffoldSummary.currentSupabaseGatePreserved;
  const readiness = {
    betterAuthDependencyPresent: Boolean(betterAuthVersion),
    d1BindingReady,
    d1DatabaseAdapterPatternReady: scaffoldSummary.betterAuthD1FactoryReady,
    nextRouteHandlerPatternReady: scaffoldSummary.nextRouteHandlerFactoryReady,
    secureServerSessionCheckPatternReady: scaffoldSummary.secureRouteGateSessionCheckReady,
    migrationCompilationHelperReady: scaffoldSummary.migrationCompilationHelperReady,
    routeGateHelperTestCoverageReady: scaffoldSummary.routeGateHelperTestCoverageReady,
    routeGateD1SessionFixtureReady: scaffoldSummary.routeGateD1SessionFixtureReady,
    betterAuthD1SchemaSqlGenerated: schemaSqlSummary.generated,
    betterAuthD1SchemaSqlReviewReady: schemaSqlSummary.staticReviewReady,
    routeGateParityMatrixReady,
    currentSupabaseGatePreserved: scaffoldSummary.currentSupabaseGatePreserved,
    localBetterAuthRouteGateProofReady,
    productionBetterAuthReady: false,
  };
  const productionCutoverBlockers = buildProductionCutoverBlockers(
    actualNextRouteMounted,
    schemaSqlSummary,
    scaffoldSummary.routeGateHelperTestCoverageReady,
    scaffoldSummary.routeGateD1SessionFixtureReady,
  );
  const blockers = [
    ...buildLocalBlockers(readiness),
    ...productionCutoverBlockers,
  ];

  return {
    generatedAt: inputs.generatedAt ?? new Date().toISOString(),
    mode: "cloudflare-better-auth-d1-route-gate-proof",
    sources: {
      packageJson: inputs.sources?.packageJson ?? null,
      wranglerConfig: inputs.sources?.wranglerConfig ?? null,
      generatedTypes: inputs.sources?.generatedTypes ?? null,
      scaffoldFiles: inputs.sources?.scaffoldFiles ?? [SCAFFOLD_FILE],
      currentSupabaseGateFiles: inputs.sources?.currentSupabaseGateFiles ?? CURRENT_SUPABASE_GATE_FILES,
      nextRouteHandlerPath: NEXT_ROUTE_HANDLER_PATH,
      testFiles: inputs.sources?.testFiles ?? ROUTE_GATE_TEST_FILES,
      schemaSql: inputs.sources?.schemaSql ?? null,
      docs: DOCS,
    },
    manifestSummary: {
      betterAuthVersion,
      d1DatabaseBindings,
      typedD1Bindings,
    },
    scaffoldSummary,
    schemaSqlSummary,
    readiness,
    routeGateParityMatrix: BETTER_AUTH_ROUTE_GATE_PARITY_MATRIX,
    productionCutoverBlockers,
    localOnly: true,
    providerBacked: false,
    blockers,
    note: actualNextRouteMounted
      ? "Local-only Better Auth D1 route-gate proof. It reads package, wrangler, generated type, and source files; it does not read env files, print secret values, create or mutate Cloudflare D1 databases, change DNS, deploy Workers, or replace the live Supabase auth gate. The mounted /api/auth route fails closed without a Better Auth secret and ARCH_DB binding."
      : "Local-only Better Auth D1 route-gate proof. It reads package, wrangler, generated type, and source files; it does not read env files, print secret values, create or mutate Cloudflare D1 databases, mount a public auth route, change DNS, deploy Workers, or replace the live Supabase auth gate.",
  };
}

function writeOutput(outputFile: string, report: CloudflareBetterAuthProofReport) {
  const outputPath = resolve(outputFile);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
}

function writeSchemaSql(schemaSqlFile: string, report: CloudflareBetterAuthProofReport) {
  const outputPath = resolve(schemaSqlFile);
  mkdirSync(dirname(outputPath), { recursive: true });
  const sql = report.schemaSqlSummary.sql
    ? `${report.schemaSqlSummary.sql.trim()}\n`
    : `-- Better Auth D1 schema SQL was not generated: ${report.schemaSqlSummary.error ?? "unknown error"}\n`;
  writeFileSync(outputPath, sql);
}

function markdownRows(rows: string[][]) {
  return rows.map((row) => `| ${row.map((cell) => cell.replaceAll("|", "\\|")).join(" | ")} |`);
}

export function writeMarkdown(report: CloudflareBetterAuthProofReport, markdownFile: string) {
  const outputPath = resolve(markdownFile);
  mkdirSync(dirname(outputPath), { recursive: true });
  const summaryRows = [
    ["Better Auth dependency present", boolLabel(report.readiness.betterAuthDependencyPresent)],
    ["D1 binding ready", boolLabel(report.readiness.d1BindingReady)],
    ["D1 database adapter pattern ready", boolLabel(report.readiness.d1DatabaseAdapterPatternReady)],
    ["Next route handler pattern ready", boolLabel(report.readiness.nextRouteHandlerPatternReady)],
    ["Secure server session check ready", boolLabel(report.readiness.secureServerSessionCheckPatternReady)],
    ["Migration compilation helper ready", boolLabel(report.readiness.migrationCompilationHelperReady)],
    ["Route-gate helper test coverage ready", boolLabel(report.readiness.routeGateHelperTestCoverageReady)],
    ["Route-gate D1 session fixture ready", boolLabel(report.readiness.routeGateD1SessionFixtureReady)],
    ["Better Auth D1 schema SQL generated", boolLabel(report.readiness.betterAuthD1SchemaSqlGenerated)],
    ["Better Auth D1 schema SQL static review ready", boolLabel(report.readiness.betterAuthD1SchemaSqlReviewReady)],
    ["Route-gate parity matrix ready", boolLabel(report.readiness.routeGateParityMatrixReady)],
    ["Current Supabase gate preserved", boolLabel(report.readiness.currentSupabaseGatePreserved)],
    ["Local Better Auth route-gate proof ready", boolLabel(report.readiness.localBetterAuthRouteGateProofReady)],
    ["Production Better Auth ready", boolLabel(report.readiness.productionBetterAuthReady)],
    ["Local-only proof", boolLabel(report.localOnly)],
    ["Provider-backed proof", boolLabel(report.providerBacked)],
  ];
  const manifestRows = [
    ["Better Auth version", report.manifestSummary.betterAuthVersion ?? "(missing)"],
    ["Wrangler D1 bindings", report.manifestSummary.d1DatabaseBindings.length === 0 ? "(none)" : report.manifestSummary.d1DatabaseBindings.join(", ")],
    ["Typed D1 bindings", report.manifestSummary.typedD1Bindings.length === 0 ? "(none)" : report.manifestSummary.typedD1Bindings.join(", ")],
    ["Actual /api/auth route mounted", boolLabel(report.scaffoldSummary.actualNextRouteMounted)],
    ["Route-gate test files", report.sources.testFiles.length === 0 ? "(none)" : report.sources.testFiles.join(", ")],
    ["Schema SQL artifact", report.sources.schemaSql ?? "(not written)"],
    ["Schema SQL statements", String(report.schemaSqlSummary.statementCount)],
    ["Schema SQL SHA-256", report.schemaSqlSummary.sha256 ?? "(missing)"],
    ["Schema SQL tables", report.schemaSqlSummary.tableNames.length === 0 ? "(none)" : report.schemaSqlSummary.tableNames.join(", ")],
    ["Schema SQL indexes", report.schemaSqlSummary.indexNames.length === 0 ? "(none)" : report.schemaSqlSummary.indexNames.join(", ")],
  ];
  const parityRows = report.routeGateParityMatrix.map((row) => [
    row.key,
    row.currentSupabaseBehavior,
    row.betterAuthD1Requirement,
    row.localProofStatus,
  ]);
  const docRows = report.sources.docs.map((doc) => [doc.label, doc.url]);
  const blockerLines = report.blockers.length > 0
    ? report.blockers.map((blocker) => `- ${blocker}`)
    : ["- (none)"];
  const lines = [
    "# Cloudflare Better Auth D1 Route-Gate Proof",
    "",
    `Generated: ${report.generatedAt}`,
    "",
    report.note,
    "",
    "## Summary",
    "",
    "| Gate | Ready |",
    "| --- | --- |",
    ...markdownRows(summaryRows),
    "",
    "## Manifest And Mount Snapshot",
    "",
    "| Item | Value |",
    "| --- | --- |",
    ...markdownRows(manifestRows),
    "",
    "## Route-Gate Parity Matrix",
    "",
    "| Surface | Current Supabase behavior | Better Auth D1 requirement | Local status |",
    "| --- | --- | --- | --- |",
    ...markdownRows(parityRows),
    "",
    "## Official References Used",
    "",
    "| Reference | URL |",
    "| --- | --- |",
    ...markdownRows(docRows),
    "",
    "## Blockers",
    "",
    ...blockerLines,
    "",
  ];
  writeFileSync(outputPath, lines.join("\n"));
}

function collectRepoInputs(): BetterAuthProofInputs {
  const sourcePaths = [
    SCAFFOLD_FILE,
    NEXT_ROUTE_HANDLER_PATH,
    ...ROUTE_GATE_TEST_FILES,
    ...CURRENT_SUPABASE_GATE_FILES,
  ];

  return {
    packageJsonText: readText("package.json"),
    wranglerConfigText: readText("wrangler.jsonc"),
    generatedTypesText: readText("cloudflare-env.d.ts"),
    sourceFileTextByPath: readSourceFiles(sourcePaths),
    sources: {
      packageJson: "package.json",
      wranglerConfig: "wrangler.jsonc",
      generatedTypes: "cloudflare-env.d.ts",
      scaffoldFiles: [SCAFFOLD_FILE],
      currentSupabaseGateFiles: CURRENT_SUPABASE_GATE_FILES,
      testFiles: ROUTE_GATE_TEST_FILES,
    },
  };
}

async function main() {
  const outputFile = readEnv("OUTPUT_FILE") ?? `${PLAN_ROOT}/2026-06-30-cloudflare-better-auth-route-gate-proof.json`;
  const markdownFile = readEnv("MARKDOWN_FILE") ?? `${PLAN_ROOT}/2026-06-30-cloudflare-better-auth-route-gate-proof.md`;
  const schemaSqlFile = readEnv("SCHEMA_SQL_FILE") ?? DEFAULT_SCHEMA_SQL_FILE;
  const inputs = collectRepoInputs();
  inputs.schemaSqlProof = await generateLocalBetterAuthD1SchemaSqlProof();
  inputs.sources = {
    ...inputs.sources,
    schemaSql: schemaSqlFile,
  };
  const report = buildCloudflareBetterAuthProof(inputs);
  writeOutput(outputFile, report);
  writeMarkdown(report, markdownFile);
  writeSchemaSql(schemaSqlFile, report);
  console.log(JSON.stringify(report, null, 2));
  if (!report.readiness.localBetterAuthRouteGateProofReady) process.exitCode = 1;
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
