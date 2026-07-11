#!/usr/bin/env bun

import { existsSync } from "node:fs";
import { relative, resolve } from "node:path";

import {
  MODE_PROOF_SCHEMA,
  assertRunManifest,
  canonicalJson,
  cliBoolean,
  cliString,
  ensureContainedRunPath,
  fingerprintContentEqual,
  isPlainObject,
  nowIso,
  parseStrictCli,
  readJsonFile,
  resolveRunManifestPath,
  sha256File,
  writeJsonNoOverwrite,
  type RunManifestV1,
} from "./lib/estimate-sheet-performance-contract";
import { computeEstimateSheetSourceFingerprint } from "./compute-estimate-sheet-source-fingerprint";
import {
  readPreviewProcessJournal,
  replaceRuntimeEnvironmentSnapshot,
  resolveBenchmarkPort,
  startEstimateSheetBenchmarkServer,
  stopPreviewProcess,
  validateRuntimeEnvironment,
  type BenchmarkServerDescriptor,
  type EstimateModeValues,
  type EstimateServerModeSnapshot,
  type PreviewProcessEntry,
} from "./start-estimate-sheet-benchmark-server";

const TARGET_BY_UNIT = {
  "UNIT-005": "ESTIMATE_ROUTE_FAST_PATH_MODE",
  "UNIT-006": "ESTIMATE_GRAPH_MODE",
  "UNIT-007": "ESTIMATE_INCREMENTAL_DERIVATION_MODE",
  "UNIT-008": "ESTIMATE_RENDER_BOUNDARY_MODE",
  "UNIT-009": "ESTIMATE_ENTITY_PATCH_MODE",
} as const;
const MODE_KEY_BY_ENV = {
  ESTIMATE_ROUTE_FAST_PATH_MODE: "routeFastPath",
  ESTIMATE_GRAPH_MODE: "graph",
  ESTIMATE_INCREMENTAL_DERIVATION_MODE: "incrementalDerivation",
  ESTIMATE_RENDER_BOUNDARY_MODE: "renderBoundary",
  ESTIMATE_ENTITY_PATCH_MODE: "entityPatch",
} as const;
const ORDERED_MODE_KEYS = ["routeFastPath", "graph", "incrementalDerivation", "renderBoundary", "entityPatch"] as const;
const EXACT_PHASES = ["off", "shadow", "on", "rollback"] as const;

type ModeUnit = keyof typeof TARGET_BY_UNIT | "UNIT-010";
type RuntimeModeManifest = RunManifestV1 & {
  fixture_hash?: unknown;
  auth_fixture_hash?: unknown;
  activatedModes?: unknown;
};

export type ModeProofV1 = {
  schema_version: typeof MODE_PROOF_SCHEMA;
  unit_id: string;
  run_id: string;
  application_fingerprint: unknown;
  producer_fingerprint: unknown;
  fixture_hash: string;
  build_hash: string;
  auth_fixture_hash: string;
  fixture_role: "mode";
  target: string | string[];
  requested_snapshots: Array<{ phase: string; snapshot: EstimateServerModeSnapshot }>;
  server_snapshots: Array<{ phase: string; snapshot: EstimateServerModeSnapshot }>;
  parity: { snapshotKeys: string[]; allRequestedMatch: boolean };
  side_effects: { writes: number; reads: number; unexpected: number };
  scope_measurements: { previewStarts: number; previewStops: number; snapshotChecks: number };
  intermediate_previews: PreviewProcessEntry[];
  active_preview: BenchmarkServerDescriptor | null;
  overall: "PASS" | "FAIL";
  failures: string[];
  created_at: string;
};

export type ModeProofAttemptV1 = Omit<ModeProofV1, "schema_version" | "build_hash" | "active_preview" | "overall"> & {
  schema_version: "estimate-sheet-performance-attempt.v1";
  attempted_schema: typeof MODE_PROOF_SCHEMA;
  build_hash: string | null;
  active_preview: null;
  overall: "FAIL";
};

export type ModeProofArtifact = ModeProofV1 | ModeProofAttemptV1;

function isSha256(value: unknown): value is string {
  return typeof value === "string" && /^[a-f0-9]{64}$/u.test(value);
}

function cloneModes(modes: EstimateModeValues): EstimateModeValues {
  return { ...modes };
}

function allOffModes(): EstimateModeValues {
  return {
    routeFastPath: "off",
    graph: "off",
    incrementalDerivation: "off",
    renderBoundary: "off",
    entityPatch: "off",
  };
}

