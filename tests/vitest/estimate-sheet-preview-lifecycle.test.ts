import { spawnSync } from "node:child_process";
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";

import { afterEach, describe, expect, it } from "vitest";

import { cleanupEstimateSheetPerformanceRun } from "../../scripts/cleanup-estimate-sheet-performance-run";
import { sha256File, sha256Hex, sha256OpenNextBuild } from "../../scripts/lib/estimate-sheet-performance-contract";
import { runEstimateSheetModeProof } from "../../scripts/run-estimate-sheet-mode-proof";
import {
  buildBenchmarkChildEnvironment,
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
  repoRoot: string,
  port: number,
  unitId = "UNIT-002",
): { manifestPath: string; runRoot: string; fakeServer: string; runtimeEnv: string } {
  const root = mkdtempSync(join(tmpdir(), "estimate-preview-lifecycle-"));
  roots.push(root);
  const runRoot = join(root, `${RUN_ID}-application-input`);
  mkdirSync(join(runRoot, "wrangler-state"), { recursive: true, mode: 0o700 });
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
  const runtimeEnv = join(runRoot, "runtime.env");
  privateFile(runtimeEnv, [
    "ARCHESTIMATOR_AUTH_PROVIDER=better-auth",
    `BETTER_AUTH_SECRET=${"s".repeat(64)}`,
    `BETTER_AUTH_URL=http://127.0.0.1:${port}`,
    `BETTER_AUTH_TRUSTED_ORIGINS=http://127.0.0.1:${port}`,
    "ESTIMATE_ROUTE_FAST_PATH_MODE=off",
    "ESTIMATE_GRAPH_MODE=off",
    "ESTIMATE_INCREMENTAL_DERIVATION_MODE=off",
    "ESTIMATE_RENDER_BOUNDARY_MODE=off",
    "ESTIMATE_ENTITY_PATCH_MODE=off",
    "",
  ].join("\n"));
  const storageState = join(runRoot, "storage-state.json");
  privateJson(storageState, {
    cookies: [{ name: "better-auth.session_token", value: "redacted-test-token", domain: "127.0.0.1", path: "/", httpOnly: true, secure: false, sameSite: "Lax" }],
    origins: [],
  });
  const buildReceipt = join(runRoot, "receipts/command-opennext-build.json");
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
  const preStateHash = sha256Hex("logical-pre-state");
  const namespaces = unitId === "UNIT-002"
    ? { browser: { idSha256: namespaceHash, preStateSha256: preStateHash } }
    : {
        mode: { idSha256: namespaceHash, preStateSha256: preStateHash },
        browser: { idSha256: sha256Hex("activated-browser-namespace"), preStateSha256: preStateHash },
        d1: { idSha256: sha256Hex("activated-d1-namespace"), preStateSha256: preStateHash },
      };
  privateJson(manifestPath, {
    schema_version: "estimate-sheet-performance-run.v1",
    package_id: "PLAN-2026-07-08-project-estimate-sheet-performance",
    unit_id: unitId,
    run_id: RUN_ID,
    profile: "limit",
    evidence_class: "local-browser",
    cleanupRequirement: "REQUIRED",
    run_root: runRoot,
    pointer_path: pointerPath,
    created_at: "2026-07-11T00:00:00.000Z",
    status: "PREPARED",
    sourceFingerprint: fingerprint,
    applicationFingerprint: fingerprint.application,
    producerFingerprint: fingerprint.producer,
    fixture: { profile: "limit", namespaceIdSha256: namespaceHash, preStateSha256: preStateHash },
    fixture_hash: sha256Hex("fixture"),
    auth_fixture_hash: sha256Hex("auth-fixture"),
    namespaces,
    ...(unitId === "UNIT-002" ? {} : { activatedModes: ["ESTIMATE_ROUTE_FAST_PATH_MODE"] }),
    mutationJournal: [],
    previewProcesses: [],
    port,
    routePath: "/workshop/projects/00000000-0000-4000-8000-000000000010/estimates/00000000-0000-4000-8000-000000000011",
    runtimeEnv,
    runtimeEnvSha256: sha256File(runtimeEnv),
    storageState,
    storageStateSha256: sha256File(storageState),
    buildReceipt,
  });
  privateJson(pointerPath, {
    schema_version: "estimate-sheet-performance-run-pointer.v1",
    unit_id: unitId,
    run_id: RUN_ID,
    run_root: runRoot,
    run_manifest: "run-manifest.json",
    application_fingerprint: fingerprint.application.content_sha256,
    producer_fingerprint: fingerprint.producer.content_sha256,
  });
  const fakeServer = join(root, "fake-preview-server.mjs");
  privateFile(fakeServer, fakeServerSource());
  return { manifestPath, runRoot, fakeServer, runtimeEnv };
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
  privateJson(join(runRoot, "cleanup/browser-state.json"), {
    schema_version: "estimate-sheet-local-preview-cleanup-state.v1",
    state: "CLEANUP_PREPARED",
    run_id: RUN_ID,
    fixture_role: "browser",
    namespace_id_sha256: sha256Hex("browser-namespace"),
    exact_ids: { profiles: declaredIds },
  });
}

async function freePreviewPort(): Promise<number> {
  for (let port = 3199; port >= 3101; port -= 1) if (!await isPortOpen(port)) return port;
  throw new Error("no free estimate preview test port");
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
      "bunx", "opennextjs-cloudflare", "preview", "--", "--ip", "127.0.0.1", "--port", "3101",
      "--persist-to", "/tmp/run/wrangler-state", "--env-file", "/tmp/run/runtime.env",
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

  it("journals before readiness, leaves one live preview, then terminates and reconciles it", async () => {
    const repoRoot = process.cwd();
    const port = await freePreviewPort();
    const { manifestPath, runRoot, fakeServer } = makeRun(repoRoot, port);
    seedCleanupNamespace(runRoot);
    const descriptor = await startEstimateSheetBenchmarkServer({
      runManifest: manifestPath,
      repoRoot,
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
    const repoRoot = process.cwd();
    const port = await freePreviewPort();
    const { manifestPath, runRoot, fakeServer, runtimeEnv } = makeRun(repoRoot, port, "UNIT-005");
    let finalPid: number | null = null;
    try {
      const { proof } = await runEstimateSheetModeProof({
        runManifest: manifestPath,
        repoRoot,
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
      if (finalPid !== null) await stopPreviewProcess({ runManifest: manifestPath, pid: finalPid });
    }
    expect(await isPortOpen(port)).toBe(false);
  }, 30_000);

  it("rejects a server snapshot mismatch instead of copying the requested snapshot", async () => {
    const repoRoot = process.cwd();
    const port = await freePreviewPort();
    const { manifestPath, runRoot, fakeServer } = makeRun(repoRoot, port);
    await expect(startEstimateSheetBenchmarkServer({
      runManifest: manifestPath,
      repoRoot,
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

  it("invalidates cleanup when a declared fixture row was already absent", async () => {
    const repoRoot = process.cwd();
    const port = await freePreviewPort();
    const { manifestPath, runRoot, fakeServer } = makeRun(repoRoot, port);
    seedCleanupNamespace(runRoot, ["fixture-profile", "missing-profile"], ["fixture-profile"]);
    await startEstimateSheetBenchmarkServer({
      runManifest: manifestPath,
      repoRoot,
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
