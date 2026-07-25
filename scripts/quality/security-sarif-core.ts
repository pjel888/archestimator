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
  result: Record<string, unknown>,
  rule: Record<string, unknown> | undefined,
): unknown {
  const resultProperties =
    result.properties && typeof result.properties === "object"
      ? (result.properties as Record<string, unknown>)
      : {};
  const ruleProperties =
    rule?.properties && typeof rule.properties === "object"
      ? (rule.properties as Record<string, unknown>)
      : {};
  const defaultConfiguration =
    rule?.defaultConfiguration && typeof rule.defaultConfiguration === "object"
      ? (rule.defaultConfiguration as Record<string, unknown>)
      : {};
  return (
    resultProperties["security-severity"] ??
    resultProperties.securitySeverity ??
    resultProperties.severity ??
    ruleProperties["security-severity"] ??
    ruleProperties.securitySeverity ??
    ruleProperties.severity ??
    result.level ??
    defaultConfiguration.level
  );
}

function resultLocation(result: Record<string, unknown>): {
  path?: string;
  line?: number;
} {
  const locations = Array.isArray(result.locations) ? result.locations : [];
  const first = locations[0];
  if (!first || typeof first !== "object" || Array.isArray(first)) return {};
  const physicalLocation = (first as Record<string, unknown>).physicalLocation;
  if (!physicalLocation || typeof physicalLocation !== "object" || Array.isArray(physicalLocation)) {
    return {};
  }
  const physical = physicalLocation as Record<string, unknown>;
  const artifactLocation =
    physical.artifactLocation &&
    typeof physical.artifactLocation === "object" &&
    !Array.isArray(physical.artifactLocation)
      ? (physical.artifactLocation as Record<string, unknown>)
      : {};
  const region =
    physical.region && typeof physical.region === "object" && !Array.isArray(physical.region)
      ? (physical.region as Record<string, unknown>)
      : {};
  return {
    path: safePath(artifactLocation.uri),
    line:
      typeof region.startLine === "number" && Number.isInteger(region.startLine)
        ? region.startLine
        : undefined,
  };
}

export function evaluateSarif(report: unknown, source: string): SarifEvaluation {
  const counts = Object.fromEntries(SEVERITIES.map((severity) => [severity, 0])) as Record<
    SecuritySeverity,
    number
  >;
  const findings: QualityFinding[] = [];
  const results: SarifEvaluation["results"] = [];
  if (!report || typeof report !== "object" || Array.isArray(report)) {
    findings.push({
      code: "SARIF_REPORT_MALFORMED",
      message: `${source} is not a SARIF JSON object`,
    });
    return { source, counts, findings, results };
  }
  const runs = (report as Record<string, unknown>).runs;
  if (!Array.isArray(runs)) {
    findings.push({
      code: "SARIF_REPORT_MALFORMED",
      message: `${source} does not contain a runs array`,
    });
    return { source, counts, findings, results };
  }

  for (const run of runs) {
    if (!run || typeof run !== "object" || Array.isArray(run)) {
      findings.push({
        code: "SARIF_RUN_MALFORMED",
        message: `${source} contains a malformed run`,
      });
      continue;
    }
    const runObject = run as Record<string, unknown>;
    const tool =
      runObject.tool && typeof runObject.tool === "object" && !Array.isArray(runObject.tool)
        ? (runObject.tool as Record<string, unknown>)
        : {};
    const driver =
      tool.driver && typeof tool.driver === "object" && !Array.isArray(tool.driver)
        ? (tool.driver as Record<string, unknown>)
        : {};
    const rules = new Map<string, Record<string, unknown>>();
    const rulesByIndex: (Record<string, unknown> | undefined)[] = [];
    if (Array.isArray(driver.rules)) {
      for (const rule of driver.rules) {
        if (!rule || typeof rule !== "object" || Array.isArray(rule)) {
          rulesByIndex.push(undefined);
          continue;
        }
        const object = rule as Record<string, unknown>;
        rulesByIndex.push(object);
        rules.set(safeRuleId(object.id), object);
      }
    }
    if (!Array.isArray(runObject.results)) {
      findings.push({
        code: "SARIF_RESULTS_MALFORMED",
        message: `${source} contains a run without a results array`,
      });
      continue;
    }
    for (const rawResult of runObject.results) {
      if (!rawResult || typeof rawResult !== "object" || Array.isArray(rawResult)) {
        findings.push({
          code: "SARIF_RESULT_MALFORMED",
          message: `${source} contains a malformed result`,
        });
        continue;
      }
      const result = rawResult as Record<string, unknown>;
      const indexedRule =
        typeof result.ruleIndex === "number" && Number.isInteger(result.ruleIndex)
          ? rulesByIndex[result.ruleIndex]
          : undefined;
      const ruleId = safeRuleId(result.ruleId ?? indexedRule?.id);
      const severity = normalizeSecuritySeverity(
        severityValue(result, rules.get(ruleId) ?? indexedRule),
      );
      const location = resultLocation(result);
      counts[severity] += 1;
      results.push({ rule_id: ruleId, severity, ...location });
      const at = location.path
        ? ` at ${location.path}${location.line ? `:${location.line}` : ""}`
        : "";
      if (severity === "critical") {
        findings.push({
          code: "SARIF_CRITICAL",
          message: `Critical SARIF finding ${ruleId}${at}`,
          path: location.path,
        });
      } else if (severity === "high") {
        findings.push({
          code: "SARIF_HIGH",
          message: `High SARIF finding ${ruleId}${at}`,
          path: location.path,
        });
      } else if (severity === "medium") {
        findings.push({
          code: "SARIF_MEDIUM_UNWAIVED",
          message: `Medium SARIF finding requires an approved expiring waiver: ${ruleId}${at}`,
          path: location.path,
        });
      } else if (severity === "unknown") {
        findings.push({
          code: "SARIF_SEVERITY_UNKNOWN",
          message: `SARIF finding has unknown severity: ${ruleId}${at}`,
          path: location.path,
        });
      }
    }
  }
  return { source, counts, findings, results };
}
