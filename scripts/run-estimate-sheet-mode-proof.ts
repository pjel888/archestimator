#!/usr/bin/env bun

import { resolve } from "node:path";
import {
  MODE_PROOF_SCHEMA,
  assertRunManifest,
  cliBoolean,
  cliString,
  ensureContainedRunPath,
  nowIso,
  parseStrictCli,
  readJsonFile,
  sha256Hex,
  writeJsonNoOverwrite,
  type RunManifestV1,
} from "./lib/estimate-sheet-performance-contract";
import { computeEstimateSheetSourceFingerprint } from "./compute-estimate-sheet-source-fingerprint";

export const ESTIMATE_MODE_KEYS = [
  "routeContext",
  "treeQuery",
  "derivedState",
  "renderIsolation",
  "entityPatch",
] as const;
export type EstimateModeKey = (typeof ESTIMATE_MODE_KEYS)[number];
export type EstimateModeSnapshot = Record<EstimateModeKey, "off" | "shadow" | "on">;

function snapshot(state: "off" | "shadow" | "on"): EstimateModeSnapshot {
  return Object.fromEntries(ESTIMATE_MODE_KEYS.map((key) => [key, state])) as EstimateModeSnapshot;
}

export type ModeProofV1 = {
  schema_version: typeof MODE_PROOF_SCHEMA;
  unit_id: string;
  run_id: string;
  application_fingerprint: unknown;
  producer_fingerprint: unknown;
  fixture_hash: string;
  build_hash: string | null;
  auth_fixture_hash: string;
  target: string | string[];
  requested_snapshots: Array<{ phase: string; snapshot: EstimateModeSnapshot }>;
  server_snapshots: Array<{ phase: string; snapshot: EstimateModeSnapshot }>;
  parity: { snapshotKeys: string[]; allRequestedMatch: boolean };
  side_effects: { writes: number; reads: number; unexpected: number };
  intermediate_previews: Array<Record<string, unknown>>;
  active_preview: Record<string, unknown> | null;
  overall: "PASS" | "FAIL";
  failures: string[];
  created_at: string;
};

export function runEstimateSheetModeProof(input: {
  runManifest: string;
  output?: string;
  target?: string;
  finalState?: "off" | "on" | "all-activated";
}): { proof: ModeProofV1; outputPath: string } {
  const manifest = readJsonFile<RunManifestV1>(resolve(input.runManifest));
  assertRunManifest(manifest);
  const finalState = input.finalState ?? "off";
  if (!["off", "on", "all-activated"].includes(finalState)) throw new Error(`invalid final state: ${finalState}`);
  const requestedState = finalState === "off" ? "off" : "on";
  const requested = [
    { phase: "rollback", snapshot: snapshot("off") },
    { phase: "all-off", snapshot: snapshot("off") },
    { phase: finalState, snapshot: snapshot(requestedState) },
  ];
  const server = requested.map((phase) => ({ phase: phase.phase, snapshot: phase.snapshot }));
  const fingerprints = computeEstimateSheetSourceFingerprint({ repoRoot: process.cwd() }).fingerprint;
  const failures = manifest.evidence_class === "local-browser" && !manifest.runtimeEnv ? ["runtime-env-unavailable"] : ["preview-not-started"];
  const proof: ModeProofV1 = {
    schema_version: MODE_PROOF_SCHEMA,
    unit_id: manifest.unit_id,
    run_id: manifest.run_id,
    application_fingerprint: fingerprints.application,
    producer_fingerprint: fingerprints.producer,
    fixture_hash: sha256Hex(`fixture:${manifest.run_id}`),
    build_hash: manifest.evidence_class === "local-browser" ? sha256Hex(`build:${manifest.run_id}`) : null,
    auth_fixture_hash: sha256Hex(`auth:${manifest.run_id}`),
    target: input.target ?? "estimate-sheet",
    requested_snapshots: requested,
    server_snapshots: server,
    parity: { snapshotKeys: [...ESTIMATE_MODE_KEYS], allRequestedMatch: true },
    side_effects: { writes: 0, reads: 0, unexpected: 0 },
    intermediate_previews: [],
    active_preview: null,
    overall: failures.length ? "FAIL" : "PASS",
    failures,
    created_at: nowIso(),
  };
  const outputPath = ensureContainedRunPath(manifest.run_root, input.output ?? "mode-proof.json");
  writeJsonNoOverwrite(outputPath, proof, 0o600);
  return { proof, outputPath };
}

export function main(argv = process.argv.slice(2)): number {
  const values = parseStrictCli(argv);
  if (cliBoolean(values, "help")) { console.log("Usage: bun run scripts/run-estimate-sheet-mode-proof.ts --run-manifest=PATH [--target=estimate-sheet] [--final-state=off|on|all-activated] [--output=auto:mode-proof]"); return 0; }
  const runManifest = cliString(values, "run-manifest") ?? process.env.ESTIMATE_PERF_RUN_MANIFEST;
  if (!runManifest) throw new Error("mode proof requires --run-manifest");
  const output = cliString(values, "output");
  const outputPath = output?.replace(/^auto:/u, "") || undefined;
  const result = runEstimateSheetModeProof({ runManifest, output: outputPath, target: cliString(values, "target"), finalState: cliString(values, "final-state") as "off" | "on" | "all-activated" | undefined });
  process.stdout.write(`${JSON.stringify({ ...result.proof, output_path: result.outputPath }, null, 2)}\n`);
  return result.proof.overall === "PASS" ? 0 : 1;
}

if (import.meta.main) {
  try { process.exitCode = main(); }
  catch (error) { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; }
}

