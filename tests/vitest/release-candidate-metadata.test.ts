import { describe, expect, it } from "vitest";

import {
  createReleaseCandidateMetadata,
  RELEASE_CANDIDATE_METADATA_VERSION,
  validateReleaseCandidateMetadata,
} from "../../scripts/lib/release-candidate-metadata";

const DIGEST = "a".repeat(64);
const SHA = "b".repeat(40);
const requiredPaths = [".open-next/assets/BUILD_ID", "open-next.config.ts", "worker.ts", "wrangler.jsonc"];

function candidate() {
  return createReleaseCandidateMetadata({
    candidateId: "candidate-20260712-1",
    commitSha: SHA,
    environment: "production",
    workflow: { id: "ci", runId: "123", attempt: 1, conclusion: "success" },
    toolchain: { bunVersion: "1.3.14", nodeVersion: "22.12.0", lockfileSha256: DIGEST },
    migrationHead: "0069_client_portal_message_visibility.sql",
    producerVersion: "release-candidate-producer-v1",
    artifact: { id: "worker-build-123", sha256: DIGEST, immutable: true },
    expiresAt: "2030-01-01T00:00:00.000Z",
    workerInputManifest: [...requiredPaths].reverse().map((path) => ({ path, sha256: DIGEST })),
    configuration: {
      bindingNames: ["ARCH_DB", "ARCH_UPLOADS_R2"],
      nonSecretInputNames: ["NODE_ENV"],
      secretBindingNames: ["BETTER_AUTH_SECRET"],
      providerVersionIds: ["opennextjs-cloudflare@1.20.1"],
    },
  });
}

function context() {
  return {
    now: new Date("2029-01-01T00:00:00.000Z"),
    expectedCommitSha: SHA,
    expectedEnvironment: "production",
    expectedArtifactId: "worker-build-123",
    expectedArtifactSha256: DIGEST,
    requiredWorkerInputPaths: requiredPaths,
  };
}

describe("release candidate metadata", () => {
  it("canonicalizes sorted manifests and named configuration without secret values", () => {
    const metadata = candidate();
    expect(metadata.schemaVersion).toBe(RELEASE_CANDIDATE_METADATA_VERSION);
    expect(metadata.workerInputManifest.map((entry) => entry.path)).toEqual(requiredPaths);
    expect(metadata.configuration.bindingNames).toEqual(["ARCH_DB", "ARCH_UPLOADS_R2"]);
    expect(metadata.metadataSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(validateReleaseCandidateMetadata(metadata, context())).toEqual(metadata);
  });

  it.each([
    ["rebuilt SHA", (metadata: ReturnType<typeof candidate>) => ({ ...metadata, commitSha: "c".repeat(40) })],
    ["mutated artifact", (metadata: ReturnType<typeof candidate>) => ({ ...metadata, artifact: { ...metadata.artifact, sha256: "d".repeat(64) } })],
    ["cancelled CI run", (metadata: ReturnType<typeof candidate>) => ({ ...metadata, workflow: { ...metadata.workflow, conclusion: "cancelled" } })],
    ["skipped CI run", (metadata: ReturnType<typeof candidate>) => ({ ...metadata, workflow: { ...metadata.workflow, conclusion: "skipped" } })],
    ["expired metadata", (metadata: ReturnType<typeof candidate>) => ({ ...metadata, expiresAt: "2028-01-01T00:00:00.000Z" })],
    ["omitted Worker input", (metadata: ReturnType<typeof candidate>) => ({ ...metadata, workerInputManifest: metadata.workerInputManifest.slice(1) })],
    ["changed Worker input", (metadata: ReturnType<typeof candidate>) => ({ ...metadata, workerInputManifest: metadata.workerInputManifest.map((entry, index) => index === 0 ? { ...entry, sha256: "e".repeat(64) } : entry) })],
    ["mutable artifact", (metadata: ReturnType<typeof candidate>) => ({ ...metadata, artifact: { ...metadata.artifact, immutable: false as const } })],
  ])("rejects %s", (_name, mutate) => {
    const metadata = mutate(candidate());
    expect(() => validateReleaseCandidateMetadata(metadata, context())).toThrow("Invalid release candidate metadata");
  });

  it("rejects secret values and metadata digest tampering", () => {
    expect(() => createReleaseCandidateMetadata({
      ...candidate(),
      configuration: { ...candidate().configuration, secretBindingNames: ["SECRET=raw-value"] },
    })).toThrow("unsafe identifier");
    const metadata = { ...candidate(), metadataSha256: DIGEST };
    expect(() => validateReleaseCandidateMetadata(metadata, context())).toThrow("metadata digest");
  });
});
