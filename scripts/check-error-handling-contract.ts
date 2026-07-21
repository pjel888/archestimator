#!/usr/bin/env bun

import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";

export type SourceFileSnapshot = {
  path: string;
  content: string;
};

export type SilentCatchPattern =
  | "catch-empty-block"
  | "promise-catch-empty-arrow"
  | "promise-catch-empty-function"
  | "runtime-console-error"
  | "infrastructure-error-literal";

export type SilentCatchViolation = {
  file: string;
  line: number;
  column: number;
  pattern: SilentCatchPattern;
  excerpt: string;
};

export type ErrorHandlingContractReport = {
  generatedAt: string;
  mode: "error-handling-contract-check";
  scannedTargets: string[];
  scannedFiles: number;
  violations: SilentCatchViolation[];
  failedChecks: string[];
  passed: boolean;
  note: string;
};

type CheckOptions = {
  cwd?: string;
  files?: SourceFileSnapshot[];
  generatedAt?: string;
  targets?: string[];
};

type CliOptions = {
  output: string;
  targets: string[];
  writeReport: boolean;
};

export const DEFAULT_ERROR_HANDLING_CONTRACT_OUTPUT =
  ".ai/09_archive/2026-07-08-agentic-error-observability-hardening/evidence/error-handling-contract-check.json";

export const DEFAULT_ERROR_HANDLING_SCAN_TARGETS = [
  "worker.ts",
  "src/app/api",
  "src/app/share",
  "src/lib/auth/account-audit.ts",
  "src/lib/compliance/retention-core.ts",
  "src/lib/component-library/action-errors.ts",
  "src/lib/observability",
  "src/lib/email",
  "src/lib/uploads/operations-dashboard.ts",
  "src/lib/uploads/operational-telemetry.ts",
  "src/lib/estimates/actions.ts",
  "src/lib/projects/actions.ts",
  "src/lib/component-library/actions.ts",
  "src/lib/client-portal/public-decision-handlers.ts",
  "src/lib/client-portal/public-thread-handlers.ts",
  "scripts/record-operational-incident.ts",
  "scripts/check-operational-incidents.ts",
  "scripts/check-production-observability-proof.ts",
  "scripts/check-agent-debugging-snapshot.ts",
  "scripts/check-observability-proof-env.ts",
  "scripts/collect-workers-logs-proof.ts",
  "scripts/verify-observability-alert-delivery.ts",
];

const INFRA_ERROR_LITERAL_PATTERN =
  /(?:throw new Error|jsonError)\(\s*["'`][^"'`]*(?:Cloudflare|\bD1\b|ARCH_DB|Better Auth|\bSQL\b|\bR2\b)[^"'`]*["'`]/gi;

const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);

function normalizeDisplayPath(path: string, cwd: string) {
  const absolute = resolve(cwd, path);
  const display = relative(cwd, absolute) || ".";
  return display.split(sep).join("/");
}

function extensionOf(path: string) {
  const dotIndex = path.lastIndexOf(".");
  return dotIndex === -1 ? "" : path.slice(dotIndex);
}

function collectSourceFilesFromTarget(target: string, cwd: string): SourceFileSnapshot[] {
  const absolute = resolve(cwd, target);
  if (!existsSync(absolute)) return [];
  const stat = statSync(absolute);
  if (stat.isFile()) {
    if (!SOURCE_EXTENSIONS.has(extensionOf(absolute))) return [];
    return [{ path: normalizeDisplayPath(absolute, cwd), content: readFileSync(absolute, "utf8") }];
  }
  if (!stat.isDirectory()) return [];

  const files: SourceFileSnapshot[] = [];
  const entries = readdirSync(absolute).sort();
  for (const entry of entries) {
    const child = join(absolute, entry);
    const childStat = statSync(child);
    if (childStat.isDirectory()) {
      files.push(...collectSourceFilesFromTarget(child, cwd));
      continue;
    }
    if (childStat.isFile() && SOURCE_EXTENSIONS.has(extensionOf(child))) {
      files.push({ path: normalizeDisplayPath(child, cwd), content: readFileSync(child, "utf8") });
    }
  }
  return files;
}

