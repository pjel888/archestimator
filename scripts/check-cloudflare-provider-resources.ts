#!/usr/bin/env bun

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

type WranglerAuthEvidence = {
  generatedAt?: string;
  readiness?: {
    wranglerApiAuthenticated?: boolean | null;
    providerReadbackReady?: boolean | null;
  };
};

type WorkerReadinessEvidence = {
  providerSecretList?: {
    deployedWorkerSecrets?: {
      required?: string[];
    };
  };
};

type WranglerConfig = {
  name?: string;
  d1_databases?: Array<{
    database_name?: string;
  }>;
  r2_buckets?: Array<{
    bucket_name?: string;
    preview_bucket_name?: string;
  }>;
  queues?: {
    producers?: Array<{
      queue?: string;
    }>;
    consumers?: Array<{
      queue?: string;
      dead_letter_queue?: string;
    }>;
  };
};

type CommandKey = "deployments" | "d1" | "r2" | "queues" | "secrets";

type CommandSpec = {
  key: CommandKey;
  label: string;
  args: string[];
  expectedNames: string[];
  minRecordCount?: number;
};

export type ProviderResourceCommandResult = {
  key: CommandKey;
  label: string;
  args: string[];
  readOnly: true;
  skipped: boolean;
  skipReason: string | null;
  exitCode: number | null;
  signal: string | null;
  timedOut: boolean;
  stdoutBytes: number;
  stderrBytes: number;
  parsedJson: boolean;
  parsedRecordCount: number | null;
  minRecordCount: number | null;
  recordCountReady: boolean | null;
  expectedNames: string[];
  foundExpectedNames: string[];
  missingExpectedNames: string[];
  ready: boolean;
};

export type CloudflareProviderResourceReadbackReport = {
  generatedAt: string;
  mode: "cloudflare-provider-resource-readback";
  sources: {
    wranglerConfig: string | null;
    wranglerAuth: string | null;
    workerReadiness: string | null;
  };
  expected: {
    workerName: string | null;
    d1Databases: string[];
    r2Buckets: string[];
    queues: string[];
    workerSecretNames: string[];
  };
  readiness: {
    wranglerAuthenticated: boolean;
    providerReadbackAttempted: boolean;
    workerDeploymentReadbackReady: boolean;
    d1DatabaseReadbackReady: boolean;
    r2BucketReadbackReady: boolean;
    queuesReadbackReady: boolean;
    workerSecretNameReadbackReady: boolean;
    providerResourceReadbackReady: boolean;
    productionCutoverReady: boolean;
  };
  commands: ProviderResourceCommandResult[];
  blockers: string[];
  note: string;
};

const PLAN_ROOT = ".ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence";
const DEFAULT_WRANGLER_CONFIG_FILE = "wrangler.jsonc";
const DEFAULT_WRANGLER_AUTH_FILE = `${PLAN_ROOT}/2026-06-30-cloudflare-wrangler-auth.json`;
const DEFAULT_WORKER_READINESS_FILE = `${PLAN_ROOT}/2026-06-30-cloudflare-worker-readiness.json`;
const DEFAULT_OUTPUT_FILE = `${PLAN_ROOT}/2026-06-30-cloudflare-provider-resource-readback.json`;
const DEFAULT_MARKDOWN_FILE = `${PLAN_ROOT}/2026-06-30-cloudflare-provider-resource-readback.md`;

const NOTE =
  "Read-only Wrangler provider resource readback. When Wrangler is authenticated, this runs list/status-style commands for Workers deployments, D1, R2, Queues, and Worker secret names. It does not print raw command output, secret values, tokens, or env files; does not create, deploy, update, delete, purge, purchase, change DNS, or make Vercel/Supabase/Resend removable.";

function readEnv(name: string) {
  const value = process.env[name];
  return value?.trim() || undefined;
}

function unique(values: Array<string | null | undefined>) {
  return [...new Set(values.filter((value): value is string => Boolean(value?.trim())).map((value) => value.trim()))].sort();
}

function stripJsonComments(input: string) {
  let output = "";
  let inString = false;
  let escaped = false;

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    const next = input[index + 1];

    if (inString) {
      output += char;
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === "\"") {
        inString = false;
      }
      continue;
    }

    if (char === "\"") {
      inString = true;
      output += char;
      continue;
    }

    if (char === "/" && next === "/") {
      while (index < input.length && input[index] !== "\n") index += 1;
      output += "\n";
      continue;
    }

    if (char === "/" && next === "*") {
      index += 2;
      while (index < input.length && !(input[index] === "*" && input[index + 1] === "/")) index += 1;
      index += 1;
      continue;
    }

    output += char;
  }

  return output;
}

function parseJsonc<T>(input: string): T {
  return JSON.parse(stripJsonComments(input)) as T;
}

