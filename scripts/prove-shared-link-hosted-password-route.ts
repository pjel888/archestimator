#!/usr/bin/env bun

import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { createClient, type PostgrestError } from "@supabase/supabase-js";

import {
  createPublicPostCsrfToken,
  createPublicationToken,
  encryptPublicationToken,
  hashPublicationPassword,
  hashPublicationToken,
  readPublicationTokenEncryptionSecret,
  readPublicationTokenHashSecret,
} from "../src/lib/publication/security";
import type { Database } from "../src/lib/supabase/types";

const DEFAULT_OUT_DIR = ".ai/03_plans/2026-06-20-Shared-Link-Feature/evidence/perf-hosted-password-route-2026-06-21";
const EXPECTED_PROJECT_REF = "ebxxqidacheyapmmzavr";
const PASSWORD_ROUTE_BUDGET_MS = 2500;
const PASSWORD = "Hosted password route proof passphrase";

type CliOptions = {
  deploymentUrl: string;
  outDir: string;
  samples: number;
};

type TimingSample = {
  status: number;
  durationMs: number;
};

type CleanupCounts = Record<
  "project_publication_events" | "project_publications" | "projects" | "shared_link_events" | "workspaces",
  number
>;

function usage() {
  return [
    "Usage:",
    "  ARCHESTIMATOR_HOSTED_PASSWORD_ROUTE_PROOF=1 bun scripts/prove-shared-link-hosted-password-route.ts --deployment-url <preview-url> [--samples 5] [--out-dir <path>]",
    "",
    "Creates a disposable password-protected publication, measures hosted /api/share/[token]/password",
    `through vercel curl, then deletes the fixture from Supabase project ${EXPECTED_PROJECT_REF}.`,
  ].join("\n");
}

function readEnv(name: string) {
  return process.env[name]?.trim() || undefined;
}

function parseArgs(argv = process.argv.slice(2)): CliOptions {
  const values = new Map<string, string>();
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") {
      console.log(usage());
      process.exit(0);
    }
    if (!arg?.startsWith("--")) continue;
    const key = arg.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) throw new Error(`Missing value for --${key}`);
    values.set(key, next);
    index += 1;
  }

  const deploymentUrl = values.get("deployment-url");
  if (!deploymentUrl) throw new Error(`--deployment-url is required.\n\n${usage()}`);

  const samples = Number.parseInt(values.get("samples") ?? "5", 10);
  if (!Number.isInteger(samples) || samples <= 0) throw new Error("--samples must be a positive integer.");

  return {
    deploymentUrl: new URL(deploymentUrl).origin,
    outDir: values.get("out-dir") ?? DEFAULT_OUT_DIR,
    samples,
  };
}

export function percentile(values: number[], ratio: number) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(sorted.length - 1, Math.ceil(sorted.length * ratio) - 1);
  return Math.round(sorted[index] * 100) / 100;
}

function roundMs(value: number) {
  return Math.round(value * 100) / 100;
}

export function parseVercelCurlTiming(output: string): TimingSample {
  const status = Number(output.match(/http_code=(\d+)/)?.[1] ?? 0);
  const seconds = Number(output.match(/time_total=([0-9.]+)/)?.[1] ?? NaN);
  if (!status || !Number.isFinite(seconds)) {
    throw new Error("Could not parse vercel curl timing output.");
  }
  return { status, durationMs: roundMs(seconds * 1000) };
}

export function parseNetscapeCookieJar(contents: string) {
  const cookies = new Map<string, string>();
  for (const line of contents.split(/\r?\n/)) {
    if (!line.trim() || line.startsWith("#")) continue;
    const parts = line.split("\t");
    if (parts.length < 7) continue;
    cookies.set(parts[5]!, parts.slice(6).join("\t"));
  }
  return cookies;
}

export function readSupabaseProjectRef(supabaseUrl: string) {
  const hostname = new URL(supabaseUrl).hostname;
  const [projectRef] = hostname.split(".");
  return projectRef || "";
}

export function assertExpectedSupabaseProject(supabaseUrl: string) {
  const projectRef = readSupabaseProjectRef(supabaseUrl);
  if (projectRef !== EXPECTED_PROJECT_REF) {
    throw new Error(
      `Refusing hosted password route proof; NEXT_PUBLIC_SUPABASE_URL points to project ${projectRef || "unknown"}, expected ${EXPECTED_PROJECT_REF}.`,
    );
  }
}

