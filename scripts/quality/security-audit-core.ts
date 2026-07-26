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

const STRING_SEVERITIES: Readonly<Record<string, SecuritySeverity>> = {
  critical: "critical",
  error: "high",
  high: "high",
  info: "info",
  low: "low",
  medium: "medium",
  moderate: "medium",
  none: "info",
  note: "low",
  warning: "medium",
};

function numericSeverity(value: number): SecuritySeverity {
  if (value >= 9) return "critical";
  if (value >= 7) return "high";
  if (value >= 4) return "medium";
  if (value > 0) return "low";
  return "info";
}

export function normalizeSecuritySeverity(value: unknown): SecuritySeverity {
  if (typeof value === "number" && Number.isFinite(value)) {
    return numericSeverity(value);
  }
  if (typeof value !== "string") return "unknown";
  const normalized = value.trim().toLowerCase();
  if (/^\d+(?:\.\d+)?$/u.test(normalized)) {
    return numericSeverity(Number(normalized));
  }
  return STRING_SEVERITIES[normalized] ?? "unknown";
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

function objectItems(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is Record<string, unknown> =>
      Boolean(item) && typeof item === "object" && !Array.isArray(item),
  );
}

function npmVulnerabilityAdvisories(
  value: unknown,
  packageName: string,
  startIndex: number,
): SanitizedAdvisory[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  const vulnerability = value as Record<string, unknown>;
  const via = objectItems(vulnerability.via);
  if (via.length > 0) {
    return via.map((item, index) => advisoryFrom(item, packageName, startIndex + index));
  }
  return "severity" in vulnerability
    ? [advisoryFrom(vulnerability, packageName, startIndex)]
    : [];
}

function collectNpmAuditV2(report: Record<string, unknown>): SanitizedAdvisory[] | undefined {
  const vulnerabilities = report.vulnerabilities;
  if (!vulnerabilities || typeof vulnerabilities !== "object" || Array.isArray(vulnerabilities)) {
    return undefined;
  }
  const advisories: SanitizedAdvisory[] = [];
  for (const [packageName, raw] of Object.entries(vulnerabilities)) {
    advisories.push(...npmVulnerabilityAdvisories(raw, packageName, advisories.length));
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

function emptyCounts(): Record<SecuritySeverity, number> {
  return Object.fromEntries(SEVERITIES.map((severity) => [severity, 0])) as Record<
    SecuritySeverity,
    number
  >;
}

function malformedAuditEvaluation(): AuditEvaluation {
  return {
    advisories: [],
    counts: emptyCounts(),
    findings: [
      {
        code: "AUDIT_REPORT_MALFORMED",
        message: "Bun audit did not produce a JSON object",
      },
    ],
  };
}

function deduplicateAdvisories(advisories: SanitizedAdvisory[]): SanitizedAdvisory[] {
  return [
    ...new Map(
      advisories.map((advisory) => [
        `${advisory.identity}\0${advisory.package}\0${advisory.severity}`,
        advisory,
      ]),
    ).values(),
  ];
}

function advisoryFinding(advisory: SanitizedAdvisory): QualityFinding | undefined {
  const location = `${advisory.package} (${advisory.identity})`;
  const findingBySeverity: Partial<Record<SecuritySeverity, QualityFinding>> = {
    critical: {
      code: "DEPENDENCY_CRITICAL",
      message: `Critical dependency advisory: ${location}`,
    },
    high: {
      code: "DEPENDENCY_HIGH",
      message: `High dependency advisory: ${location}`,
    },
    medium: {
      code: "DEPENDENCY_MEDIUM_UNWAIVED",
      message: `Medium dependency advisory requires an approved expiring waiver: ${location}`,
    },
    unknown: {
      code: "AUDIT_SEVERITY_UNKNOWN",
      message: `Dependency advisory has unknown severity: ${location}`,
    },
  };
  return findingBySeverity[advisory.severity];
}

function summarizeAdvisories(advisories: SanitizedAdvisory[]): AuditEvaluation {
  const counts = emptyCounts();
  const findings: QualityFinding[] = [];
  for (const advisory of advisories) {
    counts[advisory.severity] += 1;
    const finding = advisoryFinding(advisory);
    if (finding) findings.push(finding);
  }
  return { advisories, counts, findings };
}

export function evaluateBunAudit(report: unknown): AuditEvaluation {
  if (!report || typeof report !== "object" || Array.isArray(report)) {
    return malformedAuditEvaluation();
  }

  const object = report as Record<string, unknown>;
  const collected = collectNpmAuditV2(object);
  const advisories: SanitizedAdvisory[] = collected ?? [];
  if (collected === undefined) collectGenericAudit(object, advisories);
  return summarizeAdvisories(deduplicateAdvisories(advisories));
}