function readJsonIfExists<T>(path: string | undefined): { source: string | null; value: T | null } {
  if (!path || !existsSync(path)) return { source: path ?? null, value: null };
  return { source: path, value: JSON.parse(readFileSync(path, "utf8")) as T };
}

function collectStrings(value: unknown, out: string[] = []) {
  if (typeof value === "string") {
    out.push(value);
    return out;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectStrings(item, out);
    return out;
  }
  if (value && typeof value === "object") {
    for (const item of Object.values(value)) collectStrings(item, out);
  }
  return out;
}

function parseJsonRecords(text: string): { parsedJson: boolean; recordCount: number | null; strings: string[] } {
  const trimmed = text.trim();
  if (!trimmed) return { parsedJson: false, recordCount: null, strings: [] };
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    return {
      parsedJson: true,
      recordCount: Array.isArray(parsed) ? parsed.length : parsed && typeof parsed === "object" ? 1 : null,
      strings: collectStrings(parsed),
    };
  } catch {
    return { parsedJson: false, recordCount: null, strings: trimmed.split(/\r?\n/) };
  }
}

function matchedExpectedNames(outputStrings: string[], expectedNames: string[]) {
  const haystack = outputStrings.join("\n").toLowerCase();
  return expectedNames.filter((name) => haystack.includes(name.toLowerCase()));
}

function skippedCommand(spec: CommandSpec, reason: string): ProviderResourceCommandResult {
  return {
    key: spec.key,
    label: spec.label,
    args: spec.args,
    readOnly: true,
    skipped: true,
    skipReason: reason,
    exitCode: null,
    signal: null,
    timedOut: false,
    stdoutBytes: 0,
    stderrBytes: 0,
    parsedJson: false,
    parsedRecordCount: null,
    minRecordCount: spec.minRecordCount ?? null,
    recordCountReady: spec.minRecordCount === undefined ? null : false,
    expectedNames: spec.expectedNames,
    foundExpectedNames: [],
    missingExpectedNames: spec.expectedNames,
    ready: false,
  };
}

function runReadOnlyWranglerCommand(spec: CommandSpec): ProviderResourceCommandResult {
  const result = spawnSync("bunx", ["wrangler", ...spec.args], {
    encoding: "utf8",
    timeout: 30_000,
    maxBuffer: 1024 * 1024,
  });
  const stdout = result.stdout ?? "";
  const stderr = result.stderr ?? "";
  const parsed = parseJsonRecords(stdout);
  const foundExpectedNames = matchedExpectedNames([...parsed.strings, stderr], spec.expectedNames);
  const missingExpectedNames = spec.expectedNames.filter((name) => !foundExpectedNames.includes(name));
  const recordCountReady = spec.minRecordCount === undefined
    ? null
    : parsed.recordCount !== null && parsed.recordCount >= spec.minRecordCount;
  return {
    key: spec.key,
    label: spec.label,
    args: spec.args,
    readOnly: true,
    skipped: false,
    skipReason: null,
    exitCode: result.status,
    signal: result.signal,
    timedOut: result.error?.message.includes("ETIMEDOUT") ?? false,
    stdoutBytes: Buffer.byteLength(stdout),
    stderrBytes: Buffer.byteLength(stderr),
    parsedJson: parsed.parsedJson,
    parsedRecordCount: parsed.recordCount,
    minRecordCount: spec.minRecordCount ?? null,
    recordCountReady,
    expectedNames: spec.expectedNames,
    foundExpectedNames,
    missingExpectedNames,
    ready: result.status === 0 && !result.error && missingExpectedNames.length === 0 && recordCountReady !== false,
  };
}

function buildExpected(config: WranglerConfig, workerReadiness: WorkerReadinessEvidence | null) {
  const workerName = config.name ?? null;
  const d1Databases = unique((config.d1_databases ?? []).map((database) => database.database_name));
  const r2Buckets = unique((config.r2_buckets ?? []).flatMap((bucket) => [bucket.bucket_name, bucket.preview_bucket_name]));
  const queues = unique([
    ...(config.queues?.producers ?? []).map((queue) => queue.queue),
    ...(config.queues?.consumers ?? []).flatMap((queue) => [queue.queue, queue.dead_letter_queue]),
  ]);
  const workerSecretNames = unique(workerReadiness?.providerSecretList?.deployedWorkerSecrets?.required ?? []);
  return {
    workerName,
    d1Databases,
    r2Buckets,
    queues,
    workerSecretNames,
  };
}

