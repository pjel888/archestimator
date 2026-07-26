import { execFileSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildCandidate } from "../../../scripts/quality/candidate-core";

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
    await expect(buildCandidate({ ...input, expected: "0".repeat(64) })).rejects.toThrow(/expected/i);
  });
});
