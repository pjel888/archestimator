#!/usr/bin/env bun

import { spawn } from "node:child_process";
import {
  closeSync,
  existsSync,
  fsyncSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { connect } from "node:net";
import { basename, dirname, relative, resolve } from "node:path";

import {
  assertRunManifest,
  canonicalJson,
  cliBoolean,
  cliString,
  fingerprintContentEqual,
  isPlainObject,
  nowIso,
  parseStrictCli,
  readJsonFile,
  replaceFileAtomically,
  resolveRunManifestPath,
  sha256File,
  sha256Hex,
  sha256OpenNextBuild,
  writeJsonNoOverwrite,
  type RunManifestV1,
} from "./lib/estimate-sheet-performance-contract";
import { computeEstimateSheetSourceFingerprint } from "./compute-estimate-sheet-source-fingerprint";

const MODE_ENVIRONMENT_KEYS = {
  routeFastPath: "ESTIMATE_ROUTE_FAST_PATH_MODE",
  graph: "ESTIMATE_GRAPH_MODE",
  incrementalDerivation: "ESTIMATE_INCREMENTAL_DERIVATION_MODE",
  renderBoundary: "ESTIMATE_RENDER_BOUNDARY_MODE",
  entityPatch: "ESTIMATE_ENTITY_PATCH_MODE",
} as const;
const MODE_VALUES = new Set(["off", "shadow", "on"]);
const RUNTIME_ENVIRONMENT_KEYS = [
  "ARCHESTIMATOR_AUTH_PROVIDER",
  "BETTER_AUTH_SECRET",
  "BETTER_AUTH_URL",
  "BETTER_AUTH_TRUSTED_ORIGINS",
  ...Object.values(MODE_ENVIRONMENT_KEYS),
] as const;
const BENCHMARK_CHILD_OS_ENVIRONMENT_KEYS = [
  "PATH",
  "HOME",
  "USERPROFILE",
  "TMPDIR",
  "TMP",
  "TEMP",
  "SystemRoot",
  "ComSpec",
  "PATHEXT",
] as const;
const PHASES = new Set(["baseline-all-off", "off", "shadow", "on", "rollback", "final"]);
const FINAL_STATES = new Set(["all-off", "off", "shadow", "on", "all-activated"]);

export type EstimateModeValue = "off" | "shadow" | "on";
export type EstimateModeValues = Record<keyof typeof MODE_ENVIRONMENT_KEYS, EstimateModeValue>;
export type EstimateServerModeSnapshot = {
  schemaVersion: "estimate-performance-mode-snapshot.v1";
  version: 1;
  source: "cloudflare" | "injected" | "process.env" | "default";
  modes: EstimateModeValues;
};

export type PreviewProcessEntry = {
  role: "browser" | "mode";
  phase: string;
  ordinal: number;
  pid: number;
  port: number;
  command_sha256: string;
  requested_snapshot: EstimateServerModeSnapshot;
  requested_snapshot_sha256: string;
  server_snapshot: EstimateServerModeSnapshot | null;
  server_snapshot_sha256: string | null;
  build_hash: string;
  readiness: "STARTING" | "READY" | "FAILED";
  started_at: string;
  ready_at: string | null;
  exit_code: number | null;
  signal: string | null;
  closed_port: boolean;
  stopped_at: string | null;
  stdout_log: string;
  stderr_log: string;
};

export type PreviewProcessJournal = {
  schema_version: "estimate-sheet-preview-process-journal.v1";
  unit_id: string;
  run_id: string;
  processes: PreviewProcessEntry[];
  updated_at: string;
};

export type BenchmarkServerDescriptor = {
  schema_version: "estimate-sheet-benchmark-server.v1";
  unit_id: string;
  run_id: string;
  role: "browser" | "mode";
  phase: string;
  final_state: string;
  ordinal: number;
  port: number;
  base_url: string;
  route_path: string;
  command: string[];
  launched: true;
  pid: number;
  build_receipt: string;
  build_receipt_sha256: string;
  build_hash: string;
  runtime_env_sha256: string;
  storage_state_sha256: string;
  requested_snapshot: EstimateServerModeSnapshot;
  server_snapshot: EstimateServerModeSnapshot;
  readiness: "READY";
  active: boolean;
  process_journal: string;
  generated_at: string;
};

type RuntimeRunManifest = RunManifestV1 & {
  port?: unknown;
  leasedPort?: unknown;
  routePath?: unknown;
  route?: unknown;
  runtimeEnvSha256?: unknown;
  storageStateSha256?: unknown;
  buildReceipt?: unknown;
  processJournal?: unknown;
};

type BuildReceipt = {
  path: string;
  sha256: string;
  buildHash: string;
};

type RuntimeEnvironment = {
  path: string;
  sha256: string;
  values: Record<(typeof RUNTIME_ENVIRONMENT_KEYS)[number], string>;
  snapshot: EstimateServerModeSnapshot;
};

type StorageState = {
  path: string;
  sha256: string;
  cookieHeader: string;
};

export function buildBenchmarkChildEnvironment(
  runtimeValues: RuntimeEnvironment["values"],
  parentEnvironment: NodeJS.ProcessEnv = process.env,
): NodeJS.ProcessEnv {
  const environment: NodeJS.ProcessEnv = {
    NODE_ENV: "production",
    CI: "1",
    NO_COLOR: "1",
    WRANGLER_SEND_METRICS: "false",
  };
  for (const key of BENCHMARK_CHILD_OS_ENVIRONMENT_KEYS) {
    const value = parentEnvironment[key];
    if (value === undefined || value === "") continue;
    if (/[\r\n\0]/u.test(value)) throw new Error(`parent environment ${key} contains an invalid value`);
    environment[key] = value;
  }
  if (!environment.PATH) throw new Error("benchmark child environment requires PATH");
  for (const key of RUNTIME_ENVIRONMENT_KEYS) environment[key] = runtimeValues[key];
  return environment;
}

function isSha256(value: unknown): value is string {
  return typeof value === "string" && /^[a-f0-9]{64}$/u.test(value);
}

function ensureContained(root: string, path: string, label: string): string {
  const resolvedRoot = resolve(root);
  const resolvedPath = resolve(path);
  const child = relative(resolvedRoot, resolvedPath);
  if (!child || child.startsWith("..") || child.includes(`..${process.platform === "win32" ? "\\" : "/"}`)) {
    throw new Error(`${label} must be contained by the prepared run root`);
  }
  return resolvedPath;
}

function assertPrivateRegularFile(path: string, label: string): void {
  const stat = lstatSync(path);
  if (!stat.isFile() || stat.isSymbolicLink()) throw new Error(`${label} must be a regular non-symlink file`);
  if ((stat.mode & 0o077) !== 0) throw new Error(`${label} must not be group/world accessible`);
  if (stat.nlink !== 1) throw new Error(`${label} must have exactly one hard link`);
}

function fsyncDirectory(path: string): void {
  const fd = openSync(path, "r");
  try { fsyncSync(fd); } finally { closeSync(fd); }
}

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, milliseconds));
}

