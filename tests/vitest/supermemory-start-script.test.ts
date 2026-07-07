import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";

import { afterEach, describe, expect, it } from "vitest";

const scriptPath = "scripts/start-verified-supermemory-server.mjs";
const tempDirs: string[] = [];

function createTempDir() {
  const dir = mkdtempSync(join(tmpdir(), "archestimator-supermemory-start-"));
  tempDirs.push(dir);
  return dir;
}

function sha256(content: string) {
  return createHash("sha256").update(content).digest("hex");
}

function createFakeServer(tempDir: string) {
  const serverPath = join(tempDir, "supermemory-server");
  const content = `#!/usr/bin/env node
const { writeFileSync } = require("node:fs");
writeFileSync(process.env.FAKE_SERVER_ENV_OUT, JSON.stringify({
  PORT: process.env.PORT,
  SUPERMEMORY_PORT: process.env.SUPERMEMORY_PORT,
}));
`;
  writeFileSync(serverPath, content);
  chmodSync(serverPath, 0o755);
  return { serverPath, hash: sha256(content) };
}

function runStartScript({
  env = {},
  homeDir,
  serverPath,
  hash,
}: {
  env?: Record<string, string | undefined>;
  homeDir: string;
  serverPath: string;
  hash: string;
}) {
  const childEnv = { ...process.env };
  for (const name of [
    "ANTHROPIC_API_KEY",
    "CLOUDFLARE_ACCOUNT_ID",
    "FAKE_SERVER_ENV_OUT",
    "GEMINI_API_KEY",
    "GOOGLE_VERTEX_LOCATION",
    "GOOGLE_VERTEX_PROJECT_ID",
    "GROQ_API_KEY",
    "OPENAI_API_KEY",
    "PORT",
    "SUPERMEMORY_LOG_PATH",
    "SUPERMEMORY_PORT",
    "WORKERS_AI_API_KEY",
  ]) {
    delete childEnv[name];
  }
  for (const [name, value] of Object.entries(env)) {
    if (value === undefined) delete childEnv[name];
    else childEnv[name] = value;
  }
  return spawnSync(process.execPath, [scriptPath], {
    cwd: process.cwd(),
    encoding: "utf8",
    env: {
      ...childEnv,
      HOME: homeDir,
      SUPERMEMORY_SERVER_BIN: serverPath,
      SUPERMEMORY_SERVER_SHA256: hash,
    },
  });
}

function readJsonWhenWritten(path: string) {
  const sleep = (milliseconds: number) => {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, milliseconds);
  };
  const startedAt = Date.now();
  while (!existsSync(path)) {
    if (Date.now() - startedAt > 5000) throw new Error(`Timed out waiting for ${path}`);
    sleep(20);
  }
  return JSON.parse(readFileSync(path, "utf8")) as Record<string, string>;
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { force: true, recursive: true });
  }
});

describe("verified Supermemory server launcher", () => {
  it("ignores generic PORT and keeps the documented 6767 default", () => {
    const tempDir = createTempDir();
    const homeDir = join(tempDir, "home");
    const envOut = join(tempDir, "server-env.json");
    mkdirSync(homeDir);
    const { serverPath, hash } = createFakeServer(tempDir);

    const result = runStartScript({
      env: {
        FAKE_SERVER_ENV_OUT: envOut,
        OPENAI_API_KEY: "sk-test",
        PORT: "3000",
        SUPERMEMORY_LOG_PATH: join(tempDir, "supermemory.log"),
      },
      homeDir,
      serverPath,
      hash,
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("on port 6767");
    expect(readJsonWhenWritten(envOut)).toEqual({ PORT: "6767", SUPERMEMORY_PORT: "6767" });
  });

  it("honors SUPERMEMORY_PORT when the fixed local URL is intentionally overridden", () => {
    const tempDir = createTempDir();
    const homeDir = join(tempDir, "home");
    const envOut = join(tempDir, "server-env.json");
    mkdirSync(homeDir);
    const { serverPath, hash } = createFakeServer(tempDir);

    const result = runStartScript({
      env: {
        FAKE_SERVER_ENV_OUT: envOut,
        OPENAI_API_KEY: "sk-test",
        PORT: "3000",
        SUPERMEMORY_LOG_PATH: join(tempDir, "supermemory.log"),
        SUPERMEMORY_PORT: "7878",
      },
      homeDir,
      serverPath,
      hash,
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("on port 7878");
    expect(readJsonWhenWritten(envOut)).toEqual({ PORT: "7878", SUPERMEMORY_PORT: "7878" });
  });

  it("fails before detaching when first-boot provider config is missing", () => {
    const tempDir = createTempDir();
    const homeDir = join(tempDir, "home");
    const envOut = join(tempDir, "server-env.json");
    mkdirSync(homeDir);
    const { serverPath, hash } = createFakeServer(tempDir);

    const result = runStartScript({
      env: {
        FAKE_SERVER_ENV_OUT: envOut,
        OPENAI_API_KEY: undefined,
        SUPERMEMORY_LOG_PATH: join(tempDir, "supermemory.log"),
      },
      homeDir,
      serverPath,
      hash,
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("non-interactive startup requires an LLM provider env var or existing ~/.supermemory/env");
    expect(existsSync(envOut)).toBe(false);
  });

  it("allows startup when the installer has already written ~/.supermemory/env", () => {
    const tempDir = createTempDir();
    const homeDir = join(tempDir, "home");
    const savedEnvDir = join(homeDir, ".supermemory");
    const envOut = join(tempDir, "server-env.json");
    mkdirSync(savedEnvDir, { recursive: true });
    writeFileSync(join(savedEnvDir, "env"), "OPENAI_API_KEY=encrypted\n");
    const { serverPath, hash } = createFakeServer(tempDir);

    const result = runStartScript({
      env: {
        FAKE_SERVER_ENV_OUT: envOut,
        OPENAI_API_KEY: undefined,
        SUPERMEMORY_LOG_PATH: join(tempDir, "supermemory.log"),
      },
      homeDir,
      serverPath,
      hash,
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("on port 6767");
    expect(readJsonWhenWritten(envOut)).toEqual({ PORT: "6767", SUPERMEMORY_PORT: "6767" });
  });
});
