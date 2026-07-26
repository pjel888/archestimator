#!/usr/bin/env node

import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { parseLoopbackHttpUrl } from "./lib/supermemory-config.mjs";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(SCRIPT_DIR, "..");
let apiUrl;
let keyPath;
const command = process.argv[2];
const args = process.argv.slice(3);

function fail(message) {
  throw new Error(message);
}

function loadConfiguration() {
  try {
    apiUrl = parseLoopbackHttpUrl(
      process.env.SUPERMEMORY_API_URL?.trim() || "http://localhost:6767",
      "SUPERMEMORY_API_URL",
    );
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error));
  }
  keyPath = resolve(
    process.env.SUPERMEMORY_API_KEY_FILE?.trim() || join(REPO_ROOT, ".supermemory", "api-key"),
  );
}

function readApiKey() {
  if (!existsSync(keyPath)) fail(`missing local API key file ${keyPath}.`);
  const keyInfo = statSync(keyPath);
  if (!keyInfo.isFile()) fail(`local API key path ${keyPath} must be a regular file.`);
  const mode = keyInfo.mode & 0o777;
  if (process.platform !== "win32" && (mode & 0o077) !== 0) {
    fail(`local API key file ${keyPath} must not be group/world accessible.`);
  }
  const key = readFileSync(keyPath, "utf8").trim();
  if (!key) fail(`local API key file ${keyPath} is empty.`);
  return key;
}

function assertSanitized(content) {
  const secretPatterns = [
    /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/i,
    /\b(?:[A-Z][A-Z0-9_]*(?:API_KEY|TOKEN|SECRET|PASSWORD)|api[_ -]?key|access[_ -]?token|auth[_ -]?token|secret|password)\b\s*[:=]\s*["']?\S{6,}/i,
    /\bBearer\s+[A-Za-z0-9._~-]{8,}/i,
    /\bsk-[A-Za-z0-9_-]{12,}\b/,
    /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/,
  ];
  if (secretPatterns.some((pattern) => pattern.test(content))) {
    fail("refusing to store secret-like content; redact it before adding memory.");
  }
}

async function request(path, body, method = "POST") {
  const timeoutMs = Number.parseInt(process.env.SUPERMEMORY_API_TIMEOUT_MS || "10000", 10);
  const headers = {
    authorization: `Bearer ${readApiKey()}`,
  };
  if (body !== undefined) headers["content-type"] = "application/json";
  const response = await fetch(new URL(path, apiUrl), {
    method,
    headers,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    redirect: "error",
    signal: AbortSignal.timeout(Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 10000),
  }).catch((error) => {
    fail(`local API request failed: ${error.message}. Run bun run supermemory:ensure.`);
  });

  if (!response.ok) fail(`local API request failed with HTTP ${response.status}.`);
  try {
    return await response.json();
  } catch {
    fail("local API returned invalid JSON.");
  }
}

function positiveInteger(value, fallback) {
  const parsed = Number.parseInt(value || "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function sleep(milliseconds) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, milliseconds));
}

function searchContainsDocument(searchResult, documentId) {
  return Array.isArray(searchResult?.results) && searchResult.results.some((entry) =>
    entry?.documentId === documentId || entry?.id === documentId);
}

async function waitForSearchableDocument(accepted, content) {
  const documentId = accepted?.id;
  if (typeof documentId !== "string" || !documentId) {
    fail("local API accepted a memory without returning a document id.");
  }

  const timeoutMs = positiveInteger(process.env.SUPERMEMORY_INDEX_TIMEOUT_MS, 240000);
  const pollMs = positiveInteger(process.env.SUPERMEMORY_INDEX_POLL_MS, 1000);
  const deadline = Date.now() + timeoutMs;
  let latest = accepted;

  while (Date.now() <= deadline) {
    latest = await request(`/v3/documents/${encodeURIComponent(documentId)}`, undefined, "GET");
    if (["done", "failed"].includes(latest?.status)) {
      const searchResult = await request("/v3/search", {
        includeFullDocs: true,
        limit: 10,
        q: content,
      });
      if (searchContainsDocument(searchResult, documentId)) {
        return { ...accepted, indexedStatus: latest.status, searchable: true };
      }
      if (latest.status === "failed") {
        fail(`document ${documentId} failed during indexing and was not found by search.`);
      }
    }
    await sleep(Math.min(pollMs, Math.max(1, deadline - Date.now())));
  }

  fail(`document ${documentId} was not searchable within ${timeoutMs}ms.`);
}

function readAddContent() {
  if (args[0] === "--file") {
    const filePath = args[1];
    if (!filePath || args.length !== 2) fail("usage: supermemory:add -- --file <path>.");
    return readFileSync(resolve(filePath), "utf8").trim();
  }
  return args.join(" ").trim();
}

async function main() {
  loadConfiguration();
  if (command === "search") {
    const query = args.join(" ").trim();
    if (!query) fail("usage: bun run supermemory:search -- <query>.");
    assertSanitized(query);
    return request("/v3/search", {
      includeFullDocs: true,
      limit: 5,
      q: query,
    });
  }
  if (command === "add") {
    const content = readAddContent();
    if (!content) fail("usage: bun run supermemory:add -- <sanitized memory>.");
    assertSanitized(content);
    const accepted = await request("/v3/documents", {
      containerTag: "archestimator",
      content,
      metadata: {
        repo: "archestimator",
        source: "coding-agent",
      },
      taskType: "memory",
    });
    return waitForSearchableDocument(accepted, content);
  }
  fail("usage: supermemory-memory.mjs <search|add> <text>.");
}

try {
  const result = await main();
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
} catch (error) {
  process.stderr.write(`supermemory:memory: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}
