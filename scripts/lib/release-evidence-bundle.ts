import { createHash } from "node:crypto";

import {
  BETA_GOLDEN_PATH_CONTRACT_VERSION,
  validateBetaGoldenPathContract,
  type BetaGoldenPathValidationInput,
} from "./beta-golden-path-contract";
import {
  validateReleaseCandidateMetadata,
  type CandidateValidationContext,
  type ReleaseCandidateMetadata,
} from "./release-candidate-metadata";

export const RELEASE_EVIDENCE_BUNDLE_VERSION = "RELEASE-EVIDENCE-BUNDLE-v1" as const;

const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const SAFE_RELATIVE_PATH = /^(?!\/)(?!.*(?:^|\/)\.\.(?:\/|$))[A-Za-z0-9._/-]+$/;
const SAFE_RELEASE_ID = /^[a-z0-9][a-z0-9-]{7,95}$/;
const REQUIRED_ARTIFACT_KINDS = [
  "build-log",
  "test-report",
  "seed-cleanup-report",
  "candidate-metadata",
  "golden-path-contract",
  "smoke-verifier",
  "browser-trace",
  "screenshot",
  "accessibility-summary",
  "console-network-summary",
] as const;

export type ReleaseEvidenceArtifactKind = (typeof REQUIRED_ARTIFACT_KINDS)[number];

export type RedactionDeclaration = {
  noRawCredentials: true;
  noRawUrls: true;
  noCustomerContent: true;
};

export type ReleaseEvidenceArtifact = {
  kind: ReleaseEvidenceArtifactKind;
  relativePath: string;
  sha256: string;
  collectedAt: string;
  expiresAt: string;
  redaction: RedactionDeclaration;
};

export type LocalSmokeProof = {
  schemaVersion: "LOCAL-SMOKE-PROOF-v1";
  releaseId: string;
  candidateSha: string;
  environment: string;
  route: string;
  authenticated: true;
  status: "pass";
  collectedAt: string;
  expiresAt: string;
  artifactSha256: string;
};

export type BuildReleaseEvidenceBundleInput = {
  releaseId: string;
  candidate: ReleaseCandidateMetadata;
  candidateContext: CandidateValidationContext;
  goldenPathInput: BetaGoldenPathValidationInput;
  artifacts: ReleaseEvidenceArtifact[];
  smokeProof: LocalSmokeProof;
  now?: Date;
};

export type ReleaseEvidenceBundle = {
  schemaVersion: typeof RELEASE_EVIDENCE_BUNDLE_VERSION;
  producerVersion: typeof RELEASE_EVIDENCE_BUNDLE_VERSION;
  releaseId: string;
  candidateId: string;
  candidateSha: string;
  environment: string;
  migrationHead: string;
  goldenPathContractVersion: typeof BETA_GOLDEN_PATH_CONTRACT_VERSION;
  goldenPathContractDigest: string;
  artifactCount: number;
  artifactDigests: Array<{ kind: ReleaseEvidenceArtifactKind; sha256: string; expiresAt: string }>;
  smokeArtifactSha256: string;
  generatedAt: string;
  expiresAt: string;
  redaction: RedactionDeclaration;
  providerBacked: false;
  productionReleaseProof: false;
  localContractReady: true;
};

function fail(message: string): never {
  throw new Error(`Invalid release evidence bundle: ${message}`);
}

function parseTimestamp(value: string, field: string) {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) fail(`${field} is not a valid timestamp`);
  return parsed;
}

function assertFresh(collectedAt: string, expiresAt: string, now: Date, label: string) {
  const collected = parseTimestamp(collectedAt, `${label} collectedAt`);
  const expires = parseTimestamp(expiresAt, `${label} expiresAt`);
  if (collected > now.getTime() || expires <= collected || expires <= now.getTime()) fail(`${label} is stale or expired`);
  return expires;
}

function assertSafeArtifact(artifact: ReleaseEvidenceArtifact, now: Date) {
  if (!SAFE_RELATIVE_PATH.test(artifact.relativePath) || artifact.relativePath.includes("://")) {
    fail(`artifact ${artifact.kind} has an unsafe path`);
  }
  if (!SHA256_PATTERN.test(artifact.sha256)) fail(`artifact ${artifact.kind} has an invalid digest`);
  if (!artifact.redaction?.noRawCredentials || !artifact.redaction.noRawUrls || !artifact.redaction.noCustomerContent) {
    fail(`artifact ${artifact.kind} has an incomplete redaction declaration`);
  }
  return assertFresh(artifact.collectedAt, artifact.expiresAt, now, `artifact ${artifact.kind}`);
}

function sortedArtifactKinds(artifacts: readonly ReleaseEvidenceArtifact[]) {
  return [...artifacts].map((artifact) => artifact.kind).sort((left, right) => left.localeCompare(right));
}

