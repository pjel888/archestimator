import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  createReleaseCandidateArtifact,
  verifyReleaseCandidatePayloadDigest,
  writeReleaseCandidateArtifact,
} from "../../scripts/generate-release-candidate-artifact";

const temporaryDirectories: string[] = [];
const SHA = "b".repeat(40);

function fixtureRoot() {
  const root = mkdtempSync(join(tmpdir(), "release-candidate-artifact-"));
  temporaryDirectories.push(root);
  mkdirSync(join(root, ".open-next", "assets"), { recursive: true });
  mkdirSync(join(root, "src", "worker"), { recursive: true });
  writeFileSync(join(root, "bun.lock"), "lockfile\n");
  writeFileSync(join(root, "wrangler.jsonc"), '{"name":"archestimator-proof"}\n');
  writeFileSync(join(root, "open-next.config.ts"), "export default {};\n");
  writeFileSync(join(root, "worker.ts"), 'import { workerValue } from "./src/worker/value"; export default workerValue;\n');
  writeFileSync(join(root, "src", "worker", "value.ts"), "export const workerValue = 1;\n");
  writeFileSync(join(root, ".open-next", "assets", "BUILD_ID"), "candidate-build\n");
  return root;
}

function input(repositoryRoot = fixtureRoot()) {
  return {
    repositoryRoot,
    outputDirectory: join(repositoryRoot, "candidate"),
    candidateId: "candidate-20260712-1",
    commitSha: SHA,
    environment: "production",
    workflowId: "CI",
    workflowRunId: "123",
    workflowAttempt: 1,
    migrationHead: "0069_client_portal_message_visibility.sql",
    expiresAt: "2030-01-01T00:00:00.000Z",
    artifactId: "release-candidate-123",
    bindingNames: ["ARCH_DB", "ARCH_UPLOADS_R2"],
    nonSecretInputNames: ["NODE_ENV"],
    secretBindingNames: ["BETTER_AUTH_SECRET"],
    providerVersionIds: ["opennextjs-cloudflare@1.20.1"],
    nodeVersion: "22.12.0",
    bunVersion: "1.3.14",
  };
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) rmSync(directory, { recursive: true, force: true });
});

describe("release candidate artifact producer", () => {
  it("creates deterministic metadata and the exact input-path artifact", () => {
    const first = createReleaseCandidateArtifact(input());
    const second = createReleaseCandidateArtifact(input());

    expect(first.artifactSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(first.metadata.artifact.sha256).toBe(first.artifactSha256);
    expect(first.workerInputPaths).toEqual([
      ".open-next/assets/BUILD_ID",
      "open-next.config.ts",
      "src/worker/value.ts",
      "worker.ts",
      "wrangler.jsonc",
    ]);
    expect(second).toEqual(first);
  });

  it("changes the candidate artifact digest when a Worker input changes", () => {
    const values = input();
    const first = createReleaseCandidateArtifact(values);
    writeFileSync(join(values.repositoryRoot, "src", "worker", "value.ts"), "export const workerValue = 2;\n");
    const second = createReleaseCandidateArtifact(values);

    expect(second.artifactSha256).not.toBe(first.artifactSha256);
    expect(second.metadata.metadataSha256).not.toBe(first.metadata.metadataSha256);
  });

  it("writes a canonical digest for the exact release workflow payload", () => {
    const values = input();
    const artifact = writeReleaseCandidateArtifact(values);

    expect(existsSync(join(values.outputDirectory, "release-candidate-metadata.json"))).toBe(true);
    expect(existsSync(join(values.outputDirectory, "worker-input-paths.json"))).toBe(true);
    expect(existsSync(join(values.outputDirectory, "release-candidate-payload-digest.json"))).toBe(true);
    expect(artifact.metadata.artifact.id).toBe("release-candidate-123");
    expect(verifyReleaseCandidatePayloadDigest(values.outputDirectory)).toEqual(artifact.payloadDigest);
  });

  it("rejects a downloaded payload whose content differs from its receipt", () => {
    const values = input();
    writeReleaseCandidateArtifact(values);
    const workerInputPathsPath = join(values.outputDirectory, "worker-input-paths.json");
    writeFileSync(workerInputPathsPath, `${readFileSync(workerInputPathsPath, "utf8")}\n`);

    expect(() => verifyReleaseCandidatePayloadDigest(values.outputDirectory)).toThrow("candidate upload payload digest");
  });
});