function requireProviderInputs() {
  if (readEnv("ARCHESTIMATOR_HOSTED_PASSWORD_ROUTE_PROOF") !== "1") {
    throw new Error("Refusing hosted password route provider mutation without ARCHESTIMATOR_HOSTED_PASSWORD_ROUTE_PROOF=1.");
  }

  const supabaseUrl = readEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = readEnv("SUPABASE_SERVICE_ROLE_KEY");
  const missing = [
    ["NEXT_PUBLIC_SUPABASE_URL", supabaseUrl],
    ["SUPABASE_SERVICE_ROLE_KEY", serviceRoleKey],
  ].filter(([, value]) => !value).map(([name]) => name);
  if (missing.length > 0) throw new Error(`Missing required environment variable(s): ${missing.join(", ")}.`);

  assertExpectedSupabaseProject(supabaseUrl!);

  return { supabaseUrl: supabaseUrl!, serviceRoleKey: serviceRoleKey! };
}

function makeClient() {
  const { supabaseUrl, serviceRoleKey } = requireProviderInputs();
  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { "X-Client-Info": "archestimator-hosted-password-route-proof" } },
  });
}

function describeError(error: PostgrestError | null) {
  if (!error) return null;
  return error.message || error.details || error.hint || error.code || "Unknown PostgREST error";
}

async function must<T>(label: string, promise: PromiseLike<{ data: T; error: PostgrestError | null }>) {
  const { data, error } = await promise;
  if (error) throw new Error(`${label}: ${describeError(error)}`);
  return data;
}

async function countRows(
  supabase: ReturnType<typeof makeClient>,
  table: keyof Database["public"]["Tables"],
  column: string,
  value: string,
) {
  const { count, error } = await supabase.from(table).select("id", { count: "exact", head: true }).eq(column, value);
  if (error) throw new Error(`count ${table}: ${describeError(error)}`);
  return count ?? 0;
}

async function createFixture() {
  const supabase = makeClient();
  const stamp = Date.now().toString(36);
  const workspaceId = crypto.randomUUID();
  const projectId = crypto.randomUUID();
  const publicationId = crypto.randomUUID();
  const token = createPublicationToken();
  const marker = `__shared_link_password_route_${stamp}`;
  const generatedAt = new Date().toISOString();

  await must("insert workspace", supabase.from("workspaces").insert({
    id: workspaceId,
    name: marker,
    slug: marker,
  }));

  await must("insert project", supabase.from("projects").insert({
    id: projectId,
    workspace_id: workspaceId,
    name: marker,
    client_name: "Hosted Password Route Fixture",
    project_code: "PERF-PASSWORD",
    location: "provider-fixture",
    currency_code: "PHP",
    metadata: { fixture: marker },
  } as never));

  await must("insert publication", supabase.from("project_publications").insert({
    id: publicationId,
    workspace_id: workspaceId,
    project_id: projectId,
    token_hash: hashPublicationToken(token, readPublicationTokenHashSecret()),
    encrypted_token: encryptPublicationToken(token, readPublicationTokenEncryptionSecret()),
    password_hash: await hashPublicationPassword(PASSWORD),
    status: "published",
    snapshot_version: 1,
    selected_estimate_ids: [],
    snapshot_json: {
      schemaVersion: "1.3",
      generatedAt,
      project: {
        id: projectId,
        name: "Hosted password route fixture",
        projectCode: "PERF-PASSWORD",
        clientName: "Hosted Password Route Fixture",
        location: "provider-fixture",
        currencyCode: "PHP",
      },
      estimates: [],
    },
  } as never));

  return { marker, password: PASSWORD, projectId, publicationId, supabase, token, workspaceId };
}

function runVercelCurl(path: string, deploymentUrl: string, curlArgs: string[]) {
  const result = spawnSync("vercel", ["curl", path, "--deployment", deploymentUrl, "--", ...curlArgs], {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: "pipe",
  });
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
  if (result.status !== 0) {
    throw new Error(`vercel curl failed (${result.status}): ${output.slice(0, 1000)}`);
  }
  return output;
}

export function createCsrfCookieHeader(csrf = createPublicPostCsrfToken()) {
  return { csrf, cookieHeader: `ae_publication_csrf=${csrf}` };
}

async function cleanupFixture(fixture: Awaited<ReturnType<typeof createFixture>>): Promise<CleanupCounts> {
  const { publicationId, projectId, supabase, workspaceId } = fixture;
  await must("cleanup workspace", supabase.from("workspaces").delete().eq("id", workspaceId));
  return {
    project_publication_events: await countRows(supabase, "project_publication_events", "publication_id", publicationId),
    project_publications: await countRows(supabase, "project_publications", "id", publicationId),
    projects: await countRows(supabase, "projects", "id", projectId),
    shared_link_events: await countRows(supabase, "shared_link_events", "publication_id", publicationId),
    workspaces: await countRows(supabase, "workspaces", "id", workspaceId),
  };
}

