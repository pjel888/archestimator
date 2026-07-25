import type { QualityFinding } from "./common";

export interface ScannableFile {
  path: string;
  text: string;
}

const TEST_BYPASS_PATTERNS: [RegExp, string, string][] = [
  [/\b(?:describe|it|test)\.(?:skip|only)\s*\(/gu, "TEST_SKIP_OR_FOCUS", "skip/focus test API"],
  [/\b(?:xdescribe|xit|xtest|fdescribe|fit|ftest)\s*\(/gu, "TEST_SKIP_OR_FOCUS", "skip/focus test alias"],
  [/@(?:skip|wip|ignore)\b/giu, "CUCUMBER_SKIP", "Cucumber skip tag"],
  [/\bretr(?:y|ies)(?:\s*[:=]\s*|\()[1-9]\d*/giu, "HIDDEN_RETRY", "nonzero retry configuration"],
  [/\btimeout\s*[:=(]\s*(?:[6-9]\d{4}|[1-9]\d{5,})/giu, "TIMEOUT_INCREASE", "timeout above 60 seconds"],
  [/\bcontinue-on-error\s*:\s*true\b/giu, "CONTINUE_ON_ERROR", "required job continue-on-error"],
  [/\|\|\s*true\b/gmu, "SHELL_FAILURE_HIDDEN", "shell failure suppression"],
];

export function scanAntiBypass(files: ScannableFile[]): QualityFinding[] {
  const findings: QualityFinding[] = [];
  for (const file of files) {
    for (const [pattern, code, label] of TEST_BYPASS_PATTERNS) {
      pattern.lastIndex = 0;
      if (pattern.test(file.text)) {
        findings.push({ code, message: `${file.path} contains ${label}`, path: file.path });
      }
    }
    if (
      /(?:vitest|playwright|stryker|coverage|quality).*\.(?:[cm]?[jt]s|json)$/u.test(file.path) &&
      /["']?(?:exclude|coveragePathIgnorePatterns|testPathIgnorePatterns)["']?\s*[:=]/iu.test(
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
  const findings: QualityFinding[] = [];
  if (
    typeof before === "number" &&
    typeof after === "number" &&
    after < before
  ) {
    findings.push({
      code: "THRESHOLD_LOWERED",
      message: `${prefix || "threshold"} lowered from ${before} to ${after}`,
    });
    return findings;
  }
  if (
    before &&
    after &&
    typeof before === "object" &&
    typeof after === "object" &&
    !Array.isArray(before) &&
    !Array.isArray(after)
  ) {
    for (const [key, value] of Object.entries(before)) {
      if (!(key in after)) {
        findings.push({
          code: "THRESHOLD_REMOVED",
          message: `${prefix ? `${prefix}.` : ""}${key} was removed`,
        });
      } else {
        findings.push(
          ...compareThresholds(
            value,
            (after as Record<string, unknown>)[key],
            prefix ? `${prefix}.${key}` : key,
          ),
        );
      }
    }
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
