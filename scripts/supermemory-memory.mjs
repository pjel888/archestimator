#!/usr/bin/env node

import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { parseLoopbackHttpUrl } from "./lib/supermemory-config.mjs";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(SCRIPT_DIR, "..");
let apiUrl;
try {
  apiUrl = parseLoopbackHttpUrl(
    process.env.SUPERMEMORY_API_URL?.trim() || "http://localhost:6767",
    "SUPERMEMORY_API_URL",
  );
} catch (error) {
  process.stderr.write(`supermemory:memory: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
}
const keyPath = resolve(
  process.env.SUPERMEMORY_API_KEY_FILE?.trim() || join(REPO_ROOT, ".supermemory", "api-key"),
);
const command = process.argv[2];
const args = process.argv.slice(3);

function fail(message) {
  process.stderr.write(`supermemory:memory: ${message}\n`);
  process.exit(1);
}

function readApiKey() {
  if (!existsSync(keyPath)) fail(`missing local API key file ${keyPath}.`);
  const mode = statSync(keyPath).mode & 0o777;
  if ((mode & 0o077) !== 0) fail(`local API key file ${keyPath} must not be group/world accessible.`);
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

async function request(path, body) {
  const timeoutMs = Number.parseInt(process.env.SUPERMEMORY_API_TIMEOUT_MS || "10000", 10);
  const response = await fetch(new URL(path, apiUrl), {
    method: "POST",
    headers: {
      authorization: `Bearer ${readApiKey()}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
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

function readAddContent() {
  if (args[0] === "--file") {
    const filePath = args[1];
    if (!filePath || args.length !== 2) fail("usage: supermemory:add -- --file <path>.");
    return readFileSync(resolve(filePath), "utf8").trim();
  }
  return args.join(" ").trim();
}

let result;
if (command === "search") {
  const query = args.join(" ").trim();
  if (!query) fail("usage: bun run supermemory:search -- <query>.");
  assertSanitized(query);
  result = await request("/v3/search", {
    includeFullDocs: true,
    limit: 5,
    q: query,
  });
} else if (command === "add") {
  const content = readAddContent();
  if (!content) fail("usage: bun run supermemory:add -- <sanitized memory>.");
  assertSanitized(content);
  result = await request("/v3/documents", {
    containerTag: "archestimator",
    content,
    metadata: {
      repo: "archestimator",
      source: "coding-agent",
    },
    taskType: "memory",
  });
} else {
  fail("usage: supermemory-memory.mjs <search|add> <text>.");
}

process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
