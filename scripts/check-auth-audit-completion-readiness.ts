#!/usr/bin/env bun

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

type Artifact<T extends Record<string, unknown> = Record<string, unknown>> = {
  path: string;
  present: boolean;
  generatedAt: string | null;
  value: T | null;
  parseError: string | null;
};

type Gate = {
  key: string;
  label: string;
  ready: boolean;
  evidence: string | null;
  blocker: string | null;
};

export type AuthAuditCompletionArtifactPaths = {
  providerCleanupAllowlist: string;
  typeReferenceInventory: string;
  legalOwnerReadiness: string;
  latestDeploySourceSmoke: string;
  providerExitPack: string;
  finalIndependentReview: string;
};

export type AuthAuditCompletionReadinessReport = {
  generatedAt: string;
  mode: "auth-audit-completion-readiness";
  sources: {
    authPlanRoot: string;
    cloudflareMigrationPlanRoot: string;
  };
  artifacts: Record<keyof AuthAuditCompletionArtifactPaths, {
    path: string;
    present: boolean;
    generatedAt: string | null;
    parseError: string | null;
  }>;
  gates: Gate[];
  readiness: {
    localProviderCleanupReady: boolean;
    externalCompletionProofReady: boolean;
    finalAuthAuditCompletionReady: boolean;
  };
  blockers: string[];
  note: string;
};

const AUTH_PLAN_ROOT = ".ai/03_plans/2026-07-03-Authentication-Audit-And-Improvement";
const AUTH_EVIDENCE_ROOT = `${AUTH_PLAN_ROOT}/evidence`;
const CLOUDFLARE_MIGRATION_PLAN_ROOT = ".ai/03_plans/2026-06-29-Cloudflare-Migration-Codex";
const CLOUDFLARE_MIGRATION_EVIDENCE_ROOT = `${CLOUDFLARE_MIGRATION_PLAN_ROOT}/evidence`;

export const DEFAULT_AUTH_AUDIT_COMPLETION_ARTIFACTS: AuthAuditCompletionArtifactPaths = {
  providerCleanupAllowlist: `${AUTH_EVIDENCE_ROOT}/2026-07-04-provider-cleanup-allowlist.json`,
  typeReferenceInventory: `${AUTH_EVIDENCE_ROOT}/2026-07-04-supabase-type-reference-retirement-inventory.json`,
  legalOwnerReadiness: `${AUTH_EVIDENCE_ROOT}/2026-07-04-legal-owner-readiness.json`,
  latestDeploySourceSmoke: `${CLOUDFLARE_MIGRATION_EVIDENCE_ROOT}/2026-07-03-cloudflare-latest-deploy-source-smoke.json`,
  providerExitPack: `${CLOUDFLARE_MIGRATION_EVIDENCE_ROOT}/2026-07-03-cloudflare-provider-exit-pack.json`,
  finalIndependentReview: `${AUTH_EVIDENCE_ROOT}/2026-07-04-final-independent-review.json`,
};

const DEFAULT_OUTPUT_FILE = `${AUTH_EVIDENCE_ROOT}/2026-07-04-auth-audit-completion-readiness.json`;
const DEFAULT_MARKDOWN_FILE = `${AUTH_EVIDENCE_ROOT}/2026-07-04-auth-audit-completion-readiness.md`;

const NOTE =
  "Fail-closed auth audit completion gate. This script reads sanitized evidence artifacts only; it does not read .env files, print secrets, mutate providers, deploy, run browser automation, approve legal/privacy posture, or mark native goals complete.";

