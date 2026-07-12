import { describe, expect, it } from "vitest";

import {
  BETA_GOLDEN_PATH_STEPS,
  validateBetaGoldenPathContract,
  type BetaGoldenPathValidationInput,
} from "../../scripts/lib/beta-golden-path-contract";
import { createReleaseCandidateMetadata } from "../../scripts/lib/release-candidate-metadata";
import { createBetaFixtureCleanupManifest } from "../../scripts/e2e/beta-fixture-contract";

const digest = "a".repeat(64);
const sha = "b".repeat(40);
const fixtureSigningKey = "local-only-fixture-signing-key";
const requiredPaths = [".open-next/assets/BUILD_ID", "open-next.config.ts", "worker.ts", "wrangler.jsonc"];

function input(): BetaGoldenPathValidationInput {
  const manifest = createBetaFixtureCleanupManifest({
    runId: "release-20260712-a1b2c3d4",
    cleanupSigningKey: fixtureSigningKey,
    environment: { host: "http://golden-path.test", bindingNames: ["ARCH_DB"], approvedBindingNames: ["ARCH_DB"] },
  });
  const fixtureReceipt = {
    schemaVersion: manifest.schemaVersion,
    fixtureRunId: manifest.fixtureRunId,
    hostDigest: manifest.hostDigest,
    cleanupManifestSha256: manifest.manifestSha256,
    recordCount: manifest.records.length,
    recordKinds: manifest.records.map((record) => record.kind),
  } as const;
  return {
    candidate: createReleaseCandidateMetadata({
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
    }),
    candidateContext: {
      now: new Date("2029-01-01T00:00:00.000Z"),
      expectedCommitSha: sha,
      expectedEnvironment: "production",
      expectedArtifactId: "worker-build-123",
      expectedArtifactSha256: digest,
      requiredWorkerInputPaths: requiredPaths,
    },
    fixture: {
      manifest,
      cleanupSigningKey: fixtureSigningKey,
      setupReceipt: { ...fixtureReceipt, state: "ready" },
      cleanupReceipt: { ...fixtureReceipt, state: "cleaned" },
      foreignCanaryIntact: true,
      dirtyOwnedRecordCount: 0,
      containsRawCredentialMaterial: false,
    },
    receiptOwners: ["activation", "operating-auth", "estimate-intelligence", "calculation-parity", "publisher", "activity"],
  };
}

describe("beta golden path contract", () => {
  it("binds exactly twenty canonical steps to verified candidate and cleaned fixture proof", () => {
    const receipt = validateBetaGoldenPathContract(input());

    expect(BETA_GOLDEN_PATH_STEPS).toHaveLength(20);
    expect(receipt.stepIds).toEqual(Array.from({ length: 20 }, (_, index) => index + 1));
    expect(receipt.browserPolicy).toEqual({ arbitrarySleepsAllowed: false, defaultSkipAllowed: false, productAssertionRetriesAllowed: false });
    expect(JSON.stringify(receipt)).not.toContain("golden-path.test");
    expect(JSON.stringify(receipt)).not.toContain(fixtureSigningKey);
  });

  it.each([
    ["missing fixture cleanup", (value: BetaGoldenPathValidationInput) => ({ ...value, fixture: { ...value.fixture, cleanupReceipt: { ...value.fixture.cleanupReceipt, state: "ready" as const } } })],
    ["dirty fixture cleanup", (value: BetaGoldenPathValidationInput) => ({ ...value, fixture: { ...value.fixture, dirtyOwnedRecordCount: 1 } })],
    ["tampered fixture manifest", (value: BetaGoldenPathValidationInput) => ({ ...value, fixture: { ...value.fixture, manifest: { ...value.fixture.manifest, manifestSha256: digest } } })],
    ["raw credential leak", (value: BetaGoldenPathValidationInput) => ({ ...value, fixture: { ...value.fixture, containsRawCredentialMaterial: true } })],
    ["incomplete feature receipts", (value: BetaGoldenPathValidationInput) => ({ ...value, receiptOwners: value.receiptOwners.slice(1) })],
    ["cancelled CI candidate", (value: BetaGoldenPathValidationInput) => ({ ...value, candidate: { ...value.candidate, workflow: { ...value.candidate.workflow, conclusion: "cancelled" } } })],
  ])("fails closed on %s", (_label, mutate) => {
    expect(() => validateBetaGoldenPathContract(mutate(input()))).toThrow(/Invalid (beta golden path contract|release candidate metadata|beta golden fixture)/);
  });
});
