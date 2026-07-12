import {
  buildReleaseEvidenceBundle,
  type BuildReleaseEvidenceBundleInput,
  type ReleaseEvidenceBundle,
} from "./release-evidence-bundle";

export const BETA_RELEASE_READINESS_VERSION = "BETA-RELEASE-READINESS-v1" as const;
export const PACK_RECEIPT_VERSION = "PACK-HANDOFF-RECEIPT-v1" as const;
export const CANDIDATE_DEPENDENCY_DISPOSITION_VERSION = "CANDIDATE-DEPENDENCY-DISPOSITION-v1" as const;

const REQUIRED_PACK_IDS = [
  "activity-history-mapping",
  "beta-operating-contract",
  "beta-readiness-program",
  "calculation-and-output-parity",
  "estimate-intelligence-and-price-governance",
  "first-user-activation-and-cohort-operations",
  "hosted-d1-recovery-and-data-resilience",
  "publisher-and-shared-pages",
  "release-integrity-and-golden-path",
] as const;

const SHA_PATTERN = /^[a-f0-9]{40}$/;

export type RequiredPackId = (typeof REQUIRED_PACK_IDS)[number];
export type PackReceipt = {
  schemaVersion: typeof PACK_RECEIPT_VERSION;
  packId: RequiredPackId;
  releaseId: string;
  candidateSha: string;
  environment: string;
  producerVersion: string;
  sourceRevision: string;
  collectedAt: string;
  expiresAt: string;
  status: "ready" | "superseded" | "failed";
};

export type CandidateCapability = {
  capabilityId: string;
  includedInCandidate: boolean;
  sourceRevision: string;
  fileScope: string[];
  validatedReceipt?: { producerVersion: string; candidateSha: string; expiresAt: string };
  exclusion?: {
    schemaVersion: typeof CANDIDATE_DEPENDENCY_DISPOSITION_VERSION;
    sourceRevision: string;
    fileScope: string[];
    rationale: string;
  };
};

export type ReleaseControl = {
  key: string;
  status: "pass" | "fail" | "unknown";
  providerBacked: boolean;
  evidenceDigest?: string;
};

export type ReleaseBlocker = {
  id: string;
  severity: "low" | "medium" | "high" | "critical";
  status: "open" | "closed";
};

export type ManualReadmeClaim = {
  generatedAt: string;
  decision: "GO" | "NO_GO";
  candidateSha: string;
};

export type BetaReleaseReadinessInput = {
  evidenceBundleInput: BuildReleaseEvidenceBundleInput;
  packReceipts: PackReceipt[];
  capabilities: CandidateCapability[];
  controls: ReleaseControl[];
  blockers: ReleaseBlocker[];
  currentMigrationHead: string;
  manualReadmeClaim?: ManualReadmeClaim;
  now?: Date;
};

export type BetaReleaseReadiness = {
  schemaVersion: typeof BETA_RELEASE_READINESS_VERSION;
  producerVersion: typeof BETA_RELEASE_READINESS_VERSION;
  releaseId: string;
  candidateSha: string;
  environment: string;
  migrationHead: string;
  localEvidenceDigest: string;
  packReceiptCount: number;
  capabilityCount: number;
  blockers: string[];
  controls: Array<{ key: string; status: ReleaseControl["status"]; providerBacked: boolean }>;
  decision: "NO_GO";
  localContractReady: true;
  providerBacked: false;
  productionReleaseProof: false;
  generatedAt: string;
};

function fail(message: string): never {
  throw new Error(`Invalid beta release readiness: ${message}`);
}

function parseTimestamp(value: string, field: string) {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) fail(`${field} is invalid`);
  return parsed;
}

function assertFresh(collectedAt: string, expiresAt: string, now: Date, label: string) {
  const collected = parseTimestamp(collectedAt, `${label} collectedAt`);
  const expires = parseTimestamp(expiresAt, `${label} expiresAt`);
  if (collected > now.getTime() || expires <= collected || expires <= now.getTime()) fail(`${label} is stale or expired`);
}

function normalizedScope(scope: readonly string[], label: string) {
  if (scope.length === 0 || scope.some((path) => !/^(?!\/)(?!.*\.\.)[A-Za-z0-9._/-]+$/.test(path))) fail(`${label} file scope is invalid`);
  const sorted = [...scope].sort((left, right) => left.localeCompare(right));
  if (new Set(sorted).size !== sorted.length) fail(`${label} file scope has duplicates`);
  return sorted;
}

function equalJson(left: unknown, right: unknown) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function validatePackReceipts(receipts: readonly PackReceipt[], bundle: ReleaseEvidenceBundle, now: Date) {
  const orderedIds = [...REQUIRED_PACK_IDS];
  const actualIds = receipts.map((receipt) => receipt.packId).sort((left, right) => left.localeCompare(right));
  const expectedIds = [...orderedIds].sort((left, right) => left.localeCompare(right));
  if (new Set(actualIds).size !== actualIds.length || !equalJson(actualIds, expectedIds)) fail("required plan-pack receipt coverage is incomplete");
  for (const receipt of receipts) {
    if (receipt.schemaVersion !== PACK_RECEIPT_VERSION || receipt.status !== "ready") fail(`pack receipt ${receipt.packId} is not ready`);
    if (receipt.releaseId !== bundle.releaseId || receipt.candidateSha !== bundle.candidateSha || receipt.environment !== bundle.environment) {
      fail(`pack receipt ${receipt.packId} has mixed release identity`);
    }
    if (!receipt.producerVersion || receipt.producerVersion !== BETA_RELEASE_READINESS_VERSION) fail(`pack receipt ${receipt.packId} has wrong producer`);
    if (receipt.sourceRevision !== bundle.candidateSha) fail(`pack receipt ${receipt.packId} source revision drifted`);
    assertFresh(receipt.collectedAt, receipt.expiresAt, now, `pack receipt ${receipt.packId}`);
  }
}