function readEnv(name: string) {
  const value = process.env[name];
  return value?.trim() || undefined;
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

function boolAt(value: Record<string, unknown> | null, path: string[]) {
  let current: unknown = value;
  for (const segment of path) {
    if (!current || typeof current !== "object" || Array.isArray(current)) return null;
    current = (current as Record<string, unknown>)[segment];
  }
  return typeof current === "boolean" ? current : null;
}

function stringAt(value: Record<string, unknown> | null, path: string[]) {
  let current: unknown = value;
  for (const segment of path) {
    if (!current || typeof current !== "object" || Array.isArray(current)) return null;
    current = (current as Record<string, unknown>)[segment];
  }
  return typeof current === "string" && current.trim() ? current.trim() : null;
}

function artifactSummary(artifact: Artifact) {
  return {
    path: artifact.path,
    present: artifact.present,
    generatedAt: artifact.generatedAt,
    parseError: artifact.parseError,
  };
}

function gateFromBooleanArtifact({
  key,
  label,
  artifact,
  readinessPath,
  missingBlocker,
  falseBlocker,
}: {
  key: string;
  label: string;
  artifact: Artifact;
  readinessPath: string[];
  missingBlocker: string;
  falseBlocker: string;
}): Gate {
  if (!artifact.present) {
    return { key, label, ready: false, evidence: null, blocker: missingBlocker };
  }
  if (artifact.parseError) {
    return { key, label, ready: false, evidence: null, blocker: `Artifact is malformed: ${artifact.parseError}` };
  }

  const ready = boolAt(artifact.value, readinessPath) === true;
  const evidence = `${artifact.path}${artifact.generatedAt ? ` generated ${artifact.generatedAt}` : ""}`;
  return {
    key,
    label,
    ready,
    evidence,
    blocker: ready ? null : falseBlocker,
  };
}

function finalIndependentReviewGate(artifact: Artifact): Gate {
  if (!artifact.present) {
    return {
      key: "final-independent-review-ready",
      label: "Final independent review",
      ready: false,
      evidence: null,
      blocker: "Final independent code/security review artifact is missing.",
    };
  }
  if (artifact.parseError) {
    return {
      key: "final-independent-review-ready",
      label: "Final independent review",
      ready: false,
      evidence: null,
      blocker: `Final independent review artifact is malformed: ${artifact.parseError}`,
    };
  }

  const recommendation = stringAt(artifact.value, ["recommendation"]);
  const architectStatus = stringAt(artifact.value, ["architectStatus"]);
  const codeReviewerRole = stringAt(artifact.value, ["independentReview", "codeReviewer", "agentRole"]);
  const codeReviewerStatus = stringAt(artifact.value, ["independentReview", "codeReviewer", "status"]);
  const codeReviewerEvidence = stringAt(artifact.value, ["independentReview", "codeReviewer", "evidence"]);
  const architectRole = stringAt(artifact.value, ["independentReview", "architect", "agentRole"]);
  const architectStatusValue = stringAt(artifact.value, ["independentReview", "architect", "status"]);
  const architectEvidence = stringAt(artifact.value, ["independentReview", "architect", "evidence"]);

  const missing = [
    recommendation !== "APPROVE" ? "recommendation=APPROVE" : null,
    architectStatus !== "CLEAR" ? "architectStatus=CLEAR" : null,
    codeReviewerRole !== "code-reviewer" ? "independent code-reviewer role" : null,
    codeReviewerStatus !== "complete" ? "completed code-reviewer status" : null,
    !codeReviewerEvidence ? "code-reviewer evidence" : null,
    architectRole !== "architect" ? "independent architect role" : null,
    architectStatusValue !== "complete" ? "completed architect status" : null,
    !architectEvidence ? "architect evidence" : null,
  ].filter((item): item is string => Boolean(item));

  const ready = missing.length === 0;
  return {
    key: "final-independent-review-ready",
    label: "Final independent review",
    ready,
    evidence: `${artifact.path}${artifact.generatedAt ? ` generated ${artifact.generatedAt}` : ""}`,
    blocker: ready ? null : `Final review artifact is not clean: missing ${missing.join(", ")}.`,
  };
}

export function buildAuthAuditCompletionReadinessReport({
  generatedAt = new Date().toISOString(),
  artifacts = DEFAULT_AUTH_AUDIT_COMPLETION_ARTIFACTS,
}: {
  generatedAt?: string;
  artifacts?: AuthAuditCompletionArtifactPaths;
} = {}) {
  const providerCleanupAllowlist = readJsonArtifact(artifacts.providerCleanupAllowlist);
  const typeReferenceInventory = readJsonArtifact(artifacts.typeReferenceInventory);
  const legalOwnerReadiness = readJsonArtifact(artifacts.legalOwnerReadiness);
  const latestDeploySourceSmoke = readJsonArtifact(artifacts.latestDeploySourceSmoke);
  const providerExitPack = readJsonArtifact(artifacts.providerExitPack);
  const finalIndependentReview = readJsonArtifact(artifacts.finalIndependentReview);

  const gates = [
    gateFromBooleanArtifact({
      key: "provider-cleanup-allowlist-ready",
      label: "Provider cleanup allowlist",
      artifact: providerCleanupAllowlist,
      readinessPath: ["readiness", "finalProviderCleanupReady"],
      missingBlocker: "Provider cleanup allowlist evidence is missing.",
      falseBlocker: "Provider cleanup allowlist does not report finalProviderCleanupReady=true.",
    }),
    gateFromBooleanArtifact({
      key: "type-reference-retirement-ready",
      label: "Supabase type-reference retirement",
      artifact: typeReferenceInventory,
      readinessPath: ["readiness", "typeReferenceDeletionReady"],
      missingBlocker: "Supabase type-reference retirement inventory is missing.",
      falseBlocker: "Type-reference inventory does not report typeReferenceDeletionReady=true.",
    }),
    gateFromBooleanArtifact({
      key: "latest-deploy-source-smoke-ready",
      label: "Latest deploy/source smoke",
      artifact: latestDeploySourceSmoke,
      readinessPath: ["readiness", "latestDeploySourceSmokeReady"],
      missingBlocker: "Latest deploy/source-smoke evidence is missing.",
      falseBlocker: "Latest deploy/source-smoke evidence does not report latestDeploySourceSmokeReady=true.",
    }),
    gateFromBooleanArtifact({
      key: "provider-exit-ready",
      label: "Provider exit pack",
      artifact: providerExitPack,
      readinessPath: ["readiness", "providerExitReady"],
      missingBlocker: "Provider-exit pack evidence is missing.",
      falseBlocker: "Provider-exit pack does not report providerExitReady=true.",
    }),
    gateFromBooleanArtifact({
      key: "legal-owner-ready",
      label: "Legal-owner readiness",
      artifact: legalOwnerReadiness,
      readinessPath: ["legalOwnerReady"],
      missingBlocker: "Legal-owner readiness evidence is missing.",
      falseBlocker: "Legal-owner readiness evidence does not report legalOwnerReady=true.",
    }),
    finalIndependentReviewGate(finalIndependentReview),
  ];

  const localProviderCleanupReady = gates
    .filter((gate) => gate.key === "provider-cleanup-allowlist-ready" || gate.key === "type-reference-retirement-ready")
    .every((gate) => gate.ready);
  const externalCompletionProofReady = gates
    .filter((gate) => gate.key !== "provider-cleanup-allowlist-ready" && gate.key !== "type-reference-retirement-ready")
    .every((gate) => gate.ready);
  const finalAuthAuditCompletionReady = gates.every((gate) => gate.ready);
  const blockers = gates
    .filter((gate) => !gate.ready && gate.blocker)
    .map((gate) => `${gate.label}: ${gate.blocker}`);

  return {
    generatedAt,
    mode: "auth-audit-completion-readiness" as const,
    sources: {
      authPlanRoot: AUTH_PLAN_ROOT,
      cloudflareMigrationPlanRoot: CLOUDFLARE_MIGRATION_PLAN_ROOT,
    },
    artifacts: {
      providerCleanupAllowlist: artifactSummary(providerCleanupAllowlist),
      typeReferenceInventory: artifactSummary(typeReferenceInventory),
      legalOwnerReadiness: artifactSummary(legalOwnerReadiness),
      latestDeploySourceSmoke: artifactSummary(latestDeploySourceSmoke),
      providerExitPack: artifactSummary(providerExitPack),
      finalIndependentReview: artifactSummary(finalIndependentReview),
    },
    gates,
    readiness: {
      localProviderCleanupReady,
      externalCompletionProofReady,
      finalAuthAuditCompletionReady,
    },
    blockers,
    note: NOTE,
  } satisfies AuthAuditCompletionReadinessReport;
}

function checkMark(value: boolean) {
  return value ? "PASS" : "OPEN";
}

function tableCell(value: string | null) {
  return (value ?? "").replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

export function renderMarkdown(report: AuthAuditCompletionReadinessReport) {
  const gateRows = report.gates
    .map((gate) => `| ${gate.label} | ${checkMark(gate.ready)} | ${tableCell(gate.evidence)} | ${tableCell(gate.blocker)} |`)
    .join("\n");

  const blockerRows = report.blockers.length > 0
    ? report.blockers.map((blocker) => `- ${blocker}`).join("\n")
    : "- None";

  return `# Auth Audit Completion Readiness

Generated: ${report.generatedAt}

Status: **${report.readiness.finalAuthAuditCompletionReady ? "READY" : "OPEN / NOT READY"}**

Local provider cleanup ready: **${checkMark(report.readiness.localProviderCleanupReady)}**

External completion proof ready: **${checkMark(report.readiness.externalCompletionProofReady)}**

Final auth audit completion ready: **${checkMark(report.readiness.finalAuthAuditCompletionReady)}**

## Gates

| Gate | Status | Evidence | Blocker |
|---|---|---|---|
${gateRows}

## Blockers

${blockerRows}

## Boundary

${report.note}
`;
}

function writeFile(path: string, value: string) {
  const resolved = resolve(path);
  mkdirSync(dirname(resolved), { recursive: true });
  writeFileSync(resolved, value);
}

function artifactsFromEnv(): AuthAuditCompletionArtifactPaths {
  return {
    providerCleanupAllowlist:
      readEnv("AUTH_PROVIDER_CLEANUP_ALLOWLIST_FILE") ?? DEFAULT_AUTH_AUDIT_COMPLETION_ARTIFACTS.providerCleanupAllowlist,
    typeReferenceInventory:
      readEnv("AUTH_TYPE_REFERENCE_INVENTORY_FILE") ?? DEFAULT_AUTH_AUDIT_COMPLETION_ARTIFACTS.typeReferenceInventory,
    legalOwnerReadiness:
      readEnv("AUTH_LEGAL_OWNER_READINESS_FILE") ?? DEFAULT_AUTH_AUDIT_COMPLETION_ARTIFACTS.legalOwnerReadiness,
    latestDeploySourceSmoke:
      readEnv("AUTH_LATEST_DEPLOY_SOURCE_SMOKE_FILE") ?? DEFAULT_AUTH_AUDIT_COMPLETION_ARTIFACTS.latestDeploySourceSmoke,
    providerExitPack:
      readEnv("AUTH_PROVIDER_EXIT_PACK_FILE") ?? DEFAULT_AUTH_AUDIT_COMPLETION_ARTIFACTS.providerExitPack,
    finalIndependentReview:
      readEnv("AUTH_FINAL_INDEPENDENT_REVIEW_FILE") ?? DEFAULT_AUTH_AUDIT_COMPLETION_ARTIFACTS.finalIndependentReview,
  };
}

async function main() {
  const report = buildAuthAuditCompletionReadinessReport({ artifacts: artifactsFromEnv() });
  const outputFile = readEnv("OUTPUT_FILE") ?? DEFAULT_OUTPUT_FILE;
  const markdownFile = readEnv("MARKDOWN_FILE") ?? DEFAULT_MARKDOWN_FILE;

  writeFile(outputFile, `${JSON.stringify(report, null, 2)}\n`);
  writeFile(markdownFile, renderMarkdown(report));
  console.log(JSON.stringify(report, null, 2));

  if (!report.readiness.finalAuthAuditCompletionReady) process.exitCode = 1;
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
