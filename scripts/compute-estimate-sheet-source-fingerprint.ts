#!/usr/bin/env bun

import { execFileSync } from "node:child_process";
import {
  existsSync,
  lstatSync,
  readdirSync,
  readFileSync,
  readlinkSync,
  rmSync,
  statSync,
} from "node:fs";
import { isAbsolute, relative, resolve, sep } from "node:path";
import {
  assertRegularFile,
  assertTestReceipt,
  assertNoSensitiveValue,
  cliBoolean,
  cliString,
  createRunId,
  defaultPlanRoot,
  ensureDirectoryDurably,
  fingerprintContentEqual,
  isContained,
  isSafeRelativePath,
  isSha256,
  parseStrictCli,
  readJsonFile,
  sha256File,
  sha256Json,
  sha256Hex,
  writeNoOverwrite,
  writeJsonNoOverwrite,
  type EstimateUnit,
  type FingerprintContent,
  type RunManifestV1,
  type SourceFingerprint,
  type TestReceiptV1,
} from "./lib/estimate-sheet-performance-contract";
import { readFocusedRefreezeBinding } from "./lib/estimate-sheet-performance-test-receipt";

const CONTRACT_VERSION = "estimate-sheet-source-fingerprint.v2";
const APPLICATION_CONTRACT_VERSION = "estimate-sheet-application-fingerprint.v1";
const PRODUCER_CONTRACT_VERSION = "estimate-sheet-producer-fingerprint.v1";
const PACKAGE_PROJECTION_RULE = "package-json-without-scripts.v1";
const GENERATED_METADATA_EXCLUSION_RULE = "untracked-impeccable-metadata-exclusions.v1";
const GENERATED_METADATA_FILENAMES = new Set([
  "config.local.json",
  "hook.cache.json",
  "hook.pending.json",
]);
const COMMAND_BEARING_LOCAL_CONFIG_KEY = /^(?:core\.worktree|include\.path|includeif\..+\.path|filter\..+\.(?:clean|smudge|process)|diff\..+\.(?:command|textconv))$/u;
const SYSTEM_GIT_PATH = "/usr/bin/git";
const SYSTEM_PATH = "/usr/bin:/bin";
const STARTUP_CONTROLS = [
  "NODE_OPTIONS",
  "NODE_PATH",
  "BUN_OPTIONS",
  "LD_PRELOAD",
  "LD_LIBRARY_PATH",
  "DYLD_INSERT_LIBRARIES",
  "DYLD_LIBRARY_PATH",
] as const;

const APPLICATION_PATHS = [
  ".npmrc",
  ".nvmrc",
  "bunfig.toml",
  "package.json",
  "bun.lock",
  "tsconfig.json",
  "next-env.d.ts",
  "next.config.ts",
  "open-next.config.ts",
  "postcss.config.mjs",
  "image-loader.ts",
  "wrangler.jsonc",
  "worker.ts",
  "cloudflare-env.d.ts",
  "migrations",
  "public",
  "src",
] as const;

const PRODUCER_PATHS = [
  ".gitattributes",
  ".gitignore",
  ".npmrc",
  ".nvmrc",
  "AGENTS.md",
  "bunfig.toml",
  "package.json",
  "bun.lock",
  "tsconfig.json",
  "eslint.config.mjs",
  "vitest.config.ts",
  "playwright.config.ts",
  "playwright.estimate-performance.config.ts",
  "scripts",
  "tests",
  "e2e",
] as const;

const SOURCE_PATHS = [...new Set([...APPLICATION_PATHS, ...PRODUCER_PATHS])];
const DETERMINISTIC_GIT_ARGS = [
  "--no-pager",
  "-c", "color.ui=false",
  "-c", "core.fileMode=true",
  "-c", "core.quotepath=false",
  "-c", "core.attributesFile=/dev/null",
  "-c", "core.excludesFile=/dev/null",
  "-c", "core.autocrlf=false",
  "-c", "core.eol=lf",
  "-c", "core.precomposeUnicode=false",
  "-c", "core.ignoreCase=false",
  "-c", "core.symlinks=true",
  "-c", "core.fsmonitor=false",
  "-c", "diff.renames=false",
  "-c", "status.renames=false",
  "-c", "status.relativePaths=false",
  "-c", "diff.algorithm=histogram",
  "-c", "diff.indentHeuristic=false",
  "-c", "diff.context=3",
  "-c", "diff.suppressBlankEmpty=false",
  "-c", "diff.orderFile=/dev/null",
  "-c", "diff.noprefix=false",
  "-c", "diff.mnemonicPrefix=false",
  "-c", "diff.submodule=short",
] as const;
const DETERMINISTIC_GIT_ENV = {
  PATH: SYSTEM_PATH,
  LC_ALL: "C",
  LANG: "C",
  TZ: "UTC",
  GIT_CONFIG_NOSYSTEM: "1",
  GIT_CONFIG_GLOBAL: "/dev/null",
  GIT_CONFIG_SYSTEM: "/dev/null",
  GIT_CONFIG_COUNT: "0",
  GIT_ATTR_NOSYSTEM: "1",
  GIT_LITERAL_PATHSPECS: "1",
  GIT_PAGER: "cat",
  GIT_OPTIONAL_LOCKS: "0",
  GIT_TERMINAL_PROMPT: "0",
};

export function assertFingerprintRuntime(): void {
  const controls = STARTUP_CONTROLS.filter((key) => process.env[key]);
  if (process.execArgv.length || controls.length) {
    throw new Error(`runtime startup controls are not permitted: ${[...(process.execArgv.length ? ["execArgv"] : []), ...controls].join(", ")}`);
  }

  const gitStat = lstatSync(SYSTEM_GIT_PATH);
  if (!gitStat.isFile() || gitStat.uid !== 0 || (gitStat.mode & 0o022) !== 0) {
    throw new Error("trusted system Git is unavailable");
  }
}

export function referenceFingerprintPath(repoRoot = process.cwd()): string {
  return resolve(repoRoot, ".ai/03_plans/2026-07-08/Project-Estimate-Sheet-Performance-Optimization/evidence/source-fingerprint-v1.mjs");
}

