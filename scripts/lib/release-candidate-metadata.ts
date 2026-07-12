import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export const RELEASE_CANDIDATE_METADATA_VERSION = "RELEASE-CANDIDATE-METADATA-v1" as const;

const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const GIT_SHA_PATTERN = /^[a-f0-9]{40}$/;
const SAFE_IDENTIFIER_PATTERN = /^[A-Za-z0-9._:@/-]+$/;
const FORBIDDEN_VALUE_KEYS = new Set(["secret", "token", "password", "credential", "privatekey", "apikey", "value"]);

export type CandidateDigestEntry = {
  path: string;
  sha256: string;
};

export type ReleaseCandidateMetadata = {
  schemaVersion: typeof RELEASE_CANDIDATE_METADATA_VERSION;
  candidateId: string;
  commitSha: string;
  environment: string;
  workflow: {
    id: string;
    runId: string;
    attempt: number;
    conclusion: string;
  };
  toolchain: {
    bunVersion: string;
    nodeVersion: string;
    lockfileSha256: string;
  };
  migrationHead: string;
  producerVersion: string;
  artifact: {
    id: string;
    sha256: string;
    immutable: true;
  };
  expiresAt: string;
  workerInputManifest: CandidateDigestEntry[];
  configuration: {
    bindingNames: string[];
    nonSecretInputNames: string[];
    secretBindingNames: string[];
    providerVersionIds: string[];
  };
  metadataSha256: string;
};

export type ReleaseCandidateMetadataInput = Omit<ReleaseCandidateMetadata, "metadataSha256" | "schemaVersion" | "workerInputManifest" | "configuration"> & {
  workerInputManifest: CandidateDigestEntry[];
  configuration: ReleaseCandidateMetadata["configuration"];
};

export type CandidateValidationContext = {
  now?: Date;
  expectedCommitSha: string;
  expectedEnvironment: string;
  expectedArtifactId: string;
  expectedArtifactSha256: string;
  requiredWorkerInputPaths: readonly string[];
};

function fail(message: string): never {
  throw new Error(`Invalid release candidate metadata: ${message}`);
}

