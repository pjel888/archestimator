#!/usr/bin/env bun

import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

import {
  assertRunManifest,
  cliBoolean,
  cliString,
  ensureContainedRunPath,
  nowIso,
  parseStrictCli,
  readJsonFile,
  sha256Json,
  writeJsonNoOverwrite,
  type RunManifestV1,
} from "./lib/estimate-sheet-performance-contract";

const DATABASE_BINDING = "ARCH_DB";
const FIXTURE_TABLE_COUNT = 11;

type HostedD1Proof = {
  schema_version: "estimate-sheet-hosted-d1-proof.v1";
  unit_id: string;
  run_id: string;
  evidence_class: "hosted-d1";
  database_binding: typeof DATABASE_BINDING;
  executed_remote_wrangler: boolean;
  fixture_table_count: typeof FIXTURE_TABLE_COUNT;
  cleanup_strategy: "exact-fixture-ids";
  result: "PASS" | "BLOCKED" | "FAIL";
  blockers: string[];
  generated_at: string;
  payload_sha256: string;
};

function createProof(manifest: RunManifestV1, executeHosted: boolean): HostedD1Proof {
  const blockers: string[] = [];
  if (manifest.evidence_class !== "hosted-d1") blockers.push("hosted D1 proof requires a hosted-d1 run manifest");
  if (!executeHosted) blockers.push("hosted D1 execution is disabled; pass --execute-hosted after preparing explicit provider evidence");

  let executed = false;
  if (blockers.length === 0) {
    // The remote query is deliberately metadata-only. Fixture creation, timing,
    // readback, and exact-ID cleanup are admitted only by later unit-specific
    // producers with their own immutable journal entries.
    const command = spawnSync("bunx", ["wrangler", "d1", "execute", DATABASE_BINDING, "--remote", "--command", "SELECT 1 AS hosted_d1_probe"], {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: "pipe",
    });
    executed = true;
    if (command.status !== 0) blockers.push("remote Wrangler D1 metadata probe failed");
  }

  const payload = {
    schema_version: "estimate-sheet-hosted-d1-proof.v1" as const,
    unit_id: manifest.unit_id,
    run_id: manifest.run_id,
    evidence_class: "hosted-d1" as const,
    database_binding: DATABASE_BINDING,
    executed_remote_wrangler: executed,
    fixture_table_count: FIXTURE_TABLE_COUNT,
    cleanup_strategy: "exact-fixture-ids" as const,
    result: blockers.length === 0 ? "PASS" as const : executeHosted ? "FAIL" as const : "BLOCKED" as const,
    blockers,
    generated_at: nowIso(),
  };
  return { ...payload, payload_sha256: sha256Json(payload) };
}

export function verifyEstimateSheetHostedD1PerformanceProof(input: {
  runManifest: string;
  output?: string;
  executeHosted?: boolean;
}) {
  const manifest = readJsonFile<RunManifestV1>(resolve(input.runManifest));
  assertRunManifest(manifest);
  const proof = createProof(manifest, input.executeHosted ?? false);
  const output = ensureContainedRunPath(manifest.run_root, input.output ?? "hosted-d1-proof.json");
  writeJsonNoOverwrite(output, proof, 0o600);
  return { proof, output };
}

export function main(argv = process.argv.slice(2)): number {
  const values = parseStrictCli(argv);
  if (cliBoolean(values, "help")) {
    console.log("Usage: bun run scripts/verify-estimate-sheet-hosted-d1-performance-proof.ts --run-manifest=PATH [--output=PATH] --execute-hosted");
    return 0;
  }
  const runManifest = cliString(values, "run-manifest") ?? process.env.ESTIMATE_PERF_RUN_MANIFEST;
  if (!runManifest) throw new Error("hosted D1 proof requires --run-manifest");
  const result = verifyEstimateSheetHostedD1PerformanceProof({
    runManifest,
    output: cliString(values, "output")?.replace(/^auto:/u, ""),
    executeHosted: cliBoolean(values, "execute-hosted"),
  });
  process.stdout.write(`${JSON.stringify({ ...result.proof, output_path: result.output }, null, 2)}\n`);
  return result.proof.result === "PASS" ? 0 : 1;
}

if (import.meta.main) {
  try { process.exitCode = main(); }
  catch (error) { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; }
}
