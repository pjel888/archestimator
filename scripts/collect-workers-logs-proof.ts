#!/usr/bin/env bun

import { spawn } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const DEFAULT_OUTPUT_FILE =
  ".ai/03_plans/2026-07-07-observability-alert-proof-and-log-retention/evidence/workers-logs-query-proof.json";
const DEFAULT_WORKER = "archestimator-proof";
const DEFAULT_DURATION_SECONDS = 60;

type CommandResult = {
  attempted: boolean;
  exitCode: number | null;
  signal: string | null;
  timedOut: boolean;
  stdout: string;
  stderrBytes: number;
  trigger: TriggerResult;
};

type TriggerResult = {
  attempted: boolean;
  ok: boolean;
  status: number | null;
  responseBytes: number;
  responseRequestId: string | null;
  errorName: string | null;
};

export type WorkersLogsProofArtifact = {
  generatedAt: string;
  mode: "workers-logs-query-proof";
  proofBoundary: "hosted-workers-logs-query";
  passed: boolean;
  source: "wrangler-tail";
  query: {
    environment: "production";
    worker: string;
    requestId: string | null;
    proofId: string | null;
    route: string | null;
    windowStart: string;
    windowEnd: string;
    matchedEvents: number;
  };
  evidence: {
    internalRequestIdObserved: boolean;
    proofIdObserved: boolean | null;
    routeObserved: boolean;
    workerOutcomeObserved: boolean;
    errorMessageRedacted: boolean;
    noRawSecrets: boolean;
    matchedRecordHashes: string[];
  };
  command: {
    attempted: boolean;
    exitCode: number | null;
    signal: string | null;
    timedOut: boolean;
    stderrBytes: number;
  };
  trigger: TriggerResult;
  note: string;
};

export type BuildWorkersLogsProofInput = {
  requestId?: string | null;
  proofId?: string | null;
  route?: string | null;
  worker?: string;
  now?: Date;
  durationSeconds?: number;
  records: unknown[];
  command?: Partial<Omit<CommandResult, "stdout">>;
};

function readEnv(name: string) {
  const value = process.env[name];
  return value?.trim() || undefined;
}

