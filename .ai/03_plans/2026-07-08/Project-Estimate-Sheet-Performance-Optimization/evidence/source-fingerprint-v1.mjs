#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  lstatSync,
  readdirSync,
  readFileSync,
  readlinkSync,
} from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const CONTRACT_VERSION = "estimate-sheet-source-fingerprint.v2";
const APPLICATION_CONTRACT_VERSION = "estimate-sheet-application-fingerprint.v1";
const PRODUCER_CONTRACT_VERSION = "estimate-sheet-producer-fingerprint.v1";
const PACKAGE_PROJECTION_RULE = "package-json-without-scripts.v1";
const GENERATED_METADATA_EXCLUSION_RULE =
  "untracked-impeccable-metadata-exclusions.v1";
const GENERATED_METADATA_FILENAMES = new Set([
  "config.local.json",
  "hook.cache.json",
  "hook.pending.json",
]);
const COMMAND_BEARING_LOCAL_CONFIG_KEY = /^(?:core\.worktree|include\.path|includeif\..+\.path|filter\..+\.(?:clean|smudge|process)|diff\..+\.(?:command|textconv))$/u;
const SYSTEM_GIT_PATH = "/usr/bin/git";
const SYSTEM_PATH = "/usr/bin:/bin";
const STARTUP_INJECTION_ENV = [
  "NODE_OPTIONS",
  "NODE_PATH",
  "BUN_OPTIONS",
  "LD_PRELOAD",
  "LD_LIBRARY_PATH",
  "DYLD_INSERT_LIBRARIES",
  "DYLD_LIBRARY_PATH",
];

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
];

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
];

const SOURCE_PATHS = [...new Set([...APPLICATION_PATHS, ...PRODUCER_PATHS])];

function assertTrustedRuntime() {
  const injectedEnvironment = STARTUP_INJECTION_ENV.filter(
    (key) => typeof process.env[key] === "string" && process.env[key].length > 0,
  );
  if (process.execArgv.length > 0 || injectedEnvironment.length > 0) {
    const controls = [
      ...(process.execArgv.length > 0 ? ["execArgv"] : []),
      ...injectedEnvironment,
    ];
    throw new Error(
      `runtime startup controls are not permitted: ${controls.join(", ")}`,
    );
  }

  const gitStat = lstatSync(SYSTEM_GIT_PATH);
  if (
    !gitStat.isFile() ||
    gitStat.uid !== 0 ||
    (gitStat.mode & 0o022) !== 0
  ) {
    throw new Error("trusted system Git is unavailable");
  }
}

assertTrustedRuntime();

const packRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const deterministicGitArgs = [
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
];
const deterministicGitEnv = {
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

function rawGit(cwd, args) {
  return execFileSync(SYSTEM_GIT_PATH, [...deterministicGitArgs, ...args], {
    cwd,
    encoding: "buffer",
    env: deterministicGitEnv,
    maxBuffer: 128 * 1024 * 1024,
  });
}

const repoRoot = rawGit(packRoot, ["rev-parse", "--show-toplevel"])
  .toString("utf8")
  .trim();
const packRelativeToRepo = relative(repoRoot, packRoot);
const packIsInsideRepo = packRelativeToRepo.length > 0
  && packRelativeToRepo !== ".."
  && !packRelativeToRepo.startsWith(`..${resolve("/")}`)
  && !packRelativeToRepo.startsWith("../")
  && !packRelativeToRepo.startsWith("..\\");
const expectedRepoRoot = resolve(packRoot, "../../../..");
if (repoRoot !== expectedRepoRoot && !packIsInsideRepo) {
  throw new Error("Git resolved an unexpected repository root");
}

function git(args) {
  return rawGit(repoRoot, args);
}

function assertSafeRepositoryMetadata() {
  const unsafeKeys = [];
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
      if (COMMAND_BEARING_LOCAL_CONFIG_KEY.test(normalized)) {
        unsafeKeys.push(`${scope}:${normalized}`);
      }
    }
  }
  if (unsafeKeys.length > 0) {
    throw new Error(
      `Command-bearing repository Git config is not permitted: ${unsafeKeys.join(", ")}`,
    );
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

assertSafeRepositoryMetadata();

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function splitNul(bytes) {
  const values = [];
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
  if (start !== bytes.length) {
    throw new Error("Expected a NUL-terminated Git path stream");
  }
  return values;
}

function bytewisePathSort(left, right) {
  return Buffer.compare(Buffer.from(left, "utf8"), Buffer.from(right, "utf8"));
}

function isGeneratedMetadataPath(path) {
  const segments = path.split("/");
  return segments.length >= 2
    && segments.at(-2) === ".impeccable"
    && GENERATED_METADATA_FILENAMES.has(segments.at(-1));
}

function trackedPaths(paths) {
  return splitNul(git([
    "ls-files",
    "-z",
    "--cached",
    "--",
    ...paths,
  ])).sort(bytewisePathSort);
}

function assertNoTrackedGeneratedMetadata(paths) {
  const matches = paths.filter(isGeneratedMetadataPath);
  if (matches.length > 0) {
    throw new Error(
      `Generated metadata exclusion matched tracked source paths: ${matches.join(", ")}`,
    );
  }
}

function candidatePaths(paths) {
  const tracked = trackedPaths(paths);
  assertNoTrackedGeneratedMetadata(tracked);
  const untracked = splitNul(git([
    "ls-files",
    "-z",
    "--others",
    "--exclude-per-directory=.gitignore",
    "--",
    ...paths,
  ])).filter((path) => !isGeneratedMetadataPath(path));
  return [...new Set([...tracked, ...untracked])].sort(bytewisePathSort);
}

function stableJson(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  const keys = Object.keys(value).sort(bytewisePathSort);
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
}

function packageProjection() {
  const parsed = JSON.parse(readFileSync(resolve(repoRoot, "package.json"), "utf8"));
  delete parsed.scripts;
  return Buffer.from(stableJson(parsed), "utf8");
}

function contentBytes(path, projectPackageScripts) {
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
      packageProjection(),
    ]);
  }
  return Buffer.concat([Buffer.from("FILE\0", "utf8"), readFileSync(absolutePath)]);
}

