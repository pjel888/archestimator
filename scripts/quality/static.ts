import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  finishCli,
  flagString,
  makeResult,
  parseArgs,
  qualityRoot,
  readJson,
  type QualityFinding,
} from "./common";
import { classifyFiles, type RiskMap } from "./classifier-core";
import {
  addUntrackedFile,
  isBusinessSourcePath,
  isExecutablePath,
  parseZeroContextDiff,
  toChangedFiles,
} from "./static-diff-core";
import {
  compareKnipBaseline,
  normalizeKnipIssues,
  validateKnipBaseline,
  type KnipBaseline,
  type KnipIssueIdentity,
  type KnipJson,
} from "./static-knip-core";
import {
  analyzeChangedFunctions,
  detectAddedDuplicateBusinessBlocks,
  scanAddedSourceDebt,
  type ChangedSource,
  type StaticThresholds,
} from "./static-source-core";
import {
  comparisonBaseFromFlags,
  type ComparisonBase,
} from "./comparison-base-core";

interface StaticThresholdFile {
  static: StaticThresholds & {
    eslint_max_warnings: number;
    maximum_new_knip_issues: number;
  };
}

interface CommandResult {
  command: string;
  exit_code: number | null;
  duration_ms: number;
  stdout: string;
  stderr: string;
}

const { flags } = parseArgs();
const root = qualityRoot();
const findings: QualityFinding[] = [];
const commandResults: CommandResult[] = [];
let comparisonBase: ComparisonBase | undefined;
try {
  comparisonBase = await comparisonBaseFromFlags({ root, flags });
} catch (error) {
  findings.push({ code: "STATIC_COMPARISON_BASE", message: String(error) });
}
const thresholds = await readJson<StaticThresholdFile>(
  resolve(root, flagString(flags, "thresholds", "quality/thresholds.json")!),
);
const staticThresholds = thresholds.static;
const baseline = await readJson<KnipBaseline>(
  resolve(
    root,
    flagString(flags, "baseline", "quality/static-debt-baseline.json")!,
  ),
);
findings.push(...validateKnipBaseline(baseline));
const riskMap = await readJson<RiskMap>(resolve(root, "quality/risk-map.json"));
const plannedCommands = [
  "bun run type-check",
  "eslint --max-warnings=0 <changed executable scope>",
  "knip --reporter json <static issue types>",
];

function runCommand(
  command: string,
  args: string[],
  options: { environment?: Record<string, string>; timeout?: number } = {},
): ReturnType<typeof spawnSync> {
  const started = performance.now();
  const run = spawnSync(command, args, {
    cwd: root,
    encoding: "utf8",
    timeout: options.timeout ?? 15 * 60_000,
    maxBuffer: 30 * 1024 * 1024,
    env: { ...process.env, ...options.environment },
  });
  commandResults.push({
    command: `${command} ${args.join(" ")}`,
    exit_code: run.status,
    duration_ms: Math.round(performance.now() - started),
    stdout: run.stdout?.slice(-20_000) ?? "",
    stderr: run.stderr?.slice(-20_000) ?? "",
  });
  return run;
}

async function deriveChangedScope(baseSha: string): Promise<{
  files: ReturnType<typeof toChangedFiles>;
  mergeBase?: string;
}> {
  const mergeBase = baseSha;
  const diffRun = runCommand("git", [
    "diff",
    "--no-renames",
    "--unified=0",
    "--diff-filter=ACDMRTUXB",
    mergeBase,
  ]);
  const untrackedRun = runCommand("git", [
    "ls-files",
    "--others",
    "--exclude-standard",
  ]);
  if (diffRun.status !== 0 || untrackedRun.status !== 0) {
    findings.push({
      code: "STATIC_DIFF_SCOPE",
      message: "Cannot derive complete merge-base-to-worktree static scope",
    });
    return { files: [], mergeBase };
  }
  const changed = parseZeroContextDiff(diffRun.stdout ?? "");
  const untracked = new Set(
    (untrackedRun.stdout ?? "").split(/\r?\n/u).filter(Boolean),
  );
  for (const path of untracked) {
    try {
      addUntrackedFile(changed, path, await readFile(resolve(root, path), "utf8"));
    } catch (error) {
      findings.push({
        code: "STATIC_CHANGED_FILE_UNREADABLE",
        message: `Cannot read changed file ${path}: ${String(error)}`,
        path,
      });
    }
  }
  return { files: toChangedFiles(changed, untracked), mergeBase };
}

async function readChangedSources(
  changedFiles: ReturnType<typeof toChangedFiles>,
): Promise<ChangedSource[]> {
  const sources: ChangedSource[] = [];
  for (const file of changedFiles.filter((candidate) => isExecutablePath(candidate.path))) {
    try {
      sources.push({
        path: file.path,
        text: await readFile(resolve(root, file.path), "utf8"),
        added_lines: file.added_lines,
        critical:
          classifyFiles([file.path], riskMap).classification.profile !==
          "Q1_CHANGE_GATE",
      });
    } catch (error) {
      findings.push({
        code: "STATIC_SOURCE_UNREADABLE",
        message: `Cannot read ${file.path}: ${String(error)}`,
        path: file.path,
      });
    }
  }
  return sources;
}

