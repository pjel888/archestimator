# Cloudflare Cost And Performance Workbook

Generated: 2026-07-01T08:11:30.323Z

Workbook scaffold only. Local inventory, refreshed official Cloudflare pricing, and Worker preview durations can seed planning, but cost decisions still require sanitized Vercel/Supabase/Resend dashboard data, hosted Cloudflare usage metrics, provider logs, rollback triggers, and the same proof architecture for cost and performance evidence.

## Readiness

| Gate | Ready |
| --- | --- |
| Current provider costs ready | no |
| Cloudflare pricing refreshed | yes |
| Cloudflare usage costs ready | no |
| Local preview performance captured | yes |
| Hosted credential-free performance captured | yes |
| Production runtime performance ready | no |
| Strict hosted client p95 ready | no |
| Hosted performance ready | no |
| Production cost decision ready | no |

## Inventory Counts

| Item | Count |
| --- | ---: |
| App routes | 70 |
| Provider-coupled files | 86 |
| Distinct RPC names | 75 |
| Applied SQL migrations | 182 |
| Pending-review SQL files | 13 |
| SQL function declaration/update matches | 348 |
| RLS/policy/storage/auth matches | 684 |

## Current Provider Cost Inputs

| Input | Status | Value | Source | Notes |
| --- | --- | --- | --- | --- |
| Vercel plan cost | missing |  | Vercel dashboard/invoice | Requires sanitized dashboard/invoice/metrics input before cost decisions. |
| Vercel bandwidth | missing |  | Vercel usage | Requires sanitized dashboard/invoice/metrics input before cost decisions. |
| Vercel function invocations/duration | provided | 30d production runtime log sample counts: middleware=73, function=49, rewrite=18; status samples include 200=67 and 404=2. | Vercel runtime logs MCP, project prj_QTjX1WrMb7b0ZxmMIRAL96ILRY9E, production, since=30d | Runtime log counts are telemetry samples, not invoice totals, and do not include bandwidth or build-minute billing. |
| Vercel build usage | provided | First deployment-list page since 2026-06-01T12:00:00Z returned 20 deployments with READY/ERROR/BLOCKED states; sampled deployments report nodejs lambdaRuntimeStats of 3-5 functions. | Vercel deployments MCP, project prj_QTjX1WrMb7b0ZxmMIRAL96ILRY9E, team team_eRuwqQwhMbYYDmvgIgpQW1GS, since=1780315200000 | Deployment-list telemetry only; it is not a billable build-minute total and may be paginated. |
| Supabase plan cost | missing |  | Supabase dashboard/invoice | Requires sanitized dashboard/invoice/metrics input before cost decisions. |
| Supabase DB size | provided | 40,291,475 bytes (~38.42 MiB) from pg_database_size(current_database()). | Supabase SQL MCP, project ebxxqidacheyapmmzavr | Database footprint only; does not include Supabase plan price or egress. |
| Supabase storage GB | provided | 290,223 bytes (~0.00027 GiB) across 11 storage.objects rows. | Supabase SQL MCP, project ebxxqidacheyapmmzavr | Object metadata footprint only; does not include provider egress. |
| Supabase egress | missing |  | Supabase usage | Requires sanitized dashboard/invoice/metrics input before cost decisions. |
| Supabase Auth MAU | provided | 6 auth.users rows present. | Supabase SQL MCP, project ebxxqidacheyapmmzavr | User count is not a monthly-active-user invoice metric. |
| Supabase Realtime connections/messages | provided | Last-24h realtime logs show tenant initialization/shutdown/replication-slot activity, no-connected-users shutdown messages, and unauthorized topic attempts for estimate:hero-sanitized-estimate. | Supabase logs MCP, service=realtime, project ebxxqidacheyapmmzavr, last 24h | Realtime log sample only; not a monthly connection, message, egress, or billing metric. |
| Resend plan cost | missing |  | Resend dashboard/invoice | Requires sanitized dashboard/invoice/metrics input before cost decisions. |
| Resend sends/events | missing |  | Resend dashboard | Requires sanitized dashboard/invoice/metrics input before cost decisions. |

## Cloudflare Cost Inputs

