import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";

import { afterEach, describe, expect, it } from "vitest";

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
const { createServer } = require("node:http");
writeFileSync(process.env.FAKE_SERVER_ENV_OUT, JSON.stringify({
  PORT: process.env.PORT,
  SUPERMEMORY_PORT: process.env.SUPERMEMORY_PORT,
  ...(process.env.FAKE_SERVER_CAPTURE_PROVIDER === "1"
    ? { OPENAI_API_KEY_SET: Boolean(process.env.OPENAI_API_KEY) }
    : {}),
}));
if (process.env.FAKE_SERVER_EXIT_IMMEDIATELY === "1") process.exit(42);
const server = createServer((_request, response) => {
  response.statusCode = 200;
  response.end("ok");
});
server.listen(Number(process.env.PORT), () => {
  const exitAfterMs = Number.parseInt(process.env.FAKE_SERVER_EXIT_AFTER_MS || "250", 10);
  if (exitAfterMs > 0) {
    setTimeout(() => server.close(() => process.exit(0)), exitAfterMs);
  }
});
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
    "FAKE_SERVER_CAPTURE_PROVIDER",
    "FAKE_SERVER_ENV_OUT",
    "GEMINI_API_KEY",
    "GOOGLE_VERTEX_LOCATION",
    "GOOGLE_VERTEX_PROJECT_ID",
    "GROQ_API_KEY",
    "OPENAI_API_KEY",
    "PORT",
    "SUPERMEMORY_HEALTH_URL",
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
        FAKE_SERVER_EXIT_AFTER_MS: "250",
        OPENAI_API_KEY: "sk-test",
        PORT: "3000",
        SUPERMEMORY_LOG_PATH: join(tempDir, "supermemory.log"),
        SUPERMEMORY_STARTUP_TIMEOUT_MS: "2000",
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
        FAKE_SERVER_EXIT_AFTER_MS: "250",
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

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("on port 7878");
    expect(result.stdout).toContain("health http://localhost:7878/");
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
        FAKE_SERVER_EXIT_AFTER_MS: "250",
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
      FAKE_SERVER_EXIT_AFTER_MS: "250",
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
        FAKE_SERVER_EXIT_AFTER_MS: "250",
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

  it("documents the parameterized health check URL", () => {
    const protocol = readFileSync(".ai/00_system/AGENT_FRAMEWORK_PROTOCOL.md", "utf8");

    expect(protocol).toContain('SUPERMEMORY_HEALTH_URL="${SUPERMEMORY_HEALTH_URL:-http://localhost:${SUPERMEMORY_PORT:-6767}/}"');
    expect(protocol).toContain('curl -fsS "$SUPERMEMORY_HEALTH_URL" >/dev/null');
    expect(protocol).not.toContain("wait for the `http://localhost:6767/` check");
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
    expect(readFileSync(configPath, "utf8")).toContain(`SUPERMEMORY_SERVER_BIN='${serverPath}'`);
    expect(readFileSync(configPath, "utf8")).toContain(`SUPERMEMORY_SERVER_SHA256='${hash}'`);
    expect(statSync(configPath).mode & 0o777).toBe(0o600);
    const zshenv = readFileSync(join(homeDir, ".zshenv"), "utf8");
    expect(zshenv.match(/>>> archestimator-supermemory >>>/g)).toHaveLength(1);
    expect(zshenv).toContain(".supermemory/archestimator-server.env");
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
        FAKE_SERVER_EXIT_AFTER_MS: "250",
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

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("supermemory:ensure: ready");
    expect(readJsonWhenWritten(envOut)).toEqual({ PORT: "7883", SUPERMEMORY_PORT: "7883" });
  });

  it("requires the ensure command across every active agent entry surface", () => {
    const surfaces = [
      "AGENTS.md",
      "CODEX.md",
      "CLAUDE.md",
      ".codex/README.md",
      ".claude/README.md",
      ".agents/README.md",
      ".commandcode/README.md",
      ".ai/00_system/AGENT_FRAMEWORK_PROTOCOL.md",
      ".ai/12_agents/README.md",
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
      expect(readFileSync(surface, "utf8"), surface).toContain("bun run supermemory:ensure");
    }
  });
});