export function writeMutableJsonAtomically(path: string, value: unknown, mode = 0o600): string {
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  const temporary = resolve(dirname(path), `.${basename(path)}.${process.pid}.${crypto.randomUUID()}.tmp`);
  const bytes = `${JSON.stringify(value, null, 2)}\n`;
  const fd = openSync(temporary, "wx", mode);
  try {
    writeFileSync(fd, bytes, "utf8");
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
  renameSync(temporary, path);
  fsyncDirectory(dirname(path));
  return sha256File(path);
}

export function removeFileDurably(path: string): void {
  if (!existsSync(path)) return;
  rmSync(path);
  fsyncDirectory(dirname(path));
}

export function updateRunManifest(
  manifestPath: string,
  mutate: (manifest: RuntimeRunManifest) => RuntimeRunManifest,
): RuntimeRunManifest {
  const current = readJsonFile<RuntimeRunManifest>(manifestPath);
  assertRunManifest(current);
  const expected = sha256File(manifestPath);
  const next = mutate(structuredClone(current));
  assertRunManifest(next);
  replaceFileAtomically(manifestPath, `${JSON.stringify(next, null, 2)}\n`, expected, 0o600);
  return next;
}

export function resolveBenchmarkPort(manifest: RuntimeRunManifest, override?: number | null): number {
  if (override === null) throw new Error("browser previews require a leased port");
  const candidate = override ?? manifest.port ?? manifest.leasedPort;
  if (!Number.isInteger(candidate) || Number(candidate) < 3101 || Number(candidate) > 3199) {
    throw new Error("benchmark port must be the run-leased integer in 3101..3199");
  }
  return Number(candidate);
}

export function resolveBenchmarkRoutePath(manifest: RuntimeRunManifest): string {
  const route = isPlainObject(manifest.route) ? manifest.route : {};
  const path = typeof manifest.routePath === "string"
    ? manifest.routePath
    : typeof route.path === "string"
      ? route.path
      : typeof route.projectId === "string" && typeof route.nodeId === "string"
        ? `/workshop/projects/${route.projectId}/estimates/${route.nodeId}`
        : null;
  if (!path || !path.startsWith("/workshop/projects/") || path.includes("..") || /[?#]/u.test(path)) {
    throw new Error("prepared browser run requires one safe estimate workspace route path");
  }
  return path;
}

export function resolveBenchmarkServerCommand(
  manifest: RunManifestV1,
  port: number,
  phase: string,
  finalState: string,
): string[] {
  if (!PHASES.has(phase)) throw new Error(`unsupported benchmark phase: ${phase}`);
  if (!FINAL_STATES.has(finalState)) throw new Error(`unsupported final state: ${finalState}`);
  if (!Number.isInteger(port) || port < 3101 || port > 3199) throw new Error("benchmark port must be between 3101 and 3199");
  if (!manifest.runtimeEnv) throw new Error("local-browser benchmark requires run-scoped runtime.env");
  return [
    "bunx",
    "opennextjs-cloudflare",
    "preview",
    "--",
    "--ip",
    "127.0.0.1",
    "--port",
    String(port),
    "--persist-to",
    resolve(manifest.run_root, "wrangler-state"),
    "--env-file",
    resolve(manifest.runtimeEnv),
    "--show-interactive-dev-session=false",
  ];
}

function parseRuntimeEnvironment(path: string): Record<string, string> {
  const lines = readFileSync(path, "utf8").split("\n");
  const values: Record<string, string> = {};
  for (const line of lines) {
    if (!line) continue;
    const separator = line.indexOf("=");
    if (separator <= 0) throw new Error("runtime.env contains a malformed line");
    const key = line.slice(0, separator);
    const value = line.slice(separator + 1);
    if (Object.prototype.hasOwnProperty.call(values, key)) throw new Error(`runtime.env duplicates ${key}`);
    if (!/^[A-Z][A-Z0-9_]*$/u.test(key) || /[\r\n\0]/u.test(value)) throw new Error("runtime.env contains an invalid key or value");
    values[key] = value;
  }
  const actual = Object.keys(values).sort();
  const expected = [...RUNTIME_ENVIRONMENT_KEYS].sort();
  if (canonicalJson(actual) !== canonicalJson(expected)) throw new Error("runtime.env key set is not the closed browser allowlist");
  return values;
}

function snapshotFromRuntimeValues(values: Record<string, string>): EstimateServerModeSnapshot {
  const modes = Object.fromEntries(Object.entries(MODE_ENVIRONMENT_KEYS).map(([key, envKey]) => {
    const value = values[envKey];
    if (!MODE_VALUES.has(value)) throw new Error(`${envKey} must be off, shadow, or on`);
    return [key, value];
  })) as EstimateModeValues;
  return {
    schemaVersion: "estimate-performance-mode-snapshot.v1",
    version: 1,
    source: "process.env",
    modes,
  };
}

export function validateRuntimeEnvironment(manifest: RuntimeRunManifest, port: number): RuntimeEnvironment {
  if (typeof manifest.runtimeEnv !== "string") throw new Error("prepared browser run is missing runtimeEnv");
  const path = ensureContained(manifest.run_root, manifest.runtimeEnv, "runtime.env");
  if (path !== resolve(manifest.run_root, "runtime.env")) throw new Error("runtimeEnv must be <run>/runtime.env");
  assertPrivateRegularFile(path, "runtime.env");
  const sha256 = sha256File(path);
  if (!isSha256(manifest.runtimeEnvSha256) || manifest.runtimeEnvSha256 !== sha256) {
    throw new Error("runtime.env hash is missing or stale in the run manifest");
  }
  const rawValues = parseRuntimeEnvironment(path);
  const values = rawValues as RuntimeEnvironment["values"];
  if (values.ARCHESTIMATOR_AUTH_PROVIDER !== "better-auth") throw new Error("runtime.env auth provider must be better-auth");
  if (Buffer.byteLength(values.BETTER_AUTH_SECRET, "utf8") < 32) throw new Error("runtime.env Better Auth secret is too short");
  const expectedOrigin = `http://127.0.0.1:${port}`;
  if (values.BETTER_AUTH_URL !== expectedOrigin || values.BETTER_AUTH_TRUSTED_ORIGINS !== expectedOrigin) {
    throw new Error("runtime.env Better Auth origins must equal the leased loopback origin");
  }
  return { path, sha256, values, snapshot: snapshotFromRuntimeValues(values) };
}

export function replaceRuntimeEnvironmentSnapshot(
  manifestPath: string,
  requestedModes: EstimateModeValues,
): RuntimeEnvironment {
  let manifest = readJsonFile<RuntimeRunManifest>(manifestPath);
  assertRunManifest(manifest);
  const port = resolveBenchmarkPort(manifest);
  const current = validateRuntimeEnvironment(manifest, port);
  const values: Record<string, string> = { ...current.values };
  for (const [modeKey, envKey] of Object.entries(MODE_ENVIRONMENT_KEYS)) {
    const value = requestedModes[modeKey as keyof EstimateModeValues];
    if (!MODE_VALUES.has(value)) throw new Error(`invalid requested mode for ${modeKey}`);
    values[envKey] = value;
  }
  const bytes = `${RUNTIME_ENVIRONMENT_KEYS.map((key) => `${key}=${values[key]}`).join("\n")}\n`;
  const temporary = resolve(dirname(current.path), `.runtime.env.${process.pid}.${crypto.randomUUID()}.tmp`);
  const fd = openSync(temporary, "wx", 0o600);
  try {
    writeFileSync(fd, bytes, "utf8");
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
  renameSync(temporary, current.path);
  fsyncDirectory(dirname(current.path));
  const nextHash = sha256File(current.path);
  manifest = updateRunManifest(manifestPath, (value) => ({ ...value, runtimeEnvSha256: nextHash }));
  const validated = validateRuntimeEnvironment(manifest, port);
  if (canonicalJson(validated.snapshot.modes) !== canonicalJson(requestedModes)) {
    throw new Error("phase runtime.env did not preserve the requested mode snapshot");
  }
  return validated;
}

export function validateStorageState(manifest: RuntimeRunManifest, port: number): StorageState {
  if (typeof manifest.storageState !== "string") throw new Error("prepared browser run is missing storageState");
  const path = ensureContained(manifest.run_root, manifest.storageState, "browser storage state");
  if (path !== resolve(manifest.run_root, "storage-state.json")) throw new Error("storageState must be <run>/storage-state.json");
  assertPrivateRegularFile(path, "browser storage state");
  const sha256 = sha256File(path);
  if (!isSha256(manifest.storageStateSha256) || manifest.storageStateSha256 !== sha256) {
    throw new Error("browser storage-state hash is missing or stale in the run manifest");
  }
  const parsed = readJsonFile<unknown>(path);
  if (!isPlainObject(parsed) || !Array.isArray(parsed.cookies) || parsed.cookies.length === 0) {
    throw new Error("browser storage state must contain at least one authenticated cookie");
  }
  const cookiePairs = parsed.cookies.map((cookie, index) => {
    if (!isPlainObject(cookie) || typeof cookie.name !== "string" || !cookie.name || typeof cookie.value !== "string" || !cookie.value) {
      throw new Error(`browser storage cookie ${index} is invalid`);
    }
    const domain = typeof cookie.domain === "string" ? cookie.domain.replace(/^\./u, "") : "";
    const url = typeof cookie.url === "string" ? cookie.url : "";
    if (domain !== "127.0.0.1" && url !== `http://127.0.0.1:${port}`) {
      throw new Error("browser storage cookie does not belong to the leased loopback origin");
    }
    return `${cookie.name}=${cookie.value}`;
  });
  return { path, sha256, cookieHeader: cookiePairs.join("; ") };
}

function hashOpenNextBuild(repoRoot: string): string {
  return sha256OpenNextBuild(repoRoot);
}

export function validateOpenNextBuildReceipt(
  manifest: RuntimeRunManifest,
  repoRoot: string,
): BuildReceipt {
  const path = ensureContained(
    manifest.run_root,
    typeof manifest.buildReceipt === "string"
      ? manifest.buildReceipt
      : resolve(manifest.run_root, "receipts/command-opennext-build.json"),
    "OpenNext build receipt",
  );
  if (path !== resolve(manifest.run_root, "receipts/command-opennext-build.json")) {
    throw new Error("OpenNext build receipt must use the fixed run-contained role path");
  }
  assertPrivateRegularFile(path, "OpenNext build receipt");
  const receipt = readJsonFile<unknown>(path);
  if (!isPlainObject(receipt)
    || receipt.schema_version !== "estimate-sheet-command-receipt.v1"
    || receipt.role !== "opennext-build"
    || receipt.unit_id !== manifest.unit_id
    || receipt.run_id !== manifest.run_id
    || receipt.overall !== "PASS"
    || receipt.exit_code !== 0
    || receipt.signal !== null
    || canonicalJson(receipt.argv) !== canonicalJson(["bun", "run", "cf:build"])
    || !isSha256(receipt.build_hash)) {
    throw new Error("OpenNext build receipt is stale, failed, or has the wrong command/run identity");
  }
  const actualBuildHash = hashOpenNextBuild(repoRoot);
  if (receipt.build_hash !== actualBuildHash) throw new Error("OpenNext build receipt does not match current build artifacts");
  return { path, sha256: sha256File(path), buildHash: actualBuildHash };
}

function readHtmlAttribute(html: string, name: string): string {
  const expression = new RegExp(`\\b${name}=(?:"([^"]*)"|'([^']*)')`, "u");
  const match = expression.exec(html);
  if (!match) throw new Error(`workspace response is missing ${name}`);
  return (match[1] ?? match[2] ?? "")
    .replaceAll("&quot;", "\"")
    .replaceAll("&#39;", "'")
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

export function parseServerModeSnapshot(html: string): EstimateServerModeSnapshot {
  const schemaVersion = readHtmlAttribute(html, "data-estimate-performance-mode-schema");
  const source = readHtmlAttribute(html, "data-estimate-performance-mode-source");
  const modes = {
    routeFastPath: readHtmlAttribute(html, "data-estimate-performance-mode-route-fast-path"),
    graph: readHtmlAttribute(html, "data-estimate-performance-mode-graph"),
    incrementalDerivation: readHtmlAttribute(html, "data-estimate-performance-mode-incremental-derivation"),
    renderBoundary: readHtmlAttribute(html, "data-estimate-performance-mode-render-boundary"),
    entityPatch: readHtmlAttribute(html, "data-estimate-performance-mode-entity-patch"),
  };
  if (schemaVersion !== "estimate-performance-mode-snapshot.v1") throw new Error("workspace returned the wrong mode schema");
  if (!new Set(["cloudflare", "injected", "process.env", "default"]).has(source)) throw new Error("workspace returned an invalid mode source");
  for (const [key, value] of Object.entries(modes)) if (!MODE_VALUES.has(value)) throw new Error(`workspace returned an invalid ${key} mode`);
  return { schemaVersion, version: 1, source: source as EstimateServerModeSnapshot["source"], modes: modes as EstimateModeValues };
}

async function fetchServerModeSnapshot(
  baseUrl: string,
  routePath: string,
  cookieHeader: string,
  timeoutMs: number,
): Promise<EstimateServerModeSnapshot> {
  const response = await fetch(`${baseUrl}${routePath}`, {
    headers: { cookie: cookieHeader },
    redirect: "error",
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) throw new Error(`workspace readiness returned HTTP ${response.status}`);
  return parseServerModeSnapshot(await response.text());
}

export async function isPortOpen(port: number): Promise<boolean> {
  return await new Promise((resolveResult) => {
    const socket = connect({ host: "127.0.0.1", port });
    let settled = false;
    const settle = (value: boolean) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolveResult(value);
    };
    socket.setTimeout(250);
    socket.once("connect", () => settle(true));
    socket.once("timeout", () => settle(false));
    socket.once("error", () => settle(false));
  });
}

export function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return isPlainObject(error) && error.code === "EPERM";
  }
}

export function readPreviewProcessJournal(manifest: RuntimeRunManifest): PreviewProcessJournal {
  const path = ensureContained(
    manifest.run_root,
    typeof manifest.processJournal === "string"
      ? manifest.processJournal
      : resolve(manifest.run_root, "preview/process-journal.json"),
    "preview process journal",
  );
  if (!existsSync(path)) {
    return {
      schema_version: "estimate-sheet-preview-process-journal.v1",
      unit_id: manifest.unit_id,
      run_id: manifest.run_id,
      processes: [],
      updated_at: manifest.created_at,
    };
  }
  assertPrivateRegularFile(path, "preview process journal");
  const journal = readJsonFile<PreviewProcessJournal>(path);
  if (journal.schema_version !== "estimate-sheet-preview-process-journal.v1"
    || journal.unit_id !== manifest.unit_id
    || journal.run_id !== manifest.run_id
    || !Array.isArray(journal.processes)) {
    throw new Error("preview process journal has the wrong schema or run identity");
  }
  return journal;
}

function persistPreviewJournal(manifestPath: string, journal: PreviewProcessJournal): RuntimeRunManifest {
  const manifest = readJsonFile<RuntimeRunManifest>(manifestPath);
  assertRunManifest(manifest);
  const path = resolve(manifest.run_root, "preview/process-journal.json");
  journal.updated_at = nowIso();
  writeMutableJsonAtomically(path, journal, 0o600);
  return updateRunManifest(manifestPath, (value) => ({
    ...value,
    processJournal: path,
    previewProcesses: journal.processes,
  }));
}

function assertNoActivePreview(manifest: RuntimeRunManifest, journal: PreviewProcessJournal): void {
  const live = journal.processes.filter((entry) => entry.exit_code === null && entry.signal === null && isProcessAlive(entry.pid));
  if (live.length > 0 || manifest.activePreview !== undefined) {
    throw new Error("a preview is already active for this run");
  }
}

async function waitForReady(input: {
  pid: number;
  baseUrl: string;
  routePath: string;
  cookieHeader: string;
  timeoutMs: number;
}): Promise<EstimateServerModeSnapshot> {
  const deadline = Date.now() + input.timeoutMs;
  let lastError: unknown = new Error("preview did not respond");
  while (Date.now() < deadline) {
    if (!isProcessAlive(input.pid)) throw new Error("preview exited before readiness");
    try {
      return await fetchServerModeSnapshot(input.baseUrl, input.routePath, input.cookieHeader, 2_000);
    } catch (error) {
      lastError = error;
      await sleep(100);
    }
  }
  throw new Error(`preview readiness timed out: ${lastError instanceof Error ? lastError.message : String(lastError)}`);
}

async function waitForClosedPort(port: number, timeoutMs: number): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (!await isPortOpen(port)) return true;
    await sleep(100);
  }
  return !await isPortOpen(port);
}

