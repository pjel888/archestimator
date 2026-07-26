import { readFile, unlink } from "node:fs/promises";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import {
  finishCli,
  flagString,
  makeResult,
  parseArgs,
  qualityRoot,
  readJson,
  writeJson,
  type QualityFinding,
} from "./common";
import type { RiskMap } from "./classifier-core";
import {
  highRiskTargets,
  parseCompileDiagnostics,
  parseGitPaths,
  selectMutationTargets,
  summarizeMutationReport,
  type MutationChangeInventory,
  type MutationRegistry,
  type MutationScope,
} from "./mutation-core";
import {
  comparisonBaseFromFlags,
  type ComparisonBase,
} from "./comparison-base-core";

const { flags } = parseArgs();
const root = qualityRoot();
const requestedScope = flagString(flags, "scope");
const findings: QualityFinding[] = [];
const allowedScopes: MutationScope[] = ["changed", "critical", "full", "representative"];
const scope = allowedScopes.includes(requestedScope as MutationScope)
  ? (requestedScope as MutationScope)
  : undefined;
if (!scope) {
  findings.push({
    code: "MUTATION_SCOPE",
    message: "--scope must be changed, critical, full, or representative",
  });
}

let comparisonBase: ComparisonBase | undefined;
try {
  comparisonBase = await comparisonBaseFromFlags({ root, flags });
} catch (error) {
  findings.push({ code: "COMPARISON_BASE", message: String(error) });
}
const mergeBase = comparisonBase?.resolved_sha ?? "";

function gitPaths(args: string[], findingCode: string): string[] {
  const run = spawnSync("git", args, {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 30 * 1024 * 1024,
  });
  if (run.status !== 0) {
    findings.push({
      code: findingCode,
      message: `Cannot derive mutation paths with git ${args.join(" ")}`,
      detail: run.stderr.trim(),
    });
    return [];
  }
  return parseGitPaths(run.stdout);
}

const pathspec = ["--", "src", "scripts/quality", "image-loader.ts"];
const inventory: MutationChangeInventory = {
  committed: mergeBase
    ? gitPaths(
        ["diff", "--name-only", "--diff-filter=ACMR", mergeBase, "HEAD", ...pathspec],
        "MUTATION_COMMITTED_SELECTION",
      )
    : [],
  staged: gitPaths(
    ["diff", "--cached", "--name-only", "--diff-filter=ACMR", ...pathspec],
    "MUTATION_STAGED_SELECTION",
  ),
  unstaged: gitPaths(
    ["diff", "--name-only", "--diff-filter=ACMR", ...pathspec],
    "MUTATION_UNSTAGED_SELECTION",
  ),
  untracked: gitPaths(
    ["ls-files", "--others", "--exclude-standard", ...pathspec],
    "MUTATION_UNTRACKED_SELECTION",
  ),
};
const allExecutableFiles = gitPaths(
  ["ls-files", "--cached", "--others", "--exclude-standard", ...pathspec],
  "MUTATION_FULL_SELECTION",
);

const riskMap = await readJson<RiskMap>(resolve(root, "quality/risk-map.json"));
const registry = await readJson<MutationRegistry>(
  resolve(root, "quality/mutation-registry.json"),
);
const selection = scope
  ? selectMutationTargets(scope, allExecutableFiles, inventory, riskMap, registry)
  : { targets: [], requiredTests: [], targetReasons: {} };
const candidates = selection.targets;
if (candidates.length === 0) {
  findings.push({
    code: "EMPTY_MUTATION_TARGETS",
    message: `${scope ?? requestedScope ?? "unknown"} mutation target set is empty`,
  });
}

const reportPath = resolve(root, "artifacts/stryker/stryker.json");
const selectedTsconfigName = `.stryker-mutation-${process.pid}.json`;
const selectedTsconfigPath = resolve(root, selectedTsconfigName);
const runnerCommand = ["bun", "x", "stryker", "run", "stryker.config.mjs"];
const requestedCommand = [
  "bun",
  "scripts/quality/run-mutation.ts",
  "--scope",
  scope ?? requestedScope ?? "",
  "--base",
  comparisonBase?.input_ref ?? "",
  "--base-sha",
  comparisonBase?.resolved_sha ?? "",
];
const command = {
  requested: requestedCommand.join(" "),
  runner: runnerCommand.join(" "),
  environment: {
    ARCHESTIMATOR_MUTATION_SCOPE: scope ?? null,
    ARCHESTIMATOR_MUTATION_TARGETS: candidates,
    ARCHESTIMATOR_MUTATION_REQUIRED_TESTS: selection.requiredTests,
    ARCHESTIMATOR_MUTATION_TSCONFIG: selectedTsconfigName,
  },
};

let execution: {
  exit_code: number | null;
  duration_ms: number;
  signal: NodeJS.Signals | null;
  error: string | null;
} | null = null;
let metrics = summarizeMutationReport({}, new Set<string>());
let compileDiagnostics: string[] = [];