async function readBusinessSources(): Promise<Array<{ path: string; text: string }>> {
  const tracked = runCommand("git", ["ls-files", "src"]);
  if (tracked.status !== 0) {
    findings.push({
      code: "STATIC_BUSINESS_SCOPE",
      message: "Cannot enumerate business source files for duplicate analysis",
    });
    return [];
  }
  const paths = (tracked.stdout ?? "")
    .split(/\r?\n/u)
    .filter(isBusinessSourcePath);
  const sources = await Promise.all(
    paths.map(async (path) => {
      try {
        return { path, text: await readFile(resolve(root, path), "utf8") };
      } catch (error) {
        if (error instanceof Error && "code" in error && error.code === "ENOENT") {
          return null;
        }
        throw error;
      }
    }),
  );
  return sources.filter((source): source is { path: string; text: string } => source !== null);
}

function evaluateCommand(
  run: ReturnType<typeof spawnSync>,
  command: string,
): void {
  if (run.status !== 0) {
    findings.push({
      code: "STATIC_COMMAND_FAILED",
      message: `${command} exited ${run.status}`,
      detail: {
        stdout: run.stdout?.slice(-4_000) ?? "",
        stderr: run.stderr?.slice(-4_000) ?? "",
      },
    });
  }
}

const changedScope = comparisonBase
  ? await deriveChangedScope(comparisonBase.resolved_sha)
  : { files: [], mergeBase: undefined };
const changedSources = await readChangedSources(changedScope.files);
const executablePaths = changedScope.files
  .map((file) => file.path)
  .filter(isExecutablePath);

if (!flags.has("plan")) {
  evaluateCommand(runCommand("bun", ["run", "type-check"]), "bun run type-check");
  if (executablePaths.length > 0) {
    evaluateCommand(
      runCommand("bunx", [
        "eslint",
        `--max-warnings=${staticThresholds.eslint_max_warnings}`,
        ...executablePaths,
      ]),
      "changed-scope ESLint",
    );
  } else {
    findings.push({
      code: "STATIC_EXECUTABLE_SCOPE_EMPTY",
      message: "No changed executable scope was available for ESLint",
    });
  }

  const knipRun = runCommand(
    "bunx",
    [
      "knip",
      "--reporter",
      "json",
      "--no-progress",
      "--no-config-hints",
      "--include",
      [
        "files",
        "dependencies",
        "unlisted",
        "unresolved",
        "exports",
        "nsExports",
        "types",
        "nsTypes",
        "enumMembers",
        "namespaceMembers",
        "duplicates",
        "cycles",
      ].join(","),
    ],
  );
  if (knipRun.status === null || knipRun.status > 1) {
    findings.push({
      code: "KNIP_COLLECTION_FAILED",
      message: `Knip collection exited unexpectedly with ${knipRun.status}`,
      detail: { stderr: knipRun.stderr?.slice(-4_000) ?? "" },
    });
  }
  let measuredKnip: KnipIssueIdentity[] = [];
  try {
    const payload = JSON.parse(knipRun.stdout ?? "") as KnipJson;
    if (!Array.isArray(payload.issues)) throw new Error("issues array is missing");
    measuredKnip = normalizeKnipIssues(payload);
    findings.push(
      ...compareKnipBaseline(
        measuredKnip,
        baseline.measured_legacy_issues,
        staticThresholds.maximum_new_knip_issues,
      ).findings,
    );
  } catch (error) {
    findings.push({
      code: "KNIP_COLLECTION_FAILED",
      message: `Knip output is missing or malformed: ${String(error)}`,
      detail: {
        exit_code: knipRun.status,
        stderr: knipRun.stderr?.slice(-4_000) ?? "",
      },
    });
  }

  findings.push(
    ...scanAddedSourceDebt(changedSources, staticThresholds.maximum_new_source_debt),
  );
  const functionAnalysis = analyzeChangedFunctions(changedSources, staticThresholds);
  findings.push(...functionAnalysis.findings);
  const changedBusinessSources = changedSources.filter((source) =>
    isBusinessSourcePath(source.path),
  );
  const allBusinessSources = [
    ...new Map(
      [...await readBusinessSources(), ...changedBusinessSources].map((source) => [
        source.path,
        { path: source.path, text: source.text },
      ]),
    ).values(),
  ];
  findings.push(
    ...detectAddedDuplicateBusinessBlocks(
      allBusinessSources,
      changedBusinessSources,
      staticThresholds,
    ),
  );

  const result = makeResult(
    "quality-static",
    findings,
    {
      mode: "execute",
      comparison_base: comparisonBase ?? null,
      merge_base: changedScope.mergeBase,
      changed_files: changedScope.files.map((file) => file.path),
      eslint_files: executablePaths,
      commands: commandResults,
      knip: {
        baseline_count: baseline.measured_legacy_issues.length,
        measured_count: measuredKnip.length,
      },
      complexity: functionAnalysis,
    },
    findings.length === 0
      ? `Static checks PASS for ${executablePaths.length} changed executable file(s)`
      : `Static checks FAIL with ${findings.length} finding(s)`,
  );
  await finishCli(
    result,
    resolve(root, flagString(flags, "output", "artifacts/quality/static.json")!),
  );
}

await finishCli(
  makeResult(
    "quality-static",
    findings,
    {
      mode: "plan",
      comparison_base: comparisonBase ?? null,
      merge_base: changedScope.mergeBase,
      changed_files: changedScope.files.map((file) => file.path),
      commands: plannedCommands,
    },
    "Static commands selected; evidence not executed",
    "QUALITY_BLOCKED",
  ),
  resolve(root, flagString(flags, "output", "artifacts/quality/static.json")!),
);
