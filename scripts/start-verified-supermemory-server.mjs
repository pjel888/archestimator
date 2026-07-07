#!/usr/bin/env node

import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { closeSync, createReadStream, existsSync, openSync, statSync } from "node:fs";
import { access, constants } from "node:fs/promises";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

const DEFAULT_PORT = "6767";
const DEFAULT_LOG_PATH = "/tmp/supermemory-local.log";
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
const logPath = process.env.SUPERMEMORY_LOG_PATH || DEFAULT_LOG_PATH;
const out = openSync(logPath, "a");
const err = openSync(logPath, "a");

try {
  const child = spawn(serverBin, [], {
    detached: true,
    env: {
      ...process.env,
      PORT: port,
      SUPERMEMORY_PORT: port,
    },
    stdio: ["ignore", out, err],
  });
  child.unref();
  process.stdout.write(`supermemory:start: started ${serverBin} on port ${port}; log ${logPath}; pid ${child.pid}\n`);
} finally {
  closeSync(out);
  closeSync(err);
}
