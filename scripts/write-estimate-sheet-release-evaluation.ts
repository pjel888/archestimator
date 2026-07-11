#!/usr/bin/env bun

import { resolve } from "node:path";

import {
  RELEASE_EVALUATION_SCHEMA,
  assertRegularFile,
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
  writeNoOverwrite,
  type RunManifestV1,
} from "./lib/estimate-sheet-performance-contract";

const ESTIMATE_RELEASE_EVALUATION_SCHEMA: typeof RELEASE_EVALUATION_SCHEMA =
  "estimate-sheet-release-evaluation.v1";

type ReleaseStatus = "READY" | "NOT_READY" | "BLOCKED";

export type ReleaseEvaluationV1 = {
  schema_version: typeof RELEASE_EVALUATION_SCHEMA;
  unit_id: "UNIT-011";
  run_id: string;
  status: ReleaseStatus;
  dependencies: {
    hosted_d1: { immutable_path: string; sha256: string };
    release_gates: { immutable_path: string; sha256: string };
  };
  fieldInp: { status: "NOT_EVALUATED"; reason: string };
  manualScreenReader: { status: "NOT_EVALUATED"; reason: string };
  observability: { status: "NOT_EVALUATED"; reason: string };
  reasons: string[];
  created_at: string;
  payload_sha256: string;
};

function runSource(manifest: RunManifestV1, path: string, label: string) {
  const resolved = ensureContainedRunPath(manifest.run_root, path);
  assertRegularFile(resolved, label);
  return { immutable_path: resolved, sha256: sha256File(resolved) };
}

function renderReleaseEvaluation(payload: ReleaseEvaluationV1): string {
  const canonicalPayload = canonicalJson(payload);
  return `<!-- estimate-sheet-release-evaluation.v1 sha256=${sha256Json(payload)} -->\n\n# Release Evaluation\n\n\`\`\`json\n${canonicalPayload}\n\`\`\`\n\n## Status\n\n${payload.status}\n`;
}

export function writeEstimateSheetReleaseEvaluation(input: {
  runManifest: string;
  hostedD1: string;
  releaseGates: string;
  output?: string;
  status?: ReleaseStatus;
  reasons?: string[];
}): { evaluation: ReleaseEvaluationV1; outputPath: string } {
  const manifest = readJsonFile<RunManifestV1>(resolve(input.runManifest));
  assertRunManifest(manifest);
  if (manifest.unit_id !== "UNIT-011") throw new Error("release evaluation requires a UNIT-011 run");
  const hostedD1 = runSource(manifest, input.hostedD1, "hosted D1 proof");
  const releaseGates = runSource(manifest, input.releaseGates, "release-gates receipt");
  const status = input.status ?? "NOT_READY";
  const payload = {
    schema_version: ESTIMATE_RELEASE_EVALUATION_SCHEMA,
    unit_id: "UNIT-011" as const,
    run_id: manifest.run_id,
    status,
    dependencies: { hosted_d1: hostedD1, release_gates: releaseGates },
    fieldInp: { status: "NOT_EVALUATED" as const, reason: "production RUM is outside this no-deploy pack" },
    manualScreenReader: { status: "NOT_EVALUATED" as const, reason: "manual assistive-technology evidence is outside automated local proof" },
    observability: { status: "NOT_EVALUATED" as const, reason: "hosted observability ownership and delivery proof are evaluated separately" },
    reasons: [...new Set(input.reasons ?? [])].sort(),
    created_at: nowIso(),
  };
  const evaluation: ReleaseEvaluationV1 = { ...payload, payload_sha256: sha256Json(payload) };
  const outputPath = ensureContainedRunPath(manifest.run_root, input.output ?? "release-evaluation.md");
  writeNoOverwrite(outputPath, renderReleaseEvaluation(evaluation), 0o600);
  return { evaluation, outputPath };
}

export function main(argv = process.argv.slice(2)): number {
  const values = parseStrictCli(argv);
  if (cliBoolean(values, "help")) {
    console.log("Usage: bun run scripts/write-estimate-sheet-release-evaluation.ts --run-manifest=PATH --hosted-d1=PATH --release-gates=PATH [--status=READY|NOT_READY|BLOCKED] [--reason=code] [--output=PATH]");
    return 0;
  }
  const runManifest = cliString(values, "run-manifest") ?? process.env.ESTIMATE_PERF_RUN_MANIFEST;
  if (!runManifest) throw new Error("release evaluation requires --run-manifest");
  const status = cliString(values, "status") as ReleaseStatus | undefined;
  if (status !== undefined && !["READY", "NOT_READY", "BLOCKED"].includes(status)) throw new Error(`invalid release status: ${status}`);
  const result = writeEstimateSheetReleaseEvaluation({
    runManifest,
    hostedD1: cliString(values, "hosted-d1", true) as string,
    releaseGates: cliString(values, "release-gates", true) as string,
    output: cliString(values, "output")?.replace(/^auto:/u, ""),
    status,
    reasons: (cliString(values, "reason") ?? "").split(",").filter(Boolean),
  });
  process.stdout.write(`${canonicalJson({ ...result.evaluation, output_path: result.outputPath })}\n`);
  return result.evaluation.status === "READY" ? 0 : 1;
}

if (import.meta.main) {
  try { process.exitCode = main(); }
  catch (error) { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; }
}
