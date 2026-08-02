import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildCandidate,
  candidateFileInventory,
  lineEndingNeutralSourceDigest,
  readContainedRegularFile,
} from "../../../scripts/quality/candidate-core";
import { sha256 } from "../../../scripts/quality/common";

async function repository(): Promise<{ root: string; base: string }> {
  const root = await mkdtemp(join(tmpdir(), "archestimator-candidate-"));
  execFileSync("git", ["init", "-q"], { cwd: root });
  execFileSync("git", ["config", "user.email", "quality@example.invalid"], { cwd: root });
  execFileSync("git", ["config", "user.name", "Quality Test"], { cwd: root });
  await writeFile(join(root, "committed.txt"), "base\n");
  await writeFile(join(root, "deleted.txt"), "delete me\n");
  execFileSync("git", ["add", "."], { cwd: root });
  execFileSync("git", ["commit", "-qm", "base"], { cwd: root });
  const base = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
  await writeFile(join(root, "committed.txt"), "committed\n");
  execFileSync("git", ["add", "committed.txt"], { cwd: root });
  execFileSync("git", ["commit", "-qm", "committed"], { cwd: root });
  await writeFile(join(root, "staged.txt"), "staged\n");
  execFileSync("git", ["add", "staged.txt"], { cwd: root });
  await writeFile(join(root, "committed.txt"), "unstaged\n");
  await writeFile(join(root, "untracked.txt"), "untracked\n");
  await rm(join(root, "deleted.txt"));
  return { root, base };
}

