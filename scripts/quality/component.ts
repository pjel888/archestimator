import { spawnSync } from "node:child_process";
import { readFile, readdir, unlink } from "node:fs/promises";
import { relative, resolve, sep } from "node:path";
import {
  finishCli,
  flagString,
  makeResult,
  parseArgs,
  qualityRoot,
  readJson,
  sha256,
  type QualityFinding,
} from "./common";
import {
  COMPONENT_PROFILES,
  combineVitestReports,
  compareComponentRatchet,
  evaluateRawGreenComponentRun,
  normalizeVitestFailures,
  partitionComponentPerformanceTests,
  selectStrictComponentTests,
  validateCanonicalBaselineArtifacts,
  validateComponentProfileSelection,
  type ComponentBaseline,
  type ComponentEvidenceMap,
  type ComponentProfile,
  type CoverageSummary,
  type VitestJsonReport,
} from "./component-core";

interface ClassificationArtifact {
  status: string;
  data?: {
    profile?: ComponentProfile;
    files?: string[];
    affected_capabilities?: string[];
  };
}

interface CriticalCapabilities {
  schema_version: 1;
  capabilities: Array<{ id: string; evidence_kinds: string[] }>;
}

interface VitestRun {
  command: string;
  exitCode: number | null;
  reportPath: string;
  coveragePath: string | null;
  stdout: string;
  stderr: string;
  report?: VitestJsonReport;
  coverage?: CoverageSummary;
}

function normalizedPath(path: string): string {
  return path.split(sep).join("/");
}

async function walk(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const path = resolve(directory, entry.name);
      return entry.isDirectory() ? walk(path) : [path];
    }),
  );
  return nested.flat();
}

async function availableComponentTests(root: string): Promise<string[]> {
  const testRoot = resolve(root, "tests/vitest");
  return (await walk(testRoot))
    .map((path) => normalizedPath(relative(root, path)))
    .filter((path) => /\/[^/]+\.test\.tsx?$/u.test(`/${path}`))
    .sort();
}

function normalizeCoverage(
  coverage: CoverageSummary,
  root: string,
): CoverageSummary {
  return Object.fromEntries(
    Object.entries(coverage).map(([path, metrics]) => {
      if (path === "total") return [path, metrics];
      return [normalizedPath(relative(root, resolve(path))), metrics];
    }),
  );
}

async function loadVitestRun(
  root: string,
  reportPath: string,
  coveragePath: string | null,
  args: string[],
): Promise<VitestRun> {
  for (const path of [reportPath, ...(coveragePath ? [coveragePath] : [])]) {
    try {
      await unlink(path);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }
  const run = spawnSync("bun", ["x", "vitest", "run", ...args], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 50 * 1024 * 1024,
    env: { ...process.env, FORCE_COLOR: "0" },
  });
  let report: VitestJsonReport | undefined;
  let coverage: CoverageSummary | undefined;
  try {
    report = await readJson<VitestJsonReport>(reportPath);
  } catch {
    // The caller records this as a fail-closed report finding.
  }
  if (coveragePath) {
    try {
      coverage = normalizeCoverage(await readJson<CoverageSummary>(coveragePath), root);
    } catch {
      // The caller records this as a fail-closed coverage finding.
    }
  }
  return {
    command: ["bun", "x", "vitest", "run", ...args].join(" "),
    exitCode: run.status,
    reportPath: normalizedPath(relative(root, reportPath)),
    coveragePath: coveragePath ? normalizedPath(relative(root, coveragePath)) : null,
    stdout: run.stdout,
    stderr: run.stderr,
    report,
    coverage,
  };
}

async function executeVitest(
  root: string,
  name: "strict" | "strict-performance" | "full" | "full-performance",
  tests: string[],
  reportOnFailure: boolean,
  coverageEnabled = true,
): Promise<VitestRun> {
  const reportPath = resolve(root, `artifacts/quality/component-${name}.vitest.json`);
  const coverageDirectory = coverageEnabled
    ? resolve(root, name === "full" ? "artifacts/coverage/component" : "artifacts/coverage/component-strict")
    : null;
  const coveragePath = coverageDirectory
    ? resolve(coverageDirectory, "coverage-summary.json")
    : null;
  const args = [
    ...tests,
    "--maxWorkers=1",
    ...(coverageDirectory
      ? [
          "--coverage",
          ...(reportOnFailure ? ["--coverage.reportOnFailure=true"] : []),
          "--coverage.reporter=json-summary",
          "--coverage.reporter=lcov",
          `--coverage.reportsDirectory=${coverageDirectory}`,
        ]
      : []),
    "--reporter=json",
    `--outputFile=${reportPath}`,
  ];
  return loadVitestRun(root, reportPath, coveragePath, args);
}

