import type { QualityProfile } from "./classifier-core";
import { profileRank } from "./classifier-core";

export const OPERATION_CHECK_STATUSES = [
  "PASS",
  "FAIL",
  "NOT_APPLICABLE",
  "EXTERNAL_PENDING",
] as const;

export type OperationCheckStatus = (typeof OPERATION_CHECK_STATUSES)[number];

export interface OperationsPolicyCheck {
  id: string;
  label: string;
  kind: "local" | "external";
  path_patterns: string[];
  capabilities: string[];
  required_for_q3: boolean;
  provenance: string;
}

export interface OperationsPolicy {
  schema_version: 1;
  checks: OperationsPolicyCheck[];
}

export interface OperationsSelection {
  id: string;
  applicable: boolean;
  required: boolean;
  reasons: string[];
}

export const EXPECTED_OPERATIONS_CHECKS = {
  route_readiness_contract: "local",
  bundle_budget: "local",
  query_count_contract: "local",
  d1_migration_state: "local",
  platform_readiness: "local",
  observability_contract: "local",
  redaction_contract: "local",
  hosted_route_performance: "external",
  hosted_observability: "external",
  hosted_provider_readback: "external",
} as const;

function globMatches(path: string, pattern: string): boolean {
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/gu, "\\$&")
    .replaceAll("**", "\u0000")
    .replaceAll("*", "[^/]*")
    .replaceAll("\u0000", ".*");
  return new RegExp(`^${escaped}$`, "u").test(path);
}

export function validateOperationsPolicy(policy: OperationsPolicy): string[] {
  const errors: string[] = [];
  if (policy.schema_version !== 1) errors.push("schema_version must equal 1");
  if (!Array.isArray(policy.checks) || policy.checks.length === 0) {
    errors.push("checks must be a non-empty array");
    return errors;
  }
  const ids = new Set<string>();
  for (const check of policy.checks) {
    if (!check.id || ids.has(check.id)) errors.push(`duplicate or empty check id: ${check.id}`);
    ids.add(check.id);
    if (!check.label) errors.push(`${check.id}: label is required`);
    if (!["local", "external"].includes(check.kind)) errors.push(`${check.id}: invalid kind`);
    if (!Array.isArray(check.path_patterns)) errors.push(`${check.id}: path_patterns must be an array`);
    if (!Array.isArray(check.capabilities)) errors.push(`${check.id}: capabilities must be an array`);
    if (typeof check.required_for_q3 !== "boolean") errors.push(`${check.id}: required_for_q3 must be boolean`);
    if (!check.provenance) errors.push(`${check.id}: provenance is required`);
    const expectedKind =
      EXPECTED_OPERATIONS_CHECKS[check.id as keyof typeof EXPECTED_OPERATIONS_CHECKS];
    if (!expectedKind) errors.push(`${check.id}: unknown canonical check`);
    if (expectedKind && check.kind !== expectedKind) {
      errors.push(`${check.id}: expected ${expectedKind} kind`);
    }
    if (expectedKind && check.required_for_q3 !== true) {
      errors.push(`${check.id}: canonical checks must be required for Q3`);
    }
  }
  for (const id of Object.keys(EXPECTED_OPERATIONS_CHECKS)) {
    if (!ids.has(id)) errors.push(`${id}: canonical check is missing`);
  }
  return errors;
}

export function validateOperationsProfileSelection(
  requested: QualityProfile | undefined,
  classified: QualityProfile | undefined,
): string | null {
  if (!requested || !classified) return null;
  if (profileRank(requested) < profileRank(classified)) {
    return `Requested ${requested} is weaker than classified ${classified}`;
  }
  return null;
}

export function validateBundleBudgetArtifact(artifact: {
  kind?: string;
  status?: string;
  data?: {
    evidence_id?: string | null;
    command_text?: string;
    stdout_tail?: string;
  };
}): boolean {
  return (
    artifact.kind === "command-evidence" &&
    artifact.status === "PASS" &&
    artifact.data?.evidence_id === "bundle-budget" &&
    artifact.data.command_text?.includes("scripts/check-performance-budgets.mjs --strict") === true &&
    artifact.data.stdout_tail?.includes("[perf-budget] PASS:") === true
  );
}

export function selectOperationsChecks(
  profile: QualityProfile,
  files: string[],
  capabilities: string[],
  policy: OperationsPolicy,
): OperationsSelection[] {
  const capabilitySet = new Set(capabilities);
  return policy.checks.map((check) => {
    const matchedPaths = files.filter((file) =>
      check.path_patterns.some((pattern) => globMatches(file, pattern))
    );
    const matchedCapabilities = check.capabilities.filter((capability) =>
      capabilitySet.has(capability)
    );
    const releaseRequired = profile === "Q3_RELEASE_GATE" && check.required_for_q3;
    const applicable = releaseRequired || matchedPaths.length > 0 || matchedCapabilities.length > 0;
    const reasons = [
      ...matchedPaths.map((path) => `changed path: ${path}`),
      ...matchedCapabilities.map((capability) => `affected capability: ${capability}`),
      ...(releaseRequired ? ["Q3 complete operations set"] : []),
    ];
    return {
      id: check.id,
      applicable,
      required: releaseRequired || (applicable && check.kind === "local"),
      reasons,
    };
  });
}

export function statusForUnexecutedCheck(
  check: OperationsPolicyCheck,
  selection: OperationsSelection,
): OperationCheckStatus {
  if (!selection.applicable) return "NOT_APPLICABLE";
  return check.kind === "external" ? "EXTERNAL_PENDING" : "FAIL";
}

export function operationsVerdict(
  profile: QualityProfile,
  checks: Array<{ status: OperationCheckStatus; required: boolean }>,
): "PASS" | "FAIL" | "QUALITY_BLOCKED" {
  if (checks.some((check) => check.required && check.status === "FAIL")) return "FAIL";
  if (
    profile === "Q3_RELEASE_GATE" &&
    checks.some((check) => check.required && check.status === "EXTERNAL_PENDING")
  ) {
    return "QUALITY_BLOCKED";
  }
  return "PASS";
}
