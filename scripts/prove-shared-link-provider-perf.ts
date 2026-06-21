#!/usr/bin/env bun

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";

type CliOptions = {
  outDir: string;
  samples: number;
};

type SupabaseQueryOutput = {
  rows?: Array<Record<string, unknown>>;
};

const EXPECTED_PROJECT_REF = "ebxxqidacheyapmmzavr";
const DEFAULT_OUT_DIR =
  ".ai/03_plans/2026-06-20-Shared-Link-Feature/evidence/perf-provider-archive-readiness-2026-06-21";

function usage() {
  return [
    "Usage:",
    "  bun scripts/prove-shared-link-provider-perf.ts [--out-dir <path>] [--samples 3]",
    "",
    "Runs disposable provider-side Shared-Link performance proof against the linked",
    `Supabase project ${EXPECTED_PROJECT_REF} only. Does not print provider secrets.`,
  ].join("\n");
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

  const samples = Number.parseInt(values.get("samples") ?? "3", 10);
  if (!Number.isInteger(samples) || samples <= 0) throw new Error("--samples must be a positive integer.");
  return {
    outDir: values.get("out-dir") ?? DEFAULT_OUT_DIR,
    samples,
  };
}

function readLinkedProjectRef() {
  const projectRefPath = join(process.cwd(), "supabase/.temp/project-ref");
  const linkedProjectPath = join(process.cwd(), "supabase/.temp/linked-project.json");

  if (existsSync(projectRefPath)) {
    const value = readFileSync(projectRefPath, "utf8").trim();
    if (value) return value;
  }

  if (existsSync(linkedProjectPath)) {
    const parsed = JSON.parse(readFileSync(linkedProjectPath, "utf8")) as { ref?: unknown; project_ref?: unknown };
    const value = typeof parsed.ref === "string" ? parsed.ref : parsed.project_ref;
    if (typeof value === "string" && value.trim()) return value.trim();
  }

  return null;
}

function gitSha() {
  const result = spawnSync("git", ["rev-parse", "--short", "HEAD"], {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: "pipe",
  });
  return result.status === 0 ? result.stdout.trim() : "unknown";
}

function percentile(values: number[], ratio: number) {
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(sorted.length - 1, Math.ceil(sorted.length * ratio) - 1);
  return Math.round(sorted[index] * 100) / 100;
}

function sqlString(value: string) {
  return `'${value.replaceAll("'", "''")}'`;
}