function digest(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function sortedUnique(values: readonly string[], field: string) {
  const normalized = values.map((value) => value.trim());
  if (normalized.some((value) => !value || !SAFE_IDENTIFIER_PATTERN.test(value))) {
    fail(`${field} contains an unsafe identifier`);
  }
  if (new Set(normalized).size !== normalized.length) fail(`${field} contains duplicate identifiers`);
  return [...normalized].sort((left, right) => left.localeCompare(right));
}

function normalizeManifest(entries: readonly CandidateDigestEntry[], requireSorted = false) {
  if (entries.length === 0) fail("worker input manifest is empty");
  const normalized = entries.map((entry) => {
    const path = entry.path.trim();
    if (!path || path.startsWith("/") || path.includes("..") || path.includes("\\") || path !== path.replace(/^\.\//, "")) {
      fail("worker input manifest contains a non-canonical path");
    }
    if (!SHA256_PATTERN.test(entry.sha256)) fail(`worker input ${path} has an invalid digest`);
    return { path, sha256: entry.sha256 };
  });
  const sorted = [...normalized].sort((left, right) => left.path.localeCompare(right.path));
  if (requireSorted && JSON.stringify(normalized) !== JSON.stringify(sorted)) fail("worker input manifest is not sorted");
  if (new Set(sorted.map((entry) => entry.path)).size !== sorted.length) fail("worker input manifest contains duplicate paths");
  return sorted;
}

function rejectSecretValues(value: unknown, key = "") : void {
  if (FORBIDDEN_VALUE_KEYS.has(key.toLowerCase())) fail(`forbidden value-bearing field ${key}`);
  if (Array.isArray(value)) {
    value.forEach((item) => rejectSecretValues(item));
  } else if (value && typeof value === "object") {
    for (const [childKey, childValue] of Object.entries(value)) rejectSecretValues(childValue, childKey);
  }
}

function canonicalMetadata(metadata: Omit<ReleaseCandidateMetadata, "metadataSha256">) {
  return {
    ...metadata,
    configuration: {
      bindingNames: sortedUnique(metadata.configuration.bindingNames, "binding names"),
      nonSecretInputNames: sortedUnique(metadata.configuration.nonSecretInputNames, "non-secret input names"),
      secretBindingNames: sortedUnique(metadata.configuration.secretBindingNames, "secret binding names"),
      providerVersionIds: sortedUnique(metadata.configuration.providerVersionIds, "provider version identifiers"),
    },
    workerInputManifest: normalizeManifest(metadata.workerInputManifest),
  };
}

export function createReleaseCandidateMetadata(input: ReleaseCandidateMetadataInput): ReleaseCandidateMetadata {
  const metadata = canonicalMetadata({ ...input, schemaVersion: RELEASE_CANDIDATE_METADATA_VERSION });
  rejectSecretValues(metadata);
  return { ...metadata, metadataSha256: digest(metadata) };
}

export function validateReleaseCandidateMetadata(
  metadata: ReleaseCandidateMetadata,
  context: CandidateValidationContext,
): ReleaseCandidateMetadata {
  rejectSecretValues(metadata);
  normalizeManifest(metadata.workerInputManifest, true);
  if (metadata.schemaVersion !== RELEASE_CANDIDATE_METADATA_VERSION) fail("unknown schema version");
  if (!GIT_SHA_PATTERN.test(metadata.commitSha)) fail("commit SHA must be a full immutable SHA");
  if (metadata.commitSha !== context.expectedCommitSha) fail("commit SHA does not match the verified candidate");
  if (!metadata.environment || metadata.environment !== context.expectedEnvironment) fail("environment does not match the verified candidate");
  if (!metadata.candidateId || !SAFE_IDENTIFIER_PATTERN.test(metadata.candidateId)) fail("candidate id is invalid");
  if (
    !metadata.workflow.id
    || !metadata.workflow.runId
    || !Number.isInteger(metadata.workflow.attempt)
    || metadata.workflow.attempt < 1
    || metadata.workflow.conclusion !== "success"
  ) {
    fail("workflow identity is incomplete");
  }
  if (!metadata.artifact.immutable) fail("artifact is mutable");
  if (metadata.artifact.id !== context.expectedArtifactId || metadata.artifact.sha256 !== context.expectedArtifactSha256) {
    fail("artifact identity does not match the verified candidate");
  }
  if (!SHA256_PATTERN.test(metadata.artifact.sha256) || !SHA256_PATTERN.test(metadata.toolchain.lockfileSha256)) {
    fail("artifact or lockfile digest is invalid");
  }
  if (!metadata.toolchain.bunVersion || !metadata.toolchain.nodeVersion || !metadata.migrationHead || !metadata.producerVersion) {
    fail("toolchain, migration, or producer identity is missing");
  }
  const expiresAt = Date.parse(metadata.expiresAt);
  if (!Number.isFinite(expiresAt) || expiresAt <= (context.now ?? new Date()).getTime()) fail("candidate metadata is expired");
  const canonical = canonicalMetadata({ ...metadata, metadataSha256: undefined } as Omit<ReleaseCandidateMetadata, "metadataSha256">);
  if (metadata.metadataSha256 !== digest(canonical)) fail("metadata digest does not match canonical content");
  const expectedPaths = sortedUnique(context.requiredWorkerInputPaths, "required worker input paths");
  const actualPaths = canonical.workerInputManifest.map((entry) => entry.path);
  if (JSON.stringify(actualPaths) !== JSON.stringify(expectedPaths)) fail("worker input manifest omits, adds, or mutates the verified input set");
  return { ...canonical, metadataSha256: metadata.metadataSha256 };
}

function parseCliArguments(args: string[]) {
  const values = new Map<string, string>();
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index];
    const value = args[index + 1];
    if (!key?.startsWith("--") || !value) fail("CLI arguments must be key/value pairs");
    values.set(key.slice(2), value);
  }
  return values;
}

if (import.meta.main) {
  const argumentsMap = parseCliArguments(process.argv.slice(2));
  const metadataPath = argumentsMap.get("metadata");
  const requiredInputsPath = argumentsMap.get("required-inputs");
  if (!metadataPath || !requiredInputsPath) fail("--metadata and --required-inputs are required");
  const metadata = JSON.parse(readFileSync(resolve(metadataPath), "utf8")) as ReleaseCandidateMetadata;
  const requiredWorkerInputPaths = JSON.parse(readFileSync(resolve(requiredInputsPath), "utf8")) as string[];
  validateReleaseCandidateMetadata(metadata, {
    expectedCommitSha: argumentsMap.get("sha") ?? "",
    expectedEnvironment: argumentsMap.get("environment") ?? "",
    expectedArtifactId: argumentsMap.get("artifact-id") ?? "",
    expectedArtifactSha256: argumentsMap.get("artifact-sha256") ?? "",
    requiredWorkerInputPaths,
  });
  process.stdout.write(`${JSON.stringify({ candidateId: metadata.candidateId, metadataSha256: metadata.metadataSha256 })}\n`);
}
