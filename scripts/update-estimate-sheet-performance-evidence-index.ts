#!/usr/bin/env bun

import { existsSync } from "node:fs";
import { basename, resolve } from "node:path";

import {
  INDEX_SCHEMA,
  assertRegularFile,
  assertRunManifest,
  canonicalJson,
  cliBoolean,
  cliString,
  defaultEvidenceRoot,
  defaultPlanRoot,
  ensureContainedRunPath,
  nowIso,
  parseStrictCli,
  readJsonFile,
  resolveRunManifestPath,
  sha256File,
  sha256Json,
  writeJsonNoOverwrite,
  type RunManifestV1,
} from "./lib/estimate-sheet-performance-contract";

const EVIDENCE_IDS = new Set([
  "EVID-001", "EVID-002", "EVID-003", "EVID-004", "EVID-005", "EVID-006",
  "EVID-007", "EVID-008", "EVID-009", "EVID-010", "EVID-011", "EVID-012", "EVID-013",
]);

const EVIDENCE_INDEX_SCHEMA: typeof INDEX_SCHEMA = "estimate-sheet-evidence-index.v1";

export type EvidenceIndexV1 = {
  schema_version: typeof INDEX_SCHEMA;
  unit_id: RunManifestV1["unit_id"];
  run_id: string;
  status: "VERIFIED" | "BLOCKED" | "INCOMPLETE";
  evidence: Array<{
    id: string;
    immutable_path: string;
    sha256: string;
  }>;
  dependencySources: Array<{
    immutable_path: string;
    sha256: string;
  }>;
  cleanup?: {
    immutable_path: string;
    sha256: string;
  };
  projection: {
    path: string;
    source: "immutable-run";
  };
  secondaryEvidence?: Array<{
    role: string;
    immutable_path: string;
    sha256: string;
    projection_path: string;
  }>;
  created_at: string;
  payload_sha256: string;
};

function asInsideRun(manifest: RunManifestV1, path: string, label: string): string {
  const resolved = ensureContainedRunPath(manifest.run_root, path);
  assertRegularFile(resolved, label);
  return resolved;
}

function sourceEntry(path: string) {
  return { immutable_path: path, sha256: sha256File(path) };
}

function resolveRunArtifact(manifest: RunManifestV1, value: string): string {
  if (!value.startsWith("auto:")) return value;
  const role = value.slice("auto:".length);
  if (!role) throw new Error("auto evidence role is empty");
  if (role === "fixture") return `fixtures/${role}.json`;
  if (role === "jsdom" || role === "browser" || role === "d1-local") return `reports/${role}.json`;
  return `receipts/${role}.json`;
}

function assertProjectionIsNotSource(projectionPath: string, sources: string[]): void {
  const normalizedProjection = resolve(projectionPath);
  if (sources.some((source) => resolve(source) === normalizedProjection)) {
    throw new Error("evidence index projection cannot become its own immutable source (cyclic dependency)");
  }
}

