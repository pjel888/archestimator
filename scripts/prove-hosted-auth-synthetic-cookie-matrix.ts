#!/usr/bin/env bun

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";

import { makeSignature } from "better-auth/crypto";

import { verifyHostedAuthRoutes } from "./verify-hosted-auth-routes";

type AuthCaseName = "allowed" | "denied" | "revoked" | "expired";

type Fixture = {
  caseName: AuthCaseName;
  userId: string;
  email: string;
  sessionId: string;
  sessionToken: string;
  sessionExpiresAt: string;
  betaStatus: "active" | "revoked" | "missing";
  cookieHeader?: string;
};

type D1Result = {
  results?: Array<Record<string, unknown>>;
  success?: boolean;
  meta?: Record<string, unknown>;
};

type CleanupCounts = {
  users: number;
  sessions: number;
  profiles: number;
  memberships: number;
  closedBetaRows: number;
  legalTermsRows: number;
  syntheticWorkspaces: number;
};

const PLAN_ROOT = ".ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence";
const OUTPUT_FILE = `${PLAN_ROOT}/2026-07-02-cloudflare-hosted-auth-synthetic-cookie-matrix.json`;
const MARKDOWN_FILE = `${PLAN_ROOT}/2026-07-02-cloudflare-hosted-auth-synthetic-cookie-matrix.md`;
const D1_DATABASE = process.env.CLOUDFLARE_D1_DATABASE?.trim() || "archestimator-proof-db";
const BASE_URL = process.env.HOSTED_AUTH_BASE_URL?.trim() || "https://archestimator.com";
const WORKSPACE_ID = process.env.HOSTED_AUTH_WORKSPACE_ID?.trim() || "258b50ee-3fde-4f6a-a9d9-c360ec44cd0b";
const EMAIL_PREFIX = "codex-authz-";
const EMAIL_DOMAIN = "example.invalid";
const MALFORMED_COOKIE = [
  "__Secure-better-auth.session_token=codex-malformed-session.invalid-signature",
  "better-auth.session_token=codex-malformed-session.invalid-signature",
].join("; ");
const TERMS = {
  key: "terms-of-service",
  version: "tos-2026-06-06-beta-v1",
  effectiveDate: "2026-06-06",
  contentHash: "sha256:55b472ffb1aaab0ca1c3a6ddd5363f9113efec37f4007d537d61d30153102444",
  privacyPolicyVersion: "privacy-2026-06-06-beta-v1",
};

const redactions = new Set<string>();

function addRedaction(value: string | undefined) {
  if (value) redactions.add(value);
}

function redact(value: string) {
  let result = value;
  for (const secret of redactions) {
    result = result.split(secret).join("[redacted]");
  }
  return result.replace(/(__Secure-)?better-auth\.session_token=[^;\s]+/g, "$1better-auth.session_token=[redacted]");
}

function readDotDevVars() {
  try {
    return readFileSync(".dev.vars", "utf8");
  } catch {
    return "";
  }
}

function readDevVar(name: string) {
  if (process.env[name]?.trim()) return process.env[name]?.trim();
  const source = readDotDevVars();
  for (const line of source.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match || match[1] !== name) continue;
    const raw = match[2].trim();
    if ((raw.startsWith("\"") && raw.endsWith("\"")) || (raw.startsWith("'") && raw.endsWith("'"))) {
      return raw.slice(1, -1);
    }
    return raw;
  }
  return undefined;
}

function sqlValue(value: string | null) {
  if (value === null) return "NULL";
  return `'${value.replace(/'/g, "''")}'`;
}

function d1Execute(sql: string, label: string): D1Result[] {
  const result = spawnSync("bunx", [
    "wrangler",
    "d1",
    "execute",
    D1_DATABASE,
    "--remote",
    "--json",
    "--command",
    sql,
  ], {
    cwd: process.cwd(),
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 20,
  });

  if (result.status !== 0) {
    throw new Error(`${label} failed: ${redact([result.stdout, result.stderr].filter(Boolean).join("\n"))}`);
  }

  try {
    return JSON.parse(result.stdout) as D1Result[];
  } catch (error) {
    throw new Error(`${label} returned non-JSON output: ${redact(result.stdout)} (${error instanceof Error ? error.message : String(error)})`);
  }
}

