import { createHash } from "node:crypto";
import {
  chmodSync,
  createReadStream,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

export const SERVER_CONFIG_NAME = "archestimator-server.env";
export const PROVIDER_CONFIG_NAME = "env";
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

export function supermemoryHome(home = homedir()) {
  return join(home, ".supermemory");
}

export function serverConfigPath(home = homedir()) {
  return join(supermemoryHome(home), SERVER_CONFIG_NAME);
}

export function providerConfigPath(home = homedir()) {
  return join(supermemoryHome(home), PROVIDER_CONFIG_NAME);
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
