#!/usr/bin/env node

import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { closeSync, createReadStream, existsSync, openSync, statSync } from "node:fs";
import { access, constants } from "node:fs/promises";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

const DEFAULT_PORT = "6767";
const DEFAULT_LOG_PATH = "/tmp/supermemory-local.log";
const DEFAULT_STARTUP_TIMEOUT_MS = 5000;
const SAVED_ENV_PATH = join(homedir(), ".supermemory", "env");
const PROVIDER_CONFIGS = [
  ["OPENAI_API_KEY"],
  ["ANTHROPIC_API_KEY"],
  ["GEMINI_API_KEY"],
  ["GROQ_API_KEY"],
  ["WORKERS_AI_API_KEY", "CLOUDFLARE_ACCOUNT_ID"],
  ["GOOGLE_VERTEX_PROJECT_ID", "GOOGLE_VERTEX_LOCATION"],
];

function fail(message) {
  process.stderr.write(`supermemory:start: ${message}\n`);
  process.exit(1);
}

async function sha256(filePath) {
  const hash = createHash("sha256");
  await new Promise((resolvePromise, reject) => {
    const stream = createReadStream(filePath);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("error", reject);
    stream.on("end", resolvePromise);
  });
  return hash.digest("hex");
}

function hasEnv(name) {
  return Boolean(process.env[name]?.trim());
}

function hasProviderConfig() {
  return PROVIDER_CONFIGS.some((requiredNames) => requiredNames.every(hasEnv));
}

function hasSavedSupermemoryEnv() {
  try {
    return existsSync(SAVED_ENV_PATH) && statSync(SAVED_ENV_PATH).size > 0;
  } catch {
    return false;
  }
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

    try {
      const response = await fetch(healthUrl);
      if (response.ok) {
        await response.arrayBuffer();
        return;
      }
      lastHealthError = `HTTP ${response.status}`;
    } catch (error) {
      lastHealthError = error instanceof Error ? error.message : String(error);
    }

    await sleep(100);
  }

  if (earlyExit) throw new Error(`server exited before health check passed (${earlyExit})`);
  throw new Error(`health check ${healthUrl} did not pass within ${timeoutMs}ms${lastHealthError ? `: ${lastHealthError}` : ""}`);
}

const configuredBin = process.env.SUPERMEMORY_SERVER_BIN;
const expectedHash = process.env.SUPERMEMORY_SERVER_SHA256?.trim().toLowerCase();

if (!configuredBin) {
  fail("SUPERMEMORY_SERVER_BIN must point to a local supermemory-server binary.");
}

if (!expectedHash || !/^[a-f0-9]{64}$/.test(expectedHash)) {
  fail("SUPERMEMORY_SERVER_SHA256 must be the expected SHA-256 for that binary.");
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

if (!hasProviderConfig() && !hasSavedSupermemoryEnv()) {
  fail(
    "non-interactive startup requires an LLM provider env var or existing ~/.supermemory/env. "
      + "Run supermemory-server interactively once, or set one of OPENAI_API_KEY, ANTHROPIC_API_KEY, "
      + "GEMINI_API_KEY, GROQ_API_KEY, WORKERS_AI_API_KEY+CLOUDFLARE_ACCOUNT_ID, "
      + "or GOOGLE_VERTEX_PROJECT_ID+GOOGLE_VERTEX_LOCATION.",
  );
}

const port = process.env.SUPERMEMORY_PORT?.trim() || DEFAULT_PORT;
const healthUrl = process.env.SUPERMEMORY_HEALTH_URL?.trim() || `http://localhost:${port}/`;
const startupTimeoutMs = readPositiveIntegerEnv("SUPERMEMORY_STARTUP_TIMEOUT_MS", DEFAULT_STARTUP_TIMEOUT_MS);
const logPath = process.env.SUPERMEMORY_LOG_PATH || DEFAULT_LOG_PATH;
const out = openSync(logPath, "a");
const err = openSync(logPath, "a");
let child = null;

try {
  child = spawn(serverBin, [], {
    detached: true,
    env: {
      ...process.env,
      PORT: port,
      SUPERMEMORY_PORT: port,
    },
    stdio: ["ignore", out, err],
  });
  await assertChildBecomesHealthy(child, healthUrl, startupTimeoutMs);
  child.unref();
  process.stdout.write(`supermemory:start: started ${serverBin} on port ${port}; health ${healthUrl}; log ${logPath}; pid ${child.pid}\n`);
} catch (error) {
  if (child && !child.killed) child.kill();
  fail(error instanceof Error ? error.message : String(error));
} finally {
  closeSync(out);
  closeSync(err);
}