function rawGit(cwd: string, args: readonly string[]): Buffer {
  return execFileSync(SYSTEM_GIT_PATH, [...DETERMINISTIC_GIT_ARGS, ...args], {
    cwd,
    encoding: "buffer",
    env: DETERMINISTIC_GIT_ENV,
    maxBuffer: 128 * 1024 * 1024,
  });
}

function resolveRepositoryRoot(requestedRoot: string): string {
  const repoRoot = rawGit(requestedRoot, ["rev-parse", "--show-toplevel"])
    .toString("utf8")
    .trim();
  const requestedRelative = relative(repoRoot, requestedRoot);
  if (requestedRelative === ".." || requestedRelative.startsWith(`..${sep}`) || isAbsolute(requestedRelative)) {
    throw new Error("Git resolved an unexpected repository root");
  }
  return repoRoot;
}

function git(repoRoot: string, args: readonly string[]): Buffer {
  return rawGit(repoRoot, args);
}

function splitNul(bytes: Buffer): string[] {
  const values: string[] = [];
  let start = 0;
  for (let index = 0; index < bytes.length; index += 1) {
    if (bytes[index] !== 0) continue;
    if (index > start) {
      const raw = bytes.subarray(start, index);
      const value = raw.toString("utf8");
      if (!Buffer.from(value, "utf8").equals(raw)) {
        throw new Error("Source fingerprint paths must be valid UTF-8");
      }
      values.push(value);
    }
    start = index + 1;
  }
  if (start !== bytes.length) throw new Error("Expected a NUL-terminated Git path stream");
  return values;
}

function assertSafeRepositoryMetadata(repoRoot: string): void {
  const unsafeKeys: string[] = [];
  const worktreeConfigPath = rawGit(repoRoot, [
    "rev-parse",
    "--path-format=absolute",
    "--git-path",
    "config.worktree",
  ]).toString("utf8").trim();
  const scopes = ["--local"];
  if (existsSync(worktreeConfigPath)) scopes.push("--worktree");
  for (const scope of scopes) {
    const keys = splitNul(rawGit(repoRoot, [
      "config",
      scope,
      "--null",
      "--name-only",
      "--list",
      "--no-includes",
    ]));
    for (const key of keys) {
      const normalized = key.toLowerCase();
      if (COMMAND_BEARING_LOCAL_CONFIG_KEY.test(normalized)) unsafeKeys.push(`${scope}:${normalized}`);
    }
  }
  if (unsafeKeys.length) {
    throw new Error(`Command-bearing repository Git config is not permitted: ${unsafeKeys.join(", ")}`);
  }

  const infoAttributesPath = rawGit(repoRoot, [
    "rev-parse",
    "--path-format=absolute",
    "--git-path",
    "info/attributes",
  ]).toString("utf8").trim();
  if (existsSync(infoAttributesPath) && readFileSync(infoAttributesPath).length > 0) {
    throw new Error("Nonempty repository-local info/attributes is not permitted");
  }
}

function bytewisePathSort(left: string, right: string): number {
  return Buffer.compare(Buffer.from(left, "utf8"), Buffer.from(right, "utf8"));
}

function isGeneratedMetadataPath(path: string): boolean {
  const segments = path.split("/");
  return segments.length >= 2
    && segments.at(-2) === ".impeccable"
    && GENERATED_METADATA_FILENAMES.has(segments.at(-1) ?? "");
}

function trackedPaths(repoRoot: string, paths: readonly string[]): string[] {
  return splitNul(git(repoRoot, ["ls-files", "-z", "--cached", "--", ...paths]))
    .sort(bytewisePathSort);
}

function assertNoTrackedGeneratedMetadata(paths: readonly string[]): void {
  const matches = paths.filter(isGeneratedMetadataPath);
  if (matches.length) {
    throw new Error(`Generated metadata exclusion matched tracked source paths: ${matches.join(", ")}`);
  }
}

function candidatePaths(repoRoot: string, paths: readonly string[]): string[] {
  const tracked = trackedPaths(repoRoot, paths);
  assertNoTrackedGeneratedMetadata(tracked);
  const untracked = splitNul(git(repoRoot, [
    "ls-files",
    "-z",
    "--others",
    "--exclude-per-directory=.gitignore",
    "--",
    ...paths,
  ])).filter((path) => !isGeneratedMetadataPath(path));
  return [...new Set([...tracked, ...untracked])].sort(bytewisePathSort);
}

function stableJson(value: unknown): string {
  if (value === null || typeof value !== "object") {
    const serialized = JSON.stringify(value);
    if (serialized === undefined) throw new Error("Source fingerprint JSON contains an unsupported value");
    return serialized;
  }
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort(bytewisePathSort);
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`).join(",")}}`;
}

function packageProjection(repoRoot: string): Buffer {
  const parsed = JSON.parse(readFileSync(resolve(repoRoot, "package.json"), "utf8")) as Record<string, unknown>;
  delete parsed.scripts;
  return Buffer.from(stableJson(parsed), "utf8");
}

function contentBytes(repoRoot: string, path: string, projectPackageScripts: boolean): Buffer {
  const absolutePath = resolve(repoRoot, path);
  if (!existsSync(absolutePath)) return Buffer.from("MISSING\0", "utf8");
  const stat = lstatSync(absolutePath);
  if (stat.isSymbolicLink()) {
    return Buffer.concat([
      Buffer.from("SYMLINK\0", "utf8"),
      readlinkSync(absolutePath, { encoding: "buffer" }),
    ]);
  }
  if (!stat.isFile()) throw new Error(`Unsupported source path type: ${path}`);
  if (projectPackageScripts && path === "package.json") {
    return Buffer.concat([
      Buffer.from(`${PACKAGE_PROJECTION_RULE}\0`, "utf8"),
      packageProjection(repoRoot),
    ]);
  }
  return Buffer.concat([Buffer.from("FILE\0", "utf8"), readFileSync(absolutePath)]);
}

function filesystemCandidates(repoRoot: string, paths: readonly string[]): string[] {
  const candidates: string[] = [];
  const visit = (path: string): void => {
    const absolutePath = resolve(repoRoot, path);
    if (!existsSync(absolutePath)) return;
    const stat = lstatSync(absolutePath);
    if (stat.isSymbolicLink() || stat.isFile()) {
      candidates.push(path);
      return;
    }
    if (!stat.isDirectory()) throw new Error(`Unsupported source path type: ${path}`);
    for (const name of readdirSync(absolutePath)) visit(`${path}/${name}`);
  };
  for (const path of paths) visit(path);
  return [...new Set(candidates)].sort(bytewisePathSort);
}

