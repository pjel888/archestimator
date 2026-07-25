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

export function selectMutationTargets(
  scope: MutationScope,
  allExecutableFiles: string[],
  inventory: MutationChangeInventory,
  riskMap: RiskMap,
  registry: MutationRegistry,
): MutationSelection {
  const eligible = [...new Set(allExecutableFiles.filter(isMutationTarget))].sort();
  const registryReasons = new Map<string, string[]>();
  const requiredTests = new Set<string>();

  for (const entry of registry.entries) {
    for (const target of entry.targets.filter(isMutationTarget)) {
      const reasons = registryReasons.get(target) ?? [];
      reasons.push(`registry:${entry.id}: ${entry.reason}`);
      registryReasons.set(target, reasons);
    }
  }

  let targets: string[];
  if (scope === "changed") {
    targets = changedExecutableFiles(inventory);
  } else if (scope === "critical") {
    targets = eligible.filter((path) => {
      const profile = classifyFiles([path], riskMap).classification.profile;
      return profile === "Q2_CRITICAL_CHANGE_GATE" || registryReasons.has(path);
    });
  } else if (scope === "representative") {
    targets = [...registryReasons.keys()].filter((path) => eligible.includes(path)).slice(0, 1);
  } else {
    targets = eligible;
  }

  const selected = new Set(targets);
  for (const entry of registry.entries) {
    if (entry.targets.some((target) => selected.has(target))) {
      for (const test of entry.tests) requiredTests.add(test);
    }
  }

  const targetReasons: Record<string, string[]> = {};
  for (const target of targets) {
    const reasons = [...(registryReasons.get(target) ?? [])];
    const classification = classifyFiles([target], riskMap).classification;
    reasons.push(...classification.reasons.map((reason) => `risk-map:${reason}`));
    if (scope === "changed") reasons.push("worktree: changed executable file");
    if (scope === "full") reasons.push("release-scope: mutation executable file");
    targetReasons[target] = [...new Set(reasons)].sort();
  }

  return {
    targets,
    requiredTests: [...requiredTests].sort(),
    targetReasons,
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

  const byStatus = (status: string) => details.filter((detail) => detail.status === status);
  const survivors = byStatus("Survived");
  const noCoverage = byStatus("NoCoverage");
  const compileErrors = byStatus("CompileError");
  const runtimeErrors = byStatus("RuntimeError");
  const killed = byStatus("Killed").length;
  const timedOut = byStatus("Timeout").length;
  const detected = killed + timedOut;
  const valid = detected + survivors.length + noCoverage.length;

  return {
    score: valid === 0 ? null : (detected / valid) * 100,
    counts: Object.fromEntries(
      [...new Set(details.map((detail) => detail.status))]
        .sort()
        .map((status) => [status, byStatus(status).length]),
    ),
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