describe("canonical whole-candidate digest", () => {
  it("binds committed, staged, unstaged, untracked, and deleted files deterministically", async () => {
    const { root, base } = await repository();
    const files = ["committed.txt", "deleted.txt", "staged.txt", "untracked.txt"];
    const first = await buildCandidate({
      root,
      comparison_base: { input_ref: base, resolved_sha: base },
      classification: {
        profile: "Q2_CRITICAL_CHANGE_GATE",
        files,
        affected_capabilities: ["CAP-UNKNOWN"],
      },
    });
    const second = await buildCandidate({
      root,
      comparison_base: { input_ref: base, resolved_sha: base },
      classification: {
        profile: "Q2_CRITICAL_CHANGE_GATE",
        files: [...files].reverse(),
        affected_capabilities: ["CAP-UNKNOWN"],
      },
      expected: first.sha256,
    });
    expect(second).toEqual(first);
    expect(first.record.changed_files.map((file) => [file.path, file.sources])).toEqual([
      ["committed.txt", ["committed", "unstaged"]],
      ["deleted.txt", ["unstaged"]],
      ["staged.txt", ["staged"]],
      ["untracked.txt", ["untracked"]],
    ]);
    expect(first.record.changed_files.map((file) => [file.path, file.line_ending_neutral_sha256])).toEqual([
      ["committed.txt", sha256("unstaged\n")],
      ["deleted.txt", null],
      ["staged.txt", sha256("staged\n")],
      ["untracked.txt", sha256("untracked\n")],
    ]);
  });

  it("fails on classifier drift and deliberate expected digest mismatch", async () => {
    const { root, base } = await repository();
    const input = {
      root,
      comparison_base: { input_ref: base, resolved_sha: base },
      classification: {
        profile: "Q2_CRITICAL_CHANGE_GATE" as const,
        files: ["committed.txt", "deleted.txt", "staged.txt", "untracked.txt"],
        affected_capabilities: ["CAP-UNKNOWN"],
      },
    };
    await expect(
      buildCandidate({ ...input, classification: { ...input.classification, files: ["committed.txt"] } }),
    ).rejects.toThrow(/classification/i);
    await expect(buildCandidate({
      ...input,
      classification: {
        ...input.classification,
        comparison_base: { input_ref: "different", resolved_sha: base },
      },
    })).rejects.toThrow(/comparison base/i);
    await expect(buildCandidate({
      ...input,
      classification: {
        ...input.classification,
        comparison_base: { input_ref: base, resolved_sha: "0".repeat(40) },
      },
    })).rejects.toThrow(/comparison base/i);
    await expect(buildCandidate({ ...input, expected: "0".repeat(64) })).rejects.toThrow(/expected/i);
  });

  it("fails closed when Git scope or HEAD identity cannot be trusted", async () => {
    const { root, base } = await repository();
    const sha256Root = await mkdtemp(join(tmpdir(), "archestimator-candidate-sha256-"));
    try {
      await expect(candidateFileInventory(root, "0".repeat(40))).rejects.toThrow(/git diff/i);
      expect(lineEndingNeutralSourceDigest(Buffer.from([0]))).toBeNull();

      execFileSync("git", ["init", "-q", "--object-format=sha256"], { cwd: sha256Root });
      execFileSync("git", ["config", "user.email", "quality@example.invalid"], { cwd: sha256Root });
      execFileSync("git", ["config", "user.name", "Quality Test"], { cwd: sha256Root });
      await writeFile(join(sha256Root, "tracked.txt"), "tracked\n");
      execFileSync("git", ["add", "tracked.txt"], { cwd: sha256Root });
      execFileSync("git", ["commit", "-qm", "base"], { cwd: sha256Root });
      const sha256Head = execFileSync("git", ["rev-parse", "HEAD"], {
        cwd: sha256Root,
        encoding: "utf8",
      }).trim();
      expect(sha256Head).toHaveLength(64);
      await expect(buildCandidate({
        root: sha256Root,
        comparison_base: { input_ref: sha256Head, resolved_sha: sha256Head },
        classification: {
          profile: "Q2_CRITICAL_CHANGE_GATE",
          files: [],
          affected_capabilities: [],
        },
      })).rejects.toThrow(/HEAD commit SHA/i);
      expect(base).toHaveLength(40);
    } finally {
      await rm(root, { recursive: true, force: true });
      await rm(sha256Root, { recursive: true, force: true });
    }
  });

  it("rejects candidate files reached through a linked ancestor", async () => {
    const root = await mkdtemp(join(tmpdir(), "archestimator-candidate-contained-"));
    const outside = await mkdtemp(join(tmpdir(), "archestimator-candidate-outside-"));
    await mkdir(join(root, "linked"));
    await writeFile(join(root, "linked/example.ts"), "committed bytes\n");
    execFileSync("git", ["init", "-q"], { cwd: root });
    execFileSync("git", ["config", "user.email", "quality@example.invalid"], { cwd: root });
    execFileSync("git", ["config", "user.name", "Quality Test"], { cwd: root });
    execFileSync("git", ["add", "."], { cwd: root });
    execFileSync("git", ["commit", "-qm", "base"], { cwd: root });
    const base = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
    await rm(join(root, "linked"), { recursive: true, force: true });
    await writeFile(join(outside, "example.ts"), "outside bytes\n");
    await symlink(outside, join(root, "linked"), process.platform === "win32" ? "junction" : "dir");
    try {
      await expect(candidateFileInventory(root, base)).rejects.toThrow(/contained regular file/i);
    } finally {
      await rm(root, { recursive: true, force: true });
      await rm(outside, { recursive: true, force: true });
    }
  });

  it("reads only repository-contained regular files", async () => {
    const root = await mkdtemp(join(tmpdir(), "archestimator-candidate-reader-"));
    try {
      await mkdir(join(root, "nested"));
      await writeFile(join(root, "nested/example.ts"), "contained bytes\n");
      await writeFile(join(root, "ancestor-file"), "not a directory\n");

      expect(readContainedRegularFile(root, "nested/example.ts")?.toString("utf8")).toBe("contained bytes\n");
      expect(readContainedRegularFile(root, "missing.ts")).toBeNull();
      expect(readContainedRegularFile(root, "../outside.ts")).toBeNull();
      expect(readContainedRegularFile(root, "nested")).toBeNull();
      expect(readContainedRegularFile(root, "ancestor-file/child.ts")).toBeNull();
      expect(readContainedRegularFile(join(root, "ancestor-file"), "child.ts")).toBeNull();
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("ignores commit replacement refs when enumerating committed files", async () => {
    const root = await mkdtemp(join(tmpdir(), "archestimator-candidate-replace-"));
    try {
      execFileSync("git", ["init", "-q"], { cwd: root });
      execFileSync("git", ["config", "user.email", "quality@example.invalid"], { cwd: root });
      execFileSync("git", ["config", "user.name", "Quality Test"], { cwd: root });
      await writeFile(join(root, "committed.txt"), "base\n");
      execFileSync("git", ["add", "committed.txt"], { cwd: root });
      execFileSync("git", ["commit", "-qm", "base"], { cwd: root });
      const base = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
      await writeFile(join(root, "committed.txt"), "changed\n");
      execFileSync("git", ["add", "committed.txt"], { cwd: root });
      execFileSync("git", ["commit", "-qm", "changed"], { cwd: root });
      const head = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
      execFileSync("git", ["replace", head, base], { cwd: root });

      const inventory = await candidateFileInventory(root, base);

      expect(inventory).toEqual([{
        path: "committed.txt",
        sha256: sha256("changed\n"),
        line_ending_neutral_sha256: sha256("changed\n"),
        deleted: false,
        sources: ["committed"],
      }]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
