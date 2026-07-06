#!/usr/bin/env bun

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

type Artifact<T extends Record<string, unknown> = Record<string, unknown>> = {
  path: string;
  present: boolean;
  generatedAt: string | null;
  value: T | null;
  parseError: string | null;
};

export type CurrentGitState = {
  available: boolean;
  commit: string | null;
  committedAt: string | null;
  subject: string | null;
  statusPaths: string[];
  dirtyRuntimeSourcePaths: string[];
  workingTreeCleanForRuntimeSourcePaths: boolean;
  errors: string[];
};

export type LatestDeploySourceSmokeReport = {
  generatedAt: string;
  mode: "cloudflare-latest-deploy-source-smoke";
  sources: {
    deployEvidence: string;
    runtimeSourceStatusPaths: string[];
  };
  artifacts: {
    deployEvidence: {
      present: boolean;
      generatedAt: string | null;
      parseError: string | null;
    };
  };
  currentGit: CurrentGitState;
  deployment: {
    worker: string | null;
    productionVersionId: string | null;
    productionVersionNumber: number | null;
    trafficPercent: number | null;
    deployedAt: string | null;
    deployedSourceCommit: string | null;
    sourceCommitMatchesCurrentGit: boolean;
    deployedAtIsNotOlderThanCurrentCommit: boolean;
  };
  smoke: {
    hostedRouteProofReady: boolean;
    releaseGatesReady: boolean;
  };
  readiness: {
    latestDeploySourceSmokeReady: boolean;
  };
  blockers: string[];
  note: string;
};

export type DeploySourceSmokeTemplate = {
  generatedAt: string;
  mode: "cloudflare-latest-deploy-source-smoke-template";
  boundary: {
    purpose: string;
    forbiddenMaterials: string[];
    allowedEvidence: string[];
  };
  source: {
    gitCommit: string | null;
    committedAt: string | null;
    subject: string | null;
    runtimeSourceStatusPaths: string[];
    workingTreeCleanForRuntimeSourcePaths: boolean;
    dirtyRuntimeSourcePaths: string[];
  };
  worker: string | null;
  productionVersion: {
    id: string | null;
    number: number | null;
    trafficPercent: number | null;
    deployedAt: string | null;
  };
  hostedRouteProof: {
    command: string;
    passed: boolean;
    routeContractReady: boolean;
    hostedRouteProofReady: boolean;
    blockers: string[];
  };
  releaseGates: {
    command: string;
    productionCutoverReady: boolean;
    blockers: string[];
  };
  operatorInstructions: string[];
  note: string;
};

const PLAN_ROOT = ".ai/03_plans/2026-06-29-Cloudflare-Migration-Codex";
const EVIDENCE_ROOT = `${PLAN_ROOT}/evidence`;
const DEFAULT_DEPLOY_EVIDENCE_FILE = `${EVIDENCE_ROOT}/2026-07-02-cloudflare-main-worker-current-source-deploy.json`;
const DEFAULT_OUTPUT_FILE = `${EVIDENCE_ROOT}/2026-07-03-cloudflare-latest-deploy-source-smoke.json`;
const DEFAULT_MARKDOWN_FILE = `${EVIDENCE_ROOT}/2026-07-03-cloudflare-latest-deploy-source-smoke.md`;
const DEFAULT_TEMPLATE_FILE = `${EVIDENCE_ROOT}/2026-07-03-cloudflare-latest-deploy-source-smoke.template.json`;
export const DEFAULT_RUNTIME_SOURCE_STATUS_PATHS = [
  "src",
  "worker.ts",
  "package.json",
  "bun.lock",
  "wrangler.jsonc",
  "cloudflare-env.d.ts",
  "next.config.ts",
  "open-next.config.ts",
  "src/proxy.ts",
];

const PROOF_ONLY_PACKAGE_SCRIPT_KEYS = [
  "cf:check-latest-deploy-source-smoke",
  "cf:latest-deploy-source-smoke-template",
  "cf:provider-exit-pack",
  "cf:provider-exit-operator-template",
] as const;

const NOTE =
  "Non-destructive latest deploy/source-smoke evidence check. This script reads sanitized deployment evidence and local git metadata only. It does not read .env files, print secrets, deploy Workers, change DNS, rotate secrets, cancel providers, mutate data, or prove browser/manual/provider-exit gates.";