function resolveActivatedModeKeys(manifest: RuntimeModeManifest): Array<keyof EstimateModeValues> {
  if (!Array.isArray(manifest.activatedModes) || manifest.activatedModes.length === 0) {
    throw new Error("mode proof requires a decision-bound activatedModes list in the run manifest");
  }
  const keys = manifest.activatedModes.map((value) => {
    if (typeof value !== "string" || !(value in MODE_KEY_BY_ENV)) throw new Error("activatedModes contains an unknown mode key");
    return MODE_KEY_BY_ENV[value as keyof typeof MODE_KEY_BY_ENV];
  });
  if (new Set(keys).size !== keys.length) throw new Error("activatedModes contains a duplicate mode key");
  return ORDERED_MODE_KEYS.filter((key) => keys.includes(key));
}

function phaseModes(input: {
  baseModes: EstimateModeValues;
  phase: (typeof EXACT_PHASES)[number] | "final";
  targetKey?: keyof EstimateModeValues;
  activatedKeys?: Array<keyof EstimateModeValues>;
}): EstimateModeValues {
  if (input.activatedKeys) {
    const modes = allOffModes();
    const value = input.phase === "shadow" ? "shadow" : input.phase === "on" || input.phase === "final" ? "on" : "off";
    for (const key of input.activatedKeys) modes[key] = value;
    return modes;
  }
  if (!input.targetKey) throw new Error("mode target is missing");
  const modes = cloneModes(input.baseModes);
  modes[input.targetKey] = input.phase === "shadow" ? "shadow" : input.phase === "on" || input.phase === "final" ? "on" : "off";
  return modes;
}

function processForPid(manifest: RuntimeModeManifest, pid: number): PreviewProcessEntry {
  const process = readPreviewProcessJournal(manifest).processes.find((entry) => entry.pid === pid);
  if (!process) throw new Error(`mode preview PID ${pid} disappeared from its journal`);
  return process;
}

function resolveOutputPath(manifest: RuntimeModeManifest, output?: string): string {
  if (output !== undefined && output !== "auto:mode-proof") throw new Error("mode proof output must be auto:mode-proof");
  const path = ensureContainedRunPath(manifest.run_root, "mode-proof.json");
  if (existsSync(path)) throw new Error(`mode proof already exists: ${path}`);
  return path;
}