function firstNumber(results: D1Result[], statementIndex: number, key: keyof CleanupCounts) {
  const value = results[statementIndex]?.results?.[0]?.[key];
  return typeof value === "number" ? value : Number(value ?? 0);
}

function countSyntheticRows(): CleanupCounts {
  const sql = `
    SELECT COUNT(*) AS users FROM "user" WHERE email LIKE '${EMAIL_PREFIX}%@${EMAIL_DOMAIN}';
    SELECT COUNT(*) AS sessions FROM "session" WHERE "userId" IN (SELECT id FROM "user" WHERE email LIKE '${EMAIL_PREFIX}%@${EMAIL_DOMAIN}');
    SELECT COUNT(*) AS profiles FROM profiles WHERE email LIKE '${EMAIL_PREFIX}%@${EMAIL_DOMAIN}';
    SELECT COUNT(*) AS memberships FROM workspace_members WHERE user_id IN (
      SELECT id FROM profiles WHERE email LIKE '${EMAIL_PREFIX}%@${EMAIL_DOMAIN}'
      UNION SELECT id FROM "user" WHERE email LIKE '${EMAIL_PREFIX}%@${EMAIL_DOMAIN}'
    );
    SELECT COUNT(*) AS closedBetaRows FROM closed_beta_allowed_emails WHERE normalized_email LIKE '${EMAIL_PREFIX}%@${EMAIL_DOMAIN}';
    SELECT COUNT(*) AS legalTermsRows FROM legal_terms_acceptances WHERE user_id IN (
      SELECT id FROM profiles WHERE email LIKE '${EMAIL_PREFIX}%@${EMAIL_DOMAIN}'
      UNION SELECT id FROM "user" WHERE email LIKE '${EMAIL_PREFIX}%@${EMAIL_DOMAIN}'
    );
    SELECT COUNT(*) AS syntheticWorkspaces FROM workspaces WHERE created_by IN (
      SELECT id FROM profiles WHERE email LIKE '${EMAIL_PREFIX}%@${EMAIL_DOMAIN}'
      UNION SELECT id FROM "user" WHERE email LIKE '${EMAIL_PREFIX}%@${EMAIL_DOMAIN}'
    );
  `;
  const results = d1Execute(sql, "count synthetic auth fixtures");
  return {
    users: firstNumber(results, 0, "users"),
    sessions: firstNumber(results, 1, "sessions"),
    profiles: firstNumber(results, 2, "profiles"),
    memberships: firstNumber(results, 3, "memberships"),
    closedBetaRows: firstNumber(results, 4, "closedBetaRows"),
    legalTermsRows: firstNumber(results, 5, "legalTermsRows"),
    syntheticWorkspaces: firstNumber(results, 6, "syntheticWorkspaces"),
  };
}

function cleanupSyntheticRows(label = "cleanup synthetic auth fixtures") {
  const sql = `
    DELETE FROM "session" WHERE "userId" IN (SELECT id FROM "user" WHERE email LIKE '${EMAIL_PREFIX}%@${EMAIL_DOMAIN}');
    DELETE FROM workspace_members WHERE user_id IN (
      SELECT id FROM profiles WHERE email LIKE '${EMAIL_PREFIX}%@${EMAIL_DOMAIN}'
      UNION SELECT id FROM "user" WHERE email LIKE '${EMAIL_PREFIX}%@${EMAIL_DOMAIN}'
    );
    DELETE FROM legal_terms_acceptances WHERE user_id IN (
      SELECT id FROM profiles WHERE email LIKE '${EMAIL_PREFIX}%@${EMAIL_DOMAIN}'
      UNION SELECT id FROM "user" WHERE email LIKE '${EMAIL_PREFIX}%@${EMAIL_DOMAIN}'
    );
    DELETE FROM workspaces WHERE created_by IN (
      SELECT id FROM profiles WHERE email LIKE '${EMAIL_PREFIX}%@${EMAIL_DOMAIN}'
      UNION SELECT id FROM "user" WHERE email LIKE '${EMAIL_PREFIX}%@${EMAIL_DOMAIN}'
    );
    DELETE FROM profiles WHERE email LIKE '${EMAIL_PREFIX}%@${EMAIL_DOMAIN}';
    DELETE FROM closed_beta_allowed_emails WHERE normalized_email LIKE '${EMAIL_PREFIX}%@${EMAIL_DOMAIN}';
    DELETE FROM "user" WHERE email LIKE '${EMAIL_PREFIX}%@${EMAIL_DOMAIN}';
  `;
  d1Execute(sql, label);
}

