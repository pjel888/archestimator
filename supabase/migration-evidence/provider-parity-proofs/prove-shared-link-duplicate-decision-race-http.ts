#!/usr/bin/env bun

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { createClient, type PostgrestError } from "@supabase/supabase-js";

import type { Database } from "../src/lib/supabase/types";

const DEFAULT_OUT_DIR = ".ai/03_plans/2026-06-20-Shared-Link-Feature/evidence/provider-race";

type RpcOutcome = {
  ok: boolean;
  responseId: string | null;
  errorMessage: string | null;
  status: number | null;
  durationMs: number;
};

type CleanupCounts = Record<"responses" | "recipients" | "publications" | "projects" | "workspaces", number>;

function readEnv(name: string) {
  return process.env[name]?.trim() || undefined;
}

function today() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(new Date());
}

function roundMs(value: number) {
  return Math.round(value * 100) / 100;
}

function requireEnv() {
  const allowProviderMutation = readEnv("ARCHESTIMATOR_PROVIDER_RACE_HTTP_PROOF") === "1";
  if (!allowProviderMutation) {
    throw new Error("Refusing provider mutation without ARCHESTIMATOR_PROVIDER_RACE_HTTP_PROOF=1.");
  }

  const supabaseUrl = readEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = readEnv("SUPABASE_SERVICE_ROLE_KEY");
  const missing = [
    ["NEXT_PUBLIC_SUPABASE_URL", supabaseUrl],
    ["SUPABASE_SERVICE_ROLE_KEY", serviceRoleKey],
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name);

  if (missing.length > 0) throw new Error(`Missing required environment variable(s): ${missing.join(", ")}.`);
  return { supabaseUrl: supabaseUrl!, serviceRoleKey: serviceRoleKey! };
}

function makeClient() {
  const { supabaseUrl, serviceRoleKey } = requireEnv();
  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        "X-Client-Info": "archestimator-qa-g06-race-proof",
      },
    },
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

