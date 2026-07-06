#!/usr/bin/env bun

import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, resolve, sep } from "node:path";

import { extractRpcNames, type CloudflareMigrationInventory, type ProviderDependency } from "./generate-cloudflare-migration-inventory";

type Artifact<T> = {
  source: string | null;
  present: boolean;
  value: T | null;
};

type AccessSurface = "api-route" | "page-route" | "server-action" | "repository" | "worker" | "source";

type AccessMatrixRow = {
  id: string;
  surface: AccessSurface;
  file: string;
  route: string | null;
  domain: string;
  rpcNames: string[];
  currentProviderSignals: string[];
  requiredD1Checks: string[];
  positiveTestRefs: string[];
  denialTestRefs: string[];
  crossWorkspaceDenialTestRefs: string[];
  status: "covered" | "missing-d1-check" | "missing-positive-test" | "missing-denial-test" | "missing-cross-workspace-denial";
  notes: string[];
};

type AccessMatrixInputs = {
  inventory: Artifact<Partial<CloudflareMigrationInventory>>;
  sourceFileTextByPath: Record<string, string>;
  testFileTextByPath: Record<string, string>;
  generatedAt?: string;
  sources?: Partial<CloudflareD1AuthzAccessMatrixReport["sources"]>;
};

export type CloudflareD1AuthzAccessMatrixReport = {
  generatedAt: string;
  mode: "cloudflare-d1-authz-access-matrix";
  sources: {
    inventory: string | null;
    sourceRoots: string[];
    testRoots: string[];
  };
  accessPathCount: number;
  positiveTestCount: number;
  denialTestCount: number;
  crossWorkspaceDenialTestCount: number;
  allProtectedAccessPathsCovered: boolean;
  crossWorkspaceDenialsReady: boolean;
  routeActionCoverageReady: boolean;
  rows: AccessMatrixRow[];
  blockers: string[];
  note: string;
};

const PLAN_ROOT = ".ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence";

const DEFAULT_FILES = {
  inventory: `${PLAN_ROOT}/2026-06-30-cloudflare-migration-inventory.json`,
} as const;

const SOURCE_EXTENSIONS = new Set([".cjs", ".cts", ".js", ".jsx", ".mjs", ".mts", ".ts", ".tsx"]);
const TEST_EXTENSIONS = new Set([".ts", ".tsx"]);

const AUTHZ_RPC_PATTERN =
  /^(?:can_|is_workspace_|assert_can_|authorize_|accept_collaboration|resolve_collaboration|read_project_collaboration|create_project_publication|republish_project_publication|delete_project_publication|increment_project_publication|record_upload|approve_upload|validate_|create_cost_library|update_cost_library|upsert_cost_library|set_cost_library|preview_bulk|execute_bulk|delete_library|reorder_library|create_ai_package|create_project_estimate_package|create_estimate|insert_estimate|update_estimate|delete_estimate|restore_deleted|reorder_estimate|rename_estimate|duplicate_estimate|archive_estimate|move_estimate|replace_estimate|unlink_estimate|promote_estimate|workspace_|library_|submit_beta|check_closed_beta|read_closed_beta|create_closed_beta|update_closed_beta)/i;

const DENIAL_TEST_PATTERN =
  /\b(?:den(?:y|ies|ial)|forbid(?:den)?|unauthori[sz]ed|401|403|404|not found|fail(?:s)? closed|viewer|read-only|wrong workspace|other workspace|outside the current workspace|cross-workspace|permission|rejects|blocks|prevents|refuses)\b/i;

const POSITIVE_TEST_PATTERN =
  /\b(?:allow(?:s|ed)?|pass(?:es)?|success(?:ful|fully)?|succeed(?:s)?|return(?:s)?|resolve(?:s)?|render(?:s)?|create(?:s)?|update(?:s)?|insert(?:s)?|list(?:s)?|read(?:s)?|open(?:s)?|accept(?:s)?|record(?:s)?|exercise(?:s)?|grant(?:s)?|keep(?:s)?|scope(?:s)?|protect(?:s)?|use(?:s)?|wire(?:s)?|map(?:s)?|call(?:s)?|contain(?:s)?)\b/i;