function makeFixture(caseName: AuthCaseName, generatedAt: string): Fixture {
  const userId = randomUUID();
  const sessionId = randomUUID();
  const sessionToken = `codexauthz${caseName}${randomUUID().replace(/-/g, "")}`;
  addRedaction(sessionToken);

  const nowMs = Date.parse(generatedAt);
  const sessionExpiresAt = new Date(
    caseName === "expired" ? nowMs - 60 * 60 * 1000 : nowMs + 60 * 60 * 1000,
  ).toISOString();

  return {
    caseName,
    userId,
    email: `${EMAIL_PREFIX}${caseName}-${generatedAt.replace(/[-:.TZ]/g, "").toLowerCase()}@${EMAIL_DOMAIN}`,
    sessionId,
    sessionToken,
    sessionExpiresAt,
    betaStatus: caseName === "denied" ? "missing" : caseName === "revoked" ? "revoked" : "active",
  };
}

async function attachSignedCookie(fixture: Fixture, secret: string) {
  const signature = await makeSignature(fixture.sessionToken, secret);
  addRedaction(signature);
  const signedValue = `${fixture.sessionToken}.${signature}`;
  addRedaction(signedValue);
  fixture.cookieHeader = [
    `__Secure-better-auth.session_token=${signedValue}`,
    `better-auth.session_token=${signedValue}`,
  ].join("; ");
  addRedaction(fixture.cookieHeader);
}

function buildSeedSql(fixtures: Fixture[], now: string) {
  const statements: string[] = [];
  for (const fixture of fixtures) {
    const displayName = `Codex Authz ${fixture.caseName}`;
    statements.push(
      `INSERT INTO "user" ("id", "name", "email", "emailVerified", "image", "createdAt", "updatedAt") VALUES (${sqlValue(fixture.userId)}, ${sqlValue(displayName)}, ${sqlValue(fixture.email)}, 1, NULL, ${sqlValue(now)}, ${sqlValue(now)})`,
      `INSERT INTO "session" ("id", "expiresAt", "token", "createdAt", "updatedAt", "ipAddress", "userAgent", "userId") VALUES (${sqlValue(fixture.sessionId)}, ${sqlValue(fixture.sessionExpiresAt)}, ${sqlValue(fixture.sessionToken)}, ${sqlValue(now)}, ${sqlValue(now)}, NULL, ${sqlValue("codex-hosted-auth-matrix")}, ${sqlValue(fixture.userId)})`,
      `INSERT INTO profiles (id, email, display_name, role, default_workspace_id, avatar_url, created_at, updated_at) VALUES (${sqlValue(fixture.userId)}, ${sqlValue(fixture.email)}, ${sqlValue(displayName)}, 'member', ${sqlValue(WORKSPACE_ID)}, NULL, ${sqlValue(now)}, ${sqlValue(now)})`,
      `INSERT INTO workspace_members (workspace_id, user_id, role, created_at, updated_at) VALUES (${sqlValue(WORKSPACE_ID)}, ${sqlValue(fixture.userId)}, 'member', ${sqlValue(now)}, ${sqlValue(now)})`,
      `INSERT INTO legal_terms_acceptances (id, user_id, terms_key, terms_version, terms_effective_date, terms_content_hash, privacy_policy_version, acceptance_method, acceptance_context, metadata_json, accepted_at, created_at) VALUES (${sqlValue(randomUUID())}, ${sqlValue(fixture.userId)}, ${sqlValue(TERMS.key)}, ${sqlValue(TERMS.version)}, ${sqlValue(TERMS.effectiveDate)}, ${sqlValue(TERMS.contentHash)}, ${sqlValue(TERMS.privacyPolicyVersion)}, 'authenticated_clickwrap', 'workshop_terms_gate', ${sqlValue(JSON.stringify({ source: "codex_hosted_auth_matrix" }))}, ${sqlValue(now)}, ${sqlValue(now)})`,
    );
    if (fixture.betaStatus !== "missing") {
      statements.push(
        `INSERT INTO closed_beta_allowed_emails (id, normalized_email, status, invited_by, invited_at, accepted_at, notes, metadata_json, created_at, updated_at) VALUES (${sqlValue(randomUUID())}, ${sqlValue(fixture.email)}, ${sqlValue(fixture.betaStatus)}, NULL, ${sqlValue(now)}, ${fixture.betaStatus === "active" ? sqlValue(now) : "NULL"}, ${sqlValue("Codex hosted auth synthetic matrix fixture")}, ${sqlValue(JSON.stringify({ source: "codex_hosted_auth_matrix" }))}, ${sqlValue(now)}, ${sqlValue(now)})`,
      );
    }
  }
  return statements.join(";\n") + ";";
}

