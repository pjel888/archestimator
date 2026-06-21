#!/usr/bin/env bun

import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { createClient, type PostgrestError } from "@supabase/supabase-js";

import {
  createPublicationToken,
  encryptPublicationToken,
  hashPublicationToken,
  readPublicationTokenEncryptionSecret,
  readPublicationTokenHashSecret,
} from "../src/lib/publication/security";
import type { Database, Json } from "../src/lib/supabase/types";

const DEFAULT_OUT_DIR = ".ai/03_plans/2026-06-20-Shared-Link-Feature/evidence/perf-archive-readiness-2026-06-21";
const EXPECTED_PROJECT_REF = "ebxxqidacheyapmmzavr";
const RECIPIENT_TTI_BUDGET_MS = 2500;
const ACTIVITY_ROUTE_BUDGET_MS = 1200;
const ACTIVITY_LIMIT = 100;
const DEFAULT_WARMUPS = 3;

type CliOptions = {
  deploymentUrl: string;
  outDir: string;
  samples: number;
  warmups: number;
};

type TimingSample = {
  status: number;
  durationMs: number;
};

type ProviderActivitySample = {
  comments: number;
  durationMs: number;
  recipients: number;
};

type CleanupCounts = Record<
  | "project_publication_events"
  | "project_publications"
  | "projects"
  | "shared_link_comments"
  | "shared_link_events"
  | "shared_link_recipients"
  | "shared_link_responses"
  | "workspaces",
  number
>;

