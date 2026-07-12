import { describe, expect, it } from "vitest";

import { buildBetaReleaseReadiness, renderBetaReleaseReadinessMarkdown, type BetaReleaseReadinessInput } from "../../scripts/lib/beta-release-readiness";
import { createReleaseCandidateMetadata } from "../../scripts/lib/release-candidate-metadata";
import { createBetaFixtureCleanupManifest } from "../../scripts/e2e/beta-fixture-contract";

const digest = "a".repeat(64);
const sha = "b".repeat(40);
const fixtureSigningKey = "local-only-fixture-signing-key";
const now = new Date("2029-01-01T00:00:00.000Z");
const expiresAt = "2029-01-02T00:00:00.000Z";
const releaseId = "release-20260712-a1b2c3d4";
const requiredPaths = [".open-next/assets/BUILD_ID", "open-next.config.ts", "worker.ts", "wrangler.jsonc"];
const packIds = ["activity-history-mapping", "beta-operating-contract", "beta-readiness-program", "calculation-and-output-parity", "estimate-intelligence-and-price-governance", "first-user-activation-and-cohort-operations", "hosted-d1-recovery-and-data-resilience", "publisher-and-shared-pages", "release-integrity-and-golden-path"] as const;

function input(): BetaReleaseReadinessInput {
  const manifest = createBetaFixtureCleanupManifest({ runId: "release-20260712-a1b2c3d4", cleanupSigningKey: fixtureSigningKey, environment: { host: "http://golden-path.test", bindingNames: ["ARCH_DB"], approvedBindingNames: ["ARCH_DB"] } });
  const candidate = createReleaseCandidateMetadata({
    candidateId: "candidate-20260712-1", commitSha: sha, environment: "production", workflow: { id: "ci", runId: "123", attempt: 1, conclusion: "success" },
    toolchain: { bunVersion: "1.3.14", nodeVersion: "22.12.0", lockfileSha256: digest }, migrationHead: "0069_client_portal_message_visibility.sql", producerVersion: "release-candidate-producer-v1",
    artifact: { id: "worker-build-123", sha256: digest, immutable: true }, expiresAt: "2030-01-01T00:00:00.000Z", workerInputManifest: requiredPaths.map((path) => ({ path, sha256: digest })),
    configuration: { bindingNames: ["ARCH_DB"], nonSecretInputNames: ["NODE_ENV"], secretBindingNames: ["BETTER_AUTH_SECRET"], providerVersionIds: ["opennextjs-cloudflare@1.20.1"] },
  });
  const fixtureReceipt = { schemaVersion: manifest.schemaVersion, fixtureRunId: manifest.fixtureRunId, hostDigest: manifest.hostDigest, cleanupManifestSha256: manifest.manifestSha256, recordCount: manifest.records.length, recordKinds: manifest.records.map((record) => record.kind) } as const;
  const artifactKinds = ["build-log", "test-report", "seed-cleanup-report", "candidate-metadata", "golden-path-contract", "smoke-verifier", "browser-trace", "screenshot", "accessibility-summary", "console-network-summary"] as const;
  const candidateContext = { now, expectedCommitSha: sha, expectedEnvironment: "production", expectedArtifactId: "worker-build-123", expectedArtifactSha256: digest, requiredWorkerInputPaths: requiredPaths };
  return {
    evidenceBundleInput: {
      releaseId, candidate, candidateContext,
      goldenPathInput: { candidate, candidateContext, fixture: { manifest, cleanupSigningKey: fixtureSigningKey, setupReceipt: { ...fixtureReceipt, state: "ready" }, cleanupReceipt: { ...fixtureReceipt, state: "cleaned" }, foreignCanaryIntact: true, dirtyOwnedRecordCount: 0, containsRawCredentialMaterial: false }, receiptOwners: ["activation", "operating-auth", "estimate-intelligence", "calculation-parity", "publisher", "activity"] },
      artifacts: artifactKinds.map((kind) => ({ kind, relativePath: `evidence/${kind}.json`, sha256: digest, collectedAt: "2028-12-31T23:00:00.000Z", expiresAt, redaction: { noRawCredentials: true, noRawUrls: true, noCustomerContent: true } })),
      smokeProof: { schemaVersion: "LOCAL-SMOKE-PROOF-v1", releaseId, candidateSha: sha, environment: "production", route: "/internal/release-contract", authenticated: true, status: "pass", collectedAt: "2028-12-31T23:00:00.000Z", expiresAt, artifactSha256: digest },
    },
    packReceipts: packIds.map((packId) => ({ schemaVersion: "PACK-HANDOFF-RECEIPT-v1", packId, releaseId, candidateSha: sha, environment: "production", producerVersion: "BETA-RELEASE-READINESS-v1", sourceRevision: sha, collectedAt: "2028-12-31T23:00:00.000Z", expiresAt, status: "ready" })),
    capabilities: [
      { capabilityId: "corporate-accounts", includedInCandidate: false, sourceRevision: sha, fileScope: ["src/lib/corporate-accounts.ts"], exclusion: { schemaVersion: "CANDIDATE-DEPENDENCY-DISPOSITION-v1", sourceRevision: sha, fileScope: ["src/lib/corporate-accounts.ts"], rationale: "Not present in this candidate input graph." } },
      { capabilityId: "release-contract", includedInCandidate: true, sourceRevision: sha, fileScope: ["scripts/lib/beta-release-readiness.ts"], validatedReceipt: { producerVersion: "release-contract-v1", candidateSha: sha, expiresAt } },
    ],
    controls: [{ key: "github-ruleset", status: "unknown", providerBacked: false }], blockers: [], currentMigrationHead: "0069_client_portal_message_visibility.sql", now,
  };
}

