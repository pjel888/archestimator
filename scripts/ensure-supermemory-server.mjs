#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const configurePath = join(SCRIPT_DIR, "configure-supermemory-server.mjs");
const startPath = join(SCRIPT_DIR, "start-verified-supermemory-server.mjs");
const port = process.env.SUPERMEMORY_PORT?.trim() || "6767";
const healthUrl = process.env.SUPERMEMORY_HEALTH_URL?.trim() || `http://localhost:${port}/`;

function fail(message) {
  process.stderr.write(`supermemory:ensure: ${message}\n`);
  process.exit(1);
}

async function isHealthy() {
  try {
    const response = await fetch(healthUrl);
    if (!response.ok) return false;
    await response.arrayBuffer();
    return true;
  } catch {
    return false;
  }
}

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
  fail("verified binary configuration failed.");
}

if (!(await isHealthy())) {
  const start = spawnSync(process.execPath, [startPath], {
    cwd: resolve(SCRIPT_DIR, ".."),
    encoding: "utf8",
    env: process.env,
  });
  if (start.stdout) process.stdout.write(start.stdout);
  if (start.status !== 0) {
    if (start.stderr) process.stderr.write(start.stderr);
    fail("server startup failed.");
  }
}

if (!(await isHealthy())) fail(`health check failed at ${healthUrl}.`);
process.stdout.write(`supermemory:ensure: ready at ${healthUrl}\n`);
