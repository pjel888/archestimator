#!/usr/bin/env bun

import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";

type LegacyProvider = "supabase" | "vercel" | "resend";

export type ProviderCleanupDisposition =
  | "active-runtime-blocker"
  | "cleanup-candidate"
  | "compatibility-guard"
  | "keep-active-audit-tooling"
  | "keep-active-audit-tooling-test"
  | "keep-active-negative-assertion"
  | "keep-active-security-fixture"
  | "type-reference-retirement"
  | "unclassified";

type ProviderCleanupReferenceHit = {
  provider: LegacyProvider;
  token: string;
  line: number;
  snippet: string;
};

type ProviderCleanupScannedFile = {
  file: string;
  hits: ProviderCleanupReferenceHit[];
};

type ProviderCleanupClassifiedFile = ProviderCleanupScannedFile & {
  disposition: ProviderCleanupDisposition;
  rationale: string;
};

type ProviderCleanupReadiness = {
  activeRuntimeProviderReferencesReady: boolean;
  allProviderStringsClassified: boolean;
  providerCleanupAllowlistReady: boolean;
  finalProviderCleanupReady: boolean;
};

export type ProviderCleanupReferenceScan = {
  scannedPaths: string[];
  totalHitFiles: number;
  files: ProviderCleanupScannedFile[];
};

export type ProviderCleanupAllowlistReport = {
  generatedAt: string;
  mode: "provider-cleanup-allowlist-report";
  scan: {
    scannedPaths: string[];
    totalHitFiles: number;
    files: ProviderCleanupClassifiedFile[];
    dispositionCounts: Record<ProviderCleanupDisposition, number>;
    activeRuntimeBlockerFiles: string[];
    cleanupCandidateFiles: string[];
    typeReferenceRetirementFiles: string[];
    unclassifiedFiles: string[];
  };
  readiness: ProviderCleanupReadiness;
  blockers: string[];
  note: string;
};

export const DEFAULT_PROVIDER_CLEANUP_SCAN_PATHS = ["src", "scripts", "e2e", "tests"];

const DEFAULT_OUTPUT_FILE =
  ".ai/03_plans/000-Follow Ups/2026-07-03-Authentication-Audit-And-Improvement/evidence/2026-07-04-provider-cleanup-allowlist.json";
const DEFAULT_MARKDOWN_FILE =
  ".ai/03_plans/000-Follow Ups/2026-07-03-Authentication-Audit-And-Improvement/evidence/2026-07-04-provider-cleanup-allowlist.md";

const TEXT_EXTENSIONS = new Set([
  ".cjs",
  ".js",
  ".jsx",
  ".json",
  ".jsonc",
  ".lock",
  ".mjs",
  ".ts",
  ".tsx",
]);

const NOTE =
  "Non-destructive provider-cleanup allowlist report. This script reads source, scripts, e2e, and tests only; it does not read .env files, print secrets, mutate providers, deploy, delete data, or prove hosted/provider-dashboard state.";

const HISTORICAL_SUPABASE_TYPES_PATH = ["src", "lib", "supabase", "types.ts"].join("/");