export async function runEstimateSheetModeProof(input: {
  runManifest: string;
  repoRoot?: string;
  output?: string;
  target?: string;
  matrix?: string;
  phases?: string;
  finalState?: "on" | "all-activated";
  fixtureRole?: string;
  checkSource?: boolean;
  commandOverride?: string[];
}): Promise<{ proof: ModeProofArtifact; outputPath: string }> {
  const repoRoot = resolve(input.repoRoot ?? process.cwd());
  const manifestPath = resolve(input.runManifest);
  let manifest = readJsonFile<RuntimeModeManifest>(manifestPath);
  assertRunManifest(manifest);
  if (!Object.prototype.hasOwnProperty.call(TARGET_BY_UNIT, manifest.unit_id) && manifest.unit_id !== "UNIT-010") {
    throw new Error("mode proof is restricted to activated UNIT-005..UNIT-010 runs");
  }
  if (manifest.evidence_class !== "local-browser" || manifest.cleanupRequirement !== "REQUIRED") {
    throw new Error("mode proof requires a local-browser run with required cleanup");
  }
  if (resolve(manifest.run_root, "run-manifest.json") !== manifestPath) throw new Error("mode proof must consume the prepared run-root manifest");
  if (input.fixtureRole !== "mode") throw new Error("mode proof requires --fixture-role=mode");
  if (!isPlainObject(manifest.namespaces.mode)) throw new Error("mode proof run is missing its isolated mode namespace");
  if (input.phases !== EXACT_PHASES.join(",")) throw new Error("mode proof phases must be exactly off,shadow,on,rollback");
  if (!isSha256(manifest.fixture_hash) || !isSha256(manifest.auth_fixture_hash)) {
    throw new Error("mode proof run is missing fixture/auth hashes");
  }
  const fixtureHash = manifest.fixture_hash;
  const authFixtureHash = manifest.auth_fixture_hash;
  if (input.checkSource === false && process.env.NODE_ENV !== "test") throw new Error("source checks can be disabled only in focused tests");
  if (input.checkSource !== false) {
    const current = computeEstimateSheetSourceFingerprint({ repoRoot }).fingerprint;
    if (!fingerprintContentEqual(current.application, manifest.applicationFingerprint)
      || !fingerprintContentEqual(current.producer, manifest.producerFingerprint)) {
      throw new Error("mode proof source fingerprint does not match the prepared run");
    }
  }
  const port = resolveBenchmarkPort(manifest);
  validateRuntimeEnvironment(manifest, port);
  const unit = manifest.unit_id as ModeUnit;
  const isMatrix = unit === "UNIT-010";
  const expectedTarget = isMatrix ? undefined : TARGET_BY_UNIT[unit as keyof typeof TARGET_BY_UNIT];
  if (isMatrix) {
    if (input.matrix !== "all-activated" || input.target !== undefined || input.finalState !== "all-activated") {
      throw new Error("UNIT-010 requires matrix=all-activated and final-state=all-activated");
    }
  } else if (input.target !== expectedTarget || input.matrix !== undefined || input.finalState !== "on") {
    throw new Error(`${unit} requires target=${expectedTarget} and final-state=on`);
  }
  const targetKey = expectedTarget ? MODE_KEY_BY_ENV[expectedTarget] : undefined;
  const activatedKeys = resolveActivatedModeKeys(manifest);
  if (!isMatrix && targetKey) {
    const targetIndex = ORDERED_MODE_KEYS.indexOf(targetKey);
    if (!activatedKeys.includes(targetKey)) throw new Error(`${unit} activatedModes does not include its target mode`);
    if (activatedKeys.some((key) => ORDERED_MODE_KEYS.indexOf(key) > targetIndex)) throw new Error(`${unit} activatedModes includes a future mode`);
  }
  const baseModes = allOffModes();
  if (!isMatrix) for (const key of activatedKeys) if (key !== targetKey) baseModes[key] = "on";
  const target: string | string[] = isMatrix
    ? activatedKeys!.map((key) => Object.entries(MODE_KEY_BY_ENV).find(([, value]) => value === key)![0])
    : expectedTarget!;
  const outputPath = resolveOutputPath(manifest, input.output);
  const requestedSnapshots: ModeProofV1["requested_snapshots"] = [];
  const serverSnapshots: ModeProofV1["server_snapshots"] = [];
  const intermediatePreviews: PreviewProcessEntry[] = [];
  const failures: string[] = [];
  let buildHash: string | null = null;
  let activePreview: BenchmarkServerDescriptor | null = null;
  let currentPid: number | null = null;

  try {
    for (const phase of EXACT_PHASES) {
      const requestedModes = phaseModes({ baseModes, phase, targetKey, activatedKeys: isMatrix ? activatedKeys : undefined });
      const runtime = replaceRuntimeEnvironmentSnapshot(manifestPath, requestedModes);
      requestedSnapshots.push({ phase, snapshot: runtime.snapshot });
      const descriptor = await startEstimateSheetBenchmarkServer({
        runManifest: manifestPath,
        repoRoot,
        role: "mode",
        phase,
        finalState: phase === "rollback" ? "off" : phase,
        activate: false,
        commandOverride: input.commandOverride,
        checkSource: input.checkSource,
      });
      currentPid = descriptor.pid;
      buildHash ??= descriptor.build_hash;
      if (descriptor.build_hash !== buildHash) throw new Error("mode preview build hash changed between phases");
      serverSnapshots.push({ phase, snapshot: descriptor.server_snapshot });
      const stopped = await stopPreviewProcess({ runManifest: manifestPath, pid: descriptor.pid });
      currentPid = null;
      intermediatePreviews.push(stopped);
    }

    const finalModes = phaseModes({ baseModes, phase: "final", targetKey, activatedKeys: isMatrix ? activatedKeys : undefined });
    const finalRuntime = replaceRuntimeEnvironmentSnapshot(manifestPath, finalModes);
    requestedSnapshots.push({ phase: "final", snapshot: finalRuntime.snapshot });
    activePreview = await startEstimateSheetBenchmarkServer({
      runManifest: manifestPath,
      repoRoot,
      role: "mode",
      phase: "final",
      finalState: input.finalState,
      activate: true,
      commandOverride: input.commandOverride,
      checkSource: input.checkSource,
    });
    currentPid = activePreview.pid;
    buildHash ??= activePreview.build_hash;
    if (activePreview.build_hash !== buildHash) throw new Error("final mode preview build hash differs from intermediate phases");
    serverSnapshots.push({ phase: "final", snapshot: activePreview.server_snapshot });
  } catch (error) {
    failures.push(error instanceof Error ? error.message : String(error));
    if (currentPid !== null) {
      try { await stopPreviewProcess({ runManifest: manifestPath, pid: currentPid }); }
      catch (cleanupError) { failures.push(`preview cleanup failed: ${cleanupError instanceof Error ? cleanupError.message : String(cleanupError)}`); }
      currentPid = null;
      activePreview = null;
    }
  }

  manifest = readJsonFile<RuntimeModeManifest>(manifestPath);
  const parity = requestedSnapshots.length === serverSnapshots.length
    && requestedSnapshots.every((requested, index) => requested.phase === serverSnapshots[index]?.phase
      && canonicalJson(requested.snapshot.modes) === canonicalJson(serverSnapshots[index]?.snapshot.modes));
  if (!parity) failures.push("requested and server-returned snapshots differ");
  const finalProcess = activePreview ? processForPid(manifest, activePreview.pid) : null;
  if (activePreview && (finalProcess?.readiness !== "READY" || finalProcess.exit_code !== null || finalProcess.signal !== null)) {
    failures.push("final active preview is not the sole ready live process");
  }
  let journal = readPreviewProcessJournal(manifest);
  if (failures.length > 0 && activePreview) {
    try {
      await stopPreviewProcess({ runManifest: manifestPath, pid: activePreview.pid });
      activePreview = null;
      manifest = readJsonFile<RuntimeModeManifest>(manifestPath);
      journal = readPreviewProcessJournal(manifest);
    } catch (error) {
      throw new Error(`invalid mode proof could not terminate its final preview: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  const liveProcesses = journal.processes.filter((entry) => entry.exit_code === null && entry.signal === null);
  if (activePreview && (liveProcesses.length !== 1 || liveProcesses[0]?.pid !== activePreview.pid)) failures.push("mode proof did not leave exactly one active final preview");
  if (!activePreview && liveProcesses.length !== 0) failures.push("failed mode proof left a live preview");
  if (!buildHash) failures.push("no verified OpenNext build hash was observed");

  const common = {
    unit_id: manifest.unit_id,
    run_id: manifest.run_id,
    application_fingerprint: manifest.applicationFingerprint,
    producer_fingerprint: manifest.producerFingerprint,
    fixture_hash: fixtureHash,
    auth_fixture_hash: authFixtureHash,
    fixture_role: "mode",
    target,
    requested_snapshots: requestedSnapshots,
    server_snapshots: serverSnapshots,
    parity: { snapshotKeys: [...ORDERED_MODE_KEYS], allRequestedMatch: parity },
    side_effects: { writes: 0, reads: serverSnapshots.length, unexpected: failures.length },
    scope_measurements: {
      previewStarts: journal.processes.length,
      previewStops: journal.processes.filter((entry) => entry.exit_code !== null || entry.signal !== null).length,
      snapshotChecks: serverSnapshots.length,
    },
    intermediate_previews: intermediatePreviews,
    failures,
    created_at: nowIso(),
  };
  let proof: ModeProofArtifact;
  let publishedPath = outputPath;
  if (failures.length || !buildHash || !activePreview) {
    publishedPath = ensureContainedRunPath(manifest.run_root, "mode-proof-attempt.json");
    if (existsSync(publishedPath)) throw new Error(`mode proof attempt already exists: ${publishedPath}`);
    proof = {
      ...common,
      schema_version: "estimate-sheet-performance-attempt.v1",
      attempted_schema: MODE_PROOF_SCHEMA,
      build_hash: buildHash,
      active_preview: null,
      overall: "FAIL",
    };
  } else {
    proof = {
      ...common,
      schema_version: MODE_PROOF_SCHEMA,
      build_hash: buildHash,
      active_preview: activePreview,
      overall: "PASS",
    };
  }
  writeJsonNoOverwrite(publishedPath, proof, 0o600);
  if (proof.overall === "PASS") {
    const activePath = resolve(manifest.run_root, "preview/active-preview.json");
    if (!existsSync(activePath) || !isPlainObject(manifest.activePreview) || manifest.activePreview.sha256 !== sha256File(activePath)) {
      throw new Error("mode proof publication lost the active preview descriptor binding");
    }
  }
  return { proof, outputPath: publishedPath };
}

export async function main(argv = process.argv.slice(2)): Promise<number> {
  const values = parseStrictCli(argv);
  if (cliBoolean(values, "help")) {
    console.log("Usage: bun run scripts/run-estimate-sheet-mode-proof.ts --unit=UNIT-005 --target=ESTIMATE_ROUTE_FAST_PATH_MODE --phases=off,shadow,on,rollback --final-state=on --fixture-role=mode --output=auto:mode-proof");
    return 0;
  }
  const unit = cliString(values, "unit", true)!;
  const runManifest = resolveRunManifestPath(process.cwd(), unit, cliString(values, "run-manifest") ?? process.env.ESTIMATE_PERF_RUN_MANIFEST);
  const result = await runEstimateSheetModeProof({
    runManifest,
    output: cliString(values, "output"),
    target: cliString(values, "target"),
    matrix: cliString(values, "matrix"),
    phases: cliString(values, "phases"),
    finalState: cliString(values, "final-state") as "on" | "all-activated" | undefined,
    fixtureRole: cliString(values, "fixture-role"),
  });
  process.stdout.write(`${JSON.stringify({ ...result.proof, output_path: relative(process.cwd(), result.outputPath) }, null, 2)}\n`);
  return result.proof.overall === "PASS" ? 0 : 1;
}

if (import.meta.main) {
  try { process.exitCode = await main(); }
  catch (error) { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; }
}
