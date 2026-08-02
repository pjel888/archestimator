#!/usr/bin/env bun

import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";

export type SupabaseTypeReferenceUsageKind =
  | "type-import-fixture"
  | "schema-source-read"
  | "file-existence-guard"
  | "negative-import-guard"
  | "retirement-audit-tooling"
  | "historical-comment"
  | "unknown-reference";

type SupabaseTypeReferenceHit = {
  line: number;
  usageKind: SupabaseTypeReferenceUsageKind;
  snippet: string;
};

type SupabaseTypeReferenceFile = {
  file: string;
  usageKinds: SupabaseTypeReferenceUsageKind[];
  importedTypes: string[];
  blocksTypeFileDeletion: boolean;
  retirementAction: string;
  rationale: string;
  hits: SupabaseTypeReferenceHit[];
};

type SupabaseTypeReferenceReadiness = {
  allReferencesClassified: boolean;
  negativeImportGuardsSeparated: boolean;
  typeReferenceDeletionReady: boolean;
};

export type SupabaseTypeReferenceRetirementInventory = {
  generatedAt: string;
  mode: "supabase-type-reference-retirement-inventory";
  scan: {
    scannedPaths: string[];
    totalReferenceFiles: number;
    deletionBlockingFiles: string[];
    nonBlockingGuardFiles: string[];
    unknownReferenceFiles: string[];
    usageKindCounts: Record<SupabaseTypeReferenceUsageKind, number>;
    files: SupabaseTypeReferenceFile[];
  };
  readiness: SupabaseTypeReferenceReadiness;
  blockers: string[];
  note: string;
};

export const DEFAULT_TYPE_REFERENCE_SCAN_PATHS = ["src", "scripts", "e2e", "tests"];

const DEFAULT_OUTPUT_FILE =
  ".ai/03_plans/000-Follow Ups/2026-07-03-Authentication-Audit-And-Improvement/evidence/2026-07-04-supabase-type-reference-retirement-inventory.json";
const DEFAULT_MARKDOWN_FILE =
  ".ai/03_plans/000-Follow Ups/2026-07-03-Authentication-Audit-And-Improvement/evidence/2026-07-04-supabase-type-reference-retirement-inventory.md";

const NOTE =
  "Non-destructive Supabase type-reference retirement inventory. This script reads active source, scripts, e2e, and tests only; skips supabase/** migration archaeology and .ai/** planning artifacts; and does not read environment files, mutate providers, deploy, or delete data.";

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

