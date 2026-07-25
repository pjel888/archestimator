import type { QualityFinding } from "./common";

export type SecuritySeverity =
  | "critical"
  | "high"
  | "medium"
  | "low"
  | "info"
  | "unknown";

export interface SanitizedAdvisory {
  identity: string;
  package: string;
  severity: SecuritySeverity;
}

export interface AuditEvaluation {
  advisories: SanitizedAdvisory[];
  counts: Record<SecuritySeverity, number>;
  findings: QualityFinding[];
}

const SEVERITIES: SecuritySeverity[] = [
  "critical",
  "high",
  "medium",
  "low",
  "info",
  "unknown",
];

export function normalizeSecuritySeverity(value: unknown): SecuritySeverity {
  if (typeof value === "number" && Number.isFinite(value)) {
    if (value >= 9) return "critical";
    if (value >= 7) return "high";
    if (value >= 4) return "medium";
    if (value > 0) return "low";
    return "info";
  }
  if (typeof value !== "string") return "unknown";
  const normalized = value.trim().toLowerCase();
  if (/^\d+(?:\.\d+)?$/u.test(normalized)) {
    return normalizeSecuritySeverity(Number(normalized));
  }
  if (normalized === "critical") return "critical";
  if (normalized === "high" || normalized === "error") return "high";
  if (normalized === "moderate" || normalized === "medium" || normalized === "warning") {
    return "medium";
  }
  if (normalized === "low" || normalized === "note") return "low";
  if (normalized === "info" || normalized === "none") return "info";
  return "unknown";
}

function safeLabel(value: unknown, fallback: string): string {
  if (typeof value !== "string" && typeof value !== "number") return fallback;
  const label = String(value).trim();
  return /^[a-zA-Z0-9@/_.:-]{1,120}$/u.test(label) ? label : fallback;
}

function advisoryFrom(
  value: Record<string, unknown>,
  packageHint: string,
  index: number,
): SanitizedAdvisory {
  return {
    identity: safeLabel(
      value.id ?? value.source ?? value.cve ?? value.ghsa ?? value.advisory,
      `advisory-${index + 1}`,
    ),
    package: safeLabel(
      value.package ?? value.name ?? value.dependency ?? packageHint,
      "unknown-package",
    ),
    severity: normalizeSecuritySeverity(value.severity),
  };
}

function collectNpmAuditV2(report: Record<string, unknown>): SanitizedAdvisory[] | undefined {
  const vulnerabilities = report.vulnerabilities;
  if (!vulnerabilities || typeof vulnerabilities !== "object" || Array.isArray(vulnerabilities)) {
    return undefined;
  }
  const advisories: SanitizedAdvisory[] = [];
  for (const [packageName, raw] of Object.entries(vulnerabilities)) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
    const vulnerability = raw as Record<string, unknown>;
    const via = Array.isArray(vulnerability.via)
      ? vulnerability.via.filter(
          (item): item is Record<string, unknown> =>
            Boolean(item) && typeof item === "object" && !Array.isArray(item),
        )
      : [];
    if (via.length > 0) {
      for (const item of via) {
        advisories.push(advisoryFrom(item, packageName, advisories.length));
      }
    } else if ("severity" in vulnerability) {
      advisories.push(advisoryFrom(vulnerability, packageName, advisories.length));
    }
  }
  return advisories;
}

function collectGenericAudit(
  value: unknown,
  advisories: SanitizedAdvisory[],
  packageHint = "unknown-package",
): void {
  if (Array.isArray(value)) {
    for (const item of value) collectGenericAudit(item, advisories, packageHint);
    return;
  }
  if (!value || typeof value !== "object") return;
  const object = value as Record<string, unknown>;
  if (
    "severity" in object &&
    ["id", "source", "cve", "ghsa", "advisory", "title", "url", "vulnerable_versions"]
      .some((key) => key in object)
  ) {
    advisories.push(advisoryFrom(object, packageHint, advisories.length));
    return;
  }
  for (const [key, child] of Object.entries(object)) {
    collectGenericAudit(child, advisories, safeLabel(key, packageHint));
  }
}

export function evaluateBunAudit(report: unknown): AuditEvaluation {
  const findings: QualityFinding[] = [];
  if (!report || typeof report !== "object" || Array.isArray(report)) {
    return {
      advisories: [],
      counts: Object.fromEntries(SEVERITIES.map((severity) => [severity, 0])) as Record<
        SecuritySeverity,
        number
      >,
      findings: [
        {
          code: "AUDIT_REPORT_MALFORMED",
          message: "Bun audit did not produce a JSON object",
        },
      ],
    };
  }

  const object = report as Record<string, unknown>;
  const collected = collectNpmAuditV2(object);
  const advisories: SanitizedAdvisory[] = collected ?? [];
  if (collected === undefined) collectGenericAudit(object, advisories);
  const deduplicated = [
    ...new Map(
      advisories.map((advisory) => [
        `${advisory.identity}\0${advisory.package}\0${advisory.severity}`,
        advisory,
      ]),
    ).values(),
  ];
  const counts = Object.fromEntries(SEVERITIES.map((severity) => [severity, 0])) as Record<
    SecuritySeverity,
    number
  >;

  for (const advisory of deduplicated) {
    counts[advisory.severity] += 1;
    const location = `${advisory.package} (${advisory.identity})`;
    if (advisory.severity === "critical") {
      findings.push({
        code: "DEPENDENCY_CRITICAL",
        message: `Critical dependency advisory: ${location}`,
      });
    } else if (advisory.severity === "high") {
      findings.push({
        code: "DEPENDENCY_HIGH",
        message: `High dependency advisory: ${location}`,
      });
    } else if (advisory.severity === "medium") {
      findings.push({
        code: "DEPENDENCY_MEDIUM_UNWAIVED",
        message: `Medium dependency advisory requires an approved expiring waiver: ${location}`,
      });
    } else if (advisory.severity === "unknown") {
      findings.push({
        code: "AUDIT_SEVERITY_UNKNOWN",
        message: `Dependency advisory has unknown severity: ${location}`,
      });
    }
  }

  return { advisories: deduplicated, counts, findings };
}
