import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { lstatSync, readFileSync, realpathSync } from "node:fs";
import { resolve, sep } from "node:path";
import { gitArgsWithoutReplacementObjects } from "./common";
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
  line_ending_neutral_sha256?: string | null;
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
  const run = spawnSync("git", gitArgsWithoutReplacementObjects(args), { cwd: root, encoding: "buffer" });
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

export function lineEndingNeutralSourceDigest(bytes: Buffer): string | null {
  if (bytes.includes(0)) return null;
  const normalizedBytes = Buffer.from(
    bytes.toString("latin1").replaceAll("\r\n", "\n"),
    "latin1",
  );
  return sha256(normalizedBytes);
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

export function candidateCommitSha(root: string): string {
  const run = spawnSync("git", gitArgsWithoutReplacementObjects(["rev-parse", "HEAD"]), {
    cwd: root,
    encoding: "utf8",
  });
  if (run.status !== 0) {
    throw new Error("Candidate HEAD commit SHA cannot be resolved");
  }
  const commitSha = run.stdout.trim().toLowerCase();
  if (!/^[a-f0-9]{40}$/u.test(commitSha)) {
    throw new Error("Candidate HEAD commit SHA is malformed");
  }
  return commitSha;
}

export type ContainedRegularFile =
  | { kind: "file"; bytes: Buffer }
  | { kind: "missing" }
  | { kind: "unsafe" };

export function normalizedPathSegments(normalizedPath: string): string[] | null {
  const segments = normalizedPath.split("/");
  return segments.every((segment) => segment && segment !== "." && segment !== "..")
    ? segments
    : null;
}

export function canonicalPathIsContained(root: string, absolutePath: string): boolean {
  const canonicalRoot = realpathSync.native(resolve(root));
  const canonicalPath = realpathSync.native(absolutePath);
  return canonicalPath.startsWith(`${canonicalRoot}${sep}`);
}

export function resolveContainedRegularFilePath(
  root: string,
  segments: string[],
): string | null {
  let absolutePath = resolve(root);
  for (let index = 0; index < segments.length; index += 1) {
    absolutePath = resolve(absolutePath, segments[index]!);
    const stat = lstatSync(absolutePath);
    const isLeaf = index === segments.length - 1;
    if (isLeaf ? !stat.isFile() : !stat.isDirectory()) return null;
  }
  return canonicalPathIsContained(root, absolutePath) ? absolutePath : null;
}

export function containedRegularFileError(code: string | undefined): ContainedRegularFile {
  return code === "ENOENT" || code === "ENOTDIR" ? { kind: "missing" } : { kind: "unsafe" };
}

export function inspectContainedRegularFile(
  root: string,
  normalizedPath: string,
): ContainedRegularFile {
  const segments = normalizedPathSegments(normalizedPath);
  if (!segments) return { kind: "unsafe" };
  try {
    const absolutePath = resolveContainedRegularFilePath(root, segments);
    if (!absolutePath) return { kind: "unsafe" };
    return { kind: "file", bytes: readFileSync(absolutePath) };
  } catch (error) {
    return containedRegularFileError((error as NodeJS.ErrnoException).code);
  }
}

export function readContainedRegularFile(root: string, normalizedPath: string): Buffer | null {
  const inspected = inspectContainedRegularFile(root, normalizedPath);
  return inspected.kind === "file" ? inspected.bytes : null;
}

async function candidateFiles(
  root: string,
  paths: string[],
  sources: Map<string, Set<CandidateSource>>,
): Promise<CandidateFile[]> {
  return Promise.all(paths.map(async (path) => {
    const inspected = inspectContainedRegularFile(root, path);
    if (inspected.kind === "unsafe") {
      throw new Error(`Candidate path is not a contained regular file: ${path}`);
    }
    const deleted = inspected.kind === "missing";
    const bytes = inspected.kind === "file" ? inspected.bytes : null;
    return {
      path,
      sha256: bytes === null ? sha256("DELETED") : sha256(bytes),
      line_ending_neutral_sha256: bytes === null ? null : lineEndingNeutralSourceDigest(bytes),
      deleted,
      sources: [...sources.get(path)!],
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
  if (expected !== undefined && expected !== digest) {
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