function cleanupPassed(counts: CleanupCounts) {
  return Object.values(counts).every((count) => count === 0);
}

function renderMarkdown(report: Awaited<ReturnType<typeof runProof>>) {
  const sampleRows = report.samples
    .map((sample, index) => `| ${index + 1} | ${sample.status} | ${sample.durationMs.toFixed(2)} ms |`)
    .join("\n");
  return `# Hosted Shared-Link Password Route Proof

Status: **${report.passed ? "PASS" : "FAIL"}**

- Generated: \`${report.generatedAt}\`
- Git SHA: \`${report.gitSha}\`
- Supabase project: \`${EXPECTED_PROJECT_REF}\`
- Preview deployment: \`${report.deploymentUrl}\`
- Route: \`/api/share/<redacted-token>/password\`
- Samples: \`${report.samples.length}\`
- p50: \`${report.p50Ms.toFixed(2)} ms\`
- p95: \`${report.p95Ms.toFixed(2)} ms\`
- Budget: \`${PASSWORD_ROUTE_BUDGET_MS} ms\`
- Cleanup: **${cleanupPassed(report.cleanupCounts) ? "PASS" : "FAIL"}**

| Sample | HTTP status | Total route time |
| ---: | ---: | ---: |
${sampleRows}

## Cleanup Counts

\`\`\`json
${JSON.stringify(report.cleanupCounts, null, 2)}
\`\`\`

Notes: measurement uses \`vercel curl\` against the protected preview deployment and the same same-origin CSRF cookie/header contract used by the browser form. The raw share token, password, CSRF token, cookies, and provider credentials are never written to this artifact.
`;
}

function gitSha() {
  const result = spawnSync("git", ["rev-parse", "--short", "HEAD"], {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: "pipe",
  });
  return result.status === 0 ? result.stdout.trim() : "unknown";
}

async function runProof(options: CliOptions) {
  const fixture = await createFixture();
  const passwordPath = `/api/share/${fixture.token}/password`;
  let cleanupCounts: CleanupCounts | null = null;

  try {
    const { cookieHeader, csrf } = createCsrfCookieHeader();
    const samples: TimingSample[] = [];

    for (let index = 0; index < options.samples; index += 1) {
      const output = runVercelCurl(passwordPath, options.deploymentUrl, [
        "--silent",
        "--output",
        "/dev/null",
        "--write-out",
        "http_code=%{http_code}\ntime_total=%{time_total}\n",
        "--request",
        "POST",
        "--header",
        "content-type: application/json",
        "--header",
        `origin: ${options.deploymentUrl}`,
        "--header",
        `x-archestimator-csrf: ${csrf}`,
        "--cookie",
        cookieHeader,
        "--data",
        JSON.stringify({ password: fixture.password }),
      ]);
      samples.push(parseVercelCurlTiming(output));
    }

    cleanupCounts = await cleanupFixture(fixture);
    const durations = samples.map((sample) => sample.durationMs);
    const p50Ms = percentile(durations, 0.5);
    const p95Ms = percentile(durations, 0.95);
    const passed =
      samples.every((sample) => sample.status === 204)
      && p95Ms <= PASSWORD_ROUTE_BUDGET_MS
      && cleanupPassed(cleanupCounts);

    return {
      cleanupCounts,
      deploymentUrl: options.deploymentUrl,
      generatedAt: new Date().toISOString(),
      gitSha: gitSha(),
      marker: fixture.marker,
      mode: "hosted-password-route-proof",
      p50Ms,
      p95Ms,
      passed,
      samples,
    };
  } finally {
    if (!cleanupCounts) await cleanupFixture(fixture);
  }
}

function writeReports(report: Awaited<ReturnType<typeof runProof>>, outDir: string) {
  const resolved = resolve(outDir);
  mkdirSync(resolved, { recursive: true });
  const jsonFile = join(resolved, "hosted-password-route-raw.json");
  const markdownFile = join(resolved, "hosted-password-route-summary.md");
  writeFileSync(jsonFile, `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(markdownFile, renderMarkdown(report));
  return { jsonFile, markdownFile };
}

async function main() {
  const options = parseArgs();
  const report = await runProof(options);
  const files = writeReports(report, options.outDir);
  console.log(`hosted password route proof: ${report.passed ? "PASS" : "FAIL"} p95=${report.p95Ms.toFixed(2)}ms`);
  console.log(`Wrote ${files.markdownFile}`);
  console.log(`Wrote ${files.jsonFile}`);
  if (!report.passed) process.exit(1);
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