function cleanupPassed(counts: CleanupCounts) {
  return Object.values(counts).every((value) => value === 0);
}

function writeJson(file: string, value: unknown) {
  const resolved = resolve(file);
  mkdirSync(dirname(resolved), { recursive: true });
  writeFileSync(resolved, `${JSON.stringify(value, null, 2)}\n`);
}

function writeMarkdown(file: string, report: Awaited<ReturnType<typeof buildReport>>) {
  const resolved = resolve(file);
  mkdirSync(dirname(resolved), { recursive: true });
  const rows = report.authResult.cases
    .map((authCase) => `| ${authCase.name} | ${authCase.passed ? "pass" : "fail"} | ${authCase.status ?? "n/a"} | ${authCase.normalizedLocationPath ?? "n/a"} | ${authCase.cacheControl ?? "n/a"} | ${authCase.averageDurationMs ?? "n/a"}ms | ${authCase.error ?? ""} |`)
    .join("\n");
  const fixtures = report.syntheticFixtures
    .map((fixture) => `| ${fixture.caseName} | ${fixture.email} | ${fixture.userId} | ${fixture.betaStatus} | ${fixture.sessionExpiresAt} |`)
    .join("\n");

  writeFileSync(resolved, `# Cloudflare Hosted Auth Synthetic Cookie Matrix

Status: **${report.passed ? "PASSED" : "OPEN / NOT FULLY PROVEN"}**

Generated: \`${report.generatedAt}\`

Base URL: \`${report.baseUrl}\`

D1 database: \`${report.d1Database}\`

Workspace fixture: \`${report.workspaceId}\`

| Case | Result | Latest status | Latest redirect path | Cache-Control | Avg duration | Error |
| --- | --- | --- | --- | --- | --- | --- |
${rows}

| Fixture | Email | User id | Closed beta status | Session expiry |
| --- | --- | --- | --- | --- |
${fixtures}

Cleanup counts after proof:

| Users | Sessions | Profiles | Memberships | Closed-beta rows | Terms rows | Synthetic workspaces |
| --- | --- | --- | --- | --- | --- | --- |
| ${report.cleanupAfter.users} | ${report.cleanupAfter.sessions} | ${report.cleanupAfter.profiles} | ${report.cleanupAfter.memberships} | ${report.cleanupAfter.closedBetaRows} | ${report.cleanupAfter.legalTermsRows} | ${report.cleanupAfter.syntheticWorkspaces} |

Notes:
- Session cookies and signed token values were generated in memory only and are not written to this report.
- The hosted verifier exercises \`/workshop\` on the production Worker with anonymous, allowed, missing-allowlist, revoked, expired, and malformed Better Auth session states.
- A pass requires the expected route behavior plus private/no-store cache control and zero synthetic D1 residue after cleanup.
`);
}

