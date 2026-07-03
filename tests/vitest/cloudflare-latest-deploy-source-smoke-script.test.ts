import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  DEFAULT_RUNTIME_SOURCE_STATUS_PATHS,
  buildDeploySourceSmokeTemplate,
  buildLatestDeploySourceSmokeReport,
  filterRuntimeDirtyStatusEntries,
  packageJsonChangeTouchesRuntime,
  renderMarkdown,
  type CurrentGitState,
} from "@/../scripts/check-cloudflare-latest-deploy-source-smoke";

function artifact(value: Record<string, unknown>) {
  return {
    path: "/tmp/deploy-evidence.json",
    present: true,
    generatedAt: typeof value.generatedAt === "string" ? value.generatedAt : null,
    value,
    parseError: null,
  };
}

function malformedArtifact() {
  return {
    path: "/tmp/deploy-evidence.json",
    present: true,
    generatedAt: null,
    value: null,
    parseError: "Unexpected token '<' while parsing JSON",
  };
}

function gitState(overrides: Partial<CurrentGitState> = {}): CurrentGitState {
  return {
    available: true,
    commit: "abcdef1234567890abcdef1234567890abcdef12",
    committedAt: "2026-07-03T00:00:00.000Z",
    subject: "current source",
    statusPaths: ["src", "worker.ts", "package.json", "bun.lock", "wrangler.jsonc"],
    dirtyRuntimeSourcePaths: [],
    workingTreeCleanForRuntimeSourcePaths: true,
    errors: [],
    ...overrides,
  };
}

function deployEvidence(overrides: Record<string, unknown> = {}) {
  return artifact({
    generatedAt: "2026-07-03T00:05:00.000Z",
    mode: "cloudflare-main-worker-current-source-deploy",
    worker: "archestimator-proof",
    productionVersion: {
      id: "worker-version-id",
      number: 101,
      trafficPercent: 100,
      deployedAt: "2026-07-03T00:04:00.000Z",
    },
    source: {
      gitCommit: "abcdef1234567890abcdef1234567890abcdef12",
    },
    hostedRouteProof: {
      passed: true,
      routeContractReady: true,
      hostedRouteProofReady: true,
      blockers: [],
    },
    releaseGates: {
      productionCutoverReady: true,
      blockers: [],
    },
    ...overrides,
  });
}

function runLatestDeploySourceSmokeCli(env: NodeJS.ProcessEnv) {
  return spawnSync("bun", ["run", "scripts/check-cloudflare-latest-deploy-source-smoke.ts"], {
    cwd: process.cwd(),
    env: { ...process.env, ...env },
    encoding: "utf8",
    timeout: 30_000,
  });
}

