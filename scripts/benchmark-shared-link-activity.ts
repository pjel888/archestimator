#!/usr/bin/env bun

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { composeSharedLinkActivity, type SharedLinkActivityInput } from "../src/lib/activity";
import {
  compareSharedLinkActivityDesc,
  createSharedLinkTargetLabelMap,
  resolveSharedLinkTargetLabel,
} from "../src/lib/publication/activity-helpers";

type SharedActivityRow = {
  id: string;
  created_at: string;
  recipient_id: string | null;
};

type CommentRow = SharedActivityRow & {
  body: string;
  is_internal: boolean;
  author_name: string | null;
  estimate_id: string | null;
  row_id: string | null;
};

type DecisionRow = SharedActivityRow & {
  decision: "accepted" | "declined" | "requested_revision";
  note: string | null;
};

type EventRow = SharedActivityRow & {
  event_type: "open" | "password_attempt";
  metadata_json: Record<string, unknown>;
};

type RecipientRow = {
  id: string;
  display_name: string;
};

type SyntheticFixture = {
  snapshotJson: Record<string, unknown>;
  comments: CommentRow[];
  decisions: DecisionRow[];
  events: EventRow[];
  accessTelemetry: EventRow[];
  recipients: RecipientRow[];
};

type QueryPlan = {
  name: string;
  queryCount: number;
  tables: string[];
  note: string;
};

type BenchmarkRun = {
  activityCount: number;
  recipientCount: number;
  ownerDurationMs: number;
  ownerActivityCount: number;
  ownerHasMore: boolean;
  publicAnonymousDurationMs: number;
  publicAnonymousActivityCount: number;
  publicAnonymousHasMore: boolean;
  publicRecipientSessionDurationMs: number;
  publicRecipientSessionActivityCount: number;
  publicRecipientSessionHasMore: boolean;
  rssMiB: number | null;
  heapUsedMiB: number | null;
};

type BenchmarkReport = {
  generatedAt: string;
  mode: "local-shared-link-activity-benchmark";
  note: string;
  activityCounts: number[];
  pageLimit: number;
  queryPlans: QueryPlan[];
  runs: BenchmarkRun[];
};

const DEFAULT_ACTIVITY_COUNTS = "100,500,1000,2500";
const DEFAULT_PAGE_LIMIT = 100;
const DEFAULT_RECIPIENT_COUNT = 25;

