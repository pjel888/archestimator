#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import {
  accessSync,
  chmodSync,
  constants,
  existsSync,
  readFileSync,
  realpathSync,
  statSync,
} from "node:fs";
import { homedir, platform, arch, userInfo } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  serverConfigPath,
  sha256,
  supermemoryHome,
  writeFileAtomic,
} from "./lib/supermemory-config.mjs";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(SCRIPT_DIR, "..");
const MANAGED_START = "# >>> archestimator-supermemory >>>";
const MANAGED_END = "# <<< archestimator-supermemory <<<";
const LAUNCH_AGENT_LABEL = "com.archestimator.supermemory";
const installLaunchAgent = process.argv.includes("--install-launch-agent");
const quiet = process.argv.includes("--quiet");

function fail(message) {
  process.stderr.write(`supermemory:configure: ${message}\n`);
  process.exit(1);
}

function log(message) {
  if (!quiet) process.stdout.write(`supermemory:configure: ${message}\n`);
}

function shellQuote(value) {
  return `'${value.replaceAll("'", "'\\''")}'`;
}

function xmlEscape(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function updateZshenv(home, configPath) {
  const zshenvPath = join(home, ".zshenv");
  const existing = existsSync(zshenvPath) ? readFileSync(zshenvPath, "utf8") : "";
  const managedBlock = [
    MANAGED_START,
    "# Managed by Archestimator's verified Supermemory configurator.",
    `[ -r ${shellQuote(configPath)} ] && . ${shellQuote(configPath)}`,
    MANAGED_END,
  ].join("\n");
  const managedPattern = new RegExp(
    `${MANAGED_START.replace(/[.*+?^$\{\}()|[\]\\]/g, "\\$&")}[\\s\\S]*?${MANAGED_END.replace(/[.*+?^$\{\}()|[\]\\]/g, "\\$&")}`,
  );
  const next = managedPattern.test(existing)
    ? existing.replace(managedPattern, managedBlock)
    : `${existing.trimEnd()}${existing.trim() ? "\n\n" : ""}${managedBlock}\n`;
  const mode = existsSync(zshenvPath) ? statSync(zshenvPath).mode & 0o777 : 0o600;
  writeFileAtomic(zshenvPath, next, mode);
}

function findBun(home) {
  const candidates = [
    process.env.SUPERMEMORY_LAUNCH_AGENT_RUNTIME,
    "/opt/homebrew/bin/bun",
    "/usr/local/bin/bun",
    join(home, ".bun", "bin", "bun"),
  ].filter(Boolean);
  for (const candidate of candidates) {
    try {
      accessSync(candidate, constants.X_OK);
      return candidate;
    } catch {
      // Try the next stable runtime location.
    }
  }
  fail("cannot install the launch agent because no executable Bun runtime was found.");
}

function installMacLaunchAgent(home) {
  if (process.env.SUPERMEMORY_CONFIGURE_SKIP_LAUNCH_AGENT === "1") return;
  if (platform() !== "darwin") {
    log("launch-agent installation skipped on non-macOS; agent entrypoints still run supermemory:ensure.");
    return;
  }

  const bunPath = findBun(home);
  const launchAgentDir = join(home, "Library", "LaunchAgents");
  const launchAgentPath = join(launchAgentDir, `${LAUNCH_AGENT_LABEL}.plist`);
  const ensurePath = join(REPO_ROOT, "scripts", "ensure-supermemory-server.mjs");
  const logPath = join(supermemoryHome(home), "ensure.log");
  if (!existsSync(logPath)) writeFileAtomic(logPath, "", 0o600);
  chmodSync(logPath, 0o600);
  const plist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${LAUNCH_AGENT_LABEL}</string>
  <key>ProgramArguments</key>
  <array>
    <string>${xmlEscape(bunPath)}</string>
    <string>${xmlEscape(ensurePath)}</string>
    <string>--service</string>
  </array>
  <key>WorkingDirectory</key>
  <string>${xmlEscape(REPO_ROOT)}</string>
  <key>RunAtLoad</key>
  <true/>
  <key>StartInterval</key>
  <integer>60</integer>
  <key>StandardOutPath</key>
  <string>${logPath}</string>
  <key>StandardErrorPath</key>
  <string>${logPath}</string>
</dict>
</plist>
`;
  writeFileAtomic(launchAgentPath, plist, 0o644);
  chmodSync(launchAgentPath, 0o644);

  const domain = `gui/${userInfo().uid}`;
  const launchctlPath = join("/bin", "launchctl");
  spawnSync(launchctlPath, ["bootout", `${domain}/${LAUNCH_AGENT_LABEL}`], {
    stdio: "ignore",
  });
  const bootstrap = spawnSync(launchctlPath, ["bootstrap", domain, launchAgentPath], {
    encoding: "utf8",
  });
  if (bootstrap.status !== 0) {
    fail(`launchctl bootstrap failed: ${bootstrap.stderr.trim() || "unknown error"}`);
  }
  const kickstart = spawnSync(
    launchctlPath,
    ["kickstart", `${domain}/${LAUNCH_AGENT_LABEL}`],
    { encoding: "utf8" },
  );
  if (kickstart.status !== 0) {
    fail(`launchctl kickstart failed: ${kickstart.stderr.trim() || "unknown error"}`);
  }
  log(`installed and loaded ${launchAgentPath}`);
}

const home = homedir();
const defaultBinaryName = platform() === "win32" ? "supermemory-server.exe" : "supermemory-server";
const installedBinary = resolve(
  process.env.SUPERMEMORY_INSTALL_BIN || join(supermemoryHome(home), "bin", defaultBinaryName),
);
const versionPath = `${installedBinary}.version`;
const checksumsPath = resolve(
  process.env.SUPERMEMORY_CHECKSUMS_FILE || join(SCRIPT_DIR, "supermemory-server-checksums.json"),
);

try {
  accessSync(installedBinary, platform() === "win32" ? constants.F_OK : constants.X_OK);
} catch {
  fail(`missing executable ${installedBinary}; install the pinned supermemory-server first.`);
}
if (!existsSync(versionPath)) fail(`missing version file ${versionPath}.`);
if (!existsSync(checksumsPath)) fail(`missing pinned checksum registry ${checksumsPath}.`);

const serverBin = realpathSync(installedBinary);
const version = readFileSync(versionPath, "utf8").trim();
const platformKey = `${platform()}-${arch()}`;
let registry;
try {
  registry = JSON.parse(readFileSync(checksumsPath, "utf8"));
} catch (error) {
  fail(`cannot parse checksum registry: ${error.message}`);
}
const expectedHash = registry?.versions?.[version]?.[platformKey];
if (!/^[a-f0-9]{64}$/.test(expectedHash || "")) {
  fail(`no pinned checksum for supermemory-server ${version} on ${platformKey}.`);
}
const actualHash = await sha256(serverBin);
if (actualHash !== expectedHash) {
  fail(`checksum mismatch for ${serverBin}: expected ${expectedHash}, got ${actualHash}.`);
}

const configPath = serverConfigPath(home);
const config = [
  "# Generated by Archestimator. Contains no provider secret.",
  `export SUPERMEMORY_SERVER_BIN=${shellQuote(serverBin)}`,
  `export SUPERMEMORY_SERVER_SHA256=${shellQuote(expectedHash)}`,
  "",
].join("\n");
writeFileAtomic(configPath, config, 0o600);
if (platform() !== "win32") updateZshenv(home, configPath);
log(`verified supermemory-server ${version} for ${platformKey}; wrote ${configPath}`);

if (installLaunchAgent) installMacLaunchAgent(home);