function buildCommandSpecs(expected: ReturnType<typeof buildExpected>): CommandSpec[] {
  return [
    {
      key: "deployments",
      label: "Worker deployments list",
      args: expected.workerName
        ? ["deployments", "list", "--name", expected.workerName, "--json"]
        : ["deployments", "list", "--json"],
      expectedNames: [],
      minRecordCount: 1,
    },
    {
      key: "d1",
      label: "D1 database list",
      args: ["d1", "list", "--json"],
      expectedNames: expected.d1Databases,
    },
    {
      key: "r2",
      label: "R2 bucket list",
      args: ["r2", "bucket", "list"],
      expectedNames: expected.r2Buckets,
    },
    {
      key: "queues",
      label: "Queues list",
      args: ["queues", "list"],
      expectedNames: expected.queues,
    },
    {
      key: "secrets",
      label: "Worker secret name list",
      args: expected.workerName
        ? ["secret", "list", "--name", expected.workerName, "--format", "json"]
        : ["secret", "list", "--format", "json"],
      expectedNames: expected.workerSecretNames,
    },
  ];
}

export function buildCloudflareProviderResourceReadbackReport(input: {
  wranglerConfigText: string;
  wranglerConfigSource?: string | null;
  wranglerAuth?: WranglerAuthEvidence | null;
  wranglerAuthSource?: string | null;
  workerReadiness?: WorkerReadinessEvidence | null;
  workerReadinessSource?: string | null;
  commandRunner?: (spec: CommandSpec) => ProviderResourceCommandResult;
  generatedAt?: string;
}): CloudflareProviderResourceReadbackReport {
  const config = parseJsonc<WranglerConfig>(input.wranglerConfigText);
  const expected = buildExpected(config, input.workerReadiness ?? null);
  const commandSpecs = buildCommandSpecs(expected);
  const wranglerAuthenticated = input.wranglerAuth?.readiness?.wranglerApiAuthenticated === true
    && input.wranglerAuth.readiness.providerReadbackReady === true;
  const commandRunner = input.commandRunner ?? runReadOnlyWranglerCommand;
  const commands = wranglerAuthenticated
    ? commandSpecs.map(commandRunner)
    : commandSpecs.map((spec) => skippedCommand(spec, "Wrangler/API authentication is not proven."));
  const commandReady = (key: CommandKey) => commands.find((command) => command.key === key)?.ready === true;
  const workerDeploymentReadbackReady = commandReady("deployments");
  const d1DatabaseReadbackReady = commandReady("d1");
  const r2BucketReadbackReady = commandReady("r2");
  const queuesReadbackReady = commandReady("queues");
  const workerSecretNameReadbackReady = commandReady("secrets");
  const providerReadbackAttempted = wranglerAuthenticated && commands.some((command) => !command.skipped);
  const providerResourceReadbackReady = providerReadbackAttempted
    && workerDeploymentReadbackReady
    && d1DatabaseReadbackReady
    && r2BucketReadbackReady
    && queuesReadbackReady
    && workerSecretNameReadbackReady;
  const blockers: string[] = [];

  if (!wranglerAuthenticated) {
    blockers.push("Wrangler/API authentication is not proven; provider resource readback commands were skipped.");
  }
  for (const command of commands) {
    if (!command.ready) {
      const detail = command.skipped
        ? command.skipReason ?? "Command skipped."
        : [
            command.missingExpectedNames.length > 0
              ? `missing expected names ${command.missingExpectedNames.join(", ")}`
              : null,
            command.recordCountReady === false
              ? `expected at least ${command.minRecordCount} parsed record(s), found ${command.parsedRecordCount ?? "(none)"}`
              : null,
            command.exitCode !== 0 ? `command exited ${command.exitCode ?? "(unknown)"}` : null,
          ].filter(Boolean).join("; ") || "command failed.";
      blockers.push(`${command.label}: ${detail.endsWith(".") ? detail : `${detail}.`}`);
    }
  }

  return {
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    mode: "cloudflare-provider-resource-readback",
    sources: {
      wranglerConfig: input.wranglerConfigSource ?? null,
      wranglerAuth: input.wranglerAuthSource ?? null,
      workerReadiness: input.workerReadinessSource ?? null,
    },
    expected,
    readiness: {
      wranglerAuthenticated,
      providerReadbackAttempted,
      workerDeploymentReadbackReady,
      d1DatabaseReadbackReady,
      r2BucketReadbackReady,
      queuesReadbackReady,
      workerSecretNameReadbackReady,
      providerResourceReadbackReady,
      productionCutoverReady: false,
    },
    commands,
    blockers,
    note: NOTE,
  };
}

function writeOutput(outputFile: string, report: CloudflareProviderResourceReadbackReport) {
  const outputPath = resolve(outputFile);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
}

