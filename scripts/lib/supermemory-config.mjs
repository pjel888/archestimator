import { createHash } from "node:crypto";
import {
  chmodSync,
  createReadStream,
  existsSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";

export const SERVER_CONFIG_NAME = "archestimator-server.env";
export const PROVIDER_CONFIG_NAME = "env";
export const RUNTIME_STATE_NAME = "archestimator-server-state.json";
export const SERVER_CONFIG_KEYS = [
  "SUPERMEMORY_SERVER_BIN",
  "SUPERMEMORY_SERVER_SHA256",
];
export const PROVIDER_CONFIGS = [
  ["OPENAI_API_KEY"],
  ["ANTHROPIC_API_KEY"],
  ["GEMINI_API_KEY"],
  ["GROQ_API_KEY"],
  ["WORKERS_AI_API_KEY", "CLOUDFLARE_ACCOUNT_ID"],
  ["GOOGLE_VERTEX_PROJECT_ID", "GOOGLE_VERTEX_LOCATION"],
];

const PROVIDER_KEYS = new Set(PROVIDER_CONFIGS.flat());
const LOOPBACK_HOSTS = new Set(["127.0.0.1", "::1", "localhost"]);
const SUPERMEMORY_PAGE_MARKER = "<title>supermemory";

export function supermemoryHome(home = homedir()) {
  return join(home, ".supermemory");
}

export function serverConfigPath(home = homedir()) {
  return join(supermemoryHome(home), SERVER_CONFIG_NAME);
}

export function providerConfigPath(home = homedir()) {
  return join(supermemoryHome(home), PROVIDER_CONFIG_NAME);
}

export function runtimeStatePath(home = homedir()) {
  return join(supermemoryHome(home), RUNTIME_STATE_NAME);
}

export function parseLoopbackHttpUrl(rawUrl, label = "Supermemory URL") {
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error(`${label} must be a valid URL.`);
  }
  if (url.protocol !== "http:" || !LOOPBACK_HOSTS.has(url.hostname)) {
    throw new Error(`${label} must be a loopback HTTP endpoint.`);
  }
  return url;
}

export function parsePort(rawPort) {
  if (!/^\d+$/.test(rawPort)) throw new Error("SUPERMEMORY_PORT must be an integer from 1 to 65535.");
  const port = Number.parseInt(rawPort, 10);
  if (port < 1 || port > 65535) throw new Error("SUPERMEMORY_PORT must be an integer from 1 to 65535.");
  return port;
}

export async function verifySupermemoryHealth(rawUrl, timeoutMs = 1000) {
  try {
    const baseUrl = parseLoopbackHttpUrl(rawUrl, "SUPERMEMORY_HEALTH_URL");
    const requestOptions = {
      redirect: "error",
      signal: AbortSignal.timeout(timeoutMs),
    };
    const [pageResponse, healthResponse] = await Promise.all([
      fetch(baseUrl, requestOptions),
      fetch(new URL("/v3/health", baseUrl), requestOptions),
    ]);
    if (!pageResponse.ok || !healthResponse.ok) return false;
    if (!pageResponse.headers.get("content-type")?.toLowerCase().includes("text/html")) return false;
    if (!healthResponse.headers.get("content-type")?.toLowerCase().includes("application/json")) return false;
    const [page, health] = await Promise.all([pageResponse.text(), healthResponse.json()]);
    return page.toLowerCase().includes(SUPERMEMORY_PAGE_MARKER) && health?.status === "ok";
  } catch {
    return false;
  }
}

function readProcessCommand(pid) {
  if (!Number.isInteger(pid) || pid < 1) return "";
  if (process.platform === "linux") {
    try {
      return readFileSync(`/proc/${pid}/cmdline`, "utf8").replaceAll("\0", " ");
    } catch {
      // Fall through to ps for non-procfs environments.
    }
  }
  const result = spawnSync("/bin/ps", ["-p", String(pid), "-o", "command="], {
    encoding: "utf8",
  });
  return result.status === 0 ? result.stdout.trim() : "";
}

function listeningPids(port) {
  const lsofCandidates = ["/usr/sbin/lsof", "/usr/bin/lsof"];
  for (const command of lsofCandidates) {
    if (!existsSync(command)) continue;
    const result = spawnSync(command, ["-nP", `-iTCP:${port}`, "-sTCP:LISTEN", "-t"], {
      encoding: "utf8",
    });
    if (result.status !== 0 && !result.stdout.trim()) return new Set();
    return new Set(
      result.stdout
        .split(/\s+/)
        .map((value) => Number.parseInt(value, 10))
        .filter((value) => Number.isInteger(value) && value > 0),
    );
  }
  return null;
}

