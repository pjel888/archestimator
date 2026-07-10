import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, statSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";

import { afterEach, describe, expect, it } from "vitest";

import {
  hasRequiredSupermemoryBootstrap,
  SUPERMEMORY_BOOTSTRAP_MARKER,
} from "../../scripts/lib/supermemory-guidance.mjs";

const scriptPath = "scripts/start-verified-supermemory-server.mjs";
const configureScriptPath = "scripts/configure-supermemory-server.mjs";
const ensureScriptPath = "scripts/ensure-supermemory-server.mjs";
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
const { appendFileSync } = require("node:fs");
const { createServer } = require("node:http");
if (process.env.FAKE_SERVER_START_COUNT_OUT) {
  appendFileSync(process.env.FAKE_SERVER_START_COUNT_OUT, "start\\n");
}
writeFileSync(process.env.FAKE_SERVER_ENV_OUT, JSON.stringify({
  PORT: process.env.PORT,
  SUPERMEMORY_PORT: process.env.SUPERMEMORY_PORT,
  ...(process.env.FAKE_SERVER_CAPTURE_PROVIDER === "1"
    ? { OPENAI_API_KEY_SET: Boolean(process.env.OPENAI_API_KEY) }
    : {}),
}));
if (process.env.FAKE_SERVER_EXIT_IMMEDIATELY === "1") process.exit(42);
const server = createServer((request, response) => {
  if (process.env.FAKE_SERVER_HANG_HEALTH === "1") return;
  response.statusCode = 200;
  if (request.url === "/v3/health") {
    response.setHeader("content-type", "application/json");
    response.end(JSON.stringify({ status: "ok" }));
    return;
  }
  response.setHeader("content-type", "text/html; charset=UTF-8");
  response.end(process.env.FAKE_SERVER_PAGE_BODY || "<!doctype html><title>supermemory · local</title>");
});
setTimeout(() => server.listen(Number(process.env.PORT), () => {
  const exitAfterMs = Number.parseInt(process.env.FAKE_SERVER_EXIT_AFTER_MS || "250", 10);
  if (exitAfterMs > 0) {
    setTimeout(() => server.close(() => process.exit(0)), exitAfterMs);
  }
}), Number.parseInt(process.env.FAKE_SERVER_LISTEN_DELAY_MS || "0", 10));
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
    "FAKE_SERVER_EXIT_AFTER_MS",
    "FAKE_SERVER_EXIT_IMMEDIATELY",
    "FAKE_SERVER_HANG_HEALTH",
    "FAKE_SERVER_LISTEN_DELAY_MS",
    "FAKE_SERVER_PAGE_BODY",
    "FAKE_SERVER_START_COUNT_OUT",
    "FAKE_SERVER_CAPTURE_PROVIDER",
    "FAKE_SERVER_ENV_OUT",
    "GEMINI_API_KEY",
    "GOOGLE_VERTEX_LOCATION",
    "GOOGLE_VERTEX_PROJECT_ID",
    "GROQ_API_KEY",
    "OPENAI_API_KEY",
    "PORT",
    "SUPERMEMORY_HEALTH_URL",
    "SUPERMEMORY_ENSURE_LOCK_TIMEOUT_MS",
    "SUPERMEMORY_LOG_PATH",
    "SUPERMEMORY_PORT",
    "SUPERMEMORY_SERVER_BIN",
    "SUPERMEMORY_SERVER_SHA256",
    "SUPERMEMORY_STARTUP_TIMEOUT_MS",
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

function writePersistentServerConfig(homeDir: string, serverPath: string, hash: string) {
  const configDir = join(homeDir, ".supermemory");
  mkdirSync(configDir, { recursive: true });
  writeFileSync(
    join(configDir, "archestimator-server.env"),
    [
      `export SUPERMEMORY_SERVER_BIN='${serverPath}'`,
      `export SUPERMEMORY_SERVER_SHA256='${hash}'`,
      "",
    ].join("\n"),
    { mode: 0o600 },
  );
}