export function writeMarkdown(report: CloudflareProviderResourceReadbackReport, markdownFile: string) {
  const outputPath = resolve(markdownFile);
  mkdirSync(dirname(outputPath), { recursive: true });
  const commandRows = report.commands.map((command) => [
    command.label,
    command.skipped ? "SKIPPED" : command.ready ? "PASS" : "FAIL",
    command.args.join(" "),
    command.foundExpectedNames.join(", ") || "(none)",
    command.missingExpectedNames.join(", ") || "(none)",
    command.exitCode === null ? "(none)" : String(command.exitCode),
  ]);
  const blockerLines = report.blockers.length > 0
    ? report.blockers.map((blocker) => `- ${blocker}`)
    : ["- (none)"];
  const lines = [
    "# Cloudflare Provider Resource Readback",
    "",
    `Generated: ${report.generatedAt}`,
    `Wrangler config source: ${report.sources.wranglerConfig ?? "(none)"}`,
    `Wrangler auth source: ${report.sources.wranglerAuth ?? "(none)"}`,
    `Worker readiness source: ${report.sources.workerReadiness ?? "(none)"}`,
    "",
    report.note,
    "",
    "## Summary",
    "",
    "| Gate | Ready |",
    "| --- | --- |",
    `| Wrangler authenticated | ${report.readiness.wranglerAuthenticated ? "yes" : "no"} |`,
    `| Provider readback attempted | ${report.readiness.providerReadbackAttempted ? "yes" : "no"} |`,
    `| Worker deployment readback ready | ${report.readiness.workerDeploymentReadbackReady ? "yes" : "no"} |`,
    `| D1 database readback ready | ${report.readiness.d1DatabaseReadbackReady ? "yes" : "no"} |`,
    `| R2 bucket readback ready | ${report.readiness.r2BucketReadbackReady ? "yes" : "no"} |`,
    `| Queues readback ready | ${report.readiness.queuesReadbackReady ? "yes" : "no"} |`,
    `| Worker secret name readback ready | ${report.readiness.workerSecretNameReadbackReady ? "yes" : "no"} |`,
    `| Provider resource readback ready | ${report.readiness.providerResourceReadbackReady ? "yes" : "no"} |`,
    `| Production cutover ready | ${report.readiness.productionCutoverReady ? "yes" : "no"} |`,
    "",
    "## Expected Names",
    "",
    `- Worker: ${report.expected.workerName ?? "(missing)"}`,
    `- D1: ${report.expected.d1Databases.join(", ") || "(none)"}`,
    `- R2: ${report.expected.r2Buckets.join(", ") || "(none)"}`,
    `- Queues: ${report.expected.queues.join(", ") || "(none)"}`,
    `- Worker secret names: ${report.expected.workerSecretNames.join(", ") || "(none)"}`,
    "",
    "## Commands",
    "",
    "| Check | Result | Wrangler args | Found expected names | Missing expected names | Exit |",
    "| --- | --- | --- | --- | --- | ---: |",
    ...commandRows.map((row) => `| ${row.map((cell) => cell.replaceAll("|", "\\|")).join(" | ")} |`),
    "",
    "## Blockers",
    "",
    ...blockerLines,
    "",
  ];
  writeFileSync(outputPath, lines.join("\n"));
}

async function main() {
  const wranglerConfigFile = readEnv("CLOUDFLARE_WRANGLER_CONFIG_FILE") ?? DEFAULT_WRANGLER_CONFIG_FILE;
  const wranglerAuthFile = readEnv("CLOUDFLARE_WRANGLER_AUTH_FILE") ?? DEFAULT_WRANGLER_AUTH_FILE;
  const workerReadinessFile = readEnv("CLOUDFLARE_WORKER_READINESS_FILE") ?? DEFAULT_WORKER_READINESS_FILE;
  if (!existsSync(wranglerConfigFile)) throw new Error(`Wrangler config file not found: ${wranglerConfigFile}`);
  const wranglerAuth = readJsonIfExists<WranglerAuthEvidence>(wranglerAuthFile);
  const workerReadiness = readJsonIfExists<WorkerReadinessEvidence>(workerReadinessFile);
  const report = buildCloudflareProviderResourceReadbackReport({
    wranglerConfigText: readFileSync(wranglerConfigFile, "utf8"),
    wranglerConfigSource: wranglerConfigFile,
    wranglerAuth: wranglerAuth.value,
    wranglerAuthSource: wranglerAuth.value ? wranglerAuth.source : null,
    workerReadiness: workerReadiness.value,
    workerReadinessSource: workerReadiness.value ? workerReadiness.source : null,
  });
  const outputFile = readEnv("OUTPUT_FILE") ?? DEFAULT_OUTPUT_FILE;
  const markdownFile = readEnv("MARKDOWN_FILE") ?? DEFAULT_MARKDOWN_FILE;
  writeOutput(outputFile, report);
  writeMarkdown(report, markdownFile);
  console.log(JSON.stringify(report, null, 2));
  if (!report.sources.wranglerAuth) process.exitCode = 1;
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