export function processIsAlive(pid) {
  if (!Number.isInteger(pid) || pid < 1) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error?.code !== "ESRCH";
  }
}

export function inspectServerProcess({ bin, expectedHash, pid, port }) {
  if (!/^[a-f0-9]{64}$/.test(expectedHash || "")) return { ok: false, reason: "invalid expected checksum" };
  if (!processIsAlive(pid)) return { ok: false, reason: "process is not alive" };
  let resolvedBin;
  try {
    resolvedBin = realpathSync(bin);
  } catch {
    return { ok: false, reason: "configured executable cannot be resolved" };
  }
  if (!readProcessCommand(pid).includes(resolvedBin)) {
    return { ok: false, reason: "process command does not contain the configured executable path" };
  }
  const owners = listeningPids(port);
  if (owners !== null && !owners.has(pid)) {
    return { ok: false, reason: "process does not own the configured listening port" };
  }
  return { ok: true, reason: "verified" };
}

export function attestServerProcess(options) {
  return inspectServerProcess(options).ok;
}

export function findAttestedServerPid({ bin, expectedHash, port }) {
  const owners = listeningPids(port);
  if (owners === null) return null;
  for (const pid of owners) {
    if (attestServerProcess({ bin, expectedHash, pid, port })) return pid;
  }
  return null;
}

export function readRuntimeState(home = homedir()) {
  try {
    const path = runtimeStatePath(home);
    if ((statSync(path).mode & 0o077) !== 0) return null;
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

export function writeRuntimeState(state, home = homedir()) {
  writeFileAtomic(runtimeStatePath(home), `${JSON.stringify(state, null, 2)}\n`, 0o600);
}

export function runtimeStateMatches(state, { bin, expectedHash, port }) {
  if (
    !Number.isInteger(state?.pid)
    || state.pid < 1
    || state.port !== port
    || state.sha256 !== expectedHash
  ) {
    return false;
  }
  let resolvedStateBin;
  let resolvedBin;
  try {
    resolvedStateBin = realpathSync(state.bin);
    resolvedBin = realpathSync(bin);
  } catch {
    return false;
  }
  return resolvedStateBin === resolvedBin && attestServerProcess({ bin: resolvedBin, expectedHash, pid: state.pid, port });
}

function decodeEnvValue(rawValue) {
  const value = rawValue.trim();
  if (value.length >= 2 && value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1).replaceAll("'\\''", "'");
  }
  if (value.length >= 2 && value.startsWith('"') && value.endsWith('"')) {
    try {
      return JSON.parse(value);
    } catch {
      return value.slice(1, -1);
    }
  }
  return value;
}

export function readAllowedEnvFile(filePath, allowedKeys) {
  if (!existsSync(filePath)) return {};
  const allowed = allowedKeys instanceof Set ? allowedKeys : new Set(allowedKeys);
  const values = {};

  for (const line of readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = /^(?:export\s+)?([A-Z][A-Z0-9_]*)\s*=\s*(.*)$/.exec(trimmed);
    if (!match || !allowed.has(match[1])) continue;
    values[match[1]] = decodeEnvValue(match[2]);
  }

  return values;
}

export function readPersistentServerConfig(home = homedir()) {
  return readAllowedEnvFile(serverConfigPath(home), SERVER_CONFIG_KEYS);
}

export function buildServerEnvironment(processEnvironment = process.env, home = homedir()) {
  const savedProviderEnv = readAllowedEnvFile(providerConfigPath(home), PROVIDER_KEYS);
  const environment = { ...processEnvironment };
  for (const [name, value] of Object.entries(savedProviderEnv)) {
    if (!environment[name]?.trim()) environment[name] = value;
  }
  return environment;
}

export function hasProviderConfig(environment) {
  return PROVIDER_CONFIGS.some((requiredNames) =>
    requiredNames.every((name) => Boolean(environment[name]?.trim())),
  );
}

export async function sha256(filePath) {
  const hash = createHash("sha256");
  await new Promise((resolvePromise, reject) => {
    const stream = createReadStream(filePath);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("error", reject);
    stream.on("end", resolvePromise);
  });
  return hash.digest("hex");
}

export function writeFileAtomic(filePath, content, mode) {
  const directory = dirname(filePath);
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  try {
    writeFileSync(tempPath, content, { mode });
    renameSync(tempPath, filePath);
    chmodSync(filePath, mode);
  } finally {
    rmSync(tempPath, { force: true });
  }
}