export async function stopPreviewProcess(input: {
  runManifest: string;
  pid: number;
  timeoutMs?: number;
}): Promise<PreviewProcessEntry> {
  const manifestPath = resolve(input.runManifest);
  let manifest = readJsonFile<RuntimeRunManifest>(manifestPath);
  assertRunManifest(manifest);
  const journal = readPreviewProcessJournal(manifest);
  const index = journal.processes.findIndex((entry) => entry.pid === input.pid);
  if (index < 0) throw new Error(`preview PID ${input.pid} is not journaled by this run`);
  const entry = journal.processes[index]!;
  if ((entry.exit_code === null) === (entry.signal === null)) {
    if (entry.exit_code !== null || entry.signal !== null) throw new Error("preview process has a non-exclusive exit outcome");
  }
  if (entry.exit_code !== null || entry.signal !== null) {
    if (!entry.closed_port || await isPortOpen(entry.port)) throw new Error("completed preview process still owns its port");
    return entry;
  }
  if (!isProcessAlive(entry.pid)) throw new Error("preview process disappeared without an exit outcome");
  let terminationSignal: "SIGTERM" | "SIGKILL" = "SIGTERM";
  try {
    if (process.platform === "win32") process.kill(entry.pid, "SIGTERM");
    else process.kill(-entry.pid, "SIGTERM");
  } catch (error) {
    if (isProcessAlive(entry.pid)) throw error;
  }
  const timeoutMs = input.timeoutMs ?? 10_000;
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline && isProcessAlive(entry.pid)) await sleep(50);
  if (isProcessAlive(entry.pid)) {
    terminationSignal = "SIGKILL";
    try {
      if (process.platform === "win32") process.kill(entry.pid, "SIGKILL");
      else process.kill(-entry.pid, "SIGKILL");
    } catch (error) {
      if (isProcessAlive(entry.pid)) throw error;
    }
    const killDeadline = Date.now() + timeoutMs;
    while (Date.now() < killDeadline && isProcessAlive(entry.pid)) await sleep(50);
  }
  if (isProcessAlive(entry.pid)) throw new Error(`preview PID ${entry.pid} remained live after ${terminationSignal}`);
  const closed = await waitForClosedPort(entry.port, timeoutMs);
  if (!closed) throw new Error(`preview port ${entry.port} did not close after termination`);
  const stopped: PreviewProcessEntry = {
    ...entry,
    signal: terminationSignal,
    closed_port: true,
    stopped_at: nowIso(),
  };
  journal.processes[index] = stopped;
  manifest = persistPreviewJournal(manifestPath, journal);
  if (isPlainObject(manifest.activePreview) && manifest.activePreview.pid === entry.pid) {
    const activePath = resolve(manifest.run_root, "preview/active-preview.json");
    removeFileDurably(activePath);
    updateRunManifest(manifestPath, (value) => {
      const rest = { ...value };
      delete rest.activePreview;
      return rest as RuntimeRunManifest;
    });
  }
  return stopped;
}

