#!/usr/bin/env bun

import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
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
import type { Database, Json } from "../src/lib/supabase/types";

const EXPECTED_PROJECT_REF = "ebxxqidacheyapmmzavr";
const DEFAULT_OUT_DIR = ".ai/03_plans/2026-06-20-Shared-Link-Feature/evidence/current-preview-smoke-2026-06-22";
const PASSWORD = "Current preview smoke passphrase";

type CliOptions = {
  deploymentUrl: string;
  outDir: string;
};

type SmokeStatus = {
  bodyIncludesExpectedText?: boolean;
  cookieNames?: string[];
  durationMs: number;
  expectedStatus: number | string;
  ok: boolean;
  status: number | string;
};

type Fixture = {
  marker: string;
  projectId: string;
  publicationId: string;
  publicationToken: string;
  recipientId: string;
  recipientToken: string;
  supabase: ReturnType<typeof makeClient>;
  workspaceId: string;
};

function usage() {
  return [
    "Usage:",
    "  ARCHESTIMATOR_CURRENT_PREVIEW_SMOKE_PROOF=1 bun scripts/prove-shared-link-current-preview-smoke.ts --deployment-url <preview-url> [--out-dir <path>]",
    "",
    "Creates disposable shared-link fixtures, runs current-preview route smoke checks through vercel curl,",
    `then deletes the fixtures from Supabase project ${EXPECTED_PROJECT_REF}.`,
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

  return {
    deploymentUrl: new URL(deploymentUrl).origin,
    outDir: values.get("out-dir") ?? DEFAULT_OUT_DIR,
  };
}

function readSupabaseProjectRef(supabaseUrl: string) {
  const hostname = new URL(supabaseUrl).hostname;
  const [projectRef] = hostname.split(".");
  return projectRef || "";
}

function requireProviderInputs() {
  if (readEnv("ARCHESTIMATOR_CURRENT_PREVIEW_SMOKE_PROOF") !== "1") {
    throw new Error("Refusing current-preview smoke provider mutation without ARCHESTIMATOR_CURRENT_PREVIEW_SMOKE_PROOF=1.");
  }

  const supabaseUrl = readEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = readEnv("SUPABASE_SERVICE_ROLE_KEY");
  const missing = [
    ["NEXT_PUBLIC_SUPABASE_URL", supabaseUrl],
    ["SUPABASE_SERVICE_ROLE_KEY", serviceRoleKey],
  ].filter(([, value]) => !value).map(([name]) => name);
  if (missing.length > 0) throw new Error(`Missing required environment variable(s): ${missing.join(", ")}.`);

  const projectRef = readSupabaseProjectRef(supabaseUrl!);
  if (projectRef !== EXPECTED_PROJECT_REF) {
    throw new Error(
      `Refusing current-preview smoke; NEXT_PUBLIC_SUPABASE_URL points to project ${projectRef || "unknown"}, expected ${EXPECTED_PROJECT_REF}.`,
    );
  }

  return { supabaseUrl: supabaseUrl!, serviceRoleKey: serviceRoleKey! };
}

function makeClient() {
  const { supabaseUrl, serviceRoleKey } = requireProviderInputs();
  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { "X-Client-Info": "archestimator-current-preview-smoke-proof" } },
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

function buildSnapshot(projectId: string, estimateId: string, rowId: string, generatedAt: string, marker: string) {
  return {
    schemaVersion: "1.3",
    generatedAt,
    project: {
      id: projectId,
      name: marker,
      projectCode: "SMOKE-SHARE",
      clientName: "Current Preview Smoke Client",
      location: "provider-fixture",
      currencyCode: "PHP",
    },
    estimates: [
      {
        id: estimateId,
        name: "Current preview smoke estimate",
        sheetCode: "SMOKE",
        updatedAt: generatedAt,
        tabs: [{ id: "00000000-0000-4000-8000-000000000001", name: "Main", sortOrder: 0, isDefault: true, rowIds: [rowId] }],
        nodes: [],
        rows: [
          {
            id: rowId,
            description: "Current preview smoke line item",
            material: "Smoke fixture material",
            quantity: 1,
            unit: "lot",
            unitCost: 1234,
            miscCost: 0,
            contingencyPercentage: 0,
          },
        ],
      },
    ],
  } satisfies Json;
}

function buildActivityTargetLabels(estimateId: string, rowId: string) {
  return {
    estimateLabels: { [estimateId]: "Current preview smoke estimate" },
    rowEstimateIds: { [rowId]: estimateId },
    rowLabels: { [rowId]: "Current preview smoke line item" },
  } satisfies Json;
}

async function createFixture({ passwordProtected = false }: { passwordProtected?: boolean } = {}): Promise<Fixture & { password?: string }> {
  const supabase = makeClient();
  const stamp = Date.now().toString(36);
  const workspaceId = randomUUID();
  const projectId = randomUUID();
  const publicationId = randomUUID();
  const recipientId = randomUUID();
  const estimateId = randomUUID();
  const rowId = randomUUID();
  const publicationToken = createPublicationToken();
  const recipientToken = createPublicationToken();
  const generatedAt = new Date().toISOString();
  const marker = `__shared_link_current_preview_smoke_${stamp}_${passwordProtected ? "password" : "open"}`;

  await must("insert workspace", supabase.from("workspaces").insert({
    id: workspaceId,
    name: marker,
    slug: marker,
  }));

  await must("insert project", supabase.from("projects").insert({
    id: projectId,
    workspace_id: workspaceId,
    name: marker,
    client_name: "Current Preview Smoke Client",
    project_code: "SMOKE-SHARE",
    location: "provider-fixture",
    currency_code: "PHP",
    metadata: { fixture: marker },
  } as never));

  await must("insert publication", supabase.from("project_publications").insert({
    id: publicationId,
    workspace_id: workspaceId,
    project_id: projectId,
    token_hash: hashPublicationToken(publicationToken, readPublicationTokenHashSecret()),
    encrypted_token: encryptPublicationToken(publicationToken, readPublicationTokenEncryptionSecret()),
    password_hash: passwordProtected ? await hashPublicationPassword(PASSWORD) : null,
    status: "published",
    snapshot_version: 2,
    selected_estimate_ids: [estimateId],
    snapshot_json: buildSnapshot(projectId, estimateId, rowId, generatedAt, marker),
    activity_target_labels_json: buildActivityTargetLabels(estimateId, rowId),
    location_visibility: "locality",
  } as never));

  await must("insert recipient", supabase.from("shared_link_recipients").insert({
    id: recipientId,
    publication_id: publicationId,
    email: `current-preview-smoke-${stamp}@example.test`,
    display_name: "Current Preview Smoke Recipient",
    recipient_token_hash: hashPublicationToken(recipientToken, readPublicationTokenHashSecret()),
    delivery_status: "sent",
  } as never));

  return {
    marker,
    password: passwordProtected ? PASSWORD : undefined,
    projectId,
    publicationId,
    publicationToken,
    recipientId,
    recipientToken,
    supabase,
    workspaceId,
  };
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

function parseVercelCurlTiming(output: string) {
  const status = Number(output.match(/http_code=(\d+)/)?.[1] ?? 0);
  const seconds = Number(output.match(/time_total=([0-9.]+)/)?.[1] ?? Number.NaN);
  if (!status || !Number.isFinite(seconds)) throw new Error("Could not parse vercel curl timing output.");
  return { status, durationMs: Math.round(seconds * 100000) / 100 };
}

function parseCookieJar(contents: string) {
  const cookies = new Map<string, string>();
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.startsWith("#HttpOnly_") ? rawLine.slice("#HttpOnly_".length) : rawLine;
    if (!line.trim() || line.startsWith("#")) continue;
    const parts = line.split("\t");
    if (parts.length < 7) continue;
    const name = parts[5];
    const value = parts.slice(6).join("\t");
    if (name && value) cookies.set(name, value);
  }
  return cookies;
}

function cookieHeaderFromJar(cookieJar: string, extra: Record<string, string> = {}) {
  const cookies = parseCookieJar(readFileSync(cookieJar, "utf8"));
  for (const [name, value] of Object.entries(extra)) cookies.set(name, value);
  return [...cookies.entries()].map(([name, value]) => `${name}=${value}`).join("; ");
}

function parseSetCookieHeaders(contents: string) {
  const cookies = new Map<string, string>();
  for (const rawLine of contents.split(/\r?\n/)) {
    const match = rawLine.match(/^set-cookie:\s*([^;]+)/i);
    if (!match?.[1]) continue;

    const separator = match[1].indexOf("=");
    if (separator <= 0) continue;

    const name = match[1].slice(0, separator).trim();
    const value = match[1].slice(separator + 1);
    if (name && value) cookies.set(name, value);
  }
  return cookies;
}

function cookieHeaderFromSetCookieFile(headerFile: string, extra: Record<string, string> = {}) {
  const cookies = parseSetCookieHeaders(readFileSync(headerFile, "utf8"));
  for (const [name, value] of Object.entries(extra)) cookies.set(name, value);
  return [...cookies.entries()].map(([name, value]) => `${name}=${value}`).join("; ");
}

function cookieNamesFromSetCookieFile(headerFile: string) {
  return [...parseSetCookieHeaders(readFileSync(headerFile, "utf8")).keys()];
}

async function cleanupFixture(fixture: Fixture) {
  const { publicationId, projectId, recipientId, supabase, workspaceId } = fixture;
  await must("cleanup workspace", supabase.from("workspaces").delete().eq("id", workspaceId));
  return {
    project_publication_events: await countRows(supabase, "project_publication_events", "publication_id", publicationId),
    project_publications: await countRows(supabase, "project_publications", "id", publicationId),
    projects: await countRows(supabase, "projects", "id", projectId),
    shared_link_comments: await countRows(supabase, "shared_link_comments", "publication_id", publicationId),
    shared_link_events: await countRows(supabase, "shared_link_events", "publication_id", publicationId),
    shared_link_recipients: await countRows(supabase, "shared_link_recipients", "id", recipientId),
    shared_link_responses: await countRows(supabase, "shared_link_responses", "publication_id", publicationId),
    workspaces: await countRows(supabase, "workspaces", "id", workspaceId),
  };
}

function cleanupPassed(counts: Awaited<ReturnType<typeof cleanupFixture>>) {
  return Object.values(counts).every((count) => count === 0);
}

function statusResult(output: string, expectedStatus: number): SmokeStatus {
  const parsed = parseVercelCurlTiming(output);
  return {
    durationMs: parsed.durationMs,
    expectedStatus,
    ok: parsed.status === expectedStatus,
    status: parsed.status,
  };
}

async function runProof(options: CliOptions) {
  const openFixture = await createFixture();
  const passwordFixture = await createFixture({ passwordProtected: true });
  let openCleanup: Awaited<ReturnType<typeof cleanupFixture>> | null = null;
  let passwordCleanup: Awaited<ReturnType<typeof cleanupFixture>> | null = null;

  try {
    const sessionHeaderFile = `/tmp/archestimator-current-preview-smoke-${openFixture.marker}.session.headers`;
    const htmlFile = `/tmp/archestimator-current-preview-smoke-${openFixture.marker}.html`;
    const sessionCsrf = createPublicPostCsrfToken();
    const sessionOutput = runVercelCurl(
      `/api/share/${openFixture.publicationToken}/session`,
      options.deploymentUrl,
      [
        "--silent",
        "--dump-header",
        sessionHeaderFile,
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
        `x-archestimator-csrf: ${sessionCsrf}`,
        "--cookie",
        `ae_publication_csrf=${sessionCsrf}`,
        "--data",
        JSON.stringify({ recipientToken: openFixture.recipientToken }),
      ],
    );
    const sessionStart = statusResult(sessionOutput, 200);
    const sessionCookieNames = cookieNamesFromSetCookieFile(sessionHeaderFile)
      .filter((name) => name.startsWith("shared_link_session_"));
    sessionStart.cookieNames = sessionCookieNames;
    sessionStart.ok = sessionStart.ok
      && sessionCookieNames.some((name) => !name.endsWith("_ok"))
      && sessionCookieNames.some((name) => name.endsWith("_ok"));

    const sessionCookieHeader = cookieHeaderFromSetCookieFile(sessionHeaderFile);
    const openOutput = runVercelCurl(
      `/share/${openFixture.publicationToken}`,
      options.deploymentUrl,
      [
        "--silent",
        "--output",
        htmlFile,
        "--write-out",
        "http_code=%{http_code}\ntime_total=%{time_total}\n",
        "--cookie",
        sessionCookieHeader,
      ],
    );
    const openLink = statusResult(openOutput, 200);
    const body = readFileSync(htmlFile, "utf8");
    openLink.bodyIncludesExpectedText = body.includes(openFixture.marker) || body.includes("Current preview smoke line item");
    openLink.ok = openLink.ok && Boolean(openLink.bodyIncludesExpectedText);

    const csrf = createPublicPostCsrfToken();
    const postCookieHeader = cookieHeaderFromSetCookieFile(sessionHeaderFile, { ae_publication_csrf: csrf });

    const activityOutput = runVercelCurl(`/api/share/${openFixture.publicationToken}/activity?limit=20`, options.deploymentUrl, [
      "--silent",
      "--output",
      "/dev/null",
      "--write-out",
      "http_code=%{http_code}\ntime_total=%{time_total}\n",
      "--header",
      `origin: ${options.deploymentUrl}`,
      "--cookie",
      sessionCookieHeader,
    ]);
    const activity = statusResult(activityOutput, 200);

    const commentOutput = runVercelCurl(`/api/share/${openFixture.publicationToken}/comment`, options.deploymentUrl, [
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
      postCookieHeader,
      "--data",
      JSON.stringify({ body: "Current preview stale comment proof", viewToken: "tampered-view-token" }),
    ]);
    const staleComment = statusResult(commentOutput, 409);

    const decisionOutput = runVercelCurl(`/api/share/${openFixture.publicationToken}/decision`, options.deploymentUrl, [
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
      postCookieHeader,
      "--data",
      JSON.stringify({ decision: "declined", note: "Current preview stale decision proof", viewToken: "tampered-view-token" }),
    ]);
    const staleDecision = statusResult(decisionOutput, 409);

    const passwordCsrf = createPublicPostCsrfToken();
    const passwordCookieHeader = `ae_publication_csrf=${passwordCsrf}`;
    const passwordPath = `/api/share/${passwordFixture.publicationToken}/password`;
    const wrongPasswordOutput = runVercelCurl(passwordPath, options.deploymentUrl, [
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
      `x-archestimator-csrf: ${passwordCsrf}`,
      "--cookie",
      passwordCookieHeader,
      "--data",
      JSON.stringify({ password: "wrong-password" }),
    ]);
    const wrongPassword = statusResult(wrongPasswordOutput, 401);

    const correctPasswordOutput = runVercelCurl(passwordPath, options.deploymentUrl, [
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
      `x-archestimator-csrf: ${passwordCsrf}`,
      "--cookie",
      passwordCookieHeader,
      "--data",
      JSON.stringify({ password: passwordFixture.password }),
    ]);
    const correctPassword = statusResult(correctPasswordOutput, 204);

    openCleanup = await cleanupFixture(openFixture);
    passwordCleanup = await cleanupFixture(passwordFixture);

    const checks = { activity, correctPassword, openLink, sessionStart, staleComment, staleDecision, wrongPassword };
    const passed = Object.values(checks).every((check) => check.ok) && cleanupPassed(openCleanup) && cleanupPassed(passwordCleanup);

    return {
      cleanup: { openFixture: openCleanup, passwordFixture: passwordCleanup },
      deploymentUrl: options.deploymentUrl,
      generatedAt: new Date().toISOString(),
      gitSha: gitSha(),
      mode: "current-preview-section-6-smoke",
      passed,
      checks,
      notes: [
        "6.2 wrong-password ARIA is proven by the targeted component test; this hosted smoke proves wrong/correct route behavior.",
        "6.5 authenticated owner Activity-tab UI is proven by targeted tests; this hosted smoke proves public activity route health and no public feed mount is covered by tests.",
        "Raw publication tokens, recipient tokens, passwords, CSRF tokens, cookies, and provider credentials are not written.",
      ],
    };
  } finally {
    if (!openCleanup) await cleanupFixture(openFixture);
    if (!passwordCleanup) await cleanupFixture(passwordFixture);
  }
}

function gitSha() {
  const result = spawnSync("git", ["rev-parse", "--short", "HEAD"], {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: "pipe",
  });
  return result.status === 0 ? result.stdout.trim() : "unknown";
}

function renderMarkdown(report: Awaited<ReturnType<typeof runProof>>) {
  const rows = [
    ["6.1", "Open recipient link", "200 and rendered fixture text", report.checks.openLink],
    ["6.2", "Password route", "wrong 401, correct 204", { ...report.checks.correctPassword, ok: report.checks.wrongPassword.ok && report.checks.correctPassword.ok, status: `${report.checks.wrongPassword.status}/${report.checks.correctPassword.status}`, expectedStatus: "401/204" }],
    ["6.3", "Comment stale snapshot", "409", report.checks.staleComment],
    ["6.4", "Decision stale snapshot", "409", report.checks.staleDecision],
    ["6.5", "Public activity route", "200", report.checks.activity],
    ["6.6", "Recipient session cookies", "shared_link_session_* and shared_link_session_*_ok set", report.checks.sessionStart],
  ] as const;

  const table = rows.map(([id, check, expected, result]) => (
    `| ${id} | ${check} | ${expected} | ${result.status} | ${result.ok ? "PASS" : "FAIL"} |`
  )).join("\n");

  return `# Current Preview Shared-Link Section 6 Smoke Proof

Status: **${report.passed ? "PASS" : "FAIL"}**

- Generated: \`${report.generatedAt}\`
- Git SHA: \`${report.gitSha}\`
- Supabase project: \`${EXPECTED_PROJECT_REF}\`
- Preview deployment: \`${report.deploymentUrl}\`
- Mode: \`${report.mode}\`

| Runbook row | Check | Expected | Observed status | Result |
| --- | --- | --- | ---: | --- |
${table}

## Cleanup Counts

\`\`\`json
${JSON.stringify(report.cleanup, null, 2)}
\`\`\`

## Notes

- 6.2 wrong-password ARIA association is covered by \`tests/vitest/project-publication-page.test.tsx\`; hosted smoke proves wrong/correct route status on the current preview.
- 6.5 authenticated owner Activity-tab rendering is covered by \`tests/vitest/project-publication-activity.test.tsx\`; hosted smoke proves public activity route health on the current preview, and \`tests/vitest/project-publication-page.test.tsx\` proves the public page does not mount the activity feed.
- 6.7 provider advisors are closed by the scoped owner/DBA waiver and baseline disposition, not by this route smoke.
- Raw publication tokens, recipient tokens, passwords, CSRF tokens, cookies, and provider credentials are not written to this artifact.
`;
}

function writeReports(report: Awaited<ReturnType<typeof runProof>>, outDir: string) {
  const resolved = resolve(outDir);
  mkdirSync(resolved, { recursive: true });
  const jsonFile = join(resolved, "current-preview-section-6-smoke-raw.json");
  const markdownFile = join(resolved, "current-preview-section-6-smoke-summary.md");
  writeFileSync(jsonFile, `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(markdownFile, renderMarkdown(report));
  return { jsonFile, markdownFile };
}

async function main() {
  const options = parseArgs();
  const report = await runProof(options);
  const files = writeReports(report, options.outDir);
  console.log(`current-preview section-6 smoke proof: ${report.passed ? "PASS" : "FAIL"}`);
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
