#!/usr/bin/env bun

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { resolve, relative, sep } from "node:path";

import {
  createReleaseCandidateMetadata,
  validateReleaseCandidateMetadata,
  type CandidateDigestEntry,
  type ReleaseCandidateMetadata,
} from "./lib/release-candidate-metadata";

const ARTIFACT_PRODUCER_VERSION = "release-candidate-artifact-producer-v1";
const ARTIFACT_DIGEST_VERSION = "RELEASE-CANDIDATE-ARTIFACT-DIGEST-v1";
const PAYLOAD_DIGEST_VERSION = "RELEASE-CANDIDATE-PAYLOAD-DIGEST-v1";
const PAYLOAD_DIGEST_FILE = "release-candidate-payload-digest.json";
const RESOLVABLE_EXTENSIONS = [".ts", ".tsx", ".mts", ".cts", ".js", ".mjs", ".cjs", ".json"];

export type ReleaseCandidateArtifactInput = {
  repositoryRoot: string;
  outputDirectory: string;
  candidateId: string;
  commitSha: string;
  environment: string;
  workflowId: string;
  workflowRunId: string;
  workflowAttempt: number;
  migrationHead: string;
  expiresAt: string;
  artifactId: string;
  bindingNames: string[];
  nonSecretInputNames: string[];
  secretBindingNames: string[];
  providerVersionIds: string[];
  nodeVersion: string;
  bunVersion: string;
};

export type ReleaseCandidateArtifact = {
  metadata: ReleaseCandidateMetadata;
  workerInputPaths: string[];
  artifactSha256: string;
};

export type ReleaseCandidatePayloadDigest = {
  schemaVersion: typeof PAYLOAD_DIGEST_VERSION;
  entries: CandidateDigestEntry[];
  payloadSha256: string;
};

function fail(message: string): never {
  throw new Error(`Invalid release candidate artifact: ${message}`);
}

function sha256(value: string | Uint8Array) {
  return createHash("sha256").update(value).digest("hex");
}

function normalizeRepositoryPath(repositoryRoot: string, absolutePath: string) {
  const path = relative(repositoryRoot, absolutePath).split(sep).join("/");
  if (!path || path.startsWith("../") || path === "..") fail("input path escapes repository root");
  return path;
}

function collectDirectoryFiles(repositoryRoot: string, directoryPath: string) {
  const files: string[] = [];
  for (const entry of readdirSync(directoryPath, { withFileTypes: true }).sort((left, right) => left.name.localeCompare(right.name))) {
    const absolutePath = resolve(directoryPath, entry.name);
    if (entry.isDirectory()) files.push(...collectDirectoryFiles(repositoryRoot, absolutePath));
    else if (entry.isFile()) files.push(normalizeRepositoryPath(repositoryRoot, absolutePath));
  }
  return files;
}

function collectPayloadEntries(directoryPath: string) {
  return collectDirectoryFiles(directoryPath, directoryPath)
    .filter((path) => path !== PAYLOAD_DIGEST_FILE)
    .sort((left, right) => left.localeCompare(right))
    .map((path) => ({ path, sha256: sha256(readFileSync(resolve(directoryPath, path))) }));
}

function payloadDigest(entries: readonly CandidateDigestEntry[]) {
  return sha256(JSON.stringify({ schemaVersion: PAYLOAD_DIGEST_VERSION, entries }));
}

export function createReleaseCandidatePayloadDigest(outputDirectory: string): ReleaseCandidatePayloadDigest {
  const entries = collectPayloadEntries(resolve(outputDirectory));
  if (entries.length === 0) fail("candidate upload payload is empty");
  return {
    schemaVersion: PAYLOAD_DIGEST_VERSION,
    entries,
    payloadSha256: payloadDigest(entries),
  };
}

