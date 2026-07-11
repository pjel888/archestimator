#!/usr/bin/env bun

import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import {
  canonicalJson,
  cliBoolean,
  cliString,
  createRunId,
  defaultEvidenceRoot,
  defaultPlanRoot,
  defaultRunRoot,
  isSha256,
  nowIso,
  parseStrictCli,
  requireProfile,
  requireUnit,
  sha256File,
  sha256Hex,
  writeJsonNoOverwrite,
  type EstimateUnit,
  type FixtureProfile,
  type RunManifestV1,
  type SourceFingerprint,
} from "./lib/estimate-sheet-performance-contract";
import { computeEstimateSheetSourceFingerprint } from "./compute-estimate-sheet-source-fingerprint";

type PlanPack = {
  package_id?: string;
  package_status?: string;
  next_unit?: string | null;
  implementation_status?: string;
  runtime_evidence?: unknown;
  manifest_sha256?: string;
};

export type PreparedRun = {
  run: RunManifestV1;
  runManifestPath: string;
  pointerPath: string;
};

function readPlanPack(planRoot: string): PlanPack {
  const path = resolve(planRoot, "plan-pack.json");
  if (!existsSync(path)) throw new Error(`plan-pack.json is missing: ${path}`);
  return JSON.parse(readFileSync(path, "utf8")) as PlanPack;
}

function readAdmission(repoRoot: string, path: string | undefined, unit: EstimateUnit): { path: string; sha256: string } | undefined {
  if (!path) return undefined;
  const admissionPath = resolve(repoRoot, path);
  if (!existsSync(admissionPath)) throw new Error(`planning admission is missing: ${admissionPath}`);
  const admission = JSON.parse(readFileSync(admissionPath, "utf8")) as Record<string, unknown>;
  if (admission.schema_version !== "estimate-sheet-planning-admission.v1") throw new Error("planning admission schema is invalid");
  if (admission.unit_id !== unit || admission.package_status !== "IMPLEMENTATION_READY" || admission.next_unit !== unit) throw new Error("planning admission does not admit the selected unit");
  return { path: path.replaceAll("\\", "/"), sha256: sha256File(admissionPath) };
}

function namespace(seed: string): { idSha256: string; preStateSha256: string } {
  return {
    idSha256: sha256Hex(`estimate-sheet-namespace\0${seed}`),
    preStateSha256: sha256Hex(`estimate-sheet-pre-state\0${seed}`),
  };
}

