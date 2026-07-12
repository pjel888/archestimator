import { spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { pathToFileURL } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import { cleanupEstimateSheetPerformanceRun } from "../../scripts/cleanup-estimate-sheet-performance-run";
import { ESTIMATE_LOGICAL_OUTPUTS, PREPARE_INPUT_SCHEMA, runtimeEnvironmentStableSha256, sha256File, sha256Hex, sha256Json, sha256OpenNextBuild } from "../../scripts/lib/estimate-sheet-performance-contract";
import { runEstimateSheetModeProof } from "../../scripts/run-estimate-sheet-mode-proof";
import {
  buildBenchmarkChildEnvironment,
  isProcessAlive,
  isPortOpen,
  parseServerModeSnapshot,
  resolveBenchmarkServerCommand,
  startEstimateSheetBenchmarkServer,
  stopPreviewProcess,
} from "../../scripts/start-estimate-sheet-benchmark-server";
import { validateEstimateSheetPerformanceRun } from "../../scripts/validate-estimate-sheet-performance-run";

const RUN_ID = "00000000-0000-4000-8000-000000000002";
const roots: string[] = [];

function privateFile(path: string, bytes: string): void {
  mkdirSync(resolve(path, ".."), { recursive: true, mode: 0o700 });
  writeFileSync(path, bytes, { mode: 0o600 });
  chmodSync(path, 0o600);
}

function privateJson(path: string, value: unknown): void {
  privateFile(path, `${JSON.stringify(value, null, 2)}\n`);
}

function syncCommittedRunAnchor(manifest: { unit_id: string; run_id: string; immutable_run_root: string }): void {
  const immutableManifest = join(manifest.immutable_run_root, "run-manifest.json");
  const planRoot = resolve(manifest.immutable_run_root, "../../../../..");
  privateJson(join(planRoot, "plan-pack.json"), {
    runtime_evidence: {
      latest_unit_id: manifest.unit_id,
      latest_run_id: manifest.run_id,
      latest_run_manifest_sha256: sha256File(immutableManifest),
    },
  });
}

function openNextBuildHash(repoRoot: string): string {
  return sha256OpenNextBuild(repoRoot);
}

function fakeServerSource(): string {
  return `
import { existsSync, readFileSync } from "node:fs";
import { createServer } from "node:http";

const port = Number(process.argv[2]);
const modeInput = process.argv[3];
const journalPath = process.argv[4];
const server = createServer((_request, response) => {
  let journaled = false;
  if (existsSync(journalPath)) {
    const journal = JSON.parse(readFileSync(journalPath, "utf8"));
    journaled = journal.processes?.some((entry) => entry.pid === process.pid && entry.readiness === "STARTING");
  }
  if (!journaled) {
    response.writeHead(503, { "content-type": "text/plain" });
    response.end("not journaled");
    return;
  }
  const values = existsSync(modeInput)
    ? Object.fromEntries(readFileSync(modeInput, "utf8").trim().split("\\n").map((line) => {
        const separator = line.indexOf("=");
        return [line.slice(0, separator), line.slice(separator + 1)];
      }))
    : {};
  const routeFastPathMode = values.ESTIMATE_ROUTE_FAST_PATH_MODE ?? "off";
  const graphMode = values.ESTIMATE_GRAPH_MODE ?? modeInput;
  const incrementalDerivationMode = values.ESTIMATE_INCREMENTAL_DERIVATION_MODE ?? "off";
  const renderBoundaryMode = values.ESTIMATE_RENDER_BOUNDARY_MODE ?? "off";
  const entityPatchMode = values.ESTIMATE_ENTITY_PATCH_MODE ?? "off";
  response.writeHead(200, { "content-type": "text/html" });
  response.end('<main data-estimate-performance-mode-schema="estimate-performance-mode-snapshot.v1" data-estimate-performance-mode-source="process.env" data-estimate-performance-mode-route-fast-path="' + routeFastPathMode + '" data-estimate-performance-mode-graph="' + graphMode + '" data-estimate-performance-mode-incremental-derivation="' + incrementalDerivationMode + '" data-estimate-performance-mode-render-boundary="' + renderBoundaryMode + '" data-estimate-performance-mode-entity-patch="' + entityPatchMode + '"></main>');
});
server.listen(port, "127.0.0.1");
`;
}

function makeRun(
  port: number,
  unitId = "UNIT-002",
): { manifestPath: string; runRoot: string; immutableRunRoot: string; repoRoot: string; fakeServer: string; runtimeEnv: string } {
  const repoRoot = mkdtempSync(join(tmpdir(), "estimate-preview-lifecycle-"));
  roots.push(repoRoot);
  const fingerprintHash = sha256Hex("preview-test-fingerprint");
  const applicationFingerprint = {
    contract_version: "estimate-sheet-application-fingerprint.v1",
    path_count: 1,
    path_list_sha256: fingerprintHash,
    content_sha256: fingerprintHash,
  };
  const producerFingerprint = {
    contract_version: "estimate-sheet-producer-fingerprint.v1",
    path_count: 1,
    path_list_sha256: fingerprintHash,
    content_sha256: fingerprintHash,
  };
  const fingerprint = {
    contract_version: "estimate-sheet-source-fingerprint.v2",
    head: "abcdef1234567890",
    path_count: 1,
    path_list_sha256: fingerprintHash,
    scoped_status_sha256: fingerprintHash,
    scoped_diff_sha256: fingerprintHash,
    application: applicationFingerprint,
    producer: producerFingerprint,
  };
  const preStateHash = sha256Hex("logical-pre-state");
  const namespaceRoleNames = unitId === "UNIT-002" ? ["browser"] : ["mode", "browser", "d1"];
  const prepareInput = {
    schema_version: PREPARE_INPUT_SCHEMA,
    unit_id: unitId,
    profile: "limit" as const,
    application_fingerprint: applicationFingerprint,
    producer_fingerprint: producerFingerprint,
    fixture: { profile: "limit" as const, payload_sha256: preStateHash, namespace_roles: namespaceRoleNames },
    decision: null,
    predecessor: unitId === "UNIT-002" ? {
      unit_id: "UNIT-001" as const,
      run_id: "00000000-0000-4000-8000-000000000001",
      index_immutable_path: "evidence/runtime/runs/UNIT-001/predecessor-run-aaaaaaaaaaaa-bbbbbbbbbbbb/evidence-index.json",
      index_sha256: preStateHash,
      evidence_immutable_path: "evidence/runtime/runs/UNIT-001/predecessor-run-aaaaaaaaaaaa-bbbbbbbbbbbb/reports/jsdom-baseline.json",
      evidence_sha256: preStateHash,
      application_fingerprint: applicationFingerprint,
      producer_fingerprint: producerFingerprint,
    } : null,
    admission: null,
  };
  const prepareInputSha256 = sha256Json(prepareInput);
  const runKey = `${RUN_ID}-${applicationFingerprint.content_sha256.slice(0, 12)}-${prepareInputSha256.slice(0, 12)}`;
  const runRoot = join(repoRoot, ".ai/99_scratch/estimate-sheet-performance/runs", unitId, runKey);
  const immutableRunRoot = join(repoRoot, ".ai/03_plans/2026-07-08/Project-Estimate-Sheet-Performance-Optimization/evidence/runtime/runs", unitId, runKey);
  mkdirSync(join(runRoot, "wrangler-state"), { recursive: true, mode: 0o700 });
  mkdirSync(immutableRunRoot, { recursive: true, mode: 0o700 });
  privateFile(join(repoRoot, ".open-next/worker.js"), "export default {};\n");
  privateFile(join(repoRoot, ".open-next/assets/fixture.txt"), "fixture\n");
  const runtimeEnv = join(runRoot, "runtime.env");
  const runtimeValues = {
    ARCHESTIMATOR_AUTH_PROVIDER: "better-auth",
    BETTER_AUTH_SECRET: "s".repeat(64),
    BETTER_AUTH_URL: `http://127.0.0.1:${port}`,
    BETTER_AUTH_TRUSTED_ORIGINS: `http://127.0.0.1:${port}`,
    ESTIMATE_ROUTE_FAST_PATH_MODE: "off",
    ESTIMATE_GRAPH_MODE: "off",
    ESTIMATE_INCREMENTAL_DERIVATION_MODE: "off",
    ESTIMATE_RENDER_BOUNDARY_MODE: "off",
    ESTIMATE_ENTITY_PATCH_MODE: "off",
  };
  privateFile(runtimeEnv, `${Object.entries(runtimeValues).map(([key, value]) => `${key}=${value}`).join("\n")}\n`);
  privateFile(join(runRoot, "resources/d1/.dev.vars"), `${Object.entries(runtimeValues).map(([key, value]) => `${key}=${value}`).join("\n")}\n`);
  const storageState = join(runRoot, "storage-state.json");
  privateJson(storageState, {
    cookies: [{ name: "better-auth.session_token", value: "redacted-test-token", domain: "127.0.0.1", path: "/", httpOnly: true, secure: false, sameSite: "Lax" }],
    origins: [],
  });
  const buildReceipt = join(immutableRunRoot, ESTIMATE_LOGICAL_OUTPUTS["opennext-build"]);
  privateJson(buildReceipt, {
    schema_version: "estimate-sheet-command-receipt.v1",
    role: "opennext-build",
    argv: ["bun", "run", "cf:build"],
    unit_id: unitId,
    run_id: RUN_ID,
    overall: "PASS",
    exit_code: 0,
    signal: null,
    build_hash: openNextBuildHash(repoRoot),
  });
  const pointerPath = join(runRoot, "run-pointer.json");
  const manifestPath = join(runRoot, "run-manifest.json");
  const namespaceHash = sha256Hex(unitId === "UNIT-002" ? "browser-namespace" : "mode-namespace");
  const namespaces = unitId === "UNIT-002"
    ? { browser: { idSha256: namespaceHash, preStateSha256: preStateHash } }
    : {
        mode: { idSha256: namespaceHash, preStateSha256: preStateHash },
        browser: { idSha256: sha256Hex("activated-browser-namespace"), preStateSha256: preStateHash },
        d1: { idSha256: sha256Hex("activated-d1-namespace"), preStateSha256: preStateHash },
      };
  const processJournal = join(runRoot, "preview/process-journal.json");
  const wranglerState = join(runRoot, "wrangler-state");
  const routePath = "/workshop/projects/00000000-0000-4000-8000-000000000010/estimates/00000000-0000-4000-8000-000000000011";
  const manifest = {
    schema_version: "estimate-sheet-performance-run.v1",
    package_id: "PLAN-2026-07-08-project-estimate-sheet-performance",
    unit_id: unitId,
    run_id: RUN_ID,
    profile: "limit",
    evidence_class: "local-browser",
    cleanupRequirement: "REQUIRED",
    run_root: runRoot,
    immutable_run_root: immutableRunRoot,
    pointer_path: pointerPath,
    logical_outputs: ESTIMATE_LOGICAL_OUTPUTS,
    prepareInput,
    prepareInputSha256,
    created_at: "2026-07-11T00:00:00.000Z",
    status: "PREPARED",
    sourceFingerprint: fingerprint,
    applicationFingerprint: fingerprint.application,
    producerFingerprint: fingerprint.producer,
    fixture: { profile: "limit", namespaceIdSha256: namespaceHash, preStateSha256: preStateHash },
    fixture_hash: preStateHash,
    auth_fixture_hash: sha256Hex("auth-fixture"),
    namespaces,
    ...(unitId === "UNIT-002" ? {} : { activatedModes: ["ESTIMATE_ROUTE_FAST_PATH_MODE"] }),
    mutationJournal: [],
    previewProcesses: [],
    wranglerState,
    resources: {
      d1Binding: "ARCH_DB",
      wranglerState,
      localConfig: join(runRoot, "resources/d1/wrangler-local.json"),
      localConfigSha256: sha256Hex("local-config"),
      generatedSchema: join(runRoot, "better-auth-schema.sql"),
      generatedSchemaSha256: sha256Hex("generated-schema"),
      migrations: join(runRoot, "resources/d1/migrations.json"),
      migrationsSha256: sha256Hex("migrations"),
      migrationHead: "0040_operational_incidents.sql",
      migrationCount: 40,
      seedSql: join(runRoot, "seed.sql"),
      seedSqlSha256: sha256Hex("seed-sql"),
      cleanupSql: join(runRoot, "resources/d1/cleanup.sql"),
      cleanupSqlSha256: sha256Hex("cleanup-sql"),
      cleanupStateSha256ByRole: Object.fromEntries(Object.keys(namespaces).map((role) => [role, sha256Hex(`cleanup-${role}`)])),
      unitLease: join(runRoot, "../../..", "leases/units", unitId),
      portLease: join(runRoot, "../../..", "leases/ports", String(port)),
    },
    leasedPort: port,
    port,
    routePath,
    route: { path: routePath, projectId: "00000000-0000-4000-8000-000000000010", nodeId: "00000000-0000-4000-8000-000000000011", fixtureRole: unitId === "UNIT-002" ? "browser" : "browser" },
    runtimeEnv,
    runtimeEnvSha256: sha256File(runtimeEnv),
    runtimeEnvStableSha256: runtimeEnvironmentStableSha256(runtimeValues),
    storageState,
    storageStateSha256: sha256File(storageState),
    storageStateExpiresAt: "2099-01-01T00:00:00.000Z",
    processJournal,
    buildReceipt,
    build_hash: openNextBuildHash(repoRoot),
  };
  privateJson(manifestPath, manifest);
  privateJson(join(immutableRunRoot, "run-manifest.json"), manifest);
  syncCommittedRunAnchor(manifest);
  privateJson(pointerPath, {
    schema_version: "estimate-sheet-performance-run-pointer.v1",
    unit_id: unitId,
    run_id: RUN_ID,
    run_root: runRoot,
    immutable_run_root: immutableRunRoot,
    run_manifest: "run-manifest.json",
    logical_outputs: ESTIMATE_LOGICAL_OUTPUTS,
    prepareInputSha256,
    cleanupRequirement: "REQUIRED",
    application_fingerprint: fingerprint.application.content_sha256,
    producer_fingerprint: fingerprint.producer.content_sha256,
  });
  const fakeServer = join(repoRoot, "fake-preview-server.mjs");
  privateFile(fakeServer, fakeServerSource());
  return { manifestPath, runRoot, immutableRunRoot, repoRoot, fakeServer, runtimeEnv };
}

function seedCleanupNamespace(
  runRoot: string,
  declaredIds = ["fixture-profile"],
  insertedIds = declaredIds,
): void {
  const databasePath = join(runRoot, "wrangler-state/browser.sqlite");
  const database = new DatabaseSync(databasePath);
  database.exec("CREATE TABLE profiles (id TEXT PRIMARY KEY)");
  const insert = database.prepare("INSERT INTO profiles (id) VALUES (?)");
  for (const id of insertedIds) insert.run(id);
  database.close();
  const cleanupStatePath = join(runRoot, "cleanup/browser-state.json");
  privateJson(cleanupStatePath, {
    schema_version: "estimate-sheet-local-preview-cleanup-state.v1",
    state: "CLEANUP_PREPARED",
    run_id: RUN_ID,
    fixture_role: "browser",
    namespace_id_sha256: sha256Hex("browser-namespace"),
    exact_ids: { profiles: declaredIds },
  });
  const manifestPath = join(runRoot, "run-manifest.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  manifest.resources.cleanupStateSha256ByRole.browser = sha256File(cleanupStatePath);
  privateJson(manifestPath, manifest);
  privateJson(join(manifest.immutable_run_root, "run-manifest.json"), manifest);
  syncCommittedRunAnchor(manifest);
}

async function freePreviewPort(): Promise<number> {
  for (let port = 3199; port >= 3101; port -= 1) if (!await isPortOpen(port)) return port;
  throw new Error("no free estimate preview test port");
}

async function waitForProcessExit(pid: number, timeoutMs = 5_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline && isProcessAlive(pid)) {
    await new Promise((resolveWait) => setTimeout(resolveWait, 25));
  }
  if (isProcessAlive(pid)) throw new Error(`process ${pid} did not exit`);
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("estimate-sheet preview lifecycle", () => {
  it("builds a closed preview environment without parent auth bypass or startup injection", () => {
    const runtimeValues = {
      ARCHESTIMATOR_AUTH_PROVIDER: "better-auth",
      BETTER_AUTH_SECRET: "a".repeat(32),
      BETTER_AUTH_URL: "http://127.0.0.1:3101",
      BETTER_AUTH_TRUSTED_ORIGINS: "http://127.0.0.1:3101",
      ESTIMATE_ROUTE_FAST_PATH_MODE: "off",
      ESTIMATE_GRAPH_MODE: "off",
      ESTIMATE_INCREMENTAL_DERIVATION_MODE: "off",
      ESTIMATE_RENDER_BOUNDARY_MODE: "off",
      ESTIMATE_ENTITY_PATCH_MODE: "off",
    };
    const environment = buildBenchmarkChildEnvironment(runtimeValues, {
      PATH: "/usr/bin:/bin",
      HOME: "/tmp/benchmark-home",
      ARCHESTIMATOR_DEV_AUTH_BYPASS: "1",
      NODE_OPTIONS: "--require=/tmp/injected.cjs",
      BUN_OPTIONS: "--preload=/tmp/injected.ts",
      DYLD_INSERT_LIBRARIES: "/tmp/injected.dylib",
      WRANGLER_CONFIG: "/tmp/hostile-wrangler.jsonc",
    });

    expect(environment).toEqual({
      NODE_ENV: "production",
      CI: "1",
      NO_COLOR: "1",
      WRANGLER_SEND_METRICS: "false",
      PATH: "/usr/bin:/bin",
      HOME: "/tmp/benchmark-home",
      ...runtimeValues,
    });
  });

  it("loads the cleanup CLI under the repository Bun runtime", () => {
    const result = spawnSync("bun", ["run", "perf:estimate:cleanup", "--", "--help"], {
      cwd: process.cwd(),
      encoding: "utf8",
      env: { PATH: process.env.PATH, HOME: process.env.HOME, TMPDIR: process.env.TMPDIR },
    });
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain("Usage: bun run scripts/cleanup-estimate-sheet-performance-run.ts");
  });

  it("uses the exact OpenNext preview command and parses server-returned mode metadata", () => {
    const manifest = {
      runtimeEnv: "/tmp/run/runtime.env",
      run_root: "/tmp/run",
    } as never;
    expect(resolveBenchmarkServerCommand(manifest, 3101, "baseline-all-off", "all-off")).toEqual([
      "bunx", "opennextjs-cloudflare", "preview", "--config", "/tmp/run/resources/d1/wrangler-local.json",
      "--", "--ip", "127.0.0.1", "--port", "3101",
      "--persist-to", "/tmp/run/wrangler-state",
      "--show-interactive-dev-session=false",
    ]);
    expect(parseServerModeSnapshot('<main data-estimate-performance-mode-schema="estimate-performance-mode-snapshot.v1" data-estimate-performance-mode-source="cloudflare" data-estimate-performance-mode-route-fast-path="off" data-estimate-performance-mode-graph="shadow" data-estimate-performance-mode-incremental-derivation="on" data-estimate-performance-mode-render-boundary="off" data-estimate-performance-mode-entity-patch="on"></main>').modes).toEqual({
      routeFastPath: "off",
      graph: "shadow",
      incrementalDerivation: "on",
      renderBoundary: "off",
      entityPatch: "on",
    });
  });

  it("denies mutable manifest identity tampering before creating preview side effects", async () => {
    const port = await freePreviewPort();
    const { manifestPath, runRoot, repoRoot } = makeRun(port);
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    manifest.created_at = "2026-07-11T00:00:01.000Z";
    privateJson(manifestPath, manifest);

    await expect(startEstimateSheetBenchmarkServer({
      runManifest: manifestPath,
      repoRoot,
      unit: "UNIT-002",
      role: "browser",
      phase: "baseline-all-off",
      finalState: "all-off",
      activate: true,
      checkSource: false,
    })).rejects.toThrow(/immutable authority/);
    expect(existsSync(join(runRoot, "preview/logs"))).toBe(false);
  });

  it("rejects a pre-planted preview ancestor symlink without mutating its target", async () => {
    const port = await freePreviewPort();
    const { manifestPath, runRoot, fakeServer, repoRoot } = makeRun(port);
    const outside = join(repoRoot, "outside-preview-target");
    const sentinel = join(outside, "sentinel.txt");
    mkdirSync(outside, { mode: 0o700 });
    privateFile(sentinel, "unchanged\n");
    symlinkSync(outside, join(runRoot, "preview"), "dir");

    await expect(startEstimateSheetBenchmarkServer({
      runManifest: manifestPath,
      repoRoot,
      unit: "UNIT-002",
      role: "browser",
      phase: "baseline-all-off",
      finalState: "all-off",
      activate: true,
      commandOverride: [process.execPath, fakeServer, String(port), "off", join(runRoot, "preview/process-journal.json")],
      checkSource: false,
    })).rejects.toThrow(/symbolic|symlink/u);

    expect(await isPortOpen(port)).toBe(false);
    expect(readFileSync(sentinel, "utf8")).toBe("unchanged\n");
    expect(readdirSync(outside)).toEqual(["sentinel.txt"]);
    expect(JSON.parse(readFileSync(manifestPath, "utf8")).previewProcesses).toEqual([]);
  });

  it("rejects a pre-planted cleanup ancestor symlink without mutating its target", async () => {
    const port = await freePreviewPort();
    const { manifestPath, runRoot, immutableRunRoot, repoRoot } = makeRun(port);
    const outside = join(repoRoot, "outside-cleanup-target");
    const sentinel = join(outside, "sentinel.txt");
    mkdirSync(outside, { mode: 0o700 });
    privateFile(sentinel, "unchanged\n");
    symlinkSync(outside, join(runRoot, "cleanup"), "dir");

    await expect(cleanupEstimateSheetPerformanceRun({
      repoRoot,
      runManifest: manifestPath,
      unit: "UNIT-002",
      cleanupClass: "local-preview",
      checkSource: false,
    })).rejects.toThrow(/symbolic|symlink/u);

    expect(readFileSync(sentinel, "utf8")).toBe("unchanged\n");
    expect(readdirSync(outside)).toEqual(["sentinel.txt"]);
    expect(existsSync(join(immutableRunRoot, ESTIMATE_LOGICAL_OUTPUTS.cleanup))).toBe(false);
  });

  it("reaps a blocked launcher when the spawn-to-journal window faults", async () => {
    const port = await freePreviewPort();
    const { manifestPath, runRoot, fakeServer, repoRoot } = makeRun(port);
    let launcherPid = 0;

    await expect(startEstimateSheetBenchmarkServer({
      runManifest: manifestPath,
      repoRoot,
      unit: "UNIT-002",
      role: "browser",
      phase: "baseline-all-off",
      finalState: "all-off",
      activate: true,
      commandOverride: [process.execPath, fakeServer, String(port), "off", join(runRoot, "preview/process-journal.json")],
      checkSource: false,
      onSpawnBeforeJournal(pid) {
        launcherPid = pid;
        throw new Error("injected spawn-to-journal fault");
      },
    })).rejects.toThrow(/injected spawn-to-journal fault/);

    expect(launcherPid).toBeGreaterThan(0);
    expect(isProcessAlive(launcherPid)).toBe(false);
    expect(await isPortOpen(port)).toBe(false);
    expect(existsSync(join(runRoot, "preview/process-journal.json"))).toBe(false);
    expect(JSON.parse(readFileSync(manifestPath, "utf8")).previewProcesses).toEqual([]);
    expect(existsSync(join(runRoot, "preview/logs/1-baseline-all-off.stdout.log"))).toBe(false);
    expect(existsSync(join(runRoot, "preview/logs/1-baseline-all-off.stderr.log"))).toBe(false);
  });

  it("self-terminates the blocked launcher when its parent crashes before journaling", async () => {
    const port = await freePreviewPort();
    const { manifestPath, runRoot, fakeServer, repoRoot } = makeRun(port);
    const launcherPidPath = join(repoRoot, "crash-window-launcher.pid");
    const driverPath = join(repoRoot, "crash-window-driver.ts");
    const launcherModule = pathToFileURL(resolve(process.cwd(), "scripts/start-estimate-sheet-benchmark-server.ts")).href;
    privateFile(driverPath, `
import { writeFileSync } from "node:fs";
import { startEstimateSheetBenchmarkServer } from ${JSON.stringify(launcherModule)};

await startEstimateSheetBenchmarkServer({
  runManifest: ${JSON.stringify(manifestPath)},
  repoRoot: ${JSON.stringify(repoRoot)},
  unit: "UNIT-002",
  role: "browser",
  phase: "baseline-all-off",
  finalState: "all-off",
  activate: true,
  commandOverride: ${JSON.stringify([process.execPath, fakeServer, String(port), "off", join(runRoot, "preview/process-journal.json")])},
  checkSource: false,
  onSpawnBeforeJournal(pid) {
    writeFileSync(${JSON.stringify(launcherPidPath)}, String(pid), { mode: 0o600 });
    process.kill(process.pid, "SIGKILL");
  },
});
`);

    const crashed = spawnSync("bun", [driverPath], {
      cwd: repoRoot,
      encoding: "utf8",
      timeout: 10_000,
      env: { PATH: process.env.PATH, HOME: process.env.HOME, TMPDIR: process.env.TMPDIR, NODE_ENV: "test" },
    });
    expect(crashed.status, crashed.stderr).toBeNull();
    expect(crashed.signal).toBe("SIGKILL");
    expect(existsSync(launcherPidPath)).toBe(true);
    const launcherPid = Number(readFileSync(launcherPidPath, "utf8"));
    expect(launcherPid).toBeGreaterThan(0);
    await waitForProcessExit(launcherPid);
    expect(await isPortOpen(port)).toBe(false);
    expect(existsSync(join(runRoot, "preview/process-journal.json"))).toBe(false);
    expect(JSON.parse(readFileSync(manifestPath, "utf8")).previewProcesses).toEqual([]);
  }, 15_000);

  it("journals before readiness, leaves one live preview, then terminates and reconciles it", async () => {
    const port = await freePreviewPort();
    const { manifestPath, runRoot, fakeServer, repoRoot } = makeRun(port);
    seedCleanupNamespace(runRoot);
    const descriptor = await startEstimateSheetBenchmarkServer({
      runManifest: manifestPath,
      repoRoot,
      unit: "UNIT-002",
      role: "browser",
      phase: "baseline-all-off",
      finalState: "all-off",
      activate: true,
      timeoutMs: 10_000,
      commandOverride: [process.execPath, fakeServer, String(port), "off", join(runRoot, "preview/process-journal.json")],
      checkSource: false,
    });
    expect(descriptor).toMatchObject({ readiness: "READY", active: true, port });
    expect(descriptor.pid).toBeGreaterThan(0);
    expect(descriptor.server_snapshot.modes).toEqual(descriptor.requested_snapshot.modes);
    const activeValidation = await validateEstimateSheetPerformanceRun({
      repoRoot,
      runManifest: manifestPath,
      checkSource: false,
      requireBuild: true,
      requireActivePreview: true,
    });
    expect(activeValidation.valid, activeValidation.errors.join("\n")).toBe(true);
    expect(activeValidation.stage).toBe("active");

    const cleanup = await cleanupEstimateSheetPerformanceRun({
      repoRoot,
      runManifest: manifestPath,
      unit: "UNIT-002",
      cleanupClass: "local-preview",
      checkSource: false,
    });
    expect(cleanup).toMatchObject({ result: "CLEANUP_VERIFIED", invalidatedProducer: false, closedPort: true });
    expect(cleanup.previewProcesses).toHaveLength(1);
    expect(cleanup.previewProcesses?.[0]).toMatchObject({ signal: "SIGTERM", closed_port: true });
    expect(cleanup.seeded).toEqual({ browser: { profiles: 1 } });
    expect(cleanup.deleted).toEqual({ browser: { profiles: 1 } });
    expect(cleanup.remaining).toEqual({ browser: { profiles: 0 } });
    const database = new DatabaseSync(join(runRoot, "wrangler-state/browser.sqlite"));
    expect(database.prepare("SELECT COUNT(*) AS count FROM profiles").get()).toEqual({ count: 0 });
    database.close();

    const cleanedValidation = await validateEstimateSheetPerformanceRun({
      repoRoot,
      runManifest: manifestPath,
      checkSource: false,
      requireBuild: true,
      requireCleanup: true,
    });
    expect(cleanedValidation.valid, cleanedValidation.errors.join("\n")).toBe(true);
    expect(cleanedValidation.stage).toBe("cleaned");
  }, 30_000);

  it("runs every mode phase on a fresh preview and leaves only the verified final preview active", async () => {
    const port = await freePreviewPort();
    const { manifestPath, runRoot, fakeServer, runtimeEnv, repoRoot } = makeRun(port, "UNIT-005");
    let finalPid: number | null = null;
    try {
      const { proof } = await runEstimateSheetModeProof({
        runManifest: manifestPath,
        repoRoot,
        unit: "UNIT-005",
        target: "ESTIMATE_ROUTE_FAST_PATH_MODE",
        phases: "off,shadow,on,rollback",
        finalState: "on",
        fixtureRole: "mode",
        output: "auto:mode-proof",
        checkSource: false,
        commandOverride: [process.execPath, fakeServer, String(port), runtimeEnv, join(runRoot, "preview/process-journal.json")],
      });
      expect(proof.overall).toBe("PASS");
      expect(proof.requested_snapshots.map((entry) => [entry.phase, entry.snapshot.modes.routeFastPath])).toEqual([
        ["off", "off"],
        ["shadow", "shadow"],
        ["on", "on"],
        ["rollback", "off"],
        ["final", "on"],
      ]);
      expect(proof.server_snapshots).toEqual(proof.requested_snapshots);
      expect(proof.intermediate_previews).toHaveLength(4);
      expect(proof.intermediate_previews.every((entry) => entry.signal === "SIGTERM" && entry.closed_port)).toBe(true);
      expect(proof.active_preview).toMatchObject({ active: true, readiness: "READY", phase: "final" });
      finalPid = proof.active_preview?.pid ?? null;
      const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
      expect(manifest.previewProcesses).toHaveLength(5);
      expect(manifest.previewProcesses.filter((entry: { signal: string | null }) => entry.signal === null)).toHaveLength(1);
      const validation = await validateEstimateSheetPerformanceRun({
        repoRoot,
        runManifest: manifestPath,
        checkSource: false,
        requireBuild: true,
        requireActivePreview: true,
      });
      expect(validation.valid, validation.errors.join("\n")).toBe(true);
    } finally {
      if (finalPid !== null) await stopPreviewProcess({ runManifest: manifestPath, pid: finalPid, repoRoot, unit: "UNIT-005" });
    }
    expect(await isPortOpen(port)).toBe(false);
  }, 30_000);

  it("rejects a server snapshot mismatch instead of copying the requested snapshot", async () => {
    const port = await freePreviewPort();
    const { manifestPath, runRoot, fakeServer, repoRoot } = makeRun(port);
    await expect(startEstimateSheetBenchmarkServer({
      runManifest: manifestPath,
      repoRoot,
      unit: "UNIT-002",
      role: "browser",
      phase: "baseline-all-off",
      finalState: "all-off",
      activate: true,
      timeoutMs: 10_000,
      commandOverride: [process.execPath, fakeServer, String(port), "on", join(runRoot, "preview/process-journal.json")],
      checkSource: false,
    })).rejects.toThrow(/server-returned mode snapshot/);
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    expect(manifest.activePreview).toBeUndefined();
    expect(manifest.previewProcesses).toHaveLength(1);
    expect(manifest.previewProcesses[0]).toMatchObject({ readiness: "FAILED", closed_port: true });
  }, 30_000);

  it("records an already-exited failed preview as a terminal recovery outcome before cleanup", async () => {
    const port = await freePreviewPort();
    const { manifestPath, runRoot, fakeServer, repoRoot } = makeRun(port);
    seedCleanupNamespace(runRoot);
    await expect(startEstimateSheetBenchmarkServer({
      runManifest: manifestPath,
      repoRoot,
      unit: "UNIT-002",
      role: "browser",
      phase: "baseline-all-off",
      finalState: "all-off",
      activate: true,
      timeoutMs: 10_000,
      commandOverride: [process.execPath, fakeServer, String(port), "on", join(runRoot, "preview/process-journal.json")],
      checkSource: false,
    })).rejects.toThrow(/server-returned mode snapshot/);
    const journalPath = join(runRoot, "preview/process-journal.json");
    const journal = JSON.parse(readFileSync(journalPath, "utf8"));
    journal.processes[0].exit_code = null;
    journal.processes[0].signal = null;
    journal.processes[0].closed_port = false;
    journal.processes[0].stopped_at = null;
    privateJson(journalPath, journal);

    const cleanup = await cleanupEstimateSheetPerformanceRun({
      repoRoot,
      runManifest: manifestPath,
      unit: "UNIT-002",
      cleanupClass: "local-preview",
      checkSource: false,
    });
    expect(cleanup).toMatchObject({ result: "CLEANUP_VERIFIED", closedPort: true });
    expect(cleanup.previewProcesses?.[0]).toMatchObject({
      signal: "EXITED_BEFORE_RECOVERY",
      closed_port: true,
    });
  }, 30_000);

  it("invalidates cleanup when a declared fixture row was already absent", async () => {
    const port = await freePreviewPort();
    const { manifestPath, runRoot, fakeServer, repoRoot } = makeRun(port);
    seedCleanupNamespace(runRoot, ["fixture-profile", "missing-profile"], ["fixture-profile"]);
    await startEstimateSheetBenchmarkServer({
      runManifest: manifestPath,
      repoRoot,
      unit: "UNIT-002",
      role: "browser",
      phase: "baseline-all-off",
      finalState: "all-off",
      activate: true,
      timeoutMs: 10_000,
      commandOverride: [process.execPath, fakeServer, String(port), "off", join(runRoot, "preview/process-journal.json")],
      checkSource: false,
    });

    const cleanup = await cleanupEstimateSheetPerformanceRun({
      repoRoot,
      runManifest: manifestPath,
      unit: "UNIT-002",
      cleanupClass: "local-preview",
      checkSource: false,
    });
    expect(cleanup).toMatchObject({
      result: "RECOVERED_ALREADY_ABSENT",
      invalidatedProducer: true,
      seeded: { browser: { profiles: 2 } },
      deleted: { browser: { profiles: 1 } },
      remaining: { browser: { profiles: 0 } },
      closedPort: true,
    });
    expect(JSON.parse(readFileSync(manifestPath, "utf8")).status).toBe("INVALIDATED");
    const validation = await validateEstimateSheetPerformanceRun({
      repoRoot,
      runManifest: manifestPath,
      checkSource: false,
      requireBuild: true,
      requireCleanup: true,
    });
    expect(validation.valid).toBe(false);
    expect(validation.errors).toEqual(expect.arrayContaining([
      expect.stringContaining("recovered/invalidating"),
      expect.stringContaining("uninterrupted exact-ID reconciliation"),
    ]));
  }, 30_000);
});