describe("beta release readiness", () => {
  it("renders a canonical local NO_GO truth without promoting provider proof", () => {
    const readiness = buildBetaReleaseReadiness(input());
    const markdown = renderBetaReleaseReadinessMarkdown(readiness);
    expect(readiness.decision).toBe("NO_GO");
    expect(readiness.localContractReady).toBe(true);
    expect(readiness.providerBacked).toBe(false);
    expect(readiness.blockers).toContain("control:github-ruleset:unknown");
    expect(markdown).toContain("Production release proof: no");
  });

  it.each([
    ["missing pack receipt", (value: BetaReleaseReadinessInput) => ({ ...value, packReceipts: value.packReceipts.slice(1) })],
    ["stale pack receipt", (value: BetaReleaseReadinessInput) => ({ ...value, packReceipts: value.packReceipts.map((receipt, index) => index === 0 ? { ...receipt, expiresAt: "2028-12-31T23:30:00.000Z" } : receipt) })],
    ["wrong pack producer", (value: BetaReleaseReadinessInput) => ({ ...value, packReceipts: value.packReceipts.map((receipt, index) => index === 0 ? { ...receipt, producerVersion: "wrong" } : receipt) })],
    ["mixed release identity", (value: BetaReleaseReadinessInput) => ({ ...value, packReceipts: value.packReceipts.map((receipt, index) => index === 0 ? { ...receipt, releaseId: "release-foreign-20260712" } : receipt) })],
    ["migration drift", (value: BetaReleaseReadinessInput) => ({ ...value, currentMigrationHead: "0070_drift.sql" })],
    ["included capability without receipt", (value: BetaReleaseReadinessInput) => ({ ...value, capabilities: value.capabilities.map((capability) => capability.capabilityId === "release-contract" ? { ...capability, validatedReceipt: undefined } : capability) })],
    ["excluded capability with candidate scope", (value: BetaReleaseReadinessInput) => ({ ...value, capabilities: value.capabilities.map((capability) => capability.capabilityId === "corporate-accounts" ? { ...capability, exclusion: { ...capability.exclusion!, sourceRevision: "c".repeat(40) } } : capability) })],
    ["open critical blocker", (value: BetaReleaseReadinessInput) => ({ ...value, blockers: [{ id: "data-loss", severity: "critical" as const, status: "open" as const }] })],
    ["contradictory README claim", (value: BetaReleaseReadinessInput) => ({ ...value, manualReadmeClaim: { generatedAt: "2030-01-01T00:00:00.000Z", decision: "GO" as const, candidateSha: sha } })],
  ])("rejects %s", (_label, mutate) => {
    const value = mutate(input());
    if (_label === "open critical blocker") {
      expect(buildBetaReleaseReadiness(value).blockers).toContain("blocker:data-loss");
    } else {
      expect(() => buildBetaReleaseReadiness(value)).toThrow("Invalid beta release readiness");
    }
  });
});
