#!/usr/bin/env bun

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { createClient } from "@supabase/supabase-js";

const EXPECTED_PROJECT_REF = "ebxxqidacheyapmmzavr";
const DEFAULT_D1_DATABASE = "ARCH_DB";
const DEFAULT_ENV_FILES = [".env.local", ".env", ".dev.vars"] as const;
const EVIDENCE_DIR = ".ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence";
const EVIDENCE_JSON = `${EVIDENCE_DIR}/2026-06-30-cloudflare-d1-account-settings-backfill.json`;
const EVIDENCE_MD = `${EVIDENCE_DIR}/2026-06-30-cloudflare-d1-account-settings-backfill.md`;

type UserOnboardingProfileRow = {
  country_region: string;
  created_at: string;
  display_name: string;
  marketing_consent_at: string | null;
  onboarding_completed_at: string | null;
  primary_use: string | null;
  student_educator_detail: string | null;
  updated_at: string;
  user_category: string;
  user_id: string;
};

type WorkspaceAccountSettingsRow = {
  company_size: string | null;
  country_region: string;
  created_at: string;
  default_currency: string;
  organization_name: string;
  organization_type: string;
  primary_use: string | null;
  updated_at: string;
  workspace_id: string;
};

type CountMap = Record<string, number>;

type CommandReport = {
  args: string[];
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  stdoutBytes: number;
  stderrBytes: number;
  timedOut: boolean;
};

type BackfillReport = {
  generatedAt: string;
  mode: "cloudflare-d1-account-settings-backfill";
  sourceProjectRef: string;
  targetD1Database: string;
  sourceUserProfileRows: number;
  sourceWorkspaceSettingsRows: number;
  sourceUserCategoryCounts: CountMap;
  sourceOrganizationTypeCounts: CountMap;
  sourceCompletedOnboardingRows: number;
  wrangler: CommandReport;
  d1Readback: CommandReport & {
    userProfileRows: number | null;
    workspaceSettingsRows: number | null;
    ready: boolean;
  };
  readiness: {
    sourceProjectBoundaryReady: boolean;
    upsertSucceeded: boolean;
    d1ReadbackReady: boolean;
    d1BackfillReady: boolean;
  };
  blockers: string[];
  note: string;
};

const USER_CATEGORIES = new Set([
  "architect",
  "contractor",
  "engineer",
  "quantity_surveyor",
  "owner_developer",
  "student_educator",
  "other",
]);
const PRIMARY_USES = new Set([
  "project_estimating",
  "cost_library",
  "proposal_packages",
  "learning",
  "other",
]);
const ORGANIZATION_TYPES = new Set([
  "architecture_design",
  "construction_contractor",
  "engineering_consultancy",
  "quantity_surveying",
  "owner_developer",
  "education",
  "solo_practice",
  "other",
]);
const COMPANY_SIZES = new Set(["solo", "2_10", "11_50", "51_200", "201_plus"]);

function unquoteEnvValue(value: string) {
  const trimmed = value.trim();
  const quote = trimmed[0];
  if ((quote === "\"" || quote === "'") && trimmed.endsWith(quote)) return trimmed.slice(1, -1);
  return trimmed;
}

function loadEnvFiles(files: readonly string[] = DEFAULT_ENV_FILES) {
  for (const file of files) {
    if (!existsSync(file)) continue;
    for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const match = trimmed.match(/^(?:export\s+)?([A-Z][A-Z0-9_]+)\s*=\s*(.*)$/);
      if (!match) continue;
      const [, name, rawValue] = match;
      if (!process.env[name]) process.env[name] = unquoteEnvValue(rawValue);
    }
  }
}

function readEnv(name: string) {
  return process.env[name]?.trim() || undefined;
}

function readProjectRef(supabaseUrl: string) {
  const hostname = new URL(supabaseUrl).hostname;
  const [projectRef] = hostname.split(".");
  return projectRef || "";
}

function requireProviderInputs() {
  loadEnvFiles();
  const supabaseUrl = readEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = readEnv("SUPABASE_SERVICE_ROLE_KEY");
  const missing = [
    ["NEXT_PUBLIC_SUPABASE_URL", supabaseUrl],
    ["SUPABASE_SERVICE_ROLE_KEY", serviceRoleKey],
  ].filter(([, value]) => !value).map(([name]) => name);
  if (missing.length > 0) throw new Error(`Missing required environment variable(s): ${missing.join(", ")}.`);

  const projectRef = readProjectRef(supabaseUrl!);
  if (projectRef !== EXPECTED_PROJECT_REF) {
    throw new Error(
      `Refusing account-settings D1 backfill; NEXT_PUBLIC_SUPABASE_URL points to project ${projectRef || "unknown"}, expected ${EXPECTED_PROJECT_REF}.`,
    );
  }
  return { projectRef, serviceRoleKey: serviceRoleKey!, supabaseUrl: supabaseUrl! };
}

