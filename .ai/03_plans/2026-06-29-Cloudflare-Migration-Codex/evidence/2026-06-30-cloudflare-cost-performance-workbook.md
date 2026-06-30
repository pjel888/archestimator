# Cloudflare Cost And Performance Workbook

Generated: 2026-06-30T03:07:59.830Z

Workbook scaffold only. Local inventory, refreshed official Cloudflare pricing, and Worker preview durations can seed planning, but cost decisions still require sanitized Vercel/Supabase/Resend dashboard data, hosted Cloudflare usage metrics, provider logs, rollback triggers, and the same proof architecture for cost and performance evidence.

## Readiness

| Gate | Ready |
| --- | --- |
| Current provider costs ready | no |
| Cloudflare pricing refreshed | yes |
| Cloudflare usage costs ready | no |
| Local preview performance captured | yes |
| Hosted credential-free performance captured | yes |
| Hosted performance ready | no |
| Production cost decision ready | no |

## Inventory Counts

| Item | Count |
| --- | ---: |
| App routes | 71 |
| Provider-coupled files | 93 |
| Distinct RPC names | 80 |
| Applied SQL migrations | 181 |
| Pending-review SQL files | 13 |
| SQL function declaration/update matches | 346 |
| RLS/policy/storage/auth matches | 684 |

## Current Provider Cost Inputs

| Input | Status | Value | Source | Notes |
| --- | --- | --- | --- | --- |
| Vercel plan cost | missing |  | Vercel dashboard/invoice | Requires sanitized dashboard/invoice/metrics input before cost decisions. |
| Vercel bandwidth | missing |  | Vercel usage | Requires sanitized dashboard/invoice/metrics input before cost decisions. |
| Vercel function invocations/duration | missing |  | Vercel usage | Requires sanitized dashboard/invoice/metrics input before cost decisions. |
| Vercel build usage | missing |  | Vercel usage | Requires sanitized dashboard/invoice/metrics input before cost decisions. |
| Supabase plan cost | missing |  | Supabase dashboard/invoice | Requires sanitized dashboard/invoice/metrics input before cost decisions. |
| Supabase DB size | missing |  | Supabase project metrics | Requires sanitized dashboard/invoice/metrics input before cost decisions. |
| Supabase storage GB | missing |  | Supabase storage metrics | Requires sanitized dashboard/invoice/metrics input before cost decisions. |
| Supabase egress | missing |  | Supabase usage | Requires sanitized dashboard/invoice/metrics input before cost decisions. |
| Supabase Auth MAU | missing |  | Supabase auth metrics | Requires sanitized dashboard/invoice/metrics input before cost decisions. |
| Supabase Realtime connections/messages | missing |  | Supabase realtime metrics | Requires sanitized dashboard/invoice/metrics input before cost decisions. |
| Resend plan cost | missing |  | Resend dashboard/invoice | Requires sanitized dashboard/invoice/metrics input before cost decisions. |
| Resend sends/events | missing |  | Resend dashboard | Requires sanitized dashboard/invoice/metrics input before cost decisions. |

## Cloudflare Cost Inputs

