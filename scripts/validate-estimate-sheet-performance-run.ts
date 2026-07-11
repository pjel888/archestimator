#!/usr/bin/env bun

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  assertRunManifest,
  cliBoolean,
  cliString,
  defaultRunRoot,
  parseStrictCli,
  readJsonFile,
  sha256File,
  type RunManifestV1,
} from "./lib/estimate-sheet-performance-contract";
import { computeEstimateSheetSourceFingerprint } from "./compute-estimate-sheet-source-fingerprint";

export type RunValidation = {
  valid: boolean;
  runManifest: string;
  runId: string;
  unitId: string;
  applicationFingerprintMatch: boolean;
  producerFingerprintMatch: boolean;
  sourceFingerprintMatch: boolean;
  artifacts: string[];
  errors: string[];
};

function findManifest(repoRoot: string, runRoot: string, runId?: string): string {
  if (runRoot.endsWith("run-manifest.json")) return runRoot;
  if (runId) {
    const direct = resolve(runRoot, runId, "run-manifest.json");
    if (existsSync(direct)) return direct;
    const unitRoots = ["UNIT-001", "UNIT-002", "UNIT-003", "UNIT-004", "UNIT-005", "UNIT-006", "UNIT-007", "UNIT-008", "UNIT-009", "UNIT-010", "UNIT-011"];
    for (const unit of unitRoots) {
      const unitRoot = resolve(runRoot, unit);
      if (!existsSync(unitRoot)) continue;
      const candidates = require("node:fs").readdirSync(unitRoot, { withFileTypes: true }).filter((entry: { isDirectory(): boolean }) => entry.isDirectory());
      for (const candidate of candidates) {
        if (candidate.name.startsWith(`${runId}-`)) {
          const path = resolve(unitRoot, candidate.name, "run-manifest.json");
          if (existsSync(path)) return path;
        }
      }
    }
  }
  throw new Error(`unable to resolve performance run manifest${runId ? ` for ${runId}` : ""}`);
}

export function validateEstimateSheetPerformanceRun(input: {
  repoRoot?: string;
  runRoot?: string;
  runId?: string;
  runManifest?: string;
  checkSource?: boolean;
}): RunValidation {
  const repoRoot = resolve(input.repoRoot ?? process.cwd());
  const manifestPath = resolve(input.runManifest ?? findManifest(repoRoot, input.runRoot ?? defaultRunRoot(repoRoot), input.runId));
  const errors: string[] = [];
  let run: RunManifestV1;
  try {
    run = readJsonFile<RunManifestV1>(manifestPath);
    assertRunManifest(run);
  } catch (error) {
    return { valid: false, runManifest: manifestPath, runId: "", unitId: "", applicationFingerprintMatch: false, producerFingerprintMatch: false, sourceFingerprintMatch: false, artifacts: [], errors: [error instanceof Error ? error.message : String(error)] };
  }
  if (resolve(run.run_root) !== resolve(manifestPath, "..")) errors.push("run_root does not contain run-manifest.json");
  if (resolve(run.pointer_path) !== resolve(run.run_root, "run-pointer.json")) errors.push("pointer_path must name run-pointer.json inside run root");
  const artifacts: string[] = [manifestPath];
  for (const child of ["run-pointer.json", "fixture-manifest.json", "jsdom-report.json", "browser-report.json", "d1-report.json", "mode-proof.json", "receipts"]) {
    const path = resolve(run.run_root, child);
    if (existsSync(path)) artifacts.push(path);
  }
  let applicationFingerprintMatch = true;
  let producerFingerprintMatch = true;
  let sourceFingerprintMatch = true;
  if (input.checkSource !== false) {
    try {
      const current = computeEstimateSheetSourceFingerprint({ repoRoot }).fingerprint;
      applicationFingerprintMatch = current.application.content_sha256 === run.applicationFingerprint.content_sha256
        && current.application.path_list_sha256 === run.applicationFingerprint.path_list_sha256;
      producerFingerprintMatch = current.producer.content_sha256 === run.producerFingerprint.content_sha256
        && current.producer.path_list_sha256 === run.producerFingerprint.path_list_sha256;
      sourceFingerprintMatch = current.head === run.sourceFingerprint.head
        && current.path_list_sha256 === run.sourceFingerprint.path_list_sha256
        && current.scoped_status_sha256 === run.sourceFingerprint.scoped_status_sha256
        && current.scoped_diff_sha256 === run.sourceFingerprint.scoped_diff_sha256;
      if (!applicationFingerprintMatch) errors.push("application fingerprint changed");
      if (!producerFingerprintMatch) errors.push("producer fingerprint changed");
      if (!sourceFingerprintMatch) errors.push("source fingerprint changed");
    } catch (error) { errors.push(`source fingerprint unavailable: ${error instanceof Error ? error.message : String(error)}`); applicationFingerprintMatch = false; producerFingerprintMatch = false; sourceFingerprintMatch = false; }
  }
  return { valid: errors.length === 0, runManifest: manifestPath, runId: run.run_id, unitId: run.unit_id, applicationFingerprintMatch, producerFingerprintMatch, sourceFingerprintMatch, artifacts, errors };
}

export function main(argv = process.argv.slice(2)): number {
  const values = parseStrictCli(argv);
  if (cliBoolean(values, "help")) { console.log("Usage: bun run scripts/validate-estimate-sheet-performance-run.ts --run-id=UUID [--run-manifest=PATH] [--no-source-check]"); return 0; }
  const result = validateEstimateSheetPerformanceRun({
    runId: cliString(values, "run-id"),
    runManifest: cliString(values, "run-manifest"),
    runRoot: cliString(values, "run-root"),
    checkSource: !cliBoolean(values, "no-source-check"),
  });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  return result.valid ? 0 : 1;
}

if (import.meta.main) {
  try { process.exitCode = main(); }
  catch (error) { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; }
}