async function buildReport(params: {
  generatedAt: string;
  fixtures: Fixture[];
  cleanupBefore: CleanupCounts;
  cleanupAfter: CleanupCounts;
  authResult: Awaited<ReturnType<typeof verifyHostedAuthRoutes>>;
  error: string | null;
}) {
  const fixtureSummary = params.fixtures.map((fixture) => ({
    caseName: fixture.caseName,
    userId: fixture.userId,
    email: fixture.email,
    betaStatus: fixture.betaStatus,
    sessionExpiresAt: fixture.sessionExpiresAt,
    providedCookie: Boolean(fixture.cookieHeader),
  }));

  return {
    generatedAt: params.generatedAt,
    mode: "cloudflare-hosted-auth-synthetic-cookie-matrix",
    verifierMode: params.authResult.mode,
    baseUrl: BASE_URL,
    d1Database: D1_DATABASE,
    workspaceId: WORKSPACE_ID,
    syntheticFixtures: fixtureSummary,
    cleanupBefore: params.cleanupBefore,
    authResult: params.authResult,
    cleanupAfter: params.cleanupAfter,
    cleanupPassed: cleanupPassed(params.cleanupAfter),
    passed: params.authResult.passed && cleanupPassed(params.cleanupAfter) && !params.error,
    error: params.error,
    note: "Sanitized hosted auth gate proof. Better Auth session tokens, signatures, and cookie headers are never written to this report.",
  };
}

async function main() {
  const generatedAt = new Date().toISOString();
  const secret = readDevVar("BETTER_AUTH_SECRET");
  if (!secret || secret.length < 32) {
    throw new Error("BETTER_AUTH_SECRET is missing or shorter than 32 characters.");
  }
  addRedaction(secret);

  cleanupSyntheticRows("pre-clean synthetic auth fixtures");
  const cleanupBefore = countSyntheticRows();

  const fixtures = (["allowed", "denied", "revoked", "expired"] as const)
    .map((caseName) => makeFixture(caseName, generatedAt));
  await Promise.all(fixtures.map((fixture) => attachSignedCookie(fixture, secret)));

  let authResult: Awaited<ReturnType<typeof verifyHostedAuthRoutes>> | null = null;
  let error: string | null = null;
  try {
    d1Execute(buildSeedSql(fixtures, generatedAt), "seed synthetic auth fixtures");
    authResult = await verifyHostedAuthRoutes({
      baseUrl: BASE_URL,
      allowedOrigins: ["https://archestimator.com", "https://www.archestimator.com"],
      runs: 1,
      cases: [
        { name: "signedOut", required: true },
        { name: "allowed", cookie: fixtures.find((fixture) => fixture.caseName === "allowed")?.cookieHeader, required: true },
        { name: "denied", cookie: fixtures.find((fixture) => fixture.caseName === "denied")?.cookieHeader, required: true },
        { name: "revoked", cookie: fixtures.find((fixture) => fixture.caseName === "revoked")?.cookieHeader, required: true },
        { name: "expired", cookie: fixtures.find((fixture) => fixture.caseName === "expired")?.cookieHeader, required: true },
        { name: "malformed", cookie: MALFORMED_COOKIE, required: true },
      ],
    });
  } catch (caught) {
    error = redact(caught instanceof Error ? caught.message : String(caught));
  } finally {
    cleanupSyntheticRows("post-clean synthetic auth fixtures");
  }

  const cleanupAfter = countSyntheticRows();
  authResult ??= {
    generatedAt,
    mode: "hosted-auth-route-smoke",
    baseUrl: BASE_URL,
    runs: 1,
    cases: [],
    passed: false,
    note: "Hosted auth verifier did not complete.",
  };

  const report = await buildReport({
    generatedAt,
    fixtures,
    cleanupBefore,
    cleanupAfter,
    authResult,
    error,
  });

  writeJson(OUTPUT_FILE, report);
  writeMarkdown(MARKDOWN_FILE, report);

  console.log(JSON.stringify({
    generatedAt: report.generatedAt,
    mode: report.mode,
    passed: report.passed,
    cases: report.authResult.cases.map((authCase) => ({
      name: authCase.name,
      passed: authCase.passed,
      status: authCase.status,
      normalizedLocationPath: authCase.normalizedLocationPath,
      cacheControl: authCase.cacheControl,
    })),
    cleanupAfter: report.cleanupAfter,
    error: report.error,
    outputFile: OUTPUT_FILE,
    markdownFile: MARKDOWN_FILE,
  }, null, 2));

  if (!report.passed) process.exitCode = 1;
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(redact(error instanceof Error ? error.message : String(error)));
    process.exitCode = 1;
  });
}