| Input | Status | Value | Source | Notes |
| --- | --- | --- | --- | --- |
| Workers requests | missing |  | Monthly dynamic + static requests by route class | Requires hosted Cloudflare proof or sanitized usage input before cost decisions. |
| Workers CPU | missing |  | p50/p95 CPU per route/action from hosted proof | Requires hosted Cloudflare proof or sanitized usage input before cost decisions. |
| Workers subrequests | local-derived | 93 provider-coupled source files need per-route subrequest mapping | cf:inventory | Inventory-derived surface count only; not monthly operation volume. |
| D1 reads | local-derived | 80 app-code RPC names need read/write classification | cf:inventory | Inventory-derived rewrite surface only; not D1 row-read volume. |
| D1 writes | local-derived | 346 SQL function declaration/update matches need transaction classification | cf:inventory | Inventory-derived rewrite surface only; not D1 row-write volume. |
| D1 storage | missing |  | DB size after import/projection | Requires hosted Cloudflare proof or sanitized usage input before cost decisions. |
| R2 storage | missing |  | Object bytes by bucket/class | Requires hosted Cloudflare proof or sanitized usage input before cost decisions. |
| R2 Class A | missing |  | Creates, lists, uploads, lifecycle operations | Requires hosted Cloudflare proof or sanitized usage input before cost decisions. |
| R2 Class B | missing |  | Reads/downloads/head operations | Requires hosted Cloudflare proof or sanitized usage input before cost decisions. |
| KV reads/writes/lists | missing |  | Safe-cache operations only | Requires hosted Cloudflare proof or sanitized usage input before cost decisions. |
| Queues operations | missing |  | Writes, reads, deletes, retries in 64 KB units | Requires hosted Cloudflare proof or sanitized usage input before cost decisions. |
| Durable Objects | missing |  | Room requests, WebSocket duration/messages/storage if applicable | Requires hosted Cloudflare proof or sanitized usage input before cost decisions. |
| Email Service | missing |  | Sends, bounces/events, routing events | Requires hosted Cloudflare proof or sanitized usage input before cost decisions. |
| WAF/rate limiting | missing |  | Plan tier, rule count, log needs | Requires hosted Cloudflare proof or sanitized usage input before cost decisions. |
| Turnstile | missing |  | Challenge volume and false-positive review | Requires hosted Cloudflare proof or sanitized usage input before cost decisions. |
| Observability/logs | missing |  | Log volume, retention, analytics needs | Requires hosted Cloudflare proof or sanitized usage input before cost decisions. |

## Performance Fixtures

| Fixture | Current p95 | Local Worker preview p95 | Hosted Worker p95 | Budget | Status | Local evidence | Hosted evidence |
| --- | ---: | ---: | ---: | --- | --- | --- | --- |
| Public home route p95 TTFB |  | 168.47ms | 133.99ms | under 200 ms | hosted-partial-pass | .ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence/2026-06-29-cloudflare-worker-preview-route-probe.json | .ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence/2026-06-30-cloudflare-hosted-performance.json |
| Pricing/features static route p95 TTFB |  | 13.68ms | 94.8ms | under 200 ms | hosted-partial-pass | .ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence/2026-06-29-cloudflare-worker-preview-route-probe.json | .ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence/2026-06-30-cloudflare-hosted-performance.json |
| Login/auth callback p95 duration |  | 13.07ms | 88.89ms | no worse than baseline | hosted-partial-pass | .ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence/2026-06-29-cloudflare-worker-preview-route-probe.json | .ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence/2026-06-30-cloudflare-hosted-performance.json |
| Share route p95 TTFB |  | 327.35ms | 74.69ms | under 400 ms | hosted-partial-pass | .ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence/2026-06-29-cloudflare-worker-preview-route-probe.json | .ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence/2026-06-30-cloudflare-hosted-performance.json |
| Workshop home p95 TTFB |  | 4.03ms | 151.63ms | under 600 ms | hosted-partial-pass | .ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence/2026-06-29-cloudflare-worker-preview-route-probe.json | .ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence/2026-06-30-cloudflare-hosted-performance.json |
| Project dashboard p95 TTFB |  |  |  | under 600 ms | missing |  |  |
| Estimate sheet initial load p95 |  |  |  | no worse than baseline | missing |  |  |
| Estimate row mutation p95 |  |  |  | under 500 ms | missing |  |  |
| Library component search p95 |  |  |  | under 500 ms | missing |  |  |
| Upload signed/session creation p95 |  |  |  | no worse than baseline | missing |  |  |
| Upload scan queue latency p95 |  |  |  | job-specific | missing |  |  |
| Realtime cursor/presence latency p95 |  |  |  | no worse than baseline | missing |  |  |
| Email send-to-event latency p95 |  |  |  | no worse than baseline | missing |  |  |
