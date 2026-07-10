#!/usr/bin/env node

import { spawn } from "node:child_process";
import { chmodSync, closeSync, mkdirSync, openSync } from "node:fs";
import { access, constants } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

import {
  buildServerEnvironment,
  hasProviderConfig,
  parseLoopbackHttpUrl,
  parsePort,
  readPersistentServerConfig,
  sha256,
  supermemoryHome,
  inspectServerProcess,
  verifySupermemoryHealth,
  writeRuntimeState,
} from "./lib/supermemory-config.mjs";

const DEFAULT_PORT = "6767";
const DEFAULT_LOG_PATH = join(supermemoryHome(), "server.log");
const DEFAULT_STARTUP_TIMEOUT_MS = 15000;

function fail(message) {
  process.stderr.write(`supermemory:start: ${message}\n`);
  process.exit(1);
}

function readPositiveIntegerEnv(name, fallback) {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function describeChildExit(code, signal) {
  if (signal) return `signal ${signal}`;
  return `code ${code ?? "unknown"}`;
}

async function assertChildBecomesHealthy(child, healthUrl, timeoutMs) {
  let earlyExit = null;
  let lastHealthError = null;
  child.once("error", (error) => {
    earlyExit = `startup error: ${error.message}`;
  });
  child.once("exit", (code, signal) => {
    earlyExit = `exit ${describeChildExit(code, signal)}`;
  });

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (earlyExit) throw new Error(`server exited before health check passed (${earlyExit})`);

    const requestTimeoutMs = Math.max(1, Math.min(1000, deadline - Date.now()));
    if (await verifySupermemoryHealth(healthUrl, requestTimeoutMs)) return;
    lastHealthError = "identity or health check did not pass";

    await sleep(100);
  }

  if (earlyExit) throw new Error(`server exited before health check passed (${earlyExit})`);
  throw new Error(`health check ${healthUrl} did not pass within ${timeoutMs}ms${lastHealthError ? `: ${lastHealthError}` : ""}`);
}

const processConfiguredBin = process.env.SUPERMEMORY_SERVER_BIN?.trim();
const processExpectedHash = process.env.SUPERMEMORY_SERVER_SHA256?.trim().toLowerCase();

if (Boolean(processConfiguredBin) !== Boolean(processExpectedHash)) {
  fail("SUPERMEMORY_SERVER_BIN and SUPERMEMORY_SERVER_SHA256 must be set together.");
}

const persistentConfig = processConfiguredBin ? {} : readPersistentServerConfig();
const configuredBin = processConfiguredBin || persistentConfig.SUPERMEMORY_SERVER_BIN?.trim();
const expectedHash = processExpectedHash
  || persistentConfig.SUPERMEMORY_SERVER_SHA256?.trim().toLowerCase();

if (!configuredBin) {
  fail("verified server config is missing; run bun run supermemory:configure.");
}

if (!expectedHash || !/^[a-f0-9]{64}$/.test(expectedHash)) {
  fail("verified server checksum is missing or invalid; run bun run supermemory:configure.");
}

const serverBin = resolve(configuredBin);

try {
  await access(serverBin, constants.X_OK);
} catch {
  fail(`${serverBin} is not executable.`);
}

const actualHash = await sha256(serverBin);
if (actualHash !== expectedHash) {
  fail(`checksum mismatch for ${serverBin}: expected ${expectedHash}, got ${actualHash}.`);
}

const childEnv = buildServerEnvironment();
if (!hasProviderConfig(childEnv)) {
  fail(
    "non-interactive startup requires an LLM provider env var or existing ~/.supermemory/env with a supported value. "
      + "Run supermemory-server interactively once, or set one of OPENAI_API_KEY, ANTHROPIC_API_KEY, "
      + "GEMINI_API_KEY, GROQ_API_KEY, WORKERS_AI_API_KEY+CLOUDFLARE_ACCOUNT_ID, "
      + "or GOOGLE_VERTEX_PROJECT_ID+GOOGLE_VERTEX_LOCATION.",
  );
}

const portText = process.env.SUPERMEMORY_PORT?.trim() || DEFAULT_PORT;
let port;
let healthUrl;
try {
  port = parsePort(portText);
  healthUrl = parseLoopbackHttpUrl(
    process.env.SUPERMEMORY_HEALTH_URL?.trim() || `http://localhost:${port}/`,
    "SUPERMEMORY_HEALTH_URL",
  ).href;
  if (Number.parseInt(new URL(healthUrl).port || "80", 10) !== port) {
    throw new Error("SUPERMEMORY_HEALTH_URL port must match SUPERMEMORY_PORT.");
  }
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}
const startupTimeoutMs = readPositiveIntegerEnv("SUPERMEMORY_STARTUP_TIMEOUT_MS", DEFAULT_STARTUP_TIMEOUT_MS);
const logPath = process.env.SUPERMEMORY_LOG_PATH || DEFAULT_LOG_PATH;
mkdirSync(dirname(logPath), { recursive: true, mode: 0o700 });
const out = openSync(logPath, "a", 0o600);
const err = openSync(logPath, "a", 0o600);
chmodSync(logPath, 0o600);
let child = null;

try {
  child = spawn(serverBin, [], {
    detached: true,
    env: {
      ...childEnv,
      PORT: port,
      SUPERMEMORY_PORT: port,
    },
    stdio: ["ignore", out, err],
  });
  await assertChildBecomesHealthy(child, healthUrl, startupTimeoutMs);
  const attestation = inspectServerProcess({ bin: serverBin, expectedHash, pid: child.pid, port });
  if (!attestation.ok) {
    throw new Error(`healthy listener is not owned by the checksum-verified server process: ${attestation.reason}`);
  }
  writeRuntimeState({
    bin: serverBin,
    pid: child.pid,
    port,
    sha256: expectedHash,
    startedAt: new Date().toISOString(),
  });
  child.unref();
  process.stdout.write(`supermemory:start: started ${serverBin} on port ${port}; health ${healthUrl}; log ${logPath}; pid ${child.pid}\n`);
} catch (error) {
  if (child && !child.killed) child.kill();
  fail(error instanceof Error ? error.message : String(error));
} finally {
  closeSync(out);
  closeSync(err);
}