function parsePositiveNumber(value: string | undefined, fallback: number) {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function assertSafeSearchText(name: string, value: string) {
  if (!/^[A-Za-z0-9._:/[\]-]{1,180}$/.test(value)) {
    throw new Error(`${name} must be a short request id or route fragment without spaces or shell metacharacters`);
  }
}

function defaultTriggerResult(): TriggerResult {
  return {
    attempted: false,
    ok: false,
    status: null,
    responseBytes: 0,
    responseRequestId: null,
    errorName: null,
  };
}

export function parseWranglerTailJsonLines(stdout: string): unknown[] {
  return stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .flatMap((line) => {
      const start = line.indexOf("{");
      if (start === -1) return [];
      try {
        return [JSON.parse(line.slice(start)) as unknown];
      } catch {
        return [];
      }
    });
}

function stableHash(value: string) {
  return createHash("sha256").update(value).digest("hex").slice(0, 16);
}

function recordText(value: unknown) {
  return JSON.stringify(value);
}

function textHasRequestId(text: string) {
  return /request[_-]?id/i.test(text) && /\breq_[A-Za-z0-9._:-]{8,128}\b/.test(text);
}

function textHasSensitiveValue(text: string) {
  if (/Bearer\s+[A-Za-z0-9._~+/=-]{12,}/i.test(text)) return true;
  if (/(cf_clearance|better-auth\.session|session_token|password-reset|invite_token)=/i.test(text)) return true;
  if (/https?:\/\/[^\s"']+[?&](token|code|state|password|secret)=/i.test(text)) return true;
  return false;
}

function hasKeyDeep(value: unknown, key: string): boolean {
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some((item) => hasKeyDeep(item, key));
  if (Object.prototype.hasOwnProperty.call(value, key)) return true;
  return Object.values(value).some((item) => hasKeyDeep(item, key));
}

export function buildWorkersLogsProofArtifact(input: BuildWorkersLogsProofInput): WorkersLogsProofArtifact {
  const now = input.now ?? new Date();
  const durationSeconds = input.durationSeconds ?? DEFAULT_DURATION_SECONDS;
  const windowStart = new Date(now.getTime() - durationSeconds * 1000).toISOString();
  const windowEnd = now.toISOString();
  const route = input.route?.trim() || null;
  const worker = input.worker ?? DEFAULT_WORKER;
  const requestId = input.requestId?.trim() || null;
  const proofId = input.proofId?.trim() || null;
  const matchTerms = [requestId, proofId].filter((item): item is string => Boolean(item));
  const matchedRecords = matchTerms.length
    ? input.records.filter((record) => {
      const text = recordText(record);
      return matchTerms.some((term) => text.includes(term));
    })
    : [];
  const matchedTexts = matchedRecords.map(recordText);
  const internalRequestIdObserved = matchedRecords.length > 0
    && (requestId
      ? matchedTexts.some((text) => text.includes(requestId))
      : matchedTexts.some(textHasRequestId));
  const proofIdObserved = proofId
    ? matchedTexts.some((text) => text.includes(proofId))
    : null;
  const routeObserved = Boolean(route && matchedTexts.some((text) => text.includes(route)));
  const workerOutcomeObserved = matchedRecords.some((record) => hasKeyDeep(record, "outcome") || hasKeyDeep(record, "status"));
  const noRawSecrets = matchedTexts.every((text) => !textHasSensitiveValue(text));
  const errorMessageRedacted = noRawSecrets && matchedRecords.length > 0;
  const passed = internalRequestIdObserved
    && routeObserved
    && workerOutcomeObserved
    && errorMessageRedacted
    && noRawSecrets;

  return {
    generatedAt: now.toISOString(),
    mode: "workers-logs-query-proof",
    proofBoundary: "hosted-workers-logs-query",
    passed,
    source: "wrangler-tail",
    query: {
      environment: "production",
      worker,
      requestId,
      proofId,
      route,
      windowStart,
      windowEnd,
      matchedEvents: matchedRecords.length,
    },
    evidence: {
      internalRequestIdObserved,
      proofIdObserved,
      routeObserved,
      workerOutcomeObserved,
      errorMessageRedacted,
      noRawSecrets,
      matchedRecordHashes: matchedTexts.map(stableHash),
    },
    command: {
      attempted: input.command?.attempted ?? false,
      exitCode: input.command?.exitCode ?? 0,
      signal: input.command?.signal ?? null,
      timedOut: input.command?.timedOut ?? false,
      stderrBytes: input.command?.stderrBytes ?? 0,
    },
    trigger: input.command?.trigger ?? defaultTriggerResult(),
    note: "Hosted Workers Logs proof artifact. It stores counts and hashes only; raw tail records and command stderr are intentionally omitted.",
  };
}

function routeFromHttpsUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.pathname : null;
  } catch {
    return null;
  }
}

async function triggerHostedProofRequest(input: {
  url: string;
  secret: string;
  proofId: string;
}): Promise<TriggerResult> {
  try {
    const url = new URL(input.url);
    if (url.protocol !== "https:") {
      return { ...defaultTriggerResult(), attempted: true, errorName: "InvalidProofUrl" };
    }
    url.searchParams.set("proof_id", input.proofId);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        authorization: `Bearer ${input.secret}`,
        "x-observability-proof-id": input.proofId,
      },
    });
    const text = await response.text();
    let responseRequestId: string | null = null;
    try {
      const body = JSON.parse(text) as { requestId?: unknown };
      responseRequestId = typeof body.requestId === "string" ? body.requestId : null;
    } catch {
      responseRequestId = null;
    }

    return {
      attempted: true,
      ok: response.ok,
      status: response.status,
      responseBytes: Buffer.byteLength(text),
      responseRequestId,
      errorName: null,
    };
  } catch (error) {
    return {
      ...defaultTriggerResult(),
      attempted: true,
      errorName: error instanceof Error ? error.name : "UnknownError",
    };
  }
}

