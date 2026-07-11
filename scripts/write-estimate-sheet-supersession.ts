#!/usr/bin/env bun

import { resolve } from "node:path";
import {
  SUPERSESSION_SCHEMA,
  assertRunManifest,
  canonicalJson,
  cliBoolean,
  cliString,
  ensureContainedRunPath,
  nowIso,
  parseStrictCli,
  readJsonFile,
  sha256File,
  sha256Json,
  writeJsonNoOverwrite,
  type EstimateUnit,
  type RunManifestV1,
} from "./lib/estimate-sheet-performance-contract";

const SUPERSEDABLE = new Set(["UNIT-005", "UNIT-006", "UNIT-007", "UNIT-008", "UNIT-009"]);

export type SupersessionReceiptV1 = {
  schema_version: typeof SUPERSESSION_SCHEMA;
  unit_id: string;
  run_id: string;
  decision_path: string;
  decision_sha256: string;
  action: "supersede";
  predecessor: { application_fingerprint: unknown; producer_fingerprint: unknown };
  application_fingerprint: unknown;
  producer_fingerprint: unknown;
  resources: [];
  mutations: [];
  output_role: "supersession";
  created_at: string;
  payload_sha256: string;
};

export function writeEstimateSheetSupersession(input: {
  unit: EstimateUnit;
  runManifest: string;
  decision: string;
  output?: string;
}): { receipt: SupersessionReceiptV1; outputPath: string } {
  if (!SUPERSEDABLE.has(input.unit)) throw new Error(`unit ${input.unit} cannot be superseded`);
  const manifest = readJsonFile<RunManifestV1>(resolve(input.runManifest));
  assertRunManifest(manifest);
  if (manifest.unit_id !== input.unit) throw new Error("supersession unit does not match run manifest");
  const decisionPath = resolve(input.decision);
  const decision = readJsonFile<Record<string, unknown>>(decisionPath);
  const branches = (decision.branches ?? decision.results) as Record<string, unknown> | undefined;
  const branch = branches?.[input.unit];
  const action = typeof branch === "string" ? branch : branch && typeof branch === "object" ? (branch as Record<string, unknown>).action ?? (branch as Record<string, unknown>).result : undefined;
  if (action !== "supersede" && action !== "SUPERSEDED") throw new Error(`decision does not supersede ${input.unit}`);
  const predecessor = { application_fingerprint: manifest.applicationFingerprint, producer_fingerprint: manifest.producerFingerprint };
  const payload = { schema_version: SUPERSESSION_SCHEMA, unit_id: input.unit, run_id: manifest.run_id, decision_path: input.decision, decision_sha256: sha256File(decisionPath), action: "supersede" as const, predecessor, application_fingerprint: manifest.applicationFingerprint, producer_fingerprint: manifest.producerFingerprint, resources: [] as [], mutations: [] as [], output_role: "supersession" as const, created_at: nowIso() };
  const receipt: SupersessionReceiptV1 = { ...payload, payload_sha256: sha256Json(payload) };
  const outputPath = ensureContainedRunPath(manifest.run_root, input.output ?? "supersession-receipt.json");
  writeJsonNoOverwrite(outputPath, receipt, 0o600);
  return { receipt, outputPath };
}

export function main(argv = process.argv.slice(2)): number {
  const values = parseStrictCli(argv);
  if (cliBoolean(values, "help")) { console.log("Usage: bun run scripts/write-estimate-sheet-supersession.ts --unit=UNIT-005 --run-manifest=PATH --decision=PATH --output=auto:supersession"); return 0; }
  const unit = cliString(values, "unit", true) as EstimateUnit;
  const runManifest = cliString(values, "run-manifest") ?? process.env.ESTIMATE_PERF_RUN_MANIFEST;
  const decision = cliString(values, "decision", true) as string;
  if (!runManifest) throw new Error("supersession requires --run-manifest");
  const output = cliString(values, "output")?.replace(/^auto:/u, "") || undefined;
  const result = writeEstimateSheetSupersession({ unit, runManifest, decision, output });
  process.stdout.write(`${JSON.stringify({ ...result.receipt, output_path: result.outputPath }, null, 2)}\n`);
  return 0;
}

if (import.meta.main) {
  try { process.exitCode = main(); }
  catch (error) { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; }
}

