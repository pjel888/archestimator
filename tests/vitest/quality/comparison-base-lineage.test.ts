import { execFileSync } from "node:child_process";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  comparisonBaseFromFlags,
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

  it("accepts a canonical QUALITY_BASE and rejects every malformed base input", () => {
    expect(comparisonBaseInput(new Map(), { QUALITY_BASE: "refs/heads/main" })).toBe(
      "refs/heads/main",
    );
    expect(() => comparisonBaseInput(new Map(), {})).toThrowError(
      new Error("--base or QUALITY_BASE is required"),
    );
    for (const value of ["", " refs/heads/main", "refs/heads/main "]) {
      expect(() => comparisonBaseInput(new Map(), { QUALITY_BASE: value })).toThrowError(
        new Error("--base or QUALITY_BASE is required"),
      );
    }
    expect(() =>
      comparisonBaseInput(new Map<string, string | boolean>([["base", true]]), {}),
    ).toThrowError(new Error("--base requires one non-empty value"));
    for (const value of ["", " HEAD", "HEAD "]) {
      expect(() =>
        comparisonBaseInput(new Map<string, string | boolean>([["base", value]]), {}),
      ).toThrowError(new Error("--base requires one non-empty value"));
    }
  });

  it("fails closed for malformed refs and unresolved commits", async () => {
    const { root, first } = await repository();
    for (const inputRef of ["", " HEAD", "HEAD "]) {
      await expect(resolveComparisonBase({ root, input_ref: inputRef })).rejects.toThrowError(
        new Error("Comparison base ref is missing or malformed"),
      );
    }
    await expect(resolveComparisonBase({ root, input_ref: "missing" })).rejects.toThrowError(
      new Error("Cannot resolve comparison base missing to a commit"),
    );
    await expect(resolveComparisonBase({ root, input_ref: first })).resolves.toEqual({
      input_ref: first,
      resolved_sha: first,
    });
  });

  it("validates forwarded SHAs and exact-SHA lineage boundaries", async () => {
    const { root, first } = await repository();
    for (const resolvedSha of [
      "",
      "0".repeat(39),
      "0".repeat(41),
      `g${"0".repeat(39)}`,
      `A${"0".repeat(39)}`,
      `${"0".repeat(40)}x`,
      `x${"0".repeat(40)}`,
    ]) {
      await expect(
        resolveComparisonBase({ root, input_ref: "HEAD", resolved_sha: resolvedSha }),
      ).rejects.toThrowError(
        new Error("Forwarded comparison base SHA must be 40 lowercase hexadecimal characters"),
      );
    }
    await expect(
      resolveComparisonBase({ root, input_ref: "0".repeat(40), resolved_sha: first }),
    ).rejects.toThrowError(
      new Error(`Forwarded comparison base SHA ${first} does not match ${"0".repeat(40)}`),
    );
    await expect(
      resolveComparisonBase({ root, input_ref: "HEAD", resolved_sha: first }),
    ).resolves.toEqual({ input_ref: "HEAD", resolved_sha: first });
    await expect(
      resolveComparisonBase({ root, input_ref: first, resolved_sha: first }),
    ).resolves.toEqual({ input_ref: first, resolved_sha: first });
    for (const inputRef of [`x${"0".repeat(40)}`, `${"0".repeat(40)}x`]) {
      await expect(
        resolveComparisonBase({ root, input_ref: inputRef, resolved_sha: first }),
      ).resolves.toEqual({ input_ref: inputRef, resolved_sha: first });
    }
  });

  it("forwards only a string base-sha from flags", async () => {
    const { root, first } = await repository();
    await expect(
      comparisonBaseFromFlags({
        root,
        flags: new Map<string, string | boolean>([
          ["base", "HEAD"],
          ["base-sha", first],
        ]),
      }),
    ).resolves.toEqual({ input_ref: "HEAD", resolved_sha: first });
    await expect(
      comparisonBaseFromFlags({
        root,
        flags: new Map<string, string | boolean>([
          ["base", "HEAD"],
          ["base-sha", true],
        ]),
      }),
    ).resolves.toEqual({ input_ref: "HEAD", resolved_sha: first });
    await expect(
      comparisonBaseFromFlags({
        root,
        flags: new Map<string, string | boolean>([
          ["base", "HEAD"],
          ["base-sha", ""],
        ]),
      }),
    ).rejects.toThrowError(
      new Error("Forwarded comparison base SHA must be 40 lowercase hexadecimal characters"),
    );
  });
});
