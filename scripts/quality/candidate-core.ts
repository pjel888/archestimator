import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { QualityProfile } from "./classifier-core";
import type { ComparisonBase } from "./comparison-base-core";

type CandidateSource = "committed" | "staged" | "unstaged" | "untracked";

export interface CandidateClassification {
  profile: QualityProfile;
  files: string[];
  affected_capabilities: string[];
  comparison_base?: ComparisonBase;
}

export interface CandidateFile {
  path: string;
  sha256: string;
  deleted: boolean;
  sources: CandidateSource[];
}

export interface CandidateRecord {
  schema_version: 1;
  commit_sha: string;
  comparison_base: ComparisonBase;
  profile: QualityProfile;
  changed_files: CandidateFile[];
  affected_capabilities: string[];
}

export interface CanonicalCandidate {
  record: CandidateRecord;
  sha256: string;
}

function gitPaths(root: string, args: string[]): string[] {
  const run = spawnSync("git", args, { cwd: root, encoding: "buffer" });
  if (run.status !== 0) {
    throw new Error(`Cannot construct candidate with git ${args.join(" ")}`);
  }
  return run.stdout
    .toString("utf8")
    .split("\0")
    .filter(Boolean);
}

function sha256(bytes: string | Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function sameStrings(left: string[], right: string[]): boolean {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

export function candidateDigest(record: CandidateRecord): string {
  return sha256(JSON.stringify(record));
}

function addSources(
  sources: Map<string, Set<CandidateSource>>,
  source: CandidateSource,
  paths: string[],
): void {
  for (const path of paths) {
    const selected = sources.get(path) ?? new Set<CandidateSource>();
    selected.add(source);
    sources.set(path, selected);
  }
}

function collectCandidateSources(root: string, baseSha: string): Map<string, Set<CandidateSource>> {
  const sources = new Map<string, Set<CandidateSource>>();
  const inventories: Array<[CandidateSource, string[]]> = [
    ["committed", [
      "diff", "-z", "--no-renames", "--name-only", "--diff-filter=ACDMRTUXB",
      baseSha, "HEAD",
    ]],
    ["staged", [
      "diff", "-z", "--cached", "--no-renames", "--name-only", "--diff-filter=ACDMRTUXB",
    ]],
    ["unstaged", [
      "diff", "-z", "--no-renames", "--name-only", "--diff-filter=ACDMRTUXB",
    ]],
    ["untracked", ["ls-files", "-z", "--others", "--exclude-standard"]],
  ];
  for (const [source, args] of inventories) {
    addSources(sources, source, gitPaths(root, args));
  }
  return sources;
}

function validateCandidateScope(
  sources: Map<string, Set<CandidateSource>>,
  input: {
    comparison_base: ComparisonBase;
    classification: CandidateClassification;
  },
): string[] {
  const inventoryPaths = [...sources.keys()].sort((left, right) => left.localeCompare(right));
  const classifiedPaths = [...new Set(input.classification.files)].sort((left, right) =>
    left.localeCompare(right),
  );
  if (!sameStrings(inventoryPaths, classifiedPaths)) {
    throw new Error(
      `Candidate classification does not equal the whole Git candidate: classified=${classifiedPaths.join(",")} inventory=${inventoryPaths.join(",")}`,
    );
  }
  const classifiedBase = input.classification.comparison_base;
  if (
    classifiedBase &&
    (classifiedBase.input_ref !== input.comparison_base.input_ref ||
      classifiedBase.resolved_sha !== input.comparison_base.resolved_sha)
  ) {
    throw new Error("Candidate classification comparison base does not match the selected base");
  }
  return inventoryPaths;
}

function candidateCommitSha(root: string): string {
  const run = spawnSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" });
  const commitSha = run.status === 0 ? run.stdout.trim().toLowerCase() : "";
  if (!/^[a-f0-9]{40}$/u.test(commitSha)) {
    throw new Error("Candidate HEAD commit SHA is missing or malformed");
  }
  return commitSha;
}

async function candidateFiles(
  root: string,
  paths: string[],
  sources: Map<string, Set<CandidateSource>>,
): Promise<CandidateFile[]> {
  return Promise.all(paths.map(async (path) => {
    const absolute = resolve(root, path);
    const deleted = !existsSync(absolute);
    return {
      path,
      sha256: deleted ? sha256("DELETED") : sha256(await readFile(absolute)),
      deleted,
      sources: [...sources.get(path)!].sort((left, right) => left.localeCompare(right)),
    };
  }));
}

export async function candidateFileInventory(
  root: string,
  baseSha: string,
  excludedPaths: ReadonlySet<string> = new Set(),
): Promise<CandidateFile[]> {
  const sources = collectCandidateSources(root, baseSha);
  const paths = [...sources.keys()]
    .filter((path) => !excludedPaths.has(path))
    .sort((left, right) => left.localeCompare(right));
  return candidateFiles(root, paths, sources);
}

function validateExpectedCandidate(digest: string, expected: string | undefined): void {
  if (
    expected !== undefined &&
    (!/^[a-f0-9]{64}$/u.test(expected) || expected !== digest)
  ) {
    throw new Error(`Candidate digest does not match --expected ${expected}`);
  }
}

export async function buildCandidate(input: {
  root: string;
  comparison_base: ComparisonBase;
  classification: CandidateClassification;
  expected?: string;
}): Promise<CanonicalCandidate> {
  const sources = collectCandidateSources(input.root, input.comparison_base.resolved_sha);
  const inventoryPaths = validateCandidateScope(sources, input);
  const record: CandidateRecord = {
    schema_version: 1,
    commit_sha: candidateCommitSha(input.root),
    comparison_base: input.comparison_base,
    profile: input.classification.profile,
    changed_files: await candidateFiles(input.root, inventoryPaths, sources),
    affected_capabilities: [...new Set(input.classification.affected_capabilities)].sort(),
  };
  const digest = candidateDigest(record);
  validateExpectedCandidate(digest, input.expected);
  return { record, sha256: digest };
}
