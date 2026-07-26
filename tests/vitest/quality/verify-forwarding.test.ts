import { spawnSync } from "node:child_process";
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  forwardedQualityArgs,
  validateReviewForwarding,
} from "../../../scripts/quality/comparison-base-core";

function gitCandidateFiles(root: string): string[] {
  const commands = [
    ["diff", "--name-only", "HEAD", "HEAD"],
    ["diff", "--cached", "--name-only"],
    ["diff", "--name-only"],
    ["ls-files", "--others", "--exclude-standard"],
  ];
  return [...new Set(commands.flatMap((args) => {
    const run = spawnSync("git", args, { cwd: root, encoding: "utf8" });
    expect(run.status).toBe(0);
    return run.stdout.split(/\r?\n/u).filter(Boolean);
  }))].sort((left, right) => left.localeCompare(right));
}

describe("Q2 verify forwarding", () => {
  it("rejects a caller-selected profiles file before executing classification", () => {
    const root = resolve(import.meta.dirname, "../../..");
    const fixture = mkdtempSync(resolve(tmpdir(), "verify-profiles-override-"));
    const forgedProfiles = resolve(fixture, "profiles.json");
    const output = resolve(fixture, "manifest.json");
    writeFileSync(forgedProfiles, readFileSync(resolve(root, "quality/profiles.json"), "utf8"));
    const run = spawnSync(
      "bun",
      [
        resolve(root, "scripts/quality/verify.ts"),
        "--base", "HEAD",
        "--plan",
        "--profiles", forgedProfiles,
        "--classification", resolve(fixture, "classification.json"),
        "--output", output,
        "--aggregate-output", resolve(fixture, "aggregate.json"),
      ],
      { cwd: root, encoding: "utf8" },
    );
    const result = JSON.parse(readFileSync(output, "utf8"));
    expect(run.status).toBe(1);
    expect(result.findings.map((finding: { code: string }) => finding.code)).toContain(
      "PROFILE_POLICY_OVERRIDE",
    );
    expect(result.data.command_results).toEqual([]);
  });

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
    const aggregateOutput = resolve(output, "..", "aggregate.json");
    const run = spawnSync(
      "bun",
      [
        verifyCli,
        "--base", "HEAD",
        "--profile", "Q2_CRITICAL_CHANGE_GATE",
        "--reviews", "artifacts/quality/q.json",
        "--output", output,
        "--aggregate-output", aggregateOutput,
      ],
      { cwd: root, encoding: "utf8" },
    );
    const result = JSON.parse(readFileSync(output, "utf8"));
    expect(run.status).toBe(1);
    expect(result.findings.map((finding: { code: string }) => finding.code)).toContain(
      "REVIEW_FORWARDING_INVALID",
    );
    expect(result.data.command_results).toHaveLength(1);
    expect(result.data.command_results[0]).toMatchObject({
      command: "bun run quality:classify",
      job: "quality / classify",
    });
  });

  it("runs classification exactly once first and preserves its executed identity", () => {
    const root = resolve(import.meta.dirname, "../../..");
    const verifyCli = resolve(root, "scripts/quality/verify.ts");
    const fixture = mkdtempSync(resolve(tmpdir(), "verify-command-identity-"));
    const bin = resolve(fixture, "bin");
    const output = resolve(fixture, "manifest.json");
    const aggregateOutput = resolve(fixture, "aggregate.json");
    const classification = resolve(fixture, "classification.json");
    const invocationLog = resolve(fixture, "invocations.ndjson");
    const bunLocator = process.platform === "win32" ? "where.exe" : "which";
    const bunExecutable = spawnSync(bunLocator, ["bun"], { encoding: "utf8" })
      .stdout.split(/\r?\n/u).find(Boolean);
    expect(bunExecutable).toBeTruthy();
    const head = spawnSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" })
      .stdout.trim();
    const fakeBunSource = `
const { appendFileSync, writeFileSync } = require("node:fs");
const args = process.argv.slice(2);
appendFileSync(process.env.FAKE_INVOCATION_LOG, JSON.stringify(args) + "\\n");
const outputIndex = args.indexOf("--output");
writeFileSync(args[outputIndex + 1], JSON.stringify({
  schema_version: 1,
  kind: "quality-classification",
  status: "PASS",
  generated_at: new Date().toISOString(),
  summary: "fixture pass",
  findings: [],
  data: JSON.parse(process.env.FAKE_CLASSIFICATION_DATA),
}));
`;
    mkdirSync(bin);
    if (process.platform === "win32") {
      writeFileSync(resolve(bin, "bun.cmd"), '@echo off\r\nnode "%~dp0fake-bun.cjs" %*\r\n');
      writeFileSync(resolve(bin, "fake-bun.cjs"), fakeBunSource);
    } else {
      const fakeBun = resolve(bin, "bun");
      writeFileSync(fakeBun, `#!/usr/bin/env node\n${fakeBunSource}`);
      chmodSync(fakeBun, 0o755);
    }
    const classificationData = {
      profile: "Q2_CRITICAL_CHANGE_GATE",
      files: gitCandidateFiles(root),
      affected_capabilities: [],
      comparison_base: { input_ref: "HEAD", resolved_sha: head },
    };
    const run = spawnSync(
      bunExecutable!,
      [
        verifyCli,
        "--base", "HEAD",
        "--base-sha", head,
        "--plan",
        "--classification", classification,
        "--output", output,
        "--aggregate-output", aggregateOutput,
      ],
      {
        cwd: root,
        encoding: "utf8",
        env: {
          ...process.env,
          PATH: `${bin}${delimiter}${process.env.PATH ?? ""}`,
          FAKE_INVOCATION_LOG: invocationLog,
          FAKE_CLASSIFICATION_DATA: JSON.stringify(classificationData),
        },
      },
    );

    expect(run.error).toBeUndefined();
    const result = JSON.parse(readFileSync(output, "utf8"));
    expect(result.data.command_results.map((entry: { command: string }) => entry.command)).toEqual([
      "bun run quality:classify",
    ]);
    expect(result.data.command_results[0]).toMatchObject({
      command: "bun run quality:classify",
      job: "quality / classify",
      status: "PASS",
      artifact: { path: classification },
    });
    expect(Object.keys(result.data.candidate).sort()).toEqual(["commit_sha", "sha256"]);
    expect(result.findings.filter(
      (finding: { code: string; message: string }) =>
        finding.code === "COMMAND_RESULT_MISSING" && finding.message.includes("quality:classify"),
    )).toEqual([]);
    const invocations = readFileSync(invocationLog, "utf8").trim().split("\n").map(JSON.parse);
    expect(invocations).toEqual([[
      "run", "quality:classify",
      "--base", "HEAD",
      "--base-sha", head,
      "--output", classification,
    ]]);
    expect(result.data.command_results.map(
      (entry: { executed_command: string }) => entry.executed_command,
    )).toEqual(invocations.map((args: string[]) => ["bun", ...args].join(" ")));
  });
});