describe("latest deploy source smoke script", () => {
  it("keeps the default runtime status paths aligned with deploy-relevant source", () => {
    expect(DEFAULT_RUNTIME_SOURCE_STATUS_PATHS).toEqual(expect.arrayContaining([
      "src",
      "worker.ts",
      "package.json",
      "bun.lock",
      "wrangler.jsonc",
      "cloudflare-env.d.ts",
      "next.config.ts",
      "open-next.config.ts",
      "src/middleware.ts",
    ]));
    expect(DEFAULT_RUNTIME_SOURCE_STATUS_PATHS).not.toContain("middleware.ts");
  });

  it("marks a current deploy/source smoke ready only when source commit and post-deploy smoke match", () => {
    const report = buildLatestDeploySourceSmokeReport({
      generatedAt: "2026-07-03T00:10:00.000Z",
      deployEvidence: deployEvidence(),
      currentGit: gitState(),
    });

    expect(report.readiness.latestDeploySourceSmokeReady).toBe(true);
    expect(report.blockers).toEqual([]);
    expect(report.deployment.sourceCommitMatchesCurrentGit).toBe(true);
    expect(report.smoke.hostedRouteProofReady).toBe(true);
    expect(report.smoke.releaseGatesReady).toBe(true);
    expect(renderMarkdown(report)).toContain("Status: **READY**");
  });

  it("keeps stale deploy evidence open when no deployed source commit is recorded", () => {
    const report = buildLatestDeploySourceSmokeReport({
      generatedAt: "2026-07-03T00:10:00.000Z",
      deployEvidence: deployEvidence({
        productionVersion: {
          id: "worker-version-id",
          number: 100,
          trafficPercent: 100,
          deployedAt: "2026-07-02T00:00:00.000Z",
        },
        source: {},
      }),
      currentGit: gitState(),
    });

    expect(report.readiness.latestDeploySourceSmokeReady).toBe(false);
    expect(report.blockers).toContain("Deploy evidence does not record the deployed git source commit.");
    expect(report.blockers).toContain("Deployment timestamp is older than the current git commit timestamp.");
    expect(renderMarkdown(report)).toContain("Deploy evidence does not record the deployed git source commit.");
  });

  it("does not show production-version proof as passing when deployedAt is missing", () => {
    const report = buildLatestDeploySourceSmokeReport({
      generatedAt: "2026-07-03T00:10:00.000Z",
      deployEvidence: deployEvidence({
        productionVersion: {
          id: "worker-version-id",
          number: 101,
          trafficPercent: 100,
          deployedAt: null,
        },
      }),
      currentGit: gitState(),
    });

    expect(report.readiness.latestDeploySourceSmokeReady).toBe(false);
    expect(report.blockers).toContain("Deploy evidence does not prove a 100% production Worker version with deployment time.");
    expect(renderMarkdown(report)).toContain("| 100% production Worker version with deployment time recorded | OPEN |");
  });

  it("keeps otherwise green deploy evidence open when the deployed source commit differs from HEAD", () => {
    const report = buildLatestDeploySourceSmokeReport({
      generatedAt: "2026-07-03T00:10:00.000Z",
      deployEvidence: deployEvidence({
        source: {
          gitCommit: "1111111111111111111111111111111111111111",
        },
      }),
      currentGit: gitState(),
    });

    expect(report.readiness.latestDeploySourceSmokeReady).toBe(false);
    expect(report.deployment.deployedSourceCommit).toBe("1111111111111111111111111111111111111111");
    expect(report.deployment.sourceCommitMatchesCurrentGit).toBe(false);
    expect(report.blockers).toContain("Deployed git source commit does not match current HEAD.");
    expect(report.blockers).not.toContain("Deploy evidence does not record the deployed git source commit.");
  });

  it("does not claim deployed-source readiness with dirty runtime source paths", () => {
    const report = buildLatestDeploySourceSmokeReport({
      deployEvidence: deployEvidence(),
      currentGit: gitState({
        dirtyRuntimeSourcePaths: ["M src/app/page.tsx"],
        workingTreeCleanForRuntimeSourcePaths: false,
      }),
    });

    expect(report.readiness.latestDeploySourceSmokeReady).toBe(false);
    expect(report.blockers).toContain("Runtime source paths have uncommitted changes and cannot be claimed deployed.");
  });

  it("does not treat proof-tooling-only package scripts as runtime source changes", () => {
    const basePackageJson = JSON.stringify({
      scripts: {
        "cf:provider-exit-pack": "bun run scripts/generate-cloudflare-provider-exit-pack.ts",
        build: "next build",
      },
      dependencies: {
        next: "16.0.0",
      },
    });
    const nextPackageJson = JSON.stringify({
      scripts: {
        "cf:provider-exit-pack": "bun run scripts/generate-cloudflare-provider-exit-pack.ts",
        "cf:check-latest-deploy-source-smoke": "bun run scripts/check-cloudflare-latest-deploy-source-smoke.ts",
        "cf:latest-deploy-source-smoke-template": "WRITE_DEPLOY_SOURCE_SMOKE_TEMPLATE=1 bun run scripts/check-cloudflare-latest-deploy-source-smoke.ts",
        build: "next build",
      },
      dependencies: {
        next: "16.0.0",
      },
    });

    expect(packageJsonChangeTouchesRuntime(basePackageJson, nextPackageJson)).toBe(false);
    expect(filterRuntimeDirtyStatusEntries([" M package.json"], { packageJsonTouchesRuntime: false })).toEqual([]);
    expect(filterRuntimeDirtyStatusEntries(["M package.json"], { packageJsonTouchesRuntime: false })).toEqual([]);
  });

  it("keeps bun.lock dirty even when package.json only has proof-tooling script changes", () => {
    expect(filterRuntimeDirtyStatusEntries([" M package.json", " M bun.lock"], {
      packageJsonTouchesRuntime: false,
    })).toEqual([" M bun.lock"]);
  });

  it("keeps package.json dirty when runtime package fields change", () => {
    const basePackageJson = JSON.stringify({
      scripts: {
        build: "next build",
      },
      dependencies: {
        next: "16.0.0",
      },
    });
    const nextPackageJson = JSON.stringify({
      scripts: {
        build: "next build",
      },
      dependencies: {
        next: "16.0.1",
      },
    });

    expect(packageJsonChangeTouchesRuntime(basePackageJson, nextPackageJson)).toBe(true);
    expect(filterRuntimeDirtyStatusEntries([" M package.json"], { packageJsonTouchesRuntime: true })).toEqual([
      " M package.json",
    ]);
  });

  it("keeps package.json dirty when non-proof scripts change", () => {
    const basePackageJson = JSON.stringify({
      scripts: {
        build: "next build",
      },
    });
    const nextPackageJson = JSON.stringify({
      scripts: {
        build: "opennextjs-cloudflare build",
      },
    });

    expect(packageJsonChangeTouchesRuntime(basePackageJson, nextPackageJson)).toBe(true);
  });

  it("reports malformed deploy evidence as an explicit blocker", () => {
    const report = buildLatestDeploySourceSmokeReport({
      generatedAt: "2026-07-03T00:10:00.000Z",
      deployEvidence: malformedArtifact(),
      currentGit: gitState(),
    });

    expect(report.readiness.latestDeploySourceSmokeReady).toBe(false);
    expect(report.artifacts.deployEvidence).toMatchObject({
      present: true,
      generatedAt: null,
      parseError: "Unexpected token '<' while parsing JSON",
    });
    expect(report.blockers).toContain("Deploy evidence artifact could not be parsed as JSON.");
    expect(renderMarkdown(report)).toContain("Deploy evidence parse error | Unexpected token '<' while parsing JSON");
  });

  it("keeps default report generation non-fatal but fails strict readiness mode on blockers", () => {
    const dir = mkdtempSync(join(tmpdir(), "latest-deploy-source-smoke-strict-"));
    const deployEvidenceFile = join(dir, "malformed-deploy-evidence.json");
    const defaultOutputFile = join(dir, "default.json");
    const defaultMarkdownFile = join(dir, "default.md");
    const strictOutputFile = join(dir, "strict.json");
    const strictMarkdownFile = join(dir, "strict.md");
    writeFileSync(deployEvidenceFile, "{ not-json");

    const baseEnv = {
      DEPLOY_SOURCE_SMOKE_DEPLOY_EVIDENCE_FILE: deployEvidenceFile,
      FAIL_ON_BLOCKERS: "0",
      STRICT_READINESS_EXIT: "0",
      WRITE_DEPLOY_SOURCE_SMOKE_TEMPLATE: "0",
    };

    const defaultRun = runLatestDeploySourceSmokeCli({
      ...baseEnv,
      OUTPUT_FILE: defaultOutputFile,
      MARKDOWN_FILE: defaultMarkdownFile,
    });

    expect(defaultRun.status).toBe(0);
    expect(defaultRun.stderr).toBe("");
    expect(JSON.parse(readFileSync(defaultOutputFile, "utf8")).readiness.latestDeploySourceSmokeReady).toBe(false);

    const strictRun = runLatestDeploySourceSmokeCli({
      ...baseEnv,
      OUTPUT_FILE: strictOutputFile,
      MARKDOWN_FILE: strictMarkdownFile,
      STRICT_READINESS_EXIT: "1",
    });

    expect(strictRun.status).toBe(1);
    expect(strictRun.stderr).toBe("");
    expect(JSON.parse(readFileSync(strictOutputFile, "utf8")).blockers)
      .toContain("Deploy evidence artifact could not be parsed as JSON.");
    expect(strictRun.stdout).toContain('"strictReadinessExit": true');
    expect(strictRun.stdout).toContain('"exitCode": 1');
  });

  it("does not trust a deploy artifact when hosted smoke or release gates are blocked", () => {
    const report = buildLatestDeploySourceSmokeReport({
      deployEvidence: deployEvidence({
        hostedRouteProof: {
          passed: true,
          routeContractReady: true,
          hostedRouteProofReady: true,
          blockers: ["route failed after deploy"],
        },
        releaseGates: {
          productionCutoverReady: false,
          blockers: ["release gate failed"],
        },
      }),
      currentGit: gitState(),
    });

    expect(report.readiness.latestDeploySourceSmokeReady).toBe(false);
    expect(report.blockers).toContain("Deploy evidence does not include a passing hosted route smoke.");
    expect(report.blockers).toContain("Deploy evidence does not include passing release gates after the deploy.");
  });

  it("builds a sanitized deploy-source template without making it readiness proof", () => {
    const template = buildDeploySourceSmokeTemplate({
      generatedAt: "2026-07-03T00:10:00.000Z",
      currentGit: gitState(),
    });

    expect(template.mode).toBe("cloudflare-latest-deploy-source-smoke-template");
    expect(template.source.gitCommit).toBe("abcdef1234567890abcdef1234567890abcdef12");
    expect(template.productionVersion.id).toBeNull();
    expect(template.hostedRouteProof.hostedRouteProofReady).toBe(false);
    expect(template.releaseGates.productionCutoverReady).toBe(false);
    expect(template.boundary.forbiddenMaterials).toContain("API keys");

    const report = buildLatestDeploySourceSmokeReport({
      generatedAt: "2026-07-03T00:11:00.000Z",
      deployEvidence: artifact(template as unknown as Record<string, unknown>),
      currentGit: gitState(),
    });

    expect(report.readiness.latestDeploySourceSmokeReady).toBe(false);
    expect(report.deployment.sourceCommitMatchesCurrentGit).toBe(true);
    expect(report.blockers).toContain("Deploy evidence does not prove a 100% production Worker version with deployment time.");
    expect(report.blockers).toContain("Deploy evidence does not include a passing hosted route smoke.");
    expect(report.blockers).toContain("Deploy evidence does not include passing release gates after the deploy.");
  });
});