function requireRunArtifacts(
  run: VitestRun,
  findings: QualityFinding[],
  coverageRequired = true,
): void {
  if (!run.report) {
    findings.push({
      code: "COMPONENT_REPORT_MISSING",
      message: `${run.reportPath} was not produced or is malformed`,
      path: run.reportPath,
    });
  }
  if (coverageRequired && !run.coverage) {
    findings.push({
      code: "COMPONENT_COVERAGE_MISSING",
      message: `${String(run.coveragePath)} was not produced or is malformed`,
      path: run.coveragePath ?? undefined,
    });
  }
}

const { flags } = parseArgs();
const root = qualityRoot();
const output = resolve(
  root,
  flagString(flags, "output", "artifacts/quality/component.json")!,
);
const evidenceMapPath = resolve(
  root,
  flagString(flags, "evidence-map", "quality/component-evidence-map.json")!,
);
const baselinePath = resolve(
  root,
  flagString(flags, "baseline", "quality/baseline.json")!,
);
const classificationPath = resolve(
  root,
  flagString(flags, "classification", "artifacts/quality/classification.json")!,
);
const findings: QualityFinding[] = [];
let classification: ClassificationArtifact | undefined;
let profile = flagString(flags, "profile") as ComponentProfile | undefined;

try {
  classification = await readJson<ClassificationArtifact>(classificationPath);
} catch (error) {
  findings.push({
    code: "COMPONENT_CLASSIFICATION_MISSING",
    message: `Component gate requires a valid classification artifact: ${String(error)}`,
    path: normalizedPath(relative(root, classificationPath)),
  });
}

profile ??= classification?.data?.profile;
if (!profile || !COMPONENT_PROFILES.includes(profile)) {
  findings.push({
    code: "COMPONENT_PROFILE_INVALID",
    message: `Component gate requires Q1, Q2, or Q3; received ${String(profile)}`,
  });
}
if (classification && classification.status !== "PASS") {
  findings.push({
    code: "COMPONENT_CLASSIFICATION_NOT_GREEN",
    message: "Component gate refuses a non-passing classification artifact",
  });
}
findings.push(
  ...validateComponentProfileSelection(profile, classification?.data?.profile),
);

let evidenceMap: ComponentEvidenceMap | undefined;
try {
  evidenceMap = await readJson<ComponentEvidenceMap>(evidenceMapPath);
  if (
    evidenceMap.schema_version !== 1 ||
    !Array.isArray(evidenceMap.component_scope_patterns) ||
    !Array.isArray(evidenceMap.affected_rules) ||
    !evidenceMap.critical_capabilities ||
    typeof evidenceMap.critical_capabilities !== "object"
  ) {
    throw new Error("unsupported or incomplete evidence-map schema");
  }
} catch (error) {
  findings.push({
    code: "COMPONENT_EVIDENCE_MAP_MALFORMED",
    message: `Component evidence map is missing or malformed: ${String(error)}`,
    path: normalizedPath(relative(root, evidenceMapPath)),
  });
}

const availableTests = await availableComponentTests(root);
let componentCapabilities: string[] = [];
try {
  const capabilities = await readJson<CriticalCapabilities>(
    resolve(root, "quality/critical-capabilities.json"),
  );
  componentCapabilities = capabilities.capabilities
    .filter((capability) => capability.evidence_kinds.includes("component"))
    .map((capability) => capability.id)
    .sort();
} catch (error) {
  findings.push({
    code: "COMPONENT_CAPABILITY_REGISTRY_MALFORMED",
    message: `Critical capability registry is missing or malformed: ${String(error)}`,
  });
}
let strictTests: string[] = [];
let componentFiles: string[] = [];
if (profile !== "Q3_RELEASE_GATE" && evidenceMap) {
  const selected = selectStrictComponentTests(
    classification?.data?.files ?? [],
    componentCapabilities,
    availableTests,
    evidenceMap,
  );
  findings.push(...selected.findings);
  strictTests = selected.tests;
  componentFiles = selected.componentFiles;
  if (strictTests.length === 0) {
    findings.push({
      code: "COMPONENT_STRICT_TESTS_EMPTY",
      message: "Q1/Q2 component gate selected no affected or critical test files",
    });
  }
}

