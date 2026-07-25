import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import {
  finishCli,
  flagString,
  makeResult,
  parseArgs,
  qualityRoot,
  readJson,
  type QualityFinding,
} from "./common";
import type { QualityProfile } from "./classifier-core";
import {
  compareGlobalCoverageRatchet,
  evaluateDiffCoverage,
  parseAddedLines,
  parseLcov,
} from "./diff-coverage-core";

const { flags } = parseArgs();
const root = qualityRoot();
const findings: QualityFinding[] = [];
const output = resolve(
  root,
  flagString(flags, "output", "artifacts/quality/diff-coverage.json")!,
);
let profile = flagString(flags, "profile") as QualityProfile | undefined;
const classificationPath = flagString(
  flags,
  "classification",
  "artifacts/quality/classification.json",
);
if (!profile && classificationPath) {
  try {
    profile = (
      await readJson<{ data: { profile: QualityProfile } }>(resolve(root, classificationPath))
    ).data.profile;
  } catch (error) {
    findings.push({
      code: "CLASSIFICATION_MALFORMED",
      message: `Classification is missing or malformed: ${String(error)}`,
    });
  }
}
if (!profile) findings.push({ code: "PROFILE_REQUIRED", message: "Selected profile is required" });

const lcovPath = flagString(flags, "lcov");
const diffPath = flagString(flags, "diff");
let lcov = "";
let diff = "";
try {
  const lcovPaths = lcovPath
    ? lcovPath.split(",")
    : [
        "artifacts/coverage/unit/lcov.info",
        "artifacts/coverage/component/lcov.info",
        "artifacts/coverage/workers/lcov.info",
        "coverage/lcov.info",
      ];
  const reports = [];
  for (const path of lcovPaths) {
    try {
      reports.push(await readFile(resolve(root, path), "utf8"));
    } catch {
      // Multiple runners may share or omit conventional paths; at least one is mandatory.
    }
  }
  if (reports.length === 0) throw new Error("no LCOV report found at conventional paths");
  lcov = reports.join("\n");
} catch (error) {
  findings.push({ code: "LCOV_MISSING", message: `LCOV is missing or malformed: ${String(error)}` });
}
try {
  if (diffPath) {
    diff = await readFile(resolve(root, diffPath), "utf8");
  } else {
    const base = flagString(flags, "base", "main")!;
    const mergeBase = spawnSync("git", ["merge-base", base, "HEAD"], {
      cwd: root,
      encoding: "utf8",
    });
    if (mergeBase.status !== 0 || !mergeBase.stdout.trim()) {
      throw new Error(`cannot resolve merge base for ${base}`);
    }
    const generated = spawnSync("git", ["diff", "--unified=0", mergeBase.stdout.trim()], {
      cwd: root,
      encoding: "utf8",
      maxBuffer: 30 * 1024 * 1024,
    });
    if (generated.status !== 0) throw new Error("cannot generate merge-base diff");
    diff = generated.stdout;
  }
} catch (error) {
  findings.push({ code: "DIFF_MISSING", message: `Diff is missing or malformed: ${String(error)}` });
}

const thresholds = await readJson<{
  changed_coverage: Record<
    QualityProfile,
    { statements: number; lines: number; functions: number; branches: number }
  >;
  global_ratchet: {
    baseline_required: boolean;
    baseline_path: string;
    baseline_status: "PENDING" | "ADMITTED";
  };
}>(resolve(root, flagString(flags, "thresholds", "quality/thresholds.json")!));
let metrics = {
  changed_lines: 0,
  covered_lines: 0,
  line_percent: 0,
  changed_branches: 0,
  covered_branches: 0,
  branch_percent: 0,
  changed_functions: 0,
  covered_functions: 0,
  function_percent: 0,
  statement_percent: 0,
};
if (lcov && diff && profile && thresholds.changed_coverage[profile]) {
  const evaluation = evaluateDiffCoverage(
    parseLcov(lcov),
    parseAddedLines(diff),
    thresholds.changed_coverage[profile],
  );
  findings.push(...evaluation.findings);
  metrics = evaluation.metrics;
}

const baselinePath = flagString(
  flags,
  "baseline",
  flagString(flags, "baseline-summary", thresholds.global_ratchet.baseline_path),
);
const currentPath = flagString(
  flags,
  "current-summary",
  "artifacts/coverage/component/coverage-summary.json",
);
if (thresholds.global_ratchet.baseline_required) {
  try {
    if (thresholds.global_ratchet.baseline_status !== "ADMITTED") {
      throw new Error(
        `canonical baseline status is ${thresholds.global_ratchet.baseline_status}`,
      );
    }
    if (!baselinePath || !currentPath) throw new Error("both coverage paths are required");
    const baseline = await readJson<unknown>(resolve(root, baselinePath));
    const current = await readJson<unknown>(resolve(root, currentPath));
    findings.push(...compareGlobalCoverageRatchet(baseline, current));
  } catch (error) {
    findings.push({
      code: "GLOBAL_BASELINE_UNAVAILABLE",
      message: `Global coverage ratchet cannot run: ${String(error)}`,
    });
  }
}

const result = makeResult(
  "diff-coverage",
  findings,
  {
    profile: profile ?? null,
    baseline: baselinePath ?? null,
    current_summary: currentPath ?? null,
    ...metrics,
  },
  findings.length === 0
    ? `Diff coverage PASS: ${metrics.line_percent.toFixed(2)}% lines, ${metrics.branch_percent.toFixed(2)}% branches`
    : `Diff coverage FAIL with ${findings.length} finding(s)`,
);
await finishCli(result, output);
