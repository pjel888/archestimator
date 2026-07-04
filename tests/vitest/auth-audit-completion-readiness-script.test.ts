import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

import { describe, expect, it } from "vitest";

import {
  type AuthAuditCompletionArtifactPaths,
  buildAuthAuditCompletionReadinessReport,
} from "@/../scripts/check-auth-audit-completion-readiness";

function writeJson(path: string, value: unknown) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function artifactPaths(root: string): AuthAuditCompletionArtifactPaths {
  return {
    providerCleanupAllowlist: join(root, "provider-cleanup.json"),
    typeReferenceInventory: join(root, "type-reference.json"),
    legalOwnerReadiness: join(root, "legal-owner.json"),
    latestDeploySourceSmoke: join(root, "latest-deploy-source-smoke.json"),
    providerExitPack: join(root, "provider-exit.json"),
    finalIndependentReview: join(root, "final-review.json"),
  };
}

function writeGreenArtifacts(paths: AuthAuditCompletionArtifactPaths) {
  writeJson(paths.providerCleanupAllowlist, {
    generatedAt: "2026-07-04T00:00:00.000Z",
    readiness: { finalProviderCleanupReady: true },
  });
  writeJson(paths.typeReferenceInventory, {
    generatedAt: "2026-07-04T00:00:00.000Z",
    readiness: { typeReferenceDeletionReady: true },
  });
  writeJson(paths.legalOwnerReadiness, {
    generatedAt: "2026-07-04T00:00:00.000Z",
    legalOwnerReady: true,
  });
  writeJson(paths.latestDeploySourceSmoke, {
    generatedAt: "2026-07-04T00:00:00.000Z",
    readiness: { latestDeploySourceSmokeReady: true },
  });
  writeJson(paths.providerExitPack, {
    generatedAt: "2026-07-04T00:00:00.000Z",
    readiness: { providerExitReady: true },
  });
  writeJson(paths.finalIndependentReview, {
    generatedAt: "2026-07-04T00:00:00.000Z",
    mode: "auth-audit-final-independent-review",
    recommendation: "APPROVE",
    architectStatus: "CLEAR",
    independentReview: {
      codeReviewer: {
        agentRole: "code-reviewer",
        status: "complete",
        evidence: "APPROVE after reviewing final diff and tests",
      },
      architect: {
        agentRole: "architect",
        status: "complete",
        evidence: "CLEAR after reviewing completion boundaries",
      },
    },
  });
}

describe("auth audit completion readiness checker", () => {
  it("passes only when all local, external, legal, and review gates are ready", () => {
    const root = mkdtempSync(join(tmpdir(), "auth-audit-completion-green-"));
    const paths = artifactPaths(root);
    writeGreenArtifacts(paths);

    const report = buildAuthAuditCompletionReadinessReport({
      generatedAt: "2026-07-04T00:00:00.000Z",
      artifacts: paths,
    });

    expect(report.readiness.localProviderCleanupReady).toBe(true);
    expect(report.readiness.externalCompletionProofReady).toBe(true);
    expect(report.readiness.finalAuthAuditCompletionReady).toBe(true);
    expect(report.blockers).toEqual([]);
  });

  it("fails closed when current external/legal/review evidence is missing or negative", () => {
    const root = mkdtempSync(join(tmpdir(), "auth-audit-completion-open-"));
    const paths = artifactPaths(root);
    writeJson(paths.providerCleanupAllowlist, {
      generatedAt: "2026-07-04T00:00:00.000Z",
      readiness: { finalProviderCleanupReady: true },
    });
    writeJson(paths.typeReferenceInventory, {
      generatedAt: "2026-07-04T00:00:00.000Z",
      readiness: { typeReferenceDeletionReady: true },
    });
    writeJson(paths.legalOwnerReadiness, {
      generatedAt: "2026-07-04T00:00:00.000Z",
      legalOwnerReady: false,
    });
    writeJson(paths.latestDeploySourceSmoke, {
      generatedAt: "2026-07-04T00:00:00.000Z",
      readiness: { latestDeploySourceSmokeReady: false },
    });
    writeJson(paths.providerExitPack, {
      generatedAt: "2026-07-04T00:00:00.000Z",
      readiness: { providerExitReady: false },
    });

    const report = buildAuthAuditCompletionReadinessReport({
      generatedAt: "2026-07-04T00:00:00.000Z",
      artifacts: paths,
    });

    expect(report.readiness.localProviderCleanupReady).toBe(true);
    expect(report.readiness.externalCompletionProofReady).toBe(false);
    expect(report.readiness.finalAuthAuditCompletionReady).toBe(false);
    expect(report.blockers).toEqual([
      "Latest deploy/source smoke: Latest deploy/source-smoke evidence does not report latestDeploySourceSmokeReady=true.",
      "Provider exit pack: Provider-exit pack does not report providerExitReady=true.",
      "Legal-owner readiness: Legal-owner readiness evidence does not report legalOwnerReady=true.",
      "Final independent review: Final independent code/security review artifact is missing.",
    ]);
  });

  it("rejects malformed artifacts and incomplete independent review evidence", () => {
    const root = mkdtempSync(join(tmpdir(), "auth-audit-completion-malformed-"));
    const paths = artifactPaths(root);
    writeGreenArtifacts(paths);
    writeFileSync(paths.providerExitPack, "{not-json");
    writeJson(paths.finalIndependentReview, {
      generatedAt: "2026-07-04T00:00:00.000Z",
      recommendation: "COMMENT",
      architectStatus: "WATCH",
      independentReview: {},
    });

    const report = buildAuthAuditCompletionReadinessReport({
      generatedAt: "2026-07-04T00:00:00.000Z",
      artifacts: paths,
    });

    expect(report.readiness.finalAuthAuditCompletionReady).toBe(false);
    expect(report.blockers.some((blocker) => blocker.includes("Provider exit pack: Artifact is malformed"))).toBe(true);
    expect(report.blockers.some((blocker) => blocker.includes("Final review artifact is not clean"))).toBe(true);
  });

  it("CLI writes JSON and Markdown evidence while exiting non-zero for open gates", () => {
    const root = mkdtempSync(join(tmpdir(), "auth-audit-completion-cli-"));
    const paths = artifactPaths(root);
    const outputFile = join(root, "readiness.json");
    const markdownFile = join(root, "readiness.md");

    const run = spawnSync("bun", ["run", "scripts/check-auth-audit-completion-readiness.ts"], {
      cwd: process.cwd(),
      encoding: "utf8",
      env: {
        ...process.env,
        AUTH_PROVIDER_CLEANUP_ALLOWLIST_FILE: paths.providerCleanupAllowlist,
        AUTH_TYPE_REFERENCE_INVENTORY_FILE: paths.typeReferenceInventory,
        AUTH_LEGAL_OWNER_READINESS_FILE: paths.legalOwnerReadiness,
        AUTH_LATEST_DEPLOY_SOURCE_SMOKE_FILE: paths.latestDeploySourceSmoke,
        AUTH_PROVIDER_EXIT_PACK_FILE: paths.providerExitPack,
        AUTH_FINAL_INDEPENDENT_REVIEW_FILE: paths.finalIndependentReview,
        OUTPUT_FILE: outputFile,
        MARKDOWN_FILE: markdownFile,
      },
    });

    expect(run.status).toBe(1);
    expect(JSON.parse(readFileSync(outputFile, "utf8")).readiness.finalAuthAuditCompletionReady).toBe(false);
    expect(readFileSync(markdownFile, "utf8")).toContain("OPEN / NOT READY");
  });
});
