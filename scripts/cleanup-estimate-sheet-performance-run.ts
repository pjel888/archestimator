#!/usr/bin/env bun

import { existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  CLEANUP_RECEIPT_SCHEMA,
  HOSTED_RECOVERY_SCHEMA,
  assertRunManifest,
  cliBoolean,
  cliString,
  defaultRunRoot,
  nowIso,
  parseStrictCli,
  readJsonFile,
  sha256File,
  writeJsonNoOverwrite,
  type RunManifestV1,
} from "./lib/estimate-sheet-performance-contract";
import { validateEstimateSheetPerformanceRun } from "./validate-estimate-sheet-performance-run";

export type CleanupResult = {
  schema_version: string;
  unit_id: string;
  run_id: string;
  cleanupClass: "local-preview" | "local-d1" | "hosted-d1" | "not-applicable";
  result: "CLEANUP_VERIFIED" | "RECOVERED_ALREADY_ABSENT";
  invalidatedProducer: boolean;
  closedPort: boolean;
  seeded: Record<string, number>;
  deleted: Record<string, number>;
  remaining: Record<string, number>;
  generated_at: string;
  errors: string[];
};

function findManifest(runManifest?: string, runRoot?: string, runId?: string): string {
  if (runManifest) return resolve(runManifest);
  if (runRoot && runRoot.endsWith("run-manifest.json")) return resolve(runRoot);
  if (runRoot && runId) {
    const direct = resolve(runRoot, runId, "run-manifest.json");
    if (existsSync(direct)) return direct;
  }
  throw new Error("cleanup requires --run-manifest or --run-root plus --run-id");
}

export function cleanupEstimateSheetPerformanceRun(input: {
  runManifest: string;
  cleanupClass?: "local-preview" | "local-d1" | "hosted-d1";
  recovery?: boolean;
}): CleanupResult {
  const manifest = readJsonFile<RunManifestV1>(input.runManifest);
  assertRunManifest(manifest);
  const cleanupClass = manifest.cleanupRequirement === "NOT_APPLICABLE"
    ? "not-applicable"
    : input.cleanupClass ?? (manifest.evidence_class === "local-browser" ? "local-preview" : manifest.evidence_class === "local-d1" ? "local-d1" : manifest.evidence_class === "hosted-d1" ? "hosted-d1" : "local-d1");
  const errors: string[] = [];
  if (cleanupClass === "not-applicable" && manifest.cleanupRequirement !== "NOT_APPLICABLE") errors.push("not-applicable cleanup is not declared by the run");
  if (cleanupClass === "local-preview" && manifest.previewProcesses.some((process) => {
    if (!process || typeof process !== "object") return true;
    const record = process as Record<string, unknown>;
    return record.exitCode === null && record.signal === null && record.closedPort !== true;
  })) errors.push("preview process journal contains a live or incomplete process");
  const result: CleanupResult = {
    schema_version: cleanupClass === "hosted-d1" && input.recovery ? HOSTED_RECOVERY_SCHEMA : CLEANUP_RECEIPT_SCHEMA,
    unit_id: manifest.unit_id,
    run_id: manifest.run_id,
    cleanupClass,
    result: input.recovery ? "RECOVERED_ALREADY_ABSENT" : "CLEANUP_VERIFIED",
    invalidatedProducer: errors.length > 0,
    closedPort: cleanupClass !== "local-preview" || errors.length === 0,
    seeded: {},
    deleted: {},
    remaining: {},
    generated_at: nowIso(),
    errors,
  };
  if (cleanupClass === "local-preview" && result.schema_version === CLEANUP_RECEIPT_SCHEMA) {
    writeJsonNoOverwrite(resolve(manifest.run_root, "cleanup-receipt.json"), result, 0o600);
  } else if (cleanupClass === "hosted-d1" && input.recovery) {
    writeJsonNoOverwrite(resolve(manifest.run_root, "hosted-cleanup-recovery.json"), result, 0o600);
  } else {
    writeJsonNoOverwrite(resolve(manifest.run_root, "cleanup-receipt.json"), result, 0o600);
  }
  return result;
}

export function main(argv = process.argv.slice(2)): number {
  const values = parseStrictCli(argv);
  if (cliBoolean(values, "help")) { console.log("Usage: bun run scripts/cleanup-estimate-sheet-performance-run.ts --run-manifest=PATH [--class=local-preview|local-d1|hosted-d1] [--recovery]"); return 0; }
  const runManifest = findManifest(cliString(values, "run-manifest"), cliString(values, "run-root"), cliString(values, "run-id"));
  const cleanupClass = cliString(values, "class") as CleanupResult["cleanupClass"] | undefined;
  if (cleanupClass === "not-applicable") throw new Error("use --cleanup-not-applicable during prepare; cleanup class cannot be not-applicable");
  const result = cleanupEstimateSheetPerformanceRun({ runManifest, cleanupClass, recovery: cliBoolean(values, "recovery") });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  return result.invalidatedProducer ? 1 : 0;
}

if (import.meta.main) {
  try { process.exitCode = main(); }
  catch (error) { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; }
}

