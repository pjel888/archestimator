import type { QualityFinding } from "./common";
import {
  normalizeSecuritySeverity,
  type SecuritySeverity,
} from "./security-audit-core";

export interface SarifEvaluation {
  source: string;
  counts: Record<SecuritySeverity, number>;
  findings: QualityFinding[];
  results: {
    rule_id: string;
    severity: SecuritySeverity;
    path?: string;
    line?: number;
  }[];
}

const SEVERITIES: SecuritySeverity[] = [
  "critical",
  "high",
  "medium",
  "low",
  "info",
  "unknown",
];

type UnknownRecord = Record<string, unknown>;

interface SarifRules {
  byId: Map<string, UnknownRecord>;
  byIndex: (UnknownRecord | undefined)[];
}

function asRecord(value: unknown): UnknownRecord | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as UnknownRecord)
    : undefined;
}

function emptyCounts(): Record<SecuritySeverity, number> {
  return Object.fromEntries(SEVERITIES.map((severity) => [severity, 0])) as Record<
    SecuritySeverity,
    number
  >;
}

function firstDefined(values: unknown[]): unknown {
  return values.find((value) => value !== null && value !== undefined);
}

function safeRuleId(value: unknown): string {
  if (typeof value !== "string") return "unknown-rule";
  return /^[a-zA-Z0-9@/_.:-]{1,160}$/u.test(value) ? value : "unknown-rule";
}

function safePath(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.replaceAll("\\", "/");
  if (
    normalized.startsWith("/") ||
    normalized.includes("://") ||
    normalized.split("/").includes("..") ||
    !/^[a-zA-Z0-9@_./ -]{1,300}$/u.test(normalized)
  ) {
    return undefined;
  }
  return normalized;
}

function severityValue(
  result: UnknownRecord,
  rule: UnknownRecord | undefined,
): unknown {
  const resultProperties = asRecord(result.properties) ?? {};
  const ruleProperties = asRecord(rule?.properties) ?? {};
  const defaultConfiguration = asRecord(rule?.defaultConfiguration) ?? {};
  return firstDefined([
    resultProperties["security-severity"],
    resultProperties.securitySeverity,
    resultProperties.severity,
    ruleProperties["security-severity"],
    ruleProperties.securitySeverity,
    ruleProperties.severity,
    result.level,
    defaultConfiguration.level,
  ]);
}

function firstPhysicalLocation(result: UnknownRecord): UnknownRecord | undefined {
  const locations = Array.isArray(result.locations) ? result.locations : [];
  const first = asRecord(locations[0]);
  return asRecord(first?.physicalLocation);
}

function startLine(region: UnknownRecord | undefined): number | undefined {
  return typeof region?.startLine === "number" && Number.isInteger(region.startLine)
    ? region.startLine
    : undefined;
}

function resultLocation(result: UnknownRecord): {
  path?: string;
  line?: number;
} {
  const physical = firstPhysicalLocation(result);
  if (!physical) return {};
  const artifactLocation = asRecord(physical.artifactLocation);
  const region = asRecord(physical.region);
  return {
    path: safePath(artifactLocation?.uri),
    line: startLine(region),
  };
}

function malformedFinding(code: string, message: string): QualityFinding {
  return { code, message };
}

function rulesFrom(run: UnknownRecord): SarifRules {
  const driver = asRecord(asRecord(run.tool)?.driver);
  const rawRules = Array.isArray(driver?.rules) ? driver.rules : [];
  const byId = new Map<string, UnknownRecord>();
  const byIndex = rawRules.map((rawRule) => {
    const rule = asRecord(rawRule);
    if (rule) byId.set(safeRuleId(rule.id), rule);
    return rule;
  });
  return { byId, byIndex };
}

function ruleForResult(result: UnknownRecord, rules: SarifRules): {
  ruleId: string;
  rule: UnknownRecord | undefined;
} {
  const indexedRule =
    typeof result.ruleIndex === "number" && Number.isInteger(result.ruleIndex)
      ? rules.byIndex[result.ruleIndex]
      : undefined;
  const ruleId = safeRuleId(result.ruleId ?? indexedRule?.id);
  return { ruleId, rule: rules.byId.get(ruleId) ?? indexedRule };
}

function sarifFinding(
  ruleId: string,
  severity: SecuritySeverity,
  location: { path?: string; line?: number },
): QualityFinding | undefined {
  const at = location.path
    ? ` at ${location.path}${location.line ? `:${location.line}` : ""}`
    : "";
  const findingBySeverity: Partial<Record<SecuritySeverity, QualityFinding>> = {
    critical: {
      code: "SARIF_CRITICAL",
      message: `Critical SARIF finding ${ruleId}${at}`,
      path: location.path,
    },
    high: {
      code: "SARIF_HIGH",
      message: `High SARIF finding ${ruleId}${at}`,
      path: location.path,
    },
    medium: {
      code: "SARIF_MEDIUM_UNWAIVED",
      message: `Medium SARIF finding requires an approved expiring waiver: ${ruleId}${at}`,
      path: location.path,
    },
    unknown: {
      code: "SARIF_SEVERITY_UNKNOWN",
      message: `SARIF finding has unknown severity: ${ruleId}${at}`,
      path: location.path,
    },
  };
  return findingBySeverity[severity];
}

function evaluateResult(
  rawResult: unknown,
  rules: SarifRules,
  source: string,
  evaluation: Pick<SarifEvaluation, "counts" | "findings" | "results">,
): void {
  const result = asRecord(rawResult);
  if (!result) {
    evaluation.findings.push(
      malformedFinding("SARIF_RESULT_MALFORMED", `${source} contains a malformed result`),
    );
    return;
  }
  const { ruleId, rule } = ruleForResult(result, rules);
  const severity = normalizeSecuritySeverity(severityValue(result, rule));
  const location = resultLocation(result);
  evaluation.counts[severity] += 1;
  evaluation.results.push({ rule_id: ruleId, severity, ...location });
  const finding = sarifFinding(ruleId, severity, location);
  if (finding) evaluation.findings.push(finding);
}

function evaluateRun(
  rawRun: unknown,
  source: string,
  evaluation: Pick<SarifEvaluation, "counts" | "findings" | "results">,
): void {
  const run = asRecord(rawRun);
  if (!run) {
    evaluation.findings.push(
      malformedFinding("SARIF_RUN_MALFORMED", `${source} contains a malformed run`),
    );
    return;
  }
  if (!Array.isArray(run.results)) {
    evaluation.findings.push(
      malformedFinding(
        "SARIF_RESULTS_MALFORMED",
        `${source} contains a run without a results array`,
      ),
    );
    return;
  }
  const rules = rulesFrom(run);
  for (const result of run.results) evaluateResult(result, rules, source, evaluation);
}

export function evaluateSarif(report: unknown, source: string): SarifEvaluation {
  const counts = emptyCounts();
  const findings: QualityFinding[] = [];
  const results: SarifEvaluation["results"] = [];
  const reportObject = asRecord(report);
  if (!reportObject) {
    findings.push({
      code: "SARIF_REPORT_MALFORMED",
      message: `${source} is not a SARIF JSON object`,
    });
    return { source, counts, findings, results };
  }
  const runs = reportObject.runs;
  if (!Array.isArray(runs)) {
    findings.push({
      code: "SARIF_REPORT_MALFORMED",
      message: `${source} does not contain a runs array`,
    });
    return { source, counts, findings, results };
  }

  const evaluation = { counts, findings, results };
  for (const run of runs) evaluateRun(run, source, evaluation);
  return { source, counts, findings, results };
}
