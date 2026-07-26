import type { RiskMap } from "./classifier-core";
import { classifyFiles } from "./classifier-core";

export type MutationScope = "changed" | "critical" | "full" | "representative";

export interface MutationChangeInventory {
  committed: string[];
  staged: string[];
  unstaged: string[];
  untracked: string[];
}

export interface MutationRegistryEntry {
  id: string;
  targets: string[];
  tests: string[];
  reason: string;
}

export interface MutationRegistry {
  schema_version: 1;
  entries: MutationRegistryEntry[];
}

export interface MutationSelection {
  targets: string[];
  requiredTests: string[];
  targetReasons: Record<string, string[]>;
}

export interface MutationDetail {
  file: string;
  id: string;
  mutator: string;
  status: string;
  status_reason: string | null;
  location: unknown;
}

export interface MutationMetrics {
  score: number | null;
  counts: Record<string, number>;
  survivors: MutationDetail[];
  no_coverage: MutationDetail[];
  compile_errors: MutationDetail[];
  runtime_errors: MutationDetail[];
  high_risk_survivors: MutationDetail[];
  high_risk_no_coverage: MutationDetail[];
  valid_mutants: number;
  detected_mutants: number;
}

const MUTATION_SOURCE_EXTENSIONS = /\.(?:c|m)?(?:js|ts)x?$/u;
const MUTATION_SOURCE_ROOT = /^(?:src\/|scripts\/quality\/|image-loader\.ts$)/u;
const QUALITY_CORE_PATH = /^scripts\/quality\/[^/]+-core\.ts$/u;
const NON_PRODUCTION_PATH =
  /(?:^|\/)(?:__mocks__|__tests__|e2e|stories|tests?)(?:\/|$)|\.(?:d|spec|test|stories)\.(?:c|m)?(?:js|ts)x?$/u;

export function parseGitPaths(stdout: string): string[] {
  return stdout
    .split(/\r?\n/u)
    .map((path) => path.trim())
    .filter(Boolean);
}

export function parseCompileDiagnostics(output: string): string[] {
  return [
    ...new Set(
      output
        .split(/\r?\n/u)
        .map((line) => line.trim())
        .filter((line) => /\berror TS\d+:/u.test(line)),
    ),
  ].sort();
}

export function isMutationTarget(path: string): boolean {
  return (
    MUTATION_SOURCE_ROOT.test(path) &&
    MUTATION_SOURCE_EXTENSIONS.test(path) &&
    !NON_PRODUCTION_PATH.test(path)
  );
}

export function changedExecutableFiles(inventory: MutationChangeInventory): string[] {
  return [
    ...new Set([
      ...inventory.committed,
      ...inventory.staged,
      ...inventory.unstaged,
      ...inventory.untracked,
    ]),
  ]
    .filter(isMutationTarget)
    .sort();
}

function mutationRegistryReasons(registry: MutationRegistry): Map<string, string[]> {
  const reasonsByTarget = new Map<string, string[]>();
  for (const entry of registry.entries) {
    for (const target of entry.targets.filter(isMutationTarget)) {
      const reasons = reasonsByTarget.get(target) ?? [];
      reasons.push(`registry:${entry.id}: ${entry.reason}`);
      reasonsByTarget.set(target, reasons);
    }
  }
  return reasonsByTarget;
}

function targetsForScope(
  scope: MutationScope,
  eligible: string[],
  inventory: MutationChangeInventory,
  riskMap: RiskMap,
  registryReasons: Map<string, string[]>,
): string[] {
  if (scope === "changed") return changedExecutableFiles(inventory);
  if (scope === "critical") {
    const eligibleSet = new Set(eligible);
    const changedCriticalCores = changedExecutableFiles(inventory).filter(
      (path) =>
        eligibleSet.has(path) &&
        QUALITY_CORE_PATH.test(path) &&
        classifyFiles([path], riskMap).classification.profile ===
          "Q2_CRITICAL_CHANGE_GATE",
    );
    const registeredTargets = [...registryReasons.keys()].filter((path) =>
      eligibleSet.has(path)
    );
    return [...new Set([...changedCriticalCores, ...registeredTargets])].sort();
  }
  if (scope === "representative") {
    return [...registryReasons.keys()].filter((path) => eligible.includes(path)).slice(0, 1);
  }
  return eligible;
}