function buildSql(runId: string, samples: number) {
  const marker = `__shared_link_provider_perf_${runId}`;
  return `
set statement_timeout = '120s';
set lock_timeout = '10s';

create temp table perf_result(payload jsonb) on commit drop;

do $perf$
declare
  v_run_id text := ${sqlString(runId)};
  v_marker text := ${sqlString(marker)};
  v_workspace_id uuid := gen_random_uuid();
  v_project_id uuid := gen_random_uuid();
  v_publication_id uuid;
  v_expected_token text;
  v_snapshot jsonb;
  v_labels jsonb := '{"estimateLabels": {"00000000-0000-0000-0000-000000000001": "Provider perf estimate"}, "rowLabels": {}}'::jsonb;
  v_started_at timestamptz;
  v_duration_ms numeric;
  v_samples integer := ${samples};
  v_sample integer;
  v_count integer;
  v_invalidated integer;
  v_recipient_id uuid;
  v_activity_comment_count integer;
  v_activity_recipient_count integer;
  v_publish_ms numeric[] := '{}';
  v_republish_ms numeric[] := '{}';
  v_rotate_10_ms numeric[] := '{}';
  v_rotate_100_ms numeric[] := '{}';
  v_rotate_1000_ms numeric[] := '{}';
  v_activity_ms numeric[] := '{}';
  v_cleanup_before jsonb;
  v_cleanup_after jsonb;
begin
  delete from public.workspaces where name = v_marker;

  insert into public.workspaces (id, name, slug)
  values (v_workspace_id, v_marker, v_marker);

  insert into public.projects (id, workspace_id, name, client_name, project_code, location, currency_code, metadata)
  values (v_project_id, v_workspace_id, v_marker, 'Provider Perf Fixture', 'PERF-PROVIDER', 'provider-fixture', 'PHP', jsonb_build_object('fixture', v_marker));

  select jsonb_build_object(
    'schemaVersion', '1.3',
    'generatedAt', now(),
    'project', jsonb_build_object(
      'id', v_project_id,
      'name', v_marker,
      'projectCode', 'PERF-PROVIDER',
      'clientName', 'Provider Perf Fixture',
      'location', 'provider-fixture',
      'currencyCode', 'PHP'
    ),
    'estimates', jsonb_build_array(jsonb_build_object(
      'id', '00000000-0000-0000-0000-000000000001',
      'name', 'Provider perf estimate',
      'sheetCode', 'PERF-10K',
      'updatedAt', now(),
      'tabs', jsonb_build_array(jsonb_build_object(
        'id', '00000000-0000-0000-0000-000000000002',
        'name', 'Main',
        'sortOrder', 0,
        'isDefault', true,
        'rowIds', (select jsonb_agg(format('row-%s', gs)::text order by gs) from generate_series(1, 10000) gs)
      )),
      'nodes', '[]'::jsonb,
      'rows', (
        select jsonb_agg(jsonb_build_object(
          'id', format('row-%s', gs),
          'description', format('Provider performance row %s', gs),
          'designation', format('P-%s', gs),
          'discipline', case when gs % 3 = 0 then 'Architectural' when gs % 3 = 1 then 'Electrical' else 'Structural' end,
          'material', format('Material %s', gs),
          'quantity', (gs % 25) + 1,
          'unit', case when gs % 2 = 0 then 'sqm' else 'lot' end,
          'unitCost', 1500 + ((gs % 20) * 125),
          'miscCost', case when gs % 5 = 0 then 500 else 0 end,
          'contingencyPercentage', gs % 4,
          'imageUrl', null,
          'nodeId', null
        ) order by gs)
        from generate_series(1, 10000) gs
      )
    ))
  ) into v_snapshot;

  for v_sample in 1..v_samples loop
    v_started_at := clock_timestamp();
    select public.replace_project_publication(
      v_workspace_id,
      v_project_id,
      'token-hash-' || v_run_id || '-publish-' || v_sample,
      'encrypted-token-' || v_run_id || '-publish-' || v_sample,
      null,
      v_snapshot,
      v_labels,
      'locality',
      array['00000000-0000-0000-0000-000000000001']::uuid[],
      null,
      null
    ) into v_publication_id;
    v_duration_ms := extract(epoch from (clock_timestamp() - v_started_at)) * 1000;
    v_publish_ms := array_append(v_publish_ms, v_duration_ms);
  end loop;

  select id, encrypted_token
    into v_publication_id, v_expected_token
  from public.project_publications
  where project_id = v_project_id
    and status = 'published'
  order by published_at desc
  limit 1;

  for v_sample in 1..v_samples loop
    v_started_at := clock_timestamp();
    update public.project_publications
    set snapshot_json = v_snapshot,
        activity_target_labels_json = v_labels,
        selected_estimate_ids = array['00000000-0000-0000-0000-000000000001']::uuid[],
        snapshot_version = snapshot_version + 1,
        published_at = now(),
        updated_at = now()
    where id = v_publication_id;
    v_duration_ms := extract(epoch from (clock_timestamp() - v_started_at)) * 1000;
    v_republish_ms := array_append(v_republish_ms, v_duration_ms);
  end loop;

  foreach v_count in array array[10, 100, 1000] loop
    delete from public.shared_link_recipients where publication_id = v_publication_id;
    insert into public.shared_link_recipients (publication_id, email, display_name, recipient_token_hash, delivery_status)
    select
      v_publication_id,
      format('provider-perf-%s-%s@example.invalid', v_count, gs),
      format('Provider Perf %s', gs),
      format('recipient-token-%s-%s-%s', v_run_id, v_count, gs),
      'sent'
    from generate_series(1, v_count) gs;

    for v_sample in 1..v_samples loop
      select encrypted_token
        into v_expected_token
      from public.project_publications
      where id = v_publication_id;

      v_started_at := clock_timestamp();
      select public.rotate_project_publication_credentials(
        v_publication_id,
        v_expected_token,
        format('rotated-token-hash-%s-%s-%s', v_run_id, v_count, v_sample),
        format('rotated-encrypted-token-%s-%s-%s', v_run_id, v_count, v_sample),
        null,
        v_snapshot,
        array['00000000-0000-0000-0000-000000000001']::uuid[],
        v_labels
      ) into v_invalidated;
      v_duration_ms := extract(epoch from (clock_timestamp() - v_started_at)) * 1000;

      if v_invalidated <> v_count then
        raise exception 'rotate invalidated % recipients, expected %', v_invalidated, v_count;
      end if;

      if v_count = 10 then
        v_rotate_10_ms := array_append(v_rotate_10_ms, v_duration_ms);
      elsif v_count = 100 then
        v_rotate_100_ms := array_append(v_rotate_100_ms, v_duration_ms);
      else
        v_rotate_1000_ms := array_append(v_rotate_1000_ms, v_duration_ms);
      end if;
    end loop;
  end loop;

  delete from public.shared_link_recipients where publication_id = v_publication_id;
  insert into public.shared_link_recipients (publication_id, email, display_name, recipient_token_hash, delivery_status)
  values (v_publication_id, format('provider-activity-%s@example.invalid', v_run_id), 'Provider Activity Recipient', format('activity-recipient-token-%s', v_run_id), 'sent')
  returning id into v_recipient_id;

  insert into public.shared_link_comments (
    publication_id,
    recipient_id,
    author_email,
    author_name,
    body,
    is_internal,
    snapshot_version_at_comment,
    target_kind,
    target_label,
    target_secondary_label,
    created_at
  )
  select
    v_publication_id,
    v_recipient_id,
    format('provider-activity-%s@example.invalid', v_run_id),
    'Provider Activity Recipient',
    format('Provider activity comment %s', gs),
    false,
    1,
    'proposal',
    'Proposal',
    null,
    now() - (gs || ' seconds')::interval
  from generate_series(1, 100) gs;

  for v_sample in 1..v_samples loop
    v_started_at := clock_timestamp();
    with pub as (
      select id, status, revoked_at, expires_at, password_hash, activity_target_labels_json, snapshot_version
      from public.project_publications
      where token_hash = (
        select token_hash
        from public.project_publications
        where id = v_publication_id
      )
      limit 1
    ),
    activity_comments as (
      select id, created_at, is_internal, author_email, author_name, recipient_id, estimate_id, row_id,
             target_kind, target_label, target_secondary_label, snapshot_version_at_comment
      from public.shared_link_comments
      where publication_id = (select id from pub)
        and is_internal = false
      order by created_at desc, id desc
      limit 101
    ),
    recipient_ids as (
      select distinct recipient_id
      from activity_comments
      where recipient_id is not null
    ),
    activity_recipients as (
      select id, display_name
      from public.shared_link_recipients
      where publication_id = (select id from pub)
        and id in (select recipient_id from recipient_ids)
      limit 500
    )
    select
      (select count(*) from activity_comments),
      (select count(*) from activity_recipients)
    into v_activity_comment_count, v_activity_recipient_count;

    v_duration_ms := extract(epoch from (clock_timestamp() - v_started_at)) * 1000;
    v_activity_ms := array_append(v_activity_ms, v_duration_ms);

    if v_activity_comment_count <> 100 or v_activity_recipient_count <> 1 then
      raise exception 'activity query returned % comments / % recipients', v_activity_comment_count, v_activity_recipient_count;
    end if;
  end loop;

  select jsonb_build_object(
    'workspaces', (select count(*) from public.workspaces where name = v_marker),
    'projects', (select count(*) from public.projects where name = v_marker),
    'project_publications', (select count(*) from public.project_publications where project_id = v_project_id),
    'shared_link_comments', (select count(*) from public.shared_link_comments where publication_id in (select id from public.project_publications where project_id = v_project_id)),
    'shared_link_recipients', (select count(*) from public.shared_link_recipients where publication_id in (select id from public.project_publications where project_id = v_project_id))
  ) into v_cleanup_before;

  delete from public.workspaces where id = v_workspace_id;

  select jsonb_build_object(
    'workspaces', (select count(*) from public.workspaces where name = v_marker),
    'projects', (select count(*) from public.projects where name = v_marker),
    'project_publications', (select count(*) from public.project_publications where project_id = v_project_id),
    'shared_link_comments', (select count(*) from public.shared_link_comments where publication_id in (select id from public.project_publications where project_id = v_project_id)),
    'shared_link_recipients', (select count(*) from public.shared_link_recipients where publication_id in (select id from public.project_publications where project_id = v_project_id))
  ) into v_cleanup_after;

  insert into perf_result(payload)
  values (jsonb_build_object(
    'runId', v_run_id,
    'fixtureMarker', v_marker,
    'samples', v_samples,
    'snapshotRows', 10000,
    'snapshotBytes', octet_length(v_snapshot::text),
    'publishMs', v_publish_ms,
    'republishMs', v_republish_ms,
    'rotateMs', jsonb_build_object('10', v_rotate_10_ms, '100', v_rotate_100_ms, '1000', v_rotate_1000_ms),
    'activityMs', v_activity_ms,
    'activityRows', 100,
    'activityRecipients', 1,
    'rotateInvalidatedCounts', jsonb_build_object('10', 10, '100', 100, '1000', 1000),
    'lockWaitMetric', 'uncontended fixture; row lock wait is included in total RPC duration',
    'cleanupBeforeDelete', v_cleanup_before,
    'cleanupAfterDelete', v_cleanup_after
  ));
exception
  when others then
    delete from public.workspaces where id = v_workspace_id or name = v_marker;
    raise;
end
$perf$;

select payload from perf_result;
`;
}