function filesystemCandidates(paths) {
  const candidates = [];
  const visit = (path) => {
    const absolutePath = resolve(repoRoot, path);
    if (!existsSync(absolutePath)) return;
    const stat = lstatSync(absolutePath);
    if (stat.isSymbolicLink() || stat.isFile()) {
      candidates.push(path);
      return;
    }
    if (!stat.isDirectory()) {
      throw new Error(`Unsupported source path type: ${path}`);
    }
    for (const name of readdirSync(absolutePath)) {
      visit(`${path}/${name}`);
    }
  };
  for (const path of paths) visit(path);
  return [...new Set(candidates)].sort(bytewisePathSort);
}

function currentMode(path) {
  const stat = lstatSync(resolve(repoRoot, path));
  if (stat.isSymbolicLink()) return "120000";
  if (!stat.isFile()) throw new Error(`Unsupported source path type: ${path}`);
  return (stat.mode & 0o111) === 0 ? "100644" : "100755";
}

function buildContentFingerprint(contractVersion, paths, projectPackageScripts) {
  const tracked = trackedPaths(paths);
  assertNoTrackedGeneratedMetadata(tracked);
  const candidates = filesystemCandidates(paths).filter(
    (path) => !isGeneratedMetadataPath(path),
  );
  const pathListBytes = Buffer.concat(
    candidates.map((path) => Buffer.concat([Buffer.from(path, "utf8"), Buffer.from([0])])),
  );
  const records = Buffer.concat(candidates.map((path) => {
    return Buffer.from(
      `PATH\0${path}\0MODE\0${currentMode(path)}\0SHA256\0${sha256(contentBytes(path, projectPackageScripts))}\0`,
      "utf8",
    );
  }));
  return {
    contract_version: contractVersion,
    generated_metadata_exclusion_rule: GENERATED_METADATA_EXCLUSION_RULE,
    package_projection_rule: projectPackageScripts ? PACKAGE_PROJECTION_RULE : "full-package-json.v1",
    path_count: candidates.length,
    path_list_sha256: sha256(pathListBytes),
    content_sha256: sha256(records),
  };
}

const candidates = candidatePaths(SOURCE_PATHS);
const pathListBytes = Buffer.concat(
  candidates.map((path) => Buffer.concat([Buffer.from(path, "utf8"), Buffer.from([0])])),
);
const statusBytes = git([
  "status",
  "--porcelain=v1",
  "-z",
  "--untracked-files=no",
  "--ignore-submodules=none",
  "--no-renames",
  "--",
  ...SOURCE_PATHS,
]);
const trackedDiffBytes = git([
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
const untrackedPaths = splitNul(git([
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
    `UNTRACKED\0${path}\0MODE\0${mode}\0SHA256\0${sha256(contentBytes(path, false))}\0`,
    "utf8",
  );
}));

const fingerprint = {
  contract_version: CONTRACT_VERSION,
  generated_metadata_exclusion_rule: GENERATED_METADATA_EXCLUSION_RULE,
  head: git(["rev-parse", "HEAD"]).toString("utf8").trim(),
  path_count: candidates.length,
  path_list_sha256: sha256(pathListBytes),
  scoped_status_sha256: sha256(statusBytes),
  scoped_diff_sha256: sha256(Buffer.concat([trackedDiffBytes, untrackedRecords])),
  application: buildContentFingerprint(APPLICATION_CONTRACT_VERSION, APPLICATION_PATHS, true),
  producer: buildContentFingerprint(PRODUCER_CONTRACT_VERSION, PRODUCER_PATHS, false),
  status_bytes: statusBytes.length,
  tracked_diff_bytes: trackedDiffBytes.length,
  untracked_record_count: untrackedPaths.length,
  untracked_record_bytes: untrackedRecords.length,
};

function compareFields(prefix, expected, actual, keys, mismatches) {
  for (const key of keys) {
    if (expected?.[key] !== actual?.[key]) {
      mismatches.push([`${prefix}${key}`, expected?.[key], actual?.[key]]);
    }
  }
}

if (process.argv.includes("--verify")) {
  const manifest = JSON.parse(readFileSync(resolve(packRoot, "plan-pack.json"), "utf8"));
  const expected = manifest.baseline;
  const mismatches = [];
  compareFields("", expected, fingerprint, [
    "contract_version",
    "generated_metadata_exclusion_rule",
    "head",
    "path_count",
    "path_list_sha256",
    "scoped_status_sha256",
    "scoped_diff_sha256",
  ], mismatches);
  compareFields("application.", expected?.application, fingerprint.application, [
    "contract_version",
    "generated_metadata_exclusion_rule",
    "package_projection_rule",
    "path_count",
    "path_list_sha256",
    "content_sha256",
  ], mismatches);
  compareFields("producer.", expected?.producer, fingerprint.producer, [
    "contract_version",
    "generated_metadata_exclusion_rule",
    "package_projection_rule",
    "path_count",
    "path_list_sha256",
    "content_sha256",
  ], mismatches);
  if (mismatches.length > 0) {
    for (const [field, expectedValue, actualValue] of mismatches) {
      process.stderr.write(`${field}: expected ${expectedValue}, received ${actualValue}\n`);
    }
    process.exitCode = 1;
  }
}

process.stdout.write(`${JSON.stringify(fingerprint, null, 2)}\n`);
