import { execFileSync } from "node:child_process";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  comparisonBaseInput,
  resolveComparisonBase,
} from "../../../scripts/quality/comparison-base-core";

async function repository(): Promise<{ root: string; first: string }> {
  const root = await mkdtemp(join(tmpdir(), "archestimator-base-"));
  execFileSync("git", ["init", "-q"], { cwd: root });
  execFileSync("git", ["config", "user.email", "quality@example.invalid"], { cwd: root });
  execFileSync("git", ["config", "user.name", "Quality Test"], { cwd: root });
  await writeFile(join(root, "tracked.txt"), "first\n");
  execFileSync("git", ["add", "tracked.txt"], { cwd: root });
  execFileSync("git", ["commit", "-qm", "first"], { cwd: root });
  const first = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
  return { root, first };
}

describe("comparison base lineage", () => {
  it("gives --base precedence over QUALITY_BASE and resolves it once", async () => {
    const { root, first } = await repository();
    const selected = comparisonBaseInput(new Map([["base", "HEAD"]]), {
      QUALITY_BASE: first,
    });
    expect(selected).toBe("HEAD");
    await expect(resolveComparisonBase({ root, input_ref: selected })).resolves.toEqual({
      input_ref: "HEAD",
      resolved_sha: first,
    });
  });

  it("fails closed for missing, boolean, malformed, and mismatched forwarded bases", async () => {
    const { root, first } = await repository();
    expect(() => comparisonBaseInput(new Map(), {})).toThrow(/required/i);
    expect(() => comparisonBaseInput(new Map([["base", true]]), {})).toThrow(/value/i);
    await expect(resolveComparisonBase({ root, input_ref: "missing" })).rejects.toThrow(/resolve/i);
    await expect(
      resolveComparisonBase({ root, input_ref: "0".repeat(40), resolved_sha: first }),
    ).rejects.toThrow(/does not match/i);
    await expect(
      resolveComparisonBase({ root, input_ref: "HEAD", resolved_sha: first }),
    ).resolves.toEqual({ input_ref: "HEAD", resolved_sha: first });
  });
});