function validateCapabilities(capabilities: readonly CandidateCapability[], bundle: ReleaseEvidenceBundle, now: Date) {
  if (new Set(capabilities.map((capability) => capability.capabilityId)).size !== capabilities.length) fail("candidate capability IDs are duplicated");
  for (const capability of capabilities) {
    if (!/^[a-z0-9][a-z0-9-]{2,95}$/.test(capability.capabilityId) || !SHA_PATTERN.test(capability.sourceRevision)) {
      fail("candidate capability identity is invalid");
    }
    const scope = normalizedScope(capability.fileScope, capability.capabilityId);
    if (capability.includedInCandidate) {
      if (!capability.validatedReceipt || capability.exclusion) fail(`included capability ${capability.capabilityId} lacks a current validated receipt`);
      if (capability.validatedReceipt.candidateSha !== bundle.candidateSha || !capability.validatedReceipt.producerVersion) {
        fail(`included capability ${capability.capabilityId} receipt does not match candidate`);
      }
      if (parseTimestamp(capability.validatedReceipt.expiresAt, `${capability.capabilityId} receipt expiresAt`) <= now.getTime()) {
        fail(`included capability ${capability.capabilityId} receipt is expired`);
      }
    } else {
      const exclusion = capability.exclusion;
      if (capability.validatedReceipt || !exclusion || exclusion.schemaVersion !== CANDIDATE_DEPENDENCY_DISPOSITION_VERSION || !exclusion.rationale.trim()) {
        fail(`excluded capability ${capability.capabilityId} lacks an exact exclusion disposition`);
      }
      if (exclusion.sourceRevision !== capability.sourceRevision || !equalJson(normalizedScope(exclusion.fileScope, capability.capabilityId), scope)) {
        fail(`excluded capability ${capability.capabilityId} disposition does not match candidate scope`);
      }
    }
  }
}

export function buildBetaReleaseReadiness(input: BetaReleaseReadinessInput): BetaReleaseReadiness {
  const now = input.now ?? new Date();
  const bundle = buildReleaseEvidenceBundle({ ...input.evidenceBundleInput, now });
  if (input.currentMigrationHead !== bundle.migrationHead) fail("migration head drifted from candidate evidence");
  validatePackReceipts(input.packReceipts, bundle, now);
  validateCapabilities(input.capabilities, bundle, now);
  const controlBlockers = input.controls
    .filter((control) => control.status !== "pass" || !control.providerBacked || !control.evidenceDigest)
    .map((control) => `control:${control.key}:${control.status}`);
  const openHighSeverityBlockers = input.blockers
    .filter((blocker) => blocker.status === "open" && (blocker.severity === "high" || blocker.severity === "critical"))
    .map((blocker) => `blocker:${blocker.id}`);
  const generatedAt = now.toISOString();
  if (input.manualReadmeClaim && input.manualReadmeClaim.decision === "GO" && parseTimestamp(input.manualReadmeClaim.generatedAt, "manual README claim generatedAt") > now.getTime()) {
    fail("newer manual README GO claim contradicts generated readiness truth");
  }
  if (input.manualReadmeClaim && input.manualReadmeClaim.decision === "GO" && input.manualReadmeClaim.candidateSha !== bundle.candidateSha) {
    fail("manual README GO claim has a conflicting candidate SHA");
  }

  return {
    schemaVersion: BETA_RELEASE_READINESS_VERSION,
    producerVersion: BETA_RELEASE_READINESS_VERSION,
    releaseId: bundle.releaseId,
    candidateSha: bundle.candidateSha,
    environment: bundle.environment,
    migrationHead: bundle.migrationHead,
    localEvidenceDigest: bundle.goldenPathContractDigest,
    packReceiptCount: input.packReceipts.length,
    capabilityCount: input.capabilities.length,
    blockers: [...controlBlockers, ...openHighSeverityBlockers].sort((left, right) => left.localeCompare(right)),
    controls: [...input.controls].map((control) => ({ key: control.key, status: control.status, providerBacked: control.providerBacked })),
    decision: "NO_GO",
    localContractReady: true,
    providerBacked: false,
    productionReleaseProof: false,
    generatedAt,
  };
}

export function renderBetaReleaseReadinessMarkdown(readiness: BetaReleaseReadiness) {
  return [
    "# Beta Release Readiness",
    "",
    `Release ID: ${readiness.releaseId}`,
    `Candidate SHA: ${readiness.candidateSha}`,
    `Environment: ${readiness.environment}`,
    `Migration head: ${readiness.migrationHead}`,
    `Decision: ${readiness.decision}`,
    "Provider-backed proof: no",
    "Production release proof: no",
    "",
    "## Blockers",
    "",
    ...(readiness.blockers.length ? readiness.blockers.map((blocker) => `- ${blocker}`) : ["- external authorization and provider proof remain required"]),
    "",
  ].join("\n");
}
