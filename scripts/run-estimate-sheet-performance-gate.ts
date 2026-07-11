#!/usr/bin/env bun

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  COMMAND_RECEIPT_SCHEMA,
  assertRunManifest,
  canonicalJson,
  cliBoolean,
  cliString,
  ensureContainedRunPath,
  nowIso,
  parseStrictCli,
  readJsonFile,
  resolveRunManifestPath,
  redactedFailureIds,
  sha256Hex,
  writeJsonNoOverwrite,
  type RunManifestV1,
  type SourceFingerprint,
} from "./lib/estimate-sheet-performance-contract";
import { computeEstimateSheetSourceFingerprint } from "./compute-estimate-sheet-source-fingerprint";

const ALLOWED_ROLES = new Set(["fingerprint-reference", "typecheck", "error-handling", "opennext-build", "react-doctor", "release-gates", "release-gates-json", "release-gates-md"]);

export type CommandReceiptV1 = {
  schema_version: typeof COMMAND_RECEIPT_SCHEMA;
  role: string;
  argv: string[];
  unit_id: string;
  run_id: string;
  start_at: string;
  end_at: string;
  duration_ms: number;
  exit_code: number | null;
  signal: string | null;
  overall: "PASS" | "FAIL";
  redacted_output_sha256: string;
  diagnostic_counts: { stdoutLines: number; stderrLines: number; failures: number };
  application_fingerprint: SourceFingerprint["application"];
  producer_fingerprint: SourceFingerprint["producer"];
  build_hash?: string | null;
};

function splitCommand(argv: string[]): { options: string[]; command: string[] } {
  const separator = argv.indexOf("--");
  if (separator === -1) return { options: argv, command: [] };
  return { options: argv.slice(0, separator), command: argv.slice(separator + 1) };
}

function resolveManifest(repoRoot: string, unit: string, path?: string): RunManifestV1 {
  const manifest = readJsonFile<RunManifestV1>(resolveRunManifestPath(repoRoot, unit, path));
  assertRunManifest(manifest);
  return manifest;
}

export function runEstimateSheetPerformanceGate(input: {
  repoRoot?: string;
  runManifest?: string;
  unit: string;
  role: string;
  command: string[];
  output?: string;
  env?: Record<string, string>;
}): { receipt: CommandReceiptV1; receiptPath: string; exitCode: number } {
  const repoRoot = resolve(input.repoRoot ?? process.cwd());
  if (!ALLOWED_ROLES.has(input.role)) throw new Error(`gate role is not allowlisted: ${input.role}`);
  if (!input.command.length) throw new Error("gate requires a child command after --");
  if (input.command.some((token) => token.includes("\0"))) throw new Error("child command contains NUL");
  const manifest = resolveManifest(repoRoot, input.unit, input.runManifest);
  if (manifest.unit_id !== input.unit) throw new Error("gate unit does not match run manifest");
  const before = computeEstimateSheetSourceFingerprint({ repoRoot }).fingerprint;
  const started = Date.now();
  const childEnv = { ...process.env, ...(input.env ?? {}) } as NodeJS.ProcessEnv;
  const child = spawnSync(input.command[0], input.command.slice(1), { cwd: repoRoot, env: childEnv, shell: false, encoding: "utf8", timeout: 5 * 60_000, stdio: ["ignore", "pipe", "pipe"] });
  const ended = Date.now();
  const stdout = String(child.stdout ?? "");
  const stderr = String(child.stderr ?? "");
  const after = computeEstimateSheetSourceFingerprint({ repoRoot }).fingerprint;
  const unchanged = before.application.content_sha256 === after.application.content_sha256
    && before.producer.content_sha256 === after.producer.content_sha256;
  const status = child.status === 0 && !child.error && unchanged;
  const outputDigest = sha256Hex(Buffer.from(`${stdout.replace(/token|secret|cookie|authorization|password/giu, "redacted")}\0${stderr.replace(/token|secret|cookie|authorization|password/giu, "redacted")}`, "utf8"));
  const receipt: CommandReceiptV1 = {
    schema_version: COMMAND_RECEIPT_SCHEMA,
    role: input.role,
    argv: input.command,
    unit_id: manifest.unit_id,
    run_id: manifest.run_id,
    start_at: new Date(started).toISOString(),
    end_at: new Date(ended).toISOString(),
    duration_ms: ended - started,
    exit_code: typeof child.status === "number" ? child.status : null,
    signal: child.signal ?? null,
    overall: status ? "PASS" : "FAIL",
    redacted_output_sha256: outputDigest,
    diagnostic_counts: { stdoutLines: stdout ? stdout.split(/\r?\n/u).length : 0, stderrLines: stderr ? stderr.split(/\r?\n/u).length : 0, failures: status ? 0 : 1 },
    application_fingerprint: before.application,
    producer_fingerprint: before.producer,
  };
  const rolePath = input.output ?? `receipts/command-${input.role}.json`;
  const receiptPath = ensureContainedRunPath(manifest.run_root, rolePath.replace(/^auto:/u, "receipts/command-") + (rolePath.endsWith(".json") ? "" : ".json"));
  writeJsonNoOverwrite(receiptPath, receipt, 0o600);
  return { receipt, receiptPath, exitCode: status ? 0 : (typeof child.status === "number" ? child.status : 1) };
}

export function main(argv = process.argv.slice(2)): number {
  const split = splitCommand(argv);
  const values = parseStrictCli(split.options);
  if (cliBoolean(values, "help")) { console.log("Usage: bun run scripts/run-estimate-sheet-performance-gate.ts --unit=UNIT-001 --role=typecheck --run-manifest=PATH --output=auto:typecheck -- command args..."); return 0; }
  const unit = cliString(values, "unit", true) as string;
  const role = cliString(values, "role", true) as string;
  const runManifest = cliString(values, "run-manifest") ?? process.env.ESTIMATE_PERF_RUN_MANIFEST;
  const result = runEstimateSheetPerformanceGate({ repoRoot: process.cwd(), runManifest, unit, role, command: split.command, output: cliString(values, "output") });
  process.stdout.write(`${JSON.stringify({ ...result.receipt, receipt_path: result.receiptPath }, null, 2)}\n`);
  return result.exitCode;
}

if (import.meta.main) {
  try { process.exitCode = main(); }
  catch (error) { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; }
}