function requiredTestsForTargets(
  targets: string[],
  registry: MutationRegistry,
): string[] {
  const selected = new Set(targets);
  const requiredTests = new Set<string>();
  for (const entry of registry.entries) {
    if (!entry.targets.some((target) => selected.has(target))) continue;
    for (const test of entry.tests) requiredTests.add(test);
  }
  return [...requiredTests].sort();
}

function reasonsForTargets(
  targets: string[],
  scope: MutationScope,
  riskMap: RiskMap,
  registryReasons: Map<string, string[]>,
): Record<string, string[]> {
  return Object.fromEntries(
    targets.map((target) => {
      const reasons = [...(registryReasons.get(target) ?? [])];
      const classification = classifyFiles([target], riskMap).classification;
      reasons.push(...classification.reasons.map((reason) => `risk-map:${reason}`));
      if (scope === "changed") reasons.push("worktree: changed executable file");
      if (scope === "full") reasons.push("release-scope: mutation executable file");
      return [target, [...new Set(reasons)].sort()];
    }),
  );
}

export function selectMutationTargets(
  scope: MutationScope,
  allExecutableFiles: string[],
  inventory: MutationChangeInventory,
  riskMap: RiskMap,
  registry: MutationRegistry,
): MutationSelection {
  const eligible = [...new Set(allExecutableFiles.filter(isMutationTarget))].sort();
  const registryReasons = mutationRegistryReasons(registry);
  const targets = targetsForScope(scope, eligible, inventory, riskMap, registryReasons);

  return {
    targets,
    requiredTests: requiredTestsForTargets(targets, registry),
    targetReasons: reasonsForTargets(targets, scope, riskMap, registryReasons),
  };
}

export function highRiskTargets(
  targets: string[],
  riskMap: RiskMap,
  registry: MutationRegistry,
): Set<string> {
  const registered = new Set(registry.entries.flatMap((entry) => entry.targets));
  return new Set(
    targets.filter(
      (path) =>
        registered.has(path) ||
        classifyFiles([path], riskMap).classification.profile === "Q2_CRITICAL_CHANGE_GATE",
    ),
  );
}

export function summarizeMutationReport(
  report: {
    files?: Record<
      string,
      {
        mutants?: Array<{
          id?: string;
          mutatorName?: string;
          status?: string;
          statusReason?: string;
          location?: unknown;
        }>;
      }
    >;
  },
  highRisk: Set<string>,
): MutationMetrics {
  const details = mutationDetails(report);
  const byStatus = (status: string) => details.filter((detail) => detail.status === status);
  const survivors = byStatus("Survived");
  const noCoverage = byStatus("NoCoverage");
  const compileErrors = byStatus("CompileError");
  const runtimeErrors = byStatus("RuntimeError");
  const detected = byStatus("Killed").length + byStatus("Timeout").length;
  const valid = detected + survivors.length + noCoverage.length;

  return {
    score: valid === 0 ? null : (detected / valid) * 100,
    counts: mutationStatusCounts(details),
    survivors,
    no_coverage: noCoverage,
    compile_errors: compileErrors,
    runtime_errors: runtimeErrors,
    high_risk_survivors: survivors.filter((detail) => highRisk.has(detail.file)),
    high_risk_no_coverage: noCoverage.filter((detail) => highRisk.has(detail.file)),
    valid_mutants: valid,
    detected_mutants: detected,
  };
}

function mutationDetails(report: Parameters<typeof summarizeMutationReport>[0]): MutationDetail[] {
  const details: MutationDetail[] = [];
  for (const [file, fileReport] of Object.entries(report.files ?? {})) {
    for (const mutant of fileReport.mutants ?? []) {
      details.push({
        file,
        id: mutant.id ?? "",
        mutator: mutant.mutatorName ?? "",
        status: mutant.status ?? "Unknown",
        status_reason: mutant.statusReason ?? null,
        location: mutant.location ?? null,
      });
    }
  }
  return details;
}

function mutationStatusCounts(details: MutationDetail[]): Record<string, number> {
  const byStatus = (status: string) => details.filter((detail) => detail.status === status);
  return Object.fromEntries(
    [...new Set(details.map((detail) => detail.status))]
      .sort()
      .map((status) => [status, byStatus(status).length]),
  );
}