function runSupabaseSql(sql: string) {
  const tempSql = join(tmpdir(), `archestimator-provider-perf-${Date.now()}.sql`);
  writeFileSync(tempSql, sql);
  try {
    const result = spawnSync("supabase", ["db", "query", "--linked", "--file", tempSql, "--output", "json"], {
      cwd: process.cwd(),
      encoding: "utf8",
      env: { ...process.env, LC_ALL: "C" },
      stdio: "pipe",
    });
    if (result.status !== 0) {
      throw new Error(redactSensitive(result.stderr || result.stdout));
    }
    return result.stdout;
  } finally {
    if (existsSync(tempSql)) rmSync(tempSql);
  }
}

function redactSensitive(text: string) {
  return text
    .replace(/postgres(?:ql)?:\/\/[^\s"')]+/gi, "postgres://[redacted]")
    .replace(/(service_role|anon|access_token|password|secret|key)(["'=:\s]+)[^\s"',)]+/gi, "$1$2[redacted]");
}

function extractPayload(raw: string) {
  const parsed = JSON.parse(raw) as SupabaseQueryOutput;
  const payload = parsed.rows?.[0]?.payload;
  if (!payload || typeof payload !== "object") throw new Error("Supabase query did not return a payload row.");
  return payload as Record<string, unknown>;
}

function numberArray(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => Number(entry)).filter((entry) => Number.isFinite(entry));
}

function rotateArrays(payload: Record<string, unknown>) {
  const rotate = payload.rotateMs;
  if (!rotate || typeof rotate !== "object") return {};
  const record = rotate as Record<string, unknown>;
  return {
    10: numberArray(record["10"]),
    100: numberArray(record["100"]),
    1000: numberArray(record["1000"]),
  };
}

function metric(values: number[], budget: number) {
  const p50 = percentile(values, 0.5);
  const p95 = percentile(values, 0.95);
  return { p50, p95, budget, status: p95 <= budget ? "PASS" : "FAIL" };
}

function renderMarkdown(payload: Record<string, unknown>, runId: string, sha: string) {
  const publish = metric(numberArray(payload.publishMs), 6000);
  const republish = metric(numberArray(payload.republishMs), 6000);
  const rotates = rotateArrays(payload);
  const rotate10 = metric(rotates[10] ?? [], 500);
  const rotate100 = metric(rotates[100] ?? [], 2000);
  const rotate1000 = metric(rotates[1000] ?? [], 8000);
  const activity = metric(numberArray(payload.activityMs), 1200);
  const cleanupAfterDelete =
    payload.cleanupAfterDelete && typeof payload.cleanupAfterDelete === "object"
      ? (payload.cleanupAfterDelete as Record<string, unknown>)
      : {};
  const cleanupPassed = Object.values(cleanupAfterDelete).every((value) => Number(value) === 0);

  return `# Shared-Link Provider Performance Proof

Date: 2026-06-21
Git SHA: ${sha}
Supabase project: \`${EXPECTED_PROJECT_REF}\`
Run id: \`${runId}\`
Fixture: disposable workspace/project/publication/recipients tagged by run id
Secret hygiene: no tokens, URLs, service-role keys, or connection strings are written.

## Result

| Gate | Fixture | Samples | p50 | p95 | Budget | Status | Notes |
| --- | --- | ---: | ---: | ---: | ---: | --- | --- |
| Publish timing | 10k-row snapshot via \`replace_project_publication\` | ${payload.samples} | ${publish.p50.toFixed(2)} ms | ${publish.p95.toFixed(2)} ms | ${publish.budget} ms | **${publish.status}** | Provider DB-side publish RPC/storage timing. |
| Republish timing | 10k-row snapshot update | ${payload.samples} | ${republish.p50.toFixed(2)} ms | ${republish.p95.toFixed(2)} ms | ${republish.budget} ms | **${republish.status}** | Provider DB-side republish storage timing. |
| PERF-04 activity query | ${payload.activityRows ?? 100} public comments + ${payload.activityRecipients ?? 1} recipient label lookup | ${payload.samples} | ${activity.p50.toFixed(2)} ms | ${activity.p95.toFixed(2)} ms | ${activity.budget} ms | **${activity.status}** | Provider-side compact-publication/comment/recipient query shape; does not select \`snapshot_json\`. |
| PERF-12 rotate | 10 recipients | ${payload.samples} | ${rotate10.p50.toFixed(2)} ms | ${rotate10.p95.toFixed(2)} ms | ${rotate10.budget} ms | **${rotate10.status}** | Uncontended provider RPC; lock wait included in total duration. |
| PERF-12 rotate | 100 recipients | ${payload.samples} | ${rotate100.p50.toFixed(2)} ms | ${rotate100.p95.toFixed(2)} ms | ${rotate100.budget} ms | **${rotate100.status}** | Uncontended provider RPC; lock wait included in total duration. |
| PERF-12 rotate | 1000 recipients | ${payload.samples} | ${rotate1000.p50.toFixed(2)} ms | ${rotate1000.p95.toFixed(2)} ms | ${rotate1000.budget} ms | **${rotate1000.status}** | Uncontended provider RPC; lock wait included in total duration. |
| PERF-09 password unlock | hosted route/password POST | 0 | n/a | n/a | 500 ms hash split; route p95 required | **BLOCKED** | This script is DB-side only. Existing local scrypt evidence does not prove hosted DB/backoff route timing. |

## Cleanup Proof

Before delete:

\`\`\`json
${JSON.stringify(payload.cleanupBeforeDelete, null, 2)}
\`\`\`

After delete:

\`\`\`json
${JSON.stringify(payload.cleanupAfterDelete, null, 2)}
\`\`\`

Cleanup status: **${cleanupPassed ? "PASS" : "FAIL"}**. All fixture-owned counts must be zero.

## Raw Sanitized Payload

See \`provider-perf-raw.json\` in this directory. It contains only timings, counts, fixture marker, and byte sizes.
`;
}

async function main() {
  const options = parseArgs();
  const linkedRef = readLinkedProjectRef();
  if (linkedRef !== EXPECTED_PROJECT_REF) {
    throw new Error(`Refusing provider performance run; linked project is ${linkedRef ?? "unknown"}, expected ${EXPECTED_PROJECT_REF}.`);
  }

  const outDir = resolve(options.outDir);
  mkdirSync(outDir, { recursive: true });

  const runId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const rawOutput = runSupabaseSql(buildSql(runId, options.samples));
  const payload = extractPayload(rawOutput);
  const sha = gitSha();

  const rawPath = join(outDir, "provider-perf-raw.json");
  const reportPath = join(outDir, "provider-perf-summary.md");
  writeFileSync(rawPath, `${JSON.stringify(payload, null, 2)}\n`);
  writeFileSync(reportPath, renderMarkdown(payload, runId, sha));

  console.log(`Wrote ${relative(process.cwd(), rawPath)}`);
  console.log(`Wrote ${relative(process.cwd(), reportPath)}`);
}

if (import.meta.main) {
  try {
    await main();
  } catch (error) {
    console.error(redactSensitive(error instanceof Error ? error.message : String(error)));
    process.exit(1);
  }
}
