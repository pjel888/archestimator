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

export type LocalOperationCheckId = {
  [Id in keyof typeof EXPECTED_OPERATIONS_CHECKS]:
    (typeof EXPECTED_OPERATIONS_CHECKS)[Id] extends "local" ? Id : never;
}[keyof typeof EXPECTED_OPERATIONS_CHECKS];

export interface OperationDispatchPlan {
  id: LocalOperationCheckId;
  command: string;
  args: string[];
  env: Record<string, string>;
  artifacts: string[];
  message: string;
}

const BUNDLE_EVIDENCE_MAX_AGE_MS = 2 * 60 * 60 * 1_000;
const BUNDLE_EVIDENCE_FUTURE_TOLERANCE_MS = 5 * 60 * 1_000;

function globMatches(path: string, pattern: string): boolean {
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/gu, "\\$&")
    .replaceAll("**", "\u0000")
    .replaceAll("*", "[^/]*")
    .replaceAll("\u0000", ".*");
  return new RegExp(`^${escaped}$`, "u").test(path);
}

function validateCheckIdentity(check: OperationsPolicyCheck, seenIds: Set<string>): string[] {
  const invalid = !check.id || seenIds.has(check.id);
  seenIds.add(check.id);
  return invalid ? [`duplicate or empty check id: ${check.id}`] : [];
}

function validateCheckShape(check: OperationsPolicyCheck): string[] {
  const requirements: Array<[boolean, string]> = [
    [Boolean(check.label), `${check.id}: label is required`],
    [["local", "external"].includes(check.kind), `${check.id}: invalid kind`],
    [Array.isArray(check.path_patterns), `${check.id}: path_patterns must be an array`],
    [Array.isArray(check.capabilities), `${check.id}: capabilities must be an array`],
    [typeof check.required_for_q3 === "boolean", `${check.id}: required_for_q3 must be boolean`],
    [Boolean(check.provenance), `${check.id}: provenance is required`],
  ];
  return requirements.filter(([valid]) => !valid).map(([, message]) => message);
}

function validateCanonicalCheck(check: OperationsPolicyCheck): string[] {
  const expectedKind = EXPECTED_OPERATIONS_CHECKS[check.id as keyof typeof EXPECTED_OPERATIONS_CHECKS];
  if (!expectedKind) return [`${check.id}: unknown canonical check`];
  const errors: string[] = [];
  if (check.kind !== expectedKind) errors.push(`${check.id}: expected ${expectedKind} kind`);
  if (check.required_for_q3 !== true) {
    errors.push(`${check.id}: canonical checks must be required for Q3`);
  }
  return errors;
}

function validatePolicyCheck(check: OperationsPolicyCheck, seenIds: Set<string>): string[] {
  return [
    ...validateCheckIdentity(check, seenIds),
    ...validateCheckShape(check),
    ...validateCanonicalCheck(check),
  ];
}

function validatePolicyCompleteness(seenIds: Set<string>): string[] {
  return Object.keys(EXPECTED_OPERATIONS_CHECKS)
    .filter((id) => !seenIds.has(id))
    .map((id) => `${id}: canonical check is missing`);
}

export function validateOperationsPolicy(policy: OperationsPolicy): string[] {
  const errors = policy.schema_version === 1 ? [] : ["schema_version must equal 1"];
  if (!Array.isArray(policy.checks) || policy.checks.length === 0) {
    return [...errors, "checks must be a non-empty array"];
  }
  const ids = new Set<string>();
  for (const check of policy.checks) {
    errors.push(...validatePolicyCheck(check, ids));
  }
  return [...errors, ...validatePolicyCompleteness(ids)];
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
  schema_version?: number;
  kind?: string;
  status?: string;
  generated_at?: string;
  data?: {
    command?: string[];
    evidence_id?: string | null;
    command_text?: string;
    started_at?: string;
    finished_at?: string;
    exit_code?: number;
    stdout_tail?: string;
  };
}, now = new Date()): boolean {
  const generatedAt = Date.parse(artifact.generated_at ?? "");
  const startedAt = Date.parse(artifact.data?.started_at ?? "");
  const finishedAt = Date.parse(artifact.data?.finished_at ?? "");
  const age = now.getTime() - finishedAt;
  const exactCommand = "bun scripts/check-performance-budgets.mjs --strict";
  return [
    artifact.schema_version === 1,
    artifact.kind === "command-evidence",
    artifact.status === "PASS",
    Number.isFinite(generatedAt),
    Number.isFinite(startedAt),
    Number.isFinite(finishedAt),
    startedAt <= finishedAt,
    startedAt <= generatedAt,
    generatedAt <= finishedAt,
    age >= -BUNDLE_EVIDENCE_FUTURE_TOLERANCE_MS,
    age <= BUNDLE_EVIDENCE_MAX_AGE_MS,
    artifact.data?.evidence_id === "bundle-budget",
    artifact.data?.exit_code === 0,
    artifact.data?.command?.join(" ") === exactCommand,
    artifact.data?.command_text === exactCommand,
    artifact.data?.stdout_tail?.includes("[perf-budget] PASS:") === true,
  ].every(Boolean);
}