export function prepareEstimateSheetPerformanceRun(input: {
  repoRoot?: string;
  planRoot?: string;
  runRoot?: string;
  unit: EstimateUnit;
  profile: FixtureProfile | "artifact-only";
  artifactOnly?: boolean;
  cleanupNotApplicable?: boolean;
  admissionPath?: string;
  evidenceClass?: "jsdom" | "local-browser" | "local-d1" | "hosted-d1";
}): PreparedRun {
  const repoRoot = resolve(input.repoRoot ?? process.cwd());
  const planRoot = resolve(input.planRoot ?? defaultPlanRoot(repoRoot));
  const runRootBase = resolve(input.runRoot ?? defaultRunRoot(repoRoot));
  const plan = readPlanPack(planRoot);
  if (plan.package_status !== "IMPLEMENTATION_READY") throw new Error(`plan package is not implementation-ready: ${plan.package_status ?? "missing"}`);
  if (plan.next_unit !== input.unit) throw new Error(`plan next unit is ${plan.next_unit ?? "none"}, not ${input.unit}`);
  const artifactOnly = input.artifactOnly === true || input.profile === "artifact-only";
  const cleanupNotApplicable = input.cleanupNotApplicable === true;
  if (artifactOnly && input.unit !== "UNIT-001" && input.unit !== "UNIT-004") throw new Error("artifact-only runs are limited to UNIT-001 and UNIT-004");
  if (cleanupNotApplicable && !artifactOnly) throw new Error("cleanup-not-applicable requires artifact-only mode");
  if (input.unit === "UNIT-001" && !input.admissionPath && !process.env.ESTIMATE_PERF_PLANNING_ADMISSION) throw new Error("UNIT-001 requires ESTIMATE_PERF_PLANNING_ADMISSION or --planning-admission");
  const admission = readAdmission(repoRoot, input.admissionPath ?? process.env.ESTIMATE_PERF_PLANNING_ADMISSION, input.unit);
  const fingerprint = computeEstimateSheetSourceFingerprint({ repoRoot }).fingerprint as SourceFingerprint;
  const runId = createRunId();
  const applicationShort = fingerprint.application.content_sha256.slice(0, 12);
  const inputShort = sha256Hex(canonicalJson({ unit: input.unit, profile: input.profile, evidenceClass: input.evidenceClass ?? (artifactOnly ? "jsdom" : undefined) })).slice(0, 12);
  const unitRoot = resolve(runRootBase, input.unit);
  const runPath = resolve(unitRoot, `${runId}-${applicationShort}-${inputShort}`);
  const pointerPath = resolve(runPath, "run-pointer.json");
  const runManifestPath = resolve(runPath, "run-manifest.json");
  const profile = artifactOnly ? "artifact-only" : input.profile;
  const fixtureProfile = profile === "artifact-only" ? undefined : requireProfile(profile);
  const cleanupRequirement = cleanupNotApplicable ? "NOT_APPLICABLE" : "REQUIRED";
  const namespaces = fixtureProfile
    ? {
      mode: namespace(`${runId}:mode`),
      ...(input.evidenceClass === "local-browser" ? { browser: namespace(`${runId}:browser`) } : {}),
      ...(input.evidenceClass === "local-d1" ? { d1: namespace(`${runId}:d1`) } : {}),
    }
    : {};
  const primaryNamespace = fixtureProfile ? (namespaces as { mode?: { idSha256: string; preStateSha256: string } }).mode ?? namespace(`${runId}:artifact`) : undefined;
  const run: RunManifestV1 = {
    schema_version: "estimate-sheet-performance-run.v1",
    package_id: plan.package_id ?? "PLAN-2026-07-08-project-estimate-sheet-performance",
    unit_id: input.unit,
    run_id: runId,
    profile,
    ...(input.evidenceClass ? { evidence_class: input.evidenceClass } : {}),
    cleanupRequirement,
    run_root: runPath,
    pointer_path: pointerPath,
    created_at: nowIso(),
    status: "PREPARED",
    sourceFingerprint: fingerprint,
    applicationFingerprint: fingerprint.application,
    producerFingerprint: fingerprint.producer,
    ...(fixtureProfile && primaryNamespace ? { fixture: { profile: fixtureProfile, namespaceIdSha256: primaryNamespace.idSha256, preStateSha256: primaryNamespace.preStateSha256 } } : {}),
    namespaces,
    mutationJournal: [],
    previewProcesses: [],
    ...(admission ? { admissionPath: admission.path, admissionSha256: admission.sha256 } : {}),
  };
  writeJsonNoOverwrite(runManifestPath, run, 0o600);
  writeJsonNoOverwrite(pointerPath, { schema_version: "estimate-sheet-performance-run-pointer.v1", unit_id: input.unit, run_id: runId, run_root: runPath, run_manifest: "run-manifest.json", application_fingerprint: fingerprint.application.content_sha256, producer_fingerprint: fingerprint.producer.content_sha256 }, 0o600);
  return { run, runManifestPath, pointerPath };
}

export function main(argv = process.argv.slice(2)): number {
  const values = parseStrictCli(argv);
  if (cliBoolean(values, "help")) {
    console.log("Usage: bun run scripts/prepare-estimate-sheet-performance-run.ts --unit=UNIT-001 --profile=limit [--artifact-only] [--cleanup-not-applicable] [--planning-admission=PATH]");
    return 0;
  }
  const unit = requireUnit(cliString(values, "unit", true));
  const profileRaw = cliString(values, "profile", true);
  const profile = profileRaw === "artifact-only" ? "artifact-only" : requireProfile(profileRaw);
  const prepared = prepareEstimateSheetPerformanceRun({
    unit,
    profile,
    artifactOnly: cliBoolean(values, "artifact-only"),
    cleanupNotApplicable: cliBoolean(values, "cleanup-not-applicable"),
    admissionPath: cliString(values, "planning-admission"),
    evidenceClass: cliString(values, "evidence-class") as PreparedRun["run"]["evidence_class"],
  });
  process.stdout.write(`${JSON.stringify({ run_id: prepared.run.run_id, run_root: prepared.run.run_root, run_manifest: prepared.runManifestPath, pointer: prepared.pointerPath, application_fingerprint: prepared.run.applicationFingerprint.content_sha256, producer_fingerprint: prepared.run.producerFingerprint.content_sha256 }, null, 2)}\n`);
  return 0;
}

if (import.meta.main) {
  try { process.exitCode = main(); }
  catch (error) { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; }
}