const DISPOSITION_OVERRIDES: Record<string, { disposition: ProviderCleanupDisposition; rationale: string }> = {
  "scripts/check-cloudflare-d1-auth-realtime-readiness.ts": {
    disposition: "keep-active-audit-tooling",
    rationale: "Cloudflare D1/Better Auth readiness scanner intentionally detects legacy Supabase/Resend patterns.",
  },
  "scripts/generate-cloudflare-migration-inventory.ts": {
    disposition: "keep-active-audit-tooling",
    rationale: "Migration inventory tooling intentionally detects Supabase/Vercel coupling.",
  },
  "scripts/collect-live-db-performance-evidence.ts": {
    disposition: "keep-active-audit-tooling",
    rationale: "Historical performance evidence collector keeps explicit, guarded, read-only Supabase comparison modes; it is not runtime code.",
  },
  "scripts/generate-cloudflare-cost-performance-workbook.ts": {
    disposition: "keep-active-audit-tooling",
    rationale: "Cloudflare cost/performance evidence workbook intentionally records legacy-provider comparison command labels.",
  },
  "scripts/generate-cloudflare-d1-authz-access-matrix.ts": {
    disposition: "keep-active-audit-tooling",
    rationale: "D1 authorization matrix intentionally records old Supabase RPC signal labels while proving current coverage.",
  },
  "scripts/generate-cloudflare-better-auth-proof.ts": {
    disposition: "keep-active-audit-tooling",
    rationale: "Better Auth proof tooling intentionally checks retired Supabase auth-gate patterns while proving current Cloudflare/D1 behavior.",
  },
  "scripts/generate-cloudflare-provider-exit-pack.ts": {
    disposition: "keep-active-audit-tooling",
    rationale: "Provider-exit pack intentionally scans for legacy Supabase/Vercel/Resend references.",
  },
  "scripts/generate-provider-cleanup-allowlist.ts": {
    disposition: "keep-active-audit-tooling",
    rationale: "Provider-cleanup allowlist report intentionally scans and classifies legacy provider strings.",
  },
  [HISTORICAL_SUPABASE_TYPES_PATH]: {
    disposition: "type-reference-retirement",
    rationale: "Historical schema-shape reference retained until explicit deletion or final archaeology acceptance.",
  },
  "tests/vitest/auth-proxy.test.ts": {
    disposition: "compatibility-guard",
    rationale: "Mocks retired Supabase proxy modules to prove Better Auth/proxy code does not call them.",
  },
  "tests/vitest/auth-sensitive-api-boundaries.test.ts": {
    disposition: "compatibility-guard",
    rationale: "Uses legacy provider sentinels while asserting sensitive APIs stay on current D1/Cloudflare boundaries.",
  },
  "tests/vitest/terms-gate-direct-callers.test.ts": {
    disposition: "compatibility-guard",
    rationale: "Mocks retired Supabase modules to prove protected direct callers do not use them before terms acceptance.",
  },
  "tests/vitest/cloudflare-better-auth-proof-script.test.ts": {
    disposition: "keep-active-audit-tooling-test",
    rationale: "Fixture coverage for Cloudflare Better Auth proof scanner migration detection.",
  },
  "tests/vitest/cloudflare-d1-auth-realtime-readiness-script.test.ts": {
    disposition: "keep-active-audit-tooling-test",
    rationale: "Fixture coverage for legacy-provider readiness scanner detection.",
  },
  "tests/vitest/cloudflare-migration-inventory-script.test.ts": {
    disposition: "keep-active-audit-tooling-test",
    rationale: "Fixture coverage for migration inventory scanner detection.",
  },
  "tests/vitest/provider-exit-pack-script.test.ts": {
    disposition: "keep-active-audit-tooling-test",
    rationale: "Fixture coverage for provider-exit pack legacy-provider detection.",
  },
  "tests/vitest/provider-cleanup-allowlist-script.test.ts": {
    disposition: "keep-active-audit-tooling-test",
    rationale: "Fixture coverage for this provider-cleanup allowlist scanner.",
  },
  "tests/vitest/upload-clean-download-provider-proof-script.test.ts": {
    disposition: "keep-active-negative-assertion",
    rationale: "Asserts clean-download proof routes do not import the retired Supabase client.",
  },
  "tests/vitest/upload-domain-proof-script.test.ts": {
    disposition: "keep-active-negative-assertion",
    rationale: "Asserts upload-domain proof routes do not import the retired Supabase client.",
  },
  "tests/vitest/upload-storage-proof-script.test.ts": {
    disposition: "keep-active-negative-assertion",
    rationale: "Asserts upload-storage proof routes do not import the retired Supabase client.",
  },
  "tests/vitest/estimate-image-url.test.ts": {
    disposition: "keep-active-security-fixture",
    rationale: "Legacy public storage URL is an unsafe image URL sanitization fixture.",
  },
  "tests/vitest/project-publication-snapshot.test.ts": {
    disposition: "keep-active-security-fixture",
    rationale: "Legacy public storage URL is used to prove publication snapshot image sanitization.",
  },
  "tests/vitest/redact.test.ts": {
    disposition: "keep-active-security-fixture",
    rationale: "Legacy provider key names are credential-adjacent redaction fixtures.",
  },
  "tests/vitest/shared-link-header-smoke-script.test.ts": {
    disposition: "keep-active-security-fixture",
    rationale: "Vercel protected-preview bypass token name is a URL redaction fixture, not an active deploy dependency.",
  },
  "tests/vitest/upload-component-image-backfill.test.ts": {
    disposition: "keep-active-security-fixture",
    rationale: "Legacy storage URLs are migration/sanitization fixtures for upload backfill behavior.",
  },
  "tests/vitest/with-action-errors.test.ts": {
    disposition: "keep-active-security-fixture",
    rationale: "Legacy provider key names are error-redaction fixtures.",
  },
  "tests/vitest/notification-rls-proof.test.ts": {
    disposition: "cleanup-candidate",
    rationale: "Historical Supabase RLS proof should be archived, deleted, or replaced with D1/app-authz proof.",
  },
  "tests/vitest/upload-storage-denial-proof.test.ts": {
    disposition: "cleanup-candidate",
    rationale: "Historical linked-provider storage-denial proof should be archived or replaced with Cloudflare/R2 proof.",
  },
};