function sqlValue(value: string | null | undefined) {
  if (value === null || value === undefined) return "NULL";
  return `'${value.replaceAll("'", "''")}'`;
}

function assertPrimaryUse(value: string | null, label: string, index: number) {
  if (value !== null && !PRIMARY_USES.has(value)) throw new Error(`${label} row ${index} has invalid primary_use.`);
}

function assertUserProfileRow(row: UserOnboardingProfileRow, index: number) {
  if (!row.user_id || !row.display_name.trim() || !row.country_region.trim()) {
    throw new Error(`user_onboarding_profiles row ${index} is missing required fields.`);
  }
  if (!USER_CATEGORIES.has(row.user_category)) {
    throw new Error(`user_onboarding_profiles row ${index} has invalid user_category.`);
  }
  assertPrimaryUse(row.primary_use, "user_onboarding_profiles", index);
}

function assertWorkspaceSettingsRow(row: WorkspaceAccountSettingsRow, index: number) {
  if (!row.workspace_id || !row.organization_name.trim() || !row.country_region.trim()) {
    throw new Error(`workspace_account_settings row ${index} is missing required fields.`);
  }
  if (!ORGANIZATION_TYPES.has(row.organization_type)) {
    throw new Error(`workspace_account_settings row ${index} has invalid organization_type.`);
  }
  if (row.company_size !== null && !COMPANY_SIZES.has(row.company_size)) {
    throw new Error(`workspace_account_settings row ${index} has invalid company_size.`);
  }
  if (!/^[A-Z]{3}$/.test(row.default_currency)) {
    throw new Error(`workspace_account_settings row ${index} has invalid default_currency.`);
  }
  assertPrimaryUse(row.primary_use, "workspace_account_settings", index);
}

function buildUserProfileUpserts(rows: UserOnboardingProfileRow[]) {
  return rows.map((row, index) => {
    assertUserProfileRow(row, index);
    return `
INSERT INTO user_onboarding_profiles (
  user_id,
  display_name,
  user_category,
  country_region,
  primary_use,
  student_educator_detail,
  marketing_consent_at,
  onboarding_completed_at,
  created_at,
  updated_at
) VALUES (
  ${sqlValue(row.user_id)},
  ${sqlValue(row.display_name)},
  ${sqlValue(row.user_category)},
  ${sqlValue(row.country_region)},
  ${sqlValue(row.primary_use)},
  ${sqlValue(row.student_educator_detail)},
  ${sqlValue(row.marketing_consent_at)},
  ${sqlValue(row.onboarding_completed_at)},
  ${sqlValue(row.created_at)},
  ${sqlValue(row.updated_at)}
)
ON CONFLICT(user_id) DO UPDATE SET
  display_name = excluded.display_name,
  user_category = excluded.user_category,
  country_region = excluded.country_region,
  primary_use = excluded.primary_use,
  student_educator_detail = excluded.student_educator_detail,
  marketing_consent_at = excluded.marketing_consent_at,
  onboarding_completed_at = excluded.onboarding_completed_at,
  created_at = excluded.created_at,
  updated_at = excluded.updated_at;
`.trim();
  });
}

function buildWorkspaceSettingsUpserts(rows: WorkspaceAccountSettingsRow[]) {
  return rows.map((row, index) => {
    assertWorkspaceSettingsRow(row, index);
    return `
INSERT INTO workspace_account_settings (
  workspace_id,
  organization_name,
  organization_type,
  country_region,
  company_size,
  default_currency,
  primary_use,
  created_at,
  updated_at
) VALUES (
  ${sqlValue(row.workspace_id)},
  ${sqlValue(row.organization_name)},
  ${sqlValue(row.organization_type)},
  ${sqlValue(row.country_region)},
  ${sqlValue(row.company_size)},
  ${sqlValue(row.default_currency)},
  ${sqlValue(row.primary_use)},
  ${sqlValue(row.created_at)},
  ${sqlValue(row.updated_at)}
)
ON CONFLICT(workspace_id) DO UPDATE SET
  organization_name = excluded.organization_name,
  organization_type = excluded.organization_type,
  country_region = excluded.country_region,
  company_size = excluded.company_size,
  default_currency = excluded.default_currency,
  primary_use = excluded.primary_use,
  created_at = excluded.created_at,
  updated_at = excluded.updated_at;
`.trim();
  });
}

