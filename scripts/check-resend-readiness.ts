#!/usr/bin/env bun

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const RESEND_ENV_NAMES = [
  "RESEND_API_KEY",
  "RESEND_FROM",
  "RESEND_REPLY_TO",
  "RESEND_WEBHOOK_SECRET",
] as const;

type EnvPresenceResult = {
  source: string;
  required: string[];
  present: string[];
  missing: string[];
  ready: boolean;
};

export type ResendReadinessResult = {
  generatedAt: string;
  mode: "resend-readiness";
  localRuntimeEnv: EnvPresenceResult;
  vercelEnv: EnvPresenceResult & {
    checked: boolean;
    discoveredNames: string[];
  };
  resendReady: boolean;
  note: string;
};

function readEnv(name: string) {
  const value = process.env[name];
  return value?.trim() || undefined;
}

export function extractVercelEnvNames(input: string) {
  return Array.from(new Set(input.match(/\b[A-Z][A-Z0-9]+(?:_[A-Z0-9]+)+\b/g) ?? [])).sort();
}

export function parseDotenvPresence(input: string) {
  const present = new Set<string>();

  for (const line of input.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^([A-Z][A-Z0-9_]+)\s*=\s*(.*)$/);
    if (!match) continue;

    const [, name, rawValue] = match;
    const value = rawValue.trim().replace(/^['"]|['"]$/g, "");
    if (value) present.add(name);
  }

  return present;
}

function evaluatePresence(source: string, presentNames: Iterable<string>): EnvPresenceResult {
  const presentSet = new Set(presentNames);
  const present = RESEND_ENV_NAMES.filter((name) => presentSet.has(name));
  const missing = RESEND_ENV_NAMES.filter((name) => !presentSet.has(name));

  return {
    source,
    required: [...RESEND_ENV_NAMES],
    present,
    missing,
    ready: missing.length === 0,
  };
}

export function readLocalRuntimeEnvPresence({
  env = process.env,
  envFile = ".env.local",
}: {
  env?: NodeJS.ProcessEnv;
  envFile?: string;
} = {}) {
  const present = new Set<string>();

  for (const name of RESEND_ENV_NAMES) {
    if (env[name]?.trim()) present.add(name);
  }

  if (envFile && existsSync(envFile)) {
    for (const name of parseDotenvPresence(readFileSync(envFile, "utf8"))) {
      present.add(name);
    }
  }

  return evaluatePresence(envFile ? `process.env + ${envFile}` : "process.env", present);
}

export function checkResendReadiness({
  localRuntimeEnv,
  vercelEnvText,
  vercelEnvSource = "not-provided",
}: {
  localRuntimeEnv?: EnvPresenceResult;
  vercelEnvText?: string;
  vercelEnvSource?: string;
} = {}): ResendReadinessResult {
  const resolvedLocalRuntimeEnv = localRuntimeEnv ?? readLocalRuntimeEnvPresence();
  const discoveredNames = vercelEnvText ? extractVercelEnvNames(vercelEnvText) : [];
  const vercelEnv = {
    ...evaluatePresence(vercelEnvSource, discoveredNames),
    checked: Boolean(vercelEnvText),
    discoveredNames,
  };
  const resendReady = resolvedLocalRuntimeEnv.ready && vercelEnv.checked && vercelEnv.ready;

  return {
    generatedAt: new Date().toISOString(),
    mode: "resend-readiness",
    localRuntimeEnv: resolvedLocalRuntimeEnv,
    vercelEnv,
    resendReady,
    note: "Resend readiness checks required variable presence only. It never writes secret values and does not prove sender/domain verification, DNS, webhook registration, delivery, bounce, complaint, or open events.",
  };
}

function readVercelEnvInput() {
  const inputFile = readEnv("VERCEL_ENV_LIST_FILE");
  const inputText = readEnv("VERCEL_ENV_LIST_TEXT");

  if (inputFile) {
    return {
      source: inputFile,
      text: readFileSync(inputFile, "utf8"),
    };
  }

  if (inputText) {
    return {
      source: "VERCEL_ENV_LIST_TEXT",
      text: inputText,
    };
  }

  return {
    source: "not-provided",
    text: undefined,
  };
}

function writeOutput(outputFile: string, result: ResendReadinessResult) {
  const resolved = resolve(outputFile);
  mkdirSync(dirname(resolved), { recursive: true });
  writeFileSync(resolved, `${JSON.stringify(result, null, 2)}\n`);
}

async function main() {
  const envFile = readEnv("RESEND_ENV_FILE") ?? ".env.local";
  const vercelInput = readVercelEnvInput();
  const result = checkResendReadiness({
    localRuntimeEnv: readLocalRuntimeEnvPresence({ envFile }),
    vercelEnvText: vercelInput.text,
    vercelEnvSource: vercelInput.source,
  });
  const outputFile = readEnv("OUTPUT_FILE");
  if (outputFile) writeOutput(outputFile, result);
  console.log(JSON.stringify(result, null, 2));
  if (!result.resendReady) process.exitCode = 1;
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