const TYPE_IMPORT_RE = /import\s+type\s+\{\s*([^}]+?)\s*\}\s+from\s+["']@\/lib\/supabase\/types["']/;
const NEGATIVE_IMPORT_GUARD_RE = /not\.toContain\(["']@\/lib\/supabase\/types["']\)/;
const TYPE_REFERENCE_RE = /src\/lib\/supabase\/types\.ts|@\/lib\/supabase\/types|\.\.\/.*lib\/supabase\/types/;

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

function emptyUsageKindCounts(): Record<SupabaseTypeReferenceUsageKind, number> {
  return {
    "type-import-fixture": 0,
    "schema-source-read": 0,
    "file-existence-guard": 0,
    "negative-import-guard": 0,
    "retirement-audit-tooling": 0,
    "historical-comment": 0,
    "unknown-reference": 0,
  };
}

function parseImportedTypes(source: string) {
  const imports = new Set<string>();
  for (const match of source.matchAll(new RegExp(TYPE_IMPORT_RE, "g"))) {
    for (const importedType of match[1].split(",")) {
      const name = importedType.trim();
      if (name) imports.add(name);
    }
  }
  return [...imports].sort((a, b) => a.localeCompare(b));
}

function isRetirementAuditTooling(file: string) {
  return (
    file === "scripts/generate-supabase-type-reference-retirement-inventory.ts"
    || file === "tests/vitest/supabase-type-reference-retirement-inventory-script.test.ts"
  );
}

function classifyLine(file: string, line: string, source: string): SupabaseTypeReferenceUsageKind {
  if (isRetirementAuditTooling(file)) return "retirement-audit-tooling";
  if (TYPE_IMPORT_RE.test(line)) return "type-import-fixture";
  if (NEGATIVE_IMPORT_GUARD_RE.test(line)) return "negative-import-guard";
  if (/existsSync\(/.test(source) && /src\/lib\/supabase\/types\.ts/.test(line)) {
    return "file-existence-guard";
  }
  if (/readFileSync\(/.test(source) && /src\/lib\/supabase\/types\.ts/.test(line)) {
    return "schema-source-read";
  }
  if (/src\/lib\/supabase\/types\.ts/.test(line)) return "historical-comment";
  return "unknown-reference";
}

function classifyFile(file: string, usageKinds: SupabaseTypeReferenceUsageKind[]): {
  blocksTypeFileDeletion: boolean;
  retirementAction: string;
  rationale: string;
} {
  const usageKindSet = new Set(usageKinds);

  if (usageKindSet.has("unknown-reference")) {
    return {
      blocksTypeFileDeletion: true,
      retirementAction: "classify-before-retirement",
      rationale: "The file references the historical type path in a pattern the inventory cannot safely classify.",
    };
  }

  if (usageKindSet.has("type-import-fixture")) {
    return {
      blocksTypeFileDeletion: true,
      retirementAction: "migrate-type-import-fixture",
      rationale: "The test imports Database/Tables/Json-style historical schema types and needs a D1/current fixture type replacement before deletion.",
    };
  }

  if (usageKindSet.has("schema-source-read")) {
    return {
      blocksTypeFileDeletion: true,
      retirementAction: "replace-schema-source-read",
      rationale: "The test reads src/lib/supabase/types.ts directly and should assert against D1 migrations/current repository contracts or archived migration evidence.",
    };
  }

  if (usageKindSet.has("file-existence-guard")) {
    return {
      blocksTypeFileDeletion: true,
      retirementAction: "remove-file-existence-guard",
      rationale: "The test explicitly expects the historical type file to exist, so it must change before the file can be deleted.",
    };
  }

  if (usageKindSet.has("negative-import-guard")) {
    return {
      blocksTypeFileDeletion: false,
      retirementAction: "keep-or-generalize-negative-guard",
      rationale: "The test only asserts active current code does not import the old type path; it is not a dependency on the historical file contents.",
    };
  }

  if (usageKindSet.has("retirement-audit-tooling")) {
    return {
      blocksTypeFileDeletion: false,
      retirementAction: "keep-retirement-audit-tooling",
      rationale: "The inventory scanner/test intentionally contains historical type-reference fixture strings to classify the retirement graph.",
    };
  }

  return {
    blocksTypeFileDeletion: false,
    retirementAction: "no-blocking-action",
    rationale: `The remaining reference in ${file} is a historical comment, not an import/read dependency.`,
  };
}

export function buildSupabaseTypeReferenceRetirementInventory(params: {
  generatedAt?: string;
  rootDir?: string;
  scanPaths?: string[];
} = {}): SupabaseTypeReferenceRetirementInventory {
  const generatedAt = params.generatedAt ?? new Date().toISOString();
  const rootDir = resolve(params.rootDir ?? process.cwd());
  const scanPaths = params.scanPaths ?? DEFAULT_TYPE_REFERENCE_SCAN_PATHS;
  const scannedPaths = scanPaths
    .map((path) => normalizePath(path))
    .filter((path) => existsSync(resolve(rootDir, path)));
  const usageKindCounts = emptyUsageKindCounts();
  const files: SupabaseTypeReferenceFile[] = [];

  for (const scanPath of scannedPaths) {
    for (const absoluteFile of listFiles(rootDir, resolve(rootDir, scanPath))) {
      const file = normalizePath(relative(rootDir, absoluteFile));
      if (shouldSkipRelativePath(file)) continue;

      const source = readFileSync(absoluteFile, "utf8");
      const hits = source
        .split(/\r?\n/)
        .flatMap((line, index): SupabaseTypeReferenceHit[] => {
          if (!TYPE_REFERENCE_RE.test(line)) return [];
          return [{
            line: index + 1,
            usageKind: classifyLine(file, line, source),
            snippet: normalizeSnippet(line),
          }];
        });

      if (hits.length === 0) continue;

      const usageKinds = [...new Set(hits.map((hit) => hit.usageKind))]
        .sort((a, b) => a.localeCompare(b));
      for (const usageKind of usageKinds) usageKindCounts[usageKind] += 1;
      const classification = classifyFile(file, usageKinds);

      files.push({
        file,
        usageKinds,
        importedTypes: parseImportedTypes(source),
        ...classification,
        hits,
      });
    }
  }

  files.sort((a, b) => a.file.localeCompare(b.file));

  const deletionBlockingFiles = files
    .filter((file) => file.blocksTypeFileDeletion)
    .map((file) => file.file);
  const nonBlockingGuardFiles = files
    .filter((file) => !file.blocksTypeFileDeletion)
    .map((file) => file.file);
  const unknownReferenceFiles = files
    .filter((file) => file.usageKinds.includes("unknown-reference"))
    .map((file) => file.file);
  const readiness: SupabaseTypeReferenceReadiness = {
    allReferencesClassified: unknownReferenceFiles.length === 0,
    negativeImportGuardsSeparated: files
      .filter((file) => file.usageKinds.includes("negative-import-guard"))
      .every((file) => !file.blocksTypeFileDeletion),
    typeReferenceDeletionReady: deletionBlockingFiles.length === 0 && unknownReferenceFiles.length === 0,
  };
  const blockers = [
    deletionBlockingFiles.length > 0
      ? `Deletion-blocking historical type-reference files remain: ${deletionBlockingFiles.join(", ")}`
      : null,
    unknownReferenceFiles.length > 0
      ? `Unknown historical type-reference patterns remain: ${unknownReferenceFiles.join(", ")}`
      : null,
  ].filter((blocker): blocker is string => blocker !== null);

  return {
    generatedAt,
    mode: "supabase-type-reference-retirement-inventory",
    scan: {
      scannedPaths,
      totalReferenceFiles: files.length,
      deletionBlockingFiles,
      nonBlockingGuardFiles,
      unknownReferenceFiles,
      usageKindCounts,
      files,
    },
    readiness,
    blockers,
    note: NOTE,
  };
}

function checkMark(value: boolean) {
  return value ? "PASS" : "OPEN";
}

function tableCell(value: string | number | string[]) {
  const rendered = Array.isArray(value) ? value.join(", ") : String(value);
  return rendered.replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

export function renderSupabaseTypeReferenceRetirementMarkdown(report: SupabaseTypeReferenceRetirementInventory) {
  const readinessRows = Object.entries(report.readiness)
    .map(([key, value]) => `| ${tableCell(key)} | ${checkMark(value)} |`)
    .join("\n");
  const usageKindRows = Object.entries(report.scan.usageKindCounts)
    .map(([key, value]) => `| ${tableCell(key)} | ${value} |`)
    .join("\n");
  const blockerRows = report.blockers.length
    ? report.blockers.map((blocker) => `- ${blocker}`).join("\n")
    : "- none";
  const fileRows = report.scan.files
    .map((file) => `| ${tableCell(file.file)} | ${tableCell(file.usageKinds)} | ${file.blocksTypeFileDeletion ? "yes" : "no"} | ${tableCell(file.retirementAction)} | ${tableCell(file.importedTypes)} |`)
    .join("\n");

  return `# Supabase type-reference retirement inventory

Generated: ${report.generatedAt}

${report.note}

## Readiness

| Gate | Status |
|---|---|
${readinessRows}

## Usage Kind Counts

| Usage Kind | Files |
|---|---:|
${usageKindRows}

## Blockers

${blockerRows}

## Files

| File | Usage Kinds | Blocks Deletion | Retirement Action | Imported Types |
|---|---|---|---|---|
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

export function writeSupabaseTypeReferenceRetirementInventoryArtifacts(params: {
  report: SupabaseTypeReferenceRetirementInventory;
  outputFile: string;
  markdownFile: string;
}) {
  writeJson(params.outputFile, params.report);
  writeText(
    params.markdownFile,
    renderSupabaseTypeReferenceRetirementMarkdown(params.report),
  );
}

function runCli() {
  const outputFile = readEnv("OUTPUT_FILE") ?? DEFAULT_OUTPUT_FILE;
  const markdownFile = readEnv("MARKDOWN_FILE") ?? DEFAULT_MARKDOWN_FILE;
  const strictTypeReferenceExit = envFlag("STRICT_TYPE_REFERENCE_EXIT");
  const report = buildSupabaseTypeReferenceRetirementInventory();
  writeSupabaseTypeReferenceRetirementInventoryArtifacts({
    report,
    outputFile,
    markdownFile,
  });

  const exitCode = strictTypeReferenceExit && !report.readiness.typeReferenceDeletionReady ? 1 : 0;
  console.log(JSON.stringify({
    outputFile,
    markdownFile,
    totalReferenceFiles: report.scan.totalReferenceFiles,
    deletionBlockingFileCount: report.scan.deletionBlockingFiles.length,
    nonBlockingGuardFileCount: report.scan.nonBlockingGuardFiles.length,
    readiness: report.readiness,
    blockers: report.blockers,
    strictTypeReferenceExit,
    exitCode,
  }, null, 2));
  process.exitCode = exitCode;
}

if (import.meta.main) {
  runCli();
}