function buildUpsertSql(userProfiles: UserOnboardingProfileRow[], workspaceSettings: WorkspaceAccountSettingsRow[]) {
  return [
    ...buildUserProfileUpserts(userProfiles),
    ...buildWorkspaceSettingsUpserts(workspaceSettings),
    "",
  ].join("\n\n");
}

function countBy<T>(rows: T[], readValue: (row: T) => string) {
  return rows.reduce<CountMap>((counts, row) => {
    const value = readValue(row);
    counts[value] = (counts[value] ?? 0) + 1;
    return counts;
  }, {});
}

function extractJsonArray(input: string) {
  const start = input.indexOf("[");
  const end = input.lastIndexOf("]");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(input.slice(start, end + 1)) as unknown;
  } catch {
    return null;
  }
}

function extractCount(stdout: string, key: string) {
  const parsed = extractJsonArray(stdout);
  if (!Array.isArray(parsed)) return null;
  const first = parsed[0];
  if (!first || typeof first !== "object") return null;
  const results = (first as { results?: unknown }).results;
  if (!Array.isArray(results)) return null;
  const row = results[0];
  if (!row || typeof row !== "object") return null;
  const value = (row as Record<string, unknown>)[key];
  return typeof value === "number" ? value : null;
}

function readBackD1Rows(
  targetD1Database: string,
  expectedUserProfileRows: number,
  expectedWorkspaceSettingsRows: number,
): BackfillReport["d1Readback"] {
  const command = [
    "SELECT",
    "(SELECT COUNT(*) FROM user_onboarding_profiles) AS userProfileRows,",
    "(SELECT COUNT(*) FROM workspace_account_settings) AS workspaceSettingsRows;",
  ].join(" ");
  const result = spawnSync("bunx", ["wrangler", "d1", "execute", targetD1Database, "--remote", "--command", command], {
    cwd: resolve("."),
    encoding: "utf8",
    timeout: 60_000,
    maxBuffer: 1024 * 1024,
  });
  const userProfileRows = extractCount(result.stdout ?? "", "userProfileRows");
  const workspaceSettingsRows = extractCount(result.stdout ?? "", "workspaceSettingsRows");
  return {
    args: ["wrangler", "d1", "execute", targetD1Database, "--remote", "--command", command],
    exitCode: result.status,
    signal: result.signal,
    stdoutBytes: Buffer.byteLength(result.stdout ?? ""),
    stderrBytes: Buffer.byteLength(result.stderr ?? ""),
    timedOut: result.error?.message.includes("ETIMEDOUT") ?? false,
    userProfileRows,
    workspaceSettingsRows,
    ready:
      result.status === 0
      && userProfileRows !== null
      && workspaceSettingsRows !== null
      && userProfileRows >= expectedUserProfileRows
      && workspaceSettingsRows >= expectedWorkspaceSettingsRows,
  };
}

async function readSourceRows() {
  const { projectRef, serviceRoleKey, supabaseUrl } = requireProviderInputs();
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { "X-Client-Info": "archestimator-account-settings-d1-backfill" } },
  });

  const [userProfilesResult, workspaceSettingsResult] = await Promise.all([
    supabase
      .from("user_onboarding_profiles")
      .select("user_id, display_name, user_category, country_region, primary_use, student_educator_detail, marketing_consent_at, onboarding_completed_at, created_at, updated_at")
      .order("created_at", { ascending: true }),
    supabase
      .from("workspace_account_settings")
      .select("workspace_id, organization_name, organization_type, country_region, company_size, default_currency, primary_use, created_at, updated_at")
      .order("created_at", { ascending: true }),
  ]);

  if (userProfilesResult.error) {
    throw new Error(`Unable to read user_onboarding_profiles rows: ${userProfilesResult.error.message || userProfilesResult.error.code || "unknown error"}.`);
  }
  if (workspaceSettingsResult.error) {
    throw new Error(`Unable to read workspace_account_settings rows: ${workspaceSettingsResult.error.message || workspaceSettingsResult.error.code || "unknown error"}.`);
  }

  return {
    projectRef,
    userProfiles: userProfilesResult.data as UserOnboardingProfileRow[],
    workspaceSettings: workspaceSettingsResult.data as WorkspaceAccountSettingsRow[],
  };
}