export async function startEstimateSheetBenchmarkServer(input: {
  runManifest: string;
  repoRoot?: string;
  port?: number | null;
  role?: "browser" | "mode";
  phase?: string;
  finalState?: string;
  activate?: boolean;
  timeoutMs?: number;
  commandOverride?: string[];
  checkSource?: boolean;
}): Promise<BenchmarkServerDescriptor> {
  const manifestPath = resolve(input.runManifest);
  let manifest = readJsonFile<RuntimeRunManifest>(manifestPath);
  assertRunManifest(manifest);
  if (manifest.evidence_class !== "local-browser" || manifest.cleanupRequirement !== "REQUIRED") {
    throw new Error("benchmark previews require a prepared local-browser run with required cleanup");
  }
  if (resolve(manifest.run_root, "run-manifest.json") !== manifestPath) throw new Error("run manifest is not the prepared run-root manifest");
  const repoRoot = resolve(input.repoRoot ?? process.cwd());
  if (input.checkSource === false && process.env.NODE_ENV !== "test") throw new Error("source checks can be disabled only in focused tests");
  if (input.checkSource !== false) {
    const current = computeEstimateSheetSourceFingerprint({ repoRoot }).fingerprint;
    if (!fingerprintContentEqual(current.application, manifest.applicationFingerprint)
      || !fingerprintContentEqual(current.producer, manifest.producerFingerprint)) {
      throw new Error("prepared browser run source fingerprint is stale");
    }
  }
  const role = input.role ?? "browser";
  if (!isPlainObject(manifest.namespaces[role])) throw new Error(`prepared run is missing the ${role} namespace`);
  const phase = input.phase ?? "baseline-all-off";
  const finalState = input.finalState ?? (phase === "baseline-all-off" ? "all-off" : "on");
  const port = resolveBenchmarkPort(manifest, input.port);
  const routePath = resolveBenchmarkRoutePath(manifest);
  const runtime = validateRuntimeEnvironment(manifest, port);
  const storage = validateStorageState(manifest, port);
  const build = validateOpenNextBuildReceipt(manifest, repoRoot);
  const journal = readPreviewProcessJournal(manifest);
  assertNoActivePreview(manifest, journal);

  const exactCommand = resolveBenchmarkServerCommand(manifest, port, phase, finalState);
  if (input.commandOverride && process.env.NODE_ENV !== "test") throw new Error("benchmark command overrides are test-only");
  const command = input.commandOverride ?? exactCommand;
  if (!command.length) throw new Error("benchmark command is empty");
  const ordinal = journal.processes.length + 1;
  const stdoutLog = resolve(manifest.run_root, `preview/logs/${ordinal}-${phase}.stdout.log`);
  const stderrLog = resolve(manifest.run_root, `preview/logs/${ordinal}-${phase}.stderr.log`);
  mkdirSync(dirname(stdoutLog), { recursive: true, mode: 0o700 });
  const stdoutFd = openSync(stdoutLog, "wx", 0o600);
  const stderrFd = openSync(stderrLog, "wx", 0o600);
  const child = spawn(command[0]!, command.slice(1), {
    cwd: repoRoot,
    env: buildBenchmarkChildEnvironment(runtime.values),
    detached: true,
    shell: false,
    stdio: ["ignore", stdoutFd, stderrFd],
  });
  closeSync(stdoutFd);
  closeSync(stderrFd);
  if (!child.pid) throw new Error("preview process did not return a PID");
  child.unref();

  const startedAt = nowIso();
  const requestedSnapshot = runtime.snapshot;
  const entry: PreviewProcessEntry = {
    role,
    phase,
    ordinal,
    pid: child.pid,
    port,
    command_sha256: sha256Hex(canonicalJson(exactCommand)),
    requested_snapshot: requestedSnapshot,
    requested_snapshot_sha256: sha256Hex(canonicalJson(requestedSnapshot)),
    server_snapshot: null,
    server_snapshot_sha256: null,
    build_hash: build.buildHash,
    readiness: "STARTING",
    started_at: startedAt,
    ready_at: null,
    exit_code: null,
    signal: null,
    closed_port: false,
    stopped_at: null,
    stdout_log: relative(manifest.run_root, stdoutLog),
    stderr_log: relative(manifest.run_root, stderrLog),
  };
  journal.processes.push(entry);
  manifest = persistPreviewJournal(manifestPath, journal);

  let serverSnapshot: EstimateServerModeSnapshot;
  try {
    serverSnapshot = await waitForReady({
      pid: child.pid,
      baseUrl: `http://127.0.0.1:${port}`,
      routePath,
      cookieHeader: storage.cookieHeader,
      timeoutMs: input.timeoutMs ?? 60_000,
    });
    if (canonicalJson(serverSnapshot.modes) !== canonicalJson(requestedSnapshot.modes)) {
      throw new Error("server-returned mode snapshot does not match runtime.env");
    }
  } catch (error) {
    journal.processes[ordinal - 1] = { ...entry, readiness: "FAILED" };
    persistPreviewJournal(manifestPath, journal);
    try { await stopPreviewProcess({ runManifest: manifestPath, pid: child.pid }); } catch { /* preserve readiness failure */ }
    throw error;
  }

  const readyAt = nowIso();
  const readyEntry: PreviewProcessEntry = {
    ...entry,
    server_snapshot: serverSnapshot,
    server_snapshot_sha256: sha256Hex(canonicalJson(serverSnapshot)),
    readiness: "READY",
    ready_at: readyAt,
  };
  journal.processes[ordinal - 1] = readyEntry;
  manifest = persistPreviewJournal(manifestPath, journal);
  const descriptorPath = resolve(manifest.run_root, `preview/descriptors/${String(ordinal).padStart(2, "0")}-${phase}.json`);
  const descriptor: BenchmarkServerDescriptor = {
    schema_version: "estimate-sheet-benchmark-server.v1",
    unit_id: manifest.unit_id,
    run_id: manifest.run_id,
    role,
    phase,
    final_state: finalState,
    ordinal,
    port,
    base_url: `http://127.0.0.1:${port}`,
    route_path: routePath,
    command: exactCommand,
    launched: true,
    pid: child.pid,
    build_receipt: relative(manifest.run_root, build.path),
    build_receipt_sha256: build.sha256,
    build_hash: build.buildHash,
    runtime_env_sha256: runtime.sha256,
    storage_state_sha256: storage.sha256,
    requested_snapshot: requestedSnapshot,
    server_snapshot: serverSnapshot,
    readiness: "READY",
    active: input.activate !== false,
    process_journal: "preview/process-journal.json",
    generated_at: readyAt,
  };
  writeJsonNoOverwrite(descriptorPath, descriptor, 0o600);
  if (descriptor.active) {
    const activePath = resolve(manifest.run_root, "preview/active-preview.json");
    if (existsSync(activePath)) throw new Error("active preview descriptor already exists");
    writeJsonNoOverwrite(activePath, { ...descriptor, descriptor_path: relative(manifest.run_root, descriptorPath), descriptor_sha256: sha256File(descriptorPath) }, 0o600);
    updateRunManifest(manifestPath, (value) => ({
      ...value,
      port,
      buildReceipt: build.path,
      build_hash: build.buildHash,
      activePreview: {
        path: activePath,
        sha256: sha256File(activePath),
        pid: descriptor.pid,
        port,
        snapshot: serverSnapshot,
      },
    }));
  }
  return descriptor;
}