const runs: VitestRun[] = [];
if (findings.length === 0 && profile !== "Q3_RELEASE_GATE") {
  const strictPartition = partitionComponentPerformanceTests(strictTests);
  const strictSpecs = [
    {
      name: "strict-performance" as const,
      tests: strictPartition.performance,
      coverageEnabled: false,
      failureCode: "COMPONENT_STRICT_PERFORMANCE_COMMAND_FAILED",
    },
    {
      name: "strict" as const,
      tests: strictPartition.functional,
      coverageEnabled: true,
      failureCode: "COMPONENT_STRICT_COMMAND_FAILED",
    },
  ];
  for (const spec of strictSpecs) {
    if (spec.tests.length === 0) continue;
    const run = await executeVitest(root, spec.name, spec.tests, true, spec.coverageEnabled);
    runs.push(run);
    requireRunArtifacts(run, findings, spec.coverageEnabled);
    if (run.report) findings.push(...evaluateRawGreenComponentRun(run.report, root));
    if (run.exitCode !== 0) {
      findings.push({
        code: spec.failureCode,
        message: `${spec.name} component command exited ${String(run.exitCode)}`,
      });
    }
  }
}

if (findings.length === 0) {
  const fullPartition = partitionComponentPerformanceTests(availableTests);
  const fullPerformance = fullPartition.performance.length > 0
    ? await executeVitest(root, "full-performance", fullPartition.performance, false, false)
    : null;
  const full = await executeVitest(
    root,
    "full",
    fullPartition.functional,
    profile !== "Q3_RELEASE_GATE",
  );
  if (fullPerformance) {
    runs.push(fullPerformance);
    requireRunArtifacts(fullPerformance, findings, false);
  }
  runs.push(full);
  requireRunArtifacts(full, findings);
  const fullReports = [fullPerformance?.report, full.report].filter(
    (report): report is VitestJsonReport => Boolean(report),
  );
  const combinedFullReport = fullReports.length === (fullPerformance ? 2 : 1)
    ? combineVitestReports(fullReports)
    : undefined;
  if (combinedFullReport && full.coverage) {
    if (profile === "Q3_RELEASE_GATE") {
      findings.push(...evaluateRawGreenComponentRun(combinedFullReport, root));
      if (fullPerformance && fullPerformance.exitCode !== 0) {
        findings.push({
          code: "COMPONENT_RELEASE_PERFORMANCE_COMMAND_FAILED",
          message: `Release performance command exited ${String(fullPerformance.exitCode)}`,
        });
      }
      if (full.exitCode !== 0) {
        findings.push({
          code: "COMPONENT_RELEASE_COMMAND_FAILED",
          message: `Release component command exited ${String(full.exitCode)}`,
        });
      }
    } else {
      let baseline: ComponentBaseline | undefined;
      try {
        baseline = await readJson<ComponentBaseline>(baselinePath);
      } catch (error) {
        findings.push({
          code: "COMPONENT_BASELINE_MISSING",
          message: `Q1/Q2 full-suite ratchet requires an admitted baseline: ${String(error)}`,
          path: normalizedPath(relative(root, baselinePath)),
        });
      }
      if (baseline) {
        const ratchetFindings = compareComponentRatchet(
          combinedFullReport,
          full.coverage,
          baseline,
          root,
        );
        findings.push(...ratchetFindings);
        if (!ratchetFindings.some((finding) => finding.code.startsWith("COMPONENT_BASELINE_"))) {
          findings.push(...await validateCanonicalBaselineArtifacts(root, baseline));
        }
      }
    }
  }
}

const runData = await Promise.all(
  runs.map(async (run) => ({
    command: run.command,
    exit_code: run.exitCode,
    report: run.reportPath,
    coverage: run.coveragePath,
    report_sha256: run.report ? sha256(await readFile(resolve(root, run.reportPath))) : null,
    coverage_sha256: run.coverage && run.coveragePath
      ? sha256(await readFile(resolve(root, run.coveragePath)))
      : null,
    counts: run.report
      ? {
          total: run.report.numTotalTests ?? 0,
          failed: run.report.numFailedTests ?? 0,
          skipped: run.report.numPendingTests ?? 0,
          leaf_failures: normalizeVitestFailures(run.report, root).failures.length,
        }
      : null,
    stdout_tail: run.stdout.slice(-4000),
    stderr_tail: run.stderr.slice(-4000),
  })),
);

const result = makeResult(
  "component-gate",
  findings,
  {
    profile: profile ?? null,
    lanes:
      profile === "Q3_RELEASE_GATE"
        ? ["raw-full-suite", "isolated-performance"]
        : ["strict-affected-and-critical", "full-suite-ratchet", "isolated-performance"],
    component_files: componentFiles,
    strict_tests: strictTests,
    available_test_files: availableTests.length,
    baseline: normalizedPath(relative(root, baselinePath)),
    runs: runData,
  },
  findings.length === 0
    ? `${profile} component gate passed`
    : `${profile ?? "unknown"} component gate failed with ${findings.length} finding(s)`,
);
await finishCli(result, output);