export function updateEstimateSheetPerformanceEvidenceIndex(input: {
  runManifest: string;
  evidenceId: string;
  evidencePath: string;
  projectPath: string;
  status?: EvidenceIndexV1["status"];
  dependencies?: string[];
  cleanupReceipt?: string;
  secondary?: Array<{ role: string; evidencePath: string; projectPath: string }>;
}): { index: EvidenceIndexV1; indexPath: string; projectionPath: string } {
  if (!EVIDENCE_IDS.has(input.evidenceId)) throw new Error(`unknown evidence id: ${input.evidenceId}`);
  const manifest = readJsonFile<RunManifestV1>(resolve(input.runManifest));
  assertRunManifest(manifest);

  const evidencePath = asInsideRun(manifest, resolveRunArtifact(manifest, input.evidencePath), "evidence source");
  const dependencyPaths = (input.dependencies ?? []).map((path) => asInsideRun(manifest, resolveRunArtifact(manifest, path), "dependency source"));
  const admissionPath = manifest.admissionPath ? asInsideRun(manifest, manifest.admissionPath, "planning admission dependency") : undefined;
  if (admissionPath && sha256File(admissionPath) !== manifest.admissionSha256) throw new Error("planning admission dependency hash mismatch");
  const secondary = (input.secondary ?? []).map((entry) => ({
    role: entry.role,
    evidencePath: asInsideRun(manifest, resolveRunArtifact(manifest, entry.evidencePath), "secondary evidence source"),
    projectPath: resolve(entry.projectPath),
  }));
  const cleanupPath = input.cleanupReceipt
    ? asInsideRun(manifest, input.cleanupReceipt, "cleanup receipt")
    : undefined;
  const projectionPath = resolve(input.projectPath);
  const sourcePaths = [evidencePath, ...dependencyPaths, ...(admissionPath ? [admissionPath] : []), ...(cleanupPath ? [cleanupPath] : []), ...secondary.map((entry) => entry.evidencePath)];
  assertProjectionIsNotSource(projectionPath, sourcePaths);
  for (const entry of secondary) assertProjectionIsNotSource(entry.projectPath, sourcePaths);
  if (existsSync(projectionPath)) throw new Error(`refusing to overwrite existing projection: ${projectionPath}`);

  const payload = {
    schema_version: EVIDENCE_INDEX_SCHEMA,
    unit_id: manifest.unit_id,
    run_id: manifest.run_id,
    status: input.status ?? "VERIFIED" as const,
    evidence: [{ id: input.evidenceId, ...sourceEntry(evidencePath) }],
    dependencySources: [...dependencyPaths, ...(admissionPath ? [admissionPath] : [])].map(sourceEntry),
    ...(cleanupPath ? { cleanup: sourceEntry(cleanupPath) } : {}),
    projection: { path: projectionPath, source: "immutable-run" as const },
    ...(secondary.length ? { secondaryEvidence: secondary.map((entry) => ({ role: entry.role, ...sourceEntry(entry.evidencePath), projection_path: entry.projectPath })) } : {}),
    created_at: nowIso(),
  };
  const index: EvidenceIndexV1 = { ...payload, payload_sha256: sha256Json(payload) };
  const indexPath = ensureContainedRunPath(manifest.run_root, "evidence-index.json");
  assertProjectionIsNotSource(indexPath, sourcePaths);
  writeJsonNoOverwrite(indexPath, index, 0o600);

  // Projection bytes are the validated immutable index, not a separately mutable summary.
  writeJsonNoOverwrite(projectionPath, index, 0o600);
  for (const entry of secondary) writeJsonNoOverwrite(entry.projectPath, index, 0o600);
  return { index, indexPath, projectionPath };
}

export function main(argv = process.argv.slice(2)): number {
  const values = parseStrictCli(argv);
  if (cliBoolean(values, "help")) {
    console.log("Usage: bun run scripts/update-estimate-sheet-performance-evidence-index.ts --run-manifest=PATH --evidence-id=EVID-001 --evidence=PATH --project=PATH [--dependency=PATH,PATH] [--cleanup=PATH] [--status=VERIFIED]");
    return 0;
  }
  const unit = cliString(values, "unit", true) as string;
  const runManifest = resolveRunManifestPath(process.cwd(), unit, cliString(values, "run-manifest") ?? process.env.ESTIMATE_PERF_RUN_MANIFEST);
  const evidenceId = cliString(values, "evidence-id", true) as string;
  const evidencePath = cliString(values, "evidence", true) as string;
  const projectValue = cliString(values, "project");
  const projectPath = projectValue
    ? resolve(projectValue.startsWith("evidence/") ? defaultPlanRoot() : process.cwd(), projectValue)
    : resolve(defaultEvidenceRoot(), `${basename(evidencePath, ".json")}.json`);
  const status = cliString(values, "status") as EvidenceIndexV1["status"] | undefined;
  if (status !== undefined && !["VERIFIED", "BLOCKED", "INCOMPLETE"].includes(status)) throw new Error(`invalid index status: ${status}`);
  const dependencies = (cliString(values, "dependency") ?? "").split(",").filter(Boolean);
  const also = (cliString(values, "also") ?? "").split(",").filter(Boolean);
  const alsoProjects = (cliString(values, "also-project") ?? "").split(",").filter(Boolean);
  if (also.length !== alsoProjects.length) throw new Error("--also and --also-project counts must match");
  const result = updateEstimateSheetPerformanceEvidenceIndex({
    runManifest, evidenceId, evidencePath, projectPath, status, dependencies, cleanupReceipt: cliString(values, "cleanup"),
    secondary: also.map((evidence, index) => {
      const project = alsoProjects[index]!;
      return { role: evidence.replace(/^auto:/u, ""), evidencePath: evidence, projectPath: resolve(project.startsWith("evidence/") ? defaultPlanRoot() : process.cwd(), project) };
    }),
  });
  process.stdout.write(`${canonicalJson({ ...result.index, index_path: result.indexPath, projection_path: result.projectionPath })}\n`);
  return 0;
}

if (import.meta.main) {
  try { process.exitCode = main(); }
  catch (error) { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; }
}