export async function main(argv = process.argv.slice(2)): Promise<number> {
  const values = parseStrictCli(argv);
  if (cliBoolean(values, "help")) {
    console.log("Usage: bun run scripts/start-estimate-sheet-benchmark-server.ts --unit=UNIT-002 --phase=baseline-all-off --final-state=all-off --fixture-role=browser --background [--run-manifest=PATH]");
    return 0;
  }
  const unit = cliString(values, "unit", true)!;
  if (unit !== "UNIT-002") throw new Error("the direct benchmark launcher is restricted to the UNIT-002 baseline");
  if (!cliBoolean(values, "background") || cliBoolean(values, "launch")) throw new Error("UNIT-002 baseline requires the exact --background launch mode");
  const phase = cliString(values, "phase", true);
  const finalState = cliString(values, "final-state", true);
  const fixtureRole = cliString(values, "fixture-role", true);
  if (phase !== "baseline-all-off" || finalState !== "all-off" || fixtureRole !== "browser") {
    throw new Error("UNIT-002 baseline requires phase=baseline-all-off, final-state=all-off, fixture-role=browser");
  }
  const runManifest = resolveRunManifestPath(process.cwd(), unit, cliString(values, "run-manifest") ?? process.env.ESTIMATE_PERF_RUN_MANIFEST);
  const descriptor = await startEstimateSheetBenchmarkServer({
    runManifest,
    role: "browser",
    phase,
    finalState,
    activate: true,
  });
  process.stdout.write(`${JSON.stringify(descriptor, null, 2)}\n`);
  return 0;
}

if (import.meta.main) {
  try { process.exitCode = await main(); }
  catch (error) { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; }
}
