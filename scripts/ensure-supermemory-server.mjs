#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { fileURLToPath } from "node:url";

import {
  findAttestedServerPid,
  parseLoopbackHttpUrl,
  parsePort,
  processIsAlive,
  readPersistentServerConfig,
  readRuntimeState,
  runtimeStateMatches,
  supermemoryHome,
  verifySupermemoryHealth,
  writeRuntimeState,
} from "./lib/supermemory-config.mjs";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const configurePath = join(SCRIPT_DIR, "configure-supermemory-server.mjs");
const startPath = join(SCRIPT_DIR, "start-verified-supermemory-server.mjs");
const portText = process.env.SUPERMEMORY_PORT?.trim() || "6767";
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
const lockPath = join(supermemoryHome(), "ensure.lock");
const lockOwnerPath = join(lockPath, "owner.json");
const lockWaitTimeoutMs = Number.parseInt(process.env.SUPERMEMORY_ENSURE_LOCK_TIMEOUT_MS || "30000", 10);

function fail(message) {
  process.stderr.write(`supermemory:ensure: ${message}\n`);
  process.exit(1);
}

async function isHealthy() {
  return verifySupermemoryHealth(healthUrl, 1000);
}

function removeStaleLock() {
  let ageMs;
  try {
    ageMs = Date.now() - statSync(lockPath).mtimeMs;
  } catch {
    return true;
  }
  let owner = null;
  try {
    owner = JSON.parse(readFileSync(lockOwnerPath, "utf8"));
  } catch {
    // A creator can briefly hold the directory before writing its owner file.
  }
  const hasValidOwner = Number.isInteger(owner?.pid) && owner.pid > 0 && typeof owner.token === "string";
  if (hasValidOwner && processIsAlive(owner.pid)) return false;
  if (!hasValidOwner && ageMs < 1000) return false;

  const quarantinePath = `${lockPath}.stale.${process.pid}.${randomUUID()}`;
  try {
    renameSync(lockPath, quarantinePath);
  } catch (error) {
    if (error?.code === "ENOENT" || error?.code === "EEXIST") return true;
    throw error;
  }
  rmSync(quarantinePath, { force: true, recursive: true });
  return true;
}

async function acquireLock() {
  const deadline = Date.now() + lockWaitTimeoutMs;
  const token = `${process.pid}:${randomUUID()}`;
  while (Date.now() < deadline) {
    try {
      mkdirSync(lockPath, { mode: 0o700 });
      writeFileSync(lockOwnerPath, JSON.stringify({ pid: process.pid, token }), { mode: 0o600 });
      return () => {
        try {
          const owner = JSON.parse(readFileSync(lockOwnerPath, "utf8"));
          if (owner.token === token) rmSync(lockPath, { force: true, recursive: true });
        } catch {
          // A stale-lock recovery may already have removed it.
        }
      };
    } catch (error) {
      if (error?.code !== "EEXIST") throw error;
      if (removeStaleLock()) continue;
      await sleep(100);
    }
  }
  fail(`timed out waiting for the single-flight lock ${lockPath}.`);
}

const releaseLock = await acquireLock();
let failure = null;
try {
  const configure = spawnSync(process.execPath, [configurePath, "--quiet"], {
    cwd: resolve(SCRIPT_DIR, ".."),
    encoding: "utf8",
    env: {
      ...process.env,
      SUPERMEMORY_CONFIGURE_SKIP_LAUNCH_AGENT: "1",
    },
  });
  if (configure.status !== 0) {
    if (configure.stderr) process.stderr.write(configure.stderr);
    throw new Error("verified binary configuration failed.");
  }

  const configured = readPersistentServerConfig();
  const attestation = {
    bin: configured.SUPERMEMORY_SERVER_BIN,
    expectedHash: configured.SUPERMEMORY_SERVER_SHA256,
    port,
  };
  if (!attestation.bin || !attestation.expectedHash) {
    throw new Error("verified server configuration was not persisted.");
  }

  let healthy = await isHealthy();
  let state = readRuntimeState();
  if (healthy && !runtimeStateMatches(state, attestation)) {
    const pid = findAttestedServerPid(attestation);
    if (pid) {
      writeRuntimeState({
        bin: attestation.bin,
        pid,
        port,
        sha256: attestation.expectedHash,
        startedAt: "adopted-existing-verified-process",
      });
      state = readRuntimeState();
    }
    healthy = runtimeStateMatches(state, attestation);
  }

  if (!healthy) {
    const startEnvironment = { ...process.env };
    delete startEnvironment.SUPERMEMORY_SERVER_BIN;
    delete startEnvironment.SUPERMEMORY_SERVER_SHA256;
    const start = spawnSync(process.execPath, [startPath], {
      cwd: resolve(SCRIPT_DIR, ".."),
      encoding: "utf8",
      env: startEnvironment,
    });
    if (start.stdout) process.stdout.write(start.stdout);
    if (start.status !== 0) {
      if (start.stderr) process.stderr.write(start.stderr);
      throw new Error("server startup failed.");
    }
  }

  if (!(await isHealthy())) throw new Error(`health check failed at ${healthUrl}.`);
  state = readRuntimeState();
  if (!runtimeStateMatches(state, attestation)) {
    throw new Error("health passed but the listener is not the checksum-verified Supermemory process.");
  }
} catch (error) {
  failure = error instanceof Error ? error.message : String(error);
} finally {
  releaseLock();
}

if (failure) fail(failure);
process.stdout.write(`supermemory:ensure: ready at ${healthUrl}\n`);