export function collectErrorHandlingContractFiles(
  targets = DEFAULT_ERROR_HANDLING_SCAN_TARGETS,
  cwd = process.cwd(),
): SourceFileSnapshot[] {
  const byPath = new Map<string, SourceFileSnapshot>();
  for (const target of targets) {
    for (const file of collectSourceFilesFromTarget(target, cwd)) {
      byPath.set(file.path, file);
    }
  }
  return Array.from(byPath.values()).sort((a, b) => a.path.localeCompare(b.path));
}

function stripComments(text: string) {
  return text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
}

function hasNoExecutableBody(body: string) {
  return stripComments(body).trim().length === 0;
}

function lineAndColumnAt(content: string, index: number) {
  const prefix = content.slice(0, index);
  const lines = prefix.split("\n");
  return {
    line: lines.length,
    column: lines[lines.length - 1].length + 1,
  };
}

function lineExcerptAt(content: string, index: number) {
  const lineStart = content.lastIndexOf("\n", Math.max(0, index - 1)) + 1;
  const lineEndIndex = content.indexOf("\n", index);
  const lineEnd = lineEndIndex === -1 ? content.length : lineEndIndex;
  return content.slice(lineStart, lineEnd).replace(/\s+/g, " ").trim().slice(0, 160);
}

function buildViolation(
  file: SourceFileSnapshot,
  matchIndex: number,
  pattern: SilentCatchPattern,
): SilentCatchViolation {
  const position = lineAndColumnAt(file.content, matchIndex);
  return {
    file: file.path,
    line: position.line,
    column: position.column,
    pattern,
    excerpt: lineExcerptAt(file.content, matchIndex),
  };
}

function findPatternViolations(
  file: SourceFileSnapshot,
  pattern: RegExp,
  violationPattern: SilentCatchPattern,
  bodyGroup = 1,
) {
  const violations: SilentCatchViolation[] = [];
  for (const match of file.content.matchAll(pattern)) {
    const body = match[bodyGroup] ?? "";
    if (!hasNoExecutableBody(body)) continue;
    violations.push(buildViolation(file, match.index ?? 0, violationPattern));
  }
  return violations;
}

function findCatchBlockViolations(file: SourceFileSnapshot) {
  const violations: SilentCatchViolation[] = [];
  const pattern = /\bcatch\s*(?:\([^)]*\))?\s*\{([\s\S]*?)\}/g;
  for (const match of file.content.matchAll(pattern)) {
    const matchIndex = match.index ?? 0;
    if (file.content[matchIndex - 1] === ".") continue;
    const body = match[1] ?? "";
    if (!hasNoExecutableBody(body)) continue;
    violations.push(buildViolation(file, matchIndex, "catch-empty-block"));
  }
  return violations;
}

function isSensitiveRuntimeConsoleFile(filePath: string) {
  return (
    filePath.startsWith("src/app/api/")
    || filePath.startsWith("src/app/share/")
    || filePath.startsWith("src/lib/email/")
    || filePath === "src/lib/auth/account-audit.ts"
    || filePath === "src/lib/compliance/retention-core.ts"
    || filePath === "src/lib/component-library/action-errors.ts"
    || filePath === "src/lib/uploads/operations-dashboard.ts"
    || filePath === "src/lib/uploads/operational-telemetry.ts"
  );
}

function findRuntimeConsoleErrorViolations(file: SourceFileSnapshot) {
  if (!isSensitiveRuntimeConsoleFile(file.path)) return [];
  const violations: SilentCatchViolation[] = [];
  const pattern = /\bconsole\.error\s*\(/g;
  for (const match of file.content.matchAll(pattern)) {
    violations.push(buildViolation(file, match.index ?? 0, "runtime-console-error"));
  }
  return violations;
}

function findInfrastructureErrorLiteralViolations(file: SourceFileSnapshot) {
  if (file.path.includes("proof-router")) return [];
  const violations: SilentCatchViolation[] = [];
  for (const match of file.content.matchAll(INFRA_ERROR_LITERAL_PATTERN)) {
    violations.push(buildViolation(file, match.index ?? 0, "infrastructure-error-literal"));
  }
  return violations;
}

export function findSilentCatchViolations(files: SourceFileSnapshot[]): SilentCatchViolation[] {
  const promiseCatchArrowPattern = /\.catch\s*\(\s*(?:\([^)]*\)|[A-Za-z_$][\w$]*)?\s*=>\s*\{([\s\S]*?)\}\s*\)/g;
  const promiseCatchFunctionPattern =
    /\.catch\s*\(\s*function\s*(?:[A-Za-z_$][\w$]*)?\s*\([^)]*\)\s*\{([\s\S]*?)\}\s*\)/g;

  return files.flatMap((file) => [
    ...findCatchBlockViolations(file),
    ...findPatternViolations(file, promiseCatchArrowPattern, "promise-catch-empty-arrow"),
    ...findPatternViolations(file, promiseCatchFunctionPattern, "promise-catch-empty-function"),
    ...findRuntimeConsoleErrorViolations(file),
    ...findInfrastructureErrorLiteralViolations(file),
  ]).sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line || a.column - b.column);
}