const NEGATIVE_ASSERTION_TESTS = new Set([
  "tests/vitest/ai-audit-schema.test.ts",
  "tests/vitest/ai-package-builder-security-contract.test.ts",
  "tests/vitest/auth-account-audit-d1-store.test.ts",
  "tests/vitest/auth-account-data-contract.test.ts",
  "tests/vitest/auth-account-data-schema.test.ts",
  "tests/vitest/auth-account-settings-d1-store.test.ts",
  "tests/vitest/auth-profile-d1-store.test.ts",
  "tests/vitest/auth-magic-link.test.ts",
  "tests/vitest/auth-session-closed-beta.test.ts",
  "tests/vitest/closed-beta-env-manifest.test.ts",
  "tests/vitest/collaboration-invitation-d1-store.test.ts",
  "tests/vitest/component-library-versioning-schema.test.ts",
  "tests/vitest/component-library-durable-telemetry.test.ts",
  "tests/vitest/dbidx-repo-audit.test.ts",
  "tests/vitest/estimate-repository.test.ts",
  "tests/vitest/estimate-route-server-concurrency.test.ts",
  "tests/vitest/estimate-sheet-route-loading.test.ts",
  "tests/vitest/estimate-sheet-user-preferences.test.ts",
  "tests/vitest/legal-terms-d1-store.test.ts",
  "tests/vitest/mass-deletion-action-contract.test.ts",
  "tests/vitest/notifications-actions.test.ts",
  "tests/vitest/perf/library-overview-rpc-contract.test.ts",
  "tests/vitest/project-activity-page/repository-contract.test.ts",
  "tests/vitest/project-activity-page/route-contract.test.ts",
  "tests/vitest/project-charts-d1-repository.test.ts",
  "tests/vitest/project-collaboration-actions.test.ts",
  "tests/vitest/project-collaboration-realtime.test.ts",
  "tests/vitest/project-component-projection.test.ts",
  "tests/vitest/project-d1-audit.test.ts",
  "tests/vitest/project-dashboard-side-panel-ui.test.ts",
  "tests/vitest/project-estimate-list-row-contract.test.ts",
  "tests/vitest/project-estimate-list-summaries-scoping.test.ts",
  "tests/vitest/project-invite-entry-route.test.ts",
  "tests/vitest/project-location-schema.test.ts",
  "tests/vitest/project-publication-public-repository.test.ts",
  "tests/vitest/publisher-activity-d1-repository.test.ts",
  "tests/vitest/publisher-page-contract.test.ts",
  "tests/vitest/publisher-roster-repository.test.ts",
  "tests/vitest/recipient-proposals-route-gate.test.ts",
  "tests/vitest/security-findings-auth-contracts.test.ts",
  "tests/vitest/security-findings-proof-contracts.test.ts",
  "tests/vitest/security-findings-library-tooling-contracts.test.ts",
  "tests/vitest/upload-operations-runbook-local-proof-script.test.ts",
  "tests/vitest/upload-scan-override-ui.test.tsx",
  "tests/vitest/upload-session-capacity-provider-proof.test.ts",
  "tests/vitest/upload-signed-route.test.ts",
  "tests/vitest/upsert-update-grant-contract.test.ts",
  "tests/vitest/vercel-analytics-removed.test.ts",
  "tests/vitest/workshop-homebase-summary-rpc-contract.test.ts",
  "tests/vitest/workshop-pending-invite.test.tsx",
]);