async function rpcDecision(
  supabase: ReturnType<typeof makeClient>,
  args: Database["public"]["Functions"]["submit_client_response"]["Args"],
): Promise<RpcOutcome> {
  const startedAt = performance.now();
  const { data, error, status } = await supabase.rpc("submit_client_response", args);
  return {
    ok: !error && typeof data === "string",
    responseId: typeof data === "string" ? data : null,
    errorMessage: describeError(error),
    status,
    durationMs: roundMs(performance.now() - startedAt),
  };
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

async function cleanupFixture(supabase: ReturnType<typeof makeClient>, ids: {
  workspaceId: string;
  projectId: string;
  publicationId: string;
  recipientId: string;
}) {
  await must("cleanup responses", supabase.from("shared_link_responses").delete().eq("publication_id", ids.publicationId));
  await must("cleanup recipients", supabase.from("shared_link_recipients").delete().eq("publication_id", ids.publicationId));
  await must("cleanup publication", supabase.from("project_publications").delete().eq("id", ids.publicationId));
  await must("cleanup project", supabase.from("projects").delete().eq("id", ids.projectId));
  await must("cleanup workspace", supabase.from("workspaces").delete().eq("id", ids.workspaceId));

  return {
    responses: await countRows(supabase, "shared_link_responses", "publication_id", ids.publicationId),
    recipients: await countRows(supabase, "shared_link_recipients", "publication_id", ids.publicationId),
    publications: await countRows(supabase, "project_publications", "id", ids.publicationId),
    projects: await countRows(supabase, "projects", "id", ids.projectId),
    workspaces: await countRows(supabase, "workspaces", "id", ids.workspaceId),
  } satisfies CleanupCounts;
}

function cleanupPassed(counts: CleanupCounts) {
  return Object.values(counts).every((count) => count === 0);
}

async function runProof() {
  const supabase = makeClient();
  const stamp = Date.now().toString(36);
  const ids = {
    workspaceId: crypto.randomUUID(),
    projectId: crypto.randomUUID(),
    publicationId: crypto.randomUUID(),
    recipientId: crypto.randomUUID(),
  };
  const tokenHash = `qa-g06-http-token-${stamp}-${crypto.randomUUID()}`;
  const recipientTokenHash = `qa-g06-http-recipient-${stamp}-${crypto.randomUUID()}`;

  let cleanupCounts: CleanupCounts | null = null;
  let responseCount = -1;
  let outcomes: RpcOutcome[] = [];

  try {
    await must(
      "insert workspace",
      supabase.from("workspaces").insert({
        id: ids.workspaceId,
        name: "QA-G06 HTTP race workspace",
        slug: `qa-g06-http-${stamp}`,
      }),
    );

    await must(
      "insert project",
      supabase.from("projects").insert({
        id: ids.projectId,
        workspace_id: ids.workspaceId,
        name: "QA-G06 HTTP race project",
      }),
    );

    await must(
      "insert publication",
      supabase.from("project_publications").insert({
        id: ids.publicationId,
        workspace_id: ids.workspaceId,
        project_id: ids.projectId,
        token_hash: tokenHash,
        encrypted_token: "qa-g06-redacted-token",
        status: "published",
        snapshot_version: 1,
        selected_estimate_ids: [],
        snapshot_json: { estimates: [] },
      }),
    );

    await must(
      "insert recipient",
      supabase.from("shared_link_recipients").insert({
        id: ids.recipientId,
        publication_id: ids.publicationId,
        email: `qa-g06-http-${stamp}@archestimator.local`,
        recipient_token_hash: recipientTokenHash,
      }),
    );

    const args: Database["public"]["Functions"]["submit_client_response"]["Args"] = {
      p_token_hash: tokenHash,
      p_recipient_token_hash: recipientTokenHash,
      p_decision: "accepted",
      p_note: "QA-G06 duplicate race proof over service-role HTTP RPC",
      p_expected_snapshot_version: 1,
      p_estimate_id: null,
      p_row_id: null,
      p_signer_name: "QA G06 Reviewer",
      p_signature_intent_hash: null,
      p_target_kind: "proposal",
      p_target_label: "the proposal",
      p_target_secondary_label: null,
    };

    outcomes = await Promise.all([rpcDecision(supabase, args), rpcDecision(supabase, args)]);

    responseCount = await countRows(supabase, "shared_link_responses", "publication_id", ids.publicationId);
  } finally {
    cleanupCounts = await cleanupFixture(supabase, ids);
  }

  const successCount = outcomes.filter((outcome) => outcome.ok).length;
  const duplicateCount = outcomes.filter((outcome) => outcome.errorMessage?.includes("Decision already submitted.")).length;
  const passed = successCount === 1 && duplicateCount === 1 && responseCount === 1 && cleanupCounts !== null && cleanupPassed(cleanupCounts);

  return {
    generatedAt: new Date().toISOString(),
    mode: "qa-g06-provider-http-race-proof",
    passed,
    fixture: {
      workspaceId: ids.workspaceId,
      projectId: ids.projectId,
      publicationId: ids.publicationId,
      recipientId: ids.recipientId,
    },
    assertions: {
      successCount,
      duplicateCount,
      responseCountBeforeCleanup: responseCount,
      cleanupCounts,
    },
    outcomes,
    note:
      "Provider-safe service-role HTTP/RPC proof. It mutates only temporary qa-g06-* rows, verifies one accepted decision plus one duplicate rejection, and verifies cleanup counts are zero.",
  };
}

function renderMarkdown(report: Awaited<ReturnType<typeof runProof>>) {
  const outcomeRows = report.outcomes
    .map(
      (outcome, index) =>
        `| ${index + 1} | ${outcome.ok ? "success" : "error"} | ${outcome.status ?? "n/a"} | ${outcome.durationMs} ms | ${outcome.errorMessage ?? "none"} |`,
    )
    .join("\n");
  const cleanupRows = Object.entries(report.assertions.cleanupCounts ?? {})
    .map(([table, count]) => `| ${table} | ${count} |`)
    .join("\n");

  return `# QA-G06 provider duplicate-decision race proof

Status: **${report.passed ? "PASS" : "FAIL"}**

- Generated: \`${report.generatedAt}\`
- Mode: \`${report.mode}\`
- Publication fixture: \`${report.fixture.publicationId}\`
- Recipient fixture: \`${report.fixture.recipientId}\`

## Assertions

| Assertion | Value |
| --- | ---: |
| Successful RPC calls | ${report.assertions.successCount} |
| Duplicate-decision RPC failures | ${report.assertions.duplicateCount} |
| Response rows before cleanup | ${report.assertions.responseCountBeforeCleanup} |

## RPC outcomes

| Attempt | Result | HTTP status | Duration | Error |
| ---: | --- | ---: | ---: | --- |
${outcomeRows}

## Cleanup verification

| Object set | Remaining rows |
| --- | ---: |
${cleanupRows}

${report.note}
`;
}

function writeReports(report: Awaited<ReturnType<typeof runProof>>) {
  const date = today();
  const base = resolve(DEFAULT_OUT_DIR, `duplicate-decision-race-http-${date}`);
  mkdirSync(dirname(`${base}.json`), { recursive: true });
  writeFileSync(`${base}.json`, `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(`${base}.md`, renderMarkdown(report));
  return { jsonFile: `${base}.json`, markdownFile: `${base}.md` };
}

if (import.meta.main) {
  try {
    const report = await runProof();
    const files = writeReports(report);
    console.log(`QA-G06 provider HTTP race proof: ${report.passed ? "PASS" : "FAIL"}`);
    console.log(`Wrote ${files.markdownFile}`);
    console.log(`Wrote ${files.jsonFile}`);
    if (!report.passed) process.exit(1);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
