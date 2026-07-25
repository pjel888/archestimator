import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { sha256 } from "./common";

interface PreflightEntry {
  path: string;
  sha256: string;
  ownership: string;
  disposition: string;
}

function parsePreflight(text: string): PreflightEntry[] {
  const entries: PreflightEntry[] = [];
  for (const line of text.split(/\r?\n/u)) {
    const match = line.match(
      /^\| `([^`]+)` \| (?:current )?`([a-f0-9]{64})`(?:; initial `([a-f0-9]{64})`)? \| ([^|]+) \| ([^|]+) \|$/u,
    );
    if (!match) continue;
    entries.push({
      path: match[1],
      sha256: match[2],
      ownership: match[4].trim(),
      disposition: match[5].trim(),
    });
  }
  return entries;
}

export async function buildAttribution(
  root: string,
  changedFiles: string[],
  mergeBaseRef: string,
): Promise<{
  schema_version: 1;
  mode: "clean-ci" | "local-shared-worktree";
  merge_base_ref: string;
  merge_base: string;
  inherited_dirty_files: string[];
  migration_changed_files: string[];
  overlapping_files: string[];
  file_hashes: Record<string, string>;
  scope_rule: string;
}> {
  let preflight: PreflightEntry[] = [];
  try {
    preflight = parsePreflight(
      await readFile(
        resolve(root, ".omx/artifacts/beta-quality-baseline/dirty-preflight.md"),
        "utf8",
      ),
    );
  } catch {
    preflight = [];
  }
  const inherited = new Set(preflight.map((entry) => entry.path));
  const mergeBase = spawnSync("git", ["merge-base", mergeBaseRef, "HEAD"], {
    cwd: root,
    encoding: "utf8",
  }).stdout.trim();
  const hashes: Record<string, string> = {};
  for (const path of changedFiles) {
    try {
      hashes[path] = sha256(await readFile(resolve(root, path)));
    } catch {
      // Deleted paths are still classified, but have no current content hash.
    }
  }
  const overlapping = preflight
    .filter(
      (entry) =>
        changedFiles.includes(entry.path) &&
        hashes[entry.path] !== entry.sha256 &&
        /integration lead|overlap/iu.test(entry.disposition),
    )
    .map((entry) => entry.path)
    .sort();
  const migrationChanged = changedFiles
    .filter((path) => !inherited.has(path))
    .concat(
      preflight
        .filter(
          (entry) =>
            /migration bootstrap/iu.test(entry.ownership) &&
            changedFiles.includes(entry.path) &&
            hashes[entry.path] !== entry.sha256,
        )
        .map((entry) => entry.path),
    );
  return {
    schema_version: 1,
    mode: preflight.length === 0 ? "clean-ci" : "local-shared-worktree",
    merge_base_ref: mergeBaseRef,
    merge_base: mergeBase || "UNKNOWN",
    inherited_dirty_files: [...inherited].filter((path) => changedFiles.includes(path)).sort(),
    migration_changed_files: [...new Set(migrationChanged)].sort(),
    overlapping_files: overlapping,
    file_hashes: hashes,
    scope_rule:
      "Attribution is reporting metadata only and never excludes paths from classification or evidence.",
  };
}