| Input | Status | Value | Source | Notes |
| --- | --- | --- | --- | --- |
| Workers requests | provided | Workers Observability sampled 4,590 events in the last 24h; sampled statuses: 200=3,440, 404=860, 307=290. | Cloudflare Workers Observability MCP | Proof-scale observed usage only; not projected monthly production requests. Top sampled paths include /access-required, /api/share/not-a-real-hosted-worker-share-token, /workshop, /api/projects/images, /pricing, /about, /contact, /, /login, and /terms. |
| Workers CPU | provided | Current deployed Worker version 8a55ee02-8186-4c8a-a785-5c4bc214cfa7 had 60 sampled events with p95Cpu=13 ms and p95Wall=150 ms. | Cloudflare Workers Observability MCP | Current-version telemetry sample only. Aggregate last-24h observations include older Worker versions and slower credential-free paths, so authenticated/data route CPU still requires production-like fixtures. |
| Workers subrequests | local-derived | 86 provider-coupled source files need per-route subrequest mapping | cf:inventory | Inventory-derived surface count only; not monthly operation volume. |
| D1 reads | local-derived | 75 app-code RPC names need read/write classification | cf:inventory | Inventory-derived rewrite surface only; not D1 row-read volume. |
| D1 writes | local-derived | 348 SQL function declaration/update matches need transaction classification | cf:inventory | Inventory-derived rewrite surface only; not D1 row-write volume. |
| D1 storage | provided | Proof D1 archestimator-proof-db file_size=12,288 bytes, num_tables=0, region=APAC. | Cloudflare D1 database get MCP, database 9bdb29bb-687e-4f51-ae81-7659c426ea5f | Proof DB only; production import/projection is not complete. |
| R2 storage | provided | Proof buckets exist: archestimator-proof-uploads and archestimator-proof-uploads-dev; runtime proof writes and deletes ephemeral 646-byte media object. | Cloudflare R2 bucket list MCP plus provider runtime proof | Bucket byte totals are not exposed by the available MCP; production object migration is not complete. |
| R2 Class A | provided | Provider media proof performed one ephemeral put and delete against archestimator-proof-uploads. | 2026-06-30-cloudflare-provider-runtime-proof.json | Proof operation count only; not monthly production volume. |
| R2 Class B | provided | Provider media proof performed one ephemeral get and one post-delete get check against archestimator-proof-uploads. | 2026-06-30-cloudflare-provider-runtime-proof.json | Proof operation count only; not monthly production volume. |
| KV reads/writes/lists | missing |  | Safe-cache operations only | Requires hosted Cloudflare proof or sanitized usage input before cost decisions. |
| Queues operations | provided | Jobs proof sent one Queue message, observed one consumer ack receipt, and kept local retry/DLQ proof ready. | 2026-06-30-cloudflare-jobs-runtime-proof.json and 2026-06-30-cloudflare-queues-cron-proof.json | Proof operation count only; not monthly job volume. |
| Durable Objects | missing |  | Room requests, WebSocket duration/messages/storage if applicable | Requires hosted Cloudflare proof or sanitized usage input before cost decisions. |
| Email Service | missing |  | Sends, bounces/events, routing events | Requires hosted Cloudflare proof or sanitized usage input before cost decisions. |
| WAF/rate limiting | missing |  | Plan tier, rule count, log needs | Requires hosted Cloudflare proof or sanitized usage input before cost decisions. |
| Turnstile | missing |  | Challenge volume and false-positive review | Requires hosted Cloudflare proof or sanitized usage input before cost decisions. |
| Observability/logs | provided | Workers Observability sampled 4,590 last-24h events, all info level in the sampled payloads. | 2026-06-30-cloudflare-observability-proof.json | Proof-scale log volume only; retention and production log volume still need rollout data. |

## Performance Fixtures

| Fixture | Current p95 | Local Worker preview p95 | Hosted Worker p95 | Budget | Status | Local evidence | Hosted evidence |
| --- | ---: | ---: | ---: | --- | --- | --- | --- |
| Public home route p95 TTFB |  | 168.47ms | 634.6ms | under 200 ms | hosted-partial-fail | .ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence/2026-06-29-cloudflare-worker-preview-route-probe.json | .ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence/2026-06-30-cloudflare-hosted-performance.json |
| Pricing/features static route p95 TTFB |  | 13.68ms | 767.1ms | under 200 ms | hosted-partial-fail | .ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence/2026-06-29-cloudflare-worker-preview-route-probe.json | .ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence/2026-06-30-cloudflare-hosted-performance.json |
| Login/auth callback p95 duration |  |  |  | no worse than baseline | hosted-provider-proof-only |  | .ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence/2026-06-30-cloudflare-better-auth-provider-proof.json |
| Share route p95 TTFB |  | 327.35ms | 511.5ms | under 400 ms | hosted-partial-fail | .ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence/2026-06-29-cloudflare-worker-preview-route-probe.json | .ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence/2026-06-30-cloudflare-hosted-performance.json |
| Workshop home p95 TTFB |  | 4.03ms | 105.54ms | under 600 ms | hosted-partial-pass | .ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence/2026-06-29-cloudflare-worker-preview-route-probe.json | .ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence/2026-06-30-cloudflare-hosted-performance.json |
| Project dashboard p95 TTFB |  |  | 65ms | under 600 ms | hosted-provider-pass |  | .ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence/2026-06-30-cloudflare-d1-runtime-performance-proof.json |
| Estimate sheet initial load p95 |  |  | 76ms | no worse than baseline | hosted-provider-pass |  | .ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence/2026-06-30-cloudflare-d1-runtime-performance-proof.json |
| Estimate row mutation p95 |  |  |  | under 500 ms | missing |  |  |
| Library component search p95 |  |  | 57ms | under 500 ms | hosted-provider-pass |  | .ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence/2026-06-30-cloudflare-d1-runtime-performance-proof.json |
| Upload signed/session creation p95 |  |  |  | no worse than baseline | hosted-provider-proof-only |  | .ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence/2026-06-30-cloudflare-provider-runtime-proof.json |
| Upload scan queue latency p95 |  |  |  | job-specific | hosted-provider-proof-only |  | .ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence/2026-06-30-cloudflare-jobs-runtime-proof.json |
| Realtime cursor/presence latency p95 |  |  |  | no worse than baseline | missing |  |  |
| Email send-to-event latency p95 |  |  |  | no worse than baseline | missing |  |  |