function runWranglerTail(input: {
  worker: string;
  searchText: string;
  durationSeconds: number;
  trigger?: {
    url: string;
    secret: string;
    proofId: string;
    delayMs: number;
  } | null;
}): Promise<CommandResult> {
  return new Promise((resolveResult) => {
    let stdout = "";
    let stderr = "";
    let settled = false;
    let childClosed = false;
    const trigger = input.trigger ?? null;
    const triggerPromise = trigger
      ? new Promise<TriggerResult>((resolveTrigger) => {
        setTimeout(() => {
          if (childClosed) {
            resolveTrigger(defaultTriggerResult());
            return;
          }
          void triggerHostedProofRequest(trigger).then(resolveTrigger);
        }, trigger.delayMs).unref();
      })
      : Promise.resolve(defaultTriggerResult());
    const child = spawn("bunx", [
      "wrangler",
      "tail",
      input.worker,
      "--format=json",
      "--sampling-rate",
      "1",
      "--search",
      input.searchText,
    ], {
      cwd: process.cwd(),
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    const timeout = setTimeout(() => {
      child.kill("SIGTERM");
      setTimeout(() => child.kill("SIGKILL"), 1_000).unref();
    }, input.durationSeconds * 1000);

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("close", (exitCode, signal) => {
      if (settled) return;
      settled = true;
      childClosed = true;
      clearTimeout(timeout);
      void triggerPromise.then((triggerResult) => resolveResult({
        attempted: true,
        exitCode,
        signal,
        timedOut: signal === "SIGTERM" || signal === "SIGKILL",
        stdout,
        stderrBytes: Buffer.byteLength(stderr),
        trigger: triggerResult,
      }));
    });
  });
}

function writeOutput(outputFile: string, artifact: WorkersLogsProofArtifact) {
  const resolved = resolve(outputFile);
  mkdirSync(dirname(resolved), { recursive: true });
  writeFileSync(resolved, `${JSON.stringify(artifact, null, 2)}\n`);
}

async function main() {
  const requestId = readEnv("WORKERS_LOGS_PROOF_REQUEST_ID");
  if (requestId) assertSafeSearchText("WORKERS_LOGS_PROOF_REQUEST_ID", requestId);
  const triggerUrl = readEnv("WORKERS_LOGS_PROOF_URL") ?? readEnv("WORKERS_LOGS_PROOF_TRIGGER_URL");
  const triggerSecret = readEnv("WORKERS_LOGS_PROOF_SECRET");
  const proofId = readEnv("WORKERS_LOGS_PROOF_ID")
    ?? (triggerUrl && triggerSecret ? `proof_${randomUUID()}` : undefined);
  if (proofId) assertSafeSearchText("WORKERS_LOGS_PROOF_ID", proofId);
  if (!requestId && !proofId) {
    throw new Error("WORKERS_LOGS_PROOF_REQUEST_ID or WORKERS_LOGS_PROOF_URL+WORKERS_LOGS_PROOF_SECRET is required");
  }

  const route = readEnv("WORKERS_LOGS_PROOF_ROUTE") ?? (triggerUrl ? routeFromHttpsUrl(triggerUrl) : null);
  if (route) assertSafeSearchText("WORKERS_LOGS_PROOF_ROUTE", route);

  const worker = readEnv("WORKERS_LOGS_PROOF_WORKER") ?? DEFAULT_WORKER;
  assertSafeSearchText("WORKERS_LOGS_PROOF_WORKER", worker);
  const durationSeconds = parsePositiveNumber(readEnv("WORKERS_LOGS_PROOF_DURATION_SECONDS"), DEFAULT_DURATION_SECONDS);
  const triggerDelayMs = parsePositiveNumber(readEnv("WORKERS_LOGS_PROOF_TRIGGER_DELAY_MS"), 1_500);
  const fixtureFile = readEnv("WORKERS_LOGS_PROOF_FIXTURE_FILE");
  const searchText = proofId ?? requestId;
  if (!searchText) throw new Error("Workers Logs proof search text could not be resolved");
  const command = fixtureFile
    ? {
      attempted: false,
      exitCode: 0,
      signal: null,
      timedOut: false,
      stdout: existsSync(fixtureFile) ? readFileSync(fixtureFile, "utf8") : "",
      stderrBytes: 0,
      trigger: defaultTriggerResult(),
    }
    : await runWranglerTail({
      worker,
      searchText,
      durationSeconds,
      trigger: triggerUrl && triggerSecret && proofId
        ? {
          url: triggerUrl,
          secret: triggerSecret,
          proofId,
          delayMs: triggerDelayMs,
        }
        : null,
    });

  const artifact = buildWorkersLogsProofArtifact({
    requestId,
    proofId,
    route,
    worker,
    durationSeconds,
    records: parseWranglerTailJsonLines(command.stdout),
    command,
  });
  const outputFile = readEnv("OUTPUT_FILE") ?? readEnv("WORKERS_LOGS_PROOF_OUTPUT_FILE") ?? DEFAULT_OUTPUT_FILE;
  writeOutput(outputFile, artifact);
  console.log(`Workers Logs proof ${artifact.passed ? "passed" : "failed"}; output=${resolve(outputFile)}`);
  if (!artifact.passed) process.exitCode = 1;
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