export function round(value: number, precision = 2) {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

function toMiB(bytes: number) {
  return round(bytes / 1024 / 1024);
}

function getMemoryUsage() {
  if (typeof process.memoryUsage !== "function") return { rssMiB: null, heapUsedMiB: null };
  const memory = process.memoryUsage();
  return { rssMiB: toMiB(memory.rss), heapUsedMiB: toMiB(memory.heapUsed) };
}

export function parsePositiveIntegerList(value: string, label: string) {
  const parsed = value
    .split(",")
    .map((part) => Number.parseInt(part.trim(), 10))
    .filter((count) => Number.isInteger(count) && count > 0);
  if (parsed.length === 0) throw new Error(`${label} must include at least one positive integer.`);
  return parsed;
}

export function getSharedLinkActivityQueryPlans(): QueryPlan[] {
  return [
    {
      name: "public-anonymous",
      queryCount: 3,
      tables: ["project_publications", "shared_link_comments", "shared_link_recipients"],
      note: "Current public GET loads publication, public comments, and recipient display names when comments include recipient ids; responses/events are skipped without a verified recipient session.",
    },
    {
      name: "public-recipient-session",
      queryCount: 5,
      tables: ["project_publications", "shared_link_comments", "shared_link_responses", "shared_link_events", "shared_link_recipients"],
      note: "Verified recipient session adds response and event queries; all activity table reads are paginated with limit + 1.",
    },
    {
      name: "owner-include-access-telemetry",
      queryCount: 6,
      tables: ["project_publications", "shared_link_comments", "shared_link_responses", "shared_link_events", "project_publication_events", "shared_link_recipients"],
      note: "Owner server action also performs auth/RBAC outside this activity-table count; this plan covers the activity fan-out to benchmark before RPC or pagination rewrites.",
    },
  ];
}

function isoSecondsBefore(index: number) {
  return new Date(Date.UTC(2026, 5, 6, 0, 0, 0) - index * 1000).toISOString();
}

function recipientId(index: number, recipientCount: number) {
  return `recipient-${String((index % recipientCount) + 1).padStart(3, "0")}`;
}

export function makeSharedLinkActivityFixture(activityCount: number, recipientCount = DEFAULT_RECIPIENT_COUNT): SyntheticFixture {
  const recipients = Array.from({ length: recipientCount }, (_, index) => ({
    id: `recipient-${String(index + 1).padStart(3, "0")}`,
    display_name: `Client ${index + 1}`,
  }));
  const snapshotJson = {
    estimates: [
      {
        id: "estimate-1",
        name: "Shared proposal benchmark",
        nodes: Array.from({ length: 20 }, (_, index) => ({ id: `node-${index + 1}`, name: `Area ${index + 1}` })),
        rows: Array.from({ length: 200 }, (_, index) => ({
          id: `row-${index + 1}`,
          nodeId: `node-${(index % 20) + 1}`,
          material: `Benchmark line item ${index + 1}`,
        })),
      },
    ],
  };

  const comments: CommentRow[] = [];
  const decisions: DecisionRow[] = [];
  const events: EventRow[] = [];
  const accessTelemetry: EventRow[] = [];

  for (let index = 0; index < activityCount; index += 1) {
    const created_at = isoSecondsBefore(index);
    const rid = recipientId(index, recipientCount);
    const idSuffix = String(index + 1).padStart(6, "0");
    const bucket = index % 4;
    if (bucket === 0) {
      comments.push({
        id: `comment-${idSuffix}`,
        created_at,
        recipient_id: rid,
        body: `Synthetic benchmark comment ${index + 1}`,
        is_internal: index % 20 === 0,
        author_name: index % 20 === 0 ? "Project owner" : null,
        estimate_id: "estimate-1",
        row_id: `row-${(index % 200) + 1}`,
      });
    } else if (bucket === 1) {
      decisions.push({
        id: `decision-${idSuffix}`,
        created_at,
        recipient_id: rid,
        decision: index % 3 === 0 ? "requested_revision" : index % 3 === 1 ? "accepted" : "declined",
        note: index % 3 === 0 ? `Please revise item ${index + 1}` : null,
      });
    } else if (bucket === 2) {
      events.push({
        id: `event-${idSuffix}`,
        created_at,
        recipient_id: rid,
        event_type: index % 6 === 0 ? "password_attempt" : "open",
        metadata_json: { eventType: index % 6 === 0 ? "password_attempt" : "open", device_type: index % 2 === 0 ? "mobile" : "desktop" },
      });
    } else {
      accessTelemetry.push({
        id: `access-${idSuffix}`,
        created_at,
        recipient_id: rid,
        event_type: "open",
        metadata_json: {
          access_stage: "page_visit",
          eventType: "open",
          recipient_known: true,
          bot: index % 25 === 0,
          device_type: index % 2 === 0 ? "mobile" : "desktop",
        },
      });
    }
  }

  return { snapshotJson, comments, decisions, events, accessTelemetry, recipients };
}

function recipientDisplayNames(fixture: SyntheticFixture) {
  return new Map(fixture.recipients.map((recipient) => [recipient.id, recipient.display_name]));
}

function rawCommentActivity(comment: CommentRow, fixture: SyntheticFixture, displayNames: Map<string, string>): SharedLinkActivityInput {
  const targetLabels = createSharedLinkTargetLabelMap(fixture.snapshotJson);
  const name = comment.recipient_id ? displayNames.get(comment.recipient_id) : undefined;
  return {
    id: comment.id,
    type: "comment",
    created_at: comment.created_at,
    author: comment.is_internal ? comment.author_name ?? "Project owner" : name ?? "Client",
    body: comment.body,
    is_internal: comment.is_internal,
    recipientDisplayName: name,
    metadata: { targetLabel: resolveSharedLinkTargetLabel(targetLabels, comment.row_id, comment.estimate_id) ?? "the proposal" },
  };
}

function rawDecisionActivity(decision: DecisionRow, displayNames: Map<string, string>): SharedLinkActivityInput {
  return {
    id: decision.id,
    type: "decision",
    created_at: decision.created_at,
    decision: decision.decision,
    body: decision.note ?? undefined,
    recipientDisplayName: decision.recipient_id ? displayNames.get(decision.recipient_id) : undefined,
  };
}

function rawEventActivity(event: EventRow, displayNames: Map<string, string>, extraMetadata: Record<string, unknown> = {}): SharedLinkActivityInput {
  return {
    id: event.id,
    type: "event",
    created_at: event.created_at,
    metadata: { ...event.metadata_json, eventType: event.event_type, ...extraMetadata },
    recipientDisplayName: event.recipient_id ? displayNames.get(event.recipient_id) : undefined,
  };
}

export function composeOwnerActivityBenchmark(fixture: SyntheticFixture, limit = DEFAULT_PAGE_LIMIT) {
  const displayNames = recipientDisplayNames(fixture);
  const seenAccessEvents = new Set<string>();
  const raw: SharedLinkActivityInput[] = [
    ...fixture.comments.map((comment) => rawCommentActivity(comment, fixture, displayNames)),
    ...fixture.decisions.map((decision) => rawDecisionActivity(decision, displayNames)),
    ...fixture.events.map((event) => rawEventActivity(event, displayNames)),
  ];

  for (const event of fixture.accessTelemetry) {
    if (event.metadata_json.bot === true) continue;
    const dedupeKey = [event.event_type, event.created_at, event.metadata_json.access_stage, event.metadata_json.recipient_known, event.metadata_json.bot].join("|");
    if (seenAccessEvents.has(dedupeKey)) continue;
    seenAccessEvents.add(dedupeKey);
    raw.push(rawEventActivity(event, displayNames, { accessTelemetry: true }));
  }

  const sorted = raw.sort(compareSharedLinkActivityDesc);
  const page = sorted.slice(0, limit);
  return {
    activities: page.map((activity) => composeSharedLinkActivity(activity, { audience: "owner", visibility: activity.is_internal ? "internal" : "owner" })),
    hasMore: sorted.length > limit,
    totalCandidateCount: sorted.length,
  };
}

export function composePublicActivityBenchmark(fixture: SyntheticFixture, opts: { verifiedRecipientSession?: boolean; limit?: number } = {}) {
  const limit = opts.limit ?? DEFAULT_PAGE_LIMIT;
  const displayNames = recipientDisplayNames(fixture);
  const raw: SharedLinkActivityInput[] = fixture.comments
    .filter((comment) => !comment.is_internal)
    .map((comment) => rawCommentActivity(comment, fixture, displayNames));

  if (opts.verifiedRecipientSession) {
    raw.push(...fixture.decisions.map((decision) => rawDecisionActivity(decision, displayNames)));
    raw.push(...fixture.events.map((event) => rawEventActivity(event, displayNames)));
  }

  const sorted = raw.sort(compareSharedLinkActivityDesc);
  const page = sorted.slice(0, limit);
  return {
    activities: page
      .map((activity) => composeSharedLinkActivity(activity, { audience: "client", visibility: "public" }))
      .filter((activity) => activity.visibility !== "internal"),
    hasMore: sorted.length > limit,
    totalCandidateCount: sorted.length,
  };
}

function measure<T>(fn: () => T) {
  const startedAt = performance.now();
  const value = fn();
  return { value, durationMs: round(performance.now() - startedAt) };
}

export function runSharedLinkActivityBenchmark(activityCount: number, pageLimit = DEFAULT_PAGE_LIMIT, recipientCount = DEFAULT_RECIPIENT_COUNT): BenchmarkRun {
  const fixture = makeSharedLinkActivityFixture(activityCount, recipientCount);
  const owner = measure(() => composeOwnerActivityBenchmark(fixture, pageLimit));
  const publicAnonymous = measure(() => composePublicActivityBenchmark(fixture, { limit: pageLimit }));
  const publicRecipientSession = measure(() => composePublicActivityBenchmark(fixture, { verifiedRecipientSession: true, limit: pageLimit }));
  const memory = getMemoryUsage();

  return {
    activityCount,
    recipientCount,
    ownerDurationMs: owner.durationMs,
    ownerActivityCount: owner.value.activities.length,
    ownerHasMore: owner.value.hasMore,
    publicAnonymousDurationMs: publicAnonymous.durationMs,
    publicAnonymousActivityCount: publicAnonymous.value.activities.length,
    publicAnonymousHasMore: publicAnonymous.value.hasMore,
    publicRecipientSessionDurationMs: publicRecipientSession.durationMs,
    publicRecipientSessionActivityCount: publicRecipientSession.value.activities.length,
    publicRecipientSessionHasMore: publicRecipientSession.value.hasMore,
    ...memory,
  };
}

export function runSharedLinkActivityBenchmarks(activityCounts: number[], pageLimit = DEFAULT_PAGE_LIMIT): BenchmarkReport {
  const runs = activityCounts.map((activityCount) => {
    const run = runSharedLinkActivityBenchmark(activityCount, pageLimit);
    console.log(
      `${run.activityCount} activities: owner ${run.ownerDurationMs}ms, public anonymous ${run.publicAnonymousDurationMs}ms, public recipient ${run.publicRecipientSessionDurationMs}ms`,
    );
    return run;
  });

  return {
    generatedAt: new Date().toISOString(),
    mode: "local-shared-link-activity-benchmark",
    note: "Synthetic local CPU benchmark for shared-link activity merge/sort/compose and static query fan-out. It does not prove Supabase latency, RLS cost, hosted function duration, or production p95/p99 behavior.",
    activityCounts,
    pageLimit,
    queryPlans: getSharedLinkActivityQueryPlans(),
    runs,
  };
}

function writeMarkdownSummary(report: BenchmarkReport, outputFile: string) {
  const rows = report.runs
    .map(
      (run) =>
        `| ${run.activityCount} | ${run.ownerDurationMs} | ${run.publicAnonymousDurationMs} | ${run.publicRecipientSessionDurationMs} | ${run.ownerActivityCount} | ${run.publicAnonymousActivityCount} | ${run.publicRecipientSessionActivityCount} | ${run.rssMiB ?? "n/a"} |`,
    )
    .join("\n");
  const queryRows = report.queryPlans
    .map((plan) => `| ${plan.name} | ${plan.queryCount} | ${plan.tables.join(", ")} | ${plan.note} |`)
    .join("\n");
  const localDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(new Date(report.generatedAt));
  const markdown = `# Shared-link activity benchmark — ${localDate}\n\nStatus: **LOCAL BENCHMARK CAPTURED / HOSTED SUPABASE PROOF OPEN**.\n\n${report.note}\n\n## Static query fan-out\n\n| Path | Query count | Tables | Notes |\n| --- | ---: | --- | --- |\n${queryRows}\n\n## Local composition benchmark\n\nPage limit: ${report.pageLimit}. Activity counts are synthetic combined comments, decisions, shared-link events, and access telemetry rows.\n\n| Synthetic activity rows | Owner ms | Public anonymous ms | Public recipient-session ms | Owner returned | Public anonymous returned | Public recipient returned | RSS MiB |\n| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |\n${rows}\n\n## Interpretation\n\n- The current implementation fans out across comments, decisions, events, optional access telemetry, and recipient display-name lookup.\n- Public anonymous activity is cheaper because it skips recipient responses/events and internal comments.\n- This benchmark is local CPU-only; do not use it to claim hosted latency or Supabase query performance.\n- Before RPC consolidation, tighter pagination, or index proposals, capture live Supabase EXPLAIN/provider metrics and hosted endpoint timing.\n`;
  const markdownPath = resolve(outputFile);
  mkdirSync(dirname(markdownPath), { recursive: true });
  writeFileSync(markdownPath, markdown);
}

async function main() {
  const outputFile = process.env.OUTPUT_FILE;
  const markdownFile = process.env.MARKDOWN_FILE;
  const activityCounts = parsePositiveIntegerList(process.env.SHARED_LINK_ACTIVITY_BENCHMARK_ROWS ?? DEFAULT_ACTIVITY_COUNTS, "SHARED_LINK_ACTIVITY_BENCHMARK_ROWS");
  const pageLimit = Number.parseInt(process.env.SHARED_LINK_ACTIVITY_BENCHMARK_LIMIT ?? String(DEFAULT_PAGE_LIMIT), 10);
  const report = runSharedLinkActivityBenchmarks(activityCounts, Number.isInteger(pageLimit) && pageLimit > 0 ? pageLimit : DEFAULT_PAGE_LIMIT);

  if (outputFile) {
    const outputPath = resolve(outputFile);
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
    console.log(`Wrote benchmark JSON: ${outputPath}`);
  }
  if (markdownFile) {
    writeMarkdownSummary(report, markdownFile);
    console.log(`Wrote benchmark markdown: ${resolve(markdownFile)}`);
  }
}

if (import.meta.main) {
  await main();
}
