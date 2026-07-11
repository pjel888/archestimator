#!/usr/bin/env bun

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import {
  assertNoSensitiveValue,
  canonicalJson,
  cliBoolean,
  cliString,
  parseStrictCli,
  sha256Hex,
  writeNoOverwrite,
  type SourceFingerprint,
} from "./lib/estimate-sheet-performance-contract";

const STARTUP_CONTROLS = [
  "NODE_OPTIONS",
  "NODE_PATH",
  "BUN_OPTIONS",
  "LD_PRELOAD",
  "LD_LIBRARY_PATH",
  "DYLD_INSERT_LIBRARIES",
  "DYLD_LIBRARY_PATH",
] as const;

export function assertFingerprintRuntime(): void {
  const controls = STARTUP_CONTROLS.filter((key) => process.env[key]);
  if (process.execArgv.length || controls.length) throw new Error(`runtime startup controls are not permitted: ${[...(process.execArgv.length ? ["execArgv"] : []), ...controls].join(", ")}`);
}

export function referenceFingerprintPath(repoRoot = process.cwd()): string {
  return resolve(repoRoot, ".ai/03_plans/2026-07-08/Project-Estimate-Sheet-Performance-Optimization/evidence/source-fingerprint-v1.mjs");
}

function runReference(repoRoot: string, referencePath: string, verify: boolean): Buffer {
  if (!existsSync(referencePath)) throw new Error(`fingerprint reference is missing: ${referencePath}`);
  assertNoSensitiveValue(referencePath, "reference path");
  const env = {
    PATH: "/opt/homebrew/bin:/usr/bin:/bin",
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
  return execFileSync(process.execPath, [referencePath, ...(verify ? ["--verify"] : [])], {
    cwd: repoRoot,
    env,
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 128 * 1024 * 1024,
  });
}

export function computeEstimateSheetSourceFingerprint(input: {
  repoRoot?: string;
  referencePath?: string;
  verify?: boolean;
} = {}): { bytes: Buffer; fingerprint: SourceFingerprint } {
  assertFingerprintRuntime();
  const repoRoot = resolve(input.repoRoot ?? process.cwd());
  const referencePath = input.referencePath ?? referenceFingerprintPath(repoRoot);
  const bytes = runReference(repoRoot, referencePath, input.verify === true);
  let fingerprint: SourceFingerprint;
  try { fingerprint = JSON.parse(bytes.toString("utf8")) as SourceFingerprint; } catch { throw new Error("fingerprint reference emitted invalid JSON"); }
  if (fingerprint.contract_version !== "estimate-sheet-source-fingerprint.v2" || !fingerprint.application || !fingerprint.producer) throw new Error("fingerprint reference emitted an unsupported schema");
  return { bytes, fingerprint };
}

export function main(argv = process.argv.slice(2)): number {
  const values = parseStrictCli(argv);
  if (cliBoolean(values, "help")) {
    console.log("Usage: bun run scripts/compute-estimate-sheet-source-fingerprint.ts [--output=PATH] [--compare-reference=PATH] [--verify]");
    return 0;
  }
  const repoRoot = resolve(process.env.ESTIMATE_PERF_REPO_ROOT ?? process.cwd());
  const compareReference = cliString(values, "compare-reference");
  const output = cliString(values, "output");
  const verify = cliBoolean(values, "verify");
  const result = computeEstimateSheetSourceFingerprint({ repoRoot, referencePath: compareReference ?? referenceFingerprintPath(repoRoot), verify });
  if (compareReference) {
    const expected = readFileSync(compareReference);
    if (sha256Hex(expected) !== sha256Hex(result.bytes) || expected.toString("utf8") !== result.bytes.toString("utf8")) throw new Error("typed fingerprint output differs from reference output");
  }
  if (output) {
    writeNoOverwrite(resolve(repoRoot, output), result.bytes, 0o600);
  } else {
    process.stdout.write(result.bytes);
  }
  return 0;
}

if (import.meta.main) {
  try { process.exitCode = main(); }
  catch (error) { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; }
}

