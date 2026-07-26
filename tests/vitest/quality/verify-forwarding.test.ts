import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  forwardedQualityArgs,
  validateReviewForwarding,
} from "../../../scripts/quality/comparison-base-core";

describe("Q2 verify forwarding", () => {
  it("forwards base lineage and review inputs byte-for-byte", () => {
    const reviews = "artifacts/quality/q.json,artifacts/quality/s.json";
    const authors = "root,b0,s1";
    const args = forwardedQualityArgs("bun run quality:reviews", {
      comparison_base: { input_ref: "refs/heads/topic", resolved_sha: "a".repeat(40) },
      reviews,
      author_ids: authors,
      expected: "b".repeat(64),
    });
    expect(args).toEqual([
      "run", "quality:reviews",
      "--base", "refs/heads/topic",
      "--base-sha", "a".repeat(40),
      "--expected", "b".repeat(64),
      "--reviews", reviews,
      "--author-ids", authors,
    ]);
  });

  it("rejects missing or malformed review inputs before command construction", () => {
    expect(() => validateReviewForwarding(undefined, "root")).toThrow(/reviews/i);
    expect(() => validateReviewForwarding("a.json", undefined)).toThrow(/author/i);
    expect(() => validateReviewForwarding("a.json,,b.json", "root")).toThrow(/malformed/i);
    expect(() => validateReviewForwarding("a.json", "root, bad")).toThrow(/malformed/i);
  });

  it("fails the real verify CLI before executing any profile job", () => {
    const root = resolve(import.meta.dirname, "../../..");
    const verifyCli = resolve(import.meta.dirname, "../../../scripts/quality/verify.ts");
    const output = resolve(mkdtempSync(resolve(tmpdir(), "verify-forwarding-")), "result.json");
    const run = spawnSync(
      "bun",
      [
        verifyCli,
        "--base", "HEAD",
        "--profile", "Q2_CRITICAL_CHANGE_GATE",
        "--reviews", "artifacts/quality/q.json",
        "--output", output,
      ],
      { cwd: root, encoding: "utf8" },
    );
    const result = JSON.parse(readFileSync(output, "utf8"));
    expect(run.status).toBe(1);
    expect(result.findings.map((finding: { code: string }) => finding.code)).toContain(
      "REVIEW_FORWARDING_INVALID",
    );
    expect(result.data.command_results).toEqual([]);
  });
});