function currentMode(repoRoot: string, path: string): "100644" | "100755" | "120000" {
  const stat = lstatSync(resolve(repoRoot, path));
  if (stat.isSymbolicLink()) return "120000";
  if (!stat.isFile()) throw new Error(`Unsupported source path type: ${path}`);
  return (stat.mode & 0o111) === 0 ? "100644" : "100755";
}

function buildContentFingerprint(
  repoRoot: string,
  contractVersion: string,
  paths: readonly string[],
  projectPackageScripts: boolean,
): FingerprintContent {
  const tracked = trackedPaths(repoRoot, paths);
  assertNoTrackedGeneratedMetadata(tracked);
  const candidates = filesystemCandidates(repoRoot, paths).filter((path) => !isGeneratedMetadataPath(path));
  const pathListBytes = Buffer.concat(
    candidates.map((path) => Buffer.concat([Buffer.from(path, "utf8"), Buffer.from([0])])),
  );
  const records = Buffer.concat(candidates.map((path) => Buffer.from(
    `PATH\0${path}\0MODE\0${currentMode(repoRoot, path)}\0SHA256\0${sha256Hex(contentBytes(repoRoot, path, projectPackageScripts))}\0`,
    "utf8",
  )));
  return {
    contract_version: contractVersion,
    generated_metadata_exclusion_rule: GENERATED_METADATA_EXCLUSION_RULE,
    package_projection_rule: projectPackageScripts ? PACKAGE_PROJECTION_RULE : "full-package-json.v1",
    path_count: candidates.length,
    path_list_sha256: sha256Hex(pathListBytes),
    content_sha256: sha256Hex(records),
  };
}

function compareFields(
  prefix: string,
  expected: Record<string, unknown> | undefined,
  actual: Record<string, unknown> | undefined,
  keys: readonly string[],
  mismatches: Array<[string, unknown, unknown]>,
): void {
  for (const key of keys) {
    if (expected?.[key] !== actual?.[key]) mismatches.push([`${prefix}${key}`, expected?.[key], actual?.[key]]);
  }
}