if (findings.length === 0 && !flags.has("plan")) {
  await writeJson(selectedTsconfigPath, {
    extends: "./tsconfig.mutation.json",
    include: [...candidates, "vitest.mutation.config.ts"],
  });
  await unlink(reportPath).catch((error: NodeJS.ErrnoException) => {
    if (error.code !== "ENOENT") throw error;
  });
  const started = performance.now();
  const run = spawnSync(runnerCommand[0], runnerCommand.slice(1), {
    cwd: root,
    encoding: "utf8",
    env: {
      ...process.env,
      ARCHESTIMATOR_MUTATION_SCOPE: scope,
      ARCHESTIMATOR_MUTATION_TARGETS: JSON.stringify(candidates),
      ARCHESTIMATOR_MUTATION_REQUIRED_TESTS: JSON.stringify(selection.requiredTests),
      ARCHESTIMATOR_MUTATION_TSCONFIG: selectedTsconfigName,
      NODE_OPTIONS: `${process.env.NODE_OPTIONS ? `${process.env.NODE_OPTIONS} ` : ""}--max-old-space-size=4096`,
    },
    timeout: 60 * 60_000,
    maxBuffer: 30 * 1024 * 1024,
  });
  await unlink(selectedTsconfigPath).catch((error: NodeJS.ErrnoException) => {
    if (error.code !== "ENOENT") throw error;
  });
  const spawnErrorCode = (run.error as NodeJS.ErrnoException | undefined)?.code;
  execution = {
    exit_code: run.status,
    duration_ms: Math.round(performance.now() - started),
    signal: run.signal,
    error: run.error?.message ?? null,
  };
  compileDiagnostics = parseCompileDiagnostics(`${run.stdout}\n${run.stderr}`);
  if (run.status !== 0) {
    findings.push({
      code: run.signal
        ? "STRYKER_SIGNAL"
        : spawnErrorCode === "ETIMEDOUT"
          ? "STRYKER_TIMEOUT"
          : "STRYKER_FAILED",
      message: run.signal
        ? `Stryker terminated by ${run.signal}`
        : spawnErrorCode === "ETIMEDOUT"
          ? "Stryker exceeded the one-hour timeout"
          : `Stryker exited ${run.status}`,
      detail: { stdout: run.stdout.slice(-8_000), stderr: run.stderr.slice(-8_000) },
    });
  }

  try {
    const report = JSON.parse(await readFile(reportPath, "utf8"));
    metrics = summarizeMutationReport(
      report,
      highRiskTargets(candidates, riskMap, registry),
    );
    if (metrics.valid_mutants === 0) {
      findings.push({ code: "NO_MUTANTS", message: "Stryker report contains no valid mutants" });
    }
    if (metrics.high_risk_survivors.length > 0) {
      findings.push({
        code: "HIGH_RISK_MUTANT_SURVIVED",
        message: `${metrics.high_risk_survivors.length} high-risk mutant(s) survived`,
        detail: metrics.high_risk_survivors,
      });
    }
    if (metrics.high_risk_no_coverage.length > 0) {
      findings.push({
        code: "HIGH_RISK_MUTANT_NO_COVERAGE",
        message: `${metrics.high_risk_no_coverage.length} high-risk mutant(s) had no coverage`,
        detail: metrics.high_risk_no_coverage,
      });
    }

    const minimum = 90;
    if (metrics.score !== null && metrics.score < minimum) {
      findings.push({
        code: "MUTATION_THRESHOLD",
        message: `Mutation score ${metrics.score.toFixed(2)}% is below ${minimum}%`,
      });
    }
  } catch (error) {
    findings.push({
      code: "MUTATION_REPORT_MISSING",
      message: `Stryker report is missing or malformed: ${String(error)}`,
    });
  }
}

const result = makeResult(
  "mutation-gate",
  findings,
  {
    scope,
    comparison_base: comparisonBase ?? null,
    merge_base: mergeBase || null,
    change_inventory: inventory,
    selected_targets: candidates,
    required_tests: selection.requiredTests,
    target_reasons: selection.targetReasons,
    mode: flags.has("plan") ? "plan" : "execute",
    command,
    execution,
    score: metrics.score,
    counts: metrics.counts,
    survivors: metrics.survivors,
    no_coverage: metrics.no_coverage,
    compile_errors: {
      mutants: metrics.compile_errors,
      diagnostics: compileDiagnostics,
    },
    runtime_errors: metrics.runtime_errors,
    high_risk_survivors: metrics.high_risk_survivors,
    high_risk_no_coverage: metrics.high_risk_no_coverage,
  },
  flags.has("plan")
    ? `Mutation targets selected (${candidates.length}); execution not run`
    : findings.length === 0
      ? `Mutation PASS for ${candidates.length} target(s)`
      : `Mutation FAIL with ${findings.length} finding(s)`,
);
await finishCli(
  result,
  resolve(
    root,
    flagString(
      flags,
      "output",
      flags.has("plan")
        ? "artifacts/quality/mutation-plan.json"
        : "artifacts/quality/mutation.json",
    )!,
  ),
);