function usage() {
  return [
    "Usage:",
    "  ARCHESTIMATOR_HOSTED_RECIPIENT_ACTIVITY_PROOF=1 bun scripts/prove-shared-link-hosted-recipient-activity.ts --deployment-url <preview-url> [--samples 20] [--warmups 3] [--out-dir <path>]",
    "",
    "Creates a disposable no-password publication with a recipient and 100 public activity rows,",
    `measures hosted recipient-link and activity API p95 through vercel curl, then deletes the fixture from Supabase project ${EXPECTED_PROJECT_REF}.`,
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

  const samples = Number.parseInt(values.get("samples") ?? "20", 10);
  if (!Number.isInteger(samples) || samples <= 0) throw new Error("--samples must be a positive integer.");
  const warmups = Number.parseInt(values.get("warmups") ?? String(DEFAULT_WARMUPS), 10);
  if (!Number.isInteger(warmups) || warmups < 0) throw new Error("--warmups must be a non-negative integer.");

  return {
    deploymentUrl: new URL(deploymentUrl).origin,
    outDir: values.get("out-dir") ?? DEFAULT_OUT_DIR,
    samples,
    warmups,
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
  const seconds = Number(output.match(/time_total=([0-9.]+)/)?.[1] ?? Number.NaN);
  if (!status || !Number.isFinite(seconds)) {
    throw new Error("Could not parse vercel curl timing output.");
  }
  return { status, durationMs: roundMs(seconds * 1000) };
}

function readSupabaseProjectRef(supabaseUrl: string) {
  const hostname = new URL(supabaseUrl).hostname;
  const [projectRef] = hostname.split(".");
  return projectRef || "";
}

function requireProviderInputs() {
  if (readEnv("ARCHESTIMATOR_HOSTED_RECIPIENT_ACTIVITY_PROOF") !== "1") {
    throw new Error("Refusing hosted recipient/activity provider mutation without ARCHESTIMATOR_HOSTED_RECIPIENT_ACTIVITY_PROOF=1.");
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
    throw new Error(`Refusing hosted recipient/activity proof; NEXT_PUBLIC_SUPABASE_URL points to project ${projectRef || "unknown"}, expected ${EXPECTED_PROJECT_REF}.`);
  }

  return { supabaseUrl: supabaseUrl!, serviceRoleKey: serviceRoleKey! };
}

function makeClient() {
  const { supabaseUrl, serviceRoleKey } = requireProviderInputs();
  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { "X-Client-Info": "archestimator-hosted-recipient-activity-proof" } },
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

function buildActivityTargetLabels(rowIds: string[], estimateId: string) {
  const rowLabels: Record<string, string> = {};
  const rowEstimateIds: Record<string, string> = {};
  rowIds.forEach((rowId, index) => {
    rowLabels[rowId] = `Fixture line ${String(index + 1).padStart(3, "0")}`;
    rowEstimateIds[rowId] = estimateId;
  });
  return {
    estimateLabels: { [estimateId]: "Hosted activity fixture estimate" },
    rowEstimateIds,
    rowLabels,
  } satisfies Json;
}

function buildSnapshot(projectId: string, estimateId: string, rowIds: string[], generatedAt: string) {
  return {
    schemaVersion: "1.3",
    generatedAt,
    project: {
      id: projectId,
      name: "Hosted recipient/activity fixture",
      projectCode: "PERF-ACTIVITY",
      clientName: "Hosted Recipient Activity Fixture",
      location: "provider-fixture",
      currencyCode: "PHP",
    },
    estimates: [
      {
        id: estimateId,
        name: "Hosted activity fixture estimate",
        sheetCode: "PERF-ACT",
        updatedAt: generatedAt,
        tabs: [{ id: "00000000-0000-4000-8000-000000000001", name: "Main", sortOrder: 0, isDefault: true, rowIds }],
        nodes: [],
        rows: rowIds.map((rowId, index) => ({
          id: rowId,
          description: `Fixture activity line item ${index + 1}`,
          material: `Fixture material ${index + 1}`,
          quantity: (index % 9) + 1,
          unit: "lot",
          unitCost: 1000 + index,
          miscCost: 0,
          contingencyPercentage: 0,
        })),
      },
    ],
  } satisfies Json;
}

async function createFixture() {
  const supabase = makeClient();
  const stamp = Date.now().toString(36);
  const workspaceId = randomUUID();
  const projectId = randomUUID();
  const publicationId = randomUUID();
  const recipientId = randomUUID();
  const estimateId = randomUUID();
  const rowIds = Array.from({ length: ACTIVITY_LIMIT }, () => randomUUID());
  const publicationToken = createPublicationToken();
  const publicationTokenHash = hashPublicationToken(publicationToken, readPublicationTokenHashSecret());
  const recipientToken = createPublicationToken();
  const generatedAt = new Date().toISOString();
  const marker = `__shared_link_recipient_activity_${stamp}`;
  const activityLabels = buildActivityTargetLabels(rowIds, estimateId);

  await must("insert workspace", supabase.from("workspaces").insert({
    id: workspaceId,
    name: marker,
    slug: marker,
  }));

  await must("insert project", supabase.from("projects").insert({
    id: projectId,
    workspace_id: workspaceId,
    name: marker,
    client_name: "Hosted Recipient Activity Fixture",
    project_code: "PERF-ACTIVITY",
    location: "provider-fixture",
    currency_code: "PHP",
    metadata: { fixture: marker },
  } as never));

  await must("insert publication", supabase.from("project_publications").insert({
    id: publicationId,
    workspace_id: workspaceId,
    project_id: projectId,
    token_hash: publicationTokenHash,
    encrypted_token: encryptPublicationToken(publicationToken, readPublicationTokenEncryptionSecret()),
    password_hash: null,
    status: "published",
    snapshot_version: 1,
    selected_estimate_ids: [estimateId],
    snapshot_json: buildSnapshot(projectId, estimateId, rowIds, generatedAt),
    activity_target_labels_json: activityLabels,
    location_visibility: "locality",
  } as never));

  await must("insert recipient", supabase.from("shared_link_recipients").insert({
    id: recipientId,
    publication_id: publicationId,
    email: `recipient-activity-${stamp}@example.test`,
    display_name: "Hosted Activity Recipient",
    recipient_token_hash: hashPublicationToken(recipientToken, readPublicationTokenHashSecret()),
    delivery_status: "sent",
  } as never));

  await must("insert comments", supabase.from("shared_link_comments").insert(rowIds.map((rowId, index) => ({
    publication_id: publicationId,
    recipient_id: recipientId,
    author_email: `recipient-activity-${stamp}@example.test`,
    author_name: "Hosted Activity Recipient",
    body: `Public fixture comment ${index + 1}`,
    estimate_id: estimateId,
    row_id: rowId,
    is_internal: false,
    snapshot_version_at_comment: 1,
    target_kind: "row",
    target_label: `Fixture line ${String(index + 1).padStart(3, "0")}`,
    target_secondary_label: "Hosted activity fixture estimate",
    created_at: new Date(Date.now() - index * 1000).toISOString(),
  })) as never));

  return {
    marker,
    projectId,
    publicationId,
    publicationToken,
    publicationTokenHash,
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

async function cleanupFixture(fixture: Awaited<ReturnType<typeof createFixture>>): Promise<CleanupCounts> {
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

function cleanupPassed(counts: CleanupCounts) {
  return Object.values(counts).every((count) => count === 0);
}

function gitSha() {
  const result = spawnSync("git", ["rev-parse", "--short", "HEAD"], {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: "pipe",
  });
  return result.status === 0 ? result.stdout.trim() : "unknown";
}

function sampleTimingRows(samples: TimingSample[]) {
  return samples.map((sample, index) => `| ${index + 1} | ${sample.status} | ${sample.durationMs.toFixed(2)} ms |`).join("\n");
}

function sampleProviderRows(samples: ProviderActivitySample[]) {
  return samples
    .map((sample, index) => `| ${index + 1} | ${sample.comments} | ${sample.recipients} | ${sample.durationMs.toFixed(2)} ms |`)
    .join("\n");
}

function renderMarkdown(report: Awaited<ReturnType<typeof runProof>>) {
  return `# Hosted Shared-Link Recipient + Activity Performance Proof

Status: **${report.passed ? "PASS" : "FAIL"}**

- Generated: \`${report.generatedAt}\`
- Git SHA: \`${report.gitSha}\`
- Supabase project: \`${EXPECTED_PROJECT_REF}\`
- Preview deployment: \`${report.deploymentUrl}\`
- Recipient route: \`/share/<redacted-token>?recipient=<redacted>\`
- Activity route: \`/api/share/<redacted-token>/activity?limit=${ACTIVITY_LIMIT}\`
- Samples per route: \`${report.samplesPerRoute}\`
- Warm-up samples per route: \`${report.warmupsPerRoute}\` (reported in JSON; excluded from p50/p95)
- Recipient-link p50/p95: \`${report.recipient.p50Ms.toFixed(2)} ms\` / \`${report.recipient.p95Ms.toFixed(2)} ms\` (budget \`${RECIPIENT_TTI_BUDGET_MS} ms\`)
- Hosted activity API p50/p95: \`${report.hostedActivity.p50Ms.toFixed(2)} ms\` / \`${report.hostedActivity.p95Ms.toFixed(2)} ms\` (observed through protected-preview tunnel; not the PERF-04 close gate)
- Provider activity query p50/p95: \`${report.providerActivity.p50Ms.toFixed(2)} ms\` / \`${report.providerActivity.p95Ms.toFixed(2)} ms\` (budget \`${ACTIVITY_ROUTE_BUDGET_MS} ms\`)
- Cleanup: **${cleanupPassed(report.cleanupCounts) ? "PASS" : "FAIL"}**

## Recipient-Link Samples

| Sample | HTTP status | Total route time |
| ---: | ---: | ---: |
${sampleTimingRows(report.recipient.samples)}

## Activity API Samples

| Sample | HTTP status | Total route time |
| ---: | ---: | ---: |
${sampleTimingRows(report.hostedActivity.samples)}

## Provider Activity Query Samples

| Sample | Comments | Recipients | Query-shape time |
| ---: | ---: | ---: | ---: |
${sampleProviderRows(report.providerActivity.samples)}

## Cleanup Counts

\`\`\`json
${JSON.stringify(report.cleanupCounts, null, 2)}
\`\`\`

Notes: recipient and hosted-activity measurements use \`vercel curl\` against the protected preview deployment. Recipient-link timing gates PERF-01A. Hosted activity must return HTTP 200, but PERF-04 is closed by the provider activity query harness because the plan accepts provider-side timing for the indexed query shape and the protected-preview tunnel adds non-app variance. The provider harness performs the route's compact-publication lookup, public comment page, and recipient-label lookup without selecting \`snapshot_json\`. The fixture writes one disposable no-password publication, one recipient, and ${ACTIVITY_LIMIT} public comments, then deletes the workspace and verifies cascade cleanup. Raw publication tokens, recipient tokens, cookies, and provider credentials are never written to this artifact.
`;
}

async function measureRouteSamples(
  samples: number,
  warmups: number,
  worker: (index: number) => TimingSample,
) {
  const warmupSamples: TimingSample[] = [];
  for (let index = 0; index < warmups; index += 1) warmupSamples.push(worker(index));

  const collected: TimingSample[] = [];
  for (let index = 0; index < samples; index += 1) collected.push(worker(index));
  const durations = collected.map((sample) => sample.durationMs);
  return {
    p50Ms: percentile(durations, 0.5),
    p95Ms: percentile(durations, 0.95),
    samples: collected,
    warmupSamples,
  };
}

async function measureProviderActivitySamples(
  fixture: Awaited<ReturnType<typeof createFixture>>,
  samples: number,
  warmups: number,
) {
  async function sample(): Promise<ProviderActivitySample> {
    const startedAt = performance.now();
    const pub = await must("provider activity publication lookup", fixture.supabase
      .from("project_publications")
      .select("id, status, revoked_at, expires_at, password_hash, activity_target_labels_json, snapshot_version")
      .eq("token_hash", fixture.publicationTokenHash)
      .maybeSingle());
    if (!pub?.id) throw new Error("Provider activity publication lookup returned no row.");

    const comments = await must("provider activity comments lookup", fixture.supabase
      .from("shared_link_comments")
      .select("id, created_at, is_internal, author_email, author_name, recipient_id, estimate_id, row_id, target_kind, target_label, target_secondary_label, snapshot_version_at_comment")
      .eq("publication_id", pub.id)
      .eq("is_internal", false)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(ACTIVITY_LIMIT + 1));

    const recipientIds = new Set<string>();
    for (const comment of comments ?? []) if (comment.recipient_id) recipientIds.add(comment.recipient_id);

    let recipientsCount = 0;
    if (recipientIds.size > 0) {
      const recipients = await must("provider activity recipient-label lookup", fixture.supabase
        .from("shared_link_recipients")
        .select("id, display_name")
        .eq("publication_id", pub.id)
        .in("id", Array.from(recipientIds))
        .limit(500));
      recipientsCount = recipients?.length ?? 0;
    }

    return {
      comments: comments?.length ?? 0,
      durationMs: roundMs(performance.now() - startedAt),
      recipients: recipientsCount,
    };
  }

  const warmupSamples: ProviderActivitySample[] = [];
  for (let index = 0; index < warmups; index += 1) warmupSamples.push(await sample());

  const collected: ProviderActivitySample[] = [];
  for (let index = 0; index < samples; index += 1) collected.push(await sample());

  const durations = collected.map((sampleRow) => sampleRow.durationMs);
  return {
    p50Ms: percentile(durations, 0.5),
    p95Ms: percentile(durations, 0.95),
    samples: collected,
    warmupSamples,
  };
}

async function runProof(options: CliOptions) {
  const fixture = await createFixture();
  let cleanupCounts: CleanupCounts | null = null;

  try {
    const recipientPath = `/share/${fixture.publicationToken}?recipient=${fixture.recipientToken}`;
    const activityPath = `/api/share/${fixture.publicationToken}/activity?limit=${ACTIVITY_LIMIT}`;
    const cookieJar = `/tmp/archestimator-shared-link-recipient-${fixture.marker}.cookies`;

    const recipient = await measureRouteSamples(options.samples, options.warmups, () => parseVercelCurlTiming(runVercelCurl(recipientPath, options.deploymentUrl, [
      "--silent",
      "--location",
      "--output",
      "/dev/null",
      "--cookie-jar",
      cookieJar,
      "--write-out",
      "http_code=%{http_code}\ntime_total=%{time_total}\n",
    ])));

    const hostedActivity = await measureRouteSamples(options.samples, options.warmups, () => parseVercelCurlTiming(runVercelCurl(activityPath, options.deploymentUrl, [
      "--silent",
      "--output",
      "/dev/null",
      "--write-out",
      "http_code=%{http_code}\ntime_total=%{time_total}\n",
      "--header",
      `origin: ${options.deploymentUrl}`,
    ])));

    const providerActivity = await measureProviderActivitySamples(fixture, options.samples, options.warmups);

    cleanupCounts = await cleanupFixture(fixture);
    const passed =
      recipient.samples.every((sample) => sample.status === 200)
      && hostedActivity.samples.every((sample) => sample.status === 200)
      && recipient.p95Ms <= RECIPIENT_TTI_BUDGET_MS
      && providerActivity.samples.every((sample) => sample.comments >= ACTIVITY_LIMIT)
      && providerActivity.p95Ms <= ACTIVITY_ROUTE_BUDGET_MS
      && cleanupPassed(cleanupCounts);

    return {
      cleanupCounts,
      deploymentUrl: options.deploymentUrl,
      generatedAt: new Date().toISOString(),
      gitSha: gitSha(),
      hostedActivity,
      mode: "hosted-recipient-activity-proof",
      passed,
      providerActivity,
      recipient,
      samplesPerRoute: options.samples,
      warmupsPerRoute: options.warmups,
    };
  } finally {
    if (!cleanupCounts) await cleanupFixture(fixture);
  }
}

function writeReports(report: Awaited<ReturnType<typeof runProof>>, outDir: string) {
  const resolved = resolve(outDir);
  mkdirSync(resolved, { recursive: true });
  const jsonFile = join(resolved, "hosted-recipient-activity-raw.json");
  const markdownFile = join(resolved, "hosted-recipient-activity-summary.md");
  writeFileSync(jsonFile, `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(markdownFile, renderMarkdown(report));
  return { jsonFile, markdownFile };
}

async function main() {
  const options = parseArgs();
  const report = await runProof(options);
  const files = writeReports(report, options.outDir);
  console.log(`hosted recipient/activity proof: ${report.passed ? "PASS" : "FAIL"} recipient_p95=${report.recipient.p95Ms.toFixed(2)}ms provider_activity_p95=${report.providerActivity.p95Ms.toFixed(2)}ms hosted_activity_p95=${report.hostedActivity.p95Ms.toFixed(2)}ms`);
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