function createInstalledServer(homeDir: string) {
  const binDir = join(homeDir, ".supermemory", "bin");
  mkdirSync(binDir, { recursive: true });
  const { serverPath, hash } = createFakeServer(binDir);
  writeFileSync(`${serverPath}.version`, "0.0.3\n");
  const checksumsPath = join(homeDir, "checksums.json");
  writeFileSync(
    checksumsPath,
    JSON.stringify({
      versions: {
        "0.0.3": {
          "darwin-arm64": hash,
          "darwin-x64": hash,
          "linux-arm64": hash,
          "linux-x64": hash,
        },
      },
    }),
  );
  return { checksumsPath, hash, serverPath };
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

function runScriptAsync(script: string, env: NodeJS.ProcessEnv) {
  return new Promise<{ status: number | null; stderr: string; stdout: string }>((resolvePromise) => {
    const child = spawn(process.execPath, [script], {
      cwd: process.cwd(),
      env,
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("close", (status) => resolvePromise({ status, stderr, stdout }));
  });
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    const statePath = join(dir, "home", ".supermemory", "archestimator-server-state.json");
    if (existsSync(statePath)) {
      try {
        const state = JSON.parse(readFileSync(statePath, "utf8")) as { pid?: number };
        if (state.pid) process.kill(state.pid, "SIGTERM");
      } catch {
        // The focused test server may already have exited.
      }
    }
    rmSync(dir, { force: true, recursive: true });
  }
});

describe("verified Supermemory server launcher", () => {
  it("ignores generic PORT and keeps the documented 6767 default", () => {
    const launcher = readFileSync(scriptPath, "utf8");

    expect(launcher).toContain('const DEFAULT_PORT = "6767";');
    expect(launcher).toContain("process.env.SUPERMEMORY_PORT?.trim() || DEFAULT_PORT");
    expect(launcher).not.toContain("process.env.PORT?.trim()");
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
        FAKE_SERVER_EXIT_AFTER_MS: "3000",
        OPENAI_API_KEY: "sk-test",
        PORT: "3000",
        SUPERMEMORY_LOG_PATH: join(tempDir, "supermemory.log"),
        SUPERMEMORY_PORT: "7878",
        SUPERMEMORY_STARTUP_TIMEOUT_MS: "2000",
      },
      homeDir,
      serverPath,
      hash,
    });

    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain("on port 7878");
    expect(result.stdout).toContain("health http://localhost:7878/");
    expect(readJsonWhenWritten(envOut)).toEqual({ PORT: "7878", SUPERMEMORY_PORT: "7878" });
    expect(statSync(join(tempDir, "supermemory.log")).mode & 0o777).toBe(0o600);
    const statePath = join(homeDir, ".supermemory", "archestimator-server-state.json");
    expect(JSON.parse(readFileSync(statePath, "utf8"))).toMatchObject({
      bin: realpathSync(serverPath),
      port: 7878,
      sha256: hash,
    });
    expect(statSync(statePath).mode & 0o777).toBe(0o600);
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
        SUPERMEMORY_STARTUP_TIMEOUT_MS: "500",
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
        FAKE_SERVER_EXIT_AFTER_MS: "3000",
        OPENAI_API_KEY: undefined,
        SUPERMEMORY_LOG_PATH: join(tempDir, "supermemory.log"),
        SUPERMEMORY_PORT: "7879",
        SUPERMEMORY_STARTUP_TIMEOUT_MS: "2000",
      },
      homeDir,
      serverPath,
      hash,
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("on port 7879");
    expect(readJsonWhenWritten(envOut)).toEqual({ PORT: "7879", SUPERMEMORY_PORT: "7879" });
  });

  it("uses persistent verified binary configuration when process env is clean", () => {
    const tempDir = createTempDir();
    const homeDir = join(tempDir, "home");
    const envOut = join(tempDir, "server-env.json");
    mkdirSync(homeDir);
    const { serverPath, hash } = createFakeServer(tempDir);
    writePersistentServerConfig(homeDir, serverPath, hash);
    const env = {
      ...process.env,
      FAKE_SERVER_ENV_OUT: envOut,
      FAKE_SERVER_EXIT_AFTER_MS: "3000",
      HOME: homeDir,
      OPENAI_API_KEY: "sk-test",
      SUPERMEMORY_LOG_PATH: join(tempDir, "supermemory.log"),
      SUPERMEMORY_PORT: "7881",
      SUPERMEMORY_STARTUP_TIMEOUT_MS: "2000",
    };
    delete env.SUPERMEMORY_SERVER_BIN;
    delete env.SUPERMEMORY_SERVER_SHA256;

    const result = spawnSync(process.execPath, [scriptPath], {
      cwd: process.cwd(),
      encoding: "utf8",
      env,
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("on port 7881");
  });

  it("loads only supported provider settings from ~/.supermemory/env", () => {
    const tempDir = createTempDir();
    const homeDir = join(tempDir, "home");
    const savedEnvDir = join(homeDir, ".supermemory");
    const envOut = join(tempDir, "server-env.json");
    mkdirSync(savedEnvDir, { recursive: true });
    writeFileSync(
      join(savedEnvDir, "env"),
      [
        "OPENAI_API_KEY=stored-provider-key",
        "UNRELATED_COMMAND=$(touch should-not-run)",
        "",
      ].join("\n"),
    );
    const { serverPath, hash } = createFakeServer(tempDir);

    const result = runStartScript({
      env: {
        FAKE_SERVER_CAPTURE_PROVIDER: "1",
        FAKE_SERVER_ENV_OUT: envOut,
        FAKE_SERVER_EXIT_AFTER_MS: "3000",
        OPENAI_API_KEY: undefined,
        SUPERMEMORY_LOG_PATH: join(tempDir, "supermemory.log"),
        SUPERMEMORY_PORT: "7882",
        SUPERMEMORY_STARTUP_TIMEOUT_MS: "2000",
      },
      homeDir,
      serverPath,
      hash,
    });

    expect(result.status).toBe(0);
    expect(readJsonWhenWritten(envOut)).toEqual({
      OPENAI_API_KEY_SET: true,
      PORT: "7882",
      SUPERMEMORY_PORT: "7882",
    });
    expect(existsSync(join(process.cwd(), "should-not-run"))).toBe(false);
  });

  it("fails when the verified server exits before the health check passes", () => {
    const tempDir = createTempDir();
    const homeDir = join(tempDir, "home");
    const envOut = join(tempDir, "server-env.json");
    mkdirSync(homeDir);
    const { serverPath, hash } = createFakeServer(tempDir);

    const result = runStartScript({
      env: {
        FAKE_SERVER_ENV_OUT: envOut,
        FAKE_SERVER_EXIT_IMMEDIATELY: "1",
        OPENAI_API_KEY: "sk-test",
        SUPERMEMORY_LOG_PATH: join(tempDir, "supermemory.log"),
        SUPERMEMORY_PORT: "7880",
        SUPERMEMORY_STARTUP_TIMEOUT_MS: "1000",
      },
      homeDir,
      serverPath,
      hash,
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("server exited before health check passed");
    expect(readJsonWhenWritten(envOut)).toEqual({ PORT: "7880", SUPERMEMORY_PORT: "7880" });
  });

  it("rejects an unrelated 2xx listener instead of treating the port as Supermemory", () => {
    const tempDir = createTempDir();
    const homeDir = join(tempDir, "home");
    const envOut = join(tempDir, "server-env.json");
    mkdirSync(homeDir);
    const { serverPath, hash } = createFakeServer(tempDir);

    const result = runStartScript({
      env: {
        FAKE_SERVER_ENV_OUT: envOut,
        FAKE_SERVER_EXIT_AFTER_MS: "0",
        FAKE_SERVER_PAGE_BODY: "ok",
        OPENAI_API_KEY: "sk-test",
        SUPERMEMORY_LOG_PATH: join(tempDir, "supermemory.log"),
        SUPERMEMORY_PORT: "7891",
        SUPERMEMORY_STARTUP_TIMEOUT_MS: "400",
      },
      homeDir,
      serverPath,
      hash,
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("identity or health check did not pass");
  });

  it("bounds a health endpoint that accepts connections but never responds", () => {
    const tempDir = createTempDir();
    const homeDir = join(tempDir, "home");
    const envOut = join(tempDir, "server-env.json");
    mkdirSync(homeDir);
    const { serverPath, hash } = createFakeServer(tempDir);
    const startedAt = Date.now();

    const result = runStartScript({
      env: {
        FAKE_SERVER_ENV_OUT: envOut,
        FAKE_SERVER_EXIT_AFTER_MS: "0",
        FAKE_SERVER_HANG_HEALTH: "1",
        OPENAI_API_KEY: "sk-test",
        SUPERMEMORY_LOG_PATH: join(tempDir, "supermemory.log"),
        SUPERMEMORY_PORT: "7892",
        SUPERMEMORY_STARTUP_TIMEOUT_MS: "350",
      },
      homeDir,
      serverPath,
      hash,
    });

    expect(result.status).toBe(1);
    expect(Date.now() - startedAt).toBeLessThan(2500);
  });

  it("rejects a non-loopback health URL before starting a server", () => {
    const tempDir = createTempDir();
    const homeDir = join(tempDir, "home");
    mkdirSync(homeDir);
    const { serverPath, hash } = createFakeServer(tempDir);

    const result = runStartScript({
      env: {
        FAKE_SERVER_ENV_OUT: join(tempDir, "server-env.json"),
        OPENAI_API_KEY: "sk-test",
        SUPERMEMORY_HEALTH_URL: "https://example.com/",
      },
      homeDir,
      serverPath,
      hash,
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("must be a loopback HTTP endpoint");
  });

  it("allows a cold native boot longer than five seconds by default", () => {
    const tempDir = createTempDir();
    const homeDir = join(tempDir, "home");
    const envOut = join(tempDir, "server-env.json");
    mkdirSync(homeDir);
    const { serverPath, hash } = createFakeServer(tempDir);

    const result = runStartScript({
      env: {
        FAKE_SERVER_ENV_OUT: envOut,
        FAKE_SERVER_EXIT_AFTER_MS: "3000",
        FAKE_SERVER_LISTEN_DELAY_MS: "5200",
        OPENAI_API_KEY: "sk-test",
        SUPERMEMORY_LOG_PATH: join(tempDir, "supermemory.log"),
        SUPERMEMORY_PORT: "7884",
      },
      homeDir,
      serverPath,
      hash,
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("on port 7884");
  });

  it("documents the attested ensure command instead of a raw HTTP-only probe", () => {
    const protocol = readFileSync(".ai/00_system/AGENT_FRAMEWORK_PROTOCOL.md", "utf8");

    expect(protocol).toContain("bounded loopback identity");
    expect(protocol).toContain("listener-process attestation");
    expect(protocol).not.toContain('curl -fsS "$SUPERMEMORY_HEALTH_URL"');
  });

  it("configures a pinned binary and persistent shell exports idempotently", () => {
    const tempDir = createTempDir();
    const homeDir = join(tempDir, "home");
    mkdirSync(homeDir);
    const { checksumsPath, hash, serverPath } = createInstalledServer(homeDir);
    const env = {
      ...process.env,
      HOME: homeDir,
      SUPERMEMORY_CHECKSUMS_FILE: checksumsPath,
      SUPERMEMORY_CONFIGURE_SKIP_LAUNCH_AGENT: "1",
    };

    const first = spawnSync(process.execPath, [configureScriptPath], {
      cwd: process.cwd(),
      encoding: "utf8",
      env,
    });
    const second = spawnSync(process.execPath, [configureScriptPath], {
      cwd: process.cwd(),
      encoding: "utf8",
      env,
    });

    expect(first.status).toBe(0);
    expect(second.status).toBe(0);
    const configPath = join(homeDir, ".supermemory", "archestimator-server.env");
    expect(readFileSync(configPath, "utf8")).toContain(`SUPERMEMORY_SERVER_BIN='${realpathSync(serverPath)}'`);
    expect(readFileSync(configPath, "utf8")).toContain(`SUPERMEMORY_SERVER_SHA256='${hash}'`);
    expect(statSync(configPath).mode & 0o777).toBe(0o600);
    const zshenv = readFileSync(join(homeDir, ".zshenv"), "utf8");
    expect(zshenv.match(/>>> archestimator-supermemory >>>/g)).toHaveLength(1);
    expect(zshenv).toContain(".supermemory/archestimator-server.env");
  });

  it("does not force-kill an in-flight LaunchAgent ensure during configuration", () => {
    const configureScript = readFileSync(configureScriptPath, "utf8");

    expect(configureScript).toContain('["kickstart", `${domain}/${LAUNCH_AGENT_LABEL}`]');
    expect(configureScript).not.toContain('["kickstart", "-k"');
  });

  it("rejects an installed binary that does not match the pinned checksum", () => {
    const tempDir = createTempDir();
    const homeDir = join(tempDir, "home");
    mkdirSync(homeDir);
    const { checksumsPath, serverPath } = createInstalledServer(homeDir);
    writeFileSync(serverPath, "#!/bin/sh\nexit 0\n");
    chmodSync(serverPath, 0o755);

    const result = spawnSync(process.execPath, [configureScriptPath], {
      cwd: process.cwd(),
      encoding: "utf8",
      env: {
        ...process.env,
        HOME: homeDir,
        SUPERMEMORY_CHECKSUMS_FILE: checksumsPath,
        SUPERMEMORY_CONFIGURE_SKIP_LAUNCH_AGENT: "1",
      },
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("checksum mismatch");
  });

  it("ensures a clean-shell session is configured and healthy", () => {
    const tempDir = createTempDir();
    const homeDir = join(tempDir, "home");
    const envOut = join(tempDir, "server-env.json");
    mkdirSync(homeDir);
    const { checksumsPath } = createInstalledServer(homeDir);
    writeFileSync(join(homeDir, ".supermemory", "env"), "OPENAI_API_KEY=stored-provider-key\n");

    const result = spawnSync(process.execPath, [ensureScriptPath], {
      cwd: process.cwd(),
      encoding: "utf8",
      env: {
        ...process.env,
        FAKE_SERVER_ENV_OUT: envOut,
        FAKE_SERVER_EXIT_AFTER_MS: "1000",
        HOME: homeDir,
        OPENAI_API_KEY: "",
        SUPERMEMORY_CHECKSUMS_FILE: checksumsPath,
        SUPERMEMORY_CONFIGURE_SKIP_LAUNCH_AGENT: "1",
        SUPERMEMORY_HEALTH_URL: "http://localhost:7883/",
        SUPERMEMORY_LOG_PATH: join(tempDir, "supermemory.log"),
        SUPERMEMORY_PORT: "7883",
        SUPERMEMORY_STARTUP_TIMEOUT_MS: "2000",
      },
    });

    const startupLogPath = join(tempDir, "supermemory.log");
    const startupLog = existsSync(startupLogPath) ? readFileSync(startupLogPath, "utf8") : "";
    expect(result.status, `${result.stderr}\n${startupLog}`).toBe(0);
    expect(result.stdout).toContain("supermemory:ensure: ready");
    expect(readJsonWhenWritten(envOut)).toEqual({ PORT: "7883", SUPERMEMORY_PORT: "7883" });
  });

  it("serializes concurrent ensure calls into one native server start", async () => {
    const tempDir = createTempDir();
    const homeDir = join(tempDir, "home");
    const envOut = join(tempDir, "server-env.json");
    const startsOut = join(tempDir, "starts.txt");
    mkdirSync(homeDir);
    const { checksumsPath } = createInstalledServer(homeDir);
    writeFileSync(join(homeDir, ".supermemory", "env"), "OPENAI_API_KEY=stored-provider-key\n");
    const env = {
      ...process.env,
      FAKE_SERVER_ENV_OUT: envOut,
      FAKE_SERVER_EXIT_AFTER_MS: "1000",
      FAKE_SERVER_LISTEN_DELAY_MS: "500",
      FAKE_SERVER_START_COUNT_OUT: startsOut,
      HOME: homeDir,
      OPENAI_API_KEY: "",
      SUPERMEMORY_CHECKSUMS_FILE: checksumsPath,
      SUPERMEMORY_CONFIGURE_SKIP_LAUNCH_AGENT: "1",
      SUPERMEMORY_HEALTH_URL: "http://localhost:7885/",
      SUPERMEMORY_LOG_PATH: join(tempDir, "supermemory.log"),
      SUPERMEMORY_PORT: "7885",
      SUPERMEMORY_STARTUP_TIMEOUT_MS: "3000",
    };
    delete env.SUPERMEMORY_SERVER_BIN;
    delete env.SUPERMEMORY_SERVER_SHA256;

    const results = await Promise.all([
      runScriptAsync(ensureScriptPath, env),
      runScriptAsync(ensureScriptPath, env),
    ]);

    expect(results.map((result) => result.status)).toEqual([0, 0]);
    expect(readFileSync(startsOut, "utf8").trim().split("\n")).toHaveLength(1);
  });

  it("never displaces a live ensure lock even when its timestamp is old", () => {
    const tempDir = createTempDir();
    const homeDir = join(tempDir, "home");
    const lockDir = join(homeDir, ".supermemory", "ensure.lock");
    const ownerPath = join(lockDir, "owner.json");
    mkdirSync(lockDir, { recursive: true });
    writeFileSync(ownerPath, JSON.stringify({ pid: process.pid, token: "live-owner" }), { mode: 0o600 });
    const old = new Date(Date.now() - 120_000);
    utimesSync(lockDir, old, old);

    const result = spawnSync(process.execPath, [ensureScriptPath], {
      cwd: process.cwd(),
      encoding: "utf8",
      env: {
        ...process.env,
        HOME: homeDir,
        SUPERMEMORY_ENSURE_LOCK_TIMEOUT_MS: "250",
        SUPERMEMORY_HEALTH_URL: "http://localhost:7893/",
        SUPERMEMORY_PORT: "7893",
      },
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("timed out waiting for the single-flight lock");
    expect(JSON.parse(readFileSync(ownerPath, "utf8"))).toEqual({ pid: process.pid, token: "live-owner" });
  });

  it("requires the ensure command across every active agent entry surface", () => {
    const surfaces = [
      "AGENTS.md",
      "CODEX.md",
      "CLAUDE.md",
      "GEMINI.md",
      ".codex/README.md",
      ".claude/README.md",
      ".agents/README.md",
      ".commandcode/README.md",
      ".cursor/rules/00-archestimator-project-brain.mdc",
      ".ai/00_system/AGENT_FRAMEWORK_PROTOCOL.md",
      ".ai/12_agents/README.md",
      ".ai/12_agents/payloads/README.md",
      ...[
        "_template",
        "antigravity",
        "claude",
        "codex",
        "commandcode",
        "deepseek",
        "gemini",
        "hermes",
        "kimi",
        "ollama",
        "opencode",
      ].map((name) => `.ai/12_agents/payloads/${name}.md`),
    ];

    for (const surface of surfaces) {
      expect(hasRequiredSupermemoryBootstrap(readFileSync(surface, "utf8")), surface).toBe(true);
    }
  });

  it("rejects missing or explicitly negated bootstrap guidance", () => {
    expect(hasRequiredSupermemoryBootstrap("Run bun run supermemory:ensure before work.")).toBe(false);
    expect(
      hasRequiredSupermemoryBootstrap(
        `${SUPERMEMORY_BOOTSTRAP_MARKER}\nDo not run bun run supermemory:ensure before work.`,
      ),
    ).toBe(false);
    expect(
      hasRequiredSupermemoryBootstrap(
        `${SUPERMEMORY_BOOTSTRAP_MARKER}\nRun bun run supermemory:ensure before work.`,
      ),
    ).toBe(true);
  });
});