export function buildErrorHandlingContractReport(options: CheckOptions = {}): ErrorHandlingContractReport {
  const cwd = options.cwd ?? process.cwd();
  const targets = options.targets ?? DEFAULT_ERROR_HANDLING_SCAN_TARGETS;
  const files = options.files ?? collectErrorHandlingContractFiles(targets, cwd);
  const violations = findSilentCatchViolations(files);
  const passed = violations.length === 0;
  const failedChecks = [
    violations.some((violation) =>
      violation.pattern === "catch-empty-block"
      || violation.pattern === "promise-catch-empty-arrow"
      || violation.pattern === "promise-catch-empty-function"
    )
      ? "silent-catch-handling"
      : null,
    violations.some((violation) => violation.pattern === "runtime-console-error")
      ? "structured-error-logging"
      : null,
    violations.some((violation) => violation.pattern === "infrastructure-error-literal")
      ? "user-facing-infrastructure-leak"
      : null,
  ].filter((check): check is string => Boolean(check));

  return {
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    mode: "error-handling-contract-check",
    scannedTargets: targets.map((target) => normalizeDisplayPath(target, cwd)),
    scannedFiles: files.length,
    violations,
    failedChecks,
    passed,
    note: "Scans sensitive server, observability, email, and operations surfaces for empty catch blocks, empty Promise.catch handlers, raw console.error calls in runtime user/operator paths, and user-facing throw/jsonError literals that name infrastructure. It is a static guardrail for agentic debugging; runtime logging and hosted observability still require their own proof.",
  };
}

export function writeErrorHandlingContractReport(report: ErrorHandlingContractReport, output: string) {
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`, "utf8");
}

export function parseErrorHandlingContractArgs(
  argv: string[],
  env: Record<string, string | undefined> = process.env,
): CliOptions {
  const targets: string[] = [];
  let output = env.ERROR_HANDLING_CONTRACT_OUTPUT_FILE?.trim() || DEFAULT_ERROR_HANDLING_CONTRACT_OUTPUT;
  let writeReport = env.ERROR_HANDLING_CONTRACT_NO_WRITE === "1" ? false : true;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--output") {
      const value = argv[index + 1]?.trim();
      if (!value) throw new Error("--output requires a path");
      output = value;
      index += 1;
      continue;
    }
    if (arg === "--target") {
      const value = argv[index + 1]?.trim();
      if (!value) throw new Error("--target requires a path");
      targets.push(value);
      index += 1;
      continue;
    }
    if (arg === "--no-write" || arg === "--check-only") {
      writeReport = false;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return {
    output,
    targets: targets.length ? targets : DEFAULT_ERROR_HANDLING_SCAN_TARGETS,
    writeReport,
  };
}

function main() {
  const options = parseErrorHandlingContractArgs(process.argv.slice(2), process.env);
  const report = buildErrorHandlingContractReport({ targets: options.targets });
  if (options.writeReport) {
    writeErrorHandlingContractReport(report, options.output);
  }
  const outputSummary = options.writeReport ? options.output : "skipped (--no-write)";
  console.log(`Error handling contract check ${report.passed ? "passed" : "failed"}; output=${outputSummary}`);
  if (!report.passed) {
    for (const violation of report.violations) {
      console.error(`${violation.file}:${violation.line}:${violation.column} ${violation.pattern}`);
    }
    process.exit(1);
  }
}

if (import.meta.main) {
  main();
}
