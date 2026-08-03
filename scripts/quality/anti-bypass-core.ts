import type { QualityFinding } from "./common";

export interface ScannableFile {
  path: string;
  text: string;
}

const TEST_BYPASS_PATTERNS: [RegExp, string, string][] = [
  [/\b(?:describe|it|test)\.(?:skip|only)\s*\(/gu, "TEST_SKIP_OR_FOCUS", "skip/focus test API"],
  [/\b(?:xdescribe|xit|xtest|fdescribe|fit|ftest)\s*\(/gu, "TEST_SKIP_OR_FOCUS", "skip/focus test alias"],
  [/@(?:skip|wip|ignore)\b/giu, "CUCUMBER_SKIP", "Cucumber skip tag"],
  [/\bretr(?:y|ies)(?:\s*[:=]\s*|\()[1-9]\d*\b/giu, "HIDDEN_RETRY", "nonzero retry configuration"],
  [/\btimeout\s*[:=(]\s*(?:[6-9]\d{4}|[1-9]\d{5,})\b/giu, "TIMEOUT_INCREASE", "timeout above 60 seconds"],
  [/\bcontinue-on-error\s*:\s*true\b/giu, "CONTINUE_ON_ERROR", "required job continue-on-error"],
  [/\|\|\s*true\b/gmu, "SHELL_FAILURE_HIDDEN", "shell failure suppression"],
];

const COVERAGE_COMMENT_IGNORE_HINT =
  /(?:\/\/|\/\*)[\s*]*(?:istanbul|[cv]8|node:coverage)\s+ignore\s+(?:if|else|next|file)(?=\W|$)/giu;
const COVERAGE_RANGE_IGNORE_HINT =
  /(?:istanbul|[cv]8|node:coverage)\s+ignore\s+(?:start|stop)(?=\W|$)/giu;

function isCoverageInstrumentedSource(path: string): boolean {
  if (!/\.[cm]?[jt]sx?$/u.test(path)) return false;
  if (/^(?:e2e|tests)\//u.test(path)) return false;
  if (/\.(?:d|stories)\.[cm]?[jt]sx?$/u.test(path)) return false;
  return true;
}

export function scanAntiBypass(files: ScannableFile[]): QualityFinding[] {
  const findings: QualityFinding[] = [];
  for (const file of files) {
    for (const [pattern, code, label] of TEST_BYPASS_PATTERNS) {
      pattern.lastIndex = 0;
      if (pattern.test(file.text)) {
        findings.push({ code, message: `${file.path} contains ${label}`, path: file.path });
      }
    }
    COVERAGE_COMMENT_IGNORE_HINT.lastIndex = 0;
    COVERAGE_RANGE_IGNORE_HINT.lastIndex = 0;
    if (
      isCoverageInstrumentedSource(file.path) &&
      (COVERAGE_COMMENT_IGNORE_HINT.test(file.text) || COVERAGE_RANGE_IGNORE_HINT.test(file.text))
    ) {
      findings.push({
        code: "COVERAGE_IGNORE_HINT",
        message: `${file.path} contains a coverage-ignore directive`,
        path: file.path,
      });
    }
    if (
      /(?:vitest|playwright|stryker|coverage|quality).*\.(?:[cm]?[jt]s|json)$/u.test(file.path) &&
      /\b(?:exclude|coveragePathIgnorePatterns|testPathIgnorePatterns)\b["']?\s*[:=]/iu.test(
        file.text,
      ) &&
      /(?:src\/|app\/|components\/|\*\*\/\*\*)/u.test(file.text)
    ) {
      findings.push({
        code: "BUSINESS_LOGIC_EXCLUSION",
        message: `${file.path} broadens an exclusion into application code`,
        path: file.path,
      });
    }
  }
  return findings;
}

export function compareThresholds(
  before: unknown,
  after: unknown,
  prefix = "",
): QualityFinding[] {
  const numericFindings = compareNumericThreshold(before, after, prefix);
  if (numericFindings) return numericFindings;
  if (!isRecord(before)) return [];
  if (!isRecord(after)) return [];
  return compareThresholdRecords(before, after, prefix);
}

function compareNumericThreshold(
  before: unknown,
  after: unknown,
  prefix: string,
): QualityFinding[] | undefined {
  if (typeof before !== "number") return undefined;
  if (typeof after !== "number") return undefined;
  if (after >= before) return [];
  return [{
    code: "THRESHOLD_LOWERED",
    message: `${prefix || "threshold"} lowered from ${before} to ${after}`,
  }];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  if (!value) return false;
  if (typeof value !== "object") return false;
  return !Array.isArray(value);
}

function thresholdPath(prefix: string, key: string): string {
  return prefix ? `${prefix}.${key}` : key;
}

function compareThresholdRecords(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  prefix: string,
): QualityFinding[] {
  const findings: QualityFinding[] = [];
  for (const [key, value] of Object.entries(before)) {
    const path = thresholdPath(prefix, key);
    if (!(key in after)) {
      findings.push({ code: "THRESHOLD_REMOVED", message: `${path} was removed` });
      continue;
    }
    findings.push(...compareThresholds(value, after[key], path));
  }
  return findings;
}

export function validateWaiver(
  waiver: Record<string, unknown>,
  now = new Date(),
): QualityFinding[] {
  const findings: QualityFinding[] = [];
  if (waiver.author_type === "agent") {
    findings.push({ code: "AGENT_AUTHORED_WAIVER", message: "Agents cannot author waivers" });
  }
  if (!Array.isArray(waiver.approvals) || waiver.approvals.length < 2) {
    findings.push({
      code: "WAIVER_APPROVALS",
      message: "Waiver requires two independent approvals",
    });
  }
  const expiresAt = typeof waiver.expires_at === "string" ? Date.parse(waiver.expires_at) : NaN;
  if (!Number.isFinite(expiresAt) || expiresAt <= now.getTime()) {
    findings.push({ code: "WAIVER_EXPIRED", message: "Waiver is expired or malformed" });
  }
  return findings;
}