export function verifyReleaseCandidatePayloadDigest(outputDirectory: string): ReleaseCandidatePayloadDigest {
  const directory = resolve(outputDirectory);
  const receiptPath = resolve(directory, PAYLOAD_DIGEST_FILE);
  if (!existsSync(receiptPath) || !statSync(receiptPath).isFile()) fail("candidate upload payload digest is missing");
  const receipt = JSON.parse(readFileSync(receiptPath, "utf8")) as ReleaseCandidatePayloadDigest;
  if (receipt.schemaVersion !== PAYLOAD_DIGEST_VERSION) fail("candidate upload payload digest schema is invalid");
  if (!Array.isArray(receipt.entries) || receipt.entries.length === 0) fail("candidate upload payload digest entries are missing");
  const actualEntries = collectPayloadEntries(directory);
  if (JSON.stringify(receipt.entries) !== JSON.stringify(actualEntries)) fail("candidate upload payload digest entries do not match downloaded payload");
  if (receipt.payloadSha256 !== payloadDigest(actualEntries)) fail("candidate upload payload digest does not match downloaded payload");
  return receipt;
}

function resolveRelativeImport(repositoryRoot: string, importingPath: string, specifier: string) {
  if (!specifier.startsWith(".")) return undefined;
  const basePath = resolve(repositoryRoot, importingPath, "..", specifier);
  const candidates = [
    basePath,
    ...RESOLVABLE_EXTENSIONS.map((extension) => `${basePath}${extension}`),
    ...RESOLVABLE_EXTENSIONS.map((extension) => resolve(basePath, `index${extension}`)),
  ];
  return candidates.find((candidate) => existsSync(candidate) && statSync(candidate).isFile());
}

function collectWorkerModules(repositoryRoot: string, startingPath = "worker.ts") {
  const pending = [startingPath];
  const visited = new Set<string>();
  const importPattern = /(?:import|export)\s+(?:[\s\S]*?\s+from\s+)?["']([^"']+)["']|import\(\s*["']([^"']+)["']\s*\)/g;

  while (pending.length > 0) {
    const currentPath = pending.pop();
    if (!currentPath || visited.has(currentPath)) continue;
    const absolutePath = resolve(repositoryRoot, currentPath);
    if (!existsSync(absolutePath) || !statSync(absolutePath).isFile()) fail(`Worker module is missing: ${currentPath}`);
    visited.add(currentPath);
    const source = readFileSync(absolutePath, "utf8");
    for (const match of source.matchAll(importPattern)) {
      const resolved = resolveRelativeImport(repositoryRoot, currentPath, match[1] ?? match[2]);
      if (resolved) pending.push(normalizeRepositoryPath(repositoryRoot, resolved));
    }
  }

  return [...visited].sort((left, right) => left.localeCompare(right));
}

function collectWorkerInputManifest(repositoryRoot: string): CandidateDigestEntry[] {
  const requiredFiles = ["wrangler.jsonc", "open-next.config.ts"];
  const openNextDirectory = resolve(repositoryRoot, ".open-next");
  if (!existsSync(openNextDirectory) || !statSync(openNextDirectory).isDirectory()) {
    fail(".open-next build output is required before generating a candidate artifact");
  }
  const paths = new Set([...collectWorkerModules(repositoryRoot), ...requiredFiles, ...collectDirectoryFiles(repositoryRoot, openNextDirectory)]);
  return [...paths]
    .sort((left, right) => left.localeCompare(right))
    .map((path) => {
      const absolutePath = resolve(repositoryRoot, path);
      if (!existsSync(absolutePath) || !statSync(absolutePath).isFile()) fail(`candidate input is missing: ${path}`);
      return { path, sha256: sha256(readFileSync(absolutePath)) };
    });
}

function parseCliArguments(args: string[]) {
  const values = new Map<string, string[]>();
  for (let index = 0; index < args.length; index += 2) {
    const flag = args[index];
    const value = args[index + 1];
    if (!flag?.startsWith("--") || value === undefined) fail("CLI arguments must be flag/value pairs");
    const key = flag.slice(2);
    values.set(key, [...(values.get(key) ?? []), value]);
  }
  return values;
}

function requiredArgument(values: Map<string, string[]>, key: string) {
  const value = values.get(key)?.at(-1);
  if (!value) fail(`--${key} is required`);
  return value;
}

function repeatedArgument(values: Map<string, string[]>, key: string) {
  return values.get(key) ?? [];
}