const CROSS_WORKSPACE_PATTERN =
  /\b(?:cross-workspace|other workspace|wrong workspace|outside the current workspace|different workspace|workspace-2|forged workspace|preserved)\b/i;

const TENANT_SCOPE_PATTERN =
  /\b(?:workspace|workspaces|project|projects|estimate|estimates|library|libraries|collaboration|collaborations|publication|publications|upload|uploads|attachment|attachments|proposal|proposals|invite|invites)\b/i;

const GENERATED_OR_NON_ACCESS_SOURCE_PATTERN = /(?:^|\/)(?:src\/lib\/supabase\/types\.ts|cloudflare-env\.d\.ts)$/;

const AUTHZ_TABLE_QUERY_PATTERN =
  /\.from\(\s*["'](?:workspace_members|project_members|estimate_sheet_members|workspace_account_settings|workspaces|projects|upload_sessions|upload_assets)["']\s*\)/i;

const AUTHZ_RLS_SOURCE_PATTERN = /\bauth\.uid\(|\bRLS\b|row level security/i;

const TEST_EVIDENCE_ALIASES_BY_FILE: Record<string, string[]> = {
  "src/lib/auth/account-actions.ts": [
    "updateWorkspaceSettings",
    "workspace settings",
    "src/lib/auth/account-actions.ts",
  ],
  "src/lib/auth/account-membership.ts": [
    "readFirstAccountWorkspaceMembership",
    "ensureDefaultWorkspace",
    "workspace_members",
    "project_members",
    "estimate_sheet_members",
  ],
  "src/lib/uploads/direct-upload-records.ts": [
    "component attachment signed direct-upload route",
    "direct-upload",
    "create_upload_session",
    "finalize_upload_session",
  ],
  "src/lib/uploads/scan-job.ts": [
    "internal upload scan route",
    "upload scan job",
    "record_upload_scan_result",
  ],
  "src/lib/uploads/scan-override.ts": [
    "upload scan override",
    "approve_upload_scan_override",
  ],
};

const INTERNAL_SERVICE_OR_ADMIN_ACCESS_FILES = new Set([
  "src/lib/uploads/cleanup-job.ts",
  "src/lib/uploads/operations-dashboard.ts",
  "src/lib/uploads/scan-job.ts",
  "src/lib/uploads/scan-override.ts",
  "src/lib/uploads/scan-override-review.ts",
]);

function readEnv(name: string) {
  const value = process.env[name];
  return value?.trim() || undefined;
}

function readArtifact<T>(source: string | undefined): Artifact<T> {
  if (!source || !existsSync(source)) {
    return { source: source ?? null, present: false, value: null };
  }
  return {
    source,
    present: true,
    value: JSON.parse(readFileSync(source, "utf8")) as T,
  };
}

function normalizeRepoPath(path: string) {
  return path.split(sep).join("/");
}

function toRepoRelativePath(path: string) {
  const normalized = normalizeRepoPath(path);
  const cwd = normalizeRepoPath(process.cwd());
  return normalized.startsWith(`${cwd}/`) ? normalized.slice(cwd.length + 1) : normalized;
}

function isSourceFile(path: string) {
  return SOURCE_EXTENSIONS.has(extname(path));
}

function isTestFile(path: string) {
  return TEST_EXTENSIONS.has(extname(path));
}

function listFilesRecursively(path: string, includeFile: (path: string) => boolean) {
  if (!existsSync(path)) return [];
  const stats = statSync(path);
  if (stats.isFile()) return includeFile(path) ? [normalizeRepoPath(path)] : [];
  const files: string[] = [];

  for (const entry of readdirSync(path, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    const childPath = resolve(path, entry.name);
    if (entry.isDirectory()) {
      files.push(...listFilesRecursively(childPath, includeFile));
    } else if (entry.isFile() && includeFile(childPath)) {
      files.push(normalizeRepoPath(childPath));
    }
  }

  return files.sort();
}

function readFiles(paths: string[]) {
  const textByPath: Record<string, string> = {};
  for (const path of paths) {
    textByPath[toRepoRelativePath(path)] = readFileSync(path, "utf8");
  }
  return textByPath;
}

function uniqueSorted(values: Iterable<string>) {
  return Array.from(new Set(values)).filter(Boolean).sort();
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function slug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function normalizeTextForMatching(input: string) {
  return input.replaceAll("'", "\"").toLowerCase();
}

function routeTokens(route: string | null) {
  if (!route) return [];
  return route
    .split("/")
    .filter((part) => part && !part.startsWith("["))
    .filter((part) => part.length >= 4);
}

function sourceTokens(file: string) {
  const base = basename(file).replace(/\.(?:test\.)?[cm]?[tj]sx?$/, "");
  return [
    base,
    ...file.split("/").filter((part) => part.length >= 5 && !part.includes(".") && !part.startsWith("[")),
  ];
}

function isAuthzRelevantRpcName(name: string) {
  return AUTHZ_RPC_PATTERN.test(name);
}

function isAuthzRelevantSource(file: string, text: string, rpcNames: string[], dependencies: string[]) {
  if (GENERATED_OR_NON_ACCESS_SOURCE_PATTERN.test(file)) return false;
  if (rpcNames.some(isAuthzRelevantRpcName)) return true;
  if (dependencies.includes("supabase-rpc")) return true;
  if (AUTHZ_TABLE_QUERY_PATTERN.test(text)) return true;
  if (AUTHZ_RLS_SOURCE_PATTERN.test(text) && /\b(?:policy|policies|supabase|postgres|migration)\b/i.test(text)) return true;
  return false;
}

function classifySurface(file: string): AccessSurface {
  if (file === "worker.ts" || file.startsWith("src/worker")) return "worker";
  if (file.includes("/route.ts")) return "api-route";
  if (file.includes("/page.tsx")) return "page-route";
  if (file.endsWith("/actions.ts") || file.endsWith("-actions.ts")) return "server-action";
  if (file.includes("/repositories/") || file.includes("repository")) return "repository";
  return "source";
}

function classifyDomain(file: string, rpcNames: string[], route: string | null) {
  const haystack = `${file} ${route ?? ""} ${rpcNames.join(" ")}`.toLowerCase();
  if (/closed_beta|allowlist|beta/.test(haystack)) return "closed beta access";
  if (/upload|image|attachment|asset|scan/.test(haystack)) return "uploads and media";
  if (/publication|share|proposal|recipient|unsubscribe/.test(haystack)) return "publication and proposals";
  if (/collaboration|invite/.test(haystack)) return "collaboration invitations";
  if (/library|component|template|brand|folder/.test(haystack)) return "component library";
  if (/estimate|sheet|node|row|tab/.test(haystack)) return "estimate editing";
  if (/project/.test(haystack)) return "projects";
  if (/workspace|homebase/.test(haystack)) return "workspace";
  if (/ai_package|package-builder|ai/.test(haystack)) return "AI package builder";
  return "workspace data";
}

function requiredD1ChecksFor(file: string, rpcNames: string[], domain: string, sourceText: string) {
  const haystack = `${file} ${rpcNames.join(" ")} ${domain} ${sourceText.slice(0, 4000)}`.toLowerCase();
  const checks = new Set<string>();

  if (/can_edit_project|project.*edit|location|activity/.test(haystack)) {
    checks.add("D1 project edit guard using server-derived user and project membership");
  }
  if (/can_access_project|project.*access|publication|proposal/.test(haystack)) {
    checks.add("D1 project access guard using server-derived user, membership, or publication recipient");
  }
  if (/can_edit_estimate|estimate.*edit|_with_history|row_item|estimate_node|estimate_tab|bulk_delete_estimate/.test(haystack)) {
    checks.add("D1 estimate edit guard before mutations and history writes");
  }
  if (/can_access_estimate|estimate.*access|proposal\.xlsx|user-preferences/.test(haystack)) {
    checks.add("D1 estimate access guard before reads, exports, and preferences");
  }
  if (/is_workspace_editor|library|component|template|folder/.test(haystack)) {
    checks.add("D1 workspace editor guard for library and template writes");
  }
  if (/is_workspace_member|workspace_homebase|workspace_projects|library_overview|library_templates|library_component/.test(haystack)) {
    checks.add("D1 workspace member guard for read models");
  }
  if (/collaboration|invite|accept_collaboration|resolve_collaboration/.test(haystack)) {
    checks.add("D1 invitation token and project collaboration guard");
  }
  if (/publication|share|proposal|recipient|increment_project_publication/.test(haystack)) {
    checks.add("D1 publication owner/recipient guard with token-bound recipient checks");
  }
  if (/upload|image|attachment|asset|scan|validate_estimate_row_image_asset/.test(haystack)) {
    checks.add("D1 upload ownership guard plus R2 object-key validation");
  }
  if (/closed_beta|allowlist|beta/.test(haystack)) {
    checks.add("D1 beta allowlist/platform-admin guard");
  }
  if (/ai_package|package-builder|create_project_estimate_package/.test(haystack)) {
    checks.add("D1 AI package Apply guard with explicit confirmation and workspace ownership");
  }
  if (/preview_bulk|execute_bulk|delete_|restore_|archive_|reorder_|move_|replace_|update_|create_|insert_/.test(haystack)) {
    checks.add("D1 mutation guard with transaction and rollback proof");
  }
  if (checks.size === 0 && rpcNames.length > 0) {
    checks.add("D1 app-layer guard matching the current Supabase RPC/RLS ownership rule");
  }

  return [...checks].sort();
}

function providerSignals(dependencies: string[], rpcNames: string[], sourceText: string) {
  const signals = new Set<string>();
  for (const dependency of dependencies) signals.add(dependency);
  for (const name of rpcNames) signals.add(`supabase.rpc:${name}`);
  if (/\.from\(\s*["']workspace_members["']\s*\)/i.test(sourceText)) signals.add("source:workspace_members lookup");
  if (AUTHZ_RLS_SOURCE_PATTERN.test(sourceText)) signals.add("source:RLS/auth reference");
  return [...signals].sort();
}

function testMatchesRow(testText: string, row: Pick<AccessMatrixRow, "file" | "route" | "rpcNames" | "domain">) {
  const normalized = normalizeTextForMatching(testText);
  const exactRpcMatch = row.rpcNames.some((name) => {
    const rpcPattern = new RegExp(`["']${escapeRegExp(name.toLowerCase())}["']|\\b${escapeRegExp(name.toLowerCase())}\\b`);
    return rpcPattern.test(normalized);
  });
  if (exactRpcMatch) return true;

  const fileNeedles = [row.file.toLowerCase(), basename(row.file).toLowerCase()];
  if (fileNeedles.some((needle) => normalized.includes(needle))) return true;

  const aliasNeedles = TEST_EVIDENCE_ALIASES_BY_FILE[row.file] ?? [];
  if (aliasNeedles.some((needle) => normalized.includes(needle.toLowerCase()))) return true;

  const tokens = uniqueSorted([...routeTokens(row.route), ...sourceTokens(row.file), ...row.domain.split(/\s+/)])
    .map((token) => token.toLowerCase())
    .filter((token) => token.length >= 6);
  const tokenMatches = tokens.filter((token) => normalized.includes(token)).length;
  return tokenMatches >= 2;
}

function classifyTestRefs(
  row: Pick<AccessMatrixRow, "file" | "route" | "rpcNames" | "domain">,
  testFileTextByPath: Record<string, string>,
) {
  const positive = new Set<string>();
  const denial = new Set<string>();
  const crossWorkspace = new Set<string>();

  for (const [file, text] of Object.entries(testFileTextByPath)) {
    if (!testMatchesRow(text, row)) continue;
    const ref = file;
    if (POSITIVE_TEST_PATTERN.test(text)) positive.add(ref);
    if (DENIAL_TEST_PATTERN.test(text)) denial.add(ref);
    if (CROSS_WORKSPACE_PATTERN.test(text)) crossWorkspace.add(ref);
  }

  return {
    positiveTestRefs: [...positive].sort().slice(0, 12),
    denialTestRefs: [...denial].sort().slice(0, 12),
    crossWorkspaceDenialTestRefs: [...crossWorkspace].sort().slice(0, 12),
  };
}

function isTenantScoped(row: AccessMatrixRow) {
  return TENANT_SCOPE_PATTERN.test(`${row.file} ${row.route ?? ""} ${row.domain} ${row.rpcNames.join(" ")}`);
}

function requiresCrossWorkspaceDenial(row: AccessMatrixRow) {
  if (!isTenantScoped(row)) return false;
  if (row.file === "src/lib/auth/account-membership.ts") return false;
  if (INTERNAL_SERVICE_OR_ADMIN_ACCESS_FILES.has(row.file)) return false;
  return true;
}

function rowStatus(row: AccessMatrixRow): AccessMatrixRow["status"] {
  if (row.requiredD1Checks.length === 0) return "missing-d1-check";
  if (row.positiveTestRefs.length === 0) return "missing-positive-test";
  if (row.denialTestRefs.length === 0) return "missing-denial-test";
  if (requiresCrossWorkspaceDenial(row) && row.crossWorkspaceDenialTestRefs.length === 0) return "missing-cross-workspace-denial";
  return "covered";
}

function buildRows(inputs: AccessMatrixInputs) {
  const inventoryRows = inputs.inventory.value?.providerCoupling ?? [];
  const appRouteByFile = new Map((inputs.inventory.value?.appRoutes ?? []).map((route) => [route.file, route.route]));
  const rowsByFile = new Map<string, { file: string; route: string | null; dependencies: string[]; rpcNames: string[] }>();

  for (const row of inventoryRows) {
    const sourceText = inputs.sourceFileTextByPath[row.file] ?? "";
    if (!isAuthzRelevantSource(row.file, sourceText, row.rpcNames ?? [], row.dependencies ?? [])) continue;
    rowsByFile.set(row.file, {
      file: row.file,
      route: row.route ?? appRouteByFile.get(row.file) ?? null,
      dependencies: row.dependencies ?? [],
      rpcNames: row.rpcNames ?? extractRpcNames(sourceText),
    });
  }

  for (const [file, sourceText] of Object.entries(inputs.sourceFileTextByPath)) {
    if (rowsByFile.has(file)) continue;
    const rpcNames = extractRpcNames(sourceText);
    if (!isAuthzRelevantSource(file, sourceText, rpcNames, [])) continue;
    rowsByFile.set(file, {
      file,
      route: appRouteByFile.get(file) ?? null,
      dependencies: rpcNames.length > 0 ? ["supabase-rpc"] : [],
      rpcNames,
    });
  }

  return [...rowsByFile.values()]
    .map((candidate) => {
      const sourceText = inputs.sourceFileTextByPath[candidate.file] ?? "";
      const domain = classifyDomain(candidate.file, candidate.rpcNames, candidate.route);
      const requiredD1Checks = requiredD1ChecksFor(candidate.file, candidate.rpcNames, domain, sourceText);
      const tests = classifyTestRefs(
        {
          file: candidate.file,
          route: candidate.route,
          rpcNames: candidate.rpcNames,
          domain,
        },
        inputs.testFileTextByPath,
      );
      const row: AccessMatrixRow = {
        id: slug(`${candidate.file}:${candidate.rpcNames.join("-") || domain}`),
        surface: classifySurface(candidate.file),
        file: candidate.file,
        route: candidate.route,
        domain,
        rpcNames: uniqueSorted(candidate.rpcNames),
        currentProviderSignals: providerSignals(candidate.dependencies, candidate.rpcNames, sourceText),
        requiredD1Checks,
        ...tests,
        status: "covered",
        notes: [
          "D1 migration must preserve the current fail-closed behavior with server-derived user/workspace context.",
          "This row is generated from local source and sanitized inventory evidence; it is not hosted provider proof.",
        ],
      };
      row.status = rowStatus(row);
      return row;
    })
    .filter((row) => row.currentProviderSignals.length > 0 || row.requiredD1Checks.length > 0)
    .sort((a, b) => a.file.localeCompare(b.file) || a.id.localeCompare(b.id));
}

function buildBlockers(rows: AccessMatrixRow[], inventoryPresent: boolean) {
  const blockers: string[] = [];
  const crossWorkspaceRows = rows.filter(requiresCrossWorkspaceDenial);
  const missingD1 = rows.filter((row) => row.requiredD1Checks.length === 0);
  const missingPositive = rows.filter((row) => row.positiveTestRefs.length === 0);
  const missingDenial = rows.filter((row) => row.denialTestRefs.length === 0);
  const missingCross = crossWorkspaceRows.filter((row) => row.crossWorkspaceDenialTestRefs.length === 0);

  if (!inventoryPresent) blockers.push("Cloudflare migration inventory artifact is missing; regenerate cf:inventory before trusting the matrix.");
  if (rows.length === 0) blockers.push("No authorization-relevant Supabase/RLS access paths were discovered.");
  if (missingD1.length > 0) blockers.push(`${missingD1.length} access paths do not have an inferred D1 app-layer guard.`);
  if (missingPositive.length > 0) blockers.push(`${missingPositive.length} access paths lack a matching positive test reference.`);
  if (missingDenial.length > 0) blockers.push(`${missingDenial.length} access paths lack a matching denial/fail-closed test reference.`);
  if (missingCross.length > 0) blockers.push(`${missingCross.length} tenant-scoped access paths lack a matching cross-workspace denial reference.`);

  return blockers;
}

export function buildCloudflareD1AuthzAccessMatrix(inputs: AccessMatrixInputs): CloudflareD1AuthzAccessMatrixReport {
  const rows = buildRows(inputs);
  const crossWorkspaceRows = rows.filter(requiresCrossWorkspaceDenial);
  const positiveTestCount = rows.filter((row) => row.positiveTestRefs.length > 0).length;
  const denialTestCount = rows.filter((row) => row.denialTestRefs.length > 0).length;
  const crossWorkspaceDenialTestCount = rows.filter((row) => row.crossWorkspaceDenialTestRefs.length > 0).length;
  const allProtectedAccessPathsCovered = rows.length > 0 && rows.every((row) => row.requiredD1Checks.length > 0);
  const routeActionCoverageReady = rows.length > 0 && rows.every((row) => row.positiveTestRefs.length > 0 && row.denialTestRefs.length > 0);
  const crossWorkspaceDenialsReady = rows.length > 0
    && crossWorkspaceRows.every((row) => row.crossWorkspaceDenialTestRefs.length > 0);

  return {
    generatedAt: inputs.generatedAt ?? new Date().toISOString(),
    mode: "cloudflare-d1-authz-access-matrix",
    sources: {
      inventory: inputs.inventory.source,
      sourceRoots: inputs.sources?.sourceRoots ?? [],
      testRoots: inputs.sources?.testRoots ?? [],
    },
    accessPathCount: rows.length,
    positiveTestCount,
    denialTestCount,
    crossWorkspaceDenialTestCount,
    allProtectedAccessPathsCovered,
    crossWorkspaceDenialsReady,
    routeActionCoverageReady,
    rows,
    blockers: buildBlockers(rows, inputs.inventory.present),
    note:
      "Local D1 app-layer authorization migration matrix only. It reads repository source, Vitest files, and sanitized inventory artifacts; it does not read env files, print secret values, call provider APIs, create D1 databases, mutate Cloudflare/Supabase, change DNS, deploy Workers, or make Supabase removable.",
  };
}

function writeOutput(outputFile: string, report: CloudflareD1AuthzAccessMatrixReport) {
  const outputPath = resolve(outputFile);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
}

function markdownRows(rows: string[][]) {
  return rows.map((row) => `| ${row.map((cell) => cell.replaceAll("|", "\\|")).join(" | ")} |`);
}

export function writeMarkdown(report: CloudflareD1AuthzAccessMatrixReport, markdownFile: string) {
  const outputPath = resolve(markdownFile);
  mkdirSync(dirname(outputPath), { recursive: true });
  const rowPreview = report.rows.slice(0, 80).map((row) => [
    row.status,
    row.surface,
    `\`${row.file}\``,
    row.route ?? "",
    row.domain,
    row.rpcNames.map((name) => `\`${name}\``).join(", "),
    row.requiredD1Checks.join("<br>"),
    String(row.positiveTestRefs.length),
    String(row.denialTestRefs.length),
    String(row.crossWorkspaceDenialTestRefs.length),
  ]);
  const blockerLines = report.blockers.length > 0
    ? report.blockers.map((blocker) => `- ${blocker}`)
    : ["- (none)"];
  const lines = [
    "# Cloudflare D1 App-Layer Authorization Access Matrix",
    "",
    `Generated: ${report.generatedAt}`,
    "",
    report.note,
    "",
    "## Summary",
    "",
    "| Item | Value |",
    "| --- | ---: |",
    `| Access paths | ${report.accessPathCount} |`,
    `| Rows with positive test refs | ${report.positiveTestCount} |`,
    `| Rows with denial test refs | ${report.denialTestCount} |`,
    `| Rows with cross-workspace denial refs | ${report.crossWorkspaceDenialTestCount} |`,
    `| All protected access paths covered | ${report.allProtectedAccessPathsCovered ? "yes" : "no"} |`,
    `| Cross-workspace denials ready | ${report.crossWorkspaceDenialsReady ? "yes" : "no"} |`,
    `| Route/action coverage ready | ${report.routeActionCoverageReady ? "yes" : "no"} |`,
    "",
    "## Access Matrix Preview",
    "",
    "The JSON artifact contains the full matrix. This table shows the first 80 sorted rows.",
    "",
    "| Status | Surface | File | Route | Domain | RPC names | Required D1 app-layer checks | Positive refs | Denial refs | Cross-workspace refs |",
    "| --- | --- | --- | --- | --- | --- | --- | ---: | ---: | ---: |",
    ...markdownRows(rowPreview),
    "",
    "## Blockers",
    "",
    ...blockerLines,
    "",
  ];
  writeFileSync(outputPath, lines.join("\n"));
}

function collectRepoInputs(): AccessMatrixInputs {
  const sourceRoots = ["src/app", "src/lib", "src/components", "src/hooks", "src/proxy.ts", "worker.ts"]
    .map((path) => resolve(path))
    .filter(existsSync);
  const testRoots = ["tests/vitest"].map((path) => resolve(path)).filter(existsSync);
  const sourceFiles = sourceRoots.flatMap((root) => listFilesRecursively(root, isSourceFile)).map(toRepoRelativePath);
  const testFiles = testRoots.flatMap((root) => listFilesRecursively(root, isTestFile)).map(toRepoRelativePath);

  return {
    inventory: readArtifact<Partial<CloudflareMigrationInventory>>(
      readEnv("CLOUDFLARE_MIGRATION_INVENTORY_FILE") ?? DEFAULT_FILES.inventory,
    ),
    sourceFileTextByPath: readFiles(sourceFiles),
    testFileTextByPath: readFiles(testFiles),
    sources: {
      sourceRoots: sourceRoots.map(toRepoRelativePath),
      testRoots: testRoots.map(toRepoRelativePath),
    },
  };
}

async function main() {
  const report = buildCloudflareD1AuthzAccessMatrix(collectRepoInputs());
  const outputFile = readEnv("OUTPUT_FILE");
  const markdownFile = readEnv("MARKDOWN_FILE");
  if (outputFile) writeOutput(outputFile, report);
  if (markdownFile) writeMarkdown(report, markdownFile);
  console.log(JSON.stringify(report, null, 2));
  if (report.accessPathCount === 0) process.exitCode = 1;
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