export function planLocalOperationCheck(
  id: string,
  paths: {
    performanceDirectory: string;
    observabilityDirectory: string;
    migrationsDirectory: string;
    bundleArtifactPath: string;
  },
): OperationDispatchPlan | null {
  const childPath = (directory: string, name: string): string =>
    `${directory}${directory.includes("\\") ? "\\" : "/"}${name}`;
  const plans: Record<LocalOperationCheckId, OperationDispatchPlan> = {
    route_readiness_contract: {
      id: "route_readiness_contract",
      command: "bun",
      args: ["run", "scripts/check-route-transition-readiness.ts"],
      env: {
        ROUTE_TRANSITION_BENCHMARK_FILE: childPath(paths.performanceDirectory, "route-readiness.synthetic.json"),
        OUTPUT_FILE: childPath(paths.performanceDirectory, "route-readiness.contract.json"),
      },
      artifacts: [
        childPath(paths.performanceDirectory, "route-readiness.synthetic.json"),
        childPath(paths.performanceDirectory, "route-readiness.contract.json"),
      ],
      message: "Existing route-readiness evaluator accepted the deterministic local fixture; this is evaluator wiring proof, not measured route performance",
    },
    bundle_budget: {
      id: "bundle_budget",
      command: "consume strict bundle-budget command evidence from build job",
      args: [],
      env: {},
      artifacts: [paths.bundleArtifactPath],
      message: "Strict bundle budget passed in the build job",
    },
    query_count_contract: {
      id: "query_count_contract",
      command: "bun",
      args: ["run", "scripts/measure-workshop-dashboard-query-count.ts"],
      env: {
        PERF_TRACE_INPUT: childPath(paths.performanceDirectory, "dashboard-query-count.synthetic.log"),
        OUTPUT_FILE: childPath(paths.performanceDirectory, "dashboard-query-count.contract.json"),
      },
      artifacts: [
        childPath(paths.performanceDirectory, "dashboard-query-count.synthetic.log"),
        childPath(paths.performanceDirectory, "dashboard-query-count.contract.json"),
      ],
      message: "Existing query-count collector accepted the deterministic local fixture; this is collector wiring proof, not a live query budget",
    },
    d1_migration_state: {
      id: "d1_migration_state",
      command: "bun",
      args: ["run", "scripts/check-cloudflare-d1-migrations.ts", "--local"],
      env: { OUTPUT_FILE: childPath(paths.migrationsDirectory, "d1-migration-state.json") },
      artifacts: [],
      message: "Local check passed",
    },
    platform_readiness: {
      id: "platform_readiness",
      command: "bun",
      args: ["run", "cf:check-readiness"],
      env: { OUTPUT_FILE: childPath(paths.observabilityDirectory, "cloudflare-worker-readiness.json") },
      artifacts: [childPath(paths.observabilityDirectory, "cloudflare-worker-readiness.json")],
      message: "Local source/config readiness passed; hosted resources and secrets remain outside this proof",
    },
    observability_contract: {
      id: "observability_contract",
      command: "bun",
      args: ["run", "ops:check-alert-scenarios", "--", "--catalog-only", "--output", childPath(paths.observabilityDirectory, "alert-scenario-readiness.json")],
      env: {},
      artifacts: [childPath(paths.observabilityDirectory, "alert-scenario-readiness.json")],
      message: "Local alert scenario catalog passed; alert delivery remains external",
    },
    redaction_contract: {
      id: "redaction_contract",
      command: "bun",
      args: ["run", "ops:check-error-handling", "--", "--output", childPath(paths.observabilityDirectory, "error-handling-contract.json")],
      env: {},
      artifacts: [childPath(paths.observabilityDirectory, "error-handling-contract.json")],
      message: "Local check passed",
    },
  };
  return plans[id as LocalOperationCheckId] ?? null;
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