function readEnv(name: string) {
  const value = process.env[name];
  return value?.trim() || undefined;
}

function envFlag(name: string) {
  const value = readEnv(name)?.toLowerCase();
  return value === "1" || value === "true" || value === "yes";
}

function normalizeParseError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const normalized = message.replace(/\s+/g, " ").trim();
  return normalized.length > 0 ? normalized.slice(0, 240) : "JSON parse failed";
}

export function readJsonArtifact<T extends Record<string, unknown>>(path: string): Artifact<T> {
  if (!existsSync(path)) {
    return { path, present: false, generatedAt: null, value: null, parseError: null };
  }

  try {
    const value = JSON.parse(readFileSync(path, "utf8")) as T;
    return {
      path,
      present: true,
      generatedAt: typeof value.generatedAt === "string" ? value.generatedAt : null,
      value,
      parseError: null,
    };
  } catch (error) {
    return {
      path,
      present: true,
      generatedAt: null,
      value: null,
      parseError: normalizeParseError(error),
    };
  }
}

function getPath(value: unknown, path: Array<string | number>): unknown {
  let current = value;
  for (const segment of path) {
    if (current === null || current === undefined) return undefined;
    if (typeof segment === "number") {
      if (!Array.isArray(current)) return undefined;
      current = current[segment];
      continue;
    }
    if (typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}

function stringAt(value: unknown, path: Array<string | number>) {
  const candidate = getPath(value, path);
  if (typeof candidate !== "string") return null;
  const trimmed = candidate.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function numberAt(value: unknown, path: Array<string | number>) {
  const candidate = getPath(value, path);
  return typeof candidate === "number" && Number.isFinite(candidate) ? candidate : null;
}

function stringArrayAt(value: unknown, path: Array<string | number>) {
  const candidate = getPath(value, path);
  return Array.isArray(candidate) ? candidate.filter((item): item is string => typeof item === "string") : [];
}

function boolAt(value: unknown, path: Array<string | number>) {
  return getPath(value, path) === true;
}

function runGit(args: string[]) {
  const result = spawnSync("git", args, {
    encoding: "utf8",
    timeout: 10_000,
    maxBuffer: 1024 * 1024,
  });

  return {
    ok: result.status === 0,
    stdout: result.stdout.trim(),
    stderr: result.stderr.trim(),
    signal: result.signal,
    error: result.error,
  };
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value === null || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => [key, stableValue(item)]),
  );
}

function withoutProofOnlyPackageScripts(packageJson: Record<string, unknown>) {
  const next = JSON.parse(JSON.stringify(packageJson)) as Record<string, unknown>;
  if (next.scripts && typeof next.scripts === "object" && !Array.isArray(next.scripts)) {
    const scripts = next.scripts as Record<string, unknown>;
    for (const key of PROOF_ONLY_PACKAGE_SCRIPT_KEYS) {
      delete scripts[key];
    }
  }
  return next;
}

export function packageJsonChangeTouchesRuntime(basePackageJson: string, nextPackageJson: string) {
  let base: Record<string, unknown>;
  let next: Record<string, unknown>;
  try {
    base = JSON.parse(basePackageJson) as Record<string, unknown>;
    next = JSON.parse(nextPackageJson) as Record<string, unknown>;
  } catch {
    return true;
  }

  return JSON.stringify(stableValue(withoutProofOnlyPackageScripts(base)))
    !== JSON.stringify(stableValue(withoutProofOnlyPackageScripts(next)));
}

function porcelainPath(entry: string) {
  let path: string;
  if (entry.length > 2 && entry[2] === " ") {
    path = entry.slice(3).trim();
  } else if (entry.length > 1 && entry[1] === " ") {
    path = entry.slice(2).trim();
  } else {
    path = entry.replace(/^[ MADRCU?!]{1,2}\s+/, "").trim();
  }
  const renameSeparator = " -> ";
  return path.includes(renameSeparator) ? path.slice(path.lastIndexOf(renameSeparator) + renameSeparator.length) : path;
}

export function filterRuntimeDirtyStatusEntries(
  entries: string[],
  options: { packageJsonTouchesRuntime?: boolean } = {},
) {
  const packageJsonTouchesRuntime = options.packageJsonTouchesRuntime ?? true;
  return entries.filter((entry) => {
    if (porcelainPath(entry) === "package.json" && !packageJsonTouchesRuntime) return false;
    return true;
  });
}

function currentPackageJsonChangeTouchesRuntime() {
  const headPackageJson = runGit(["show", "HEAD:package.json"]);
  if (!headPackageJson.ok) return true;
  try {
    return packageJsonChangeTouchesRuntime(headPackageJson.stdout, readFileSync("package.json", "utf8"));
  } catch {
    return true;
  }
}

export function readCurrentGitState(
  statusPaths = DEFAULT_RUNTIME_SOURCE_STATUS_PATHS,
): CurrentGitState {
  const errors: string[] = [];
  const commitResult = runGit(["rev-parse", "HEAD"]);
  const commit = commitResult.ok ? commitResult.stdout : null;
  if (!commitResult.ok) {
    errors.push(`git rev-parse HEAD failed: ${commitResult.stderr || commitResult.error?.message || "unknown error"}`);
  }

  const showResult = runGit(["show", "-s", "--format=%cI%n%s", "HEAD"]);
  let committedAt: string | null = null;
  let subject: string | null = null;
  if (showResult.ok) {
    const [dateLine, ...subjectLines] = showResult.stdout.split(/\r?\n/);
    committedAt = dateLine?.trim() || null;
    subject = subjectLines.join("\n").trim() || null;
  } else {
    errors.push(`git show HEAD failed: ${showResult.stderr || showResult.error?.message || "unknown error"}`);
  }

  const statusResult = runGit(["status", "--porcelain=v1", "--", ...statusPaths]);
  const rawDirtyRuntimeSourcePaths = statusResult.ok
    ? statusResult.stdout
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
    : [];
  const packageJsonTouchesRuntime = rawDirtyRuntimeSourcePaths.some((entry) => porcelainPath(entry) === "package.json")
    ? currentPackageJsonChangeTouchesRuntime()
    : true;
  const dirtyRuntimeSourcePaths = filterRuntimeDirtyStatusEntries(rawDirtyRuntimeSourcePaths, {
    packageJsonTouchesRuntime,
  });
  if (!statusResult.ok) {
    errors.push(`git status failed: ${statusResult.stderr || statusResult.error?.message || "unknown error"}`);
  }

  return {
    available: errors.length === 0 && commit !== null && committedAt !== null,
    commit,
    committedAt,
    subject,
    statusPaths,
    dirtyRuntimeSourcePaths,
    workingTreeCleanForRuntimeSourcePaths: dirtyRuntimeSourcePaths.length === 0 && statusResult.ok,
    errors,
  };
}

function firstStringAt(value: unknown, paths: Array<Array<string | number>>) {
  for (const path of paths) {
    const candidate = stringAt(value, path);
    if (candidate !== null) return candidate;
  }
  return null;
}

function deployedSourceCommit(value: unknown) {
  return firstStringAt(value, [
    ["source", "gitCommit"],
    ["source", "commit"],
    ["source", "headCommit"],
    ["currentSource", "commit"],
    ["git", "commit"],
    ["commit"],
    ["sourceCommit"],
  ]);
}

function commitsMatch(left: string | null, right: string | null) {
  if (!left || !right) return false;
  const normalizedLeft = left.trim().toLowerCase();
  const normalizedRight = right.trim().toLowerCase();
  if (normalizedLeft.length < 7 || normalizedRight.length < 7) return false;
  return normalizedLeft.startsWith(normalizedRight) || normalizedRight.startsWith(normalizedLeft);
}

function dateIsNotOlderThan(left: string | null, right: string | null) {
  if (!left || !right) return false;
  const leftTime = Date.parse(left);
  const rightTime = Date.parse(right);
  if (!Number.isFinite(leftTime) || !Number.isFinite(rightTime)) return false;
  return leftTime >= rightTime;
}

function hostedRouteProofReady(value: unknown) {
  return boolAt(value, ["hostedRouteProof", "passed"])
    && boolAt(value, ["hostedRouteProof", "routeContractReady"])
    && boolAt(value, ["hostedRouteProof", "hostedRouteProofReady"])
    && stringArrayAt(value, ["hostedRouteProof", "blockers"]).length === 0;
}

function releaseGatesReady(value: unknown) {
  return boolAt(value, ["releaseGates", "productionCutoverReady"])
    && stringArrayAt(value, ["releaseGates", "blockers"]).length === 0;
}

export function buildLatestDeploySourceSmokeReport(params: {
  generatedAt?: string;
  deployEvidence?: Artifact;
  currentGit?: CurrentGitState;
} = {}): LatestDeploySourceSmokeReport {
  const generatedAt = params.generatedAt ?? new Date().toISOString();
  const deployEvidence = params.deployEvidence ?? readJsonArtifact(readEnv("DEPLOY_SOURCE_SMOKE_DEPLOY_EVIDENCE_FILE") ?? DEFAULT_DEPLOY_EVIDENCE_FILE);
  const currentGit = params.currentGit ?? readCurrentGitState();
  const deployArtifactUsable = deployEvidence.present && deployEvidence.parseError === null;
  const deployValue = deployEvidence.value;
  const deployCommit = deployedSourceCommit(deployValue);
  const deployedAt = firstStringAt(deployValue, [
    ["productionVersion", "deployedAt"],
    ["deployment", "deployedAt"],
    ["deployedAt"],
  ]);
  const sourceCommitMatchesCurrentGit = commitsMatch(deployCommit, currentGit.commit);
  const deployedAtIsNotOlderThanCurrentCommit = dateIsNotOlderThan(deployedAt, currentGit.committedAt);
  const deploymentReady = deployArtifactUsable
    && numberAt(deployValue, ["productionVersion", "trafficPercent"]) === 100
    && stringAt(deployValue, ["productionVersion", "id"]) !== null
    && deployedAt !== null;
  const hostedRoutesReady = deployArtifactUsable && hostedRouteProofReady(deployValue);
  const releaseReady = deployArtifactUsable && releaseGatesReady(deployValue);

  const blockers: string[] = [];
  if (!deployEvidence.present) {
    blockers.push("Latest deploy evidence artifact is missing.");
  }
  if (deployEvidence.parseError) {
    blockers.push("Deploy evidence artifact could not be parsed as JSON.");
  }
  if (!currentGit.available) {
    blockers.push("Current git commit metadata could not be read.");
  }
  if (!currentGit.workingTreeCleanForRuntimeSourcePaths) {
    blockers.push("Runtime source paths have uncommitted changes and cannot be claimed deployed.");
  }
  if (!deploymentReady) {
    blockers.push("Deploy evidence does not prove a 100% production Worker version with deployment time.");
  }
  if (!deployCommit) {
    blockers.push("Deploy evidence does not record the deployed git source commit.");
  }
  if (deployCommit && !sourceCommitMatchesCurrentGit) {
    blockers.push("Deployed git source commit does not match current HEAD.");
  }
  if (deployedAt && currentGit.committedAt && !deployedAtIsNotOlderThanCurrentCommit) {
    blockers.push("Deployment timestamp is older than the current git commit timestamp.");
  }
  if (!hostedRoutesReady) {
    blockers.push("Deploy evidence does not include a passing hosted route smoke.");
  }
  if (!releaseReady) {
    blockers.push("Deploy evidence does not include passing release gates after the deploy.");
  }

  return {
    generatedAt,
    mode: "cloudflare-latest-deploy-source-smoke",
    sources: {
      deployEvidence: deployEvidence.path,
      runtimeSourceStatusPaths: currentGit.statusPaths,
    },
    artifacts: {
      deployEvidence: {
        present: deployEvidence.present,
        generatedAt: deployEvidence.generatedAt,
        parseError: deployEvidence.parseError,
      },
    },
    currentGit,
    deployment: {
      worker: stringAt(deployValue, ["worker"]),
      productionVersionId: stringAt(deployValue, ["productionVersion", "id"]),
      productionVersionNumber: numberAt(deployValue, ["productionVersion", "number"]),
      trafficPercent: numberAt(deployValue, ["productionVersion", "trafficPercent"]),
      deployedAt,
      deployedSourceCommit: deployCommit,
      sourceCommitMatchesCurrentGit,
      deployedAtIsNotOlderThanCurrentCommit,
    },
    smoke: {
      hostedRouteProofReady: hostedRoutesReady,
      releaseGatesReady: releaseReady,
    },
    readiness: {
      latestDeploySourceSmokeReady: blockers.length === 0,
    },
    blockers,
    note: NOTE,
  };
}

export function buildDeploySourceSmokeTemplate(params: {
  generatedAt?: string;
  currentGit?: CurrentGitState;
} = {}): DeploySourceSmokeTemplate {
  const currentGit = params.currentGit ?? readCurrentGitState();

  return {
    generatedAt: params.generatedAt ?? new Date().toISOString(),
    mode: "cloudflare-latest-deploy-source-smoke-template",
    boundary: {
      purpose: "Starter artifact for sanitized post-deploy source and smoke evidence. Fill it only after deploying or promoting the current source and rerunning hosted-route and release-gate checks.",
      forbiddenMaterials: [
        "raw cookies",
        "session tokens",
        "OAuth credentials",
        "API keys",
        "environment file contents",
        "database dumps",
        "raw provider logs",
      ],
      allowedEvidence: [
        "git commit hash",
        "Worker name",
        "Cloudflare Worker production version id",
        "Cloudflare Worker production version number",
        "production traffic percentage",
        "deployment timestamp",
        "sanitized hosted-route proof summary",
        "sanitized release-gate proof summary",
      ],
    },
    source: {
      gitCommit: currentGit.commit,
      committedAt: currentGit.committedAt,
      subject: currentGit.subject,
      runtimeSourceStatusPaths: currentGit.statusPaths,
      workingTreeCleanForRuntimeSourcePaths: currentGit.workingTreeCleanForRuntimeSourcePaths,
      dirtyRuntimeSourcePaths: currentGit.dirtyRuntimeSourcePaths,
    },
    worker: null,
    productionVersion: {
      id: null,
      number: null,
      trafficPercent: null,
      deployedAt: null,
    },
    hostedRouteProof: {
      command: "bun run cf:verify-hosted-routes",
      passed: false,
      routeContractReady: false,
      hostedRouteProofReady: false,
      blockers: ["Replace this template section with sanitized post-deploy hosted-route proof."],
    },
    releaseGates: {
      command: "bun run cf:release-gates",
      productionCutoverReady: false,
      blockers: ["Replace this template section with sanitized post-deploy release-gate proof."],
    },
    operatorInstructions: [
      "Commit or otherwise settle deploy-relevant local source changes before deployment.",
      "Deploy or promote the source commit recorded at source.gitCommit.",
      "Record the resulting 100% production Worker version fields without copying provider secrets or raw logs.",
      "Rerun hosted-route and release-gate checks after deployment and paste only sanitized boolean/blocker summaries.",
      "Run bun run cf:check-latest-deploy-source-smoke against the completed evidence artifact.",
      "Do not treat this template as proof until latestDeploySourceSmokeReady=true with zero blockers.",
    ],
    note: NOTE,
  };
}

function writeJson(path: string, value: unknown) {
  const resolved = resolve(path);
  mkdirSync(dirname(resolved), { recursive: true });
  writeFileSync(resolved, `${JSON.stringify(value, null, 2)}\n`);
}

function checkMark(value: boolean) {
  return value ? "PASS" : "OPEN";
}

function tableCell(value: string) {
  return value.replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

export function renderMarkdown(report: LatestDeploySourceSmokeReport) {
  const blockerRows = report.blockers.length
    ? report.blockers.map((item) => `- ${item}`).join("\n")
    : "- none";
  const dirtyRows = report.currentGit.dirtyRuntimeSourcePaths.length
    ? report.currentGit.dirtyRuntimeSourcePaths.map((item) => `- \`${tableCell(item)}\``).join("\n")
    : "- none";

  return `# Cloudflare Latest Deploy Source Smoke

Status: **${report.readiness.latestDeploySourceSmokeReady ? "READY" : "OPEN / NOT READY"}**

Generated: \`${report.generatedAt}\`

Deploy evidence: \`${report.sources.deployEvidence}\`

## Summary

| Check | Result |
| --- | --- |
| Deploy evidence present | ${checkMark(report.artifacts.deployEvidence.present)} |
| Deploy evidence parse error | ${tableCell(report.artifacts.deployEvidence.parseError ?? "none")} |
| Runtime source paths clean | ${checkMark(report.currentGit.workingTreeCleanForRuntimeSourcePaths)} |
| 100% production Worker version with deployment time recorded | ${checkMark(report.deployment.trafficPercent === 100 && report.deployment.productionVersionId !== null && report.deployment.deployedAt !== null)} |
| Deployed source commit recorded | ${checkMark(report.deployment.deployedSourceCommit !== null)} |
| Deployed source commit matches current HEAD | ${checkMark(report.deployment.sourceCommitMatchesCurrentGit)} |
| Deployment is not older than current commit | ${checkMark(report.deployment.deployedAtIsNotOlderThanCurrentCommit)} |
| Hosted route smoke passed | ${checkMark(report.smoke.hostedRouteProofReady)} |
| Release gates passed after deploy | ${checkMark(report.smoke.releaseGatesReady)} |

## Current Git

| Field | Value |
| --- | --- |
| commit | ${report.currentGit.commit ?? "(missing)"} |
| committedAt | ${report.currentGit.committedAt ?? "(missing)"} |
| subject | ${tableCell(report.currentGit.subject ?? "(missing)")} |

Runtime source status paths:
${report.currentGit.statusPaths.map((item) => `- \`${item}\``).join("\n")}

Dirty runtime source entries:
${dirtyRows}

## Deployment

| Field | Value |
| --- | --- |
| worker | ${report.deployment.worker ?? "(missing)"} |
| productionVersionId | ${report.deployment.productionVersionId ?? "(missing)"} |
| productionVersionNumber | ${report.deployment.productionVersionNumber ?? "(missing)"} |
| trafficPercent | ${report.deployment.trafficPercent ?? "(missing)"} |
| deployedAt | ${report.deployment.deployedAt ?? "(missing)"} |
| deployedSourceCommit | ${report.deployment.deployedSourceCommit ?? "(missing)"} |

## Open Blockers

${blockerRows}

## Boundary

${report.note}
`;
}

function writeMarkdown(path: string, report: LatestDeploySourceSmokeReport) {
  const resolved = resolve(path);
  mkdirSync(dirname(resolved), { recursive: true });
  writeFileSync(resolved, renderMarkdown(report));
}

async function main() {
  const outputFile = readEnv("OUTPUT_FILE") ?? DEFAULT_OUTPUT_FILE;
  const markdownFile = readEnv("MARKDOWN_FILE") ?? DEFAULT_MARKDOWN_FILE;
  const templateFile = readEnv("DEPLOY_SOURCE_SMOKE_TEMPLATE_FILE") ?? DEFAULT_TEMPLATE_FILE;
  const report = buildLatestDeploySourceSmokeReport();
  const shouldWriteTemplate = readEnv("WRITE_DEPLOY_SOURCE_SMOKE_TEMPLATE") === "1";
  const strictReadinessExit = envFlag("STRICT_READINESS_EXIT") || envFlag("FAIL_ON_BLOCKERS");

  writeJson(outputFile, report);
  writeMarkdown(markdownFile, report);
  if (shouldWriteTemplate) {
    writeJson(templateFile, buildDeploySourceSmokeTemplate({
      generatedAt: report.generatedAt,
      currentGit: report.currentGit,
    }));
  }

  console.log(JSON.stringify({
    generatedAt: report.generatedAt,
    mode: report.mode,
    latestDeploySourceSmokeReady: report.readiness.latestDeploySourceSmokeReady,
    blockerCount: report.blockers.length,
    outputFile,
    markdownFile,
    templateFile: shouldWriteTemplate ? templateFile : null,
    strictReadinessExit,
    exitCode: strictReadinessExit && !report.readiness.latestDeploySourceSmokeReady ? 1 : 0,
  }, null, 2));

  if (strictReadinessExit && !report.readiness.latestDeploySourceSmokeReady) {
    process.exitCode = 1;
  }
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
