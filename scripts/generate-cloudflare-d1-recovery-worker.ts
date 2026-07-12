#!/usr/bin/env bun

import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const SCRATCH_ROOT = resolve(".ai/99_scratch/cloudflare-d1-recovery");

export type CloudflareD1RecoveryWorkerInputs = {
  runId: string;
  disposableDatabaseName: string;
  disposableDatabaseId: string;
};

export type CloudflareD1RecoveryWorkerOutput = {
  outputDirectory: string;
  workerFile: string;
  wranglerFile: string;
  workerName: string;
};

function validRunId(runId: string) {
  return /^[a-z0-9][a-z0-9-]{7,95}$/.test(runId);
}

function digest(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function assertSafeInput(inputs: CloudflareD1RecoveryWorkerInputs) {
  if (!validRunId(inputs.runId)) throw new Error("Recovery run ID must be lowercase, hyphenated, and at least eight characters.");
  if (!inputs.disposableDatabaseName.startsWith("archestimator-recovery-")) {
    throw new Error("Recovery worker requires a disposable database name.");
  }
  if (!inputs.disposableDatabaseId.trim()) throw new Error("Recovery worker requires an explicit disposable database ID.");
}

function workerSource() {
  return `const encoder = new TextEncoder();

async function sha256(value) {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", typeof value === "string" ? encoder.encode(value) : value));
}

function hex(bytes) {
  return Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
}

async function constantTimeEqual(left, right) {
  const [leftDigest, rightDigest] = await Promise.all([sha256(left), sha256(right)]);
  let difference = 0;
  for (let index = 0; index < leftDigest.length; index += 1) difference |= leftDigest[index] ^ rightDigest[index];
  return difference === 0;
}

function base64UrlBytes(value) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
}

async function readBodyWithLimit(request) {
  const reader = request.body?.getReader();
  if (!reader) throw new Error("indeterminate-body");
  const chunks = [];
  let size = 0;
  while (true) {
    const next = await reader.read();
    if (next.done) break;
    size += next.value.byteLength;
    if (size > 8192) throw new Error("body-too-large");
    chunks.push(next.value);
  }
  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}

async function ensureProbeState(database) {
  await database.batch([
    database.prepare("CREATE TABLE IF NOT EXISTS recovery_probe_nonces (nonce_digest TEXT PRIMARY KEY, expires_at INTEGER NOT NULL)"),
    database.prepare("CREATE TABLE IF NOT EXISTS recovery_probe_counters (kind TEXT PRIMARY KEY, window_started_at INTEGER NOT NULL, count INTEGER NOT NULL)"),
  ]);
}

async function recordFailedAttempt(database, now) {
  await database.batch([
    database.prepare("INSERT OR IGNORE INTO recovery_probe_counters (kind, window_started_at, count) VALUES ('failed', ?, 0)").bind(now),
    database.prepare("UPDATE recovery_probe_counters SET window_started_at = ?, count = 0 WHERE kind = 'failed' AND window_started_at < ?").bind(now, now - 60000),
  ]);
  const result = await database.prepare("UPDATE recovery_probe_counters SET count = count + 1 WHERE kind = 'failed' AND count < 5").run();
  return result.meta.changes === 1;
}

async function verifyHmac(signature, payload, signingKey) {
  try {
    const key = await crypto.subtle.importKey("raw", encoder.encode(signingKey), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
    return await crypto.subtle.verify("HMAC", key, base64UrlBytes(signature), encoder.encode(payload));
  } catch {
    return false;
  }
}

async function claimNonceAndSuccess(database, nonceDigest, now) {
  await database.batch([
    database.prepare("DELETE FROM recovery_probe_nonces WHERE expires_at < ?").bind(now),
    database.prepare("INSERT OR IGNORE INTO recovery_probe_counters (kind, window_started_at, count) VALUES ('success', ?, 0)").bind(now),
  ]);
  const nonce = await database.prepare("INSERT OR IGNORE INTO recovery_probe_nonces (nonce_digest, expires_at) VALUES (?, ?)").bind(nonceDigest, now + 300000).run();
  if (nonce.meta.changes !== 1) return "nonce-replayed";
  const success = await database.prepare("UPDATE recovery_probe_counters SET count = count + 1 WHERE kind = 'success' AND count < 32").run();
  if (success.meta.changes === 1) return null;
  await database.prepare("DELETE FROM recovery_probe_nonces WHERE nonce_digest = ?").bind(nonceDigest).run();
  return "success-cap";
}

async function targetIsReady(database) {
  try {
    const result = await database.prepare("SELECT 1 AS ready").first();
    return result?.ready === 1;
  } catch {
    return false;
  }
}

function deny(label, status) {
  return new Response(label, { status, headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method !== "POST" || url.pathname !== "/__recovery/probe") {
      return deny("path-not-found", 404);
    }
    if (request.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase() !== "application/json") {
      return deny("content-type-invalid", 415);
    }
    const declaredLength = request.headers.get("content-length");
    if (declaredLength !== null && (!/^\\d+$/.test(declaredLength) || Number(declaredLength) > 8192)) {
      return deny("body-too-large", 413);
    }
    try {
      const body = await readBodyWithLimit(request);
      const payload = JSON.parse(new TextDecoder().decode(body));
      if (!payload || typeof payload.runId !== "string" || !Number.isSafeInteger(payload.timestamp) || typeof payload.nonce !== "string") {
        return deny("body-invalid", 400);
      }
      if (!env.RECOVERY_EXPECTED_RUN_ID || !env.RECOVERY_PROBE_HMAC_KEY) return deny("probe-unavailable", 503);
      if (!await constantTimeEqual(payload.runId, env.RECOVERY_EXPECTED_RUN_ID)) return deny("run-id-mismatch", 403);
      await ensureProbeState(env.ARCH_DB);
      if (Math.abs(Date.now() - payload.timestamp) > 300000) {
        if (!await recordFailedAttempt(env.ARCH_DB, Date.now())) return deny("failed-attempt-cap", 429);
        return deny("timestamp-expired", 403);
      }
      if (!/^[a-zA-Z0-9_-]{16,256}$/.test(payload.nonce)) {
        if (!await recordFailedAttempt(env.ARCH_DB, Date.now())) return deny("failed-attempt-cap", 429);
        return deny("nonce-invalid", 400);
      }
      const signature = request.headers.get("x-recovery-signature");
      const bodyDigest = hex(await sha256(body));
      const signedPayload = [request.method, url.pathname, payload.runId, payload.timestamp, payload.nonce, bodyDigest].join("\\n");
      if (!signature || !await verifyHmac(signature, signedPayload, env.RECOVERY_PROBE_HMAC_KEY)) {
        if (!await recordFailedAttempt(env.ARCH_DB, Date.now())) return deny("failed-attempt-cap", 429);
        return deny("signature-invalid", 403);
      }
      const nonceResult = await claimNonceAndSuccess(env.ARCH_DB, hex(await sha256(payload.nonce)), Date.now());
      if (nonceResult) return deny(nonceResult, nonceResult === "success-cap" ? 429 : 409);
      if (!await targetIsReady(env.ARCH_DB)) return deny("target-unavailable", 503);
    } catch {
      return deny("body-invalid", 400);
    }
    return new Response(null, { status: 204, headers: { "cache-control": "no-store" } });
  },
};
`;
}

export function generateCloudflareD1RecoveryWorker(
  inputs: CloudflareD1RecoveryWorkerInputs,
): CloudflareD1RecoveryWorkerOutput {
  assertSafeInput(inputs);
  const outputDirectory = resolve(SCRATCH_ROOT, inputs.runId);
  if (!outputDirectory.startsWith(`${SCRATCH_ROOT}/`)) throw new Error("Recovery overlay must remain within the scratch root.");
  mkdirSync(SCRATCH_ROOT, { recursive: true });
  mkdirSync(outputDirectory, { recursive: false });

  const workerName = `archestimator-recovery-${digest(inputs.runId).slice(0, 16)}`;
  const workerFile = join(outputDirectory, "worker.ts");
  const wranglerFile = join(outputDirectory, "wrangler.jsonc");
  const wranglerConfig = {
    name: workerName,
    main: "worker.ts",
    compatibility_date: "2026-06-29",
    workers_dev: true,
    routes: [],
    d1_databases: [{ binding: "ARCH_DB", database_name: inputs.disposableDatabaseName, database_id: inputs.disposableDatabaseId }],
  };

  writeFileSync(workerFile, workerSource(), { encoding: "utf8", mode: 0o600 });
  writeFileSync(wranglerFile, `${JSON.stringify(wranglerConfig, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });

  return { outputDirectory, workerFile, wranglerFile, workerName };
}
