import { spawn } from "node:child_process";
import { createServer, type IncomingMessage } from "node:http";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

const scriptPath = "scripts/supermemory-memory.mjs";
const tempDirs: string[] = [];

function createTempDir() {
  const dir = mkdtempSync(join(tmpdir(), "archestimator-supermemory-memory-"));
  tempDirs.push(dir);
  return dir;
}

function readBody(request: IncomingMessage) {
  return new Promise<string>((resolvePromise, reject) => {
    let body = "";
    request.setEncoding("utf8");
    request.on("data", (chunk) => {
      body += chunk;
    });
    request.on("end", () => resolvePromise(body));
    request.on("error", reject);
  });
}

function runMemoryScript(args: string[], env: Record<string, string>) {
  return new Promise<{ status: number | null; stderr: string; stdout: string }>((resolvePromise) => {
    const child = spawn(process.execPath, [scriptPath, ...args], {
      cwd: process.cwd(),
      env: { ...process.env, ...env },
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
  for (const dir of tempDirs.splice(0)) rmSync(dir, { force: true, recursive: true });
});

describe("Supermemory memory CLI", () => {
  it("searches through the authenticated local v3 API without echoing the bearer", async () => {
    const requests: Array<{ authorization?: string; body: unknown; url?: string }> = [];
    const server = createServer(async (request, response) => {
      requests.push({
        authorization: request.headers.authorization,
        body: JSON.parse(await readBody(request)),
        url: request.url,
      });
      response.setHeader("content-type", "application/json");
      response.end(JSON.stringify({ results: [{ documentId: "doc-1", score: 0.9 }], timing: 1, total: 1 }));
    });
    await new Promise<void>((resolvePromise) => server.listen(0, "127.0.0.1", resolvePromise));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Missing fake API address");
    const tempDir = createTempDir();
    const keyPath = join(tempDir, "api-key");
    writeFileSync(keyPath, "test-bearer-value\n", { mode: 0o600 });

    const result = await runMemoryScript(["search", "verified", "bootstrap"], {
      SUPERMEMORY_API_KEY_FILE: keyPath,
      SUPERMEMORY_API_URL: `http://127.0.0.1:${address.port}`,
    });
    server.close();

    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout)).toMatchObject({ total: 1 });
    expect(result.stdout).not.toContain("test-bearer-value");
    expect(result.stderr).not.toContain("test-bearer-value");
    expect(requests).toEqual([
      {
        authorization: "Bearer test-bearer-value",
        body: { includeFullDocs: true, limit: 5, q: "verified bootstrap" },
        url: "/v3/search",
      },
    ]);
  });

  it("writes sanitized Archestimator memories and rejects secret-like content", async () => {
    const requests: Array<{ body?: unknown; method?: string; url?: string }> = [];
    const server = createServer(async (request, response) => {
      const body = request.method === "GET" ? undefined : JSON.parse(await readBody(request));
      requests.push({ body, method: request.method, url: request.url });
      response.setHeader("content-type", "application/json");
      if (request.method === "POST" && request.url === "/v3/documents") {
        response.statusCode = 201;
        response.end(JSON.stringify({ id: "doc-2", status: "queued" }));
        return;
      }
      if (request.method === "GET" && request.url === "/v3/documents/doc-2") {
        response.end(JSON.stringify({ id: "doc-2", status: "done" }));
        return;
      }
      response.end(JSON.stringify({ results: [{ documentId: "doc-2", score: 1 }], total: 1 }));
    });
    await new Promise<void>((resolvePromise) => server.listen(0, "127.0.0.1", resolvePromise));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Missing fake API address");
    const tempDir = createTempDir();
    const keyPath = join(tempDir, "api-key");
    writeFileSync(keyPath, "test-bearer-value\n", { mode: 0o600 });
    const env = {
      SUPERMEMORY_API_KEY_FILE: keyPath,
      SUPERMEMORY_API_URL: `http://127.0.0.1:${address.port}`,
      SUPERMEMORY_INDEX_POLL_MS: "5",
      SUPERMEMORY_INDEX_TIMEOUT_MS: "1000",
    };

    const accepted = await runMemoryScript(
      ["add", "2026-07-10 repo archestimator verified bootstrap passed"],
      env,
    );
    const rejected = await runMemoryScript(["add", "OPENAI_API_KEY=secret-value"], env);
    const rejectedSearch = await runMemoryScript(["search", "auth_token=secret-value"], env);
    server.close();

    expect(accepted.status).toBe(0);
    expect(JSON.parse(accepted.stdout)).toMatchObject({ id: "doc-2", indexedStatus: "done", searchable: true });
    expect(rejected.status).toBe(1);
    expect(rejectedSearch.status).toBe(1);
    expect(rejected.stderr).toContain("secret-like content");
    expect(rejectedSearch.stderr).toContain("secret-like content");
    expect(requests).toEqual([
      {
        body: {
          containerTag: "archestimator",
          content: "2026-07-10 repo archestimator verified bootstrap passed",
          metadata: { repo: "archestimator", source: "coding-agent" },
          taskType: "memory",
        },
        method: "POST",
        url: "/v3/documents",
      },
      { body: undefined, method: "GET", url: "/v3/documents/doc-2" },
      {
        body: {
          includeFullDocs: true,
          limit: 10,
          q: "2026-07-10 repo archestimator verified bootstrap passed",
        },
        method: "POST",
        url: "/v3/search",
      },
    ]);
  });

  it("fails closeout when indexing fails without a searchable memory", async () => {
    const server = createServer(async (request, response) => {
      response.setHeader("content-type", "application/json");
      if (request.method === "POST" && request.url === "/v3/documents") {
        await readBody(request);
        response.statusCode = 201;
        response.end(JSON.stringify({ id: "doc-failed", status: "queued" }));
        return;
      }
      if (request.method === "GET") {
        response.end(JSON.stringify({ id: "doc-failed", status: "failed" }));
        return;
      }
      await readBody(request);
      response.end(JSON.stringify({ results: [], total: 0 }));
    });
    await new Promise<void>((resolvePromise) => server.listen(0, "127.0.0.1", resolvePromise));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Missing fake API address");
    const tempDir = createTempDir();
    const keyPath = join(tempDir, "api-key");
    writeFileSync(keyPath, "test-bearer-value\n", { mode: 0o600 });

    const result = await runMemoryScript(["add", "sanitized durable result"], {
      SUPERMEMORY_API_KEY_FILE: keyPath,
      SUPERMEMORY_API_URL: `http://127.0.0.1:${address.port}`,
      SUPERMEMORY_INDEX_POLL_MS: "5",
      SUPERMEMORY_INDEX_TIMEOUT_MS: "1000",
    });
    server.close();

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("failed during indexing and was not found by search");
    expect(result.stdout).toBe("");
  });

  it("rejects redirects before query or memory content can leave the configured endpoint", async () => {
    let redirectedRequests = 0;
    const destination = createServer((_request, response) => {
      redirectedRequests += 1;
      response.end("unexpected");
    });
    await new Promise<void>((resolvePromise) => destination.listen(0, "127.0.0.1", resolvePromise));
    const destinationAddress = destination.address();
    if (!destinationAddress || typeof destinationAddress === "string") throw new Error("Missing redirect destination address");

    const redirector = createServer((_request, response) => {
      response.statusCode = 307;
      response.setHeader("location", `http://127.0.0.1:${destinationAddress.port}/capture`);
      response.end();
    });
    await new Promise<void>((resolvePromise) => redirector.listen(0, "127.0.0.1", resolvePromise));
    const redirectorAddress = redirector.address();
    if (!redirectorAddress || typeof redirectorAddress === "string") throw new Error("Missing redirector address");
    const tempDir = createTempDir();
    const keyPath = join(tempDir, "api-key");
    writeFileSync(keyPath, "test-bearer-value\n", { mode: 0o600 });

    const result = await runMemoryScript(["search", "safe query"], {
      SUPERMEMORY_API_KEY_FILE: keyPath,
      SUPERMEMORY_API_URL: `http://127.0.0.1:${redirectorAddress.port}`,
    });
    redirector.close();
    destination.close();

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("local API request failed");
    expect(redirectedRequests).toBe(0);
  });

  it("times out a local API endpoint that accepts a request without responding", async () => {
    const server = createServer((_request, _response) => {});
    await new Promise<void>((resolvePromise) => server.listen(0, "127.0.0.1", resolvePromise));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Missing fake API address");
    const tempDir = createTempDir();
    const keyPath = join(tempDir, "api-key");
    writeFileSync(keyPath, "test-bearer-value\n", { mode: 0o600 });
    const startedAt = Date.now();

    const result = await runMemoryScript(["search", "safe query"], {
      SUPERMEMORY_API_KEY_FILE: keyPath,
      SUPERMEMORY_API_TIMEOUT_MS: "200",
      SUPERMEMORY_API_URL: `http://127.0.0.1:${address.port}`,
    });
    server.closeAllConnections();
    server.close();

    expect(result.status).toBe(1);
    expect(Date.now() - startedAt).toBeLessThan(2000);
  });
});