const COMPATIBILITY_GUARD_TESTS = new Set([
  "tests/vitest/auth-callback-route.test.ts",
  "tests/vitest/estimate-node-reorder-action.test.ts",
  "tests/vitest/estimate-sheet-actions-authz.test.ts",
  "tests/vitest/estimate-sheet-version-control-actions.test.ts",
  "tests/vitest/project-group-actions.test.ts",
  "tests/vitest/project-invite-sign-out-route.test.ts",
  "tests/vitest/realtime-auth-bridge-favorites-clear.test.tsx",
]);

const ACTIVE_AUDIT_TOOLING_TESTS = new Set([
  "tests/vitest/cloudflare-cost-performance-workbook-script.test.ts",
  "tests/vitest/cloudflare-d1-authz-access-matrix-script.test.ts",
  "tests/vitest/estimate-sheet-version-control-db.test.ts",
  "tests/vitest/share/duplicate-decision-race.provider.test.ts",
  "tests/vitest/supabase-type-reference-retirement-inventory-script.test.ts",
  "tests/vitest/upload-provider-migration-dry-run.test.ts",
  "tests/vitest/upload-release-gates.test.ts",
  "tests/vitest/upload-scan-worker-provider-proof-script.test.ts",
  "tests/vitest/upload-signed-provider-proof-script.test.ts",
  "tests/vitest/upload-signed-route-proof-script.test.ts",
  "tests/vitest/upload-tus-provider-proof-script.test.ts",
]);