export function createReleaseCandidateArtifact(input: ReleaseCandidateArtifactInput): ReleaseCandidateArtifact {
  const repositoryRoot = resolve(input.repositoryRoot);
  const workerInputManifest = collectWorkerInputManifest(repositoryRoot);
  const workerInputPaths = workerInputManifest.map((entry) => entry.path);
  const artifactSha256 = sha256(JSON.stringify({
    schemaVersion: ARTIFACT_DIGEST_VERSION,
    commitSha: input.commitSha,
    workerInputManifest,
  }));
  const metadata = createReleaseCandidateMetadata({
    candidateId: input.candidateId,
    commitSha: input.commitSha,
    environment: input.environment,
    workflow: {
      id: input.workflowId,
      runId: input.workflowRunId,
      attempt: input.workflowAttempt,
      conclusion: "success",
    },
    toolchain: {
      bunVersion: input.bunVersion,
      nodeVersion: input.nodeVersion,
      lockfileSha256: sha256(readFileSync(resolve(repositoryRoot, "bun.lock"))),
    },
    migrationHead: input.migrationHead,
    producerVersion: ARTIFACT_PRODUCER_VERSION,
    artifact: { id: input.artifactId, sha256: artifactSha256, immutable: true },
    expiresAt: input.expiresAt,
    workerInputManifest,
    configuration: {
      bindingNames: input.bindingNames,
      nonSecretInputNames: input.nonSecretInputNames,
      secretBindingNames: input.secretBindingNames,
      providerVersionIds: input.providerVersionIds,
    },
  });
  validateReleaseCandidateMetadata(metadata, {
    expectedCommitSha: input.commitSha,
    expectedEnvironment: input.environment,
    expectedArtifactId: input.artifactId,
    expectedArtifactSha256: artifactSha256,
    requiredWorkerInputPaths: workerInputPaths,
  });
  return { metadata, workerInputPaths, artifactSha256 };
}

export function writeReleaseCandidateArtifact(input: ReleaseCandidateArtifactInput) {
  const artifact = createReleaseCandidateArtifact(input);
  const outputDirectory = resolve(input.outputDirectory);
  mkdirSync(outputDirectory, { recursive: true });
  writeFileSync(resolve(outputDirectory, "release-candidate-metadata.json"), `${JSON.stringify(artifact.metadata, null, 2)}\n`);
  writeFileSync(resolve(outputDirectory, "worker-input-paths.json"), `${JSON.stringify(artifact.workerInputPaths, null, 2)}\n`);
  const payloadDigest = createReleaseCandidatePayloadDigest(outputDirectory);
  writeFileSync(resolve(outputDirectory, PAYLOAD_DIGEST_FILE), `${JSON.stringify(payloadDigest, null, 2)}\n`);
  return { ...artifact, payloadDigest };
}

if (import.meta.main) {
  const values = parseCliArguments(Bun.argv.slice(2));
  if (values.has("verify-upload-payload")) {
    const payloadDigest = verifyReleaseCandidatePayloadDigest(requiredArgument(values, "output-dir"));
    process.stdout.write(`${JSON.stringify({ payloadSha256: payloadDigest.payloadSha256 })}\n`);
    process.exit(0);
  }
  const artifact = writeReleaseCandidateArtifact({
    repositoryRoot: requiredArgument(values, "repository-root"),
    outputDirectory: requiredArgument(values, "output-dir"),
    candidateId: requiredArgument(values, "candidate-id"),
    commitSha: requiredArgument(values, "commit-sha"),
    environment: requiredArgument(values, "environment"),
    workflowId: requiredArgument(values, "workflow-id"),
    workflowRunId: requiredArgument(values, "workflow-run-id"),
    workflowAttempt: Number(requiredArgument(values, "workflow-attempt")),
    migrationHead: requiredArgument(values, "migration-head"),
    expiresAt: requiredArgument(values, "expires-at"),
    artifactId: requiredArgument(values, "artifact-id"),
    bindingNames: repeatedArgument(values, "binding-name"),
    nonSecretInputNames: repeatedArgument(values, "non-secret-input-name"),
    secretBindingNames: repeatedArgument(values, "secret-binding-name"),
    providerVersionIds: repeatedArgument(values, "provider-version-id"),
    nodeVersion: requiredArgument(values, "node-version"),
    bunVersion: requiredArgument(values, "bun-version"),
  });
  process.stdout.write(`${JSON.stringify({ artifactId: artifact.metadata.artifact.id, artifactSha256: artifact.artifactSha256, metadataSha256: artifact.metadata.metadataSha256, payloadSha256: artifact.payloadDigest.payloadSha256 })}\n`);
}
