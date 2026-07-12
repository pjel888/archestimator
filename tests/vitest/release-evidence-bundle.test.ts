import { describe, expect, it } from "vitest";

import { buildReleaseEvidenceBundle, renderReleaseEvidenceBundleMarkdown, type BuildReleaseEvidenceBundleInput } from "../../scripts/lib/release-evidence-bundle";
import { createReleaseCandidateMetadata } from "../../scripts/lib/release-candidate-metadata";
import { createBetaFixtureCleanupManifest } from "../../scripts/e2e/beta-fixture-contract";

const digest = "a".repeat(64);
const sha = "b".repeat(40);
const fixtureSigningKey = "local-only-fixture-signing-key";
const now = new Date("2029-01-01T00:00:00.000Z");
const expiresAt = "2029-01-02T00:00:00.000Z";
const requiredPaths = [".open-next/assets/BUILD_ID", "open-next.config.ts", "worker.ts", "wrangler.jsonc"];

function input(): BuildReleaseEvidenceBundleInput {
  const manifest = createBetaFixtureCleanupManifest({
    runId: "release-20260712-a1b2c3d4",
    cleanupSigningKey: fixtureSigningKey,
    environment: { host: "http://golden-path.test", bindingNames: ["ARCH_DB"], approvedBindingNames: ["ARCH_DB"] },
  });
  const candidate = createReleaseCandidateMetadata({
    candidateId: "candidate-20260712-1",
    commitSha: sha,
    environment: "production",
    workflow: { id: "ci", runId: "123", attempt: 1, conclusion: "success" },
    toolchain: { bunVersion: "1.3.14", nodeVersion: "22.12.0", lockfileSha256: digest },
    migrationHead: "0069_client_portal_message_visibility.sql",
    producerVersion: "release-candidate-producer-v1",
    artifact: { id: "worker-build-123", sha256: digest, immutable: true },
    expiresAt: "2030-01-01T00:00:00.000Z",
    workerInputManifest: requiredPaths.map((path) => ({ path, sha256: digest })),
    configuration: { bindingNames: ["ARCH_DB"], nonSecretInputNames: ["NODE_ENV"], secretBindingNames: ["BETTER_AUTH_SECRET"], providerVersionIds: ["opennextjs-cloudflare@1.20.1"] },
  });
  const fixtureReceipt = {
    schemaVersion: manifest.schemaVersion,
    fixtureRunId: manifest.fixtureRunId,
    hostDigest: manifest.hostDigest,
    cleanupManifestSha256: manifest.manifestSha256,
    recordCount: manifest.records.length,
    recordKinds: manifest.records.map((record) => record.kind),
  } as const;
  const artifacts = ["build-log", "test-report", "seed-cleanup-report", "candidate-metadata", "golden-path-contract", "smoke-verifier", "browser-trace", "screenshot", "accessibility-summary", "console-network-summary"] as const;
  return {
    releaseId: "release-20260712-a1b2c3d4",
    candidate,
    candidateContext: { now, expectedCommitSha: sha, expectedEnvironment: "production", expectedArtifactId: "worker-build-123", expectedArtifactSha256: digest, requiredWorkerInputPaths: requiredPaths },
    goldenPathInput: {
      candidate,
      candidateContext: { now, expectedCommitSha: sha, expectedEnvironment: "production", expectedArtifactId: "worker-build-123", expectedArtifactSha256: digest, requiredWorkerInputPaths: requiredPaths },
      fixture: { manifest, cleanupSigningKey: fixtureSigningKey, setupReceipt: { ...fixtureReceipt, state: "ready" }, cleanupReceipt: { ...fixtureReceipt, state: "cleaned" }, foreignCanaryIntact: true, dirtyOwnedRecordCount: 0, containsRawCredentialMaterial: false },
      receiptOwners: ["activation", "operating-auth", "estimate-intelligence", "calculation-parity", "publisher", "activity"],
    },
    artifacts: artifacts.map((kind) => ({ kind, relativePath: `evidence/${kind}.json`, sha256: digest, collectedAt: "2028-12-31T23:00:00.000Z", expiresAt, redaction: { noRawCredentials: true, noRawUrls: true, noCustomerContent: true } })),
    smokeProof: { schemaVersion: "LOCAL-SMOKE-PROOF-v1", releaseId: "release-20260712-a1b2c3d4", candidateSha: sha, environment: "production", route: "/internal/release-contract", authenticated: true, status: "pass", collectedAt: "2028-12-31T23:00:00.000Z", expiresAt, artifactSha256: digest },
    now,
  };
}

describe("release evidence bundle", () => {
  it("produces a bounded redacted local contract without claiming hosted proof", () => {
    const bundle = buildReleaseEvidenceBundle(input());
    const markdown = renderReleaseEvidenceBundleMarkdown(bundle);

    expect(bundle.localContractReady).toBe(true);
    expect(bundle.providerBacked).toBe(false);
    expect(bundle.productionReleaseProof).toBe(false);
    expect(bundle.artifactCount).toBe(10);
    expect(markdown).toContain("Provider-backed proof: no");
    expect(JSON.stringify(bundle)).not.toContain("golden-path.test");
    expect(JSON.stringify(bundle)).not.toContain(fixtureSigningKey);
  });

  it.each([
    ["missing retained artifact", (value: BuildReleaseEvidenceBundleInput) => ({ ...value, artifacts: value.artifacts.slice(1) })],
    ["expired artifact", (value: BuildReleaseEvidenceBundleInput) => ({ ...value, artifacts: value.artifacts.map((artifact, index) => index === 0 ? { ...artifact, expiresAt: "2028-12-31T23:30:00.000Z" } : artifact) })],
    ["raw URL artifact path", (value: BuildReleaseEvidenceBundleInput) => ({ ...value, artifacts: value.artifacts.map((artifact, index) => index === 0 ? { ...artifact, relativePath: "https://example.test/secret" } : artifact) })],
    ["incomplete redaction", (value: BuildReleaseEvidenceBundleInput) => ({ ...value, artifacts: value.artifacts.map((artifact, index) => index === 0 ? { ...artifact, redaction: { ...artifact.redaction, noRawUrls: false as const } } : artifact) })],
    ["unauthenticated smoke", (value: BuildReleaseEvidenceBundleInput) => ({ ...value, smokeProof: { ...value.smokeProof, authenticated: false as const } })],
    ["wrong smoke route", (value: BuildReleaseEvidenceBundleInput) => ({ ...value, smokeProof: { ...value.smokeProof, route: "https://archestimator.com/" } })],
    ["wrong smoke SHA", (value: BuildReleaseEvidenceBundleInput) => ({ ...value, smokeProof: { ...value.smokeProof, candidateSha: "c".repeat(40) } })],
    ["partial fixture proof", (value: BuildReleaseEvidenceBundleInput) => ({ ...value, goldenPathInput: { ...value.goldenPathInput, fixture: { ...value.goldenPathInput.fixture, dirtyOwnedRecordCount: 1 } } })],
  ])("fails closed on %s", (_label, mutate) => {
    expect(() => buildReleaseEvidenceBundle(mutate(input()))).toThrow(/Invalid (release evidence bundle|beta golden path contract)/);
  });
});