const PROVIDER_REFERENCE_PATTERNS: Array<{
  provider: LegacyProvider;
  token: string;
  pattern: RegExp;
}> = [
  { provider: "supabase", token: "@supabase/", pattern: /@supabase\//i },
  { provider: "supabase", token: "supabase-js", pattern: /supabase-js/i },
  { provider: "supabase", token: "NEXT_PUBLIC_SUPABASE_*", pattern: /NEXT_PUBLIC_SUPABASE(?:_[A-Z0-9_]+)?/ },
  { provider: "supabase", token: "SUPABASE_*", pattern: /(?<!NEXT_PUBLIC_)SUPABASE_[A-Z0-9_]+/ },
  { provider: "supabase", token: "@/lib/supabase", pattern: /@\/lib\/supabase(?:\/[A-Za-z0-9_-]+)?/ },
  { provider: "supabase", token: "createSupabase*", pattern: /createSupabase[A-Za-z0-9_]*/ },
  { provider: "supabase", token: "supabase db", pattern: /\bsupabase\s+db\b/i },
  { provider: "supabase", token: "supabase.*", pattern: /\bsupabase\s*\.\s*(?:auth|from|rpc|storage)\b/i },
  { provider: "vercel", token: "@vercel/", pattern: /@vercel\//i },
  { provider: "vercel", token: "VERCEL_*", pattern: /VERCEL_[A-Z0-9_]+/ },
  { provider: "resend", token: "RESEND_API_KEY", pattern: /RESEND_API_KEY/ },
];

function readEnv(name: string) {
  const value = process.env[name];
  return value?.trim() || undefined;
}

function envFlag(name: string) {
  const value = readEnv(name)?.toLowerCase();
  return value === "1" || value === "true" || value === "yes";
}

function normalizePath(path: string) {
  return path.replaceAll("\\", "/");
}

function normalizeSnippet(line: string) {
  return line.replace(/\s+/g, " ").trim().slice(0, 240);
}

function shouldSkipRelativePath(path: string) {
  return (
    path === "node_modules"
    || path.startsWith("node_modules/")
    || path === ".next"
    || path.startsWith(".next/")
    || path === ".open-next"
    || path.startsWith(".open-next/")
    || path === ".ai"
    || path.startsWith(".ai/")
    || path === "supabase"
    || path.startsWith("supabase/")
  );
}

function listFiles(rootDir: string, path: string): string[] {
  if (!existsSync(path)) return [];
  const stat = statSync(path);
  if (stat.isFile()) {
    return TEXT_EXTENSIONS.has(extname(path)) ? [path] : [];
  }
  if (!stat.isDirectory()) return [];

  const files: string[] = [];
  for (const entry of readdirSync(path)) {
    const fullPath = join(path, entry);
    const relativePath = normalizePath(relative(rootDir, fullPath));
    if (shouldSkipRelativePath(relativePath)) continue;
    files.push(...listFiles(rootDir, fullPath));
  }
  return files;
}

function classifyLine(line: string, lineNumber: number): ProviderCleanupReferenceHit[] {
  const hits: ProviderCleanupReferenceHit[] = [];
  const snippet = normalizeSnippet(line);

  for (const { provider, token, pattern } of PROVIDER_REFERENCE_PATTERNS) {
    if (pattern.test(line)) {
      hits.push({ provider, token, line: lineNumber, snippet });
    }
  }

  return hits;
}

export function scanProviderCleanupReferences(params: {
  rootDir?: string;
  scanPaths?: string[];
} = {}): ProviderCleanupReferenceScan {
  const rootDir = resolve(params.rootDir ?? process.cwd());
  const scanPaths = params.scanPaths ?? DEFAULT_PROVIDER_CLEANUP_SCAN_PATHS;
  const scannedPaths = scanPaths
    .map((path) => normalizePath(path))
    .filter((path) => existsSync(resolve(rootDir, path)));
  const files: ProviderCleanupScannedFile[] = [];

  for (const scanPath of scannedPaths) {
    const absoluteScanPath = resolve(rootDir, scanPath);
    for (const file of listFiles(rootDir, absoluteScanPath)) {
      const relativeFile = normalizePath(relative(rootDir, file));
      if (shouldSkipRelativePath(relativeFile)) continue;
      const hits = readFileSync(file, "utf8")
        .split(/\r?\n/)
        .flatMap((line, index) => classifyLine(line, index + 1));
      if (hits.length > 0) {
        files.push({ file: relativeFile, hits });
      }
    }
  }

  files.sort((a, b) => a.file.localeCompare(b.file));

  return {
    scannedPaths,
    totalHitFiles: files.length,
    files,
  };
}

function classifyFile(file: string): { disposition: ProviderCleanupDisposition; rationale: string } {
  const override = DISPOSITION_OVERRIDES[file];
  if (override) return override;

  if (NEGATIVE_ASSERTION_TESTS.has(file)) {
    return {
      disposition: "keep-active-negative-assertion",
      rationale: "Negative assertion test intentionally mentions old-provider strings to prove current Cloudflare/D1 paths avoid them.",
    };
  }

  if (COMPATIBILITY_GUARD_TESTS.has(file)) {
    return {
      disposition: "compatibility-guard",
      rationale: "Compatibility guard mocks or names retired Supabase modules to prove current code does not call the old provider path.",
    };
  }

  if (ACTIVE_AUDIT_TOOLING_TESTS.has(file)) {
    return {
      disposition: "keep-active-audit-tooling-test",
      rationale: "Audit/proof fixture intentionally mentions legacy-provider commands or helpers while preserving an explicit non-runtime evidence boundary.",
    };
  }

  if (file.startsWith("src/")) {
    return {
      disposition: "active-runtime-blocker",
      rationale: "Active source outside the historical type reference contains old-provider strings and needs migration or explicit classification.",
    };
  }

  if (file.startsWith("scripts/")) {
    return {
      disposition: "cleanup-candidate",
      rationale: "Script mentions old-provider strings but is not in the known active scanner allowlist.",
    };
  }

  return {
    disposition: "unclassified",
    rationale: "No safe disposition rule exists yet; classify before using this as final cleanup evidence.",
  };
}

function emptyDispositionCounts(): Record<ProviderCleanupDisposition, number> {
  return {
    "active-runtime-blocker": 0,
    "cleanup-candidate": 0,
    "compatibility-guard": 0,
    "keep-active-audit-tooling": 0,
    "keep-active-audit-tooling-test": 0,
    "keep-active-negative-assertion": 0,
    "keep-active-security-fixture": 0,
    "type-reference-retirement": 0,
    unclassified: 0,
  };
}

function filesWithDisposition(files: ProviderCleanupClassifiedFile[], disposition: ProviderCleanupDisposition) {
  return files.filter((file) => file.disposition === disposition).map((file) => file.file);
}

export function buildProviderCleanupAllowlistReport(params: {
  generatedAt?: string;
  rootDir?: string;
  scanPaths?: string[];
  scan?: ProviderCleanupReferenceScan;
} = {}): ProviderCleanupAllowlistReport {
  const generatedAt = params.generatedAt ?? new Date().toISOString();
  const scan = params.scan ?? scanProviderCleanupReferences({
    rootDir: params.rootDir,
    scanPaths: params.scanPaths,
  });
  const files = scan.files.map((file): ProviderCleanupClassifiedFile => {
    const classification = classifyFile(file.file);
    return { ...file, ...classification };
  });
  const dispositionCounts = emptyDispositionCounts();

  for (const file of files) {
    dispositionCounts[file.disposition] += 1;
  }

  const activeRuntimeBlockerFiles = filesWithDisposition(files, "active-runtime-blocker");
  const cleanupCandidateFiles = filesWithDisposition(files, "cleanup-candidate");
  const typeReferenceRetirementFiles = filesWithDisposition(files, "type-reference-retirement");
  const unclassifiedFiles = filesWithDisposition(files, "unclassified");
  const readiness: ProviderCleanupReadiness = {
    activeRuntimeProviderReferencesReady: activeRuntimeBlockerFiles.length === 0,
    allProviderStringsClassified: unclassifiedFiles.length === 0,
    providerCleanupAllowlistReady: (
      activeRuntimeBlockerFiles.length === 0
      && cleanupCandidateFiles.length === 0
      && unclassifiedFiles.length === 0
    ),
    finalProviderCleanupReady: (
      activeRuntimeBlockerFiles.length === 0
      && cleanupCandidateFiles.length === 0
      && typeReferenceRetirementFiles.length === 0
      && unclassifiedFiles.length === 0
    ),
  };
  const blockers = [
    activeRuntimeBlockerFiles.length > 0
      ? `Active runtime/source provider references remain: ${activeRuntimeBlockerFiles.join(", ")}`
      : null,
    cleanupCandidateFiles.length > 0
      ? `cleanup-candidate files remain: ${cleanupCandidateFiles.join(", ")}`
      : null,
    typeReferenceRetirementFiles.length > 0
      ? `type-reference-retirement files remain: ${typeReferenceRetirementFiles.join(", ")}`
      : null,
    unclassifiedFiles.length > 0
      ? `Unclassified old-provider string files remain: ${unclassifiedFiles.join(", ")}`
      : null,
  ].filter((blocker): blocker is string => blocker !== null);

  return {
    generatedAt,
    mode: "provider-cleanup-allowlist-report",
    scan: {
      scannedPaths: scan.scannedPaths,
      totalHitFiles: scan.totalHitFiles,
      files,
      dispositionCounts,
      activeRuntimeBlockerFiles,
      cleanupCandidateFiles,
      typeReferenceRetirementFiles,
      unclassifiedFiles,
    },
    readiness,
    blockers,
    note: NOTE,
  };
}

function checkMark(value: boolean) {
  return value ? "PASS" : "OPEN";
}

function tableCell(value: string | number) {
  return String(value).replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

export function renderProviderCleanupAllowlistMarkdown(report: ProviderCleanupAllowlistReport) {
  const readinessRows = Object.entries(report.readiness)
    .map(([key, value]) => `| ${tableCell(key)} | ${checkMark(value)} |`)
    .join("\n");
  const dispositionRows = Object.entries(report.scan.dispositionCounts)
    .map(([key, value]) => `| ${tableCell(key)} | ${value} |`)
    .join("\n");
  const fileRows = report.scan.files
    .map((file) => `| ${tableCell(file.file)} | ${tableCell(file.disposition)} | ${tableCell(file.rationale)} | ${file.hits.length} |`)
    .join("\n");
  const blockerRows = report.blockers.length
    ? report.blockers.map((blocker) => `- ${blocker}`).join("\n")
    : "- none";

  return `# Provider cleanup allowlist report

Generated: ${report.generatedAt}

${report.note}

## Readiness

| Gate | Status |
|---|---|
${readinessRows}

## Disposition Counts

| Disposition | Files |
|---|---:|
${dispositionRows}

## Blockers

${blockerRows}

## Files

| File | Disposition | Rationale | Hits |
|---|---|---|---:|
${fileRows}
`;
}

function writeJson(path: string, value: unknown) {
  const resolved = resolve(path);
  mkdirSync(dirname(resolved), { recursive: true });
  writeFileSync(resolved, `${JSON.stringify(value, null, 2)}\n`);
}

function writeText(path: string, value: string) {
  const resolved = resolve(path);
  mkdirSync(dirname(resolved), { recursive: true });
  writeFileSync(resolved, value.endsWith("\n") ? value : `${value}\n`);
}

function runCli() {
  const outputFile = readEnv("OUTPUT_FILE") ?? DEFAULT_OUTPUT_FILE;
  const markdownFile = readEnv("MARKDOWN_FILE") ?? DEFAULT_MARKDOWN_FILE;
  const strictProviderCleanupExit = envFlag("STRICT_PROVIDER_CLEANUP_EXIT");
  const rootDir = readEnv("PROVIDER_CLEANUP_ROOT_DIR");
  const scanPaths = readEnv("PROVIDER_CLEANUP_SCAN_PATHS")
    ?.split(",")
    .map((path) => path.trim())
    .filter(Boolean);
  const report = buildProviderCleanupAllowlistReport({ rootDir, scanPaths });
  writeJson(outputFile, report);
  writeText(markdownFile, renderProviderCleanupAllowlistMarkdown(report));

  const exitCode = strictProviderCleanupExit && !report.readiness.finalProviderCleanupReady ? 1 : 0;
  console.log(JSON.stringify({
    outputFile,
    markdownFile,
    totalHitFiles: report.scan.totalHitFiles,
    readiness: report.readiness,
    blockers: report.blockers,
    strictProviderCleanupExit,
    exitCode,
  }, null, 2));
  process.exitCode = exitCode;
}

if (import.meta.main) {
  runCli();
}