function verifyFingerprint(repoRoot: string, fingerprint: SourceFingerprint): void {
  const manifestPath = resolve(repoRoot, ".ai/03_plans/2026-07-08/Project-Estimate-Sheet-Performance-Optimization/plan-pack.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as { baseline?: Record<string, unknown> };
  const expected = manifest.baseline;
  const mismatches: Array<[string, unknown, unknown]> = [];
  compareFields("", expected, fingerprint as unknown as Record<string, unknown>, [
    "contract_version",
    "generated_metadata_exclusion_rule",
    "head",
    "path_count",
    "path_list_sha256",
    "scoped_status_sha256",
    "scoped_diff_sha256",
  ], mismatches);
  compareFields(
    "application.",
    expected?.application as Record<string, unknown> | undefined,
    fingerprint.application as unknown as Record<string, unknown>,
    ["contract_version", "generated_metadata_exclusion_rule", "package_projection_rule", "path_count", "path_list_sha256", "content_sha256"],
    mismatches,
  );
  compareFields(
    "producer.",
    expected?.producer as Record<string, unknown> | undefined,
    fingerprint.producer as unknown as Record<string, unknown>,
    ["contract_version", "generated_metadata_exclusion_rule", "package_projection_rule", "path_count", "path_list_sha256", "content_sha256"],
    mismatches,
  );
  if (mismatches.length) {
    throw new Error(mismatches
      .map(([field, expectedValue, actualValue]) => `${field}: expected ${expectedValue}, received ${actualValue}`)
      .join("\n"));
  }
}

function runReference(repoRoot: string, referencePath: string, verify: boolean): Buffer {
  if (!existsSync(referencePath)) throw new Error(`fingerprint reference is missing: ${referencePath}`);
  assertNoSensitiveValue(referencePath, "reference path");
  return execFileSync(process.execPath, [referencePath, ...(verify ? ["--verify"] : [])], {
    cwd: repoRoot,
    env: {
      PATH: "/opt/homebrew/bin:/usr/bin:/bin",
      LC_ALL: "C",
      LANG: "C",
      TZ: "UTC",
      GIT_CONFIG_NOSYSTEM: "1",
      GIT_CONFIG_GLOBAL: "/dev/null",
      GIT_CONFIG_SYSTEM: "/dev/null",
      GIT_CONFIG_COUNT: "0",
      GIT_ATTR_NOSYSTEM: "1",
      GIT_LITERAL_PATHSPECS: "1",
      GIT_PAGER: "cat",
      GIT_OPTIONAL_LOCKS: "0",
      GIT_TERMINAL_PROMPT: "0",
    },
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 128 * 1024 * 1024,
  });
}

export function computeEstimateSheetSourceFingerprint(input: {
  repoRoot?: string;
  /** Retained for API compatibility. Only the explicit comparison API executes this path. */
  referencePath?: string;
  verify?: boolean;
} = {}): { bytes: Buffer; fingerprint: SourceFingerprint } {
  assertFingerprintRuntime();
  const requestedRoot = resolve(input.repoRoot ?? process.cwd());
  const repoRoot = resolveRepositoryRoot(requestedRoot);
  assertSafeRepositoryMetadata(repoRoot);

  const candidates = candidatePaths(repoRoot, SOURCE_PATHS);
  const pathListBytes = Buffer.concat(
    candidates.map((path) => Buffer.concat([Buffer.from(path, "utf8"), Buffer.from([0])])),
  );
  const statusBytes = git(repoRoot, [
    "status",
    "--porcelain=v1",
    "-z",
    "--untracked-files=no",
    "--ignore-submodules=none",
    "--no-renames",
    "--",
    ...SOURCE_PATHS,
  ]);
  const trackedDiffBytes = git(repoRoot, [
    "diff",
    "--binary",
    "--full-index",
    "--no-ext-diff",
    "--no-textconv",
    "--no-renames",
    "--diff-algorithm=histogram",
    "--unified=3",
    "--inter-hunk-context=0",
    "--no-indent-heuristic",
    "--no-color",
    "--no-relative",
    "--src-prefix=a/",
    "--dst-prefix=b/",
    "--submodule=short",
    "--ignore-submodules=none",
    "-O", "/dev/null",
    "HEAD",
    "--",
    ...SOURCE_PATHS,
  ]);
  const untrackedPaths = splitNul(git(repoRoot, [
    "ls-files",
    "-z",
    "--others",
    "--exclude-per-directory=.gitignore",
    "--",
    ...SOURCE_PATHS,
  ])).filter((path) => !isGeneratedMetadataPath(path)).sort(bytewisePathSort);
  const untrackedRecords = Buffer.concat(untrackedPaths.map((path) => {
    const stat = lstatSync(resolve(repoRoot, path));
    const mode = (stat.mode & 0o777).toString(8).padStart(6, "0");
    return Buffer.from(
      `UNTRACKED\0${path}\0MODE\0${mode}\0SHA256\0${sha256Hex(contentBytes(repoRoot, path, false))}\0`,
      "utf8",
    );
  }));

  const fingerprint: SourceFingerprint = {
    contract_version: CONTRACT_VERSION,
    generated_metadata_exclusion_rule: GENERATED_METADATA_EXCLUSION_RULE,
    head: git(repoRoot, ["rev-parse", "HEAD"]).toString("utf8").trim(),
    path_count: candidates.length,
    path_list_sha256: sha256Hex(pathListBytes),
    scoped_status_sha256: sha256Hex(statusBytes),
    scoped_diff_sha256: sha256Hex(Buffer.concat([trackedDiffBytes, untrackedRecords])),
    application: buildContentFingerprint(repoRoot, APPLICATION_CONTRACT_VERSION, APPLICATION_PATHS, true),
    producer: buildContentFingerprint(repoRoot, PRODUCER_CONTRACT_VERSION, PRODUCER_PATHS, false),
    status_bytes: statusBytes.length,
    tracked_diff_bytes: trackedDiffBytes.length,
    untracked_record_count: untrackedPaths.length,
    untracked_record_bytes: untrackedRecords.length,
  };
  if (input.verify === true) verifyFingerprint(repoRoot, fingerprint);
  const bytes = Buffer.from(`${JSON.stringify(fingerprint, null, 2)}\n`, "utf8");
  return { bytes, fingerprint };
}

export function compareEstimateSheetSourceFingerprintReference(input: {
  repoRoot?: string;
  referencePath?: string;
  verify?: boolean;
} = {}): { bytes: Buffer; referenceBytes: Buffer } {
  const repoRoot = resolve(input.repoRoot ?? process.cwd());
  const result = computeEstimateSheetSourceFingerprint({ repoRoot, verify: input.verify });
  const referencePath = input.referencePath ?? referenceFingerprintPath(repoRoot);
  const referenceBytes = runReference(repoRoot, referencePath, input.verify === true);
  if (sha256Hex(referenceBytes) !== sha256Hex(result.bytes) || !referenceBytes.equals(result.bytes)) {
    throw new Error("typed fingerprint output differs from reference output");
  }
  return { bytes: result.bytes, referenceBytes };
}

type ScopeFileRecord = {
  path: string;
  mode: "100644" | "100755" | "120000";
  sha256: string;
};

type PredecessorBinding = {
  unit_id: EstimateUnit;
  run_id: string;
  index_immutable_path: string;
  index_sha256: string;
  evidence_immutable_path: string;
  evidence_sha256: string;
  application_fingerprint: FingerprintContent;
  producer_fingerprint: FingerprintContent;
};

type RuntimePlan = {
  package_id: string;
  next_unit: EstimateUnit | null;
  units: Array<{ id: EstimateUnit; status: string }>;
  runtime_evidence: {
    latest_unit_id: EstimateUnit | null;
    latest_run_id: string | null;
    registry: { immutable_path: string | null; sha256: string };
    projections: Array<{ artifact_id: string; immutable_path: string | null; sha256: string }>;
  };
};

type EvidenceIndex = {
  schema_version: string;
  unit_id: EstimateUnit;
  run_id: string;
  status: string;
  evidence: Array<{ immutable_path: string; sha256: string }>;
  payload_sha256: string;
};

const SUCCESSOR_BY_UNIT: Partial<Record<EstimateUnit, EstimateUnit>> = {
  "UNIT-001": "UNIT-002",
  "UNIT-004": "UNIT-005",
  "UNIT-005": "UNIT-006",
  "UNIT-006": "UNIT-007",
  "UNIT-007": "UNIT-008",
  "UNIT-008": "UNIT-009",
  "UNIT-009": "UNIT-010",
  "UNIT-010": "UNIT-011",
};

function scopeFileRecords(
  repoRoot: string,
  paths: readonly string[],
  projectPackageScripts: boolean,
): ScopeFileRecord[] {
  return filesystemCandidates(repoRoot, paths)
    .filter((path) => !isGeneratedMetadataPath(path))
    .map((path) => ({
      path,
      mode: currentMode(repoRoot, path),
      sha256: sha256Hex(contentBytes(repoRoot, path, projectPackageScripts)),
    }));
}

export function computeEstimateSheetScopeFileRecords(repoRoot = process.cwd()): {
  application: ScopeFileRecord[];
  producer: ScopeFileRecord[];
} {
  const resolvedRoot = resolveRepositoryRoot(resolve(repoRoot));
  assertSafeRepositoryMetadata(resolvedRoot);
  return {
    application: scopeFileRecords(resolvedRoot, APPLICATION_PATHS, true),
    producer: scopeFileRecords(resolvedRoot, PRODUCER_PATHS, false),
  };
}

function resolvePlanImmutable(planRoot: string, path: string, label: string): string {
  if (!isSafeRelativePath(path) || !path.startsWith("evidence/runtime/runs/")) {
    throw new Error(`${label} path is not a registered immutable run path`);
  }
  const absolute = resolve(planRoot, path);
  if (!isContained(planRoot, absolute)) throw new Error(`${label} path escapes the plan root`);
  assertRegularFile(absolute, label);
  return absolute;
}

function fingerprintPairFromEvidence(value: Record<string, unknown>): {
  application: FingerprintContent;
  producer: FingerprintContent;
} {
  const application = value.applicationFingerprint ?? value.application_fingerprint;
  const producer = value.producerFingerprint ?? value.producer_fingerprint;
  if (!application || !producer) throw new Error("predecessor evidence has no output fingerprint pair");
  const pair = { application: application as FingerprintContent, producer: producer as FingerprintContent };
  if (!isSha256(pair.application.content_sha256) || !isSha256(pair.producer.content_sha256)) {
    throw new Error("predecessor evidence fingerprint pair is invalid");
  }
  return pair;
}

function resolvePredecessorBinding(repoRoot: string, predecessorUnit: EstimateUnit): PredecessorBinding {
  const planRoot = defaultPlanRoot(repoRoot);
  const plan = readJsonFile<RuntimePlan>(resolve(planRoot, "plan-pack.json"));
  const successor = SUCCESSOR_BY_UNIT[predecessorUnit];
  if (!successor || plan.next_unit !== successor) {
    throw new Error(`${predecessorUnit} is not the current predecessor for ${plan.next_unit ?? "no next unit"}`);
  }
  const predecessor = plan.units.find((unit) => unit.id === predecessorUnit);
  if (!predecessor || !["VERIFIED", "SUPERSEDED"].includes(predecessor.status)) {
    throw new Error(`${predecessorUnit} is not terminal`);
  }
  if (plan.runtime_evidence.latest_unit_id !== predecessorUnit || !plan.runtime_evidence.latest_run_id) {
    throw new Error("plan runtime latest identity does not match the predecessor");
  }
  const registry = plan.runtime_evidence.registry;
  if (!registry.immutable_path || !isSha256(registry.sha256)) throw new Error("predecessor evidence index is not materialized");
  const indexPath = resolvePlanImmutable(planRoot, registry.immutable_path, "predecessor evidence index");
  if (sha256File(indexPath) !== registry.sha256) throw new Error("predecessor evidence index hash mismatch");
  const index = readJsonFile<EvidenceIndex>(indexPath);
  if (index.schema_version !== "estimate-sheet-evidence-index.v1"
    || index.unit_id !== predecessorUnit
    || index.run_id !== plan.runtime_evidence.latest_run_id
    || !["VERIFIED", "SUPERSEDED"].includes(index.status)
    || index.evidence.length !== 1) {
    throw new Error("predecessor evidence index identity is invalid");
  }
  const indexPayload = structuredClone(index) as Record<string, unknown>;
  delete indexPayload.payload_sha256;
  if (index.payload_sha256 !== sha256Json(indexPayload)) throw new Error("predecessor evidence index payload hash mismatch");
  const evidence = index.evidence[0]!;
  if (!isSha256(evidence.sha256)) throw new Error("predecessor evidence hash is invalid");
  const evidencePath = resolvePlanImmutable(planRoot, evidence.immutable_path, "predecessor evidence");
  if (sha256File(evidencePath) !== evidence.sha256) throw new Error("predecessor evidence hash mismatch");
  const output = readJsonFile<Record<string, unknown>>(evidencePath);
  const fingerprints = fingerprintPairFromEvidence(output);
  return {
    unit_id: predecessorUnit,
    run_id: index.run_id,
    index_immutable_path: registry.immutable_path,
    index_sha256: registry.sha256,
    evidence_immutable_path: evidence.immutable_path,
    evidence_sha256: evidence.sha256,
    application_fingerprint: fingerprints.application,
    producer_fingerprint: fingerprints.producer,
  };
}

function assertAdmissionOutputPath(repoRoot: string, path: string): string {
  if (!isSafeRelativePath(path) || !path.startsWith(".ai/99_scratch/estimate-sheet-performance/admissions/") || !path.endsWith(".json")) {
    throw new Error("admission output must be an ignored JSON path under .ai/99_scratch/estimate-sheet-performance/admissions");
  }
  const absolute = resolve(repoRoot, path);
  if (!isContained(repoRoot, absolute)) throw new Error("admission output escapes the repository");
  return absolute;
}

function payloadWithHash<T extends Record<string, unknown>>(payload: T): T & { payload_sha256: string } {
  return { ...payload, payload_sha256: sha256Json(payload) };
}

function recordPredecessorAdmission(input: {
  repoRoot: string;
  predecessorUnit: EstimateUnit;
  output: string;
  requireProducerEquality: boolean;
}): Record<string, unknown> {
  const current = computeEstimateSheetSourceFingerprint({ repoRoot: input.repoRoot }).fingerprint;
  const predecessor = resolvePredecessorBinding(input.repoRoot, input.predecessorUnit);
  if (!fingerprintContentEqual(current.application, predecessor.application_fingerprint)
    || !fingerprintContentEqual(current.producer, predecessor.producer_fingerprint)) {
    throw new Error("current source fingerprints do not equal the immutable predecessor outputs");
  }
  const unitId = SUCCESSOR_BY_UNIT[input.predecessorUnit]!;
  const planRoot = defaultPlanRoot(input.repoRoot);
  const decisionRow = readJsonFile<RuntimePlan>(resolve(planRoot, "plan-pack.json"))
    .runtime_evidence.projections.find((row) => row.artifact_id === "ART-043");
  if (!decisionRow?.immutable_path || !isSha256(decisionRow.sha256)) throw new Error("UNIT-004 decision is not indexed");
  const decisionPath = resolvePlanImmutable(planRoot, decisionRow.immutable_path, "UNIT-004 decision");
  if (sha256File(decisionPath) !== decisionRow.sha256) throw new Error("UNIT-004 decision hash mismatch");
  const scopeRecords = computeEstimateSheetScopeFileRecords(input.repoRoot);
  const receipt = payloadWithHash({
    schema_version: "estimate-sheet-predecessor-admission.v1",
    unit_id: unitId,
    predecessor,
    decision: { immutable_path: decisionRow.immutable_path, sha256: decisionRow.sha256 },
    input_application_fingerprint: current.application,
    input_producer_fingerprint: current.producer,
    input_scope_records: scopeRecords,
    require_producer_equality: input.requireProducerEquality,
    created_at: new Date().toISOString(),
  });
  writeJsonNoOverwrite(assertAdmissionOutputPath(input.repoRoot, input.output), receipt, 0o600, input.repoRoot);
  return receipt;
}

function recordRefreezeAdmission(input: {
  repoRoot: string;
  predecessorUnit: EstimateUnit;
  output: string;
  repairReason: string;
  allowedApplicationPaths: string[];
  allowedProducerPaths: string[];
}): Record<string, unknown> {
  if (input.predecessorUnit !== "UNIT-001") throw new Error("refreeze admission requires UNIT-001 as predecessor");
  if (!input.repairReason.trim()) throw new Error("refreeze admission requires a repair reason");
  const current = computeEstimateSheetSourceFingerprint({ repoRoot: input.repoRoot }).fingerprint;
  const predecessor = resolvePredecessorBinding(input.repoRoot, input.predecessorUnit);
  if (!fingerprintContentEqual(current.application, predecessor.application_fingerprint)
    || !fingerprintContentEqual(current.producer, predecessor.producer_fingerprint)) {
    throw new Error("refreeze admission must begin from the current immutable UNIT-001 fingerprints");
  }
  const validateAllowlist = (paths: string[], label: string): string[] => {
    const unique = [...new Set(paths)].sort(bytewisePathSort);
    if (!unique.length) throw new Error(`${label} allowlist must not be empty`);
    for (const path of unique) if (!isSafeRelativePath(path)) throw new Error(`${label} allowlist contains an unsafe path: ${path}`);
    return unique;
  };
  const outputPath = assertAdmissionOutputPath(input.repoRoot, input.output);
  const focusedRunId = createRunId();
  const focusedRunRoot = `${outputPath.slice(0, -".json".length)}.run`;
  ensureDirectoryDurably(resolve(outputPath, ".."), 0o700, input.repoRoot);
  ensureDirectoryDurably(focusedRunRoot, 0o700, input.repoRoot);
  const createdAt = new Date().toISOString();
  const run: RunManifestV1 = {
    schema_version: "estimate-sheet-performance-run.v1",
    package_id: "PLAN-2026-07-08-project-estimate-sheet-performance",
    unit_id: "UNIT-002",
    run_id: focusedRunId,
    profile: "artifact-only",
    cleanupRequirement: "NOT_APPLICABLE",
    run_root: focusedRunRoot,
    pointer_path: resolve(focusedRunRoot, "run-pointer.json"),
    created_at: createdAt,
    status: "PREPARED",
    sourceFingerprint: current,
    applicationFingerprint: current.application,
    producerFingerprint: current.producer,
    namespaces: {},
    mutationJournal: [],
    previewProcesses: [],
  };
  const runManifestPath = resolve(focusedRunRoot, "run-manifest.json");
  writeJsonNoOverwrite(runManifestPath, run, 0o600, focusedRunRoot);
  writeJsonNoOverwrite(run.pointer_path, {
    schema_version: "estimate-sheet-performance-run-pointer.v1",
    unit_id: run.unit_id,
    run_id: run.run_id,
    run_root: run.run_root,
    run_manifest: "run-manifest.json",
    application_fingerprint: current.application.content_sha256,
    producer_fingerprint: current.producer.content_sha256,
  }, 0o600, focusedRunRoot);
  const receipt = payloadWithHash({
    schema_version: "estimate-sheet-refreeze-admission.v1",
    status: "RECORDED",
    unit_id: "UNIT-002",
    replacement_unit_id: "UNIT-001",
    predecessor,
    repair_reason: input.repairReason,
    allowed_application_paths: validateAllowlist(input.allowedApplicationPaths, "application"),
    allowed_producer_paths: validateAllowlist(input.allowedProducerPaths, "producer"),
    input_application_fingerprint: current.application,
    input_producer_fingerprint: current.producer,
    input_scope_records: computeEstimateSheetScopeFileRecords(input.repoRoot),
    focused_run: {
      run_id: focusedRunId,
      run_root: relative(input.repoRoot, focusedRunRoot).split(sep).join("/"),
      unit_id: "UNIT-002",
      receipt_role: "refreeze-tests",
      run_manifest_sha256: sha256File(runManifestPath),
    },
    created_at: createdAt,
  });
  try {
    writeJsonNoOverwrite(outputPath, receipt, 0o600, input.repoRoot);
  } catch (error) {
    try { rmSync(focusedRunRoot, { recursive: true, force: true }); } catch { /* preserve primary error */ }
    throw error;
  }
  return receipt;
}

function changedScopePaths(before: ScopeFileRecord[], after: ScopeFileRecord[]): string[] {
  const beforeMap = new Map(before.map((entry) => [entry.path, `${entry.mode}:${entry.sha256}`]));
  const afterMap = new Map(after.map((entry) => [entry.path, `${entry.mode}:${entry.sha256}`]));
  return [...new Set([...beforeMap.keys(), ...afterMap.keys()])]
    .filter((path) => beforeMap.get(path) !== afterMap.get(path))
    .sort(bytewisePathSort);
}

export function finalizedRefreezeReceiptPath(admissionPath: string): string {
  return admissionPath.replace(/\.json$/u, ".receipt.json");
}

function finalizeRefreezeAdmission(input: {
  repoRoot: string;
  admissionPath: string;
  testsRole: string;
}): Record<string, unknown> {
  const admissionAbsolute = assertAdmissionOutputPath(input.repoRoot, input.admissionPath);
  const admission = readJsonFile<Record<string, unknown>>(admissionAbsolute);
  const admissionPayload = structuredClone(admission);
  const admissionHash = admissionPayload.payload_sha256;
  delete admissionPayload.payload_sha256;
  if (admission.schema_version !== "estimate-sheet-refreeze-admission.v1"
    || admission.status !== "RECORDED"
    || admissionHash !== sha256Json(admissionPayload)) {
    throw new Error("refreeze admission is invalid");
  }
  const focusedBinding = readFocusedRefreezeBinding(input.repoRoot, admissionAbsolute, input.testsRole);
  const receiptPath = focusedBinding.receiptPath;
  const testReceipt = readJsonFile<TestReceiptV1>(receiptPath);
  assertTestReceipt(testReceipt);
  if (testReceipt.unit_id !== focusedBinding.unitId || testReceipt.run_id !== focusedBinding.runId || testReceipt.overall !== "PASS" || testReceipt.failed !== 0 || testReceipt.passed < 1) {
    throw new Error("refreeze focused test receipt is not a passing UNIT-002 receipt");
  }
  if (!testReceipt.files.some((path) => path.replaceAll("\\", "/").endsWith("tests/vitest/estimate-sheet-version-control-actions.test.ts"))) {
    throw new Error("refreeze focused test receipt omits direct row-restore coverage");
  }
  const current = computeEstimateSheetSourceFingerprint({ repoRoot: input.repoRoot }).fingerprint;
  const afterRecords = computeEstimateSheetScopeFileRecords(input.repoRoot);
  const beforeRecords = admission.input_scope_records as { application: ScopeFileRecord[]; producer: ScopeFileRecord[] };
  if (!beforeRecords || !Array.isArray(beforeRecords.application) || !Array.isArray(beforeRecords.producer)) throw new Error("refreeze input scope records are invalid");
  const changedApplicationPaths = changedScopePaths(beforeRecords.application, afterRecords.application);
  const changedProducerPaths = changedScopePaths(beforeRecords.producer, afterRecords.producer);
  const allowedApplicationPaths = admission.allowed_application_paths as string[];
  const allowedProducerPaths = admission.allowed_producer_paths as string[];
  for (const path of changedApplicationPaths) if (!allowedApplicationPaths.includes(path)) throw new Error(`undeclared application delta: ${path}`);
  for (const path of changedProducerPaths) if (!allowedProducerPaths.includes(path)) throw new Error(`undeclared producer delta: ${path}`);
  const noDeltaReconciliation = changedApplicationPaths.length === 0 && changedProducerPaths.length === 0;
  if (noDeltaReconciliation && admission.repair_reason !== "row-restore") {
    throw new Error("refreeze finalization requires a declared delta");
  }
  const changedTimes = [...changedApplicationPaths, ...changedProducerPaths]
    .filter((path, index, values) => values.indexOf(path) === index)
    .map((path) => statSync(resolve(input.repoRoot, path)).mtimeMs);
  if (changedTimes.length && statSync(receiptPath).mtimeMs < Math.max(...changedTimes)) {
    throw new Error("refreeze focused tests predate the declared source delta");
  }
  const payload = payloadWithHash({
    schema_version: "estimate-sheet-refreeze-receipt.v1",
    unit_id: "UNIT-002",
    replacement_unit_id: "UNIT-001",
    predecessor: admission.predecessor,
    repair_reason: admission.repair_reason,
    reconciliation: noDeltaReconciliation ? "CURRENT_IMPLEMENTATION_CHARACTERIZED" : "DECLARED_REPAIR_APPLIED",
    input_application_fingerprint: admission.input_application_fingerprint,
    input_producer_fingerprint: admission.input_producer_fingerprint,
    output_application_fingerprint: current.application,
    output_producer_fingerprint: current.producer,
    declared_application_paths: allowedApplicationPaths,
    declared_producer_paths: allowedProducerPaths,
    changed_application_paths: changedApplicationPaths,
    changed_producer_paths: changedProducerPaths,
    focused_test_receipt: {
      path: relative(input.repoRoot, receiptPath).split(sep).join("/"),
      sha256: sha256File(receiptPath),
      run_id: testReceipt.run_id,
    },
    invalidated_ids: ["UNIT-001", "EVID-002", "UNIT-002", "UNIT-003", "UNIT-004"],
    finalized_at: new Date().toISOString(),
  });
  readFocusedRefreezeBinding(input.repoRoot, admissionAbsolute, input.testsRole);
  writeJsonNoOverwrite(finalizedRefreezeReceiptPath(admissionAbsolute), payload, 0o600, input.repoRoot);
  return payload;
}

function extractRepeatedCli(argv: string[], keys: readonly string[]): {
  remaining: string[];
  repeated: Record<string, string[]>;
} {
  const repeated = Object.fromEntries(keys.map((key) => [key, [] as string[]]));
  const remaining: string[] = [];
  for (const token of argv) {
    const match = token.match(/^--([a-z][a-z0-9-]*)=(.*)$/u);
    if (match && keys.includes(match[1]!)) {
      if (!match[2]) throw new Error(`--${match[1]} requires a non-empty value`);
      repeated[match[1]!]!.push(match[2]!);
    } else {
      remaining.push(token);
    }
  }
  return { remaining, repeated };
}

function assertOnlyCliOptions(values: Map<string, unknown>, allowed: readonly string[]): void {
  for (const key of values.keys()) {
    if (!allowed.includes(key)) throw new Error(`unknown CLI option: --${key}`);
  }
}

function assertPlanningAdmissionGate(input: {
  repoRoot: string;
  path: string;
  referenceArtifactId: string;
  recorderArtifactId: string;
}): void {
  if (input.referenceArtifactId !== "ART-036" || input.recorderArtifactId !== "ART-037") {
    throw new Error("fingerprint gate requires ART-036 reference and ART-037 recorder bindings");
  }
  const absolutePath = resolve(input.repoRoot, input.path);
  if (!isContained(input.repoRoot, absolutePath)) throw new Error("planning admission escapes the repository");
  assertRegularFile(absolutePath, "planning admission");
  const admission = readJsonFile<Record<string, unknown>>(absolutePath);
  const payload = structuredClone(admission);
  const payloadSha256 = payload.payload_sha256;
  delete payload.payload_sha256;
  if (admission.schema_version !== "estimate-sheet-planning-admission.v1"
    || admission.unit_id !== "UNIT-001"
    || admission.package_status !== "IMPLEMENTATION_READY"
    || admission.next_unit !== "UNIT-001"
    || payloadSha256 !== sha256Json(payload)) {
    throw new Error("planning admission is invalid");
  }
  const candidate = admission.review_candidate as Record<string, unknown> | undefined;
  const artifacts = candidate?.key_artifacts;
  if (!Array.isArray(artifacts)) throw new Error("planning admission key artifact registry is missing");
  for (const [artifactId, expectedPath] of [
    [input.referenceArtifactId, "evidence/source-fingerprint-v1.mjs"],
    [input.recorderArtifactId, "evidence/record-unit001-planning-admission.mjs"],
  ] as const) {
    const matches = artifacts.filter((entry) => entry !== null
      && typeof entry === "object"
      && (entry as Record<string, unknown>).artifact_id === artifactId);
    if (matches.length !== 1) throw new Error(`planning admission must bind exactly one ${artifactId}`);
    const artifact = matches[0] as Record<string, unknown>;
    if (artifact.path !== expectedPath || !isSha256(artifact.sha256)) {
      throw new Error(`${artifactId} planning admission binding is invalid`);
    }
    const helperPath = resolve(defaultPlanRoot(input.repoRoot), expectedPath);
    assertRegularFile(helperPath, `${artifactId} helper`);
    if (sha256File(helperPath) !== artifact.sha256) throw new Error(`${artifactId} helper hash mismatch`);
  }
}

export function main(argv = process.argv.slice(2)): number {
  const { remaining, repeated } = extractRepeatedCli(argv, [
    "allow-application-path",
    "allow-producer-path",
  ]);
  const values = parseStrictCli(remaining);
  assertOnlyCliOptions(values, [
    "help",
    "output",
    "compare-reference",
    "verify",
    "planning-admission",
    "require-reference-artifact",
    "require-recorder-artifact",
    "verify-predecessor-unit",
    "record-admission",
    "record-refreeze-admission",
    "repair-reason",
    "finalize-refreeze-admission",
    "tests",
    "require-producer-equality",
  ]);
  if (cliBoolean(values, "help")) {
    console.log([
      "Usage: bun run scripts/compute-estimate-sheet-source-fingerprint.ts [--output=PATH] [--compare-reference=PATH] [--verify]",
      "       bun run scripts/compute-estimate-sheet-source-fingerprint.ts --verify-predecessor-unit=UNIT-004 --record-admission=PATH",
      "       bun run scripts/compute-estimate-sheet-source-fingerprint.ts --verify-predecessor-unit=UNIT-001 --record-refreeze-admission=PATH --repair-reason=REASON --allow-application-path=PATH --allow-producer-path=PATH",
      "       bun run scripts/compute-estimate-sheet-source-fingerprint.ts --finalize-refreeze-admission=PATH --tests=auto:refreeze-tests",
    ].join("\n"));
    return 0;
  }
  const repoRoot = resolve(process.env.ESTIMATE_PERF_REPO_ROOT ?? process.cwd());
  const predecessorUnit = cliString(values, "verify-predecessor-unit") as EstimateUnit | undefined;
  if (predecessorUnit && !Object.prototype.hasOwnProperty.call(SUCCESSOR_BY_UNIT, predecessorUnit)) {
    throw new Error(`invalid predecessor unit: ${predecessorUnit}`);
  }
  const recordAdmissionPath = cliString(values, "record-admission");
  const recordRefreezePath = cliString(values, "record-refreeze-admission");
  const finalizeRefreezePath = cliString(values, "finalize-refreeze-admission");
  const operationCount = [recordAdmissionPath, recordRefreezePath, finalizeRefreezePath].filter(Boolean).length;
  if (operationCount > 1) throw new Error("fingerprint admission operations are mutually exclusive");
  const requireProducerEquality = cliBoolean(values, "require-producer-equality");

  if (recordAdmissionPath) {
    if (!predecessorUnit) throw new Error("--record-admission requires --verify-predecessor-unit");
    if (repeated["allow-application-path"]!.length || repeated["allow-producer-path"]!.length) {
      throw new Error("predecessor admission does not accept refreeze path allowlists");
    }
    const receipt = recordPredecessorAdmission({
      repoRoot,
      predecessorUnit,
      output: recordAdmissionPath,
      requireProducerEquality: true,
    });
    process.stdout.write(`${JSON.stringify(receipt, null, 2)}\n`);
    return 0;
  }

  if (recordRefreezePath) {
    if (requireProducerEquality) throw new Error("refreeze admission does not accept --require-producer-equality");
    if (!predecessorUnit) throw new Error("--record-refreeze-admission requires --verify-predecessor-unit");
    const receipt = recordRefreezeAdmission({
      repoRoot,
      predecessorUnit,
      output: recordRefreezePath,
      repairReason: cliString(values, "repair-reason", true) as string,
      allowedApplicationPaths: repeated["allow-application-path"]!,
      allowedProducerPaths: repeated["allow-producer-path"]!,
    });
    process.stdout.write(`${JSON.stringify(receipt, null, 2)}\n`);
    return 0;
  }

  if (finalizeRefreezePath) {
    if (requireProducerEquality) throw new Error("refreeze finalization does not accept --require-producer-equality");
    if (predecessorUnit || repeated["allow-application-path"]!.length || repeated["allow-producer-path"]!.length) {
      throw new Error("refreeze finalization does not accept predecessor or path allowlist options");
    }
    const tests = cliString(values, "tests", true);
    if (tests !== "auto:refreeze-tests") throw new Error("refreeze finalization requires --tests=auto:refreeze-tests");
    const receipt = finalizeRefreezeAdmission({ repoRoot, admissionPath: finalizeRefreezePath, testsRole: "refreeze-tests" });
    process.stdout.write(`${JSON.stringify(receipt, null, 2)}\n`);
    return 0;
  }

  if (predecessorUnit) throw new Error("--verify-predecessor-unit requires an admission recording operation");
  if (requireProducerEquality) throw new Error("--require-producer-equality requires --record-admission");
  if (repeated["allow-application-path"]!.length || repeated["allow-producer-path"]!.length) {
    throw new Error("path allowlists require --record-refreeze-admission");
  }
  const compareReference = cliString(values, "compare-reference");
  const output = cliString(values, "output");
  const verify = cliBoolean(values, "verify");
  const planningAdmission = cliString(values, "planning-admission");
  const referenceArtifactId = cliString(values, "require-reference-artifact");
  const recorderArtifactId = cliString(values, "require-recorder-artifact");
  const hasPlanningGateOption = Boolean(planningAdmission || referenceArtifactId || recorderArtifactId);
  if (hasPlanningGateOption && (!planningAdmission || !referenceArtifactId || !recorderArtifactId)) {
    throw new Error("planning admission, reference artifact, and recorder artifact options must be provided together");
  }
  if (planningAdmission && referenceArtifactId && recorderArtifactId) {
    assertPlanningAdmissionGate({
      repoRoot,
      path: planningAdmission,
      referenceArtifactId,
      recorderArtifactId,
    });
  }
  const result = compareReference
    ? compareEstimateSheetSourceFingerprintReference({ repoRoot, referencePath: compareReference, verify })
    : computeEstimateSheetSourceFingerprint({ repoRoot, verify });
  if (output) writeNoOverwrite(resolve(repoRoot, output), result.bytes, 0o600, repoRoot);
  else process.stdout.write(result.bytes);
  return 0;
}

if (import.meta.main) {
  try { process.exitCode = main(); }
  catch (error) { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; }
}