function writeEvidence(report: BackfillReport) {
  mkdirSync(EVIDENCE_DIR, { recursive: true });
  writeFileSync(EVIDENCE_JSON, `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(
    EVIDENCE_MD,
    [
      "# Cloudflare D1 Account Settings Backfill",
      "",
      `Generated: ${report.generatedAt}`,
      "",
      `- Source Supabase project: ${report.sourceProjectRef}`,
      `- Target D1 database: ${report.targetD1Database}`,
      `- Source user onboarding profile rows copied: ${report.sourceUserProfileRows}`,
      `- Source workspace account settings rows copied: ${report.sourceWorkspaceSettingsRows}`,
      `- Source user category counts: ${JSON.stringify(report.sourceUserCategoryCounts)}`,
      `- Source organization type counts: ${JSON.stringify(report.sourceOrganizationTypeCounts)}`,
      `- Source completed onboarding rows: ${report.sourceCompletedOnboardingRows}`,
      `- Wrangler exit code: ${report.wrangler.exitCode}`,
      `- D1 user profile rows: ${report.d1Readback.userProfileRows ?? "(unknown)"}`,
      `- D1 workspace settings rows: ${report.d1Readback.workspaceSettingsRows ?? "(unknown)"}`,
      `- D1 backfill ready: ${report.readiness.d1BackfillReady}`,
      `- Blockers: ${report.blockers.length > 0 ? report.blockers.join("; ") : "none"}`,
      "",
      "No user ids, workspace ids, email addresses, or secret values are stored in this evidence file.",
      "",
    ].join("\n"),
  );
}

async function main() {
  const generatedAt = new Date().toISOString();
  const targetD1Database = readEnv("ARCHESTIMATOR_D1_DATABASE") ?? DEFAULT_D1_DATABASE;
  const { projectRef, userProfiles, workspaceSettings } = await readSourceRows();
  const blockers: string[] = [];
  let wrangler = {
    args: ["wrangler", "d1", "execute", targetD1Database, "--remote", "--file", "<redacted-temp-sql-file>"],
    exitCode: userProfiles.length === 0 && workspaceSettings.length === 0 ? 0 : null,
    signal: null,
    stdoutBytes: 0,
    stderrBytes: 0,
    timedOut: false,
  } satisfies CommandReport;

  if (userProfiles.length > 0 || workspaceSettings.length > 0) {
    const tempDir = mkdtempSync(join(tmpdir(), "archestimator-account-settings-d1-"));
    const tempSql = join(tempDir, "backfill.sql");
    try {
      writeFileSync(tempSql, buildUpsertSql(userProfiles, workspaceSettings));
      const result = spawnSync("bunx", ["wrangler", "d1", "execute", targetD1Database, "--remote", "--file", tempSql], {
        cwd: resolve("."),
        encoding: "utf8",
        timeout: 120_000,
        maxBuffer: 1024 * 1024,
      });
      wrangler = {
        args: ["wrangler", "d1", "execute", targetD1Database, "--remote", "--file", "<redacted-temp-sql-file>"],
        exitCode: result.status,
        signal: result.signal,
        stdoutBytes: Buffer.byteLength(result.stdout ?? ""),
        stderrBytes: Buffer.byteLength(result.stderr ?? ""),
        timedOut: result.error?.message.includes("ETIMEDOUT") ?? false,
      };
      if (result.status !== 0) blockers.push("Wrangler D1 account-settings backfill command failed.");
    } finally {
      rmSync(tempDir, { force: true, recursive: true });
    }
  }

  const d1Readback = readBackD1Rows(targetD1Database, userProfiles.length, workspaceSettings.length);
  if (!d1Readback.ready) blockers.push("D1 account settings readback did not match the Supabase source row counts.");

  const upsertSucceeded = (userProfiles.length === 0 && workspaceSettings.length === 0) || wrangler.exitCode === 0;
  const report: BackfillReport = {
    generatedAt,
    mode: "cloudflare-d1-account-settings-backfill",
    sourceProjectRef: projectRef,
    targetD1Database,
    sourceUserProfileRows: userProfiles.length,
    sourceWorkspaceSettingsRows: workspaceSettings.length,
    sourceUserCategoryCounts: countBy(userProfiles, (row) => row.user_category),
    sourceOrganizationTypeCounts: countBy(workspaceSettings, (row) => row.organization_type),
    sourceCompletedOnboardingRows: userProfiles.filter((row) => row.onboarding_completed_at).length,
    wrangler,
    d1Readback,
    readiness: {
      sourceProjectBoundaryReady: projectRef === EXPECTED_PROJECT_REF,
      upsertSucceeded,
      d1ReadbackReady: d1Readback.ready,
      d1BackfillReady: projectRef === EXPECTED_PROJECT_REF && upsertSucceeded && d1Readback.ready && blockers.length === 0,
    },
    blockers,
    note:
      "Provider backfill for the account settings D1 slice. Reads only the expected Archestimator Supabase project, writes idempotent rows to Cloudflare D1, and records sanitized aggregate counts only.",
  };

  writeEvidence(report);
  console.log(JSON.stringify(report, null, 2));
  if (!report.readiness.d1BackfillReady) process.exitCode = 1;
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