export function verifyLocalSmokeProof(
  smokeProof: LocalSmokeProof,
  candidate: ReleaseCandidateMetadata,
  releaseId: string,
  now = new Date(),
): LocalSmokeProof {
  if (smokeProof.schemaVersion !== "LOCAL-SMOKE-PROOF-v1") fail("smoke proof schema is unsupported");
  if (smokeProof.releaseId !== releaseId || smokeProof.candidateSha !== candidate.commitSha) fail("smoke proof release identity does not match candidate");
  if (smokeProof.environment !== candidate.environment) fail("smoke proof environment does not match candidate");
  if (!smokeProof.authenticated) fail("smoke proof is unauthenticated");
  if (smokeProof.status !== "pass") fail("smoke proof did not pass");
  if (!smokeProof.route.startsWith("/") || smokeProof.route.includes("://") || smokeProof.route.includes("[")) {
    fail("smoke proof route is invalid");
  }
  if (!SHA256_PATTERN.test(smokeProof.artifactSha256)) fail("smoke proof artifact digest is invalid");
  assertFresh(smokeProof.collectedAt, smokeProof.expiresAt, now, "smoke proof");
  return smokeProof;
}

export function buildReleaseEvidenceBundle(input: BuildReleaseEvidenceBundleInput): ReleaseEvidenceBundle {
  const now = input.now ?? new Date();
  if (!SAFE_RELEASE_ID.test(input.releaseId)) fail("release ID is invalid");
  const candidate = validateReleaseCandidateMetadata(input.candidate, { ...input.candidateContext, now });
  if (input.goldenPathInput.candidate.metadataSha256 !== candidate.metadataSha256) fail("golden path references a different candidate");
  const goldenPath = validateBetaGoldenPathContract({
    ...input.goldenPathInput,
    candidate,
    candidateContext: { ...input.candidateContext, now },
  });
  const requiredKinds = [...REQUIRED_ARTIFACT_KINDS].sort((left, right) => left.localeCompare(right));
  const actualKinds = sortedArtifactKinds(input.artifacts);
  if (new Set(actualKinds).size !== actualKinds.length || JSON.stringify(actualKinds) !== JSON.stringify(requiredKinds)) {
    fail("retained artifact bundle is missing, duplicated, or contains an unknown class");
  }
  const artifactExpiries = input.artifacts.map((artifact) => assertSafeArtifact(artifact, now));
  const smokeProof = verifyLocalSmokeProof(input.smokeProof, candidate, input.releaseId, now);
  const smokeArtifact = input.artifacts.find((artifact) => artifact.kind === "smoke-verifier");
  if (!smokeArtifact || smokeArtifact.sha256 !== smokeProof.artifactSha256) fail("smoke proof is not bound to its retained artifact");
  const expiresAt = new Date(Math.min(...artifactExpiries, parseTimestamp(smokeProof.expiresAt, "smoke proof expiresAt"))).toISOString();

  return {
    schemaVersion: RELEASE_EVIDENCE_BUNDLE_VERSION,
    producerVersion: RELEASE_EVIDENCE_BUNDLE_VERSION,
    releaseId: input.releaseId,
    candidateId: candidate.candidateId,
    candidateSha: candidate.commitSha,
    environment: candidate.environment,
    migrationHead: candidate.migrationHead,
    goldenPathContractVersion: BETA_GOLDEN_PATH_CONTRACT_VERSION,
    goldenPathContractDigest: createHash("sha256").update(JSON.stringify(goldenPath)).digest("hex"),
    artifactCount: input.artifacts.length,
    artifactDigests: [...input.artifacts]
      .sort((left, right) => left.kind.localeCompare(right.kind))
      .map((artifact) => ({ kind: artifact.kind, sha256: artifact.sha256, expiresAt: artifact.expiresAt })),
    smokeArtifactSha256: smokeProof.artifactSha256,
    generatedAt: now.toISOString(),
    expiresAt,
    redaction: { noRawCredentials: true, noRawUrls: true, noCustomerContent: true },
    providerBacked: false,
    productionReleaseProof: false,
    localContractReady: true,
  };
}

export function renderReleaseEvidenceBundleMarkdown(bundle: ReleaseEvidenceBundle) {
  return [
    "# Local Release Evidence Bundle",
    "",
    `Release ID: ${bundle.releaseId}`,
    `Candidate ID: ${bundle.candidateId}`,
    `Candidate SHA: ${bundle.candidateSha}`,
    `Environment: ${bundle.environment}`,
    `Migration head: ${bundle.migrationHead}`,
    `Golden-path contract digest: ${bundle.goldenPathContractDigest}`,
    `Artifact count: ${bundle.artifactCount}`,
    `Expires: ${bundle.expiresAt}`,
    "Provider-backed proof: no",
    "Production release proof: no",
    "",
  ].join("\n");
}
