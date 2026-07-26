import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const DEFAULT_OUT_DIR = ".ai/03_plans/2026-06-20-Shared-Link-Feature/evidence/shared-link-smoke";
const REDACTED_TOKEN = "<redacted-token>";
const REDACTED_VALUE = "<redacted>";

function readEnv(name) {
  const value = process.env[name];
  return value?.trim() || undefined;
}

function today() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(new Date());
}

export function redactShareUrl(value) {
  const url = new URL(value);
  const segments = url.pathname.split("/");
  const shareIndex = segments.findIndex((segment) => segment === "share");
  if (shareIndex >= 0 && segments[shareIndex + 1]) {
    segments[shareIndex + 1] = REDACTED_TOKEN;
  }

  const redacted = new URL(url.origin);
  redacted.pathname = segments.join("/") || "/";
  for (const [key, rawValue] of url.searchParams.entries()) {
    const lower = key.toLowerCase();
    redacted.searchParams.set(
      key,
      lower === "recipient" || lower === "rt" || lower.includes("token") || lower === "_vercel_share" ? REDACTED_VALUE : rawValue,
    );
  }
  return redacted.toString();
}

function headerDirectives(value) {
  return (value ?? "")
    .toLowerCase()
    .split(",")
    .map((directive) => directive.trim())
    .filter(Boolean);
}

function cspDirectives(value) {
  return (value ?? "")
    .toLowerCase()
    .split(";")
    .map((directive) => directive.trim())
    .filter(Boolean);
}

export function hasNoStoreCacheControl(value) {
  return headerDirectives(value).includes("no-store");
}

function hasFramePolicy(headers) {
  const xFrameOptions = headers["x-frame-options"]?.toLowerCase();
  const csp = cspDirectives(headers["content-security-policy"]);
  return xFrameOptions === "deny" || csp.includes("frame-ancestors 'none'");
}

function pickHeaders(response) {
  const names = [
    "cache-control",
    "content-security-policy",
    "x-frame-options",
    "x-content-type-options",
    "referrer-policy",
    "strict-transport-security",
    "x-robots-tag",
  ];
  return Object.fromEntries(names.map((name) => [name, response.headers.get(name)]));
}

export function evaluateShareHeaders(headers) {
  const checks = [
    {
      key: "content-security-policy",
      label: "Content-Security-Policy present",
      passed: Boolean(headers["content-security-policy"]),
    },
    {
      key: "cache-control",
      label: "Cache-Control includes no-store",
      passed: hasNoStoreCacheControl(headers["cache-control"]),
    },
    {
      key: "frame-policy",
      label: "Frame policy denies embedding",
      passed: hasFramePolicy(headers),
    },
    {
      key: "x-content-type-options",
      label: "X-Content-Type-Options is nosniff",
      passed: headers["x-content-type-options"]?.toLowerCase() === "nosniff",
    },
    {
      key: "referrer-policy",
      label: "Referrer-Policy is no-referrer",
      passed: headers["referrer-policy"]?.toLowerCase() === "no-referrer",
    },
    {
      key: "x-robots-tag",
      label: "X-Robots-Tag is noindex/nofollow",
      passed: (headers["x-robots-tag"] ?? "").toLowerCase().includes("noindex"),
    },
  ];

  return { checks, passed: checks.every((check) => check.passed) };
}

function needsGetFallback(result) {
  return result.status === 405 || !result.evaluation.passed;
}

function requestHeadersFromEnv(env = process.env) {
  const cookie = env.SHARE_COOKIE?.trim();
  return cookie ? { cookie } : undefined;
}

async function sample(url, method, fetchImpl, requestHeaders) {
  const startedAt = performance.now();
  const requestInit = { method, redirect: "manual" };
  if (requestHeaders) requestInit.headers = requestHeaders;
  const response = await fetchImpl(url, requestInit);
  const durationMs = Math.round((performance.now() - startedAt) * 100) / 100;
  const headers = pickHeaders(response);
  return {
    method,
    status: response.status,
    ok: response.ok,
    durationMs,
    headers,
    evaluation: evaluateShareHeaders(headers),
  };
}

export async function smokeShareHeaders({ shareUrl, fetchImpl = fetch, requestHeaders } = {}) {
  if (!shareUrl) throw new Error("SHARE_URL is required.");
  const normalized = new URL(shareUrl).toString();
  const headResult = await sample(normalized, "HEAD", fetchImpl, requestHeaders);
  const finalResult = needsGetFallback(headResult) ? await sample(normalized, "GET", fetchImpl, requestHeaders) : headResult;

  return {
    generatedAt: new Date().toISOString(),
    mode: "shared-link-header-smoke",
    redactedUrl: redactShareUrl(normalized),
    method: finalResult.method,
    headAttempted: true,
    headStatus: headResult.status,
    status: finalResult.status,
    ok: finalResult.ok,
    durationMs: finalResult.durationMs,
    headers: finalResult.headers,
    checks: finalResult.evaluation.checks,
    passed: finalResult.evaluation.passed,
    note:
      "Read-only header smoke for a valid shared proposal URL. URL path/query secrets are redacted; this proves runtime security/cache headers only, not browser visual QA.",
  };
}

export function renderMarkdown(report) {
  const rows = report.checks
    .map((check) => `| ${check.key} | ${check.label} | ${check.passed ? "PASS" : "FAIL"} |`)
    .join("\n");
  return `# Shared-link header smoke\n\nStatus: **${report.passed ? "PASS" : "FAIL"}**\n\n- URL: \`${report.redactedUrl}\`\n- Method: \`${report.method}\` (HEAD status ${report.headStatus})\n- Status: \`${report.status}\`\n- Duration: \`${report.durationMs} ms\`\n\n| Check | Assertion | Result |\n| --- | --- | --- |\n${rows}\n`;
}

export function writeReports(report, outDir = DEFAULT_OUT_DIR, date = today()) {
  const base = resolve(outDir, `headers-${date}`);
  mkdirSync(dirname(`${base}.json`), { recursive: true });
  writeFileSync(`${base}.json`, `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(`${base}.md`, renderMarkdown(report));
  return { jsonFile: `${base}.json`, markdownFile: `${base}.md` };
}

async function main() {
  const shareUrl = readEnv("SHARE_URL");
  const outDir = readEnv("OUT_DIR") ?? DEFAULT_OUT_DIR;
  const report = await smokeShareHeaders({ shareUrl, requestHeaders: requestHeadersFromEnv() });
  const files = writeReports(report, outDir);
  console.log(`shared-link header smoke: ${report.passed ? "PASS" : "FAIL"} ${report.status} ${report.method}`);
  console.log(`Wrote ${files.markdownFile}`);
  console.log(`Wrote ${files.jsonFile}`);
  if (!report.passed) process.exit(1);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
